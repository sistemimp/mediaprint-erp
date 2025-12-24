<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\InstantMessagingRepository;
use MediaPrint\Service\InstantMessagingService;

require __DIR__ . '/../bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo !== POST non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);
    $payload = json_decode(file_get_contents('php://input') ?: '[]', true);
    if (!is_array($payload)) {
        HttpResponse::error('Formato JSON non valido.', 400);
    }

    $targetId = isset($payload['id_account']) ? (int) $payload['id_account'] : 0;
    if ($targetId <= 0) {
        HttpResponse::error('Account di destinazione non valido.', 422);
    }

    $service = new InstantMessagingService(new InstantMessagingRepository(Database::getConnection()));
    $thread = $service->createThread($accountId, $targetId);
    HttpResponse::json(['data' => $thread], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
