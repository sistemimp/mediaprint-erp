<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PagamentiRepository;

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['pay.write']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    $input = file_get_contents('php://input') ?: '{}';
    $payload = json_decode($input, true);
    if (!is_array($payload)) {
        throw new RuntimeException('Payload non valido.', 422);
    }

    $limit = isset($payload['limit']) ? (int) $payload['limit'] : 300;

    $repo = new PagamentiRepository(Database::getConnection());
    $result = $repo->autoReassignPendingByLearnedMappings($limit);

    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
