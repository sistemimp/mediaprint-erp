<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class FattureRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * Serie ultimi 12 mesi per fatture:
     * - mese (YYYY-MM), totale (somma importi), pagate (somma importi pagati)
     *
     * @return list<array{mese:string, totale:float, pagate:float}>
     */
    public function fetchMonthlyTotalsLast12(): array
    {
        $sql = <<<'SQL'
            WITH RECURSIVE mesi(ms) AS (
              SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
              UNION ALL
              SELECT DATE_ADD(ms, INTERVAL 1 MONTH)
              FROM mesi
              WHERE ms < DATE_FORMAT(CURDATE(), '%Y-%m-01')
            )
            SELECT
              DATE_FORMAT(m.ms, '%Y-%m') AS mese,
              COALESCE(SUM(f.totale), 0) AS totale,
              COALESCE(SUM(CASE WHEN sf.code = 'pagata' THEN f.totale ELSE 0 END), 0) AS pagate
            FROM mesi m
            LEFT JOIN tb_fatture f
              ON f.data_fattura >= m.ms
             AND f.data_fattura <  DATE_ADD(m.ms, INTERVAL 1 MONTH)
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            GROUP BY m.ms
            ORDER BY m.ms
        SQL;

        $stmt = $this->pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'mese' => (string) $r['mese'],
                'totale' => (float) $r['totale'],
                'pagate' => (float) $r['pagate'],
            ];
        }
        return $out;
    }
}

