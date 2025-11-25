<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use DateTimeImmutable;
use PDO;
use RuntimeException;

final class FattureRepository
{
    private bool $recalcProcedureEnsured = false;

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

    /**
     * @return list<array<string,mixed>>
     */
    public function listLatest(int $limit = 200): array
    {
        $limit = max(1, min($limit, 500));
        $sql = <<<'SQL'
            SELECT
                f.id_fattura,
                f.id_anagrafica,
                f.anno,
                f.numero_documento,
                f.data_fattura,
                f.id_sezionale,
                f.totale_imponibile,
                f.totale_iva,
                f.totale,
                f.saldo,
                f.note,
                f.id_stato_fatt,
                sf.label AS stato_label,
                sz.code AS sezionale_code,
                sz.descrizione AS sezionale_label,
                a.ragione_sociale AS cliente_ragione_sociale,
                f.created_at,
                f.updated_at
            FROM tb_fatture f
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            LEFT JOIN cfg_sezionali sz ON sz.id_sezionale = f.id_sezionale
            ORDER BY COALESCE(f.data_fattura, f.created_at) DESC, f.id_fattura DESC
            LIMIT :limit
        SQL;

        $sql = str_replace(':limit', (string) $limit, $sql);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_fattura' => (int) $row['id_fattura'],
                'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
                'anno' => isset($row['anno']) ? (int) $row['anno'] : null,
                'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
                'data_fattura' => $row['data_fattura'] ?? null,
                'id_sezionale' => isset($row['id_sezionale']) ? (int) $row['id_sezionale'] : null,
                'totale_imponibile' => isset($row['totale_imponibile']) ? (float) $row['totale_imponibile'] : null,
                'totale_iva' => isset($row['totale_iva']) ? (float) $row['totale_iva'] : null,
                'totale' => isset($row['totale']) ? (float) $row['totale'] : null,
                'saldo' => isset($row['saldo']) ? (float) $row['saldo'] : null,
                'note' => $row['note'] ?? null,
                'id_stato_fatt' => isset($row['id_stato_fatt']) ? (int) $row['id_stato_fatt'] : null,
                'stato_label' => $row['stato_label'] ?? null,
                'sezionale_code' => $row['sezionale_code'] ?? null,
                'sezionale_label' => $row['sezionale_label'] ?? null,
                'cliente_ragione_sociale' => $row['cliente_ragione_sociale'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'updated_at' => $row['updated_at'] ?? null,
            ];
        }

