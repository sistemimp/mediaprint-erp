<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Service\AuthService;

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
    $service = new AuthService(new AuthRepository(Database::getConnection()));
    $user = $service->getUserSnapshot($accountId);

    HttpResponse::json(['user' => $user], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 401);
    if ($code < 400 || $code > 599) {
        $code = 401;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
