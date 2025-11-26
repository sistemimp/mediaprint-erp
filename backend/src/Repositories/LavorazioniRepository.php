<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class LavorazioniRepository
{
    public function __construct(private PDO $pdo) {}

    public function findRepartoIdByCode(string $code): ?int
    {
        $sql = 'SELECT id_reparto FROM cfg_reparti_produttivi WHERE LOWER(code) = LOWER(:code) LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':code', $code, PDO::PARAM_STR);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        if ($value === false) {
            return null;
        }
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function fetchDashboard(array $filters): array
    {
        $params = [];
        $where = $this->buildWhere($filters, $params, false);

        $totaliSql = <<<SQL
            SELECT
                SUM(CASE WHEN l.stato IN ('aperta','pianificata','in_produzione') THEN 1 ELSE 0 END) AS aperte,
                SUM(CASE WHEN l.stato = 'in_produzione' THEN 1 ELSE 0 END) AS in_produzione,
                SUM(CASE WHEN l.stato = 'completata' THEN 1 ELSE 0 END) AS completate,
                SUM(
                    CASE
                        WHEN l.stato NOT IN ('completata','annullata')
                             AND l.data_fine_prevista IS NOT NULL
                             AND l.data_fine_prevista < CURRENT_DATE()
                        THEN 1 ELSE 0
                    END
                ) AS ritardo
            FROM tb_lavorazioni l
            {$where}
        SQL;

        $statement = $this->pdo->prepare($totaliSql);
        $statement->execute($params);
        $totali = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        $perfSql = <<<SQL
            SELECT
                AVG(COALESCE(l.percentuale_avanzamento, 0)) AS media_avanzamento,
                COUNT(*) AS totale
            FROM tb_lavorazioni l
            {$where}
        SQL;
        $statement = $this->pdo->prepare($perfSql);
        $statement->execute($params);
        $perfRow = $statement->fetch(PDO::FETCH_ASSOC) ?: [];
        $performance = [
            'completamento' => isset($perfRow['media_avanzamento'])
                ? (float) $perfRow['media_avanzamento']
                : 0.0,
        ];

        $workParams = $params;
        $workSql = <<<SQL
            SELECT
                SUM(CASE WHEN a.stato IN ('todo','in_progress') THEN 1 ELSE 0 END) AS attivita_aperte,
                SUM(
                    CASE
                        WHEN a.stato IN ('todo','in_progress')
                             AND a.data_scadenza IS NOT NULL
                             AND a.data_scadenza < NOW()
                        THEN 1 ELSE 0
                    END
                ) AS attivita_ritardo
            FROM tb_lavorazioni_attivita a
            INNER JOIN tb_lavorazioni l ON l.id_lavorazione = a.id_lavorazione
            {$where}
        SQL;
        $statement = $this->pdo->prepare($workSql);
        $statement->execute($workParams);
        $workload = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        $reparti = $this->fetchRepartiCounts($filters);

        return [
            'totali' => [
                'aperte' => (int) ($totali['aperte'] ?? 0),
                'in_produzione' => (int) ($totali['in_produzione'] ?? 0),
                'completate' => (int) ($totali['completate'] ?? 0),
                'ritardo' => (int) ($totali['ritardo'] ?? 0),
            ],
            'performance' => [
                'completamento' => round($performance['completamento'] ?? 0, 2),
            ],
            'workload' => [
                'attivita_aperte' => (int) ($workload['attivita_aperte'] ?? 0),
                'attivita_ritardo' => (int) ($workload['attivita_ritardo'] ?? 0),
            ],
            'reparti' => $reparti,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<int, array<string, mixed>>
     */
    private function fetchRepartiCounts(array $filters): array
    {
        $configStmt = $this->pdo->query(
            'SELECT id_reparto, code, label, ordering FROM cfg_reparti_produttivi WHERE attivo = 1 ORDER BY ordering ASC, label ASC'
        );
        $reparti = $configStmt ? $configStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $params = [];
        $where = $this->buildWhere($filters, $params, false);
        $countSql = <<<SQL
            SELECT l.id_reparto, COUNT(*) AS tot
            FROM tb_lavorazioni l
            {$where}
            GROUP BY l.id_reparto
        SQL;
        $stmt = $this->pdo->prepare($countSql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $map = [];
        foreach ($rows as $row) {
            $rid = isset($row['id_reparto']) ? (int) $row['id_reparto'] : 0;
            if ($rid > 0) {
                $map[$rid] = (int) ($row['tot'] ?? 0);
            }
        }

        $output = [];
        foreach ($reparti as $reparto) {
            $rid = isset($reparto['id_reparto']) ? (int) $reparto['id_reparto'] : 0;
            if ($rid <= 0) {
                continue;
            }
            $output[] = [
                'id_reparto' => $rid,
                'code' => $reparto['code'] ?? null,
                'label' => $reparto['label'] ?? null,
                'attive' => $map[$rid] ?? 0,
            ];
        }

        return $output;
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function paginateLavorazioni(array $filters, int $page, int $pageSize): array
    {
        $params = [];
        $where = $this->buildWhere($filters, $params);

        $countSql = <<<SQL
            SELECT COUNT(*) FROM tb_lavorazioni l
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = l.id_anagrafica
            {$where}
        SQL;
        $stmt = $this->pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int) ($stmt->fetchColumn() ?: 0);

        $limit = max(1, min(100, $pageSize));
        $offset = max(0, ($page - 1) * $limit);

        $listSql = <<<SQL
            SELECT
                l.id_lavorazione,
                l.codice,
                l.titolo,
                l.stato,
                l.priorita,
                l.percentuale_avanzamento,
                l.id_reparto,
                r.label AS reparto_label,
                l.data_inizio_prevista,
                l.data_fine_prevista,
                l.id_preventivo,
                p.anno_preventivo,
                p.numero_documento,
                p.totale,
                a.ragione_sociale AS cliente,
                COALESCE(op.operatore_nome, NULL) AS operatore_principale,
                CASE
                    WHEN l.stato NOT IN ('completata','annullata')
                         AND l.data_fine_prevista IS NOT NULL
                         AND l.data_fine_prevista < CURRENT_DATE()
                    THEN DATEDIFF(CURRENT_DATE(), l.data_fine_prevista)
                    ELSE 0
                END AS ritardo_giorni,
                (
                    SELECT COUNT(*) FROM tb_lavorazioni_attivita t
                    WHERE t.id_lavorazione = l.id_lavorazione
                ) AS attivita_totali,
                (
                    SELECT COUNT(*) FROM tb_lavorazioni_attivita t
                    WHERE t.id_lavorazione = l.id_lavorazione
                      AND t.stato IN ('todo','in_progress')
                ) AS attivita_aperte
            FROM tb_lavorazioni l
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = l.id_anagrafica
            LEFT JOIN cfg_reparti_produttivi r ON r.id_reparto = l.id_reparto
            LEFT JOIN tb_preventivi p ON p.id_preventivo = l.id_preventivo
            LEFT JOIN (
                SELECT la.id_lavorazione, MIN(acc.username) AS operatore_nome
                FROM tb_lavorazioni_attivita la
                INNER JOIN tb_lavorazioni_attivita_operatori lao ON lao.id_attivita = la.id_attivita
                INNER JOIN auth_accounts acc ON acc.id_account = lao.id_account
                GROUP BY la.id_lavorazione
            ) op ON op.id_lavorazione = l.id_lavorazione
            {$where}
            ORDER BY COALESCE(l.updated_at, l.created_at) DESC, l.id_lavorazione DESC
            LIMIT {$limit} OFFSET {$offset}
        SQL;

        $stmt = $this->pdo->prepare($listSql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @param array<string, mixed> $params
     */
    private function buildWhere(array $filters, array &$params, bool $includeSearch = true): string
    {
        $clauses = [];

        if (!empty($filters['stato'])) {
            $clauses[] = 'l.stato = :stato';
            $params[':stato'] = $filters['stato'];
        }

        if (!empty($filters['reparto_id'])) {
            $clauses[] = 'l.id_reparto = :reparto_id';
            $params[':reparto_id'] = (int) $filters['reparto_id'];
        }

        if (!empty($filters['date_from'])) {
            $clauses[] = 'COALESCE(l.data_inizio_prevista, DATE(l.created_at)) >= :date_from';
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $clauses[] = 'COALESCE(l.data_fine_prevista, DATE(l.created_at)) <= :date_to';
            $params[':date_to'] = $filters['date_to'];
        }

        if ($includeSearch && !empty($filters['search'])) {
            $clauses[] = '(LOWER(l.titolo) LIKE :search OR LOWER(l.codice) LIKE :search OR LOWER(COALESCE(a.ragione_sociale, \'\')) LIKE :search)';
            $params[':search'] = '%' . mb_strtolower((string) $filters['search'], 'UTF-8') . '%';
        }

        if (empty($clauses)) {
            return '';
        }

        return 'WHERE ' . implode(' AND ', $clauses);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findDetail(int $id): ?array
    {
        $sql = <<<SQL
            SELECT
                l.*,
                a.ragione_sociale AS cliente,
                p.anno_preventivo,
                p.numero_documento,
                p.totale,
                p.totale_imponibile,
                p.totale_iva,
                r.label AS reparto_label
            FROM tb_lavorazioni l
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = l.id_anagrafica
            LEFT JOIN tb_preventivi p ON p.id_preventivo = l.id_preventivo
            LEFT JOIN cfg_reparti_produttivi r ON r.id_reparto = l.id_reparto
            WHERE l.id_lavorazione = :id
            LIMIT 1
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        $row['attivita'] = $this->fetchAttivita($id);
        $row['timeline'] = $this->fetchTimeline($id);
        $row['assegnazioni'] = $this->fetchAssignments($id);

        return $row;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchAttivita(int $lavorazioneId): array
    {
        $sql = <<<SQL
            SELECT
                a.id_attivita,
                a.titolo,
                a.descrizione,
                a.stato,
                a.priorita,
                a.data_scadenza,
                a.data_completamento,
                a.quantita_prevista,
                a.quantita_effettiva,
                a.note,
                a.ordine,
                rep.label AS reparto_label,
                (
                    SELECT GROUP_CONCAT(DISTINCT acc.username ORDER BY acc.username SEPARATOR ', ')
                    FROM tb_lavorazioni_attivita_operatori lao
                    INNER JOIN auth_accounts acc ON acc.id_account = lao.id_account
                    WHERE lao.id_attivita = a.id_attivita
                ) AS assegnatari
            FROM tb_lavorazioni_attivita a
            LEFT JOIN cfg_reparti_produttivi rep ON rep.id_reparto = a.id_reparto
            WHERE a.id_lavorazione = :id
            ORDER BY a.ordine ASC, a.data_scadenza ASC, a.id_attivita ASC
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            if (!empty($row['assegnatari'])) {
                $row['assegnatari'] = array_map('trim', explode(',', (string) $row['assegnatari']));
            } else {
                $row['assegnatari'] = [];
            }
        }
        unset($row);

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchTimeline(int $lavorazioneId): array
    {
        $sql = <<<SQL
            SELECT
                e.id_evento,
                e.evento,
                e.note,
                e.created_at AS data,
                acc.username AS autore
            FROM tb_lavorazioni_eventi e
            LEFT JOIN auth_accounts acc ON acc.id_account = e.created_by
            WHERE e.id_lavorazione = :id
            ORDER BY e.created_at ASC, e.id_evento ASC
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchAssignments(int $lavorazioneId): array
    {
        $sql = <<<SQL
            SELECT
                lao.id_account,
                acc.username AS nome,
                lao.ruolo,
                COUNT(*) AS carico_attivita
            FROM tb_lavorazioni_attivita_operatori lao
            INNER JOIN tb_lavorazioni_attivita a ON a.id_attivita = lao.id_attivita
            LEFT JOIN auth_accounts acc ON acc.id_account = lao.id_account
            WHERE a.id_lavorazione = :id
            GROUP BY lao.id_account, acc.username, lao.ruolo
            ORDER BY acc.username ASC
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            $row['carico_attivita'] = isset($row['carico_attivita']) ? (int) $row['carico_attivita'] : 0;
        }
        unset($row);

        return $rows;
    }
}
