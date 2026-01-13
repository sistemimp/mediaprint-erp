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
        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int) $_GET['per_page']) : 20;
        HttpResponse::json([
            'data' => [],
            'meta' => [
                'total' => 0,
                'page' => $page,
                'per_page' => $perPage,
                'pages' => 1,
            ],
        ], 200);
        return;
    }

    $service = new AccountsService(new AccountsRepository(Database::getConnection()));
    $result = $service->list($_GET);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    HttpResponse::error($exception->getMessage(), 422);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
 