        return $items;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function fetchDetail(int $id): ?array
    {
        $sql = <<<'SQL'
            SELECT
                f.id_fattura,
                f.id_anagrafica,
                f.anno,
                f.numero_documento,
                f.data_fattura,
                f.id_sezionale,
                f.note,
                f.totale_imponibile,
                f.totale_sconto,
                f.totale_iva,
                f.totale,
                f.saldo,
                f.created_at,
                f.updated_at,
                f.id_stato_fatt,
                f.id_sdi_tipo_documento,
                f.id_sdi_esigibilita,
                f.id_sdi_modalita,
                sf.label AS stato_label,
                sz.code AS sezionale_code,
                sz.descrizione AS sezionale_label,
                td.code AS sdi_td_code,
                es.code AS sdi_esig_code,
                mp.code AS sdi_mp_code,
                a.ragione_sociale AS cliente_ragione_sociale,
                a.piva AS cliente_piva,
                a.codice_fiscale AS cliente_codice_fiscale,
                af.pec AS cliente_pec,
                af.codice_sdi AS cliente_codice_sdi,
                af.iban AS cliente_iban,
                af.banca AS cliente_banca,
                af.id_cond_pagamento AS cliente_id_cond_pagamento,
                af.modalita_pagamento AS cliente_modalita_pagamento,
                af.giorni_pagamento AS cliente_giorni_pagamento,
                af.altri_dati AS cliente_altri_dati,
                s.indirizzo AS cliente_indirizzo,
                s.civico AS cliente_civico,
                s.cap AS cliente_cap,
                s.comune AS cliente_comune,
                s.provincia AS cliente_provincia,
                s.nazione_iso2 AS cliente_nazione
            FROM tb_fatture f
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            LEFT JOIN cfg_sezionali sz ON sz.id_sezionale = f.id_sezionale
            LEFT JOIN cfg_sdi_tipo_documento td ON td.id_tipo = f.id_sdi_tipo_documento
            LEFT JOIN cfg_sdi_esigibilita_iva es ON es.id_esig = f.id_sdi_esigibilita
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = f.id_sdi_modalita
            LEFT JOIN tb_sedi s ON s.id_anagrafica = a.id_anagrafica AND s.is_legale = 1
            LEFT JOIN tb_anagrafiche_fiscali af ON af.id_anagrafica = a.id_anagrafica
            WHERE f.id_fattura = :id
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
            'id_fattura' => (int) $row['id_fattura'],
            'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
            'anno' => isset($row['anno']) ? (int) $row['anno'] : null,
            'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
            'data_fattura' => $row['data_fattura'] ?? null,
            'id_sezionale' => isset($row['id_sezionale']) ? (int) $row['id_sezionale'] : null,
            'note' => $row['note'] ?? null,
            'totale_imponibile' => isset($row['totale_imponibile']) ? (float) $row['totale_imponibile'] : null,
            'totale_sconto' => isset($row['totale_sconto']) ? (float) $row['totale_sconto'] : null,
            'totale_iva' => isset($row['totale_iva']) ? (float) $row['totale_iva'] : null,
            'totale' => isset($row['totale']) ? (float) $row['totale'] : null,
            'saldo' => isset($row['saldo']) ? (float) $row['saldo'] : null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'stato_label' => $row['stato_label'] ?? null,
            'id_stato_fatt' => isset($row['id_stato_fatt']) ? (int) $row['id_stato_fatt'] : null,
            'id_sdi_tipo_documento' => isset($row['id_sdi_tipo_documento']) ? (int) $row['id_sdi_tipo_documento'] : null,
            'id_sdi_esigibilita' => isset($row['id_sdi_esigibilita']) ? (int) $row['id_sdi_esigibilita'] : null,
            'id_sdi_modalita' => isset($row['id_sdi_modalita']) ? (int) $row['id_sdi_modalita'] : null,
            'sezionale_code' => $row['sezionale_code'] ?? null,
            'sezionale_label' => $row['sezionale_label'] ?? null,
            'sdi_td_code' => $row['sdi_td_code'] ?? null,
            'sdi_esig_code' => $row['sdi_esig_code'] ?? null,
            'sdi_mp_code' => $row['sdi_mp_code'] ?? null,
            'cliente_ragione_sociale' => $row['cliente_ragione_sociale'] ?? null,
            'cliente_piva' => $row['cliente_piva'] ?? null,
            'cliente_codice_fiscale' => $row['cliente_codice_fiscale'] ?? null,
            'cliente_pec' => $row['cliente_pec'] ?? null,
            'cliente_codice_sdi' => $row['cliente_codice_sdi'] ?? null,
            'cliente_iban' => $row['cliente_iban'] ?? null,
            'cliente_banca' => $row['cliente_banca'] ?? null,
            'cliente_id_cond_pagamento' => isset($row['cliente_id_cond_pagamento']) ? (int) $row['cliente_id_cond_pagamento'] : null,
            'cliente_modalita_pagamento' => $row['cliente_modalita_pagamento'] ?? null,
            'cliente_giorni_pagamento' => isset($row['cliente_giorni_pagamento']) ? (int) $row['cliente_giorni_pagamento'] : null,
            'cliente_altri_dati' => $row['cliente_altri_dati'] ?? null,
            'cliente_indirizzo' => $row['cliente_indirizzo'] ?? null,
            'cliente_civico' => $row['cliente_civico'] ?? null,
            'cliente_cap' => $row['cliente_cap'] ?? null,
            'cliente_comune' => $row['cliente_comune'] ?? null,
            'cliente_provincia' => $row['cliente_provincia'] ?? null,
            'cliente_nazione' => $row['cliente_nazione'] ?? null,
            'righe' => $this->getLines($id),
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function getLines(int $id): array
    {
        $sql = <<<'SQL'
            SELECT
                r.id_riga,
                r.id_prodotto,
                r.descrizione,
                r.quantita,
                r.aliquota_iva,
                r.prezzo_unitario,
                r.sconto,
                r.importo_scontato,
                r.iva,
                r.id_sdi_natura_iva,
                n.code AS sdi_natura_code,
                r.totale,
                r.posizione
            FROM tb_fatture_righe r
            LEFT JOIN cfg_sdi_natura_iva n ON n.id_natura = r.id_sdi_natura_iva
            WHERE r.id_fattura = :id
            ORDER BY COALESCE(r.posizione, r.id_riga) ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_riga' => (int) $row['id_riga'],
                'id_prodotto' => isset($row['id_prodotto']) ? (int) $row['id_prodotto'] : null,
                'descrizione' => $row['descrizione'] ?? '',
                'quantita' => isset($row['quantita']) ? (float) $row['quantita'] : 0.0,
                'aliquota_iva' => isset($row['aliquota_iva']) ? (float) $row['aliquota_iva'] : null,
                'prezzo_unitario' => isset($row['prezzo_unitario']) ? (float) $row['prezzo_unitario'] : null,
                'sconto' => isset($row['sconto']) ? (float) $row['sconto'] : null,
                'importo_scontato' => isset($row['importo_scontato']) ? (float) $row['importo_scontato'] : null,
                'iva' => isset($row['iva']) ? (float) $row['iva'] : null,
                'id_sdi_natura_iva' => isset($row['id_sdi_natura_iva']) ? (int) $row['id_sdi_natura_iva'] : null,
                'sdi_natura_code' => $row['sdi_natura_code'] ?? null,
                'totale' => isset($row['totale']) ? (float) $row['totale'] : null,
                'posizione' => isset($row['posizione']) ? (int) $row['posizione'] : null,
            ];
        }

