<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

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
    $label = isset($payload['label']) ? trim((string) $payload['label']) : '';
    if ($label === '') {
        throw new RuntimeException('Label mancante.', 422);
    }

    $active = true;
    if (array_key_exists('attivo', $payload)) {
        $active = (int) $payload['attivo'] === 1;
    } elseif (array_key_exists('active', $payload)) {
        $active = (bool) $payload['active'];
    }

    $repo = new PreventiviRepository(Database::getConnection());
    $created = $repo->createOggettoOption($label, $active);
    HttpResponse::json(['data' => $created], 201);
} catch (RuntimeException $exception) {
    $code = $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
