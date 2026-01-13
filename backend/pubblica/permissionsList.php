<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Repo\AuthRepository;
use MediaPrint\Service\AuthService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;

header('Content-Type: application/json');

try {
    AuthGuard::requireAuth();

    $service = new AuthService(new AuthRepository(Database::getConnection()));
    $result = $service->listPermissions();
    HttpResponse::json(['data' => $result], 200);
} catch (RuntimeException $exception) {
    HttpResponse::error($exception->getMessage(), 422);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
