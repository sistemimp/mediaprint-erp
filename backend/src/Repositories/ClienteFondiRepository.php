<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;
use RuntimeException;
use Throwable;

final class ClienteFondiRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return array{id_fondo:int,id_anagrafica:int,causale_code:string,causale_label:string,saldo_attuale:float}
     */
    public function ensureFondo(int $idAnagrafica, string $causaleCode, string $causaleLabel): array
    {
        if ($idAnagrafica <= 0) {
            throw new RuntimeException('Anagrafica non valida per il fondo cliente.', 422);
        }
        $code = strtoupper(trim($causaleCode));
        if ($code === '') {
            throw new RuntimeException('Causale fondo obbligatoria.', 422);
        }
        $label = trim($causaleLabel);
        if ($label === '') {
            $label = $code;
        }

        $manageTransaction = !$this->pdo->inTransaction();
        if ($manageTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $row = $this->fetchFondoByCode($idAnagrafica, $code, true);
            if ($row !== null) {
                if ($manageTransaction && $this->pdo->inTransaction()) {
                    $this->pdo->commit();
                }
                return $row;
            }

            $ins = $this->pdo->prepare(
                'INSERT INTO tb_cliente_fondi (id_anagrafica, causale_code, causale_label, saldo_attuale, attivo)
                 VALUES (:id_anagrafica, :causale_code, :causale_label, 0, 1)'
            );
            $ins->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
            $ins->bindValue(':causale_code', $code, PDO::PARAM_STR);
            $ins->bindValue(':causale_label', $label, PDO::PARAM_STR);
            $ins->execute();

            $idFondo = (int) $this->pdo->lastInsertId();
            $created = $this->fetchFondoById($idFondo, true);
            if ($created === null) {
                throw new RuntimeException('Impossibile creare il fondo cliente.', 500);
            }
            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }
            return $created;
        } catch (\Throwable $e) {
            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @param array{
     *   id_fattura?:int|null,
     *   id_lavorazione?:int|null,
     *   id_pagamento?:int|null,
     *   riferimento_tipo?:string|null,
     *   riferimento_id?:int|null,
     *   note?:string|null,
     *   created_by?:int|null
     * } $meta
     * @return array{id_movimento:int,saldo_progressivo:float,row_hash:string}
     */
    public function addEntrata(int $idFondo, float $importo, array $meta = []): array
    {
        return $this->addMovimento($idFondo, 'entrata', $importo, $meta);
    }

    /**
     * @param array{
     *   id_fattura?:int|null,
     *   id_lavorazione?:int|null,
     *   id_pagamento?:int|null,
     *   riferimento_tipo?:string|null,
     *   riferimento_id?:int|null,
     *   note?:string|null,
     *   created_by?:int|null
     * } $meta
     * @return array{id_movimento:int,saldo_progressivo:float,row_hash:string}
     */
    public function addUscita(int $idFondo, float $importo, array $meta = []): array
    {
        return $this->addMovimento($idFondo, 'uscita', $importo, $meta);
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listMovimenti(int $idFondo, int $limit = 200): array
    {
        if ($idFondo <= 0) {
            return [];
        }
        $limit = max(1, min($limit, 2000));
        $sql = 'SELECT
                    m.id_movimento, m.id_fondo, m.id_anagrafica, m.tipo_movimento, m.importo, m.saldo_progressivo,
                    m.riferimento_tipo, m.riferimento_id, m.id_fattura, m.id_lavorazione, m.id_pagamento,
                    m.note, m.created_by, m.created_at, m.prev_hash, m.row_hash';
        if ($this->tableExists('tb_fatture_incassi_allocazioni')) {
            $sql .= ',
                    GROUP_CONCAT(a.id_fattura ORDER BY a.id_fattura ASC SEPARATOR \',\') AS fatture_collegate_ids,
                    COUNT(a.id_allocazione) AS fatture_collegate_count';
        }
        $sql .= '
                FROM tb_cliente_fondi_movimenti m';
        if ($this->tableExists('tb_fatture_incassi_allocazioni')) {
            $sql .= '
                LEFT JOIN tb_fatture_incassi_allocazioni a
                    ON a.id_movimento_fondo = m.id_movimento
                    AND a.tipo_fonte = \'fondo\'';
        }
        $sql .= '
                WHERE m.id_fondo = :id_fondo';
        if ($this->tableExists('tb_fatture_incassi_allocazioni')) {
            $sql .= '
                GROUP BY m.id_movimento';
        }
        $sql .= '
                ORDER BY m.id_movimento DESC
                LIMIT ' . $limit;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_fondo', $idFondo, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$row) {
            $idsRaw = isset($row['fatture_collegate_ids']) ? trim((string) $row['fatture_collegate_ids']) : '';
            $row['fatture_collegate_ids'] = $idsRaw;
            $row['fatture_collegate_count'] = isset($row['fatture_collegate_count']) ? (int) $row['fatture_collegate_count'] : 0;
        }
        unset($row);
        return $rows;
    }

    /**
     * @param list<array{id_fattura:int,importo:float|int|string}> $allocazioni
     * @param array{note?:string|null,created_by?:int|null,data_allocazione?:string|null} $meta
     * @return array{id_movimento:int,saldo_progressivo:float,row_hash:string,totale_allocato:float,allocazioni:int}
     */
    public function allocateUscitaToFatture(int $idFondo, array $allocazioni, array $meta = []): array
    {
        if ($idFondo <= 0) {
            throw new RuntimeException('Fondo cliente non valido.', 422);
        }
        if ($allocazioni === []) {
            throw new RuntimeException('Selezionare almeno una fattura da collegare all\'uscita.', 422);
        }

        $normalized = [];
        $totale = 0.0;
        foreach ($allocazioni as $item) {
            $idFattura = isset($item['id_fattura']) ? (int) $item['id_fattura'] : 0;
            $importoRaw = $item['importo'] ?? null;
            if ($idFattura <= 0 || !is_numeric($importoRaw)) {
                throw new RuntimeException('Allocazione fattura non valida.', 422);
            }
            $importo = $this->roundMoney((float) $importoRaw);
            if ($importo <= 0) {
                throw new RuntimeException('Importo allocazione deve essere maggiore di zero.', 422);
            }
            $normalized[] = [
                'id_fattura' => $idFattura,
                'importo' => $importo,
            ];
            $totale += $importo;
        }
        $totale = $this->roundMoney($totale);
        if ($totale <= 0) {
            throw new RuntimeException('Totale allocazione non valido.', 422);
        }

        $dataAllocazione = isset($meta['data_allocazione']) && trim((string) $meta['data_allocazione']) !== ''
            ? trim((string) $meta['data_allocazione'])
            : date('Y-m-d');
        $note = isset($meta['note']) ? trim((string) $meta['note']) : null;
        if ($note === '') {
            $note = null;
        }
        $createdBy = isset($meta['created_by']) ? (int) $meta['created_by'] : null;

        $manageTransaction = !$this->pdo->inTransaction();
        if ($manageTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $fondo = $this->fetchFondoById($idFondo, true);
            if ($fondo === null) {
                throw new RuntimeException('Fondo cliente non trovato.', 404);
            }
            $idAnagrafica = (int) $fondo['id_anagrafica'];

            $verifyStmt = $this->pdo->prepare(
                'SELECT id_fattura, id_anagrafica, totale
                 FROM tb_fatture
                 WHERE id_fattura = :id_fattura
                 LIMIT 1'
            );

            $fattureRepo = new FattureRepository($this->pdo);
            foreach ($normalized as $entry) {
                $verifyStmt->bindValue(':id_fattura', $entry['id_fattura'], PDO::PARAM_INT);
                $verifyStmt->execute();
                $row = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                if ($row === false) {
                    throw new RuntimeException(sprintf('Fattura #%d non trovata.', $entry['id_fattura']), 404);
                }
                if ((int) $row['id_anagrafica'] !== $idAnagrafica) {
                    throw new RuntimeException(
                        sprintf('La fattura #%d non appartiene al cliente del fondo selezionato.', $entry['id_fattura']),
                        422
                    );
                }
            }

            $movimento = $this->addUscita(
                $idFondo,
                $totale,
                [
                    'note' => $note,
                    'created_by' => $createdBy,
                    'riferimento_tipo' => 'fatture',
                    'riferimento_id' => count($normalized) === 1 ? (int) $normalized[0]['id_fattura'] : null,
                    'id_fattura' => count($normalized) === 1 ? (int) $normalized[0]['id_fattura'] : null,
                ]
            );
            $idMovimento = (int) $movimento['id_movimento'];

            $allocStmt = $this->pdo->prepare(
                'INSERT INTO tb_fatture_incassi_allocazioni
                 (id_fattura, id_pagamento, id_movimento_fondo, tipo_fonte, importo, data_allocazione, note, created_by)
                 VALUES
                 (:id_fattura, NULL, :id_movimento_fondo, \'fondo\', :importo, :data_allocazione, :note, :created_by)'
            );

            foreach ($normalized as $entry) {
                $allocStmt->bindValue(':id_fattura', $entry['id_fattura'], PDO::PARAM_INT);
                $allocStmt->bindValue(':id_movimento_fondo', $idMovimento, PDO::PARAM_INT);
                $allocStmt->bindValue(':importo', $this->moneyToString($entry['importo']), PDO::PARAM_STR);
                $allocStmt->bindValue(':data_allocazione', $dataAllocazione, PDO::PARAM_STR);
                $allocStmt->bindValue(':note', $note, $note !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $allocStmt->bindValue(':created_by', $createdBy, $createdBy !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $allocStmt->execute();
                $fattureRepo->updateDetail($entry['id_fattura'], ['ricalcola_saldi' => 1]);
            }

            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }

            return [
                'id_movimento' => $idMovimento,
                'saldo_progressivo' => (float) $movimento['saldo_progressivo'],
                'row_hash' => (string) $movimento['row_hash'],
                'totale_allocato' => $totale,
                'allocazioni' => count($normalized),
            ];
        } catch (Throwable $e) {
            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @return array{id_fondo:int,id_anagrafica:int,causale_code:string,causale_label:string,saldo_attuale:float}|null
     */
    public function getFondo(int $idFondo): ?array
    {
        return $this->fetchFondoById($idFondo, false);
    }

    /**
     * @return list<array{id_fondo:int,id_anagrafica:int,ragione_sociale:?string,causale_code:string,causale_label:string,saldo_attuale:float,attivo:bool}>
     */
    public function listFondi(?int $idAnagrafica = null, bool $onlyActive = true): array
    {
        $sql = 'SELECT
                    f.id_fondo,
                    f.id_anagrafica,
                    a.ragione_sociale,
                    f.causale_code,
                    f.causale_label,
                    f.saldo_attuale,
                    f.attivo
                FROM tb_cliente_fondi f
                LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
                WHERE 1=1';
        $params = [];
        if ($idAnagrafica !== null && $idAnagrafica > 0) {
            $sql .= ' AND f.id_anagrafica = :id_anagrafica';
            $params[':id_anagrafica'] = $idAnagrafica;
        }
        if ($onlyActive) {
            $sql .= ' AND f.attivo = 1';
        }
        $sql .= ' ORDER BY a.ragione_sociale ASC, f.causale_label ASC, f.id_fondo ASC';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_INT);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_fondo' => (int) $row['id_fondo'],
                'id_anagrafica' => (int) $row['id_anagrafica'],
                'ragione_sociale' => $row['ragione_sociale'] ?? null,
                'causale_code' => (string) $row['causale_code'],
                'causale_label' => (string) $row['causale_label'],
                'saldo_attuale' => (float) $row['saldo_attuale'],
                'attivo' => ((int) ($row['attivo'] ?? 0)) === 1,
            ];
        }
        return $items;
    }

    /**
     * @param array{
     *   id_fattura?:int|null,
     *   id_lavorazione?:int|null,
     *   id_pagamento?:int|null,
     *   riferimento_tipo?:string|null,
     *   riferimento_id?:int|null,
     *   note?:string|null,
     *   created_by?:int|null
     * } $meta
     * @return array{id_movimento:int,saldo_progressivo:float,row_hash:string}
     */
    private function addMovimento(int $idFondo, string $tipo, float $importo, array $meta): array
    {
        if ($idFondo <= 0) {
            throw new RuntimeException('Fondo cliente non valido.', 422);
        }
        $importo = $this->roundMoney($importo);
        if ($importo <= 0) {
            throw new RuntimeException('Importo movimento deve essere maggiore di zero.', 422);
        }
        if (!in_array($tipo, ['entrata', 'uscita', 'storno'], true)) {
            throw new RuntimeException('Tipo movimento non valido.', 422);
        }

        $manageTransaction = !$this->pdo->inTransaction();
        if ($manageTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $fondo = $this->fetchFondoById($idFondo, true);
            if ($fondo === null) {
                throw new RuntimeException('Fondo cliente non trovato.', 404);
            }
            $saldoCorrente = $this->roundMoney((float) $fondo['saldo_attuale']);
            $saldoNuovo = $saldoCorrente;
            if ($tipo === 'entrata') {
                $saldoNuovo = $this->roundMoney($saldoCorrente + $importo);
            } elseif ($tipo === 'uscita') {
                $saldoNuovo = $this->roundMoney($saldoCorrente - $importo);
                if ($saldoNuovo < -0.009) {
                    throw new RuntimeException('Fondo cliente insufficiente.', 422);
                }
                if ($saldoNuovo < 0) {
                    $saldoNuovo = 0.0;
                }
            }

            $prevHash = $this->fetchLastRowHash($idFondo);
            $payload = [
                'id_fondo' => $idFondo,
                'id_anagrafica' => (int) $fondo['id_anagrafica'],
                'tipo_movimento' => $tipo,
                'importo' => $this->moneyToString($importo),
                'saldo_progressivo' => $this->moneyToString($saldoNuovo),
                'riferimento_tipo' => isset($meta['riferimento_tipo']) ? (string) $meta['riferimento_tipo'] : null,
                'riferimento_id' => isset($meta['riferimento_id']) ? (int) $meta['riferimento_id'] : null,
                'id_fattura' => isset($meta['id_fattura']) ? (int) $meta['id_fattura'] : null,
                'id_lavorazione' => isset($meta['id_lavorazione']) ? (int) $meta['id_lavorazione'] : null,
                'id_pagamento' => isset($meta['id_pagamento']) ? (int) $meta['id_pagamento'] : null,
                'note' => isset($meta['note']) ? trim((string) $meta['note']) : null,
                'created_by' => isset($meta['created_by']) ? (int) $meta['created_by'] : null,
                'prev_hash' => $prevHash,
            ];
            $rowHash = $this->buildRowHash($payload);

            $ins = $this->pdo->prepare(
                'INSERT INTO tb_cliente_fondi_movimenti (
                    id_fondo, id_anagrafica, tipo_movimento, importo, saldo_progressivo,
                    riferimento_tipo, riferimento_id, id_fattura, id_lavorazione, id_pagamento, note, created_by, prev_hash, row_hash
                 ) VALUES (
                    :id_fondo, :id_anagrafica, :tipo_movimento, :importo, :saldo_progressivo,
                    :riferimento_tipo, :riferimento_id, :id_fattura, :id_lavorazione, :id_pagamento, :note, :created_by, :prev_hash, :row_hash
                 )'
            );
            $ins->bindValue(':id_fondo', $payload['id_fondo'], PDO::PARAM_INT);
            $ins->bindValue(':id_anagrafica', $payload['id_anagrafica'], PDO::PARAM_INT);
            $ins->bindValue(':tipo_movimento', $payload['tipo_movimento'], PDO::PARAM_STR);
            $ins->bindValue(':importo', $payload['importo'], PDO::PARAM_STR);
            $ins->bindValue(':saldo_progressivo', $payload['saldo_progressivo'], PDO::PARAM_STR);
            $ins->bindValue(':riferimento_tipo', $payload['riferimento_tipo'], $payload['riferimento_tipo'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $ins->bindValue(':riferimento_id', $payload['riferimento_id'], $payload['riferimento_id'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $ins->bindValue(':id_fattura', $payload['id_fattura'], $payload['id_fattura'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $ins->bindValue(':id_lavorazione', $payload['id_lavorazione'], $payload['id_lavorazione'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $ins->bindValue(':id_pagamento', $payload['id_pagamento'], $payload['id_pagamento'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $ins->bindValue(':note', $payload['note'], $payload['note'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $ins->bindValue(':created_by', $payload['created_by'], $payload['created_by'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $ins->bindValue(':prev_hash', $payload['prev_hash'], $payload['prev_hash'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $ins->bindValue(':row_hash', $rowHash, PDO::PARAM_STR);
            $ins->execute();

            $idMovimento = (int) $this->pdo->lastInsertId();

            $upd = $this->pdo->prepare('UPDATE tb_cliente_fondi SET saldo_attuale = :saldo, updated_at = NOW() WHERE id_fondo = :id_fondo LIMIT 1');
            $upd->bindValue(':saldo', $this->moneyToString($saldoNuovo), PDO::PARAM_STR);
            $upd->bindValue(':id_fondo', $idFondo, PDO::PARAM_INT);
            $upd->execute();

            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }
            return [
                'id_movimento' => $idMovimento,
                'saldo_progressivo' => $saldoNuovo,
                'row_hash' => $rowHash,
            ];
        } catch (\Throwable $e) {
            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @return array{id_fondo:int,id_anagrafica:int,causale_code:string,causale_label:string,saldo_attuale:float}|null
     */
    private function fetchFondoByCode(int $idAnagrafica, string $code, bool $forUpdate): ?array
    {
        $sql = 'SELECT id_fondo, id_anagrafica, causale_code, causale_label, saldo_attuale
                FROM tb_cliente_fondi
                WHERE id_anagrafica = :id_anagrafica AND causale_code = :causale_code
                LIMIT 1';
        if ($forUpdate) {
            $sql .= ' FOR UPDATE';
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
        $stmt->bindValue(':causale_code', $code, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'id_fondo' => (int) $row['id_fondo'],
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'causale_code' => (string) $row['causale_code'],
            'causale_label' => (string) $row['causale_label'],
            'saldo_attuale' => (float) $row['saldo_attuale'],
        ];
    }

    /**
     * @return array{id_fondo:int,id_anagrafica:int,causale_code:string,causale_label:string,saldo_attuale:float}|null
     */
    private function fetchFondoById(int $idFondo, bool $forUpdate): ?array
    {
        $sql = 'SELECT id_fondo, id_anagrafica, causale_code, causale_label, saldo_attuale
                FROM tb_cliente_fondi
                WHERE id_fondo = :id_fondo
                LIMIT 1';
        if ($forUpdate) {
            $sql .= ' FOR UPDATE';
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_fondo', $idFondo, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'id_fondo' => (int) $row['id_fondo'],
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'causale_code' => (string) $row['causale_code'],
            'causale_label' => (string) $row['causale_label'],
            'saldo_attuale' => (float) $row['saldo_attuale'],
        ];
    }

    private function fetchLastRowHash(int $idFondo): ?string
    {
        $stmt = $this->pdo->prepare(
            'SELECT row_hash
             FROM tb_cliente_fondi_movimenti
             WHERE id_fondo = :id_fondo
             ORDER BY id_movimento DESC
             LIMIT 1'
        );
        $stmt->bindValue(':id_fondo', $idFondo, PDO::PARAM_INT);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        if ($value === false) {
            return null;
        }
        $hash = trim((string) $value);
        return $hash !== '' ? $hash : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function buildRowHash(array $payload): string
    {
        $parts = [
            (string) ($payload['id_fondo'] ?? ''),
            (string) ($payload['id_anagrafica'] ?? ''),
            (string) ($payload['tipo_movimento'] ?? ''),
            (string) ($payload['importo'] ?? ''),
            (string) ($payload['saldo_progressivo'] ?? ''),
            (string) ($payload['riferimento_tipo'] ?? ''),
            (string) ($payload['riferimento_id'] ?? ''),
            (string) ($payload['id_fattura'] ?? ''),
            (string) ($payload['id_lavorazione'] ?? ''),
            (string) ($payload['id_pagamento'] ?? ''),
            (string) ($payload['note'] ?? ''),
            (string) ($payload['created_by'] ?? ''),
            (string) ($payload['prev_hash'] ?? ''),
        ];
        return hash('sha256', implode('|', $parts));
    }

    private function roundMoney(float $value): float
    {
        return round($value, 2);
    }

    private function moneyToString(float $value): string
    {
        return number_format($this->roundMoney($value), 2, '.', '');
    }

    private function tableExists(string $tableName): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT 1
             FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = :table
             LIMIT 1'
        );
        $stmt->bindValue(':table', $tableName, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }
}
