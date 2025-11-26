<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class LavorazioniRepository
{
    public function __construct(private PDO $pdo) {}

    public function existsLavorazione(int $id): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM tb_lavorazioni WHERE id_lavorazione = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return (bool) $stmt->fetchColumn();
    }

    public function findLavorazioneById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id_lavorazione FROM tb_lavorazioni WHERE id_lavorazione = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return $row;
    }

    public function updateStato(int $id, string $stato): void
    {
        $stmt = $this->pdo->prepare('UPDATE tb_lavorazioni SET stato = :stato, updated_at = NOW() WHERE id_lavorazione = :id');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':stato', $stato, PDO::PARAM_STR);
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            throw new \RuntimeException('Lavorazione non trovata per aggiornare lo stato.', 404);
        }
    }

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
     * @return array<int, array<string, mixed>>
     */
    public function listActiveReparti(): array
    {
        $sql = 'SELECT id_reparto, code, label FROM cfg_reparti_produttivi WHERE attivo = 1 ORDER BY ordering ASC, label ASC';
        $stmt = $this->pdo->query($sql);
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listActiveOperators(): array
    {
        $sql = <<<SQL
            SELECT id_account, username, email
            FROM auth_accounts
            WHERE account_type = 'operatore' AND is_active = 1
            ORDER BY username ASC
        SQL;
        $stmt = $this->pdo->query($sql);
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @param array<int, int> $operatorIds
     * @return array<int, int>
     */
    public function filterOperatorIds(array $operatorIds): array
    {
        if ($operatorIds === []) {
            return [];
        }
        $unique = array_values(array_unique(array_map('intval', $operatorIds)));
        $placeholders = implode(',', array_fill(0, count($unique), '?'));
        $sql = <<<SQL
            SELECT id_account
            FROM auth_accounts
            WHERE id_account IN ({$placeholders}) AND is_active = 1
        SQL;
        $stmt = $this->pdo->prepare($sql);
        foreach ($unique as $index => $value) {
            $stmt->bindValue($index + 1, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $valid = [];
        foreach ($rows as $row) {
            $id = (int) $row;
            if ($id > 0) {
                $valid[] = $id;
            }
        }
        return $valid;
    }

    /**
     * @return array<int, int>
     */
    public function getOperatorIdsForLavorazione(int $lavorazioneId): array
    {
        $ids = [];

        $jobSql = 'SELECT id_account FROM tb_lavorazioni_operatori WHERE id_lavorazione = :id';
        $stmt = $this->pdo->prepare($jobSql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        foreach ($rows as $row) {
            $value = (int) $row;
            if ($value > 0) {
                $ids[$value] = $value;
            }
        }

        $taskSql = <<<SQL
            SELECT DISTINCT lao.id_account
            FROM tb_lavorazioni_attivita_operatori lao
            INNER JOIN tb_lavorazioni_attivita a ON a.id_attivita = lao.id_attivita
            WHERE a.id_lavorazione = :id
        SQL;
        $stmt = $this->pdo->prepare($taskSql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        foreach ($rows as $row) {
            $value = (int) $row;
            if ($value > 0) {
                $ids[$value] = $value;
            }
        }

        return array_values($ids);
    }

    /**
     * @return array<int, int>
     */
    public function getOperatorIdsForActivity(int $activityId): array
    {
        $stmt = $this->pdo->prepare('SELECT DISTINCT id_account FROM tb_lavorazioni_attivita_operatori WHERE id_attivita = :id');
        $stmt->bindValue(':id', $activityId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $ids = [];
        foreach ($rows as $row) {
            $value = (int) $row;
            if ($value > 0) {
                $ids[$value] = $value;
            }
        }
        return array_values($ids);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listNotificationsForAccount(int $accountId, int $limit, bool $onlyUnread = false): array
    {
        $baseSql = <<<SQL
            SELECT
                n.id_notifica,
                n.titolo,
                n.messaggio,
                n.stato,
                n.created_at,
                n.read_at,
                n.id_lavorazione,
                n.id_attivita,
                l.codice AS lavorazione_codice,
                l.titolo AS lavorazione_titolo,
                a.titolo AS attivita_titolo
            FROM tb_lavorazioni_notifiche n
            LEFT JOIN tb_lavorazioni l ON l.id_lavorazione = n.id_lavorazione
            LEFT JOIN tb_lavorazioni_attivita a ON a.id_attivita = n.id_attivita
            WHERE n.id_account = :account
        SQL;

        if ($onlyUnread) {
            $baseSql .= " AND n.stato <> 'read'";
        }

        $baseSql .= ' ORDER BY n.created_at DESC LIMIT :limit';

        $stmt = $this->pdo->prepare($baseSql);
        $stmt->bindValue(':account', $accountId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countUnreadNotifications(int $accountId): int
    {
        $sql = "SELECT COUNT(*) FROM tb_lavorazioni_notifiche WHERE id_account = :account AND stato <> 'read'";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':account', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        return (int) ($stmt->fetchColumn() ?: 0);
    }

    /**
     * @param array<int, int> $notificationIds
     */
    public function markNotificationsRead(int $accountId, array $notificationIds): int
    {
        if ($notificationIds === []) {
            return 0;
        }
        $unique = array_values(array_unique(array_filter($notificationIds, static fn ($value) => $value > 0)));
        if ($unique === []) {
            return 0;
        }
        $placeholders = implode(',', array_fill(0, count($unique), '?'));
        $sql = "UPDATE tb_lavorazioni_notifiche SET stato = 'read', read_at = NOW() WHERE id_account = ? AND id_notifica IN ({$placeholders})";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(1, $accountId, PDO::PARAM_INT);
        foreach ($unique as $index => $notificationId) {
            $stmt->bindValue($index + 2, $notificationId, PDO::PARAM_INT);
        }
        $stmt->execute();
        return (int) $stmt->rowCount();
    }

    /**
     * @param array<string, mixed> $data
     * @param array<int, array<string, mixed>> $attivita
     * @return array{id_lavorazione:int, codice:string, attivita_create:int}
     */
    public function createFromPreventivo(array $data, array $attivita): array
    {
        $this->pdo->beginTransaction();
        try {
            $sql = <<<'SQL'
                INSERT INTO tb_lavorazioni (
                    id_preventivo,
                    id_anagrafica,
                    codice,
                    titolo,
                    descrizione,
                    stato,
                    priorita,
                    id_reparto,
                    data_inizio_prevista,
                    data_fine_prevista,
                    percentuale_avanzamento,
                    note,
                    created_at,
                    updated_at
                ) VALUES (
                    :id_preventivo,
                    :id_anagrafica,
                    NULL,
                    :titolo,
                    :descrizione,
                    :stato,
                    :priorita,
                    :id_reparto,
                    :data_inizio_prevista,
                    :data_fine_prevista,
                    :percentuale,
                    :note,
                    NOW(),
                    NOW()
                )
            SQL;

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id_preventivo', (int) $data['id_preventivo'], PDO::PARAM_INT);
            $stmt->bindValue(':id_anagrafica', (int) $data['id_anagrafica'], PDO::PARAM_INT);
            $stmt->bindValue(':titolo', (string) $data['titolo'], PDO::PARAM_STR);
            $stmt->bindValue(':descrizione', $data['descrizione'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':stato', $data['stato'] ?? 'aperta', PDO::PARAM_STR);
            $stmt->bindValue(':priorita', $data['priorita'] ?? 'medium', PDO::PARAM_STR);
            if (!empty($data['id_reparto'])) {
                $stmt->bindValue(':id_reparto', (int) $data['id_reparto'], PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
            }
            $stmt->bindValue(':data_inizio_prevista', $data['data_inizio_prevista'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':data_fine_prevista', $data['data_fine_prevista'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':percentuale', isset($data['percentuale_avanzamento']) ? (int) $data['percentuale_avanzamento'] : 0, PDO::PARAM_INT);
            $stmt->bindValue(':note', $data['note'] ?? null, PDO::PARAM_STR);
            $stmt->execute();

            $idLavorazione = (int) $this->pdo->lastInsertId();
            $codice = $this->buildJobCode(
                isset($data['anno_preventivo']) ? (int) $data['anno_preventivo'] : null,
                isset($data['numero_preventivo']) ? (int) $data['numero_preventivo'] : null,
                $idLavorazione
            );
            $up = $this->pdo->prepare('UPDATE tb_lavorazioni SET codice = :codice WHERE id_lavorazione = :id');
            $up->bindValue(':codice', $codice, PDO::PARAM_STR);
            $up->bindValue(':id', $idLavorazione, PDO::PARAM_INT);
            $up->execute();

            if (!empty($attivita)) {
                $taskSql = <<<'SQL'
                    INSERT INTO tb_lavorazioni_attivita (
                        id_lavorazione,
                        titolo,
                        descrizione,
                        stato,
                        priorita,
                        id_reparto,
                        ordine,
                        data_scadenza,
                        quantita_prevista,
                        note,
                        data_creazione
                    ) VALUES (
                        :id_lavorazione,
                        :titolo,
                        :descrizione,
                        :stato,
                        :priorita,
                        :id_reparto,
                        :ordine,
                        :data_scadenza,
                        :quantita_prevista,
                        :note,
                        NOW()
                    )
                SQL;
                $taskStmt = $this->pdo->prepare($taskSql);
                foreach ($attivita as $task) {
                    $taskStmt->bindValue(':id_lavorazione', $idLavorazione, PDO::PARAM_INT);
                    $taskStmt->bindValue(':titolo', (string) $task['titolo'], PDO::PARAM_STR);
                    $taskStmt->bindValue(':descrizione', $task['descrizione'] ?? null, PDO::PARAM_STR);
                    $taskStmt->bindValue(':stato', $task['stato'] ?? 'todo', PDO::PARAM_STR);
                    $taskStmt->bindValue(':priorita', $task['priorita'] ?? 'medium', PDO::PARAM_STR);
                    if (!empty($task['id_reparto'])) {
                        $taskStmt->bindValue(':id_reparto', (int) $task['id_reparto'], PDO::PARAM_INT);
                    } else {
                        $taskStmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
                    }
                    $taskStmt->bindValue(':ordine', isset($task['ordine']) ? (int) $task['ordine'] : 0, PDO::PARAM_INT);
                    $taskStmt->bindValue(':data_scadenza', $task['data_scadenza'] ?? null, PDO::PARAM_STR);
                    if (isset($task['quantita_prevista'])) {
                        $taskStmt->bindValue(':quantita_prevista', $task['quantita_prevista'], PDO::PARAM_STR);
                    } else {
                        $taskStmt->bindValue(':quantita_prevista', null, PDO::PARAM_NULL);
                    }
                    $taskStmt->bindValue(':note', $task['note'] ?? null, PDO::PARAM_STR);
                    $taskStmt->execute();
                }
            }

            $this->pdo->commit();

            return [
                'id_lavorazione' => $idLavorazione,
                'codice' => $codice,
                'attivita_create' => count($attivita),
            ];
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
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
        $row['lavorazione_operatori'] = $this->fetchLavorazioneOperatori($id);

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
                a.id_reparto,
                rep.label AS reparto_label,
                (
                    SELECT GROUP_CONCAT(DISTINCT acc.username ORDER BY acc.username SEPARATOR ', ')
                    FROM tb_lavorazioni_attivita_operatori lao
                    INNER JOIN auth_accounts acc ON acc.id_account = lao.id_account
                    WHERE lao.id_attivita = a.id_attivita
                ) AS assegnatari,
                (
                    SELECT GROUP_CONCAT(DISTINCT lao.id_account ORDER BY lao.id_account SEPARATOR ',')
                    FROM tb_lavorazioni_attivita_operatori lao
                    WHERE lao.id_attivita = a.id_attivita
                ) AS assegnatari_ids
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
            $row['id_reparto'] = isset($row['id_reparto']) ? (int) $row['id_reparto'] : null;
            if (!empty($row['assegnatari'])) {
                $row['assegnatari'] = array_map('trim', explode(',', (string) $row['assegnatari']));
            } else {
                $row['assegnatari'] = [];
            }
            if (!empty($row['assegnatari_ids'])) {
                $ids = array_filter(
                    array_map('intval', explode(',', (string) $row['assegnatari_ids'])),
                    static fn ($value) => $value > 0,
                );
                $row['assegnatari_ids'] = array_values($ids);
            } else {
                $row['assegnatari_ids'] = [];
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
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $map = [];
        foreach ($rows as $row) {
            $idAccount = isset($row['id_account']) ? (int) $row['id_account'] : 0;
            if ($idAccount <= 0) {
                continue;
            }
            $map[$idAccount] = [
                'id_account' => $idAccount,
                'nome' => $row['nome'] ?? null,
                'ruolo' => $row['ruolo'] ?? null,
                'carico_attivita' => isset($row['carico_attivita']) ? (int) $row['carico_attivita'] : 0,
            ];
        }

        $jobSql = <<<SQL
            SELECT lo.id_account, acc.username AS nome, lo.ruolo
            FROM tb_lavorazioni_operatori lo
            LEFT JOIN auth_accounts acc ON acc.id_account = lo.id_account
            WHERE lo.id_lavorazione = :id
        SQL;
        $stmt = $this->pdo->prepare($jobSql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $jobRows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($jobRows as $row) {
            $idAccount = isset($row['id_account']) ? (int) $row['id_account'] : 0;
            if ($idAccount <= 0) {
                continue;
            }
            if (!isset($map[$idAccount])) {
                $map[$idAccount] = [
                    'id_account' => $idAccount,
                    'nome' => $row['nome'] ?? null,
                    'ruolo' => $row['ruolo'] ?? null,
                    'carico_attivita' => 0,
                ];
            } elseif (empty($map[$idAccount]['nome'])) {
                $map[$idAccount]['nome'] = $row['nome'] ?? $map[$idAccount]['nome'];
            }
        }

        ksort($map);

        return array_values($map);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchLavorazioneOperatori(int $lavorazioneId): array
    {
        $sql = <<<SQL
            SELECT lo.id_account, acc.username AS nome, acc.email, lo.ruolo
            FROM tb_lavorazioni_operatori lo
            LEFT JOIN auth_accounts acc ON acc.id_account = lo.id_account
            WHERE lo.id_lavorazione = :id
            ORDER BY acc.username ASC
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            $row['id_account'] = isset($row['id_account']) ? (int) $row['id_account'] : null;
        }
        unset($row);

        return $rows;
    }

    private function buildJobCode(?int $anno, ?int $numeroDocumento, int $idLavorazione): string
    {
        $year = $anno ?? (int) date('Y');
        $sequence = $numeroDocumento ?? $idLavorazione;

        return sprintf('JOB-%d-%04d', $year, max(1, (int) $sequence));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listActivityTemplates(bool $onlyActive = true): array
    {
        $sql = 'SELECT id_template, titolo, descrizione, priorita, id_reparto, durata_predefinita_giorni, attivo FROM cfg_lavorazioni_attivita_template';
        if ($onlyActive) {
            $sql .= ' WHERE attivo = 1';
        }
        $sql .= ' ORDER BY ordering ASC, titolo ASC';
        $stmt = $this->pdo->query($sql);
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findActivityTemplate(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id_template, titolo, descrizione, priorita, id_reparto, durata_predefinita_giorni, attivo FROM cfg_lavorazioni_attivita_template WHERE id_template = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function createActivity(int $lavorazioneId, array $data): array
    {
        $orderStmt = $this->pdo->prepare('SELECT COALESCE(MAX(ordine), 0) + 1 FROM tb_lavorazioni_attivita WHERE id_lavorazione = :id');
        $orderStmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $orderStmt->execute();
        $nextOrder = (int) ($orderStmt->fetchColumn() ?: 1);

        $sql = <<<'SQL'
            INSERT INTO tb_lavorazioni_attivita (
                id_lavorazione,
                titolo,
                descrizione,
                stato,
                priorita,
                id_reparto,
                ordine,
                data_scadenza,
                quantita_prevista,
                note,
                data_creazione
            ) VALUES (
                :id_lavorazione,
                :titolo,
                :descrizione,
                :stato,
                :priorita,
                :id_reparto,
                :ordine,
                :data_scadenza,
                :quantita_prevista,
                :note,
                NOW()
            )
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_lavorazione', $lavorazioneId, PDO::PARAM_INT);
        $stmt->bindValue(':titolo', $data['titolo'], PDO::PARAM_STR);
        $stmt->bindValue(':descrizione', $data['descrizione'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':stato', $data['stato'] ?? 'todo', PDO::PARAM_STR);
        $stmt->bindValue(':priorita', $data['priorita'] ?? 'medium', PDO::PARAM_STR);
        if (!empty($data['id_reparto'])) {
            $stmt->bindValue(':id_reparto', (int) $data['id_reparto'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':ordine', $nextOrder, PDO::PARAM_INT);
        if (!empty($data['data_scadenza'])) {
            $stmt->bindValue(':data_scadenza', $data['data_scadenza'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':data_scadenza', null, PDO::PARAM_NULL);
        }
        if (isset($data['quantita_prevista']) && $data['quantita_prevista'] !== null && $data['quantita_prevista'] !== '') {
            $stmt->bindValue(':quantita_prevista', $data['quantita_prevista'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':quantita_prevista', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':note', $data['note'] ?? null, PDO::PARAM_STR);
        $stmt->execute();

        $id = (int) $this->pdo->lastInsertId();
        if (!empty($data['operator_ids'])) {
            $this->replaceActivityOperators($id, $data['operator_ids']);
        }
        $fetch = $this->pdo->prepare('SELECT * FROM tb_lavorazioni_attivita WHERE id_attivita = :id LIMIT 1');
        $fetch->bindValue(':id', $id, PDO::PARAM_INT);
        $fetch->execute();
        $row = $fetch->fetch(PDO::FETCH_ASSOC) ?: [];
        $row['id_attivita'] = $id;

        return $row;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findActivity(int $activityId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id_attivita, id_lavorazione, titolo, descrizione, id_reparto FROM tb_lavorazioni_attivita WHERE id_attivita = :id LIMIT 1');
        $stmt->bindValue(':id', $activityId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * @param array<int, int> $operatorIds
     */
    public function updateLavorazioneAssignments(int $lavorazioneId, ?int $repartoId, array $operatorIds): void
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('UPDATE tb_lavorazioni SET id_reparto = :id_reparto, updated_at = NOW() WHERE id_lavorazione = :id');
            $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
            if ($repartoId !== null) {
                $stmt->bindValue(':id_reparto', $repartoId, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
            }
            $stmt->execute();

            $this->replaceJobOperators($lavorazioneId, $operatorIds);

            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    /**
     * @param array<int, int> $operatorIds
     */
    public function updateActivityAssignments(int $activityId, ?int $repartoId, array $operatorIds): void
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('UPDATE tb_lavorazioni_attivita SET id_reparto = :id_reparto WHERE id_attivita = :id');
            $stmt->bindValue(':id', $activityId, PDO::PARAM_INT);
            if ($repartoId !== null) {
                $stmt->bindValue(':id_reparto', $repartoId, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
            }
            $stmt->execute();

            $this->replaceActivityOperators($activityId, $operatorIds);

            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    /**
     * @param array<int, int> $operatorIds
     */
    private function replaceJobOperators(int $lavorazioneId, array $operatorIds): void
    {
        $delete = $this->pdo->prepare('DELETE FROM tb_lavorazioni_operatori WHERE id_lavorazione = :id');
        $delete->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $delete->execute();

        if ($operatorIds === []) {
            return;
        }

        $insert = $this->pdo->prepare('INSERT INTO tb_lavorazioni_operatori (id_lavorazione, id_account, ruolo) VALUES (:id_lavorazione, :id_account, :ruolo)');
        foreach ($operatorIds as $operatorId) {
            $insert->bindValue(':id_lavorazione', $lavorazioneId, PDO::PARAM_INT);
            $insert->bindValue(':id_account', $operatorId, PDO::PARAM_INT);
            $insert->bindValue(':ruolo', 'owner', PDO::PARAM_STR);
            $insert->execute();
        }
    }

    /**
     * @param array<int, int> $operatorIds
     */
    private function replaceActivityOperators(int $activityId, array $operatorIds): void
    {
        $delete = $this->pdo->prepare('DELETE FROM tb_lavorazioni_attivita_operatori WHERE id_attivita = :id');
        $delete->bindValue(':id', $activityId, PDO::PARAM_INT);
        $delete->execute();

        if ($operatorIds === []) {
            return;
        }

        $insert = $this->pdo->prepare('INSERT INTO tb_lavorazioni_attivita_operatori (id_attivita, id_account, ruolo) VALUES (:id_attivita, :id_account, :ruolo)');
        foreach ($operatorIds as $operatorId) {
            $insert->bindValue(':id_attivita', $activityId, PDO::PARAM_INT);
            $insert->bindValue(':id_account', $operatorId, PDO::PARAM_INT);
            $insert->bindValue(':ruolo', 'owner', PDO::PARAM_STR);
            $insert->execute();
        }
    }

    public function createNotifications(int $lavorazioneId, ?int $attivitaId, array $operatorIds, string $title, string $message): int
    {
        if ($operatorIds === []) {
            return 0;
        }

        $sql = <<<SQL
            INSERT INTO tb_lavorazioni_notifiche (
                id_lavorazione,
                id_attivita,
                id_account,
                tipo,
                titolo,
                messaggio,
                stato,
                created_at
            ) VALUES (
                :id_lavorazione,
                :id_attivita,
                :id_account,
                'dashboard',
                :titolo,
                :messaggio,
                'pending',
                NOW()
            )
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $count = 0;
        foreach ($operatorIds as $operatorId) {
            $stmt->bindValue(':id_lavorazione', $lavorazioneId, PDO::PARAM_INT);
            if ($attivitaId !== null) {
                $stmt->bindValue(':id_attivita', $attivitaId, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_attivita', null, PDO::PARAM_NULL);
            }
            $stmt->bindValue(':id_account', $operatorId, PDO::PARAM_INT);
            $stmt->bindValue(':titolo', $title, PDO::PARAM_STR);
            $stmt->bindValue(':messaggio', $message, PDO::PARAM_STR);
            $stmt->execute();
            $count += (int) $stmt->rowCount();
        }

        return $count;
    }
}
