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

if ($method !== 'GET') {
    header('Allow: GET, OPTIONS');
    HttpResponse::error('Metodo !== GET non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);
    $threadId = isset($_GET['id_thread']) ? (int) $_GET['id_thread'] : 0;
    if ($threadId <= 0) {
        HttpResponse::error('Thread non valido.', 422);
    }
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 200;
    $beforeId = isset($_GET['before_id']) ? (int) $_GET['before_id'] : null;

    $service = new InstantMessagingService(new InstantMessagingRepository(Database::getConnection()));
    $messages = $service->listMessages($accountId, $threadId, $limit, $beforeId);
    HttpResponse::json(['data' => $messages], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
