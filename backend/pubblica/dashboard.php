<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;
use MediaPrint\Repo\AnagraficheDashboardRepository;
use MediaPrint\Repo\FattureRepository;
use MediaPrint\Repo\PagamentiRepository;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Service\AnagraficheDashboardService;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

/**
 * @return array{start:string,end:string,period:string}
 */
function resolveDashboardPeriod(?string $periodRaw): array
{
    $period = strtolower(trim((string) $periodRaw));
    $allowed = ['monthly', 'quarterly', 'semiannual', 'yearly'];
    if (!in_array($period, $allowed, true)) {
        $period = 'monthly';
    }

    $now = new \DateTimeImmutable('now');
    $year = (int) $now->format('Y');
    $month = (int) $now->format('n');

    if ($period === 'quarterly') {
        $quarterIndex = intdiv($month - 1, 3);
        $startMonth = ($quarterIndex * 3) + 1;
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
        $end = $start->modify('+3 months');
    } elseif ($period === 'semiannual') {
        $startMonth = $month <= 6 ? 1 : 7;
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
        $end = $start->modify('+6 months');
    } elseif ($period === 'yearly') {
        $start = new \DateTimeImmutable(sprintf('%d-01-01 00:00:00', $year));
        $end = $start->modify('+1 year');
    } else {
        $start = new \DateTimeImmutable($now->format('Y-m-01 00:00:00'));
        $end = $start->modify('+1 month');
    }

    return [
        'start' => $start->format('Y-m-d H:i:s'),
        'end' => $end->format('Y-m-d H:i:s'),
        'period' => $period,
    ];
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['anag.view', 'prev.view', 'fatt.view', 'ddt.view', 'pay.view', 'job.view', 'cfg.view']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        HttpResponse::json([
            'ok' => true,
            'kpi' => [],
            'series' => [],
            'sales' => [],
            'fatture_series' => [],
            'conversion_series' => [],
            'top_clients' => [],
        ], 200);
        return;
    }

    $pdo = Database::getConnection();

    $periodRange = resolveDashboardPeriod($_GET['period'] ?? null);

    $onlyActive = isset($_GET['only_active']) && (int) $_GET['only_active'] === 1;
    $anagraficheRepo = new AnagraficheDashboardRepository($pdo);
    $anagraficheService = new AnagraficheDashboardService($anagraficheRepo);
    $anagraficheStats = $anagraficheService->getDashboardStats($onlyActive);
    $kpi = $anagraficheStats['kpi'] ?? [];

    $preventiviRepo = new PreventiviRepository($pdo);
    $conversion = $preventiviRepo->fetchCurrentMonthConversion();
    $conversionSeries = $preventiviRepo->fetchConversionSeriesLast6();

    $fattureRepo = new FattureRepository($pdo);
    $fatturato = $fattureRepo->fetchCurrentMonthRevenue();
    $fattureSeries = $fattureRepo->fetchMonthlyTotalsLast12();

    $pagamentiRepo = new PagamentiRepository($pdo);
    $topClients = [
        'conversion' => $preventiviRepo->listTopClientsByConversion($periodRange['start'], $periodRange['end'], 5),
        'revenue' => $fattureRepo->listTopClientsByRevenue($periodRange['start'], $periodRange['end'], 5),
        'balance' => $pagamentiRepo->listTopClientsByBalance(5),
        'period' => $periodRange['period'],
    ];

    $sales = [
        'fatturato' => (float) $fatturato,
        'nuovi_clienti' => (int) ($kpi['nuovi_mese_corrente'] ?? 0),
        'tasso_conversione' => $conversion['total'] > 0 ? round(($conversion['accepted'] / $conversion['total']) * 100, 1) : 0.0,
        'preventivi_totali' => $conversion['total'],
        'preventivi_confermati' => $conversion['accepted'],
        'period' => date('Y-m'),
    ];

    HttpResponse::json([
        'ok' => true,
        'kpi' => $kpi,
        'series' => $anagraficheStats['series'] ?? [],
        'sales' => $sales,
        'fatture_series' => $fattureSeries,
        'conversion_series' => $conversionSeries,
        'top_clients' => $topClients,
    ], 200);
} catch (\Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
