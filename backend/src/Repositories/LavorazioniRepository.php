<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class LavorazioniRepository
{
    public function __construct(private PDO $pdo) {}

    private array $spedizioniColumns = [];
    private bool $spedizioniColumnsLoaded = false;

    private function ensureSpedizioniColumns(): void
    {
        if ($this->spedizioniColumnsLoaded) {
            return;
        }
        $stmt = $this->pdo->prepare('
            SELECT COLUMN_NAME
            FROM information_schema.columns
            WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = :table
        ');
        $stmt->bindValue(':table', 'tb_lavorazioni_spedizioni', PDO::PARAM_STR);
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $this->spedizioniColumns = array_map('strtolower', $columns);
        $this->spedizioniColumnsLoaded = true;
    }

    public function hasSpedizioneColumn(string $column): bool
    {
        $this->ensureSpedizioniColumns();
        return in_array(strtolower($column), $this->spedizioniColumns, true);
    }

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

    public function updateNote(int $lavorazioneId, ?string $note): void
    {
        $stmt = $this->pdo->prepare('UPDATE tb_lavorazioni SET note = :note, updated_at = NOW() WHERE id_lavorazione = :id');
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        if ($note === null) {
            $stmt->bindValue(':note', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':note', $note, PDO::PARAM_STR);
        }
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            throw new \RuntimeException('Lavorazione non trovata per aggiornare le note.', 404);
        }
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateInfo(int $lavorazioneId, array $data): void
    {
        $fields = [];

        if (array_key_exists('titolo', $data)) {
            $fields[] = 'titolo = :titolo';
        }
        if (array_key_exists('descrizione', $data)) {
            $fields[] = 'descrizione = :descrizione';
        }
        if (array_key_exists('stato', $data)) {
            $fields[] = 'stato = :stato';
        }
        if (array_key_exists('priorita', $data)) {
            $fields[] = 'priorita = :priorita';
        }
        if (array_key_exists('id_reparto', $data)) {
            $fields[] = 'id_reparto = :id_reparto';
        }
        if (array_key_exists('data_inizio_prevista', $data)) {
            $fields[] = 'data_inizio_prevista = :data_inizio_prevista';
        }
        if (array_key_exists('data_fine_prevista', $data)) {
            $fields[] = 'data_fine_prevista = :data_fine_prevista';
        }
        if (array_key_exists('data_avvio_reale', $data)) {
            $fields[] = 'data_avvio_reale = :data_avvio_reale';
        }
        if (array_key_exists('note', $data)) {
            $fields[] = 'note = :note';
        }

        if ($fields === []) {
            return;
        }

        $sql = 'UPDATE tb_lavorazioni SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id_lavorazione = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);

        if (array_key_exists('titolo', $data)) {
            $stmt->bindValue(':titolo', $data['titolo'], PDO::PARAM_STR);
        }
        if (array_key_exists('descrizione', $data)) {
            if ($data['descrizione'] === null) {
                $stmt->bindValue(':descrizione', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':descrizione', $data['descrizione'], PDO::PARAM_STR);
            }
        }
        if (array_key_exists('stato', $data)) {
            $stmt->bindValue(':stato', $data['stato'], PDO::PARAM_STR);
        }
        if (array_key_exists('priorita', $data)) {
            $stmt->bindValue(':priorita', $data['priorita'], PDO::PARAM_STR);
        }
        if (array_key_exists('id_reparto', $data)) {
            if ($data['id_reparto'] === null) {
                $stmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':id_reparto', (int) $data['id_reparto'], PDO::PARAM_INT);
            }
        }
        if (array_key_exists('data_inizio_prevista', $data)) {
            if ($data['data_inizio_prevista'] === null) {
                $stmt->bindValue(':data_inizio_prevista', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':data_inizio_prevista', $data['data_inizio_prevista'], PDO::PARAM_STR);
            }
        }
        if (array_key_exists('data_fine_prevista', $data)) {
            if ($data['data_fine_prevista'] === null) {
                $stmt->bindValue(':data_fine_prevista', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':data_fine_prevista', $data['data_fine_prevista'], PDO::PARAM_STR);
            }
        }
        if (array_key_exists('data_avvio_reale', $data)) {
            if ($data['data_avvio_reale'] === null) {
                $stmt->bindValue(':data_avvio_reale', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':data_avvio_reale', $data['data_avvio_reale'], PDO::PARAM_STR);
            }
        }
        if (array_key_exists('note', $data)) {
            if ($data['note'] === null) {
                $stmt->bindValue(':note', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':note', $data['note'], PDO::PARAM_STR);
            }
        }

        $stmt->execute();
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
                n.tipo,
                n.payload,
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

        if (isset($filters['allowed_anagrafiche']) && is_array($filters['allowed_anagrafiche'])) {
            $allowed = array_values(array_filter(array_map('intval', $filters['allowed_anagrafiche']), static fn ($id) => $id > 0));
            if ($allowed === []) {
                return 'WHERE 1=0';
            }
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $key = ':allowed_' . $index;
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $clauses[] = 'l.id_anagrafica IN (' . implode(',', $placeholders) . ')';
        }

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
                p.numero_documento AS numero_preventivo,
                p.data_preventivo,
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
                a.percentuale,
                a.note,
                r.data_avvio,
                r.data_fine,
                r.id_operatore,
                r.note AS report_note,
                r.updated_at AS report_updated_at,
                repop.username AS report_operatore_nome,
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
            LEFT JOIN tb_lavorazioni_attivita_report r ON r.id_attivita = a.id_attivita
            LEFT JOIN auth_accounts repop ON repop.id_account = r.id_operatore
            WHERE a.id_lavorazione = :id
            ORDER BY a.ordine ASC, a.data_scadenza ASC, a.id_attivita ASC
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            $row['id_reparto'] = isset($row['id_reparto']) ? (int) $row['id_reparto'] : null;
            $row['id_operatore'] = isset($row['id_operatore']) ? (int) $row['id_operatore'] : null;
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
            $row['percentuale'] = isset($row['percentuale']) ? (int) $row['percentuale'] : 0;
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
        $sql = 'SELECT id_template, titolo, descrizione, priorita, id_reparto, durata_predefinita_giorni, attivo, ordering FROM cfg_lavorazioni_attivita_template';
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
        $stmt = $this->pdo->prepare('SELECT id_template, titolo, descrizione, priorita, id_reparto, durata_predefinita_giorni, attivo, ordering FROM cfg_lavorazioni_attivita_template WHERE id_template = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed> $data
     */
    public function updateActivityInfo(int $activityId, array $data): void
    {
        $fields = [];

        if (array_key_exists('titolo', $data)) {
            $fields[] = 'titolo = :titolo';
        }
        if (array_key_exists('descrizione', $data)) {
            $fields[] = 'descrizione = :descrizione';
        }
        if (array_key_exists('priorita', $data)) {
            $fields[] = 'priorita = :priorita';
        }
        if (array_key_exists('id_reparto', $data)) {
            $fields[] = 'id_reparto = :id_reparto';
        }
        if (array_key_exists('data_scadenza', $data)) {
            $fields[] = 'data_scadenza = :data_scadenza';
        }
        if (array_key_exists('note', $data)) {
            $fields[] = 'note = :note';
        }
        if (array_key_exists('quantita_prevista', $data)) {
            $fields[] = 'quantita_prevista = :quantita_prevista';
        }

        if ($fields === []) {
            return;
        }

        $sql = 'UPDATE tb_lavorazioni_attivita SET ' . implode(', ', $fields) . ' WHERE id_attivita = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $activityId, PDO::PARAM_INT);

        if (array_key_exists('titolo', $data)) {
            $stmt->bindValue(':titolo', (string) $data['titolo'], PDO::PARAM_STR);
        }
        if (array_key_exists('descrizione', $data)) {
            if ($data['descrizione'] === null) {
                $stmt->bindValue(':descrizione', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':descrizione', (string) $data['descrizione'], PDO::PARAM_STR);
            }
        }
        if (array_key_exists('priorita', $data)) {
            $stmt->bindValue(':priorita', (string) $data['priorita'], PDO::PARAM_STR);
        }
        if (array_key_exists('id_reparto', $data)) {
            if ($data['id_reparto'] === null) {
                $stmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':id_reparto', (int) $data['id_reparto'], PDO::PARAM_INT);
            }
        }
        if (array_key_exists('data_scadenza', $data)) {
            if ($data['data_scadenza'] === null) {
                $stmt->bindValue(':data_scadenza', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':data_scadenza', (string) $data['data_scadenza'], PDO::PARAM_STR);
            }
        }
        if (array_key_exists('note', $data)) {
            if ($data['note'] === null) {
                $stmt->bindValue(':note', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':note', (string) $data['note'], PDO::PARAM_STR);
            }
        }
        if (array_key_exists('quantita_prevista', $data)) {
            if ($data['quantita_prevista'] === null) {
                $stmt->bindValue(':quantita_prevista', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':quantita_prevista', (string) $data['quantita_prevista'], PDO::PARAM_STR);
            }
        }

        $stmt->execute();
    }

    /**
     * @param array<string, mixed> $data
     */
    public function upsertActivityTemplate(?int $id, array $data): int
    {
        if ($id !== null && $id > 0) {
            $sql = <<<'SQL'
                UPDATE cfg_lavorazioni_attivita_template
                SET titolo = :titolo,
                    descrizione = :descrizione,
                    priorita = :priorita,
                    id_reparto = :id_reparto,
                    durata_predefinita_giorni = :durata,
                    attivo = :attivo,
                    ordering = :ordering,
                    updated_at = NOW()
                WHERE id_template = :id
            SQL;
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        } else {
            $sql = <<<'SQL'
                INSERT INTO cfg_lavorazioni_attivita_template (
                    titolo,
                    descrizione,
                    priorita,
                    id_reparto,
                    durata_predefinita_giorni,
                    attivo,
                    ordering,
                    created_at,
                    updated_at
                ) VALUES (
                    :titolo,
                    :descrizione,
                    :priorita,
                    :id_reparto,
                    :durata,
                    :attivo,
                    :ordering,
                    NOW(),
                    NOW()
                )
            SQL;
            $stmt = $this->pdo->prepare($sql);
        }

        $stmt->bindValue(':titolo', (string) $data['titolo'], PDO::PARAM_STR);
        if (array_key_exists('descrizione', $data) && $data['descrizione'] !== null && $data['descrizione'] !== '') {
            $stmt->bindValue(':descrizione', (string) $data['descrizione'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':descrizione', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':priorita', (string) $data['priorita'], PDO::PARAM_STR);
        if (!empty($data['id_reparto'])) {
            $stmt->bindValue(':id_reparto', (int) $data['id_reparto'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_reparto', null, PDO::PARAM_NULL);
        }
        if (!empty($data['durata_predefinita_giorni'])) {
            $stmt->bindValue(':durata', (int) $data['durata_predefinita_giorni'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':durata', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':attivo', (int) ($data['attivo'] ?? 1), PDO::PARAM_INT);
        $stmt->bindValue(':ordering', (int) ($data['ordering'] ?? 100), PDO::PARAM_INT);

        $stmt->execute();

        if ($id !== null && $id > 0) {
            return $id;
        }

        return (int) $this->pdo->lastInsertId();
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
                percentuale,
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
                        :percentuale,
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
            $stmt->bindValue(':percentuale', isset($data['percentuale']) ? (int) $data['percentuale'] : 0, PDO::PARAM_INT);
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
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT
                a.id_attivita,
                a.id_lavorazione,
                a.stato,
                a.priorita,
                a.note,
                a.titolo,
                a.descrizione,
                a.id_reparto,
                a.data_creazione,
                a.data_scadenza,
                a.percentuale,
                r.data_avvio,
                r.data_fine,
                r.id_operatore,
                r.note AS report_note,
                r.updated_at AS report_updated_at
            FROM tb_lavorazioni_attivita a
            LEFT JOIN tb_lavorazioni_attivita_report r ON r.id_attivita = a.id_attivita
            WHERE a.id_attivita = :id
            LIMIT 1
        SQL);
        $stmt->bindValue(':id', $activityId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * @param array<string, mixed>|null $oldValue
     * @param array<string, mixed>|null $newValue
     */
    public function createTimelineEvent(
        int $lavorazioneId,
        ?int $attivitaId,
        string $evento,
        ?string $note,
        ?array $oldValue = null,
        ?array $newValue = null,
        ?int $createdBy = null,
    ): void {
        $sql = <<<'SQL'
            INSERT INTO tb_lavorazioni_eventi (
                id_lavorazione,
                id_attivita,
                evento,
                old_value,
                new_value,
                note,
                created_at,
                created_by
            ) VALUES (
                :id_lavorazione,
                :id_attivita,
                :evento,
                :old_value,
                :new_value,
                :note,
                NOW(),
                :created_by
            )
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_lavorazione', $lavorazioneId, PDO::PARAM_INT);
        if ($attivitaId !== null && $attivitaId > 0) {
            $stmt->bindValue(':id_attivita', $attivitaId, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_attivita', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':evento', $evento, PDO::PARAM_STR);
        if ($oldValue !== null) {
            $stmt->bindValue(':old_value', json_encode($oldValue), PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':old_value', null, PDO::PARAM_NULL);
        }
        if ($newValue !== null) {
            $stmt->bindValue(':new_value', json_encode($newValue), PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':new_value', null, PDO::PARAM_NULL);
        }
        if ($note !== null && $note !== '') {
            $stmt->bindValue(':note', $note, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':note', null, PDO::PARAM_NULL);
        }
        if ($createdBy !== null && $createdBy > 0) {
            $stmt->bindValue(':created_by', $createdBy, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':created_by', null, PDO::PARAM_NULL);
        }
        $stmt->execute();
    }

    public function updateActivityReport(int $activityId, ?string $dataAvvio, ?string $dataFine, ?int $operatoreId, ?string $note): array
    {
        $select = $this->pdo->prepare('SELECT id_lavorazione FROM tb_lavorazioni_attivita WHERE id_attivita = :id LIMIT 1');
        $select->bindValue(':id', $activityId, PDO::PARAM_INT);
        $select->execute();
        $activity = $select->fetch(PDO::FETCH_ASSOC);
        if ($activity === false) {
            throw new \RuntimeException('Attivit… non trovata per aggiornare il report.', 404);
        }

        $exists = $this->pdo->prepare('SELECT id_report FROM tb_lavorazioni_attivita_report WHERE id_attivita = :id LIMIT 1');
        $exists->bindValue(':id', $activityId, PDO::PARAM_INT);
        $exists->execute();
        $reportId = $exists->fetchColumn();

        if ($reportId === false) {
            $insert = $this->pdo->prepare(<<<'SQL'
                INSERT INTO tb_lavorazioni_attivita_report (
                    id_attivita,
                    data_avvio,
                    data_fine,
                    id_operatore,
                    note,
                    created_at,
                    updated_at
                ) VALUES (
                    :id_attivita,
                    :data_avvio,
                    :data_fine,
                    :id_operatore,
                    :note,
                    NOW(),
                    NOW()
                )
            SQL);
            $insert->bindValue(':id_attivita', $activityId, PDO::PARAM_INT);
            if ($dataAvvio !== null) {
                $insert->bindValue(':data_avvio', $dataAvvio, PDO::PARAM_STR);
            } else {
                $insert->bindValue(':data_avvio', null, PDO::PARAM_NULL);
            }
            if ($dataFine !== null) {
                $insert->bindValue(':data_fine', $dataFine, PDO::PARAM_STR);
            } else {
                $insert->bindValue(':data_fine', null, PDO::PARAM_NULL);
            }
            if ($operatoreId !== null && $operatoreId > 0) {
                $insert->bindValue(':id_operatore', $operatoreId, PDO::PARAM_INT);
            } else {
                $insert->bindValue(':id_operatore', null, PDO::PARAM_NULL);
            }
            if ($note !== null) {
                $insert->bindValue(':note', $note, PDO::PARAM_STR);
            } else {
                $insert->bindValue(':note', null, PDO::PARAM_NULL);
            }
            $insert->execute();
        } else {
            $update = $this->pdo->prepare(<<<'SQL'
                UPDATE tb_lavorazioni_attivita_report
                SET data_avvio = :data_avvio,
                    data_fine = :data_fine,
                    id_operatore = :id_operatore,
                    note = :note,
                    updated_at = NOW()
                WHERE id_attivita = :id_attivita
            SQL);
            $update->bindValue(':id_attivita', $activityId, PDO::PARAM_INT);
            if ($dataAvvio !== null) {
                $update->bindValue(':data_avvio', $dataAvvio, PDO::PARAM_STR);
            } else {
                $update->bindValue(':data_avvio', null, PDO::PARAM_NULL);
            }
            if ($dataFine !== null) {
                $update->bindValue(':data_fine', $dataFine, PDO::PARAM_STR);
            } else {
                $update->bindValue(':data_fine', null, PDO::PARAM_NULL);
            }
            if ($operatoreId !== null && $operatoreId > 0) {
                $update->bindValue(':id_operatore', $operatoreId, PDO::PARAM_INT);
            } else {
                $update->bindValue(':id_operatore', null, PDO::PARAM_NULL);
            }
            if ($note !== null) {
                $update->bindValue(':note', $note, PDO::PARAM_STR);
            } else {
                $update->bindValue(':note', null, PDO::PARAM_NULL);
            }
            $update->execute();
        }

        return [
            'lavorazione_id' => isset($activity['id_lavorazione']) ? (int) $activity['id_lavorazione'] : 0,
        ];
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

    public function updateActivityStatus(int $activityId, string $stato, int $percentuale): array
    {
        $select = $this->pdo->prepare('SELECT id_lavorazione, data_creazione, data_scadenza FROM tb_lavorazioni_attivita WHERE id_attivita = :id LIMIT 1');
        $select->bindValue(':id', $activityId, PDO::PARAM_INT);
        $select->execute();
        $activity = $select->fetch(PDO::FETCH_ASSOC);
        if ($activity === false) {
            throw new \RuntimeException('Attività non trovata per aggiornare lo stato.', 404);
        }

        $stmt = $this->pdo->prepare(<<<'SQL'
            UPDATE tb_lavorazioni_attivita
            SET stato = :stato,
                percentuale = :percentuale,
                data_completamento = CASE WHEN :is_done = 1 THEN NOW() ELSE NULL END
            WHERE id_attivita = :id
        SQL);
        $stmt->bindValue(':id', $activityId, PDO::PARAM_INT);
        $stmt->bindValue(':stato', $stato, PDO::PARAM_STR);
        $stmt->bindValue(':is_done', $stato === 'done' ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':percentuale', max(0, min(100, $percentuale)), PDO::PARAM_INT);
        $stmt->execute();
        // MySQL rowCount may return 0 when no columns change; do not treat it as an error here.

        return [
            'lavorazione_id' => isset($activity['id_lavorazione']) ? (int) $activity['id_lavorazione'] : 0,
            'data_creazione' => $activity['data_creazione'] ?? null,
            'data_scadenza' => $activity['data_scadenza'] ?? null,
        ];
    }

    public function updateLavorazionePercentuale(int $lavorazioneId, int $percentuale): void
    {
        $stmt = $this->pdo->prepare('UPDATE tb_lavorazioni SET percentuale_avanzamento = :percentuale, updated_at = NOW() WHERE id_lavorazione = :id');
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->bindValue(':percentuale', $percentuale, PDO::PARAM_INT);
        $stmt->execute();
    }

    public function deleteActivity(int $activityId): array
    {
        $select = $this->pdo->prepare('SELECT id_lavorazione FROM tb_lavorazioni_attivita WHERE id_attivita = :id LIMIT 1');
        $select->bindValue(':id', $activityId, PDO::PARAM_INT);
        $select->execute();
        $activity = $select->fetch(PDO::FETCH_ASSOC);
        if ($activity === false) {
            return ['lavorazione_id' => 0];
        }

        $deleteAssociations = $this->pdo->prepare('DELETE FROM tb_lavorazioni_attivita_operatori WHERE id_attivita = :id');
        $deleteAssociations->bindValue(':id', $activityId, PDO::PARAM_INT);
        $deleteAssociations->execute();

        $delete = $this->pdo->prepare('DELETE FROM tb_lavorazioni_attivita WHERE id_attivita = :id');
        $delete->bindValue(':id', $activityId, PDO::PARAM_INT);
        $delete->execute();

        return [
            'lavorazione_id' => isset($activity['id_lavorazione']) ? (int) $activity['id_lavorazione'] : 0,
        ];
    }

    public function calculateLavorazionePercentuale(int $lavorazioneId): int
    {
        $sql = <<<SQL
            SELECT
                SUM(COALESCE(a.quantita_prevista, 1) * COALESCE(a.percentuale, 0)) AS weighted,
                SUM(COALESCE(a.quantita_prevista, 1)) AS total_weight
            FROM tb_lavorazioni_attivita a
            WHERE a.id_lavorazione = :id
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $weighted = isset($row['weighted']) ? (float) $row['weighted'] : 0.0;
        $totalWeight = isset($row['total_weight']) ? (float) $row['total_weight'] : 0.0;
        if ($totalWeight <= 0.0) {
            return 0;
        }
        return max(0, min(100, (int) round($weighted / $totalWeight)));
    }

    public function hasSuspendedActivities(int $lavorazioneId): bool
    {
        $stmt = $this->pdo->prepare("SELECT 1 FROM tb_lavorazioni_attivita WHERE id_lavorazione = :id AND stato = 'sospesa' LIMIT 1");
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        return (bool) $stmt->fetchColumn();
    }

    public function countOpenActivities(int $lavorazioneId): int
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM tb_lavorazioni_attivita WHERE id_lavorazione = :id AND stato <> 'done'");
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        return (int) ($stmt->fetchColumn() ?: 0);
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchRelatedDocuments(int $lavorazioneId): array
    {
        $stmt = $this->pdo->prepare('SELECT id_preventivo FROM tb_lavorazioni WHERE id_lavorazione = :id LIMIT 1');
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $preventivoId = (int) ($stmt->fetchColumn() ?: 0);
        if ($preventivoId <= 0) {
            return [
                'preventivo' => null,
                'ddt' => [],
                'fatture' => [],
                'ordini' => [],
            ];
        }

        $prevStmt = $this->pdo->prepare(<<<'SQL'
            SELECT id_preventivo, anno_preventivo, numero_documento, data_preventivo, totale
            FROM tb_preventivi
            WHERE id_preventivo = :id
            LIMIT 1
        SQL);
        $prevStmt->bindValue(':id', $preventivoId, PDO::PARAM_INT);
        $prevStmt->execute();
        $preventivo = $prevStmt->fetch(PDO::FETCH_ASSOC) ?: null;

        $ddtStmt = $this->pdo->prepare(<<<'SQL'
            SELECT d.id_ddt, d.anno, d.numero_documento, d.data_ddt
            FROM appoggio_preventivo_ddt apd
            INNER JOIN tb_ddt d ON d.id_ddt = apd.id_ddt
            WHERE apd.id_preventivo = :id
            ORDER BY d.data_ddt DESC, d.id_ddt DESC
        SQL);
        $ddtStmt->bindValue(':id', $preventivoId, PDO::PARAM_INT);
        $ddtStmt->execute();
        $ddt = $ddtStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $fattStmt = $this->pdo->prepare(<<<'SQL'
            SELECT f.id_fattura, f.anno, f.numero_documento, f.data_fattura, f.totale, f.saldo
            FROM appoggio_preventivo_fattura apf
            INNER JOIN tb_fatture f ON f.id_fattura = apf.id_fattura
            WHERE apf.id_preventivo = :id
            ORDER BY f.data_fattura DESC, f.id_fattura DESC
        SQL);
        $fattStmt->bindValue(':id', $preventivoId, PDO::PARAM_INT);
        $fattStmt->execute();
        $fatture = $fattStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'preventivo' => $preventivo,
            'ddt' => $ddt,
            'fatture' => $fatture,
            'ordini' => [],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listLavorazioneFiles(int $lavorazioneId): array
    {
        $sql = <<<SQL
            SELECT
                f.id_file,
                f.id_lavorazione,
                f.titolo,
                f.categoria,
                f.original_name,
                f.file_name,
                f.mime_type,
                f.size_bytes,
                f.note,
                f.created_at,
                f.created_by,
                dl.last_download_at,
                dl.download_count,
                acc.username AS last_download_by
            FROM tb_lavorazioni_files f
            LEFT JOIN (
                SELECT
                    id_file,
                    MAX(downloaded_at) AS last_download_at,
                    COUNT(*) AS download_count,
                    SUBSTRING_INDEX(GROUP_CONCAT(downloaded_by ORDER BY downloaded_at DESC), ',', 1) AS last_download_by_id
                FROM tb_lavorazioni_files_downloads
                GROUP BY id_file
            ) dl ON dl.id_file = f.id_file
            LEFT JOIN auth_accounts acc ON acc.id_account = dl.last_download_by_id
            WHERE f.id_lavorazione = :id
            ORDER BY f.created_at DESC, f.id_file DESC
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createLavorazioneFile(int $lavorazioneId, array $data): int
    {
        $sql = <<<SQL
            INSERT INTO tb_lavorazioni_files (
                id_lavorazione,
                titolo,
                categoria,
                original_name,
                file_name,
                mime_type,
                size_bytes,
                note,
                created_at,
                created_by
            ) VALUES (
                :id_lavorazione,
                :titolo,
                :categoria,
                :original_name,
                :file_name,
                :mime_type,
                :size_bytes,
                :note,
                NOW(),
                :created_by
            )
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_lavorazione', $lavorazioneId, PDO::PARAM_INT);
        $stmt->bindValue(':titolo', (string) $data['titolo'], PDO::PARAM_STR);
        $stmt->bindValue(':categoria', (string) $data['categoria'], PDO::PARAM_STR);
        $stmt->bindValue(':original_name', (string) $data['original_name'], PDO::PARAM_STR);
        $stmt->bindValue(':file_name', (string) $data['file_name'], PDO::PARAM_STR);
        $stmt->bindValue(':mime_type', (string) $data['mime_type'], PDO::PARAM_STR);
        $stmt->bindValue(':size_bytes', (int) $data['size_bytes'], PDO::PARAM_INT);
        if (!empty($data['note'])) {
            $stmt->bindValue(':note', (string) $data['note'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':note', null, PDO::PARAM_NULL);
        }
        if (!empty($data['created_by'])) {
            $stmt->bindValue(':created_by', (int) $data['created_by'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':created_by', null, PDO::PARAM_NULL);
        }
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findLavorazioneFile(int $fileId): ?array
    {
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT
                id_file,
                id_lavorazione,
                titolo,
                categoria,
                original_name,
                file_name,
                mime_type,
                size_bytes,
                note,
                created_at,
                created_by
            FROM tb_lavorazioni_files
            WHERE id_file = :id
            LIMIT 1
        SQL);
        $stmt->bindValue(':id', $fileId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function logLavorazioneFileDownload(int $fileId, ?int $accountId): void
    {
        $sql = <<<SQL
            INSERT INTO tb_lavorazioni_files_downloads (
                id_file,
                downloaded_by,
                downloaded_at
            ) VALUES (
                :id_file,
                :downloaded_by,
                NOW()
            )
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_file', $fileId, PDO::PARAM_INT);
        if ($accountId !== null && $accountId > 0) {
            $stmt->bindValue(':downloaded_by', $accountId, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':downloaded_by', null, PDO::PARAM_NULL);
        }
        $stmt->execute();
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

    public function createNotifications(
        int $lavorazioneId,
        ?int $attivitaId,
        array $operatorIds,
        string $title,
        string $message,
        ?int $createdBy = null,
    ): int
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
                created_at,
                created_by
            ) VALUES (
                :id_lavorazione,
                :id_attivita,
                :id_account,
                'dashboard',
                :titolo,
                :messaggio,
                'pending',
                NOW(),
                :created_by
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
            if ($createdBy !== null && $createdBy > 0) {
                $stmt->bindValue(':created_by', $createdBy, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':created_by', null, PDO::PARAM_NULL);
            }
            $stmt->execute();
            $count += (int) $stmt->rowCount();
        }

        return $count;
    }

    /**
     * @param int $lavorazioneId
     * @return array<int, array<string, mixed>>
     */
    public function fetchSpedizioni(int $lavorazioneId): array
    {
        $supportsAffrancatura = $this->hasSpedizioneColumn('id_affrancatura');
        $affrancaturaSelect = $supportsAffrancatura
            ? "                s.id_affrancatura,\n                aff.code AS affrancatura_code,\n                aff.label AS affrancatura_label,\n"
            : "                NULL AS id_affrancatura,\n                NULL AS affrancatura_code,\n                NULL AS affrancatura_label,\n";
        $affrancaturaJoin = $supportsAffrancatura
            ? "            LEFT JOIN cfg_lavorazioni_spedizioni_affrancature aff ON aff.id_affrancatura = s.id_affrancatura\n"
            : '';
        $sqlTemplate = <<<SQL
            SELECT
                s.id_spedizione,
                s.id_lavorazione,
                s.tipo_descrizione,
                s.id_operatore_postale,
                %s
                s.id_tariffa,
                s.id_autorizzazione,
                s.id_porto_destinazione,
                s.note,
                s.data_programmata,
                s.stato,
                s.created_at,
                s.updated_at,
                op.code AS operatore_code,
                op.label AS operatore_label,
                tr.code AS tariffa_code,
                tr.label AS tariffa_label,
                au.code AS autorizzazione_code,
                au.label AS autorizzazione_label,
                po.code AS porto_code,
                po.label AS porto_label
            FROM tb_lavorazioni_spedizioni s
            LEFT JOIN cfg_lavorazioni_spedizioni_operatori_postali op ON op.id_operatore_postale = s.id_operatore_postale
            %s
            LEFT JOIN cfg_lavorazioni_spedizioni_tariffe tr ON tr.id_tariffa = s.id_tariffa
            LEFT JOIN cfg_lavorazioni_spedizioni_autorizzazioni au ON au.id_autorizzazione = s.id_autorizzazione
            LEFT JOIN cfg_lavorazioni_spedizioni_porti po ON po.id_porto_destinazione = s.id_porto_destinazione
            WHERE s.id_lavorazione = :id
            ORDER BY s.created_at DESC, s.id_spedizione DESC
        SQL;
        $sql = sprintf($sqlTemplate, $affrancaturaSelect, $affrancaturaJoin);
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $lavorazioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            $row['id_spedizione'] = isset($row['id_spedizione']) ? (int) $row['id_spedizione'] : null;
            $row['id_lavorazione'] = isset($row['id_lavorazione']) ? (int) $row['id_lavorazione'] : null;
        }
        unset($row);
        return $rows;
        return "";
    }

    public function findSpedizione(int $spedizioneId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT *
            FROM tb_lavorazioni_spedizioni
            WHERE id_spedizione = :id
            LIMIT 1
        ');
        $stmt->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        $row['id_spedizione'] = isset($row['id_spedizione']) ? (int) $row['id_spedizione'] : null;
        $row['id_lavorazione'] = isset($row['id_lavorazione']) ? (int) $row['id_lavorazione'] : null;
        return $row;
    }

    /**
     * @param int $spedizioneId
     * @return array<string, string>
     */
    public function listSpedizioneReportValues(int $spedizioneId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT field_code, value
            FROM tb_lavorazioni_spedizioni_report_values
            WHERE id_spedizione = :id
        ');
        $stmt->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $result = [];
        foreach ($rows as $row) {
            if (isset($row['field_code']) && isset($row['value'])) {
                $result[(string) $row['field_code']] = (string) $row['value'];
            }
        }
        return $result;
    }

    /**
     * @param int $spedizioneId
     * @param array<string, string> $values
     */
    public function replaceSpedizioneReportValues(int $spedizioneId, array $values): void
    {
        $this->pdo->beginTransaction();
        try {
            $delete = $this->pdo->prepare('
                DELETE FROM tb_lavorazioni_spedizioni_report_values
                WHERE id_spedizione = :id
            ');
            $delete->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
            $delete->execute();

            if ($values !== []) {
                $insert = $this->pdo->prepare('
                    INSERT INTO tb_lavorazioni_spedizioni_report_values (
                        id_spedizione,
                        field_code,
                        value,
                        created_at,
                        updated_at
                    ) VALUES (
                        :id,
                        :field_code,
                        :value,
                        NOW(),
                        NOW()
                    )
                ');
                foreach ($values as $fieldCode => $value) {
                    $insert->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
                    $insert->bindValue(':field_code', (string) $fieldCode, PDO::PARAM_STR);
                    $insert->bindValue(':value', (string) $value, PDO::PARAM_STR);
                    $insert->execute();
                }
            }
            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    /**
     * @param int $spedizioneId
     * @return array<int, array{zona:string,peso:string,quantita:int}>
     */
    public function listSpedizioneReportQuantities(int $spedizioneId): array
    {
        $stmt = $this->pdo->prepare('
            SELECT zona, peso, quantita
            FROM tb_lavorazioni_spedizioni_report_quantities
            WHERE id_spedizione = :id
            ORDER BY zona ASC, peso ASC
        ');
        $stmt->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'zona' => (string) ($row['zona'] ?? ''),
                'peso' => isset($row['peso']) ? (string) $row['peso'] : '0',
                'quantita' => isset($row['quantita']) ? (int) $row['quantita'] : 0,
            ];
        }
        return $result;
    }

    /**
     * @param int $spedizioneId
     * @param array<int, array{zona:string,peso:string,quantita:int}> $rows
     */
    public function replaceSpedizioneReportQuantities(int $spedizioneId, array $rows): void
    {
        $this->pdo->beginTransaction();
        try {
            $delete = $this->pdo->prepare('
                DELETE FROM tb_lavorazioni_spedizioni_report_quantities
                WHERE id_spedizione = :id
            ');
            $delete->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
            $delete->execute();

            if ($rows !== []) {
                $insert = $this->pdo->prepare('
                    INSERT INTO tb_lavorazioni_spedizioni_report_quantities (
                        id_spedizione,
                        zona,
                        peso,
                        quantita,
                        created_at,
                        updated_at
                    ) VALUES (
                        :id,
                        :zona,
                        :peso,
                        :quantita,
                        NOW(),
                        NOW()
                    )
                ');
                foreach ($rows as $row) {
                    $insert->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
                    $insert->bindValue(':zona', (string) ($row['zona'] ?? ''), PDO::PARAM_STR);
                    $insert->bindValue(':peso', (string) ($row['peso'] ?? '0'), PDO::PARAM_STR);
                    $insert->bindValue(':quantita', (int) ($row['quantita'] ?? 0), PDO::PARAM_INT);
                    $insert->execute();
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function findSpedizioneOperatorePostale(int $id): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_operatore_postale, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_operatori_postali
            WHERE id_operatore_postale = :id
            LIMIT 1
        ');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function findSpedizioneAffrancatura(int $id): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_affrancatura, id_operatore_postale, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_affrancature
            WHERE id_affrancatura = :id
            LIMIT 1
        ');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function findSpedizioneTariffa(int $id): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_tariffa, id_affrancatura, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_tariffe
            WHERE id_tariffa = :id
            LIMIT 1
        ');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function findSpedizioneAutorizzazione(int $id): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_autorizzazione, id_affrancatura, id_tariffa, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_autorizzazioni
            WHERE id_autorizzazione = :id
            LIMIT 1
        ');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function findSpedizionePorto(int $id): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_porto_destinazione, id_autorizzazione, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_porti
            WHERE id_porto_destinazione = :id
            LIMIT 1
        ');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function createSpedizione(array $data): int
    {
        $supportsAffrancatura = $this->hasSpedizioneColumn('id_affrancatura');
        $columns = [
            'id_lavorazione',
            'tipo_descrizione',
            'id_operatore_postale',
        ];
        $placeholders = [
            ':id_lavorazione',
            ':tipo_descrizione',
            ':id_operatore_postale',
        ];
        if ($supportsAffrancatura) {
            $columns[] = 'id_affrancatura';
            $placeholders[] = ':id_affrancatura';
        }
        $columns = array_merge($columns, [
            'id_tariffa',
            'id_autorizzazione',
            'id_porto_destinazione',
            'note',
            'data_programmata',
        ]);
        $placeholders = array_merge($placeholders, [
            ':id_tariffa',
            ':id_autorizzazione',
            ':id_porto_destinazione',
            ':note',
            ':data_programmata',
        ]);
        $sql = sprintf(
            '
            INSERT INTO tb_lavorazioni_spedizioni (
                %s,
                created_at,
                updated_at
            ) VALUES (
                %s,
                NOW(),
                NOW()
            )
        ',
            implode(",\n                ", $columns),
            implode(",\n                ", $placeholders),
        );
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_lavorazione', (int) $data['id_lavorazione'], PDO::PARAM_INT);
        if (!empty($data['tipo_descrizione'])) {
            $stmt->bindValue(':tipo_descrizione', $data['tipo_descrizione'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':tipo_descrizione', null, PDO::PARAM_NULL);
        }
        if (!empty($data['id_operatore_postale'])) {
            $stmt->bindValue(':id_operatore_postale', (int) $data['id_operatore_postale'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_operatore_postale', null, PDO::PARAM_NULL);
        }
        if ($supportsAffrancatura) {
            if (!empty($data['id_affrancatura'])) {
                $stmt->bindValue(':id_affrancatura', (int) $data['id_affrancatura'], PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_affrancatura', null, PDO::PARAM_NULL);
            }
        }
        if (!empty($data['id_tariffa'])) {
            $stmt->bindValue(':id_tariffa', (int) $data['id_tariffa'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_tariffa', null, PDO::PARAM_NULL);
        }
        if (!empty($data['id_autorizzazione'])) {
            $stmt->bindValue(':id_autorizzazione', (int) $data['id_autorizzazione'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_autorizzazione', null, PDO::PARAM_NULL);
        }
        if (!empty($data['id_porto_destinazione'])) {
            $stmt->bindValue(':id_porto_destinazione', (int) $data['id_porto_destinazione'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_porto_destinazione', null, PDO::PARAM_NULL);
        }
        if (!empty($data['note'])) {
            $stmt->bindValue(':note', $data['note'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':note', null, PDO::PARAM_NULL);
        }
        if (!empty($data['data_programmata'])) {
            $stmt->bindValue(':data_programmata', $data['data_programmata'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':data_programmata', null, PDO::PARAM_NULL);
        }
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    public function updateSpedizione(int $spedizioneId, array $data): void
    {
        $supportsAffrancatura = $this->hasSpedizioneColumn('id_affrancatura');
        $assignments = [
            'tipo_descrizione = :tipo_descrizione',
            'id_operatore_postale = :id_operatore_postale',
        ];
        if ($supportsAffrancatura) {
            $assignments[] = 'id_affrancatura = :id_affrancatura';
        }
        $assignments = array_merge($assignments, [
            'id_tariffa = :id_tariffa',
            'id_autorizzazione = :id_autorizzazione',
            'id_porto_destinazione = :id_porto_destinazione',
            'note = :note',
            'data_programmata = :data_programmata',
        ]);
        $setClause = implode(",\n                ", $assignments);
        $sql = sprintf(
            '
            UPDATE tb_lavorazioni_spedizioni
            SET
                %s,
                updated_at = NOW()
            WHERE id_spedizione = :id
        ',
            $setClause,
        );
        $stmt = $this->pdo->prepare($sql);
        if (!empty($data['tipo_descrizione'])) {
            $stmt->bindValue(':tipo_descrizione', $data['tipo_descrizione'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':tipo_descrizione', null, PDO::PARAM_NULL);
        }
        if (!empty($data['id_operatore_postale'])) {
            $stmt->bindValue(':id_operatore_postale', (int) $data['id_operatore_postale'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_operatore_postale', null, PDO::PARAM_NULL);
        }
        if ($supportsAffrancatura) {
            if (!empty($data['id_affrancatura'])) {
                $stmt->bindValue(':id_affrancatura', (int) $data['id_affrancatura'], PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_affrancatura', null, PDO::PARAM_NULL);
            }
        }
        if (!empty($data['id_tariffa'])) {
            $stmt->bindValue(':id_tariffa', (int) $data['id_tariffa'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_tariffa', null, PDO::PARAM_NULL);
        }
        if (!empty($data['id_autorizzazione'])) {
            $stmt->bindValue(':id_autorizzazione', (int) $data['id_autorizzazione'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_autorizzazione', null, PDO::PARAM_NULL);
        }
        if (!empty($data['id_porto_destinazione'])) {
            $stmt->bindValue(':id_porto_destinazione', (int) $data['id_porto_destinazione'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_porto_destinazione', null, PDO::PARAM_NULL);
        }
        if (!empty($data['note'])) {
            $stmt->bindValue(':note', $data['note'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':note', null, PDO::PARAM_NULL);
        }
        if (!empty($data['data_programmata'])) {
            $stmt->bindValue(':data_programmata', $data['data_programmata'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':data_programmata', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @param int $spedizioneId
     */
    public function deleteSpedizione(int $spedizioneId): void
    {
        $stmt = $this->pdo->prepare('
            DELETE FROM tb_lavorazioni_spedizioni
            WHERE id_spedizione = :id
        ');
        $stmt->bindValue(':id', $spedizioneId, PDO::PARAM_INT);
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            throw new \RuntimeException('Spedizione non trovata.', 404);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSpedizioneOperatoriPostali(): array
    {
        $stmt = $this->pdo->query('
            SELECT id_operatore_postale, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_operatori_postali
            WHERE attivo = 1
            ORDER BY ordering ASC, label ASC
        ');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSpedizioneAffrancature(): array
    {
        $stmt = $this->pdo->query('
            SELECT
                aff.id_affrancatura,
                aff.id_operatore_postale,
                aff.code,
                aff.label,
                aff.descrizione,
                aff.attivo,
                op.label AS operatore_label
            FROM cfg_lavorazioni_spedizioni_affrancature aff
            LEFT JOIN cfg_lavorazioni_spedizioni_operatori_postali op ON op.id_operatore_postale = aff.id_operatore_postale
            WHERE aff.attivo = 1
            ORDER BY aff.id_operatore_postale ASC, aff.ordering ASC, aff.label ASC
        ');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSpedizioneTariffe(): array
    {
        $stmt = $this->pdo->query('
            SELECT id_tariffa, id_affrancatura, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_tariffe
            WHERE attivo = 1
            ORDER BY id_affrancatura ASC, ordering ASC, label ASC
        ');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSpedizioneAutorizzazioni(): array
    {
        $stmt = $this->pdo->query('
            SELECT id_autorizzazione, id_affrancatura, id_tariffa, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_autorizzazioni
            WHERE attivo = 1
            ORDER BY id_affrancatura ASC, ordering ASC, label ASC
        ');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSpedizionePorti(): array
    {
        $stmt = $this->pdo->query('
            SELECT id_porto_destinazione, id_autorizzazione, code, label, descrizione, attivo
            FROM cfg_lavorazioni_spedizioni_porti
            WHERE attivo = 1
            ORDER BY id_autorizzazione ASC, ordering ASC, label ASC
        ');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @param int|null $affrancaturaId
     * @return array<int, array<string, mixed>>
     */
    public function listSpedizioneReportFields(?int $affrancaturaId = null): array
    {
        if ($affrancaturaId !== null && $affrancaturaId > 0) {
            $sql = '
                SELECT
                    id_field,
                    id_affrancatura,
                    field_code,
                    label,
                    description,
                    ordering,
                    is_visible,
                    created_at,
                    updated_at
                FROM cfg_lavorazioni_spedizioni_report_fields
                WHERE id_affrancatura IS NULL OR id_affrancatura = :affrancatura
                ORDER BY ordering ASC, field_code ASC
            ';
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':affrancatura', $affrancaturaId, PDO::PARAM_INT);
        } else {
            $sql = '
                SELECT
                    id_field,
                    id_affrancatura,
                    field_code,
                    label,
                    description,
                    ordering,
                    is_visible,
                    created_at,
                    updated_at
                FROM cfg_lavorazioni_spedizioni_report_fields
                WHERE id_affrancatura IS NULL
                ORDER BY ordering ASC, field_code ASC
            ';
            $stmt = $this->pdo->prepare($sql);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            $row['id_field'] = isset($row['id_field']) ? (int) $row['id_field'] : null;
            $row['id_affrancatura'] = isset($row['id_affrancatura']) ? (int) $row['id_affrancatura'] : null;
            $row['ordering'] = isset($row['ordering']) ? (int) $row['ordering'] : 0;
            $row['is_visible'] = isset($row['is_visible']) ? (bool) $row['is_visible'] : false;
        }
        unset($row);
        return $rows;
    }

    public function findSpedizioneReportField(int $fieldId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT
                id_field,
                id_affrancatura,
                field_code,
                label,
                description,
                ordering,
                is_visible,
                created_at,
                updated_at
            FROM cfg_lavorazioni_spedizioni_report_fields
            WHERE id_field = :id
            LIMIT 1
        ');
        $stmt->bindValue(':id', $fieldId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        $row['id_field'] = isset($row['id_field']) ? (int) $row['id_field'] : null;
        $row['id_affrancatura'] = isset($row['id_affrancatura']) ? (int) $row['id_affrancatura'] : null;
        $row['ordering'] = isset($row['ordering']) ? (int) $row['ordering'] : 0;
        $row['is_visible'] = isset($row['is_visible']) ? (bool) $row['is_visible'] : false;
        return $row;
    }

    /**
     * @param int|null $affrancaturaId
     * @param string $fieldCode
     * @return array<string, mixed>|null
     */
    public function findSpedizioneReportFieldByCode(?int $affrancaturaId, string $fieldCode): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_field
            FROM cfg_lavorazioni_spedizioni_report_fields
            WHERE id_affrancatura <=> :affrancatura
              AND field_code = :field_code
            LIMIT 1
        ');
        $stmt->bindValue(':affrancatura', $affrancaturaId, $affrancaturaId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':field_code', $fieldCode, PDO::PARAM_STR);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        if ($value === false) {
            return null;
        }
        return ['id_field' => (int) $value];
    }

    /**
     * @param array<string, mixed> $data
     */
    public function createSpedizioneReportField(array $data): int
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO cfg_lavorazioni_spedizioni_report_fields (
                id_affrancatura,
                field_code,
                label,
                description,
                ordering,
                is_visible,
                created_at,
                updated_at
            ) VALUES (
                :id_affrancatura,
                :field_code,
                :label,
                :description,
                :ordering,
                :is_visible,
                NOW(),
                NOW()
            )
        ');
        if (!empty($data['id_affrancatura'])) {
            $stmt->bindValue(':id_affrancatura', (int) $data['id_affrancatura'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_affrancatura', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':field_code', $data['field_code'], PDO::PARAM_STR);
        $stmt->bindValue(':label', $data['label'], PDO::PARAM_STR);
        if (!empty($data['description'])) {
            $stmt->bindValue(':description', $data['description'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':description', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':ordering', isset($data['ordering']) ? (int) $data['ordering'] : 0, PDO::PARAM_INT);
        $stmt->bindValue(':is_visible', isset($data['is_visible']) ? (int) $data['is_visible'] : 1, PDO::PARAM_INT);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param int $fieldId
     * @param array<string, mixed> $data
     */
    public function updateSpedizioneReportField(int $fieldId, array $data): void
    {
        $stmt = $this->pdo->prepare('
            UPDATE cfg_lavorazioni_spedizioni_report_fields
            SET
                id_affrancatura = :id_affrancatura,
                field_code = :field_code,
                label = :label,
                description = :description,
                ordering = :ordering,
                is_visible = :is_visible,
                updated_at = NOW()
            WHERE id_field = :id
        ');
        if (!empty($data['id_affrancatura'])) {
            $stmt->bindValue(':id_affrancatura', (int) $data['id_affrancatura'], PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_affrancatura', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':field_code', $data['field_code'], PDO::PARAM_STR);
        $stmt->bindValue(':label', $data['label'], PDO::PARAM_STR);
        if (!empty($data['description'])) {
            $stmt->bindValue(':description', $data['description'], PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':description', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':ordering', isset($data['ordering']) ? (int) $data['ordering'] : 0, PDO::PARAM_INT);
        $stmt->bindValue(':is_visible', isset($data['is_visible']) ? (int) $data['is_visible'] : 1, PDO::PARAM_INT);
        $stmt->bindValue(':id', $fieldId, PDO::PARAM_INT);
        $stmt->execute();
    }

    public function deleteSpedizioneReportField(int $fieldId): void
    {
        $stmt = $this->pdo->prepare('
            DELETE FROM cfg_lavorazioni_spedizioni_report_fields
            WHERE id_field = :id
        ');
        $stmt->bindValue(':id', $fieldId, PDO::PARAM_INT);
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            throw new \RuntimeException('Campo report non trovato.', 404);
        }
    }

    public function createGeneralNotifications(
        array $accountIds,
        string $title,
        string $message,
        ?array $payload = null,
        ?int $createdBy = null,
        string $tipo = 'dashboard',
    ): int {
        if ($accountIds === []) {
            return 0;
        }

        $unique = array_values(array_unique(array_filter($accountIds, static fn ($value) => (int) $value > 0)));
        if ($unique === []) {
            return 0;
        }

        $payloadValue = null;
        if ($payload !== null) {
            $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES);
            if (is_string($encoded)) {
                $payloadValue = $encoded;
            }
        }

        $sql = <<<SQL
            INSERT INTO tb_lavorazioni_notifiche (
                id_lavorazione,
                id_attivita,
                id_account,
                tipo,
                titolo,
                messaggio,
                payload,
                stato,
                created_at,
                created_by
            ) VALUES (
                NULL,
                NULL,
                :id_account,
                :tipo,
                :titolo,
                :messaggio,
                :payload,
                'pending',
                NOW(),
                :created_by
            )
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $count = 0;
        foreach ($unique as $accountId) {
            $stmt->bindValue(':id_account', (int) $accountId, PDO::PARAM_INT);
            $stmt->bindValue(':tipo', $tipo, PDO::PARAM_STR);
            $stmt->bindValue(':titolo', $title, PDO::PARAM_STR);
            $stmt->bindValue(':messaggio', $message, PDO::PARAM_STR);
            if ($payloadValue !== null) {
                $stmt->bindValue(':payload', $payloadValue, PDO::PARAM_STR);
            } else {
                $stmt->bindValue(':payload', null, PDO::PARAM_NULL);
            }
            if ($createdBy !== null && $createdBy > 0) {
                $stmt->bindValue(':created_by', $createdBy, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':created_by', null, PDO::PARAM_NULL);
            }
            $stmt->execute();
            $count += (int) $stmt->rowCount();
        }

        return $count;
    }
}
