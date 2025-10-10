<?php
// backend/src/Repositories/PreventiviRepository.php

namespace MediaPrint\Repo;

use PDO;

final class PreventiviRepository
{
    public function __construct(private PDO $pdo) {}

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
                p.note,
                p.totale_imponibile,
                p.totale_sconto,
                p.totale_iva,
                p.totale,
                sp.code AS stato_code,
                p.created_at,
                p.updated_at
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
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'anno_preventivo' => isset($row['anno_preventivo']) ? (int) $row['anno_preventivo'] : null,
            'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
            'data_preventivo' => $row['data_preventivo'] ?? null,
            'note' => $row['note'] ?? null,
            'totale_imponibile' => isset($row['totale_imponibile']) ? (float) $row['totale_imponibile'] : null,
            'totale_sconto' => isset($row['totale_sconto']) ? (float) $row['totale_sconto'] : null,
            'totale_iva' => isset($row['totale_iva']) ? (float) $row['totale_iva'] : null,
            'totale' => isset($row['totale']) ? (float) $row['totale'] : null,
            'stato_code' => $row['stato_code'] ?? null,
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
