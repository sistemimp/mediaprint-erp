<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\DdtRepository;
use PDO;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

/**
 * @return array{start:DateTimeImmutable,end:DateTimeImmutable,period:string}
 */
function resolveDashboardPeriod(?string $periodRaw): array
{
    $period = strtolower(trim((string) $periodRaw));
    $allowed = ['monthly', 'quarterly', 'semiannual', 'yearly'];
    if (!in_array($period, $allowed, true)) {
        $period = 'monthly';
    }

    $now = new DateTimeImmutable('now');
    $year = (int) $now->format('Y');
    $month = (int) $now->format('n');

    if ($period === 'quarterly') {
        $quarterIndex = intdiv($month - 1, 3);
        $startMonth = ($quarterIndex * 3) + 1;
        $start = new DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
        $end = $start->modify('+3 months');
    } elseif ($period === 'semiannual') {
        $startMonth = $month <= 6 ? 1 : 7;
        $start = new DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
        $end = $start->modify('+6 months');
    } elseif ($period === 'yearly') {
        $start = new DateTimeImmutable(sprintf('%d-01-01 00:00:00', $year));
        $end = $start->modify('+1 year');
    } else {
        $start = new DateTimeImmutable($now->format('Y-m-01 00:00:00'));
        $end = $start->modify('+1 month');
    }

    return [
        'start' => $start,
        'end' => $end,
        'period' => $period,
    ];
}

try {
    $pdo = Database::getConnection();
    $repo = new DdtRepository($pdo);
    $range = resolveDashboardPeriod($_GET['period'] ?? null);

    $totale = (int) ($pdo->query('SELECT COUNT(*) FROM tb_ddt')->fetchColumn() ?: 0);

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total,
                COALESCE(SUM(totale_pezzi), 0) AS pezzi
         FROM tb_ddt
         WHERE data_ddt >= :start AND data_ddt < :end'
    );
    $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $totaleMese = (int) ($row['total'] ?? 0);
    $pezziMese = (float) ($row['pezzi'] ?? 0);

    $bozze = (int) ($pdo->query('SELECT COUNT(*) FROM tb_ddt WHERE stato_documento = 1')->fetchColumn() ?: 0);
    $emessi = (int) ($pdo->query('SELECT COUNT(*) FROM tb_ddt WHERE stato_documento = 2')->fetchColumn() ?: 0);

    $topCausali = [];
    try {
        $stmt = $pdo->prepare(
            'SELECT c.id_causale, c.label, COUNT(d.id_ddt) AS totale
             FROM cfg_causali_ddt c
             LEFT JOIN tb_ddt d
               ON d.id_causale = c.id_causale
              AND d.data_ddt >= :start AND d.data_ddt < :end
             WHERE c.attivo = 1
             GROUP BY c.id_causale, c.label
             ORDER BY totale DESC, c.label ASC
             LIMIT 5'
        );
        $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
        $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as $row) {
            $topCausali[] = [
                'id_causale' => (int) $row['id_causale'],
                'label' => (string) $row['label'],
                'totale' => (int) $row['totale'],
            ];
        }
    } catch (Throwable) {
        $topCausali = [];
    }

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'totale' => $totale,
            'totale_mese' => $totaleMese,
            'bozze' => $bozze,
            'emessi' => $emessi,
            'pezzi_mese' => $pezziMese,
        ],
        'top_causali' => $topCausali,
        'latest' => $repo->listLatest(10),
        'period' => $range['period'],
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
