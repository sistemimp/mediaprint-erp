<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Repo\TicketsRepository;
use MediaPrint\Service\AcquistiRichiesteService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prev.write']);

    $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($payload)) {
        $payload = [];
    }

    $idTicket = isset($payload['id_ticket']) ? (int) $payload['id_ticket'] : 0;
    $idPreventivo = isset($payload['id_preventivo']) ? (int) $payload['id_preventivo'] : 0;

    $service = new AcquistiRichiesteService(new TicketsRepository(Database::getConnection()));
    $result = $service->linkPreventivo($idTicket, $idPreventivo, AuthGuard::getAccountId($auth), $auth);

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
