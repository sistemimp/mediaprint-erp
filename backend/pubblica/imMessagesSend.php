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

    $threadId = isset($payload['id_thread']) ? (int) $payload['id_thread'] : 0;
    $body = isset($payload['body']) ? (string) $payload['body'] : '';
    if ($threadId <= 0) {
        HttpResponse::error('Thread non valido.', 422);
    }

    $service = new InstantMessagingService(new InstantMessagingRepository(Database::getConnection()));
    $result = $service->sendMessage($accountId, $threadId, $body);
    HttpResponse::json(['data' => $result], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
