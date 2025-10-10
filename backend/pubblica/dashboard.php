<?php
declare(strict_types=1);

use MediaPrint\Repo\AnagraficheDashboardRepository;
use MediaPrint\Service\AnagraficheDashboardService;

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Service\AuthService;

use MediaPrint\Backend\Cors;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');


try {
    // Leggi parametri
    $onlyActive = isset($_GET['only_active']) && (int)$_GET['only_active'] === 1;

    // DI
    $repository = new AnagraficheDashboardRepository(Database::getConnection());
    $service    = new AnagraficheDashboardService($repository);

    $payload = $service->getDashboardStats($onlyActive);

    echo json_encode(['ok' => true] + $payload);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'internal_error',
        'message' => $e->getMessage(),
    ]);
}
