<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;
use RuntimeException;
use Throwable;

final class AnagraficheDashboardRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * Ritorna KPI grezze (senza perc_change_mom) per:
     * - totale_generale
     * - nuovi_mese_corrente
     * - nuovi_mese_precedente
     */
    public function fetchKpi(bool $onlyActive = false): array
    {
        $whereKpiSql = $onlyActive ? " WHERE stato = 'attiva'" : '';

        $sql = <<<SQL
            WITH p AS (
              SELECT
                DATE_FORMAT(CURDATE(), '%Y-%m-01')                             AS m0,
                DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AS m_prev,
                DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AS m_next
            )
            SELECT
              (SELECT COUNT(*) FROM tb_anagrafiche{$whereKpiSql}) AS totale_generale,
              (SELECT COUNT(*) FROM tb_anagrafiche a, p
                WHERE a.created_at >= p.m0 AND a.created_at < p.m_next{$whereKpiSql}) AS nuovi_mese_corrente,
              (SELECT COUNT(*) FROM tb_anagrafiche a, p
                WHERE a.created_at >= p.m_prev AND a.created_at < p.m0{$whereKpiSql}) AS nuovi_mese_precedente
        SQL;

        $stmt = $this->pdo->query($sql);
        $row  = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: [
            'totale_generale' => 0,
            'nuovi_mese_corrente' => 0,
            'nuovi_mese_precedente' => 0,
        ];
    }

    /**
     * Serie ultimi 6 mesi:
     * - mese (YYYY-MM), tot, attive, disattive
     */
    public function fetchSeriesLast6(bool $onlyActive = false): array
    {
        $whereSerSql = $onlyActive ? " AND a.stato = 'attiva'" : '';
        $whereClientsSql = $onlyActive ? " AND stato = 'attiva'" : '';

        $sql = <<<SQL
            WITH RECURSIVE mesi(ms) AS (
              SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
              UNION ALL
              SELECT DATE_ADD(ms, INTERVAL 1 MONTH)
              FROM mesi
              WHERE ms < DATE_FORMAT(CURDATE(), '%Y-%m-01')
            )
            SELECT
              DATE_FORMAT(m.ms, '%Y-%m') AS mese,
              COUNT(a.id_anagrafica)     AS tot,
              SUM(a.stato = 'attiva')    AS attive,
              SUM(a.stato = 'disattiva') AS disattive
            FROM mesi m
            LEFT JOIN tb_anagrafiche a
              ON a.created_at >= m.ms
             AND a.created_at <  DATE_ADD(m.ms, INTERVAL 1 MONTH)
             {$whereSerSql}
            GROUP BY m.ms
            ORDER BY m.ms
        SQL;

        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return list<array{id_anagrafica:int, ragione_sociale:string|null, piva:string|null, codice_fiscale:string|null, email:string|null, created_at:string|null}>
     */
    public function fetchNewClientsCurrentMonth(int $limit = 20): array
    {
        $paramsSql = <<<'SQL'
            WITH period AS (
              SELECT
                DATE_FORMAT(CURDATE(), '%Y-%m-01') AS start_month,
                DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AS next_month
            )
            SELECT start_month AS start_date, next_month AS end_date FROM period
        SQL;

        $stmt = $this->pdo->query($paramsSql);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $start = $row['start_date'] ?? null;
        $end = $row['end_date'] ?? null;
        if (!$start || !$end) {
            return [];
        }

        return $this->fetchNewClientsForRange($start, $end, $limit);
    }

    /**
     * @return list<array{id_anagrafica:int, ragione_sociale:string|null, piva:string|null, codice_fiscale:string|null, email:string|null, created_at:string|null}>
     */
    public function fetchNewClientsForRange(string $startDate, string $endDate, int $limit = 20): array
    {
        $sql = <<<'SQL'
            SELECT
              a.id_anagrafica,
              a.ragione_sociale,
              a.piva,
              a.codice_fiscale,
              a.created_at
            FROM tb_anagrafiche a
            WHERE a.created_at >= :start
              AND a.created_at < :end
            ORDER BY a.created_at DESC
            LIMIT :limit
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $limitValue = max(1, min($limit, 100));
        $stmt->bindValue(':start', $startDate);
        $stmt->bindValue(':end', $endDate);
        $stmt->bindValue(':limit', $limitValue, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : 0,
                'ragione_sociale' => $row['ragione_sociale'] ?? null,
                'piva' => $row['piva'] ?? null,
                'codice_fiscale' => $row['codice_fiscale'] ?? null,
                'created_at' => $row['created_at'] ?? null,
            ];
        }

        return $out;
    }
}
