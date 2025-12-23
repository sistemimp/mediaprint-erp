<?php
// backend/src/Repositories/ContrattiRepository.php

namespace MediaPrint\Repo;

use PDO;

final class ContrattiRepository
{
    public function __construct(private PDO $pdo) {}

    private function ensureSchema(): void
    {
        try {
            $this->pdo->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS tb_contratti (
                    id_contratto INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    id_anagrafica INT UNSIGNED NOT NULL,
                    codice VARCHAR(64) NULL,
                    titolo VARCHAR(255) NOT NULL,
                    testo_legale MEDIUMTEXT NULL,
                    data_inizio DATE NOT NULL,
                    data_fine DATE NULL,
                    rinnovo_automatico TINYINT(1) NOT NULL DEFAULT 0,
                    attivo TINYINT(1) NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id_contratto),
                    KEY idx_contratti_anagrafica (id_anagrafica),
                    KEY idx_contratti_date (data_inizio, data_fine),
                    CONSTRAINT fk_contratti_anagrafica FOREIGN KEY (id_anagrafica)
                        REFERENCES tb_anagrafiche (id_anagrafica) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

            $this->pdo->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS tb_contratti_righe (
                    id_riga INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    id_contratto INT UNSIGNED NOT NULL,
                    tipo_item ENUM('prodotto','pacchetto') NOT NULL DEFAULT 'prodotto',
                    id_prodotto INT UNSIGNED NULL,
                    id_pacchetto INT NULL,
                    descrizione VARCHAR(255) NULL,
                    prezzo_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
                    iva DECIMAL(6,2) NULL,
                    id_sdi_natura_iva INT NULL,
                    sconto_base DECIMAL(6,2) NOT NULL DEFAULT 0.00,
                    posizione INT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id_riga),
                    KEY idx_contratti_righe_contratto (id_contratto),
                    KEY idx_contratti_righe_prodotto (id_prodotto),
                    KEY idx_contratti_righe_pacchetto (id_pacchetto),
                    CONSTRAINT fk_contratti_righe_contratto FOREIGN KEY (id_contratto)
                        REFERENCES tb_contratti (id_contratto) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

            $this->pdo->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS tb_contratti_sconti (
                    id_sconto INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    id_riga INT UNSIGNED NOT NULL,
                    quantita_min DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
                    quantita_max DECIMAL(12,4) NULL,
                    sconto_percent DECIMAL(6,2) NOT NULL DEFAULT 0.00,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id_sconto),
                    KEY idx_contratti_sconti_riga (id_riga),
                    CONSTRAINT fk_contratti_sconti_riga FOREIGN KEY (id_riga)
                        REFERENCES tb_contratti_righe (id_riga) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
        } catch (\Throwable $ignored) {
            // Schema best-effort.
        }
    }

