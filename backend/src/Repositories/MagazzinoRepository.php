<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class MagazzinoRepository
{
    private bool $schemaEnsured = false;

    public function __construct(private PDO $pdo) {}

    public function getConnection(): PDO
    {
        return $this->pdo;
    }

    private function ensureSchema(): void
    {
        if ($this->schemaEnsured) {
            return;
        }
        try {
            $this->pdo->exec("ALTER TABLE tb_prodotti ADD COLUMN gestione_magazzino TINYINT(1) NOT NULL DEFAULT 0");
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec("ALTER TABLE tb_prodotti ADD COLUMN giacenza_attuale DECIMAL(14,3) NOT NULL DEFAULT 0");
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec("ALTER TABLE tb_prodotti ADD COLUMN soglia_scorta DECIMAL(14,3) NULL");
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec("ALTER TABLE tb_prodotti ADD COLUMN id_unita SMALLINT(5) UNSIGNED NULL");
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec("ALTER TABLE tb_prodotti ADD KEY fk_prod_um (id_unita)");
        } catch (\Throwable $ignored) {
        }

        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_magazzino_movimenti (
                id_movimento INT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_prodotto INT UNSIGNED NOT NULL,
                tipo_movimento VARCHAR(16) NOT NULL,
                quantita_delta DECIMAL(14,3) NOT NULL,
                giacenza_pre DECIMAL(14,3) NOT NULL,
                giacenza_post DECIMAL(14,3) NOT NULL,
                riferimento_tipo VARCHAR(32) NULL,
                riferimento_id INT UNSIGNED NULL,
                note TEXT NULL,
                created_by INT UNSIGNED NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_movimento),
                KEY idx_mm_prod (id_prodotto),
                KEY idx_mm_created (created_at),
                CONSTRAINT fk_mm_prodotto FOREIGN KEY (id_prodotto)
                    REFERENCES tb_prodotti (id_prodotto) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);

        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_magazzino_articoli (
                id_articolo INT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_prodotto_legacy INT UNSIGNED NULL,
                codice VARCHAR(64) NULL,
                nome VARCHAR(255) NOT NULL,
                id_categoria INT UNSIGNED NULL,
                gestione_magazzino TINYINT(1) NOT NULL DEFAULT 1,
                giacenza_attuale DECIMAL(14,3) NOT NULL DEFAULT 0,
                soglia_scorta DECIMAL(14,3) NULL,
                id_unita SMALLINT(5) UNSIGNED NULL,
                note TEXT NULL,
                attivo TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_articolo),
                UNIQUE KEY uq_mag_art_legacy (id_prodotto_legacy),
                KEY idx_mag_art_codice (codice),
                KEY idx_mag_art_cat (id_categoria),
                KEY idx_mag_art_attivo (attivo),
                KEY idx_mag_art_gestione (gestione_magazzino)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);

        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_magazzino_articoli_movimenti (
                id_movimento INT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_articolo INT UNSIGNED NOT NULL,
                tipo_movimento VARCHAR(16) NOT NULL,
                quantita_delta DECIMAL(14,3) NOT NULL,
                giacenza_pre DECIMAL(14,3) NOT NULL,
                giacenza_post DECIMAL(14,3) NOT NULL,
                riferimento_tipo VARCHAR(32) NULL,
                riferimento_id INT UNSIGNED NULL,
                note TEXT NULL,
                created_by INT UNSIGNED NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_movimento),
                KEY idx_mam_articolo (id_articolo),
                KEY idx_mam_created (created_at),
                CONSTRAINT fk_mam_articolo FOREIGN KEY (id_articolo)
                    REFERENCES tb_magazzino_articoli (id_articolo) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);

        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_prodotti_consumi_magazzino (
                id_consumo INT UNSIGNED NOT NULL AUTO_INCREMENT,
                id_prodotto INT UNSIGNED NOT NULL,
                combo_key VARCHAR(255) NULL,
                id_variazione INT UNSIGNED NULL,
                id_articolo INT UNSIGNED NOT NULL,
                quantita_per_unita DECIMAL(14,6) NOT NULL DEFAULT 1,
                scarto_percento DECIMAL(7,3) NOT NULL DEFAULT 0,
                attivo TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_consumo),
                UNIQUE KEY uq_pcm_prod_var_art (id_prodotto, id_variazione, id_articolo),
                KEY idx_pcm_articolo (id_articolo),
                KEY idx_pcm_prodotto (id_prodotto),
                KEY idx_pcm_combo_key (combo_key),
                KEY idx_pcm_variazione (id_variazione),
                CONSTRAINT fk_pcm_prodotto FOREIGN KEY (id_prodotto)
                    REFERENCES tb_prodotti (id_prodotto) ON DELETE CASCADE,
                CONSTRAINT fk_pcm_variazione FOREIGN KEY (id_variazione)
                    REFERENCES tb_variazioni (id_variazione) ON DELETE CASCADE,
                CONSTRAINT fk_pcm_articolo FOREIGN KEY (id_articolo)
                    REFERENCES tb_magazzino_articoli (id_articolo) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino ADD COLUMN combo_key VARCHAR(255) NULL AFTER id_prodotto');
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino ADD KEY idx_pcm_combo_key (combo_key)');
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino ADD COLUMN id_variazione INT UNSIGNED NULL AFTER id_prodotto');
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino ADD KEY idx_pcm_variazione (id_variazione)');
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino DROP INDEX uq_pcm_prod_art');
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino ADD UNIQUE KEY uq_pcm_prod_var_art (id_prodotto, id_variazione, id_articolo)');
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino ADD UNIQUE KEY uq_pcm_prod_combo_art (id_prodotto, combo_key, id_articolo)');
        } catch (\Throwable $ignored) {
        }
        try {
            $this->pdo->exec('ALTER TABLE tb_prodotti_consumi_magazzino ADD CONSTRAINT fk_pcm_variazione FOREIGN KEY (id_variazione) REFERENCES tb_variazioni (id_variazione) ON DELETE CASCADE');
        } catch (\Throwable $ignored) {
        }

        // Migrazione iniziale: ogni prodotto gestito diventa un articolo magazzino dedicato.
        $this->pdo->exec(<<<'SQL'
            INSERT INTO tb_magazzino_articoli
                (id_prodotto_legacy, codice, nome, id_categoria, gestione_magazzino, giacenza_attuale, soglia_scorta, id_unita, attivo)
            SELECT
                p.id_prodotto,
                p.codice,
                p.nome,
                p.id_categoria,
                COALESCE(p.gestione_magazzino, 0),
                COALESCE(p.giacenza_attuale, 0),
                p.soglia_scorta,
                p.id_unita,
                COALESCE(p.attivo, 1)
            FROM tb_prodotti p
            LEFT JOIN tb_magazzino_articoli a ON a.id_prodotto_legacy = p.id_prodotto
            WHERE COALESCE(p.gestione_magazzino, 0) = 1
              AND a.id_articolo IS NULL
        SQL);

        $this->pdo->exec(<<<'SQL'
            INSERT INTO tb_prodotti_consumi_magazzino
                (id_prodotto, combo_key, id_variazione, id_articolo, quantita_per_unita, scarto_percento, attivo)
            SELECT
                p.id_prodotto,
                NULL,
                NULL,
                a.id_articolo,
                1,
                0,
                1
            FROM tb_prodotti p
            INNER JOIN tb_magazzino_articoli a ON a.id_prodotto_legacy = p.id_prodotto
            LEFT JOIN tb_prodotti_consumi_magazzino c
                ON c.id_prodotto = p.id_prodotto
               AND c.id_articolo = a.id_articolo
            WHERE COALESCE(p.gestione_magazzino, 0) = 1
              AND c.id_consumo IS NULL
        SQL);

        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS tb_macchine (
                id_macchina INT UNSIGNED NOT NULL AUTO_INCREMENT,
                codice VARCHAR(64) NOT NULL,
                nome VARCHAR(255) NOT NULL,
                tipo VARCHAR(32) NOT NULL,
                marca VARCHAR(128) NULL,
                modello VARCHAR(128) NULL,
                seriale VARCHAR(128) NULL,
                reparto VARCHAR(64) NULL,
                stato VARCHAR(32) NOT NULL DEFAULT 'attiva',
                capacita_oraria DECIMAL(12,2) NULL,
                data_installazione DATE NULL,
                data_ultima_manutenzione DATE NULL,
                data_prossima_manutenzione DATE NULL,
                note TEXT NULL,
                attiva TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id_macchina),
                UNIQUE KEY uq_macchine_codice (codice),
                KEY idx_macchine_tipo (tipo),
                KEY idx_macchine_attiva (attiva)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        SQL);

        $this->schemaEnsured = true;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listScorte(?string $search = null, bool $onlyAlerts = false, bool $includeUnmanaged = false, ?int $idCategoria = null): array
    {
        $this->ensureSchema();
        $sql = <<<'SQL'
            SELECT
                a.id_articolo,
                a.id_categoria,
                a.codice,
                a.nome,
                a.gestione_magazzino,
                a.giacenza_attuale,
                a.soglia_scorta,
                a.id_unita,
                um.code AS unita_code,
                um.label AS unita_label,
                c.nome AS categoria
            FROM tb_magazzino_articoli a
            LEFT JOIN tb_categorie c ON c.id_categoria = a.id_categoria
            LEFT JOIN cfg_unita_misura um ON um.id_unita = a.id_unita
            WHERE COALESCE(a.attivo, 1) = 1
        SQL;
        if (!$includeUnmanaged) {
            $sql .= ' AND COALESCE(a.gestione_magazzino, 0) = 1';
        }
        if ($idCategoria !== null && $idCategoria > 0) {
            $sql .= ' AND a.id_categoria = :id_categoria';
        }

        $params = [];
        if ($search !== null && trim($search) !== '') {
            $sql .= ' AND (a.nome LIKE :q OR a.codice LIKE :q)';
            $params[':q'] = '%' . trim($search) . '%';
        }
        $sql .= ' ORDER BY a.nome ASC';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        if ($idCategoria !== null && $idCategoria > 0) {
            $stmt->bindValue(':id_categoria', $idCategoria, PDO::PARAM_INT);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $giacenza = isset($row['giacenza_attuale']) ? (float) $row['giacenza_attuale'] : 0.0;
            $soglia = array_key_exists('soglia_scorta', $row) && $row['soglia_scorta'] !== null
                ? (float) $row['soglia_scorta']
                : null;
            $isManaged = (int) ($row['gestione_magazzino'] ?? 0) === 1;
            $status = 'ok';
            if (!$isManaged) {
                $status = 'non_gestito';
            } elseif ($giacenza <= 0.0001) {
                $status = 'esaurito';
            } elseif ($soglia !== null && $giacenza <= $soglia) {
                $status = 'basso';
            }
            if ($onlyAlerts && !in_array($status, ['basso', 'esaurito'], true)) {
                continue;
            }

            $items[] = [
                // Compatibilita frontend esistente (campo storico id_prodotto).
                'id_prodotto' => (int) $row['id_articolo'],
                'id_articolo' => (int) $row['id_articolo'],
                'id_categoria' => isset($row['id_categoria']) ? (int) $row['id_categoria'] : null,
                'codice' => $row['codice'] ?? null,
                'nome' => (string) ($row['nome'] ?? ''),
                'categoria' => $row['categoria'] ?? null,
                'giacenza_attuale' => $giacenza,
                'soglia_scorta' => $soglia,
                'id_unita' => isset($row['id_unita']) ? (int) $row['id_unita'] : null,
                'unita_misura' => $row['unita_code'] ?? null,
                'unita_misura_label' => $row['unita_label'] ?? null,
                'stock_status' => $status,
            ];
        }

        return $items;
    }

    /**
     * @param array<string,mixed> $data
     */
    public function updateProductStockConfig(int $idProdotto, array $data): void
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare(
            'UPDATE tb_magazzino_articoli
             SET gestione_magazzino = :gestione_magazzino,
                 soglia_scorta = :soglia_scorta,
                 id_unita = :id_unita
             WHERE id_articolo = :id'
        );
        $gestione = !empty($data['gestione_magazzino']) ? 1 : 0;
        $soglia = array_key_exists('soglia_scorta', $data) ? $data['soglia_scorta'] : null;
        $idUnita = isset($data['id_unita']) && (int) $data['id_unita'] > 0 ? (int) $data['id_unita'] : null;
        if ($gestione === 0) {
            $soglia = 0;
            $idUnita = null;
        }

        $stmt->bindValue(':id', $idProdotto, PDO::PARAM_INT);
        $stmt->bindValue(':gestione_magazzino', $gestione, PDO::PARAM_INT);
        $stmt->bindValue(':soglia_scorta', $soglia, $soglia === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':id_unita', $idUnita, $idUnita === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findProductForStock(int $idProdotto): ?array
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare(
            'SELECT
                a.id_articolo,
                a.nome,
                a.codice,
                a.gestione_magazzino,
                a.giacenza_attuale,
                a.soglia_scorta,
                a.id_unita,
                um.code AS unita_code,
                um.label AS unita_label
             FROM tb_magazzino_articoli a
             LEFT JOIN cfg_unita_misura um ON um.id_unita = a.id_unita
             WHERE a.id_articolo = :id
             LIMIT 1'
        );
        $stmt->bindValue(':id', $idProdotto, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        return [
            'id_prodotto' => (int) $row['id_articolo'],
            'id_articolo' => (int) $row['id_articolo'],
            'nome' => (string) ($row['nome'] ?? ''),
            'codice' => $row['codice'] ?? null,
            'gestione_magazzino' => (int) ($row['gestione_magazzino'] ?? 0),
            'giacenza_attuale' => (float) ($row['giacenza_attuale'] ?? 0),
            'soglia_scorta' => $row['soglia_scorta'] !== null ? (float) $row['soglia_scorta'] : null,
            'id_unita' => isset($row['id_unita']) ? (int) $row['id_unita'] : null,
            'unita_misura' => $row['unita_code'] ?? null,
            'unita_misura_label' => $row['unita_label'] ?? null,
        ];
    }

    /**
     * @return list<array{id_unita:int,code:string,label:string}>
     */
    public function listUnitaMisura(): array
    {
        $this->ensureSchema();
        try {
            $stmt = $this->pdo->query('SELECT id_unita, code, label FROM cfg_unita_misura WHERE attivo = 1 ORDER BY label ASC');
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $ignored) {
            return [];
        }

        $items = [];
        foreach ($rows as $row) {
            $id = isset($row['id_unita']) ? (int) $row['id_unita'] : 0;
            $code = isset($row['code']) ? trim((string) $row['code']) : '';
            $label = isset($row['label']) ? trim((string) $row['label']) : '';
            if ($id <= 0 || $code === '' || $label === '') {
                continue;
            }
            $items[] = [
                'id_unita' => $id,
                'code' => $code,
                'label' => $label,
            ];
        }
        return $items;
    }

    /**
     * @return array{id_movimento:int,giacenza_pre:float,giacenza_post:float}
     */
    public function registerMovimento(int $idProdotto, string $tipo, float $quantita, ?string $note, ?int $createdBy = null): array
    {
        $this->ensureSchema();
        $tipo = strtolower(trim($tipo));
        if (!in_array($tipo, ['carico', 'scarico', 'rettifica'], true)) {
            throw new \RuntimeException('Tipo movimento non valido.', 422);
        }

        $started = false;
        if (!$this->pdo->inTransaction()) {
            $this->pdo->beginTransaction();
            $started = true;
        }

        try {
            $product = $this->findProductForStock($idProdotto);
            if ($product === null) {
                throw new \RuntimeException('Prodotto non trovato.', 404);
            }
            if ((int) ($product['gestione_magazzino'] ?? 0) !== 1) {
                throw new \RuntimeException('Prodotto non configurato per gestione magazzino.', 422);
            }

            $giacenzaPre = (float) ($product['giacenza_attuale'] ?? 0);
            $delta = 0.0;
            if ($tipo === 'carico') {
                $delta = abs($quantita);
            } elseif ($tipo === 'scarico') {
                $delta = -abs($quantita);
            } else {
                $delta = $quantita - $giacenzaPre;
            }
            $giacenzaPost = $giacenzaPre + $delta;
            if ($giacenzaPost < 0) {
                throw new \RuntimeException('Movimento non valido: giacenza negativa.', 422);
            }

            $upd = $this->pdo->prepare('UPDATE tb_magazzino_articoli SET giacenza_attuale = :qty WHERE id_articolo = :id');
            $upd->bindValue(':id', $idProdotto, PDO::PARAM_INT);
            $upd->bindValue(':qty', $giacenzaPost, PDO::PARAM_STR);
            $upd->execute();

            $ins = $this->pdo->prepare(
                'INSERT INTO tb_magazzino_articoli_movimenti
                 (id_articolo, tipo_movimento, quantita_delta, giacenza_pre, giacenza_post, note, created_by)
                 VALUES (:id_articolo, :tipo, :delta, :pre, :post, :note, :created_by)'
            );
            $ins->bindValue(':id_articolo', $idProdotto, PDO::PARAM_INT);
            $ins->bindValue(':tipo', $tipo, PDO::PARAM_STR);
            $ins->bindValue(':delta', $delta, PDO::PARAM_STR);
            $ins->bindValue(':pre', $giacenzaPre, PDO::PARAM_STR);
            $ins->bindValue(':post', $giacenzaPost, PDO::PARAM_STR);
            $ins->bindValue(':note', $note, $note === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $ins->bindValue(':created_by', $createdBy, $createdBy === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $ins->execute();

            $idMov = (int) $this->pdo->lastInsertId();

            if ($started && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }

            return [
                'id_movimento' => $idMov,
                'giacenza_pre' => $giacenzaPre,
                'giacenza_post' => $giacenzaPost,
            ];
        } catch (\Throwable $exception) {
            if ($started && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listMovimenti(array $filters = []): array
    {
        $this->ensureSchema();

        $sql = <<<'SQL'
            SELECT
                m.id_movimento,
                m.id_articolo,
                a.id_categoria,
                a.codice AS prodotto_codice,
                a.nome AS prodotto_nome,
                c.nome AS categoria_nome,
                m.tipo_movimento,
                m.quantita_delta,
                m.giacenza_pre,
                m.giacenza_post,
                m.riferimento_tipo,
                m.riferimento_id,
                m.note,
                m.created_by,
                m.created_at,
                acc.username AS created_by_username,
                acc.email AS created_by_email
            FROM tb_magazzino_articoli_movimenti m
            INNER JOIN tb_magazzino_articoli a ON a.id_articolo = m.id_articolo
            LEFT JOIN tb_categorie c ON c.id_categoria = a.id_categoria
            LEFT JOIN auth_accounts acc ON acc.id_account = m.created_by
            WHERE 1 = 1
        SQL;

        $search = isset($filters['search']) ? trim((string) $filters['search']) : '';
        if ($search !== '') {
            $sql .= ' AND (a.nome LIKE :q OR a.codice LIKE :q OR m.note LIKE :q)';
        }

        $tipo = isset($filters['tipo_movimento']) ? trim((string) $filters['tipo_movimento']) : '';
        if ($tipo !== '') {
            $sql .= ' AND m.tipo_movimento = :tipo';
        }

        $idProdotto = isset($filters['id_prodotto']) ? (int) $filters['id_prodotto'] : 0;
        if ($idProdotto > 0) {
            $sql .= ' AND m.id_articolo = :id_prodotto';
        }

        $idCategoria = isset($filters['id_categoria']) ? (int) $filters['id_categoria'] : 0;
        if ($idCategoria > 0) {
            $sql .= ' AND a.id_categoria = :id_categoria';
        }

        $dateFrom = isset($filters['date_from']) ? trim((string) $filters['date_from']) : '';
        if ($dateFrom !== '') {
            $sql .= ' AND m.created_at >= :date_from';
        }

        $dateTo = isset($filters['date_to']) ? trim((string) $filters['date_to']) : '';
        if ($dateTo !== '') {
            $sql .= ' AND m.created_at <= :date_to';
        }

        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 200;
        if ($limit <= 0) {
            $limit = 200;
        }
        if ($limit > 1000) {
            $limit = 1000;
        }

        $sql .= ' ORDER BY m.created_at DESC, m.id_movimento DESC LIMIT :limit';

        $stmt = $this->pdo->prepare($sql);

        if ($search !== '') {
            $stmt->bindValue(':q', '%' . $search . '%', PDO::PARAM_STR);
        }
        if ($tipo !== '') {
            $stmt->bindValue(':tipo', $tipo, PDO::PARAM_STR);
        }
        if ($idProdotto > 0) {
            $stmt->bindValue(':id_prodotto', $idProdotto, PDO::PARAM_INT);
        }
        if ($idCategoria > 0) {
            $stmt->bindValue(':id_categoria', $idCategoria, PDO::PARAM_INT);
        }
        if ($dateFrom !== '') {
            $stmt->bindValue(':date_from', $dateFrom . ' 00:00:00', PDO::PARAM_STR);
        }
        if ($dateTo !== '') {
            $stmt->bindValue(':date_to', $dateTo . ' 23:59:59', PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_movimento' => (int) ($row['id_movimento'] ?? 0),
                'id_prodotto' => (int) ($row['id_articolo'] ?? 0),
                'id_articolo' => (int) ($row['id_articolo'] ?? 0),
                'id_categoria' => isset($row['id_categoria']) ? (int) $row['id_categoria'] : null,
                'prodotto_codice' => $row['prodotto_codice'] ?? null,
                'prodotto_nome' => $row['prodotto_nome'] ?? null,
                'categoria_nome' => $row['categoria_nome'] ?? null,
                'tipo_movimento' => $row['tipo_movimento'] ?? null,
                'quantita_delta' => isset($row['quantita_delta']) ? (float) $row['quantita_delta'] : 0.0,
                'giacenza_pre' => isset($row['giacenza_pre']) ? (float) $row['giacenza_pre'] : 0.0,
                'giacenza_post' => isset($row['giacenza_post']) ? (float) $row['giacenza_post'] : 0.0,
                'riferimento_tipo' => $row['riferimento_tipo'] ?? null,
                'riferimento_id' => isset($row['riferimento_id']) ? (int) $row['riferimento_id'] : null,
                'note' => $row['note'] ?? null,
                'created_by' => isset($row['created_by']) ? (int) $row['created_by'] : null,
                'created_by_username' => $row['created_by_username'] ?? null,
                'created_by_email' => $row['created_by_email'] ?? null,
                'created_at' => $row['created_at'] ?? null,
            ];
        }

        return $items;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listProductConsumptions(?int $idProdotto = null, ?string $comboKey = null, ?int $idVariazione = null, ?int $idArticolo = null): array
    {
        $this->ensureSchema();
        $sql = <<<'SQL'
            SELECT
                c.id_consumo,
                c.id_prodotto,
                c.combo_key,
                c.id_variazione,
                p.codice AS prodotto_codice,
                p.nome AS prodotto_nome,
                v.codice AS variazione_codice,
                v.nome AS variazione_nome,
                c.id_articolo,
                a.codice AS articolo_codice,
                a.nome AS articolo_nome,
                c.quantita_per_unita,
                c.scarto_percento,
                c.attivo
            FROM tb_prodotti_consumi_magazzino c
            INNER JOIN tb_prodotti p ON p.id_prodotto = c.id_prodotto
            LEFT JOIN tb_variazioni v ON v.id_variazione = c.id_variazione
            INNER JOIN tb_magazzino_articoli a ON a.id_articolo = c.id_articolo
            WHERE 1 = 1
        SQL;

        if ($idProdotto !== null && $idProdotto > 0) {
            $sql .= ' AND c.id_prodotto = :id_prodotto';
        }
        $useComboParam = false;
        $useVariationParam = false;
        if ($comboKey !== null) {
            if (trim($comboKey) !== '') {
                $sql .= ' AND c.combo_key = :combo_key';
                $useComboParam = true;
            } else {
                $sql .= ' AND c.combo_key IS NULL';
            }
        } elseif ($idVariazione !== null) {
            if ($idVariazione > 0) {
                $sql .= ' AND c.id_variazione = :id_variazione';
                $useVariationParam = true;
            } else {
                $sql .= ' AND c.id_variazione IS NULL';
            }
        }
        if ($idArticolo !== null && $idArticolo > 0) {
            $sql .= ' AND c.id_articolo = :id_articolo';
        }
        $sql .= ' ORDER BY p.nome ASC, v.nome ASC, a.nome ASC';

        $stmt = $this->pdo->prepare($sql);
        if ($idProdotto !== null && $idProdotto > 0) {
            $stmt->bindValue(':id_prodotto', $idProdotto, PDO::PARAM_INT);
        }
        if ($useComboParam) {
            $stmt->bindValue(':combo_key', trim($comboKey), PDO::PARAM_STR);
        }
        if ($useVariationParam) {
            $stmt->bindValue(':id_variazione', $idVariazione, PDO::PARAM_INT);
        }
        if ($idArticolo !== null && $idArticolo > 0) {
            $stmt->bindValue(':id_articolo', $idArticolo, PDO::PARAM_INT);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_consumo' => (int) ($row['id_consumo'] ?? 0),
                'id_prodotto' => (int) ($row['id_prodotto'] ?? 0),
                'combo_key' => $row['combo_key'] ?? null,
                'id_variazione' => isset($row['id_variazione']) ? (int) $row['id_variazione'] : null,
                'prodotto_codice' => $row['prodotto_codice'] ?? null,
                'prodotto_nome' => $row['prodotto_nome'] ?? null,
                'variazione_codice' => $row['variazione_codice'] ?? null,
                'variazione_nome' => $row['variazione_nome'] ?? null,
                'id_articolo' => (int) ($row['id_articolo'] ?? 0),
                'articolo_codice' => $row['articolo_codice'] ?? null,
                'articolo_nome' => $row['articolo_nome'] ?? null,
                'quantita_per_unita' => isset($row['quantita_per_unita']) ? (float) $row['quantita_per_unita'] : 0.0,
                'scarto_percento' => isset($row['scarto_percento']) ? (float) $row['scarto_percento'] : 0.0,
                'attivo' => (int) ($row['attivo'] ?? 1),
            ];
        }
        return $items;
    }

    /**
     * @param list<array{id_articolo:int,quantita_per_unita:float,scarto_percento:float,attivo:int}> $rows
     */
    public function replaceProductConsumptions(int $idProdotto, ?string $comboKey, ?int $idVariazione, array $rows): void
    {
        $this->ensureSchema();
        $started = false;
        if (!$this->pdo->inTransaction()) {
            $this->pdo->beginTransaction();
            $started = true;
        }
        try {
            $deleteSql = 'DELETE FROM tb_prodotti_consumi_magazzino WHERE id_prodotto = :id_prodotto';
            if ($comboKey !== null) {
                if (trim($comboKey) !== '') {
                    $deleteSql .= ' AND combo_key = :combo_key';
                } else {
                    $deleteSql .= ' AND combo_key IS NULL';
                }
            } elseif ($idVariazione !== null && $idVariazione > 0) {
                $deleteSql .= ' AND id_variazione = :id_variazione';
            } else {
                $deleteSql .= ' AND id_variazione IS NULL';
            }
            $del = $this->pdo->prepare($deleteSql);
            $del->bindValue(':id_prodotto', $idProdotto, PDO::PARAM_INT);
            if ($comboKey !== null && trim($comboKey) !== '') {
                $del->bindValue(':combo_key', trim($comboKey), PDO::PARAM_STR);
            } elseif ($idVariazione !== null && $idVariazione > 0) {
                $del->bindValue(':id_variazione', $idVariazione, PDO::PARAM_INT);
            }
            $del->execute();

            $ins = $this->pdo->prepare(
                'INSERT INTO tb_prodotti_consumi_magazzino
                 (id_prodotto, combo_key, id_variazione, id_articolo, quantita_per_unita, scarto_percento, attivo)
                 VALUES (:id_prodotto, :combo_key, :id_variazione, :id_articolo, :quantita_per_unita, :scarto_percento, :attivo)'
            );

            foreach ($rows as $row) {
                $idArticolo = isset($row['id_articolo']) ? (int) $row['id_articolo'] : 0;
                if ($idArticolo <= 0) {
                    continue;
                }
                $q = isset($row['quantita_per_unita']) ? (float) $row['quantita_per_unita'] : 0.0;
                $s = isset($row['scarto_percento']) ? (float) $row['scarto_percento'] : 0.0;
                $a = isset($row['attivo']) && (int) $row['attivo'] === 0 ? 0 : 1;
                if ($q <= 0) {
                    continue;
                }
                $ins->bindValue(':id_prodotto', $idProdotto, PDO::PARAM_INT);
                $ins->bindValue(':combo_key', $comboKey !== null && trim($comboKey) !== '' ? trim($comboKey) : null, $comboKey !== null && trim($comboKey) !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $ins->bindValue(':id_variazione', $idVariazione, $idVariazione !== null && $idVariazione > 0 ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $ins->bindValue(':id_articolo', $idArticolo, PDO::PARAM_INT);
                $ins->bindValue(':quantita_per_unita', $q, PDO::PARAM_STR);
                $ins->bindValue(':scarto_percento', $s, PDO::PARAM_STR);
                $ins->bindValue(':attivo', $a, PDO::PARAM_INT);
                $ins->execute();
            }

            if ($started && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($started && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /**
     * @param array<string,mixed> $article
     * @param list<array{id_prodotto:int,combo_key?:string|null,id_variazione?:int|null,quantita_per_unita:float,scarto_percento:float,attivo:int}> $rows
     */
    public function createArticleWithConsumptions(array $article, array $rows): int
    {
        $this->ensureSchema();
        $started = false;
        if (!$this->pdo->inTransaction()) {
            $this->pdo->beginTransaction();
            $started = true;
        }
        try {
            $insertArticle = $this->pdo->prepare(
                'INSERT INTO tb_magazzino_articoli
                 (codice, nome, id_categoria, gestione_magazzino, giacenza_attuale, soglia_scorta, id_unita, note, attivo)
                 VALUES (:codice, :nome, :id_categoria, :gestione_magazzino, :giacenza_attuale, :soglia_scorta, :id_unita, :note, :attivo)'
            );
            $insertArticle->bindValue(':codice', $article['codice'] ?? null, isset($article['codice']) && $article['codice'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertArticle->bindValue(':nome', (string) ($article['nome'] ?? ''), PDO::PARAM_STR);
            $insertArticle->bindValue(':id_categoria', $article['id_categoria'] ?? null, isset($article['id_categoria']) && $article['id_categoria'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $insertArticle->bindValue(':gestione_magazzino', !empty($article['gestione_magazzino']) ? 1 : 0, PDO::PARAM_INT);
            $insertArticle->bindValue(':giacenza_attuale', (float) ($article['giacenza_attuale'] ?? 0), PDO::PARAM_STR);
            $insertArticle->bindValue(':soglia_scorta', $article['soglia_scorta'] ?? null, isset($article['soglia_scorta']) && $article['soglia_scorta'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertArticle->bindValue(':id_unita', $article['id_unita'] ?? null, isset($article['id_unita']) && $article['id_unita'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $insertArticle->bindValue(':note', $article['note'] ?? null, isset($article['note']) && $article['note'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertArticle->bindValue(':attivo', isset($article['attivo']) && (int) $article['attivo'] === 0 ? 0 : 1, PDO::PARAM_INT);
            $insertArticle->execute();

            $idArticolo = (int) $this->pdo->lastInsertId();

            $insertConsumption = $this->pdo->prepare(
                'INSERT INTO tb_prodotti_consumi_magazzino
                 (id_prodotto, combo_key, id_variazione, id_articolo, quantita_per_unita, scarto_percento, attivo)
                 VALUES (:id_prodotto, :combo_key, :id_variazione, :id_articolo, :quantita_per_unita, :scarto_percento, :attivo)'
            );
            foreach ($rows as $row) {
                $idProdotto = isset($row['id_prodotto']) ? (int) $row['id_prodotto'] : 0;
                $comboKey = isset($row['combo_key']) ? trim((string) $row['combo_key']) : '';
                $idVariazione = isset($row['id_variazione']) ? (int) $row['id_variazione'] : 0;
                $quantita = isset($row['quantita_per_unita']) ? (float) $row['quantita_per_unita'] : 0.0;
                if ($idProdotto <= 0 || $quantita <= 0) {
                    continue;
                }
                $scarto = isset($row['scarto_percento']) ? (float) $row['scarto_percento'] : 0.0;
                $attivo = isset($row['attivo']) && (int) $row['attivo'] === 0 ? 0 : 1;

                $insertConsumption->bindValue(':id_prodotto', $idProdotto, PDO::PARAM_INT);
                $insertConsumption->bindValue(':combo_key', $comboKey !== '' ? $comboKey : null, $comboKey !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $insertConsumption->bindValue(':id_variazione', $idVariazione > 0 ? $idVariazione : null, $idVariazione > 0 ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $insertConsumption->bindValue(':id_articolo', $idArticolo, PDO::PARAM_INT);
                $insertConsumption->bindValue(':quantita_per_unita', $quantita, PDO::PARAM_STR);
                $insertConsumption->bindValue(':scarto_percento', $scarto, PDO::PARAM_STR);
                $insertConsumption->bindValue(':attivo', $attivo, PDO::PARAM_INT);
                $insertConsumption->execute();
            }

            if ($started && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }
            return $idArticolo;
        } catch (\Throwable $exception) {
            if ($started && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /**
     * Popola i consumi di una combinazione partendo dai consumi associati alle singole variazioni.
     * Non sovrascrive una combinazione che ha già consumi espliciti.
     *
     * @param list<int> $varIds
     * @return int Numero di articoli inseriti nella combinazione.
     */
    public function seedComboConsumptionsFromVariations(int $idProdotto, array $varIds): int
    {
        $this->ensureSchema();

        $ids = array_values(array_unique(array_filter(array_map(
            static fn ($value): int => (int) $value,
            $varIds
        ), static fn (int $value): bool => $value > 0)));
        sort($ids, SORT_NUMERIC);
        if (count($ids) === 0) {
            return 0;
        }

        $comboKey = implode('+', $ids);
        if ($comboKey === '') {
            return 0;
        }

        $check = $this->pdo->prepare(
            'SELECT 1
             FROM tb_prodotti_consumi_magazzino
             WHERE id_prodotto = :id_prodotto
               AND combo_key = :combo_key
             LIMIT 1'
        );
        $check->bindValue(':id_prodotto', $idProdotto, PDO::PARAM_INT);
        $check->bindValue(':combo_key', $comboKey, PDO::PARAM_STR);
        $check->execute();
        if ($check->fetchColumn() !== false) {
            return 0;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $insertSql = sprintf(
            'INSERT INTO tb_prodotti_consumi_magazzino
                (id_prodotto, combo_key, id_variazione, id_articolo, quantita_per_unita, scarto_percento, attivo)
             SELECT
                ?,
                ?,
                NULL,
                c.id_articolo,
                SUM(c.quantita_per_unita) AS quantita_per_unita,
                MAX(c.scarto_percento) AS scarto_percento,
                MAX(c.attivo) AS attivo
             FROM tb_prodotti_consumi_magazzino c
             WHERE c.id_prodotto = ?
               AND c.combo_key IS NULL
               AND c.id_variazione IN (%s)
             GROUP BY c.id_articolo',
            $placeholders
        );
        $insert = $this->pdo->prepare($insertSql);
        $insert->bindValue(1, $idProdotto, PDO::PARAM_INT);
        $insert->bindValue(2, $comboKey, PDO::PARAM_STR);
        $insert->bindValue(3, $idProdotto, PDO::PARAM_INT);
        foreach ($ids as $index => $idVariazione) {
            $insert->bindValue($index + 4, $idVariazione, PDO::PARAM_INT);
        }
        $insert->execute();

        $countStmt = $this->pdo->prepare(
            'SELECT COUNT(*)
             FROM tb_prodotti_consumi_magazzino
             WHERE id_prodotto = :id_prodotto
               AND combo_key = :combo_key'
        );
        $countStmt->bindValue(':id_prodotto', $idProdotto, PDO::PARAM_INT);
        $countStmt->bindValue(':combo_key', $comboKey, PDO::PARAM_STR);
        $countStmt->execute();
        return (int) $countStmt->fetchColumn();
    }

    /**
     * @return list<array{id_prodotto:int,id_variazione:int,codice:?string,nome:string}>
     */
    public function listProdottoVariazioniLinks(): array
    {
        $this->ensureSchema();
        $sql = <<<'SQL'
            SELECT
                pv.id_prodotto,
                v.id_variazione,
                v.codice,
                v.nome
            FROM appoggio_prodotto_variazione pv
            INNER JOIN tb_variazioni v ON v.id_variazione = pv.id_variazione
            ORDER BY pv.id_prodotto ASC, v.nome ASC
        SQL;
        $stmt = $this->pdo->query($sql);
        $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
        return array_map(
            static fn (array $row): array => [
                'id_prodotto' => (int) ($row['id_prodotto'] ?? 0),
                'id_variazione' => (int) ($row['id_variazione'] ?? 0),
                'codice' => $row['codice'] ?? null,
                'nome' => (string) ($row['nome'] ?? ''),
            ],
            $rows
        );
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listMacchine(?string $tipo = null, bool $onlyActive = true): array
    {
        $this->ensureSchema();
        $sql = 'SELECT * FROM tb_macchine WHERE 1=1';
        $params = [];
        if ($tipo !== null && $tipo !== '') {
            $sql .= ' AND tipo = :tipo';
            $params[':tipo'] = $tipo;
        }
        if ($onlyActive) {
            $sql .= ' AND attiva = 1';
        }
        $sql .= ' ORDER BY tipo ASC, nome ASC';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map([$this, 'normalizeMacchinaRow'], $rows);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getMacchinaById(int $idMacchina): ?array
    {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare('SELECT * FROM tb_macchine WHERE id_macchina = :id LIMIT 1');
        $stmt->bindValue(':id', $idMacchina, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        return $this->normalizeMacchinaRow($row);
    }

    /**
     * @param array<string,mixed> $input
     */
    public function saveMacchina(array $input): int
    {
        $this->ensureSchema();
        $id = isset($input['id_macchina']) ? (int) $input['id_macchina'] : 0;

        if ($id > 0) {
            $sql = 'UPDATE tb_macchine SET
                        codice = :codice,
                        nome = :nome,
                        tipo = :tipo,
                        marca = :marca,
                        modello = :modello,
                        seriale = :seriale,
                        reparto = :reparto,
                        stato = :stato,
                        capacita_oraria = :capacita_oraria,
                        data_installazione = :data_installazione,
                        data_ultima_manutenzione = :data_ultima_manutenzione,
                        data_prossima_manutenzione = :data_prossima_manutenzione,
                        note = :note,
                        attiva = :attiva
                    WHERE id_macchina = :id';
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        } else {
            $sql = 'INSERT INTO tb_macchine
                    (codice, nome, tipo, marca, modello, seriale, reparto, stato, capacita_oraria, data_installazione, data_ultima_manutenzione, data_prossima_manutenzione, note, attiva)
                    VALUES
                    (:codice, :nome, :tipo, :marca, :modello, :seriale, :reparto, :stato, :capacita_oraria, :data_installazione, :data_ultima_manutenzione, :data_prossima_manutenzione, :note, :attiva)';
            $stmt = $this->pdo->prepare($sql);
        }

        $stmt->bindValue(':codice', (string) $input['codice'], PDO::PARAM_STR);
        $stmt->bindValue(':nome', (string) $input['nome'], PDO::PARAM_STR);
        $stmt->bindValue(':tipo', (string) $input['tipo'], PDO::PARAM_STR);
        $stmt->bindValue(':marca', $input['marca'] ?? null, isset($input['marca']) && $input['marca'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':modello', $input['modello'] ?? null, isset($input['modello']) && $input['modello'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':seriale', $input['seriale'] ?? null, isset($input['seriale']) && $input['seriale'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':reparto', $input['reparto'] ?? null, isset($input['reparto']) && $input['reparto'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':stato', (string) $input['stato'], PDO::PARAM_STR);
        $stmt->bindValue(':capacita_oraria', $input['capacita_oraria'] ?? null, isset($input['capacita_oraria']) && $input['capacita_oraria'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':data_installazione', $input['data_installazione'] ?? null, isset($input['data_installazione']) && $input['data_installazione'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':data_ultima_manutenzione', $input['data_ultima_manutenzione'] ?? null, isset($input['data_ultima_manutenzione']) && $input['data_ultima_manutenzione'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':data_prossima_manutenzione', $input['data_prossima_manutenzione'] ?? null, isset($input['data_prossima_manutenzione']) && $input['data_prossima_manutenzione'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':note', $input['note'] ?? null, isset($input['note']) && $input['note'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':attiva', !empty($input['attiva']) ? 1 : 0, PDO::PARAM_INT);
        $stmt->execute();

        return $id > 0 ? $id : (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function normalizeMacchinaRow(array $row): array
    {
        return [
            'id_macchina' => (int) ($row['id_macchina'] ?? 0),
            'codice' => (string) ($row['codice'] ?? ''),
            'nome' => (string) ($row['nome'] ?? ''),
            'tipo' => (string) ($row['tipo'] ?? ''),
            'marca' => $row['marca'] ?? null,
            'modello' => $row['modello'] ?? null,
            'seriale' => $row['seriale'] ?? null,
            'reparto' => $row['reparto'] ?? null,
            'stato' => $row['stato'] ?? null,
            'capacita_oraria' => isset($row['capacita_oraria']) ? (float) $row['capacita_oraria'] : null,
            'data_installazione' => $row['data_installazione'] ?? null,
            'data_ultima_manutenzione' => $row['data_ultima_manutenzione'] ?? null,
            'data_prossima_manutenzione' => $row['data_prossima_manutenzione'] ?? null,
            'note' => $row['note'] ?? null,
            'attiva' => (int) ($row['attiva'] ?? 0),
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }
}
