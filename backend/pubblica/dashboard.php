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

    $months = match ($period) {
        'quarterly' => 3,
        'semiannual' => 6,
        'yearly' => 12,
        default => 1,
    };
    $end = new \DateTimeImmutable('now');
    $start = $end->modify('-' . $months . ' months');

    return [
        'start' => $start->format('Y-m-d H:i:s'),
        'end' => $end->format('Y-m-d H:i:s'),
        'period' => $period,
    ];
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['anag.read', 'prev.read', 'fatt.read', 'ddt.read', 'pay.read', 'job.read']);
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
    $conversion = $preventiviRepo->fetchConversionByRange($periodRange['start'], $periodRange['end']);
    $conversionSeries = $preventiviRepo->fetchConversionSeriesLast6();

    $fattureRepo = new FattureRepository($pdo);
    $fatturato = $fattureRepo->fetchRevenueByRange($periodRange['start'], $periodRange['end']);
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