    /**
     * @param array{q?:?string,id_anagrafica?:?int,only_active?:?bool,limit?:?int} $filters
     * @return list<array<string,mixed>>
     */
    public function list(array $filters = []): array
    {
        $this->ensureSchema();
        $sql = <<<'SQL'
            SELECT
                c.id_contratto,
                c.id_anagrafica,
                c.codice,
                c.titolo,
                c.data_inizio,
                c.data_fine,
                c.rinnovo_automatico,
                c.attivo,
                c.updated_at,
                a.ragione_sociale
            FROM tb_contratti c
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = c.id_anagrafica
            WHERE 1=1
        SQL;
        $params = [];
        if (!empty($filters['q'])) {
            $sql .= ' AND (c.titolo LIKE :q OR c.codice LIKE :q OR a.ragione_sociale LIKE :q)';
            $params[':q'] = '%' . trim((string) $filters['q']) . '%';
        }
        if (!empty($filters['id_anagrafica'])) {
            $sql .= ' AND c.id_anagrafica = :anag';
            $params[':anag'] = (int) $filters['id_anagrafica'];
        }
        if (array_key_exists('only_active', $filters) && $filters['only_active'] === true) {
            $sql .= ' AND c.attivo = 1';
        }
        $sql .= ' ORDER BY c.data_inizio DESC, c.id_contratto DESC';
        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 200;
        $limit = max(1, min($limit, 500));
        $sql .= ' LIMIT ' . $limit;

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $type = $k === ':anag' ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($k, $v, $type);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(static fn ($r) => [
            'id_contratto' => (int) $r['id_contratto'],
            'id_anagrafica' => (int) $r['id_anagrafica'],
            'codice' => $r['codice'] ?? null,
            'titolo' => (string) $r['titolo'],
            'data_inizio' => $r['data_inizio'] ?? null,
            'data_fine' => $r['data_fine'] ?? null,
            'rinnovo_automatico' => (int) ($r['rinnovo_automatico'] ?? 0),
            'attivo' => (int) ($r['attivo'] ?? 1),
            'updated_at' => $r['updated_at'] ?? null,
            'ragione_sociale' => $r['ragione_sociale'] ?? null,
        ], $rows);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getById(int $id): ?array
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT
                c.id_contratto,
                c.id_anagrafica,
                c.codice,
                c.titolo,
                c.testo_legale,
                c.data_inizio,
                c.data_fine,
                c.rinnovo_automatico,
                c.attivo,
                c.created_at,
                c.updated_at,
                a.ragione_sociale
            FROM tb_contratti c
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = c.id_anagrafica
            WHERE c.id_contratto = :id
            LIMIT 1
        SQL);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'id_contratto' => (int) $row['id_contratto'],
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'codice' => $row['codice'] ?? null,
            'titolo' => (string) $row['titolo'],
            'testo_legale' => $row['testo_legale'] ?? null,
            'data_inizio' => $row['data_inizio'] ?? null,
            'data_fine' => $row['data_fine'] ?? null,
            'rinnovo_automatico' => (int) ($row['rinnovo_automatico'] ?? 0),
            'attivo' => (int) ($row['attivo'] ?? 1),
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'ragione_sociale' => $row['ragione_sociale'] ?? null,
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function getLines(int $idContratto): array
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT
                id_riga,
                id_contratto,
                tipo_item,
                id_prodotto,
                id_pacchetto,
                descrizione,
                prezzo_unitario,
                iva,
                id_sdi_natura_iva,
                sconto_base,
                posizione
            FROM tb_contratti_righe
            WHERE id_contratto = :id
            ORDER BY COALESCE(posizione, id_riga) ASC
        SQL);
        $stmt->bindValue(':id', $idContratto, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id_riga' => (int) $row['id_riga'],
                'id_contratto' => (int) $row['id_contratto'],
                'tipo_item' => $row['tipo_item'] ?? 'prodotto',
                'id_prodotto' => isset($row['id_prodotto']) ? (int) $row['id_prodotto'] : null,
                'id_pacchetto' => isset($row['id_pacchetto']) ? (int) $row['id_pacchetto'] : null,
                'descrizione' => $row['descrizione'] ?? null,
                'prezzo_unitario' => isset($row['prezzo_unitario']) ? (float) $row['prezzo_unitario'] : 0.0,
                'iva' => isset($row['iva']) ? (float) $row['iva'] : null,
                'id_sdi_natura_iva' => isset($row['id_sdi_natura_iva']) ? (int) $row['id_sdi_natura_iva'] : null,
                'sconto_base' => isset($row['sconto_base']) ? (float) $row['sconto_base'] : 0.0,
                'posizione' => isset($row['posizione']) ? (int) $row['posizione'] : null,
            ];
        }
        return $out;
    }

    /**
     * @return list<array{quantita_min:float,quantita_max:?float,sconto:float}>
     */
    public function getLineDiscounts(int $idRiga): array
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT quantita_min, quantita_max, sconto_percent
            FROM tb_contratti_sconti
            WHERE id_riga = :id
            ORDER BY quantita_min ASC, id_sconto ASC
        SQL);
        $stmt->bindValue(':id', $idRiga, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'quantita_min' => isset($row['quantita_min']) ? (float) $row['quantita_min'] : 0.0,
                'quantita_max' => isset($row['quantita_max']) ? (float) $row['quantita_max'] : null,
                'sconto' => isset($row['sconto_percent']) ? (float) $row['sconto_percent'] : 0.0,
            ];
        }
        return $out;
    }

    /**
     * @param array{codice:?string,titolo:string,testo_legale:?string,data_inizio:string,data_fine:?string,rinnovo_automatico:int,attivo:int,id_anagrafica:int} $data
     */
    public function create(array $data): int
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare(<<<'SQL'
            INSERT INTO tb_contratti (
                id_anagrafica, codice, titolo, testo_legale, data_inizio, data_fine,
                rinnovo_automatico, attivo, created_at, updated_at
            ) VALUES (
                :id_anagrafica, :codice, :titolo, :testo_legale, :data_inizio, :data_fine,
                :rinnovo_automatico, :attivo, NOW(), NOW()
            )
        SQL);
        $stmt->bindValue(':id_anagrafica', (int) $data['id_anagrafica'], PDO::PARAM_INT);
        $stmt->bindValue(':codice', $data['codice'] ?? null, ($data['codice'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':titolo', (string) $data['titolo'], PDO::PARAM_STR);
        $stmt->bindValue(':testo_legale', $data['testo_legale'] ?? null, ($data['testo_legale'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':data_inizio', $data['data_inizio'], PDO::PARAM_STR);
        $stmt->bindValue(':data_fine', $data['data_fine'] ?? null, ($data['data_fine'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':rinnovo_automatico', (int) ($data['rinnovo_automatico'] ?? 0), PDO::PARAM_INT);
        $stmt->bindValue(':attivo', (int) ($data['attivo'] ?? 1), PDO::PARAM_INT);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array<string,mixed> $data
     */
    public function update(int $id, array $data): void
    {
        $this->ensureSchema();
        $set = [];
        $params = [':id' => $id];
        $types = [':id' => PDO::PARAM_INT];

        foreach (['codice', 'titolo', 'testo_legale', 'data_inizio', 'data_fine', 'rinnovo_automatico', 'attivo', 'id_anagrafica'] as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $set[] = $field . ' = :' . $field;
            $params[':' . $field] = $data[$field];
            if (in_array($field, ['rinnovo_automatico', 'attivo', 'id_anagrafica'], true)) {
                $types[':' . $field] = PDO::PARAM_INT;
            } else {
                $types[':' . $field] = PDO::PARAM_STR;
            }
        }

        if (empty($set)) {
            return;
        }
        $sql = 'UPDATE tb_contratti SET ' . implode(', ', $set) . ', updated_at = NOW() WHERE id_contratto = :id LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $type = $types[$k] ?? PDO::PARAM_STR;
            if ($v === null) {
                $stmt->bindValue($k, null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue($k, $v, $type);
            }
        }
        $stmt->execute();
    }

    /**
     * @param list<array<string,mixed>> $lines
     */
    public function replaceLines(int $idContratto, array $lines): void
    {
        $this->ensureSchema();
        $this->pdo->beginTransaction();
        try {
            $delS = $this->pdo->prepare(<<<'SQL'
                DELETE s FROM tb_contratti_sconti s
                INNER JOIN tb_contratti_righe r ON r.id_riga = s.id_riga
                WHERE r.id_contratto = :id
            SQL);
            $delS->bindValue(':id', $idContratto, PDO::PARAM_INT);
            $delS->execute();

            $delR = $this->pdo->prepare('DELETE FROM tb_contratti_righe WHERE id_contratto = :id');
            $delR->bindValue(':id', $idContratto, PDO::PARAM_INT);
            $delR->execute();

            if (!empty($lines)) {
                $ins = $this->pdo->prepare(<<<'SQL'
                    INSERT INTO tb_contratti_righe (
                        id_contratto, tipo_item, id_prodotto, id_pacchetto, descrizione,
                        prezzo_unitario, iva, id_sdi_natura_iva, sconto_base, posizione
                    ) VALUES (
                        :id_contratto, :tipo_item, :id_prodotto, :id_pacchetto, :descrizione,
                        :prezzo_unitario, :iva, :id_sdi_natura_iva, :sconto_base, :posizione
                    )
                SQL);

                $insSconto = $this->pdo->prepare(<<<'SQL'
                    INSERT INTO tb_contratti_sconti (id_riga, quantita_min, quantita_max, sconto_percent)
                    VALUES (:id_riga, :quantita_min, :quantita_max, :sconto_percent)
                SQL);

                $pos = 1;
                foreach ($lines as $line) {
                    $tipo = ($line['tipo_item'] ?? $line['tipo'] ?? 'prodotto') === 'pacchetto' ? 'pacchetto' : 'prodotto';
                    $idProdotto = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
                    if ($idProdotto !== null && $idProdotto <= 0) { $idProdotto = null; }
                    $idPacchetto = isset($line['id_pacchetto']) ? (int) $line['id_pacchetto'] : null;
                    if ($idPacchetto !== null && $idPacchetto <= 0) { $idPacchetto = null; }
                    $descr = isset($line['descrizione']) ? trim((string) $line['descrizione']) : '';
                    $prezzo = isset($line['prezzo_unitario']) ? (float) $line['prezzo_unitario'] : (isset($line['prezzo']) ? (float) $line['prezzo'] : 0.0);
                    $iva = array_key_exists('iva', $line) ? $line['iva'] : null;
                    $ivaVal = $iva !== null && $iva !== '' ? (float) $iva : null;
                    $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;
                    if ($idNatura !== null && $idNatura <= 0) { $idNatura = null; }
                    $scontoBase = isset($line['sconto_base']) ? (float) $line['sconto_base'] : (isset($line['sconto']) ? (float) $line['sconto'] : 0.0);

                    $ins->bindValue(':id_contratto', $idContratto, PDO::PARAM_INT);
                    $ins->bindValue(':tipo_item', $tipo, PDO::PARAM_STR);
                    $ins->bindValue(':id_prodotto', $idProdotto, $idProdotto === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                    $ins->bindValue(':id_pacchetto', $idPacchetto, $idPacchetto === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                    $ins->bindValue(':descrizione', $descr !== '' ? $descr : null, $descr !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
                    $ins->bindValue(':prezzo_unitario', $prezzo, PDO::PARAM_STR);
                    $ins->bindValue(':iva', $ivaVal, $ivaVal === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $ins->bindValue(':id_sdi_natura_iva', $idNatura, $idNatura === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                    $ins->bindValue(':sconto_base', $scontoBase, PDO::PARAM_STR);
                    $ins->bindValue(':posizione', $pos, PDO::PARAM_INT);
                    $ins->execute();

                    $idRiga = (int) $this->pdo->lastInsertId();
                    $pos++;

                    $sconti = isset($line['sconti']) && is_array($line['sconti']) ? $line['sconti'] : [];
                    foreach ($sconti as $sc) {
                        if (!is_array($sc)) { continue; }
                        $min = isset($sc['quantita_min']) ? (float) $sc['quantita_min'] : 0.0;
                        $max = isset($sc['quantita_max']) && $sc['quantita_max'] !== '' ? (float) $sc['quantita_max'] : null;
                        $perc = isset($sc['sconto']) ? (float) $sc['sconto'] : (isset($sc['sconto_percent']) ? (float) $sc['sconto_percent'] : 0.0);
                        if ($min < 0 || $perc < 0) { continue; }

                        $insSconto->bindValue(':id_riga', $idRiga, PDO::PARAM_INT);
                        $insSconto->bindValue(':quantita_min', $min, PDO::PARAM_STR);
                        $insSconto->bindValue(':quantita_max', $max, $max === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                        $insSconto->bindValue(':sconto_percent', $perc, PDO::PARAM_STR);
                        $insSconto->execute();
                    }
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function delete(int $idContratto): void
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare('DELETE FROM tb_contratti WHERE id_contratto = :id');
        $stmt->bindValue(':id', $idContratto, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findActiveContract(int $idAnagrafica, ?string $dateRef = null): ?array
    {
        $this->ensureSchema();
        $dateRef = $dateRef ?: date('Y-m-d');
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT id_contratto, id_anagrafica, codice, titolo, testo_legale, data_inizio, data_fine, rinnovo_automatico, attivo
            FROM tb_contratti
            WHERE id_anagrafica = :anag
              AND attivo = 1
              AND data_inizio <= :ref
              AND (
                data_fine IS NULL
                OR data_fine >= :ref
                OR rinnovo_automatico = 1
              )
            ORDER BY data_inizio DESC, id_contratto DESC
            LIMIT 1
        SQL);
        $stmt->bindValue(':anag', $idAnagrafica, PDO::PARAM_INT);
        $stmt->bindValue(':ref', $dateRef, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'id_contratto' => (int) $row['id_contratto'],
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'codice' => $row['codice'] ?? null,
            'titolo' => (string) $row['titolo'],
            'testo_legale' => $row['testo_legale'] ?? null,
            'data_inizio' => $row['data_inizio'] ?? null,
            'data_fine' => $row['data_fine'] ?? null,
            'rinnovo_automatico' => (int) ($row['rinnovo_automatico'] ?? 0),
            'attivo' => (int) ($row['attivo'] ?? 1),
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function resolveProductPricing(int $idAnagrafica, int $idProdotto, float $quantita, ?string $dateRef = null): ?array
    {
        $this->ensureSchema();
        if ($idAnagrafica <= 0 || $idProdotto <= 0) {
            return null;
        }
        $dateRef = $dateRef ?: date('Y-m-d');
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT
                c.id_contratto,
                r.id_riga,
                r.prezzo_unitario,
                r.iva,
                r.id_sdi_natura_iva,
                r.sconto_base
            FROM tb_contratti c
            INNER JOIN tb_contratti_righe r ON r.id_contratto = c.id_contratto
            WHERE c.id_anagrafica = :anag
              AND c.attivo = 1
              AND r.tipo_item = 'prodotto'
              AND r.id_prodotto = :prod
              AND c.data_inizio <= :ref
              AND (
                c.data_fine IS NULL
                OR c.data_fine >= :ref
                OR c.rinnovo_automatico = 1
              )
            ORDER BY c.data_inizio DESC, c.id_contratto DESC
            LIMIT 1
        SQL);
        $stmt->bindValue(':anag', $idAnagrafica, PDO::PARAM_INT);
        $stmt->bindValue(':prod', $idProdotto, PDO::PARAM_INT);
        $stmt->bindValue(':ref', $dateRef, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        $idRiga = (int) $row['id_riga'];
        $base = isset($row['sconto_base']) ? (float) $row['sconto_base'] : 0.0;
        $sconto = $this->resolveDiscountForLine($idRiga, $quantita, $base);
        return [
            'id_contratto' => (int) $row['id_contratto'],
            'id_riga' => $idRiga,
            'prezzo_unitario' => isset($row['prezzo_unitario']) ? (float) $row['prezzo_unitario'] : 0.0,
            'iva' => isset($row['iva']) ? (float) $row['iva'] : null,
            'id_sdi_natura_iva' => isset($row['id_sdi_natura_iva']) ? (int) $row['id_sdi_natura_iva'] : null,
            'sconto' => $sconto,
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function resolvePackagePricing(int $idAnagrafica, int $idPacchetto, float $quantita, ?string $dateRef = null): ?array
    {
        $this->ensureSchema();
        if ($idAnagrafica <= 0 || $idPacchetto <= 0) {
            return null;
        }
        $dateRef = $dateRef ?: date('Y-m-d');
        $stmt = $this->pdo->prepare(<<<'SQL'
            SELECT
                c.id_contratto,
                r.id_riga,
                r.prezzo_unitario,
                r.iva,
                r.id_sdi_natura_iva,
                r.sconto_base
            FROM tb_contratti c
            INNER JOIN tb_contratti_righe r ON r.id_contratto = c.id_contratto
            WHERE c.id_anagrafica = :anag
              AND c.attivo = 1
              AND r.tipo_item = 'pacchetto'
              AND r.id_pacchetto = :pkg
              AND c.data_inizio <= :ref
              AND (
                c.data_fine IS NULL
                OR c.data_fine >= :ref
                OR c.rinnovo_automatico = 1
              )
            ORDER BY c.data_inizio DESC, c.id_contratto DESC
            LIMIT 1
        SQL);
        $stmt->bindValue(':anag', $idAnagrafica, PDO::PARAM_INT);
        $stmt->bindValue(':pkg', $idPacchetto, PDO::PARAM_INT);
        $stmt->bindValue(':ref', $dateRef, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        $idRiga = (int) $row['id_riga'];
        $base = isset($row['sconto_base']) ? (float) $row['sconto_base'] : 0.0;
        $sconto = $this->resolveDiscountForLine($idRiga, $quantita, $base);
        return [
            'id_contratto' => (int) $row['id_contratto'],
            'id_riga' => $idRiga,
            'prezzo_unitario' => isset($row['prezzo_unitario']) ? (float) $row['prezzo_unitario'] : 0.0,
            'iva' => isset($row['iva']) ? (float) $row['iva'] : null,
            'id_sdi_natura_iva' => isset($row['id_sdi_natura_iva']) ? (int) $row['id_sdi_natura_iva'] : null,
            'sconto' => $sconto,
        ];
    }

    private function resolveDiscountForLine(int $idRiga, float $quantita, float $base): float
    {
        if ($idRiga <= 0) {
            return $base;
        }
        $tiers = $this->getLineDiscounts($idRiga);
        if (empty($tiers)) {
            return $base;
        }
        $selected = null;
        foreach ($tiers as $tier) {
            $min = $tier['quantita_min'] ?? 0.0;
            $max = $tier['quantita_max'] ?? null;
            if ($quantita < $min) {
                continue;
            }
            if ($max !== null && $quantita > $max) {
                continue;
            }
            $selected = (float) ($tier['sconto'] ?? 0.0);
        }
        if ($selected === null) {
            return $base;
        }
        return $selected;
    }
}
