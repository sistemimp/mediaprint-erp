<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PreventiviRepository;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

try {
    $pdo = Database::getConnection();
    $repo = new PreventiviRepository($pdo);

    $conversion = $repo->fetchCurrentMonthConversion();
    $series = $repo->fetchConversionSeriesLast6();
    $statusCounts = $repo->countNewByStatusCurrentMonth();
    $topClients = $repo->listTopClientsLast12Months(5);
    $latest = $repo->listLatest(10);

    HttpResponse::json([
        'ok' => true,
        'conversion' => $conversion,
        'series' => $series,
        'status_counts' => $statusCounts,
        'top_clients' => $topClients,
        'latest' => $latest,
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
