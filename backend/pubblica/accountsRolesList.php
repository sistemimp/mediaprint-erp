<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Service\AccountsService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;

header('Content-Type: application/json');

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['cfg.view']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        HttpResponse::json(['data' => []], 200);
        return;
    }

    $service = new AccountsService(new AccountsRepository(Database::getConnection()));
    $result = $service->listRoles();
    HttpResponse::json(['data' => $result], 200);
} catch (RuntimeException $exception) {
    HttpResponse::error($exception->getMessage(), 422);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
