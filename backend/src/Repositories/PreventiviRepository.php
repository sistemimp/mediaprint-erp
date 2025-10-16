<?php
// backend/src/Repositories/PreventiviRepository.php

namespace MediaPrint\Repo;

use PDO;

final class PreventiviRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * Ensure configuration tables for Preventivo "Oggetto" options exist.
     * Creates (if missing):
     *  - cfg_preventivi_oggetti
     *  - tb_preventivi_oggetti_map
     * Also seeds default options when table is empty.
     */
    private function ensureOggettoSchema(): void
    {
        try {
            // Options table
            $this->pdo->exec(<<<SQL
                CREATE TABLE IF NOT EXISTS cfg_preventivi_oggetti (
                    id_oggetto INT AUTO_INCREMENT PRIMARY KEY,
                    label VARCHAR(255) NOT NULL UNIQUE,
                    code VARCHAR(64) NULL UNIQUE,
                    ordering INT NOT NULL DEFAULT 0,
                    attivo TINYINT(1) NOT NULL DEFAULT 1
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

            // Mapping table
            $this->pdo->exec(<<<SQL
                CREATE TABLE IF NOT EXISTS tb_preventivi_oggetti_map (
                    id_preventivo INT NOT NULL,
                    id_oggetto INT NOT NULL,
                    PRIMARY KEY (id_preventivo, id_oggetto)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

            // Rimuovi eventuale colonna oggetto_custom se presente (non più necessaria)
            try {
                $stmtC = $this->pdo->query("SHOW COLUMNS FROM tb_preventivi LIKE 'oggetto_custom'");
                if ($stmtC && $stmtC->fetchColumn() !== false) {
                    $this->pdo->exec("ALTER TABLE tb_preventivi DROP COLUMN oggetto_custom");
                }
            } catch (\Throwable $ignored) {}
            try {
                $stmtT = $this->pdo->query("SHOW TABLES LIKE 'tb_preventivi_archive'");
                $tableExists = $stmtT && $stmtT->fetchColumn() !== false;
                if ($tableExists) {
                    $stmtC = $this->pdo->query("SHOW COLUMNS FROM tb_preventivi_archive LIKE 'oggetto_custom'");
                    if ($stmtC && $stmtC->fetchColumn() !== false) {
                        $this->pdo->exec("ALTER TABLE tb_preventivi_archive DROP COLUMN oggetto_custom");
                    }
                }
            } catch (\Throwable $ignored) {}

            // Seed default options if empty
            try {
                $count = (int) ($this->pdo->query('SELECT COUNT(*) FROM cfg_preventivi_oggetti')->fetchColumn() ?: 0);
                if ($count === 0) {
                    $ins = $this->pdo->prepare('INSERT INTO cfg_preventivi_oggetti (label, code, ordering, attivo) VALUES (:label, :code, :ordering, 1)');
                    $defaults = [
                        ['Stampa', 'stampa', 1],
                        ['Imbustamento', 'imbustamento', 2],
                        ['Cellophanatura', 'cellophanatura', 3],
                        ['Posta Digitale', 'posta_digitale', 4],
                    ];
                    foreach ($defaults as [$label, $code, $ord]) {
                        $ins->bindValue(':label', $label);
                        $ins->bindValue(':code', $code);
                        $ins->bindValue(':ordering', $ord, PDO::PARAM_INT);
                        $ins->execute();
                    }
                }
            } catch (\Throwable $ignored) {
                // if SELECT failed (table missing), ignore
            }
        } catch (\Throwable $ignored) {
            // Ignore ensure failures; subsequent calls will handle absence gracefully
        }
    }

    /**
     * @return list<array{id_oggetto:int,label:string,ordering:int,attivo:int}>
     */
    public function listOggettoOptions(): array
    {
        $this->ensureOggettoSchema();
        try {
            $stmt = $this->pdo->query('SELECT id_oggetto, label, ordering, attivo FROM cfg_preventivi_oggetti WHERE attivo = 1 ORDER BY ordering ASC, id_oggetto ASC');
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $out = [];
            foreach ($rows as $r) {
                $out[] = [
                    'id_oggetto' => (int) $r['id_oggetto'],
                    'label' => (string) $r['label'],
                    'ordering' => (int) $r['ordering'],
                    'attivo' => (int) $r['attivo'],
                ];
            }
            if (!empty($out)) return $out;
        } catch (\Throwable $ignored) {}

        // Fallback defaults if table not available
        return [
            ['id_oggetto' => 1, 'label' => 'Stampa', 'ordering' => 1, 'attivo' => 1],
            ['id_oggetto' => 2, 'label' => 'Imbustamento', 'ordering' => 2, 'attivo' => 1],
            ['id_oggetto' => 3, 'label' => 'Cellophanatura', 'ordering' => 3, 'attivo' => 1],
            ['id_oggetto' => 4, 'label' => 'Posta Digitale', 'ordering' => 4, 'attivo' => 1],
        ];
    }

    /**
     * Crea una nuova opzione oggetto se non esiste già (case-insensitive per label).
     * @return array{id_oggetto:int,label:string,ordering:int,attivo:int}
     */
    public function createOggettoOption(string $label): array
    {
        $this->ensureOggettoSchema();
        $name = trim($label);
        if ($name === '') {
            throw new \RuntimeException('Label mancante.', 422);
        }

        // Esiste già?
        $sel = $this->pdo->prepare('SELECT id_oggetto, label, ordering, attivo FROM cfg_preventivi_oggetti WHERE LOWER(label) = LOWER(:label) LIMIT 1');
        $sel->bindValue(':label', $name, PDO::PARAM_STR);
        $sel->execute();
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        if ($row !== false) {
            // Riattiva se necessario
            if ((int) $row['attivo'] !== 1) {
                $this->pdo->prepare('UPDATE cfg_preventivi_oggetti SET attivo = 1 WHERE id_oggetto = :id')
                    ->execute([':id' => (int) $row['id_oggetto']]);
                $row['attivo'] = 1;
            }
            return [
                'id_oggetto' => (int) $row['id_oggetto'],
                'label' => (string) $row['label'],
                'ordering' => (int) $row['ordering'],
                'attivo' => (int) $row['attivo'],
            ];
        }

        // Calcola ordering
        $ord = 1;
        try {
            $ord = (int) ($this->pdo->query('SELECT COALESCE(MAX(ordering), 0) + 1 FROM cfg_preventivi_oggetti')->fetchColumn() ?: 1);
        } catch (\Throwable $ignored) {}

        $ins = $this->pdo->prepare('INSERT INTO cfg_preventivi_oggetti (label, code, ordering, attivo) VALUES (:label, NULL, :ordering, 1)');
        $ins->bindValue(':label', $name, PDO::PARAM_STR);
        $ins->bindValue(':ordering', $ord, PDO::PARAM_INT);
        $ins->execute();
        $id = (int) $this->pdo->lastInsertId();

        return [
            'id_oggetto' => $id,
            'label' => $name,
            'ordering' => $ord,
            'attivo' => 1,
        ];
    }

    /**
     * @return list<int> ids of selected oggetti for a preventivo
     */
    public function getOggettiForPreventivo(int $idPreventivo): array
    {
        $this->ensureOggettoSchema();
        try {
            $stmt = $this->pdo->prepare('SELECT id_oggetto FROM tb_preventivi_oggetti_map WHERE id_preventivo = :id ORDER BY id_oggetto ASC');
            $stmt->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
            return array_map('intval', $rows);
        } catch (\Throwable $ignored) {
            return [];
        }
    }

    /**
     * Replace selected oggetti for preventivo and update textual field (oggetto)
     * @param list<int> $ids
     */
    public function replaceOggettiAndUpdateText(int $idPreventivo, array $ids): void
    {
        $this->ensureOggettoSchema();
        $this->pdo->beginTransaction();
        try {
            // Replace mapping
            try {
                $del = $this->pdo->prepare('DELETE FROM tb_preventivi_oggetti_map WHERE id_preventivo = :id');
                $del->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
                $del->execute();
            } catch (\Throwable $ignored) {}

            if (!empty($ids)) {
                try {
                    $ins = $this->pdo->prepare('INSERT INTO tb_preventivi_oggetti_map (id_preventivo, id_oggetto) VALUES (:id, :oggetto)');
                    foreach ($ids as $oid) {
                        $oid = (int) $oid;
                        if ($oid <= 0) continue;
                        $ins->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
                        $ins->bindValue(':oggetto', $oid, PDO::PARAM_INT);
                        $ins->execute();
                    }
                } catch (\Throwable $ignored) {}
            }

            // Build textual oggetto from selected labels + custom text
            $labels = [];
            if (!empty($ids)) {
                try {
                    $ph = implode(',', array_fill(0, count($ids), '?'));
                    $stmt = $this->pdo->prepare("SELECT label FROM cfg_preventivi_oggetti WHERE id_oggetto IN ($ph) AND attivo = 1 ORDER BY ordering ASC, id_oggetto ASC");
                    foreach (array_values($ids) as $idx => $val) {
                        $stmt->bindValue($idx + 1, (int) $val, PDO::PARAM_INT);
                    }
                    $stmt->execute();
                    $labels = array_map(static fn($r) => (string) $r['label'], $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
                } catch (\Throwable $ignored) {}
            }
            $text = implode(' - ', array_filter($labels, static fn($s) => $s !== ''));

            // Update preventivo textual fields
            $upd = $this->pdo->prepare('UPDATE tb_preventivi SET oggetto = :oggetto, updated_at = NOW() WHERE id_preventivo = :id LIMIT 1');
            $upd->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $upd->bindValue(':oggetto', $text !== '' ? $text : null, $text === '' ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $upd->execute();

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listLatest(int $limit = 10): array
    {
        $sql = <<<'SQL'
            SELECT
                p.id_preventivo,
                p.anno_preventivo,
                p.numero_documento,
                p.data_preventivo,
                p.oggetto,
                p.riferimento_cliente,
                p.totale_imponibile,
                p.totale_sconto,
                p.totale_iva,
                p.totale,
                a.ragione_sociale AS ragione_sociale,
                sp.code AS stato_code,
                sp.label AS stato_label,
                p.created_at,
                p.updated_at
            FROM tb_preventivi p
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = p.id_anagrafica
            LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
            ORDER BY p.data_preventivo DESC, p.created_at DESC
            LIMIT :limit
        SQL;

        // Inseriamo il limite direttamente nella query, dato che MySQL con prepared nativi
        // non consente placeholder in LIMIT quando ATTR_EMULATE_PREPARES=false
        $effectiveLimit = max(1, $limit);
        $sql = str_replace('LIMIT :limit', 'LIMIT ' . (int) $effectiveLimit, $sql);

        $statement = $this->pdo->prepare($sql);
        $statement->execute();

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @return list<array{id_stato:int, code:string, label:string, ordering:int}>
     */
    public function listStatuses(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id_stato, code, label, ordering FROM cfg_stati_preventivo WHERE attivo = 1 ORDER BY ordering ASC, id_stato ASC'
        );
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id_stato' => (int) $row['id_stato'],
                'code' => (string) $row['code'],
                'label' => (string) $row['label'],
                'ordering' => (int) $row['ordering'],
            ];
        }

        return $out;
    }

    /**
     * @return array{id_stato:int, code:string, label:string}|null
     */
    public function findStatusByCode(string $code): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id_stato, code, label FROM cfg_stati_preventivo WHERE code = :code AND attivo = 1 LIMIT 1'
        );
        $stmt->bindValue(':code', $code, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return [
            'id_stato' => (int) $row['id_stato'],
            'code' => (string) $row['code'],
            'label' => (string) $row['label'],
        ];
    }

    public function updateStatus(int $idPreventivo, int $idStato): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE tb_preventivi SET id_stato_prev = :id_stato, updated_at = NOW() WHERE id_preventivo = :id LIMIT 1'
        );
        $stmt->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
        $stmt->bindValue(':id_stato', $idStato, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * Conteggio dei nuovi preventivi nel mese corrente raggruppati per stato attivo.
     * Restituisce anche stati con 0 occorrenze per coerenza UI.
     *
     * @return list<array{id_stato:int, code:string, label:string, ordering:int, tot:int}>
     */
    public function countNewByStatusCurrentMonth(): array
    {
        $sql = <<<'SQL'
            WITH p AS (
              SELECT
                DATE_FORMAT(CURDATE(), '%Y-%m-01')                             AS m0,
                DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AS m_next
            )
            SELECT
              s.id_stato,
              s.code,
              s.label,
              s.ordering,
              COUNT(pv.id_preventivo) AS tot
            FROM cfg_stati_preventivo s
            LEFT JOIN tb_preventivi pv
              ON pv.id_stato_prev = s.id_stato
             AND COALESCE(pv.data_preventivo, pv.created_at) >= (SELECT m0 FROM p)
             AND COALESCE(pv.data_preventivo, pv.created_at) <  (SELECT m_next FROM p)
            WHERE s.attivo = 1
            GROUP BY s.id_stato, s.code, s.label, s.ordering
            ORDER BY s.ordering ASC, s.id_stato ASC
        SQL;

        $stmt = $this->pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_stato' => (int) $r['id_stato'],
                'code' => (string) $r['code'],
                'label' => (string) $r['label'],
                'ordering' => (int) $r['ordering'],
                'tot' => (int) $r['tot'],
            ];
        }
        return $out;
    }

    /**
     * Top clienti per totale preventivi negli ultimi 12 mesi.
     *
     * @return list<array{id_anagrafica:int|null, ragione_sociale:?string, num_preventivi:int, totale:float}>
     */
    public function listTopClientsLast12Months(int $limit = 5): array
    {
        $effectiveLimit = max(1, $limit);
        $sql = <<<'SQL'
            WITH p AS (
              SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH) AS start_at
            )
            SELECT
              a.id_anagrafica,
              a.ragione_sociale,
              COUNT(v.id_preventivo) AS num_preventivi,
              COALESCE(SUM(v.totale), 0) AS totale
            FROM p
            JOIN tb_preventivi v ON COALESCE(v.data_preventivo, v.created_at) >= p.start_at
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = v.id_anagrafica
            GROUP BY a.id_anagrafica, a.ragione_sociale
            ORDER BY totale DESC
            LIMIT :limit
        SQL;
        // Evita sprintf: la query contiene DATE_FORMAT('%Y-..') che usa '%'
        $sql = str_replace('LIMIT :limit', 'LIMIT ' . (int) $effectiveLimit, $sql);

        $stmt = $this->pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_anagrafica' => isset($r['id_anagrafica']) ? (int) $r['id_anagrafica'] : null,
                'ragione_sociale' => $r['ragione_sociale'] ?? null,
                'num_preventivi' => (int) $r['num_preventivi'],
                'totale' => (float) $r['totale'],
            ];
        }
        return $out;
    }

    /**
     * Ricerca preventivi archiviati in `tb_preventivi_archive` con join su anagrafiche (attive o archiviate)
     * per ottenere la ragione sociale e su stati per label.
     *
     * @return array{data: list<array<string,mixed>>, total: int}
     */
    public function searchArchived(array $filters): array
    {
        $sql = <<<'SQL'
            SELECT
                pa.id_preventivo,
                pa.id_anagrafica,
                pa.anno_preventivo,
                pa.numero_documento,
                pa.data_preventivo,
                pa.oggetto,
                pa.riferimento_cliente,
                pa.totale_imponibile,
                pa.totale_sconto,
                pa.totale_iva,
                pa.totale,
                pa.stato AS stato_code,
                COALESCE(sp.label, pa.stato) AS stato_label,
                COALESCE(a.ragione_sociale, aa.ragione_sociale) AS ragione_sociale,
                pa.created_at,
                pa.updated_at
            FROM tb_preventivi_archive pa
            LEFT JOIN cfg_stati_preventivo sp ON sp.code = pa.stato
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = pa.id_anagrafica
            LEFT JOIN tb_anagrafiche_archive aa ON aa.id_anagrafica = pa.id_anagrafica
        SQL;

        $where = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[] = '(
                COALESCE(a.ragione_sociale, aa.ragione_sociale) LIKE :needle
                OR CONCAT(pa.anno_preventivo, "/", pa.numero_documento) LIKE :needle
            )';
            $params[':needle'] = '%' . $filters['search'] . '%';
        }

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sortable = [
            'data_preventivo',
            'anno_preventivo',
            'numero_documento',
            'totale',
            'ragione_sociale',
            'created_at',
            'updated_at',
        ];
        $sortBy = in_array($filters['sort_by'] ?? '', $sortable, true) ? $filters['sort_by'] : 'data_preventivo';
        $direction = strtolower($filters['sort_direction'] ?? '') === 'asc' ? 'ASC' : 'DESC';

        $sql .= " ORDER BY {$sortBy} {$direction}";

        $page = max((int)($filters['page'] ?? 1), 1);
        $perPage = max(1, min((int)($filters['per_page'] ?? 20), 100));
        $offset = ($page - 1) * $perPage;

        // con prepared nativi, evitiamo placeholder in LIMIT/OFFSET
        $sql .= ' LIMIT ' . (int) $perPage . ' OFFSET ' . (int) $offset;

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $ph => $val) {
            $stmt->bindValue($ph, $val, PDO::PARAM_STR);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $countSql = 'SELECT COUNT(*) FROM tb_preventivi_archive pa'
            . ' LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = pa.id_anagrafica'
            . ' LEFT JOIN tb_anagrafiche_archive aa ON aa.id_anagrafica = pa.id_anagrafica';
        if ($where) {
            $countSql .= ' WHERE ' . implode(' AND ', $where);
        }
        $countStmt = $this->pdo->prepare($countSql);
        if (!empty($params[':needle'])) {
            $countStmt->bindValue(':needle', $params[':needle'], PDO::PARAM_STR);
        }
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        return [
            'data' => array_map(static fn ($r) => $r, $rows),
            'total' => $total,
        ];
    }

    /**
     * Ritorna una riga dall'archivio preventivi.
     * @return array{id_preventivo:int, id_anagrafica:int, data_preventivo:?string, note:?string, totale_imponibile:float|int|null, totale_sconto:float|int|null, totale_iva:float|int|null, totale:float|int|null}|null
     */
    public function getArchivedById(int $id): ?array
    {
        $sql = <<<'SQL'
            SELECT id_preventivo, id_anagrafica, data_preventivo, oggetto, riferimento_cliente, note,
                   totale_imponibile, totale_sconto, totale_iva, totale
            FROM tb_preventivi_archive
            WHERE id_preventivo = :id
            LIMIT 1
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) return null;
        return [
            'id_preventivo' => (int) $row['id_preventivo'],
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'data_preventivo' => $row['data_preventivo'] ?? null,
            'oggetto' => $row['oggetto'] ?? null,
            'riferimento_cliente' => $row['riferimento_cliente'] ?? null,
            'note' => $row['note'] ?? null,
            'totale_imponibile' => $row['totale_imponibile'] ?? null,
            'totale_sconto' => $row['totale_sconto'] ?? null,
            'totale_iva' => $row['totale_iva'] ?? null,
            'totale' => $row['totale'] ?? null,
        ];
    }

    public function existsAnagrafica(int $idAnagrafica): bool
    {
        // Considera valida solo un'anagrafica attiva
        $stmt = $this->pdo->prepare(
            "SELECT 1 FROM tb_anagrafiche WHERE id_anagrafica = :id AND is_active = 1 AND LOWER(stato) = 'attiva' LIMIT 1"
        );
        $stmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    /**
     * Righe del preventivo dall'archivio, se la tabella di archivio righe è presente.
     * Se non esiste, ritorna lista vuota.
     * @return list<array{
     *   id_prodotto:int|null,
     *   descrizione:string,
     *   quantita:float,
     *   prezzo_unitario:float,
     *   sconto:float|null,
     *   iva:float|null,
     *   id_sdi_natura_iva:int|null,
     *   posizione:int|null
     * }>
     */
    public function getArchivedLines(int $idPreventivo): array
    {
        try {
            $sql = <<<'SQL'
                SELECT id_prodotto, descrizione, quantita, prezzo_unitario, sconto, iva, id_sdi_natura_iva, posizione, id_riga
                FROM tb_preventivi_righe_archive
                WHERE id_preventivo = :id
                ORDER BY COALESCE(posizione, id_riga) ASC
            SQL;
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            // Tabella non presente o altro errore: ritorna vuoto
            return [];
        }

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_prodotto' => isset($r['id_prodotto']) ? (int) $r['id_prodotto'] : null,
                'descrizione' => (string) ($r['descrizione'] ?? ''),
                'quantita' => isset($r['quantita']) ? (float) $r['quantita'] : 1.0,
                'prezzo_unitario' => isset($r['prezzo_unitario']) ? (float) $r['prezzo_unitario'] : 0.0,
                'sconto' => isset($r['sconto']) ? (float) $r['sconto'] : null,
                'iva' => isset($r['iva']) ? (float) $r['iva'] : null,
                'id_sdi_natura_iva' => isset($r['id_sdi_natura_iva']) ? (int) $r['id_sdi_natura_iva'] : null,
                'posizione' => isset($r['posizione']) ? (int) $r['posizione'] : null,
            ];
        }
        return $out;
    }

    /**
     * Rimuove un preventivo dall'archivio (testata e righe se presenti).
     */
    public function deleteFromArchive(int $idPreventivo): void
    {
        // Prova a cancellare prima le righe archiviate (se la tabella esiste)
        try {
            $delR = $this->pdo->prepare('DELETE FROM tb_preventivi_righe_archive WHERE id_preventivo = :id');
            $delR->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $delR->execute();
        } catch (\Throwable $ignored) {
            // ignora se la tabella non esiste
        }

        // Cancella la testata dall'archivio
        $delP = $this->pdo->prepare('DELETE FROM tb_preventivi_archive WHERE id_preventivo = :id');
        $delP->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
        $delP->execute();
    }

    /**
     * Archivia un preventivo (testata + righe se tabella archivio presente) e rimuove dai tavoli attivi.
     */
    public function archiveById(int $idPreventivo): void
    {
        $this->ensureOggettoSchema();
        $this->pdo->beginTransaction();
        try {
            // Copia testata in archivio
            $this->pdo->prepare(
                "INSERT INTO tb_preventivi_archive (
                    id_preventivo, id_anagrafica, anno_preventivo, numero_documento, data_preventivo,
                    stato, totale_imponibile, totale_sconto, totale_iva, totale, oggetto, riferimento_cliente, note,
                    created_at, updated_at
                )
                SELECT p.id_preventivo, p.id_anagrafica, p.anno_preventivo, p.numero_documento, p.data_preventivo,
                       COALESCE(sp.code, 'bozza') AS stato,
                       p.totale_imponibile, p.totale_sconto, p.totale_iva, p.totale, p.oggetto, p.riferimento_cliente, p.note,
                       p.created_at, p.updated_at
                FROM tb_preventivi p
                LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
                WHERE p.id_preventivo = :id
                  AND NOT EXISTS (
                    SELECT 1 FROM tb_preventivi_archive pa WHERE pa.id_preventivo = p.id_preventivo
                  )"
            )->execute([':id' => $idPreventivo]);

            // Copia righe in archivio (se tabella esiste)
            try {
                $this->pdo->prepare(
                    "INSERT INTO tb_preventivi_righe_archive (
                        id_riga, id_preventivo, id_prodotto, descrizione, quantita, prezzo_unitario,
                        sconto, importo_scontato, iva, id_sdi_natura_iva, totale, posizione
                    )
                    SELECT r.id_riga, r.id_preventivo, r.id_prodotto, r.descrizione, r.quantita, r.prezzo_unitario,
                           r.sconto, r.importo_scontato, r.iva, r.id_sdi_natura_iva, r.totale, r.posizione
                    FROM tb_preventivi_righe r
                    WHERE r.id_preventivo = :id
                      AND NOT EXISTS (
                        SELECT 1 FROM tb_preventivi_righe_archive ra WHERE ra.id_riga = r.id_riga
                      )"
                )->execute([':id' => $idPreventivo]);
            } catch (\Throwable $ignored) {
                // se la tabella non esiste, ignora
            }

            // Elimina righe e testata attive
            $delR = $this->pdo->prepare('DELETE FROM tb_preventivi_righe WHERE id_preventivo = :id');
            $delR->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $delR->execute();

            $delP = $this->pdo->prepare('DELETE FROM tb_preventivi WHERE id_preventivo = :id');
            $delP->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $delP->execute();

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * @return array{id_preventivo:int, anno_preventivo:int|null, numero_documento:int|null, stato_code:?string}|null
     */
    public function getById(int $id): ?array
    {
        $sql = <<<'SQL'
            SELECT p.id_preventivo, p.anno_preventivo, p.numero_documento, p.id_stato_prev, sp.code AS stato_code
            FROM tb_preventivi p
            LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
            WHERE p.id_preventivo = :id
            LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'id_preventivo' => (int) $row['id_preventivo'],
            'anno_preventivo' => isset($row['anno_preventivo']) ? (int) $row['anno_preventivo'] : null,
            'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
            'stato_code' => $row['stato_code'] ?? null,
        ];
    }

    /**
     * @param array{id_anagrafica:int, data_preventivo?:string|null, note?:string|null, totale_imponibile?:float|int|null, totale_sconto?:float|int|null, totale_iva?:float|int|null, totale?:float|int|null} $data
     * @return array{id_preventivo:int}
     */
    public function insertDraft(array $data): array
    {
        $this->pdo->beginTransaction();
        try {
            // Anno corrente
            $yearStmt = $this->pdo->query('SELECT YEAR(CURDATE()) AS y');
            $year = (int) $yearStmt->fetchColumn();

            // Calcola progressivo con lock per evitare race
            $nextStmt = $this->pdo->prepare('SELECT COALESCE(MAX(numero_documento), 0) + 1 FROM tb_preventivi WHERE anno_preventivo = :y FOR UPDATE');
            $nextStmt->bindValue(':y', $year, PDO::PARAM_INT);
            $nextStmt->execute();
            $next = (int) $nextStmt->fetchColumn();

            $sql = <<<'SQL'
                INSERT INTO tb_preventivi (
                    id_anagrafica,
                    anno_preventivo,
                    numero_documento,
                    data_preventivo,
                    oggetto,
                    riferimento_cliente,
                    totale_imponibile,
                    totale_sconto,
                    totale_iva,
                    totale,
                    note,
                    id_stato_prev,
                    created_at,
                    updated_at
                ) VALUES (
                    :id_anagrafica,
                    :anno,
                    :numero,
                    :data_preventivo,
                    :oggetto,
                    :riferimento_cliente,
                    :totale_imponibile,
                    :totale_sconto,
                    :totale_iva,
                    :totale,
                    :note,
                    (SELECT id_stato FROM cfg_stati_preventivo WHERE code = 'bozza' LIMIT 1),
                    NOW(),
                    NOW()
                )
            SQL;

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id_anagrafica', (int) $data['id_anagrafica'], PDO::PARAM_INT);
            $stmt->bindValue(':anno', $year, PDO::PARAM_INT);
            $stmt->bindValue(':numero', $next, PDO::PARAM_INT);
            $stmt->bindValue(':data_preventivo', $data['data_preventivo'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':oggetto', $data['oggetto'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':riferimento_cliente', $data['riferimento_cliente'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':totale_imponibile', $data['totale_imponibile'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':totale_sconto', $data['totale_sconto'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':totale_iva', $data['totale_iva'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':totale', $data['totale'] ?? 0, PDO::PARAM_STR);
            $stmt->bindValue(':note', $data['note'] ?? null, PDO::PARAM_STR);
            $stmt->execute();

            $id = (int) $this->pdo->lastInsertId();
            $this->pdo->commit();

            return [
                'id_preventivo' => $id,
                'anno_preventivo' => $year,
                'numero_documento' => $next,
            ];
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * @param array{id_anagrafica?:int, data_preventivo?:string|null, note?:string|null, totale_imponibile?:float|int|null, totale_sconto?:float|int|null, totale_iva?:float|int|null, totale?:float|int|null} $data
     * @return array{id_preventivo:int, anno_preventivo:int|null, numero_documento:int|null}
     */
    public function updateDraft(int $id, array $data): array
    {
        $sql = <<<'SQL'
            UPDATE tb_preventivi
            SET
                id_anagrafica = COALESCE(:id_anagrafica, id_anagrafica),
                data_preventivo = :data_preventivo,
                oggetto = :oggetto,
                riferimento_cliente = :riferimento_cliente,
                totale_imponibile = :totale_imponibile,
                totale_sconto = :totale_sconto,
                totale_iva = :totale_iva,
                totale = :totale,
                note = :note,
            updated_at = NOW()
            WHERE id_preventivo = :id
            LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':id_anagrafica', isset($data['id_anagrafica']) ? (int) $data['id_anagrafica'] : null, PDO::PARAM_INT);
        $stmt->bindValue(':data_preventivo', $data['data_preventivo'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':oggetto', $data['oggetto'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':riferimento_cliente', $data['riferimento_cliente'] ?? null, PDO::PARAM_STR);
        $stmt->bindValue(':totale_imponibile', $data['totale_imponibile'] ?? 0, PDO::PARAM_STR);
        $stmt->bindValue(':totale_sconto', $data['totale_sconto'] ?? 0, PDO::PARAM_STR);
        $stmt->bindValue(':totale_iva', $data['totale_iva'] ?? 0, PDO::PARAM_STR);
        $stmt->bindValue(':totale', $data['totale'] ?? 0, PDO::PARAM_STR);
        $stmt->bindValue(':note', $data['note'] ?? null, PDO::PARAM_STR);
        $stmt->execute();

        $sel = $this->pdo->prepare('SELECT anno_preventivo, numero_documento FROM tb_preventivi WHERE id_preventivo = :id LIMIT 1');
        $sel->bindValue(':id', $id, PDO::PARAM_INT);
        $sel->execute();
        $row = $sel->fetch(PDO::FETCH_ASSOC) ?: ['anno_preventivo' => null, 'numero_documento' => null];

        return [
            'id_preventivo' => $id,
            'anno_preventivo' => isset($row['anno_preventivo']) ? (int) $row['anno_preventivo'] : null,
            'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
        ];
    }

    /**
     * Conferma e assegna numero progressivo all'anno corrente.
     * Restituisce i dati aggiornati (id, anno, numero).
     * @return array{id_preventivo:int, anno_preventivo:int, numero_documento:int}
     */
    public function confirmAndNumber(int $id): array
    {
        // Conferma: non riassegna numero, solo aggiorna lo stato a 'inviato' e ritorna anno/numero correnti
        $upd = $this->pdo->prepare(
            "UPDATE tb_preventivi SET id_stato_prev = (SELECT id_stato FROM cfg_stati_preventivo WHERE code = 'inviato' LIMIT 1), updated_at = NOW() WHERE id_preventivo = :id"
        );
        $upd->bindValue(':id', $id, PDO::PARAM_INT);
        $upd->execute();

        $sel = $this->pdo->prepare('SELECT anno_preventivo, numero_documento FROM tb_preventivi WHERE id_preventivo = :id LIMIT 1');
        $sel->bindValue(':id', $id, PDO::PARAM_INT);
        $sel->execute();
        $row = $sel->fetch(PDO::FETCH_ASSOC) ?: ['anno_preventivo' => null, 'numero_documento' => null];

        return [
            'id_preventivo' => $id,
            'anno_preventivo' => (int) ($row['anno_preventivo'] ?? 0),
            'numero_documento' => (int) ($row['numero_documento'] ?? 0),
        ];
    }

    /**
     * Dettaglio completo per maschera modifica.
     * @return array{
     *   id_preventivo:int,
     *   id_anagrafica:int,
     *   anno_preventivo:int|null,
     *   numero_documento:int|null,
     *   data_preventivo:?string,
     *   note:?string,
     *   totale_imponibile:float|int|null,
     *   totale_sconto:float|int|null,
     *   totale_iva:float|int|null,
     *   totale:float|int|null,
     *   stato_code:?string,
     *   stato_label:?string,
     *   cliente_ragione_sociale:?string,
     *   cliente_piva:?string,
     *   cliente_codice_fiscale:?string,
     *   created_at:?string,
     *   updated_at:?string
     * }|null
     */
    public function fetchDetail(int $id): ?array
    {
        $sql = <<<'SQL'
            SELECT
                p.id_preventivo,
                p.id_anagrafica,
                p.anno_preventivo,
                p.numero_documento,
                p.data_preventivo,
                p.oggetto,
                p.riferimento_cliente,
                p.note,
                p.totale_imponibile,
                p.totale_sconto,
                p.totale_iva,
                p.totale,
                sp.code AS stato_code,
                sp.label AS stato_label,
                COALESCE(a.ragione_sociale, aa.ragione_sociale) AS cliente_ragione_sociale,
                COALESCE(a.piva, aa.piva) AS cliente_piva,
                COALESCE(a.codice_fiscale, aa.codice_fiscale) AS cliente_codice_fiscale,
                p.created_at,
                p.updated_at
            FROM tb_preventivi p
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = p.id_anagrafica
            LEFT JOIN tb_anagrafiche_archive aa ON aa.id_anagrafica = p.id_anagrafica
            LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
            WHERE p.id_preventivo = :id
            LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'id_preventivo' => (int) $row['id_preventivo'],
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'anno_preventivo' => isset($row['anno_preventivo']) ? (int) $row['anno_preventivo'] : null,
            'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
            'data_preventivo' => $row['data_preventivo'] ?? null,
            'oggetto' => $row['oggetto'] ?? null,
            'riferimento_cliente' => $row['riferimento_cliente'] ?? null,
            'note' => $row['note'] ?? null,
            'totale_imponibile' => isset($row['totale_imponibile']) ? (float) $row['totale_imponibile'] : null,
            'totale_sconto' => isset($row['totale_sconto']) ? (float) $row['totale_sconto'] : null,
            'totale_iva' => isset($row['totale_iva']) ? (float) $row['totale_iva'] : null,
            'totale' => isset($row['totale']) ? (float) $row['totale'] : null,
            'stato_code' => $row['stato_code'] ?? null,
            'stato_label' => $row['stato_label'] ?? null,
            'cliente_ragione_sociale' => $row['cliente_ragione_sociale'] ?? null,
            'cliente_piva' => $row['cliente_piva'] ?? null,
            'cliente_codice_fiscale' => $row['cliente_codice_fiscale'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * @return list<array{
     *   id_riga:int,
     *   id_prodotto:int|null,
     *   descrizione:string,
     *   quantita:float,
     *   prezzo_unitario:float,
     *   sconto:float|null,
     *   importo_scontato:float|null,
     *   iva:float|null,
     *   id_sdi_natura_iva:int|null,
     *   totale:float|null,
     *   posizione:int|null
     * }>
     */
    public function getLines(int $idPreventivo): array
    {
        $sql = <<<'SQL'
            SELECT id_riga, id_prodotto, descrizione, quantita, prezzo_unitario, sconto, importo_scontato,
                   iva, id_sdi_natura_iva, totale, posizione
            FROM tb_preventivi_righe
            WHERE id_preventivo = :id
            ORDER BY COALESCE(posizione, id_riga) ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_riga' => (int) $r['id_riga'],
                'id_prodotto' => isset($r['id_prodotto']) ? (int) $r['id_prodotto'] : null,
                'descrizione' => (string) $r['descrizione'],
                'quantita' => (float) $r['quantita'],
                'prezzo_unitario' => (float) $r['prezzo_unitario'],
                'sconto' => isset($r['sconto']) ? (float) $r['sconto'] : null,
                'importo_scontato' => isset($r['importo_scontato']) ? (float) $r['importo_scontato'] : null,
                'iva' => isset($r['iva']) ? (float) $r['iva'] : null,
                'id_sdi_natura_iva' => isset($r['id_sdi_natura_iva']) ? (int) $r['id_sdi_natura_iva'] : null,
                'totale' => isset($r['totale']) ? (float) $r['totale'] : null,
                'posizione' => isset($r['posizione']) ? (int) $r['posizione'] : null,
            ];
        }
        return $out;
    }

    /**
     * Elenco CIG associati al preventivo.
     * @return list<array{id_cig:int, cig:string, data_cig:?string, motivazione:?string}>
     */
    public function getCigList(int $idPreventivo): array
    {
        $sql = <<<'SQL'
            SELECT id_cig, cig, data_cig, motivazione
            FROM tb_preventivi_cig
            WHERE id_preventivo = :id
            ORDER BY id_cig ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_cig' => (int) $r['id_cig'],
                'cig' => (string) $r['cig'],
                'data_cig' => $r['data_cig'] ?? null,
                'motivazione' => $r['motivazione'] ?? null,
            ];
        }
        return $out;
    }

    /**
     * Sostituisce i CIG del preventivo con la lista fornita.
     * Ogni item: { cig: string, data_cig?: string|null, motivazione?: string|null }
     * @param list<array<string,mixed>> $items
     */
    public function replaceCig(int $idPreventivo, array $items): void
    {
        $this->pdo->beginTransaction();
        try {
            $del = $this->pdo->prepare('DELETE FROM tb_preventivi_cig WHERE id_preventivo = :id');
            $del->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $del->execute();

            if (!empty($items)) {
                $ins = $this->pdo->prepare(<<<'SQL'
                    INSERT INTO tb_preventivi_cig (id_preventivo, cig, data_cig, motivazione)
                    VALUES (:id_preventivo, :cig, :data_cig, :motivazione)
                SQL);

                foreach ($items as $it) {
                    $code = trim((string) ($it['cig'] ?? $it['code'] ?? ''));
                    if ($code === '') { continue; }
                    $date = $it['data_cig'] ?? $it['data'] ?? null;
                    $mot = $it['motivazione'] ?? $it['note'] ?? null;

                    $ins->bindValue(':id_preventivo', $idPreventivo, PDO::PARAM_INT);
                    $ins->bindValue(':cig', $code, PDO::PARAM_STR);
                    $ins->bindValue(':data_cig', $date, $date === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $ins->bindValue(':motivazione', $mot, $mot === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $ins->execute();
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Elenco Determine associate al preventivo.
     * @return list<array{id_determina:int, determina:string, data_determina:?string, motivazione:?string}>
     */
    public function getDetermineList(int $idPreventivo): array
    {
        $sql = <<<'SQL'
            SELECT id_determina, determina, data_determina, motivazione
            FROM tb_preventivi_determina
            WHERE id_preventivo = :id
            ORDER BY id_determina ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_determina' => (int) $r['id_determina'],
                'determina' => (string) $r['determina'],
                'data_determina' => $r['data_determina'] ?? null,
                'motivazione' => $r['motivazione'] ?? null,
            ];
        }
        return $out;
    }

    /**
     * Sostituisce le Determine del preventivo con la lista fornita.
     * Ogni item: { determina: string, data_determina?: string|null, motivazione?: string|null }
     * @param list<array<string,mixed>> $items
     */
    public function replaceDetermine(int $idPreventivo, array $items): void
    {
        $this->pdo->beginTransaction();
        try {
            $del = $this->pdo->prepare('DELETE FROM tb_preventivi_determina WHERE id_preventivo = :id');
            $del->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $del->execute();

            if (!empty($items)) {
                $ins = $this->pdo->prepare(<<<'SQL'
                    INSERT INTO tb_preventivi_determina (id_preventivo, determina, data_determina, motivazione)
                    VALUES (:id_preventivo, :determina, :data_determina, :motivazione)
                SQL);

                foreach ($items as $it) {
                    $code = trim((string) ($it['determina'] ?? $it['numero'] ?? ''));
                    if ($code === '') { continue; }
                    $date = $it['data_determina'] ?? $it['data'] ?? null;
                    $mot = $it['motivazione'] ?? $it['note'] ?? null;

                    $ins->bindValue(':id_preventivo', $idPreventivo, PDO::PARAM_INT);
                    $ins->bindValue(':determina', $code, PDO::PARAM_STR);
                    $ins->bindValue(':data_determina', $date, $date === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $ins->bindValue(':motivazione', $mot, $mot === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $ins->execute();
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Sostituisce le righe del preventivo con la lista fornita.
     * Ogni riga accetta: descrizione, quantita, prezzo, iva, sconto, id_prodotto?, id_sdi_natura_iva?
     * I campi importo_scontato e totale vengono calcolati lato server per coerenza.
     * @param list<array<string,mixed>> $lines
     */
    public function replaceLines(int $idPreventivo, array $lines): void
    {
        $this->pdo->beginTransaction();
        try {
            $del = $this->pdo->prepare('DELETE FROM tb_preventivi_righe WHERE id_preventivo = :id');
            $del->bindValue(':id', $idPreventivo, PDO::PARAM_INT);
            $del->execute();

            if (!empty($lines)) {
                $ins = $this->pdo->prepare(<<<'SQL'
                    INSERT INTO tb_preventivi_righe (
                        id_preventivo, id_prodotto, descrizione, quantita, prezzo_unitario,
                        sconto, importo_scontato, iva, id_sdi_natura_iva, totale, posizione
                    ) VALUES (
                        :id_preventivo, :id_prodotto, :descrizione, :quantita, :prezzo_unitario,
                        :sconto, :importo_scontato, :iva, :id_sdi_natura_iva, :totale, :posizione
                    )
                SQL);

                $pos = 1;
                foreach ($lines as $line) {
                    $descr = trim((string) ($line['descrizione'] ?? ''));
                    if ($descr === '') {
                        continue; // salta righe vuote
                    }
                    $q = (float) ($line['quantita'] ?? 1);
                    $pu = (float) ($line['prezzo'] ?? $line['prezzo_unitario'] ?? 0);
                    $s = isset($line['sconto']) ? (float) $line['sconto'] : 0.0;
                    $iva = isset($line['iva']) ? (float) $line['iva'] : null;
                    $idProd = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
                    $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;

                    // Calcoli base
                    $imponibile = max(0.0, $q * $pu * (1 - $s / 100));
                    $ivaVal = $iva !== null ? $imponibile * ($iva / 100) : 0.0;
                    $tot = $imponibile + $ivaVal;

                    $ins->bindValue(':id_preventivo', $idPreventivo, PDO::PARAM_INT);
                    $ins->bindValue(':id_prodotto', $idProd, $idProd === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                    $ins->bindValue(':descrizione', $descr, PDO::PARAM_STR);
                    $ins->bindValue(':quantita', $q, PDO::PARAM_STR);
                    $ins->bindValue(':prezzo_unitario', $pu, PDO::PARAM_STR);
                    $ins->bindValue(':sconto', $s, PDO::PARAM_STR);
                    $ins->bindValue(':importo_scontato', $imponibile, PDO::PARAM_STR);
                    $ins->bindValue(':iva', $iva, $iva === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $ins->bindValue(':id_sdi_natura_iva', $idNatura, $idNatura === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                    $ins->bindValue(':totale', $tot, PDO::PARAM_STR);
                    $ins->bindValue(':posizione', $pos, PDO::PARAM_INT);
                    $ins->execute();
                    $pos++;
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
