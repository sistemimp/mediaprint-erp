<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\DdtRepository;
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
    $repo = new DdtRepository($pdo);
    $range = resolveMonthRange();

    $totale = (int) ($pdo->query('SELECT COUNT(*) FROM tb_ddt')->fetchColumn() ?: 0);

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total,
                COALESCE(SUM(totale_pezzi), 0) AS pezzi
         FROM tb_ddt
         WHERE data_ddt >= :start AND data_ddt < :end'
    );
    $stmt->bindValue(':start', $range['start']);
    $stmt->bindValue(':end', $range['end']);
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
        $stmt->bindValue(':start', $range['start']);
        $stmt->bindValue(':end', $range['end']);
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
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
