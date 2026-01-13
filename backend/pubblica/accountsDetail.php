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
    AuthGuard::requirePermissions($auth, ['acct.read']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    $accountId = isset($_GET['id_account']) ? (int) $_GET['id_account'] : (isset($_GET['id']) ? (int) $_GET['id'] : 0);
    $service = new AccountsService(new AccountsRepository(Database::getConnection()));
    $result = $service->detail($accountId);
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
