<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;
use PDO;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

/**
 * @return array{start:string,end:string}
 */
function resolveMonthRange(): array
{
    $start = new DateTimeImmutable('first day of this month 00:00:00');
    $end = $start->modify('+1 month');

    return [
        'start' => $start->format('Y-m-d H:i:s'),
        'end' => $end->format('Y-m-d H:i:s'),
    ];
}

try {
    $pdo = Database::getConnection();
    $repo = new FattureRepository($pdo);
    $range = resolveMonthRange();

    $fatturatoMese = $repo->fetchCurrentMonthRevenue();

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS totale
         FROM tb_fatture f
         LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
         WHERE COALESCE(f.data_fattura, f.created_at) >= :start
           AND COALESCE(f.data_fattura, f.created_at) < :end
           AND (sf.code IS NULL OR sf.code <> \'bozza\')'
    );
    $stmt->bindValue(':start', $range['start']);
    $stmt->bindValue(':end', $range['end']);
    $stmt->execute();
    $fattureMese = (int) ($stmt->fetchColumn() ?: 0);

    $stmt = $pdo->query(
        'SELECT COUNT(*) AS total, COALESCE(SUM(saldo), 0) AS totale_saldo
         FROM tb_fatture f
         LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
         WHERE (sf.code IS NULL OR sf.code <> \'bozza\')
           AND f.saldo > 0.009'
    );
    $row = $stmt ? ($stmt->fetch(PDO::FETCH_ASSOC) ?: []) : [];
    $fattureAperte = (int) ($row['total'] ?? 0);
    $saldoAperto = (float) ($row['totale_saldo'] ?? 0);

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'fatturato_mese' => $fatturatoMese,
            'fatture_mese' => $fattureMese,
            'fatture_aperte' => $fattureAperte,
            'saldo_aperto' => $saldoAperto,
        ],
        'series' => $repo->fetchMonthlyTotalsLast12(),
        'top_clients' => $repo->listTopClientsByRevenue($range['start'], $range['end'], 5),
        'latest' => $repo->listLatest(10),
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
