<?php
use MediaPrint\Backend\Cors;


require __DIR__ . '/../bootstrap.php';

use MediaPrint\Repo\AnagraficheRepository;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Service\AnagraficheService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;



header('Content-Type: application/json');

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['anag.read']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $_GET['allowed_anagrafiche'] = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
    }

    $service = new AnagraficheService(
        new AnagraficheRepository(Database::getConnection())
    );

    $result = $service->list($_GET);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    HttpResponse::error($exception->getMessage(), 422);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
