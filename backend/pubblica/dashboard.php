<?php
declare(strict_types=1);

use MediaPrint\Repo\AnagraficheDashboardRepository;
use MediaPrint\Service\AnagraficheDashboardService;

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Service\AuthService;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Repo\FattureRepository;

use MediaPrint\Backend\Cors;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');


try {
    // Leggi parametri
    $onlyActive = isset($_GET['only_active']) && (int)$_GET['only_active'] === 1;

    // DI
    $pdo = Database::getConnection();

    // Anagrafiche
    $anagRepo = new AnagraficheDashboardRepository($pdo);
    $anagSrv  = new AnagraficheDashboardService($anagRepo);
    $anagrafiche = $anagSrv->getDashboardStats($onlyActive);

    // Preventivi
    $prevRepo = new PreventiviRepository($pdo);
    $prevByStatus = $prevRepo->countNewByStatusCurrentMonth();
    $ultimiPrev   = $prevRepo->listLatest(15);
    $topClienti   = $prevRepo->listTopClientsLast12Months(5);

    // Fatture (andamento per grafico)
    $fatRepo = new FattureRepository($pdo);
    $fattureSeries = $fatRepo->fetchMonthlyTotalsLast12();

    $payload = [
        'ok' => true,
        // Back-compat keys for anagrafiche widgets
        'kpi' => $anagrafiche['kpi'] ?? [],
        'series' => $anagrafiche['series'] ?? [],
        // New dashboard sections
        'preventivi_mese_per_stato' => $prevByStatus,
        'ultimi_preventivi' => $ultimiPrev,
        'top_clienti' => $topClienti,
        'fatture_series' => $fattureSeries,
    ];

    echo json_encode($payload);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'internal_error',
        'message' => $e->getMessage(),
    ]);
}
