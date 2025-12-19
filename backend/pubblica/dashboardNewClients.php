<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AnagraficheDashboardRepository;
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
    $pdo = Database::getConnection();
    $repo = new AnagraficheDashboardRepository($pdo);
    $service = new AnagraficheDashboardService($repo);
    $limit = isset($_GET['limit']) ? max(1, min(100, (int) $_GET['limit'])) : 20;
    $periodRange = resolveDashboardPeriod($_GET['period'] ?? null);
    $clients = $service->getNewClients($limit, $periodRange['start'], $periodRange['end']);

    HttpResponse::json([
        'ok' => true,
        'data' => $clients,
        'meta' => [
            'limit' => $limit,
            'count' => count($clients),
            'period' => $periodRange['period'],
        ],
    ], 200);
} catch (\Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