        return $items;
    }

    /**
     * @return list<array{id_sezionale:int,code:string,label:string}>
     */
    public function listSezionali(): array
    {
        $stmt = $this->pdo->query('SELECT id_sezionale, code, descrizione, ambito FROM cfg_sezionali WHERE attivo = 1 ORDER BY descrizione ASC, id_sezionale ASC');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_sezionale' => (int) $row['id_sezionale'],
                'code' => (string) ($row['code'] ?? ''),
                'label' => (string) ($row['descrizione'] ?? $row['code'] ?? ''),
                'ambito' => (string) ($row['ambito'] ?? ''),
            ];
        }
        return $items;
    }

    /**
     * @return list<array{id_tipo:int,code:string,label:string}>
     */
    public function listTipi(): array
    {
        $stmt = $this->pdo->query('SELECT id_tipo, code, label FROM cfg_tipi_fattura WHERE attivo = 1 ORDER BY id_tipo ASC');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_tipo' => (int) $row['id_tipo'],
                'code' => (string) ($row['code'] ?? ''),
                'label' => (string) ($row['label'] ?? ''),
            ];
        }
        return $items;
    }

    /**
     * @return list<array{id_stato:int,code:string,label:string}>
     */
    public function listStati(): array
    {
        $stmt = $this->pdo->query('SELECT id_stato, code, label FROM cfg_stati_fattura WHERE attivo = 1 ORDER BY ordering ASC, id_stato ASC');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_stato' => (int) $row['id_stato'],
                'code' => (string) ($row['code'] ?? ''),
                'label' => (string) ($row['label'] ?? ''),
            ];
        }
        return $items;
    }

    /**
     * @return list<array{id_metodo:int,code:string,label:string,attivo:bool}>
     */
    public function listMetodiPagamento(): array
    {
        $stmt = $this->pdo->query('SELECT id_metodo, code, label, attivo FROM cfg_metodi_pagamento ORDER BY label ASC, id_metodo ASC');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_metodo' => (int) $row['id_metodo'],
                'code' => (string) ($row['code'] ?? ''),
                'label' => (string) ($row['label'] ?? ''),
                'attivo' => ((int) ($row['attivo'] ?? 0)) === 1,
            ];
        }
        return $items;
    }

    /**
     * @return list<array{id_modalita:int,code:string,label:string,attivo:bool}>
     */
    public function listModalitaPagamento(): array
    {
        $stmt = $this->pdo->query('SELECT id_modalita, code, label, attivo FROM cfg_sdi_modalita_pagamento ORDER BY code ASC, id_modalita ASC');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_modalita' => (int) $row['id_modalita'],
                'code' => (string) ($row['code'] ?? ''),
                'label' => (string) ($row['label'] ?? ''),
                'attivo' => ((int) ($row['attivo'] ?? 0)) === 1,
            ];
        }
        return $items;
    }

    private function normalizeDate(?string $raw): DateTimeImmutable
    {
        if ($raw !== null && trim($raw) !== '') {
            try {
                return new DateTimeImmutable($raw);
            } catch (\Throwable $exception) {
                throw new RuntimeException('Data fattura non valida.', 422);
            }
        }

        return new DateTimeImmutable('today');
    }

    /**
     * @param array<string,mixed> $data
     * @param list<array<string,mixed>> $righe
     * @return array<string,mixed>
     */
    public function createFromPreventivo(array $data, array $righe): array
    {
        $idAnagrafica = isset($data['id_anagrafica']) ? (int) $data['id_anagrafica'] : 0;
        $idSezionale = isset($data['id_sezionale']) ? (int) $data['id_sezionale'] : 0;
        $idTipoFatt = isset($data['id_tipo_fatt']) ? (int) $data['id_tipo_fatt'] : 0;
        $idStatoFatt = isset($data['id_stato_fatt']) ? (int) $data['id_stato_fatt'] : 0;

        if ($idAnagrafica <= 0) {
            throw new RuntimeException('Anagrafica non valida per la fattura.', 422);
        }
        if ($idSezionale <= 0) {
            throw new RuntimeException('Sezionale fattura mancante o non valido.', 422);
        }
        if (empty($righe)) {
            throw new RuntimeException('Non ci sono righe da importare nella fattura.', 422);
        }
        if ($idTipoFatt <= 0) {
            $idTipoFatt = 2;
        }
        if ($idStatoFatt <= 0) {
            $idStatoFatt = 2;
        }

        $date = $this->normalizeDate(isset($data['data_fattura']) ? (string) $data['data_fattura'] : null);
        $dateValue = $date->format('Y-m-d');
        $note = isset($data['note']) ? trim((string) $data['note']) : null;
        $totImponibile = isset($data['totale_imponibile']) ? (float) $data['totale_imponibile'] : 0.0;
        $totSconto = isset($data['totale_sconto']) ? (float) $data['totale_sconto'] : 0.0;
        $totIva = isset($data['totale_iva']) ? (float) $data['totale_iva'] : 0.0;
        $totale = isset($data['totale']) ? (float) $data['totale'] : 0.0;
        $saldo = isset($data['saldo']) ? (float) $data['saldo'] : $totale;
        $idPreventivo = isset($data['id_preventivo']) ? (int) $data['id_preventivo'] : 0;

        $this->ensureRecalcProcedureExists();
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO tb_fatture (
                    id_sezionale,
                    id_serie,
                    id_anagrafica,
                    anno,
                    numero_documento,
                    data_fattura,
                    id_tipo_fatt,
                    totale_imponibile,
                    totale_sconto,
                    totale_iva,
                    totale,
                    saldo,
                    id_stato_fatt,
                    id_sdi_tipo_documento,
                    id_sdi_esigibilita,
                    id_sdi_modalita,
                    note,
                    created_at,
                    updated_at
                ) VALUES (
                    :id_sezionale,
                    NULL,
                    :id_anagrafica,
                    0,
                    NULL,
                    :data_fattura,
                    :id_tipo_fatt,
                    :totale_imponibile,
                    :totale_sconto,
                    :totale_iva,
                    :totale,
                    :saldo,
                    :id_stato_fatt,
                    NULL,
                    NULL,
                    NULL,
                    :note,
                    NOW(),
                    NOW()
                )'
            );
            $stmt->bindValue(':id_sezionale', $idSezionale, PDO::PARAM_INT);
            $stmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
            $stmt->bindValue(':data_fattura', $dateValue, PDO::PARAM_STR);
            $stmt->bindValue(':id_tipo_fatt', $idTipoFatt, PDO::PARAM_INT);
            $stmt->bindValue(':totale_imponibile', $totImponibile, PDO::PARAM_STR);
            $stmt->bindValue(':totale_sconto', $totSconto, PDO::PARAM_STR);
            $stmt->bindValue(':totale_iva', $totIva, PDO::PARAM_STR);
            $stmt->bindValue(':totale', $totale, PDO::PARAM_STR);
            $stmt->bindValue(':saldo', $saldo, PDO::PARAM_STR);
            $stmt->bindValue(':id_stato_fatt', $idStatoFatt, PDO::PARAM_INT);
            $stmt->bindValue(':note', $note !== null && $note !== '' ? $note : null, $note !== null && $note !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->execute();

            $idFattura = (int) $this->pdo->lastInsertId();

            $linesStmt = $this->pdo->prepare(
                'INSERT INTO tb_fatture_righe (
                    id_fattura,
                    id_prodotto,
                    descrizione,
                    quantita,
                    aliquota_iva,
                    prezzo_unitario,
                    sconto,
                    importo_scontato,
                    iva,
                    id_sdi_natura_iva,
                    totale,
                    posizione
                ) VALUES (
                    :id_fattura,
                    :id_prodotto,
                    :descrizione,
                    :quantita,
                    :aliquota_iva,
                    :prezzo_unitario,
                    :sconto,
                    :importo_scontato,
                    :iva,
                    :id_sdi_natura_iva,
                    :totale,
                    :posizione
                )'
            );
            $posizione = 1;
            foreach ($righe as $line) {
                $descrizione = trim((string) ($line['descrizione'] ?? ''));
                if ($descrizione === '') {
                    continue;
                }
                $quantita = isset($line['quantita']) ? (float) $line['quantita'] : 1.0;
                if ($quantita <= 0) {
                    $quantita = 1.0;
                }
                $prezzo = isset($line['prezzo']) ? (float) $line['prezzo'] : (isset($line['prezzo_unitario']) ? (float) $line['prezzo_unitario'] : 0.0);
                $sconto = isset($line['sconto']) ? (float) $line['sconto'] : 0.0;
                $aliquota = isset($line['iva']) ? (float) $line['iva'] : 22.0;
                $idProdotto = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
                $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;

                $imponibile = $quantita * $prezzo;
                if ($sconto > 0) {
                    $imponibile = $imponibile * (1 - ($sconto / 100));
                }
                $imponibile = max(0.0, $imponibile);
                $iva = $aliquota !== null ? $imponibile * ($aliquota / 100) : 0.0;
                $totLine = $imponibile + $iva;

                $linesStmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
                $linesStmt->bindValue(':id_prodotto', $idProdotto, $idProdotto ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $linesStmt->bindValue(':descrizione', $descrizione, PDO::PARAM_STR);
                $linesStmt->bindValue(':quantita', $quantita, PDO::PARAM_STR);
                $linesStmt->bindValue(':aliquota_iva', $aliquota, PDO::PARAM_STR);
                $linesStmt->bindValue(':prezzo_unitario', $prezzo, PDO::PARAM_STR);
                $linesStmt->bindValue(':sconto', $sconto, PDO::PARAM_STR);
                $linesStmt->bindValue(':importo_scontato', $imponibile, PDO::PARAM_STR);
                $linesStmt->bindValue(':iva', $iva, PDO::PARAM_STR);
                $linesStmt->bindValue(':id_sdi_natura_iva', $idNatura, $idNatura ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $linesStmt->bindValue(':totale', $totLine, PDO::PARAM_STR);
                $linesStmt->bindValue(':posizione', $posizione, PDO::PARAM_INT);
                $linesStmt->execute();
                $posizione++;
            }

            if ($idPreventivo > 0) {
                $linkStmt = $this->pdo->prepare(
                    'INSERT INTO appoggio_preventivo_fattura (id_preventivo, id_fattura) VALUES (:id_preventivo, :id_fattura)'
                );
                $linkStmt->bindValue(':id_preventivo', $idPreventivo, PDO::PARAM_INT);
                $linkStmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
                $linkStmt->execute();
            }

            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }

        $detail = $this->fetchDetail($idFattura);
        if ($detail !== null) {
            return $detail;
        }

        return [
            'id_fattura' => $idFattura,
            'id_anagrafica' => $idAnagrafica,
            'totale' => $totale,
            'totale_imponibile' => $totImponibile,
            'totale_iva' => $totIva,
            'saldo' => $saldo,
            'righe' => $this->getLines($idFattura),
        ];
    }

    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function updateDetail(int $id, array $data): array
    {
        if ($id <= 0) {
            throw new RuntimeException('ID fattura non valido.', 422);
        }

        $existing = $this->fetchDetail($id);
        if ($existing === null) {
            throw new RuntimeException('Fattura non trovata.', 404);
        }

        $setClauses = [];
        $params = [':id' => $id];
        $types = [':id' => PDO::PARAM_INT];
        $hasChanges = false;

        if (array_key_exists('data_fattura', $data)) {
            $rawDate = $data['data_fattura'];
            if ($rawDate === null || trim((string) $rawDate) === '') {
                throw new RuntimeException('Specificare una data per la fattura.', 422);
            }
            $date = $this->normalizeDate((string) $rawDate);
            $setClauses[] = 'data_fattura = :data_fattura';
            $params[':data_fattura'] = $date->format('Y-m-d');
            $types[':data_fattura'] = PDO::PARAM_STR;
        }

        if (array_key_exists('note', $data)) {
            $note = $data['note'] !== null ? trim((string) $data['note']) : '';
            if ($note === '') {
                $setClauses[] = 'note = NULL';
            } else {
                $setClauses[] = 'note = :note';
                $params[':note'] = $note;
                $types[':note'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('id_stato_fatt', $data)) {
            $status = (int) $data['id_stato_fatt'];
            if ($status <= 0) {
                throw new RuntimeException('Selezionare uno stato valido per la fattura.', 422);
            }
            $setClauses[] = 'id_stato_fatt = :id_stato_fatt';
            $params[':id_stato_fatt'] = $status;
            $types[':id_stato_fatt'] = PDO::PARAM_INT;
        }

        if (array_key_exists('id_sezionale', $data)) {
            $sezionale = (int) $data['id_sezionale'];
            if ($sezionale <= 0) {
                throw new RuntimeException('Selezionare un sezionale valido per la fattura.', 422);
            }
            $setClauses[] = 'id_sezionale = :id_sezionale';
            $params[':id_sezionale'] = $sezionale;
            $types[':id_sezionale'] = PDO::PARAM_INT;
        }

        if (array_key_exists('saldo', $data)) {
            $rawSaldo = $data['saldo'];
            if ($rawSaldo === null || $rawSaldo === '') {
                $setClauses[] = 'saldo = NULL';
            } else {
                if (!is_numeric($rawSaldo)) {
                    throw new RuntimeException('Saldo fattura non valido.', 422);
                }
                $saldo = (float) $rawSaldo;
                $setClauses[] = 'saldo = :saldo';
                $params[':saldo'] = $saldo;
                $types[':saldo'] = PDO::PARAM_STR;
            }
        }

        if (!empty($setClauses)) {
            $setClauses[] = 'updated_at = NOW()';
            $sql = 'UPDATE tb_fatture SET ' . implode(', ', $setClauses) . ' WHERE id_fattura = :id LIMIT 1';
            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $placeholder => $value) {
                $type = $types[$placeholder] ?? PDO::PARAM_STR;
                if ($value === null) {
                    $stmt->bindValue($placeholder, null, PDO::PARAM_NULL);
                } else {
                    $stmt->bindValue($placeholder, $value, $type);
                }
            }
            $stmt->execute();
            $hasChanges = true;
        }

        if (array_key_exists('righe', $data)) {
            $lines = is_array($data['righe']) ? $data['righe'] : [];
            $this->replaceLines($id, $lines);
            $hasChanges = true;
        }

        if (!$hasChanges) {
            return $existing;
        }

        $updated = $this->fetchDetail($id);
        if ($updated === null) {
            throw new RuntimeException('Impossibile ricaricare i dettagli aggiornati della fattura.', 500);
        }

        return $updated;
    }

    /**
     * @param list<array<string,mixed>> $lines
     */
    public function replaceLines(int $id, array $lines): void
    {
        if ($id <= 0) {
            throw new RuntimeException('ID fattura non valido per l\'aggiornamento delle righe.', 422);
        }

        $normalized = [];
        foreach ($lines as $line) {
            if (!is_array($line)) {
                continue;
            }
            $descrizione = isset($line['descrizione']) ? trim((string) $line['descrizione']) : '';
            if ($descrizione === '') {
                continue;
            }
            $qtyRaw = $line['quantita'] ?? $line['qty'] ?? null;
            $quantita = is_numeric($qtyRaw) ? (float) $qtyRaw : null;
            if ($quantita === null || $quantita <= 0) {
                throw new RuntimeException('La quantita delle righe fattura deve essere maggiore di zero.', 422);
            }
            $prezzoRaw = $line['prezzo_unitario'] ?? $line['prezzo'] ?? null;
            if (!is_numeric($prezzoRaw)) {
                throw new RuntimeException('Il prezzo unitario delle righe fattura non è valido.', 422);
            }
            $prezzo = (float) $prezzoRaw;

            $sconto = null;
            if (array_key_exists('sconto', $line) || array_key_exists('discount', $line)) {
                $scontoRaw = $line['sconto'] ?? $line['discount'];
                if ($scontoRaw !== null && $scontoRaw !== '') {
                    if (!is_numeric($scontoRaw)) {
                        throw new RuntimeException('Lo sconto delle righe fattura deve essere numerico.', 422);
                    }
                    $sconto = (float) $scontoRaw;
                    if ($sconto < 0 || $sconto > 100) {
                        throw new RuntimeException('Lo sconto delle righe fattura deve essere tra 0 e 100.', 422);
                    }
                }
            }

            $aliquota = null;
            if (array_key_exists('aliquota_iva', $line) || array_key_exists('iva', $line)) {
                $aliquotaRaw = $line['aliquota_iva'] ?? $line['iva'];
                if ($aliquotaRaw !== null && $aliquotaRaw !== '') {
                    if (!is_numeric($aliquotaRaw)) {
                        throw new RuntimeException('Aliquota IVA non valida per la riga fattura.', 422);
                    }
                    $aliquota = (float) $aliquotaRaw;
                    if ($aliquota < 0 || $aliquota > 100) {
                        throw new RuntimeException('Aliquota IVA fuori dall\'intervallo consentito (0-100).', 422);
                    }
                }
            }
            if ($aliquota === null) {
                $aliquota = 22.0;
            }

            $idProdotto = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
            if ($idProdotto !== null && $idProdotto <= 0) {
                $idProdotto = null;
            }
            $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;
            if ($idNatura !== null && $idNatura <= 0) {
                $idNatura = null;
            }

            $lordo = $quantita * $prezzo;
            $scontoValore = 0.0;
            if ($sconto !== null && $sconto > 0) {
                $scontoValore = $lordo * ($sconto / 100);
            }
            $imponibile = max(0.0, $lordo - $scontoValore);
            $iva = $aliquota !== null ? $imponibile * ($aliquota / 100) : 0.0;
            $totale = $imponibile + $iva;

            $normalized[] = [
                'id_prodotto' => $idProdotto,
                'descrizione' => $descrizione,
                'quantita' => $quantita,
                'prezzo_unitario' => $prezzo,
                'sconto' => $sconto,
                'importo_scontato' => $imponibile,
                'aliquota_iva' => $aliquota,
                'iva' => $iva,
                'id_sdi_natura_iva' => $idNatura,
                'totale' => $totale,
            ];
        }

        if (empty($normalized)) {
            throw new RuntimeException('Inserire almeno una riga valida per la fattura.', 422);
        }

        $this->ensureRecalcProcedureExists();
        $this->pdo->beginTransaction();
        try {
            $del = $this->pdo->prepare('DELETE FROM tb_fatture_righe WHERE id_fattura = :id');
            $del->bindValue(':id', $id, PDO::PARAM_INT);
            $del->execute();

            $stmt = $this->pdo->prepare(
                'INSERT INTO tb_fatture_righe (
                    id_fattura,
                    id_prodotto,
                    descrizione,
                    quantita,
                    aliquota_iva,
                    prezzo_unitario,
                    sconto,
                    importo_scontato,
                    iva,
                    id_sdi_natura_iva,
                    totale,
                    posizione
                ) VALUES (
                    :id_fattura,
                    :id_prodotto,
                    :descrizione,
                    :quantita,
                    :aliquota_iva,
                    :prezzo_unitario,
                    :sconto,
                    :importo_scontato,
                    :iva,
                    :id_sdi_natura_iva,
                    :totale,
                    :posizione
                )'
            );

            $posizione = 1;
            foreach ($normalized as $line) {
                $stmt->bindValue(':id_fattura', $id, PDO::PARAM_INT);
                $stmt->bindValue(':id_prodotto', $line['id_prodotto'], $line['id_prodotto'] ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $stmt->bindValue(':descrizione', $line['descrizione'], PDO::PARAM_STR);
                $stmt->bindValue(':quantita', $line['quantita'], PDO::PARAM_STR);
                $stmt->bindValue(':aliquota_iva', $line['aliquota_iva'], PDO::PARAM_STR);
                $stmt->bindValue(':prezzo_unitario', $line['prezzo_unitario'], PDO::PARAM_STR);
                if ($line['sconto'] !== null) {
                    $stmt->bindValue(':sconto', $line['sconto'], PDO::PARAM_STR);
                } else {
                    $stmt->bindValue(':sconto', null, PDO::PARAM_NULL);
                }
                $stmt->bindValue(':importo_scontato', $line['importo_scontato'], PDO::PARAM_STR);
                $stmt->bindValue(':iva', $line['iva'], PDO::PARAM_STR);
                if ($line['id_sdi_natura_iva'] !== null) {
                    $stmt->bindValue(':id_sdi_natura_iva', $line['id_sdi_natura_iva'], PDO::PARAM_INT);
                } else {
                    $stmt->bindValue(':id_sdi_natura_iva', null, PDO::PARAM_NULL);
                }
                $stmt->bindValue(':totale', $line['totale'], PDO::PARAM_STR);
                $stmt->bindValue(':posizione', $posizione, PDO::PARAM_INT);
                $stmt->execute();
                $posizione++;
            }

            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    /**
     * @return array{items:list<array<string,mixed>>,totale_pagato:float,totale_documento:float,saldo_residuo:float}
     */
    public function listPagamenti(int $idFattura): array
    {
        if ($idFattura <= 0) {
            throw new RuntimeException('ID fattura non valido per i pagamenti.', 422);
        }

        $invoiceStmt = $this->pdo->prepare('SELECT id_fattura, totale FROM tb_fatture WHERE id_fattura = :id LIMIT 1');
        $invoiceStmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $invoiceStmt->execute();
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        if ($invoice === false) {
            throw new RuntimeException('Fattura non trovata per i pagamenti.', 404);
        }
        $totaleDocumento = isset($invoice['totale']) ? (float) $invoice['totale'] : 0.0;

        $stmt = $this->pdo->prepare(
            'SELECT
                p.id_pag_fattura,
                p.id_fattura,
                p.id_metodo,
                p.data_pagamento,
                p.importo,
                p.importo_documento,
                p.import_uid,
                p.id_mp,
                p.note,
                m.code AS metodo_code,
                m.label AS metodo_label,
                mp.code AS mp_code,
                mp.label AS mp_label
            FROM appoggio_pagamenti_fattura p
            LEFT JOIN cfg_metodi_pagamento m ON m.id_metodo = p.id_metodo
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = p.id_mp
            WHERE p.id_fattura = :id
            ORDER BY COALESCE(p.data_pagamento, p.id_pag_fattura) DESC, p.id_pag_fattura DESC'
        );
        $stmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        $totalePagato = 0.0;
        foreach ($rows as $row) {
            $mapped = $this->mapPagamentoRow($row);
            $items[] = $mapped;
            if ($mapped['importo'] !== null) {
                $totalePagato += (float) $mapped['importo'];
            }
        }

        $residuo = $totaleDocumento - $totalePagato;
        if ($residuo < 0) {
            $residuo = 0.0;
        }

        return [
            'items' => $items,
            'totale_pagato' => $totalePagato,
            'totale_documento' => $totaleDocumento,
            'saldo_residuo' => $residuo,
        ];
    }

    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function savePagamento(array $data): array
    {
        $idFattura = isset($data['id_fattura']) ? (int) $data['id_fattura'] : 0;
        if ($idFattura <= 0) {
            throw new RuntimeException('ID fattura mancante per la registrazione del pagamento.', 422);
        }

        $fatturaStmt = $this->pdo->prepare('SELECT id_fattura FROM tb_fatture WHERE id_fattura = :id LIMIT 1');
        $fatturaStmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $fatturaStmt->execute();
        if ($fatturaStmt->fetch(PDO::FETCH_ASSOC) === false) {
            throw new RuntimeException('Fattura non trovata per la registrazione del pagamento.', 404);
        }

        $idPagamento = isset($data['id_pagamento']) ? (int) $data['id_pagamento'] : (isset($data['id_pag_fattura']) ? (int) $data['id_pag_fattura'] : 0);
        $importoRaw = $data['importo'] ?? null;
        if (!is_numeric($importoRaw)) {
            throw new RuntimeException('Specificare un importo valido per il pagamento.', 422);
        }
        $importo = round((float) $importoRaw, 2);
        if ($importo <= 0) {
            throw new RuntimeException('L\'importo del pagamento deve essere maggiore di zero.', 422);
        }
        $hasImportoDocumento = array_key_exists('importo_documento', $data);
        $importoDocumentoRaw = $data['importo_documento'] ?? null;
        $importoDocumento = null;
        if (is_numeric($importoDocumentoRaw)) {
            $importoDocumento = round((float) $importoDocumentoRaw, 2);
        }
        if ($importoDocumento !== null && $importoDocumento <= 0) {
            $importoDocumento = null;
        }
        $hasImportUid = array_key_exists('import_uid', $data);

        $idMetodo = isset($data['id_metodo']) ? (int) $data['id_metodo'] : null;
        if ($idMetodo !== null && $idMetodo <= 0) {
            $idMetodo = null;
        }
        $idModalita = isset($data['id_mp']) ? (int) $data['id_mp'] : 0;
        if ($idModalita <= 0) {
            throw new RuntimeException('Selezionare una modalità di pagamento SdI valida.', 422);
        }

        $date = $this->normalizeDate(isset($data['data_pagamento']) ? (string) $data['data_pagamento'] : null);
        $dateValue = $date->format('Y-m-d');
        $note = isset($data['note']) ? trim((string) $data['note']) : null;
        if ($note === '') {
            $note = null;
        }
        $importUid = isset($data['import_uid']) ? trim((string) $data['import_uid']) : null;
        if ($importUid === '') {
            $importUid = null;
        }

        $pendingPayment = null;
        $pendingPaymentId = null;
        if ($idPagamento > 0) {
            $pendingPayment = $this->fetchPendingPaymentById($idPagamento);
        }

        if ($pendingPayment !== null) {
            $pendingPaymentId = (int) $pendingPayment['id_pagamento'];
            $availableResiduo = round(((float) $pendingPayment['importo_totale']) - ((float) $pendingPayment['importo_allocato']), 2);
            if ($importo - $availableResiduo > 0.009) {
                throw new RuntimeException('L\'importo supera il residuo disponibile per questo pagamento.', 422);
            }
            $idMetodo = isset($pendingPayment['id_metodo']) ? (int) $pendingPayment['id_metodo'] : null;
            $idModalita = (int) $pendingPayment['id_mp'];
            $dateValue = $pendingPayment['data_pagamento'] ?? $dateValue;
            $note = $pendingPayment['note'] ?? $note;
            $importUid = $pendingPayment['import_uid'] ?? $importUid;
            $importoDocumento = (float) $pendingPayment['importo_totale'];
            $hasImportoDocumento = true;
            $idPagamento = 0;
        }

        $this->ensureRecalcProcedureExists();
        if ($idPagamento > 0) {
            $existing = $this->fetchPagamento($idFattura, $idPagamento);
            if ($existing === null) {
                throw new RuntimeException('Pagamento non trovato per questa fattura.', 404);
            }
            if (!$hasImportoDocumento && isset($existing['importo_documento'])) {
                $importoDocumento = (float) $existing['importo_documento'];
            }
            if (!$hasImportUid && isset($existing['import_uid']) && $existing['import_uid'] !== null) {
                $importUid = (string) $existing['import_uid'];
            }
            $stmt = $this->pdo->prepare(
                'UPDATE appoggio_pagamenti_fattura
                 SET id_metodo = :id_metodo,
                     data_pagamento = :data_pagamento,
                     importo = :importo,
                     importo_documento = :importo_documento,
                     import_uid = :import_uid,
                     id_mp = :id_mp,
                     note = :note
                 WHERE id_pag_fattura = :id_pagamento AND id_fattura = :id_fattura
                 LIMIT 1'
            );
            $stmt->bindValue(':id_pagamento', $idPagamento, PDO::PARAM_INT);
        } else {
            $stmt = $this->pdo->prepare(
                'INSERT INTO appoggio_pagamenti_fattura (id_fattura, id_metodo, data_pagamento, importo, importo_documento, import_uid, id_mp, note, id_pagamento)
                 VALUES (:id_fattura, :id_metodo, :data_pagamento, :importo, :importo_documento, :import_uid, :id_mp, :note, :id_pagamento_master)'
            );
        }

        if ($importoDocumento === null) {
            $importoDocumento = $importo;
        }

        $stmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
        if ($idMetodo !== null) {
            $stmt->bindValue(':id_metodo', $idMetodo, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_metodo', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':data_pagamento', $dateValue, PDO::PARAM_STR);
        $stmt->bindValue(':importo', number_format($importo, 2, '.', ''), PDO::PARAM_STR);
        if ($importoDocumento !== null) {
            $stmt->bindValue(':importo_documento', number_format($importoDocumento, 2, '.', ''), PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':importo_documento', null, PDO::PARAM_NULL);
        }
        if ($importUid !== null) {
            $stmt->bindValue(':import_uid', $importUid, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':import_uid', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':id_mp', $idModalita, PDO::PARAM_INT);
        if ($note !== null) {
            $stmt->bindValue(':note', $note, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':note', null, PDO::PARAM_NULL);
        }
        if ($pendingPaymentId !== null) {
            $stmt->bindValue(':id_pagamento_master', $pendingPaymentId, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_pagamento_master', null, PDO::PARAM_NULL);
        }
        $stmt->execute();

        if ($idPagamento <= 0) {
            $idPagamento = (int) $this->pdo->lastInsertId();
        }

        if ($pendingPaymentId !== null) {
            $this->linkPendingPayment($pendingPaymentId, $idFattura, $idPagamento, $importo);
        }

        $this->updateSaldoFromPayments($idFattura);
        $payment = $this->fetchPagamento($idFattura, $idPagamento);
        if ($payment === null) {
            throw new RuntimeException('Impossibile ricaricare il pagamento appena registrato.', 500);
        }

        return $payment;
    }

    private function linkPendingPayment(int $idPagamento, int $idFattura, ?int $idAppoggio, float $importo): void
    {
        $stmt = $this->pdo->prepare('UPDATE tb_pagamenti SET importo_allocato = GREATEST(0, importo_allocato + :importo), updated_at = NOW() WHERE id_pagamento = :id');
        $stmt->bindValue(':importo', number_format($importo, 2, '.', ''), PDO::PARAM_STR);
        $stmt->bindValue(':id', $idPagamento, PDO::PARAM_INT);
        $stmt->execute();

        if ($idAppoggio !== null && $idAppoggio > 0) {
            $linkStmt = $this->pdo->prepare(
                'UPDATE appoggio_pagamenti_fattura SET id_pagamento = :id_pagamento WHERE id_pag_fattura = :id_pag_fattura LIMIT 1'
            );
            $linkStmt->bindValue(':id_pagamento', $idPagamento, PDO::PARAM_INT);
            $linkStmt->bindValue(':id_pag_fattura', $idAppoggio, PDO::PARAM_INT);
            $linkStmt->execute();
        }
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchPendingPaymentById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT
                id_pagamento,
                import_uid,
                data_pagamento,
                importo_totale,
                importo_allocato,
                id_metodo,
                id_mp,
                note
             FROM tb_pagamenti
             WHERE id_pagamento = :id
             LIMIT 1'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return [
            'id_pagamento' => (int) $row['id_pagamento'],
            'import_uid' => $row['import_uid'] ?? null,
            'data_pagamento' => $row['data_pagamento'] ?? null,
            'importo_totale' => isset($row['importo_totale']) ? (float) $row['importo_totale'] : 0.0,
            'importo_allocato' => isset($row['importo_allocato']) ? (float) $row['importo_allocato'] : 0.0,
            'id_metodo' => isset($row['id_metodo']) ? (int) $row['id_metodo'] : null,
            'id_mp' => isset($row['id_mp']) ? (int) $row['id_mp'] : null,
            'note' => $row['note'] ?? null,
        ];
    }

    public function deletePagamento(int $idFattura, int $idPagamento): void
    {
        if ($idPagamento <= 0) {
            throw new RuntimeException('Parametri non validi per la cancellazione del pagamento.', 422);
        }

        $this->ensureRecalcProcedureExists();

        $stagedStmt = $this->pdo->prepare('SELECT id_pagamento FROM tb_pagamenti WHERE id_pagamento = :id LIMIT 1');
        $stagedStmt->bindValue(':id', $idPagamento, PDO::PARAM_INT);
        $stagedStmt->execute();
        if ($stagedStmt->fetch(PDO::FETCH_ASSOC) !== false) {
            $deleteStaged = $this->pdo->prepare('DELETE FROM tb_pagamenti WHERE id_pagamento = :id LIMIT 1');
            $deleteStaged->bindValue(':id', $idPagamento, PDO::PARAM_INT);
            $deleteStaged->execute();
            if ($deleteStaged->rowCount() === 0) {
                throw new RuntimeException('Pagamento non trovato o già eliminato.', 404);
            }
            return;
        }

        if ($idFattura <= 0) {
            $stmt = $this->pdo->prepare(
                'DELETE FROM appoggio_pagamenti_fattura WHERE id_pag_fattura = :id_pagamento LIMIT 1'
            );
            $stmt->bindValue(':id_pagamento', $idPagamento, PDO::PARAM_INT);
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                throw new RuntimeException('Pagamento non trovato o già eliminato.', 404);
            }
            return;
        }

        $stmt = $this->pdo->prepare(
            'DELETE FROM appoggio_pagamenti_fattura WHERE id_pag_fattura = :id_pagamento AND id_fattura = :id_fattura LIMIT 1'
        );
        $stmt->bindValue(':id_pagamento', $idPagamento, PDO::PARAM_INT);
        $stmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            throw new RuntimeException('Pagamento non trovato o già eliminato.', 404);
        }

        $this->updateSaldoFromPayments($idFattura);
    }

    private function updateSaldoFromPayments(int $idFattura): void
    {
        if ($idFattura <= 0) {
            return;
        }

        $sql = <<<'SQL'
            UPDATE tb_fatture f
            SET
                f.saldo = GREATEST(
                    0,
                    COALESCE(f.totale, 0) - (
                        SELECT COALESCE(SUM(importo), 0)
                        FROM appoggio_pagamenti_fattura p
                        WHERE p.id_fattura = f.id_fattura
                    )
                ),
                f.updated_at = NOW()
            WHERE f.id_fattura = :id
            LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchPagamento(int $idFattura, int $idPagamento): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT
                p.id_pag_fattura,
                p.id_fattura,
                p.id_metodo,
                p.data_pagamento,
                p.importo,
                p.importo_documento,
                p.import_uid,
                p.id_mp,
                p.note,
                m.code AS metodo_code,
                m.label AS metodo_label,
                mp.code AS mp_code,
                mp.label AS mp_label
            FROM appoggio_pagamenti_fattura p
            LEFT JOIN cfg_metodi_pagamento m ON m.id_metodo = p.id_metodo
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = p.id_mp
            WHERE p.id_pag_fattura = :id_pagamento AND p.id_fattura = :id_fattura
            LIMIT 1'
        );
        $stmt->bindValue(':id_pagamento', $idPagamento, PDO::PARAM_INT);
        $stmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return $this->mapPagamentoRow($row);
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function mapPagamentoRow(array $row): array
    {
        return [
            'id_pagamento' => (int) $row['id_pag_fattura'],
            'id_fattura' => (int) $row['id_fattura'],
            'id_metodo' => isset($row['id_metodo']) ? (int) $row['id_metodo'] : null,
            'metodo_code' => $row['metodo_code'] ?? null,
            'metodo_label' => $row['metodo_label'] ?? null,
            'id_mp' => isset($row['id_mp']) ? (int) $row['id_mp'] : null,
            'mp_code' => $row['mp_code'] ?? null,
            'mp_label' => $row['mp_label'] ?? null,
            'data_pagamento' => $row['data_pagamento'] ?? null,
            'importo' => isset($row['importo']) ? (float) $row['importo'] : null,
            'importo_documento' => isset($row['importo_documento']) ? (float) $row['importo_documento'] : null,
            'import_uid' => $row['import_uid'] ?? null,
            'residuo_pagamento' => isset($row['importo_documento'], $row['importo'])
                ? round(((float) $row['importo_documento']) - (float) $row['importo'], 2)
                : null,
            'note' => $row['note'] ?? null,
        ];
    }

    private function ensureRecalcProcedureExists(): void
    {
        if ($this->recalcProcedureEnsured) {
            return;
        }
        try {
            $stmt = $this->pdo->prepare("SHOW PROCEDURE STATUS WHERE Db = DATABASE() AND Name = 'sp_recalc_fattura'");
            if ($stmt) {
                $stmt->execute();
                $exists = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($exists !== false) {
                    $this->recalcProcedureEnsured = true;
                    return;
                }
            }
        } catch (\Throwable $ignored) {
            // continue and try to create procedure anyway
        }

        $sql = <<<'SQL'
            CREATE PROCEDURE sp_recalc_fattura(IN p_id INT)
            BEGIN
              DECLARE v_imponibile DECIMAL(18,2) DEFAULT 0;
              DECLARE v_sconto DECIMAL(18,2) DEFAULT 0;
              DECLARE v_iva DECIMAL(18,2) DEFAULT 0;
              DECLARE v_totale DECIMAL(18,2) DEFAULT 0;

              SELECT
                COALESCE(SUM(importo_scontato), 0),
                COALESCE(SUM((quantita * prezzo_unitario) - importo_scontato), 0),
                COALESCE(SUM(iva), 0),
                COALESCE(SUM(totale), 0)
              INTO
                v_imponibile,
                v_sconto,
                v_iva,
                v_totale
              FROM tb_fatture_righe
              WHERE id_fattura = p_id;

              UPDATE tb_fatture
              SET
                totale_imponibile = v_imponibile,
                totale_sconto = v_sconto,
                totale_iva = v_iva,
                totale = v_totale,
                saldo = CASE WHEN saldo IS NULL THEN v_totale ELSE saldo END,
                updated_at = NOW()
              WHERE id_fattura = p_id;
            END
        SQL;

        try {
            $this->pdo->exec($sql);
            $this->recalcProcedureEnsured = true;
        } catch (\Throwable $ignored) {
            // best effort: se fallisce, i trigger continueranno ad andare in errore; si segnalerà da altre parti.
        }
    }
}
