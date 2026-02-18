<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use DateTimeImmutable;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use MediaPrint\Service\PaymentTerms;
use MediaPrint\Repo\ContrattiRepository;
use PDO;
use PDOException;
use RuntimeException;

final class FattureRepository
{
    private bool $recalcProcedureEnsured = false;
    /** @var array<string,int|null> */
    private array $statoIdCache = [];
    private bool $statusLogTableEnsured = false;
    private bool $statusLogTableAvailable = false;
    private bool $preventivoRigheMapEnsured = false;
    private bool $preventivoRigheMapAvailable = false;
    /** @var array<int,string|null> */
    private array $statusLabelCache = [];
    private ?bool $comboKeySupported = null;
    /** @var list<array<string,mixed>>|null */
    private ?array $paymentTerms = null;
    /** @var array<string,int|null> */
    private array $tipoFatturaIdCache = [];
    /** @var array<int,int|null> */
    private array $preventivoLinkCache = [];

    public function __construct(private PDO $pdo) {}

    /**
     * Serie ultimi 12 mesi per fatture:
     * - mese (YYYY-MM), totale (somma importi), pagate (somma importi pagati)
     *
     * @return list<array{mese:string, totale:float, pagate:float}>
     */
    public function fetchMonthlyTotalsLast12(?array $allowedAnagrafiche = null, int $isAcquisto = 0): array
    {
        $allowed = null;
        if (is_array($allowedAnagrafiche)) {
            $allowed = array_values(array_filter(array_map('intval', $allowedAnagrafiche), static fn ($id) => $id > 0));
            if ($allowed === []) {
                return [];
            }
        }

        $expression = $this->getNetRevenueExpression();
        $sql = <<<SQL
            WITH RECURSIVE mesi(ms) AS (
              SELECT DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
              UNION ALL
              SELECT DATE_ADD(ms, INTERVAL 1 MONTH)
              FROM mesi
              WHERE ms < DATE_FORMAT(CURDATE(), '%Y-%m-01')
            )
            SELECT
              DATE_FORMAT(m.ms, '%Y-%m') AS mese,
              COALESCE(SUM({$expression}), 0) AS totale,
              COALESCE(SUM(CASE WHEN sf.code = 'pagata' THEN {$expression} ELSE 0 END), 0) AS pagate
            FROM mesi m
            LEFT JOIN tb_fatture f
              ON f.data_fattura >= m.ms
             AND f.data_fattura <  DATE_ADD(m.ms, INTERVAL 1 MONTH)
             AND f.is_acquisto = :is_acquisto
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
            GROUP BY m.ms
            ORDER BY m.ms
        SQL;
        $params = [':is_acquisto' => $isAcquisto];
        if ($allowed !== null) {
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $key = ':allowed_' . $index;
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $sql = str_replace(
                'AND f.data_fattura <  DATE_ADD(m.ms, INTERVAL 1 MONTH)',
                'AND f.data_fattura <  DATE_ADD(m.ms, INTERVAL 1 MONTH)'
                . ' AND f.id_anagrafica IN (' . implode(',', $placeholders) . ')',
                $sql
            );
        }

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            $stmt->bindValue($placeholder, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
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

    public function fetchCurrentMonthRevenue(?array $allowedAnagrafiche = null, int $isAcquisto = 0): float
    {
        $allowed = null;
        if (is_array($allowedAnagrafiche)) {
            $allowed = array_values(array_filter(array_map('intval', $allowedAnagrafiche), static fn ($id) => $id > 0));
            if ($allowed === []) {
                return 0.0;
            }
        }

        $expression = $this->getNetRevenueExpression();
        $sql = <<<SQL
            WITH params AS (
              SELECT
                DATE_FORMAT(CURDATE(), '%Y-%m-01') AS start_month,
                DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH) AS next_month
            )
            SELECT
              COALESCE(SUM({$expression}), 0) AS fatturato
            FROM params p
            LEFT JOIN tb_fatture f
              ON COALESCE(f.data_fattura, f.created_at) >= p.start_month
             AND COALESCE(f.data_fattura, f.created_at) < p.next_month
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
            WHERE (sf.code IS NULL OR sf.code <> 'bozza')
              AND f.is_acquisto = :is_acquisto
        SQL;
        $params = [':is_acquisto' => $isAcquisto];
        if ($allowed !== null) {
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $key = ':allowed_' . $index;
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $sql = str_replace(
                'AND COALESCE(f.data_fattura, f.created_at) < p.next_month',
                'AND COALESCE(f.data_fattura, f.created_at) < p.next_month'
                . ' AND f.id_anagrafica IN (' . implode(',', $placeholders) . ')',
                $sql
            );
        }

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            $stmt->bindValue($placeholder, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
        $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : false;
        if (!$row) {
            return 0.0;
        }

        return isset($row['fatturato']) ? (float) $row['fatturato'] : 0.0;
    }

    public function fetchRevenueByRange(string $startDate, string $endDate, ?array $allowedAnagrafiche = null, int $isAcquisto = 0): float
    {
        $allowed = null;
        if (is_array($allowedAnagrafiche)) {
            $allowed = array_values(array_filter(array_map('intval', $allowedAnagrafiche), static fn ($id) => $id > 0));
            if ($allowed === []) {
                return 0.0;
            }
        }

        $expression = $this->getNetRevenueExpression();
        $sql = <<<SQL
            SELECT
              COALESCE(SUM({$expression}), 0) AS fatturato
            FROM tb_fatture f
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
            WHERE COALESCE(f.data_fattura, f.created_at) >= :start
              AND COALESCE(f.data_fattura, f.created_at) < :end
              AND (sf.code IS NULL OR sf.code <> 'bozza')
              AND f.is_acquisto = :is_acquisto
        SQL;

        if ($allowed !== null) {
            $placeholders = implode(',', array_fill(0, count($allowed), '?'));
            $sql .= " AND f.id_anagrafica IN ({$placeholders})";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':start', $startDate);
        $stmt->bindValue(':end', $endDate);
        $stmt->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
        if ($allowed !== null) {
            foreach ($allowed as $index => $id) {
                $stmt->bindValue($index + 1, $id, PDO::PARAM_INT);
            }
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return 0.0;
        }

        return isset($row['fatturato']) ? (float) $row['fatturato'] : 0.0;
    }

    /**
     * @return list<array{id_anagrafica:int|null, ragione_sociale:?string, fatturato:float}>
     */
    public function listTopClientsByRevenue(string $startDate, string $endDate, int $limit = 5, ?array $allowedAnagrafiche = null, int $isAcquisto = 0): array
    {
        $effectiveLimit = max(1, $limit);
        $allowed = null;
        if (is_array($allowedAnagrafiche)) {
            $allowed = array_values(array_filter(array_map('intval', $allowedAnagrafiche), static fn ($id) => $id > 0));
            if ($allowed === []) {
                return [];
            }
        }
        $expression = $this->getNetRevenueExpression();
        $sql = <<<SQL
            SELECT
              a.id_anagrafica,
              a.ragione_sociale,
              COALESCE(SUM({$expression}), 0) AS fatturato
            FROM tb_fatture f
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
            WHERE COALESCE(f.data_fattura, f.created_at) >= :start
              AND COALESCE(f.data_fattura, f.created_at) < :end
              AND (sf.code IS NULL OR sf.code <> 'bozza')
              AND f.is_acquisto = :is_acquisto
            GROUP BY a.id_anagrafica, a.ragione_sociale
            ORDER BY fatturato DESC
            LIMIT :limit
        SQL;

        $sql = str_replace('LIMIT :limit', 'LIMIT ' . (int) $effectiveLimit, $sql);
        if ($allowed !== null) {
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $placeholders[] = ':allowed_' . $index;
            }
            $sql = str_replace(
                'AND (sf.code IS NULL OR sf.code <> \'bozza\')',
                'AND (sf.code IS NULL OR sf.code <> \'bozza\') AND f.id_anagrafica IN (' . implode(',', $placeholders) . ')',
                $sql
            );
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':start', $startDate);
        $stmt->bindValue(':end', $endDate);
        $stmt->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
        if ($allowed !== null) {
            foreach ($allowed as $index => $id) {
                $stmt->bindValue(':allowed_' . $index, $id, PDO::PARAM_INT);
            }
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
                'ragione_sociale' => $row['ragione_sociale'] ?? null,
                'fatturato' => (float) ($row['fatturato'] ?? 0),
            ];
        }

        return $out;
    }

    private function getNetRevenueExpression(): string
    {
        return "CASE WHEN tf.code = 'nota_credito' THEN -f.totale ELSE f.totale END";
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listLatest(
        int $limit = 200,
        ?array $allowedAnagrafiche = null,
        bool $excludeDraft = false,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        int $isAcquisto = 0
    ): array
    {
        $sql = <<<'SQL'
            SELECT
                f.id_fattura,
                f.id_anagrafica,
                f.is_acquisto,
                f.is_acquisto,
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
                fil.numero_documento AS numero_documento_originale,
                fil.progressivo_invio,
                sf.code AS stato_code,
                sf.label AS stato_label,
                sz.code AS sezionale_code,
                sz.descrizione AS sezionale_label,
                tf.code AS tipo_code,
                tf.label AS tipo_label,
                a.ragione_sociale AS cliente_ragione_sociale,
                f.created_at,
                f.updated_at
            FROM tb_fatture f
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            LEFT JOIN cfg_sezionali sz ON sz.id_sezionale = f.id_sezionale
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
            LEFT JOIN tb_fatture_import_log fil ON fil.id_fattura = f.id_fattura
            /*FILTERS*/
            ORDER BY COALESCE(f.data_fattura, f.created_at) DESC, f.id_fattura DESC
            LIMIT :limit
        SQL;

        $allowed = null;
        if (is_array($allowedAnagrafiche)) {
            $allowed = array_values(array_filter(array_map('intval', $allowedAnagrafiche), static fn($id) => $id > 0));
            if ($allowed === []) {
                return [];
            }
        }
        $whereParts = [];
        $params = [];
        if ($allowed !== null) {
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $key = ':allowed_' . $index;
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $whereParts[] = 'f.id_anagrafica IN (' . implode(',', $placeholders) . ')';
        }
        if ($excludeDraft) {
            $whereParts[] = "(sf.code IS NULL OR sf.code <> 'bozza')";
        }
        if ($isAcquisto !== null) {
            $whereParts[] = 'f.is_acquisto = :is_acquisto';
            $params[':is_acquisto'] = $isAcquisto;
        }
        if ($dateFrom !== null && $dateFrom !== '') {
            $whereParts[] = 'DATE(COALESCE(f.data_fattura, f.created_at)) >= :date_from';
            $params[':date_from'] = $dateFrom;
        }
        if ($dateTo !== null && $dateTo !== '') {
            $whereParts[] = 'DATE(COALESCE(f.data_fattura, f.created_at)) <= :date_to';
            $params[':date_to'] = $dateTo;
        }
        $where = $whereParts ? ('WHERE ' . implode(' AND ', $whereParts)) : '';

        $sql = str_replace('/*FILTERS*/', $where, $sql);
        if ($limit > 0) {
            $effectiveLimit = max(1, min($limit, 500));
            $sql = str_replace('LIMIT :limit', 'LIMIT ' . $effectiveLimit, $sql);
        } else {
            $sql = str_replace('LIMIT :limit', '', $sql);
        }
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            if (strpos($placeholder, ':allowed_') === 0) {
                $stmt->bindValue($placeholder, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($placeholder, $value, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_fattura' => (int) $row['id_fattura'],
                'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
                'is_acquisto' => isset($row['is_acquisto']) ? (int) $row['is_acquisto'] : 0,
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
                'tipo_code' => $row['tipo_code'] ?? null,
                'tipo_label' => $row['tipo_label'] ?? null,
                'cliente_ragione_sociale' => $row['cliente_ragione_sociale'] ?? null,
                'numero_documento_originale' => $row['numero_documento_originale'] ?? null,
                'progressivo_invio' => $row['progressivo_invio'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'updated_at' => $row['updated_at'] ?? null,
            ];
        }

        return $items;
    }

    /**
     * @param string $code
     * @return int|null
     */
    private function getTipoFatturaIdByCode(string $code): ?int
    {
        if (array_key_exists($code, $this->tipoFatturaIdCache)) {
            return $this->tipoFatturaIdCache[$code];
        }

        $stmt = $this->pdo->prepare('SELECT id_tipo FROM cfg_tipi_fattura WHERE code = :code LIMIT 1');
        $stmt->bindValue(':code', $code, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            $this->tipoFatturaIdCache[$code] = null;
            return null;
        }

        $id = isset($row['id_tipo']) ? (int) $row['id_tipo'] : null;
        $this->tipoFatturaIdCache[$code] = $id > 0 ? $id : null;
        return $this->tipoFatturaIdCache[$code];
    }

    /**
     * @param int $invoiceId
     * @return int|null
     */
    private function getPreventivoIdForInvoice(int $invoiceId): ?int
    {
        if (isset($this->preventivoLinkCache[$invoiceId])) {
            return $this->preventivoLinkCache[$invoiceId];
        }

        $stmt = $this->pdo->prepare('SELECT id_preventivo FROM appoggio_preventivo_fattura WHERE id_fattura = :id LIMIT 1');
        $stmt->bindValue(':id', $invoiceId, PDO::PARAM_INT);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        if ($value === false) {
            $this->preventivoLinkCache[$invoiceId] = null;
            return null;
        }

        $preventivoId = (int) $value;
        $this->preventivoLinkCache[$invoiceId] = $preventivoId > 0 ? $preventivoId : null;
        return $this->preventivoLinkCache[$invoiceId];
    }

    /**
     * @param string|null $current
     * @param string $suffix
     * @return string
     */
    private function mergeNoteWithSuffix(?string $current, string $suffix): string
    {
        $trimmed = $current !== null ? trim($current) : '';
        if ($trimmed !== '' && stripos($trimmed, $suffix) !== false) {
            return $trimmed;
        }
        if ($trimmed === '') {
            return $suffix;
        }
        return $trimmed . "\n" . $suffix;
    }

    /**
     * @param string|null $rawDate
     * @return string
     */
    private function formatDocumentDate(?string $rawDate): string
    {
        if (empty($rawDate)) {
            return 'sconosciuta';
        }
        try {
            $dt = new DateTimeImmutable((string) $rawDate);
            return $dt->format('d/m/Y');
        } catch (\Throwable $exception) {
            return (string) $rawDate;
        }
    }

    /**
     * @param array<string,mixed> $creditNote
     * @return string
     */
    private function buildCreditNoteReferenceMessage(array $creditNote): string
    {
        $number = isset($creditNote['numero_documento']) ? (int) $creditNote['numero_documento'] : null;
        $date = $creditNote['data_fattura'] ?? null;
        $formattedDate = $this->formatDocumentDate($date);
        $numberLabel = $number !== null && $number > 0 ? (string) $number : 'sconosciuto';
        return sprintf('Generata nota credito n. %s del %s', $numberLabel, $formattedDate);
    }

    /**
     * @param array<string,mixed> $invoiceDetail
     * @return string
     */
    private function buildCreditNoteOriginMessage(array $invoiceDetail): string
    {
        $number = isset($invoiceDetail['numero_documento']) ? (int) $invoiceDetail['numero_documento'] : null;
        $date = $invoiceDetail['data_fattura'] ?? null;
        $formattedDate = $this->formatDocumentDate($date);
        $numberLabel = $number !== null && $number > 0 ? (string) $number : 'sconosciuto';
        return sprintf('Generata da fattura %s del %s', $numberLabel, $formattedDate);
    }

    /**
     * @param int $invoiceId
     * @param string $note
     */
    private function updateInvoiceNoteField(int $invoiceId, string $note): void
    {
        $stmt = $this->pdo->prepare('UPDATE tb_fatture SET note = :note, updated_at = NOW() WHERE id_fattura = :id LIMIT 1');
        $stmt->bindValue(':note', trim($note), PDO::PARAM_STR);
        $stmt->bindValue(':id', $invoiceId, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @param array<string,mixed> $invoiceDetail
     * @param int|null $preventivoId
     * @return array<string,mixed>
     */
    private function createCreditNoteForRejectedInvoice(array $invoiceDetail, ?int $preventivoId): array
    {
        $creditTypeId = $this->getTipoFatturaIdByCode('nota_credito');
        if ($creditTypeId === null) {
            throw new RuntimeException('Tipo fattura nota credito non configurato.', 500);
        }
        $statusInviataId = $this->getStatoIdByCode('inviata');
        if ($statusInviataId === null) {
            throw new RuntimeException('Stato "inviata" non configurato.', 500);
        }

        $today = new DateTimeImmutable();
        $currentNote = $invoiceDetail['note'] ?? null;
        $originMessage = $this->buildCreditNoteOriginMessage($invoiceDetail);
        $creditNoteNote = $this->mergeNoteWithSuffix($currentNote, $originMessage);

        $data = [
            'id_anagrafica' => isset($invoiceDetail['id_anagrafica']) ? (int) $invoiceDetail['id_anagrafica'] : 0,
            'id_sezionale' => isset($invoiceDetail['id_sezionale']) ? (int) $invoiceDetail['id_sezionale'] : 0,
            'data_fattura' => $today->format('Y-m-d'),
            'note' => $creditNoteNote,
            'id_tipo_fatt' => $creditTypeId,
            'id_stato_fatt' => $statusInviataId,
            'totale_imponibile' => $invoiceDetail['totale_imponibile'] ?? 0.0,
            'totale_sconto' => $invoiceDetail['totale_sconto'] ?? 0.0,
            'totale_iva' => $invoiceDetail['totale_iva'] ?? 0.0,
            'totale' => $invoiceDetail['totale'] ?? 0.0,
            'saldo' => $invoiceDetail['saldo'] ?? $invoiceDetail['totale'] ?? 0.0,
            'id_sdi_tipo_documento' => $invoiceDetail['id_sdi_tipo_documento'] ?? null,
            'id_sdi_esigibilita' => $invoiceDetail['id_sdi_esigibilita'] ?? null,
            'id_sdi_modalita' => $invoiceDetail['id_sdi_modalita'] ?? null,
            'cliente_pec' => $invoiceDetail['cliente_pec'] ?? null,
            'cliente_codice_sdi' => $invoiceDetail['cliente_codice_sdi'] ?? null,
            'cliente_iban' => $invoiceDetail['cliente_iban'] ?? null,
            'cliente_banca' => $invoiceDetail['cliente_banca'] ?? null,
            'cliente_modalita_pagamento' => $invoiceDetail['cliente_modalita_pagamento'] ?? null,
            'cliente_id_cond_pagamento' => $invoiceDetail['cliente_id_cond_pagamento'] ?? null,
            'cliente_giorni_pagamento' => $invoiceDetail['cliente_giorni_pagamento'] ?? null,
            'id_preventivo' => $preventivoId ?? 0,
        ];
        $lines = $invoiceDetail['righe'] ?? [];
        $creditLines = $this->buildCreditNoteLines($lines);
        return $this->createFromPreventivo($data, $creditLines);
    }

    /**
     * @param array<string,mixed> $lines
     * @return list<array<string,mixed>>
     */
    private function buildCreditNoteLines(array $lines): array
    {
        $result = [];
        foreach ($lines as $line) {
            if (!is_array($line)) {
                continue;
            }
            $quantity = isset($line['quantita']) ? (float) $line['quantita'] : 0.0;
            if ($quantity <= 0) {
                continue;
            }
            $price = isset($line['prezzo_unitario']) ? (float) $line['prezzo_unitario'] : 0.0;
            $negativePrice = $price !== 0.0 ? -abs($price) : 0.0;
            $result[] = [
                'descrizione' => $line['descrizione'] ?? '',
                'quantita' => $quantity,
                'prezzo_unitario' => $negativePrice,
                'sconto' => $line['sconto'] ?? null,
                'aliquota_iva' => $line['aliquota_iva'] ?? null,
                'id_prodotto' => isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null,
                'id_sdi_natura_iva' => isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null,
            ];
        }
        return $result;
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
                f.is_acquisto,
                f.created_at,
                f.updated_at,
                f.id_stato_fatt,
                f.id_sdi_tipo_documento,
                f.id_sdi_esigibilita,
                f.id_sdi_modalita,
                sf.code AS stato_code,
                sf.label AS stato_label,
                sz.code AS sezionale_code,
                sz.descrizione AS sezionale_label,
                tf.code AS tipo_code,
                tf.label AS tipo_label,
                td.code AS sdi_td_code,
                es.code AS sdi_esig_code,
                mp.code AS sdi_mp_code,
                a.ragione_sociale AS cliente_ragione_sociale,
                a.piva AS cliente_piva,
                a.codice_fiscale AS cliente_codice_fiscale,
                COALESCE(f.cliente_pec, af.pec) AS cliente_pec,
                COALESCE(f.cliente_codice_sdi, af.codice_sdi) AS cliente_codice_sdi,
                COALESCE(f.cliente_iban, af.iban) AS cliente_iban,
                COALESCE(f.cliente_banca, af.banca) AS cliente_banca,
                COALESCE(f.cliente_id_cond_pagamento, af.id_cond_pagamento) AS cliente_id_cond_pagamento,
                COALESCE(f.cliente_modalita_pagamento, af.modalita_pagamento) AS cliente_modalita_pagamento,
                COALESCE(f.cliente_giorni_pagamento, af.giorni_pagamento) AS cliente_giorni_pagamento,
                COALESCE(f.cliente_altri_dati, af.altri_dati) AS cliente_altri_dati,
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
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
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

        $clienteTermId = isset($row['cliente_id_cond_pagamento']) ? (int) $row['cliente_id_cond_pagamento'] : null;
        if ($clienteTermId !== null && $clienteTermId <= 0) {
            $clienteTermId = null;
        }
        $paymentTerms = $this->getPaymentTerms();
        $paymentSchedule = PaymentTerms::buildSchedule(
            $clienteTermId,
            $row['data_fattura'] ?? null,
            isset($row['totale']) ? (float) $row['totale'] : 0.0,
            $paymentTerms
        );

        return [
            'id_fattura' => (int) $row['id_fattura'],
            'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
            'is_acquisto' => isset($row['is_acquisto']) ? (int) $row['is_acquisto'] : 0,
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
            'stato_code' => $row['stato_code'] ?? null,
            'stato_label' => $row['stato_label'] ?? null,
            'id_stato_fatt' => isset($row['id_stato_fatt']) ? (int) $row['id_stato_fatt'] : null,
            'id_sdi_tipo_documento' => isset($row['id_sdi_tipo_documento']) ? (int) $row['id_sdi_tipo_documento'] : null,
            'id_sdi_esigibilita' => isset($row['id_sdi_esigibilita']) ? (int) $row['id_sdi_esigibilita'] : null,
            'id_sdi_modalita' => isset($row['id_sdi_modalita']) ? (int) $row['id_sdi_modalita'] : null,
            'sezionale_code' => $row['sezionale_code'] ?? null,
            'sezionale_label' => $row['sezionale_label'] ?? null,
            'tipo_code' => $row['tipo_code'] ?? null,
            'tipo_label' => $row['tipo_label'] ?? null,
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
            'cliente_id_cond_pagamento' => $clienteTermId,
            'cliente_condizioni_pagamento' => PaymentTerms::labelById($clienteTermId, $paymentTerms),
            'cliente_modalita_pagamento' => $row['cliente_modalita_pagamento'] ?? null,
            'cliente_giorni_pagamento' => isset($row['cliente_giorni_pagamento']) ? (int) $row['cliente_giorni_pagamento'] : null,
            'cliente_altri_dati' => $row['cliente_altri_dati'] ?? null,
            'cliente_indirizzo' => $row['cliente_indirizzo'] ?? null,
            'cliente_civico' => $row['cliente_civico'] ?? null,
            'cliente_cap' => $row['cliente_cap'] ?? null,
            'cliente_comune' => $row['cliente_comune'] ?? null,
            'cliente_provincia' => $row['cliente_provincia'] ?? null,
            'cliente_nazione' => $row['cliente_nazione'] ?? null,
            'condizioni_pagamento_rate' => $paymentSchedule,
            'righe' => $this->getLines($id),
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function getPaymentTerms(): array
    {
        if ($this->paymentTerms === null) {
            $this->paymentTerms = PaymentTerms::all($this->pdo);
        }

        return $this->paymentTerms;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function getLines(int $id): array
    {
        $hasComboKey = $this->ensureComboKeyColumn();
        $comboSelect = $hasComboKey ? ",\n                r.combo_key" : '';
        $sql = 'SELECT
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
                r.posizione' . $comboSelect . '
            FROM tb_fatture_righe r
            LEFT JOIN cfg_sdi_natura_iva n ON n.id_natura = r.id_sdi_natura_iva
            WHERE r.id_fattura = :id
            ORDER BY COALESCE(r.posizione, r.id_riga) ASC';

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
                'combo_key' => $hasComboKey ? ($row['combo_key'] ?? null) : null,
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
        $stmt = $this->pdo->query('SELECT id_stato, code, label, timeline_color, timeline_icon FROM cfg_stati_fattura WHERE attivo = 1 ORDER BY ordering ASC, id_stato ASC');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_stato' => (int) $row['id_stato'],
                'code' => (string) ($row['code'] ?? ''),
                'label' => (string) ($row['label'] ?? ''),
                'timeline_color' => $row['timeline_color'] ?? null,
                'timeline_icon' => $row['timeline_icon'] ?? null,
                'colore' => $row['colore'] ?? null,
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

    /**
     * @return list<array<string,mixed>>
     */
    public function listStatusLog(int $idFattura, int $limit = 50, int $offset = 0): array
    {
        if ($idFattura <= 0) {
            return [];
        }

        $limit = max(1, min($limit, 200));
        $offset = max(0, $offset);

        if ($this->ensureStatusLogTableExists()) {
            $stmt = $this->pdo->prepare(
                'SELECT
                    id_log,
                    from_status_id,
                    to_status_id,
                    from_status_label,
                    to_status_label,
                    actor,
                    created_at
                 FROM tb_fatture_status_log
                 WHERE id_fattura = :id
                 ORDER BY created_at DESC, id_log DESC
                 LIMIT :limit OFFSET :offset'
            );
            $stmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $items = [];
            foreach ($rows as $row) {
                $timestamp = $row['created_at'] ?? null;
                $isoTimestamp = null;
                if ($timestamp !== null) {
                    try {
                        $isoTimestamp = (new DateTimeImmutable((string) $timestamp))->format(DATE_ATOM);
                    } catch (\Throwable $ignored) {
                        try {
                            $isoTimestamp = (new DateTimeImmutable(str_replace(' ', 'T', (string) $timestamp)))->format(DATE_ATOM);
                        } catch (\Throwable $ignoredAgain) {
                            $isoTimestamp = (string) $timestamp;
                        }
                    }
                }

                $fromId = isset($row['from_status_id']) ? (int) $row['from_status_id'] : null;
                if ($fromId !== null && $fromId <= 0) {
                    $fromId = null;
                }
                $toId = isset($row['to_status_id']) ? (int) $row['to_status_id'] : null;
                if ($toId !== null && $toId <= 0) {
                    $toId = null;
                }

                $items[] = [
                    'at' => $isoTimestamp,
                    'from_status_id' => $fromId,
                    'from_status' => $row['from_status_label'] ?? ($fromId !== null ? '#' . $fromId : null),
                    'to_status_id' => $toId,
                    'to_status' => $row['to_status_label'] ?? ($toId !== null ? '#' . $toId : null),
                    'user_name' => $row['actor'] ?? null,
                ];
            }

            return $items;
        }

        $sql = <<<'SQL'
            SELECT
                l.ts,
                CAST(JSON_UNQUOTE(JSON_EXTRACT(l.row_old, '$.id_stato_fatt')) AS UNSIGNED) AS from_status_id,
                CAST(JSON_UNQUOTE(JSON_EXTRACT(l.row_new, '$.id_stato_fatt')) AS UNSIGNED) AS to_status_id,
                so.label AS from_status_label,
                sn.label AS to_status_label,
                l.actor
            FROM tb_audit_log l
            LEFT JOIN cfg_stati_fattura so ON so.id_stato = CAST(JSON_UNQUOTE(JSON_EXTRACT(l.row_old, '$.id_stato_fatt')) AS UNSIGNED)
            LEFT JOIN cfg_stati_fattura sn ON sn.id_stato = CAST(JSON_UNQUOTE(JSON_EXTRACT(l.row_new, '$.id_stato_fatt')) AS UNSIGNED)
            WHERE l.table_name = 'tb_fatture'
              AND JSON_UNQUOTE(JSON_EXTRACT(l.pk_json, '$.id_fattura')) = :id
              AND (
                (JSON_EXTRACT(l.row_old, '$.id_stato_fatt') IS NULL AND JSON_EXTRACT(l.row_new, '$.id_stato_fatt') IS NOT NULL)
                OR
                (JSON_EXTRACT(l.row_old, '$.id_stato_fatt') IS NOT NULL AND JSON_EXTRACT(l.row_new, '$.id_stato_fatt') IS NULL)
                OR
                JSON_UNQUOTE(JSON_EXTRACT(l.row_old, '$.id_stato_fatt')) <> JSON_UNQUOTE(JSON_EXTRACT(l.row_new, '$.id_stato_fatt'))
              )
            ORDER BY l.ts DESC
            LIMIT :limit OFFSET :offset
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', (string) $idFattura, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $timestamp = $row['ts'] ?? null;
            $isoTimestamp = null;
            if ($timestamp !== null) {
                try {
                    $isoTimestamp = (new DateTimeImmutable((string) $timestamp))->format(DATE_ATOM);
                } catch (\Throwable $ignored) {
                    try {
                        $isoTimestamp = (new DateTimeImmutable(str_replace(' ', 'T', (string) $timestamp)))->format(DATE_ATOM);
                    } catch (\Throwable $ignoredAgain) {
                        $isoTimestamp = (string) $timestamp;
                    }
                }
            }

            $fromId = null;
            if ($row['from_status_id'] !== null) {
                $value = (int) $row['from_status_id'];
                $fromId = $value > 0 ? $value : null;
            }

            $toId = null;
            if ($row['to_status_id'] !== null) {
                $value = (int) $row['to_status_id'];
                $toId = $value > 0 ? $value : null;
            }

            $fromLabel = $row['from_status_label'] ?? null;
            if ($fromLabel === null && $fromId !== null) {
                $fromLabel = '#' . $fromId;
            }

            $toLabel = $row['to_status_label'] ?? null;
            if ($toLabel === null && $toId !== null) {
                $toLabel = '#' . $toId;
            }

            $items[] = [
                'at' => $isoTimestamp,
                'from_status_id' => $fromId,
                'from_status' => $fromLabel,
                'to_status_id' => $toId,
                'to_status' => $toLabel,
                'user_name' => $row['actor'] ?? null,
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
     * @return array{anno:int,numero:int}
     */
    private function reserveNumeroDocumenti(int $idSezionale, DateTimeImmutable $date, int $isAcquisto): array
    {
        $anno = (int) $date->format('Y');
        if ($anno <= 0) {
            throw new RuntimeException('Anno fattura non valido.', 422);
        }

        $baseNext = $this->fetchMaxNumeroDocumenti($idSezionale, $anno, $isAcquisto) + 1;
        if ($baseNext < 1) {
            $baseNext = 1;
        }

        while (true) {
            $select = $this->pdo->prepare(
                'SELECT next_num FROM cfg_sezionali_progress WHERE id_sezionale = :id_sezionale AND anno = :anno AND is_acquisto = :is_acquisto FOR UPDATE'
            );
            $select->bindValue(':id_sezionale', $idSezionale, PDO::PARAM_INT);
            $select->bindValue(':anno', $anno, PDO::PARAM_INT);
            $select->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
            $select->execute();
            $row = $select->fetch(PDO::FETCH_ASSOC);
            if ($row !== false) {
                $current = isset($row['next_num']) ? (int) $row['next_num'] : 1;
                $candidate = max($current, $baseNext);
                $desired = $candidate + 1;

                $update = $this->pdo->prepare(
                    'UPDATE cfg_sezionali_progress SET next_num = :next WHERE id_sezionale = :id_sezionale AND anno = :anno AND is_acquisto = :is_acquisto'
                );
                $update->bindValue(':next', $desired, PDO::PARAM_INT);
                $update->bindValue(':id_sezionale', $idSezionale, PDO::PARAM_INT);
                $update->bindValue(':anno', $anno, PDO::PARAM_INT);
                $update->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
                $update->execute();
                return ['anno' => $anno, 'numero' => $candidate];
            }

            try {
                $insert = $this->pdo->prepare(
                    'INSERT INTO cfg_sezionali_progress (id_sezionale, anno, is_acquisto, next_num) VALUES (:id_sezionale, :anno, :is_acquisto, :next)'
                );
                $insert->bindValue(':id_sezionale', $idSezionale, PDO::PARAM_INT);
                $insert->bindValue(':anno', $anno, PDO::PARAM_INT);
                $insert->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
                $insert->bindValue(':next', $baseNext + 1, PDO::PARAM_INT);
                $insert->execute();
                return ['anno' => $anno, 'numero' => $baseNext];
            } catch (PDOException $exception) {
                if ($this->isDuplicateEntryException($exception, 'cfg_sezionali_progress')) {
                    continue;
                }
                throw $exception;
            }
        }
    }

    private function fetchMaxNumeroDocumenti(int $idSezionale, int $anno, int $isAcquisto): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COALESCE(MAX(numero_documento), 0) AS max_num FROM tb_fatture WHERE id_sezionale = :id_sezionale AND anno = :anno AND is_acquisto = :is_acquisto'
        );
        $stmt->bindValue(':id_sezionale', $idSezionale, PDO::PARAM_INT);
        $stmt->bindValue(':anno', $anno, PDO::PARAM_INT);
        $stmt->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        return is_numeric($value) ? (int) $value : 0;
    }

    private function isDuplicateEntryException(PDOException $exception, string $needle = ''): bool
    {
        $info = $exception->errorInfo;
        if (!is_array($info)) {
            return false;
        }
        if (($info[0] ?? '') !== '23000' || ($info[1] ?? 0) !== 1062) {
            return false;
        }
        if ($needle === '') {
            return true;
        }
        return str_contains((string) ($info[2] ?? ''), $needle);
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
        $idSdiTipoDocumento = isset($data['id_sdi_tipo_documento']) ? (int) $data['id_sdi_tipo_documento'] : null;
        $idSdiEsigibilita = isset($data['id_sdi_esigibilita']) ? (int) $data['id_sdi_esigibilita'] : null;
        $idSdiModalita = isset($data['id_sdi_modalita']) ? (int) $data['id_sdi_modalita'] : null;
        $isAcquisto = !empty($data['is_acquisto']) ? 1 : 0;
        $clientePec = isset($data['cliente_pec']) ? trim((string) $data['cliente_pec']) : null;
        if ($clientePec === '') {
            $clientePec = null;
        }
        $clienteCodiceSdi = isset($data['cliente_codice_sdi']) ? trim((string) $data['cliente_codice_sdi']) : null;
        if ($clienteCodiceSdi === '') {
            $clienteCodiceSdi = null;
        }
        $clienteIban = isset($data['cliente_iban']) ? trim((string) $data['cliente_iban']) : null;
        if ($clienteIban === '') {
            $clienteIban = null;
        }
        $clienteBanca = isset($data['cliente_banca']) ? trim((string) $data['cliente_banca']) : null;
        if ($clienteBanca === '') {
            $clienteBanca = null;
        }
        $clienteModalitaPagamento = isset($data['cliente_modalita_pagamento']) ? trim((string) $data['cliente_modalita_pagamento']) : null;
        if ($clienteModalitaPagamento === '') {
            $clienteModalitaPagamento = null;
        }
        $clienteIdCondPagamento = isset($data['cliente_id_cond_pagamento']) ? (int) $data['cliente_id_cond_pagamento'] : null;
        if ($clienteIdCondPagamento !== null && $clienteIdCondPagamento <= 0) {
            $clienteIdCondPagamento = null;
        }
        $clienteGiorniPagamento = isset($data['cliente_giorni_pagamento']) ? (int) $data['cliente_giorni_pagamento'] : null;
        if ($clienteGiorniPagamento !== null && $clienteGiorniPagamento < 0) {
            $clienteGiorniPagamento = null;
        }

        $this->ensureRecalcProcedureExists();
        $manageTransaction = !$this->pdo->inTransaction();
        if ($manageTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $numbering = $this->reserveNumeroDocumenti($idSezionale, $date, $isAcquisto);
            $annoFattura = $numbering['anno'];
            $numeroDocumento = $numbering['numero'];
        $createdAt = isset($data['created_at']) ? trim((string) $data['created_at']) : null;
        $updatedAt = isset($data['updated_at']) ? trim((string) $data['updated_at']) : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO tb_fatture (
                    id_sezionale,
                    id_serie,
                    id_anagrafica,
                    is_acquisto,
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
                    cliente_pec,
                    cliente_codice_sdi,
                    cliente_iban,
                    cliente_banca,
                    cliente_id_cond_pagamento,
                    cliente_modalita_pagamento,
                    cliente_giorni_pagamento,
                    note,
                    created_at,
                    updated_at
                ) VALUES (
                    :id_sezionale,
                    NULL,
                    :id_anagrafica,
                    :is_acquisto,
                    :anno,
                    :numero_documento,
                    :data_fattura,
                    :id_tipo_fatt,
                    :totale_imponibile,
                    :totale_sconto,
                    :totale_iva,
                    :totale,
                    :saldo,
                    :id_stato_fatt,
                    :id_sdi_tipo_documento,
                    :id_sdi_esigibilita,
                    :id_sdi_modalita,
                    :cliente_pec,
                    :cliente_codice_sdi,
                    :cliente_iban,
                    :cliente_banca,
                    :cliente_id_cond_pagamento,
                    :cliente_modalita_pagamento,
                    :cliente_giorni_pagamento,
                    :note,
                    COALESCE(NULLIF(:created_at, \'\'), NOW()),
                    COALESCE(NULLIF(:updated_at, \'\'), NOW())
                )'
            );
            $stmt->bindValue(':id_sezionale', $idSezionale, PDO::PARAM_INT);
            $stmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
            $stmt->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
            $stmt->bindValue(':anno', $annoFattura, PDO::PARAM_INT);
            $stmt->bindValue(':numero_documento', $numeroDocumento, PDO::PARAM_INT);
            $stmt->bindValue(':data_fattura', $dateValue, PDO::PARAM_STR);
            $stmt->bindValue(':id_tipo_fatt', $idTipoFatt, PDO::PARAM_INT);
            $stmt->bindValue(':totale_imponibile', $totImponibile, PDO::PARAM_STR);
            $stmt->bindValue(':totale_sconto', $totSconto, PDO::PARAM_STR);
            $stmt->bindValue(':totale_iva', $totIva, PDO::PARAM_STR);
            $stmt->bindValue(':totale', $totale, PDO::PARAM_STR);
            $stmt->bindValue(':saldo', $saldo, PDO::PARAM_STR);
            $stmt->bindValue(':id_stato_fatt', $idStatoFatt, PDO::PARAM_INT);
            if ($idSdiTipoDocumento !== null) {
                $stmt->bindValue(':id_sdi_tipo_documento', $idSdiTipoDocumento, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_sdi_tipo_documento', null, PDO::PARAM_NULL);
            }
            if ($idSdiEsigibilita !== null) {
                $stmt->bindValue(':id_sdi_esigibilita', $idSdiEsigibilita, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_sdi_esigibilita', null, PDO::PARAM_NULL);
            }
            if ($idSdiModalita !== null) {
                $stmt->bindValue(':id_sdi_modalita', $idSdiModalita, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':id_sdi_modalita', null, PDO::PARAM_NULL);
            }
            $stmt->bindValue(':cliente_pec', $clientePec, $clientePec !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':cliente_codice_sdi', $clienteCodiceSdi, $clienteCodiceSdi !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':cliente_iban', $clienteIban, $clienteIban !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':cliente_banca', $clienteBanca, $clienteBanca !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':cliente_id_cond_pagamento', $clienteIdCondPagamento, $clienteIdCondPagamento !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $stmt->bindValue(':cliente_modalita_pagamento', $clienteModalitaPagamento, $clienteModalitaPagamento !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':cliente_giorni_pagamento', $clienteGiorniPagamento, $clienteGiorniPagamento !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
            if ($note !== null && $note !== '') {
                $stmt->bindValue(':note', $note, PDO::PARAM_STR);
            } else {
                $stmt->bindValue(':note', null, PDO::PARAM_NULL);
            }
            $stmt->bindValue(
                ':created_at',
                $createdAt !== null && $createdAt !== '' ? $createdAt : null,
                $createdAt !== null && $createdAt !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL
            );
            $stmt->bindValue(
                ':updated_at',
                $updatedAt !== null && $updatedAt !== '' ? $updatedAt : null,
                $updatedAt !== null && $updatedAt !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL
            );
            $stmt->execute();

            $idFattura = (int) $this->pdo->lastInsertId();

            $hasComboKey = $this->ensureComboKeyColumn();
            $comboColumn = $hasComboKey ? "\n                    combo_key," : '';
            $comboValue = $hasComboKey ? "\n                    :combo_key," : '';
            $linesStmt = $this->pdo->prepare(
                'INSERT INTO tb_fatture_righe (
                    id_fattura,
                    id_prodotto,' . $comboColumn . '
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
                    :id_prodotto,' . $comboValue . '
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
            $hasPreventivoMap = $this->ensurePreventivoRigheMapTableExists();
            $mapStmt = null;
            if ($hasPreventivoMap) {
                $mapStmt = $this->pdo->prepare(
                    'INSERT INTO appoggio_preventivo_fattura_righe (id_riga_preventivo, id_fattura, id_fattura_riga)
                     VALUES (:id_riga_preventivo, :id_fattura, :id_fattura_riga)'
                );
            }

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
                $aliquota = isset($line['aliquota_iva']) ? (float) $line['aliquota_iva'] : 22.0;
                $idProdotto = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
                $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;
                $comboKey = isset($line['combo_key']) ? trim((string) $line['combo_key']) : null;
                if ($comboKey === '') {
                    $comboKey = null;
                }

                $imponibile = $quantita * $prezzo;
                if ($sconto > 0) {
                    $imponibile = $imponibile * (1 - ($sconto / 100));
                }
                $imponibile = max(0.0, $imponibile);
                $iva = $aliquota !== null ? $imponibile * ($aliquota / 100) : 0.0;
                $totLine = $imponibile + $iva;

                $linesStmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
                $linesStmt->bindValue(':id_prodotto', $idProdotto, $idProdotto ? PDO::PARAM_INT : PDO::PARAM_NULL);
                if ($hasComboKey) {
                    $linesStmt->bindValue(':combo_key', $comboKey, $comboKey ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
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
                if ($mapStmt) {
                    $idRigaPrev = isset($line['id_riga_preventivo'])
                        ? (int) $line['id_riga_preventivo']
                        : (isset($line['id_riga']) ? (int) $line['id_riga'] : 0);
                    $idFatturaRiga = (int) $this->pdo->lastInsertId();
                    if ($idRigaPrev > 0 && $idFatturaRiga > 0) {
                        $mapStmt->bindValue(':id_riga_preventivo', $idRigaPrev, PDO::PARAM_INT);
                        $mapStmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
                        $mapStmt->bindValue(':id_fattura_riga', $idFatturaRiga, PDO::PARAM_INT);
                        $mapStmt->execute();
                    }
                }
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

            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
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

        $previousStatusId = isset($existing['id_stato_fatt']) ? (int) $existing['id_stato_fatt'] : null;
        $newStatusId = null;
        $setClauses = [];
        $params = [':id' => $id];
        $types = [':id' => PDO::PARAM_INT];
        $hasChanges = false;
        $rifiutataStatusId = $this->getStatoIdByCode('rifiutata');
        $shouldCreateCreditNote = false;

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
            $newStatusId = $status;
            if ($rifiutataStatusId !== null && $status === $rifiutataStatusId && $previousStatusId !== $status) {
                $shouldCreateCreditNote = true;
            }
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

        if (array_key_exists('cliente_pec', $data)) {
            $raw = $data['cliente_pec'];
            $value = $raw === null ? '' : trim((string) $raw);
            if ($value === '') {
                $setClauses[] = 'cliente_pec = NULL';
            } else {
                $setClauses[] = 'cliente_pec = :cliente_pec';
                $params[':cliente_pec'] = $value;
                $types[':cliente_pec'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('cliente_codice_sdi', $data)) {
            $raw = $data['cliente_codice_sdi'];
            $value = $raw === null ? '' : trim((string) $raw);
            if ($value === '') {
                $setClauses[] = 'cliente_codice_sdi = NULL';
            } else {
                $setClauses[] = 'cliente_codice_sdi = :cliente_codice_sdi';
                $params[':cliente_codice_sdi'] = $value;
                $types[':cliente_codice_sdi'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('cliente_iban', $data)) {
            $raw = $data['cliente_iban'];
            $value = $raw === null ? '' : trim((string) $raw);
            if ($value === '') {
                $setClauses[] = 'cliente_iban = NULL';
            } else {
                $setClauses[] = 'cliente_iban = :cliente_iban';
                $params[':cliente_iban'] = $value;
                $types[':cliente_iban'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('cliente_banca', $data)) {
            $raw = $data['cliente_banca'];
            $value = $raw === null ? '' : trim((string) $raw);
            if ($value === '') {
                $setClauses[] = 'cliente_banca = NULL';
            } else {
                $setClauses[] = 'cliente_banca = :cliente_banca';
                $params[':cliente_banca'] = $value;
                $types[':cliente_banca'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('cliente_modalita_pagamento', $data)) {
            $raw = $data['cliente_modalita_pagamento'];
            $value = $raw === null ? '' : trim((string) $raw);
            if ($value === '') {
                $setClauses[] = 'cliente_modalita_pagamento = NULL';
            } else {
                $setClauses[] = 'cliente_modalita_pagamento = :cliente_modalita_pagamento';
                $params[':cliente_modalita_pagamento'] = $value;
                $types[':cliente_modalita_pagamento'] = PDO::PARAM_STR;
            }
        }

        if (array_key_exists('cliente_id_cond_pagamento', $data)) {
            $raw = $data['cliente_id_cond_pagamento'];
            if ($raw === null || $raw === '') {
                $setClauses[] = 'cliente_id_cond_pagamento = NULL';
            } else {
                if (!is_numeric($raw)) {
                    throw new RuntimeException('Condizione pagamento non valida.', 422);
                }
                $termId = (int) $raw;
                if ($termId <= 0) {
                    $setClauses[] = 'cliente_id_cond_pagamento = NULL';
                } else {
                    $setClauses[] = 'cliente_id_cond_pagamento = :cliente_id_cond_pagamento';
                    $params[':cliente_id_cond_pagamento'] = $termId;
                    $types[':cliente_id_cond_pagamento'] = PDO::PARAM_INT;
                }
            }
        }

        if (array_key_exists('cliente_giorni_pagamento', $data)) {
            $raw = $data['cliente_giorni_pagamento'];
            if ($raw === null || $raw === '') {
                $setClauses[] = 'cliente_giorni_pagamento = NULL';
            } else {
                if (!is_numeric($raw)) {
                    throw new RuntimeException('Giorni pagamento non validi.', 422);
                }
                $days = (int) $raw;
                if ($days < 0) {
                    throw new RuntimeException('Giorni pagamento non validi.', 422);
                }
                $setClauses[] = 'cliente_giorni_pagamento = :cliente_giorni_pagamento';
                $params[':cliente_giorni_pagamento'] = $days;
                $types[':cliente_giorni_pagamento'] = PDO::PARAM_INT;
            }
        }

        $manageTransaction = !$this->pdo->inTransaction();
        if ($manageTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
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
                if ($newStatusId !== null && $newStatusId !== $previousStatusId) {
                    $this->logStatusHistory($id, $previousStatusId, $newStatusId);
                }
            }

            if (array_key_exists('righe', $data)) {
                $lines = is_array($data['righe']) ? $data['righe'] : [];
                $this->replaceLines($id, $lines);
                $hasChanges = true;
            }

            if ($shouldCreateCreditNote) {
                $updatedInvoice = $this->fetchDetail($id);
                if ($updatedInvoice === null) {
                    throw new RuntimeException('Impossibile recuperare la fattura aggiornata per generare la nota di credito.', 500);
                }
                $preventivoId = $this->getPreventivoIdForInvoice($id);
                $creditNote = $this->createCreditNoteForRejectedInvoice($updatedInvoice, $preventivoId);
                $creditNoteMessage = $this->buildCreditNoteReferenceMessage($creditNote);
                $currentNote = $updatedInvoice['note'] ?? null;
                $updatedNote = $this->mergeNoteWithSuffix($currentNote, $creditNoteMessage);
                if ($updatedNote !== ($currentNote ?? '')) {
                    $this->updateInvoiceNoteField($id, $updatedNote);
                }
                $hasChanges = true;
            }

            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
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

        $lines = $this->applyContractPricing($id, $lines);

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
            $comboKey = isset($line['combo_key']) ? trim((string) $line['combo_key']) : null;
            if ($comboKey === '') {
                $comboKey = null;
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
                'combo_key' => $comboKey,
            ];
        }

        if (empty($normalized)) {
            throw new RuntimeException('Inserire almeno una riga valida per la fattura.', 422);
        }

        $this->ensureRecalcProcedureExists();
        $manageTransaction = !$this->pdo->inTransaction();
        if ($manageTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $del = $this->pdo->prepare('DELETE FROM tb_fatture_righe WHERE id_fattura = :id');
            $del->bindValue(':id', $id, PDO::PARAM_INT);
            $del->execute();

            $hasComboKey = $this->ensureComboKeyColumn();
            $comboColumn = $hasComboKey ? "\n                    combo_key," : '';
            $comboValue = $hasComboKey ? "\n                    :combo_key," : '';
            $stmt = $this->pdo->prepare(
                'INSERT INTO tb_fatture_righe (
                    id_fattura,
                    id_prodotto,' . $comboColumn . '
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
                    :id_prodotto,' . $comboValue . '
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
                if ($hasComboKey) {
                    $stmt->bindValue(':combo_key', $line['combo_key'], $line['combo_key'] ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
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

            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($manageTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /**
     * @param list<array<string,mixed>> $lines
     * @return list<array<string,mixed>>
     */
    private function applyContractPricing(int $idFattura, array $lines): array
    {
        $idAnagrafica = $this->getAnagraficaIdForFattura($idFattura);
        if ($idAnagrafica <= 0 || empty($lines)) {
            return $lines;
        }

        $repo = new ContrattiRepository($this->pdo);
        $out = [];
        foreach ($lines as $line) {
            if (!is_array($line)) {
                continue;
            }
            $qtyRaw = $line['quantita'] ?? $line['qty'] ?? 1;
            $qty = is_numeric($qtyRaw) ? (float) $qtyRaw : 1.0;
            $idProdotto = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : 0;
            $idPacchetto = isset($line['id_pacchetto']) ? (int) $line['id_pacchetto'] : 0;
            $comboKey = isset($line['combo_key']) ? trim((string) $line['combo_key']) : null;
            if ($comboKey === '') { $comboKey = null; }
            $pricing = null;
            if ($idProdotto > 0) {
                $pricing = $repo->resolveProductPricing($idAnagrafica, $idProdotto, $qty, null, $comboKey);
            }
            if ($pricing === null && $idPacchetto > 0) {
                $pricing = $repo->resolvePackagePricing($idAnagrafica, $idPacchetto, $qty);
            }
            if ($pricing !== null) {
                $line['prezzo_unitario'] = $pricing['prezzo_unitario'];
                $line['prezzo'] = $pricing['prezzo_unitario'];
                $line['sconto'] = $pricing['sconto'] ?? 0.0;
                if (array_key_exists('iva', $pricing) && $pricing['iva'] !== null) {
                    $line['aliquota_iva'] = $pricing['iva'];
                    $line['iva'] = $pricing['iva'];
                }
                if (array_key_exists('id_sdi_natura_iva', $pricing) && $pricing['id_sdi_natura_iva'] !== null) {
                    $line['id_sdi_natura_iva'] = $pricing['id_sdi_natura_iva'];
                }
            }
            $out[] = $line;
        }
        return $out;
    }

    private function getAnagraficaIdForFattura(int $idFattura): int
    {
        $stmt = $this->pdo->prepare('SELECT id_anagrafica FROM tb_fatture WHERE id_fattura = :id LIMIT 1');
        $stmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        return $value !== false ? (int) $value : 0;
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
        $existingPagamento = null;
        if ($idPagamento > 0) {
            $existingPagamento = $this->fetchPagamento($idFattura, $idPagamento);
            if ($existingPagamento === null) {
                $fallbackPending = $this->fetchPendingPaymentByImportUid($importUid);
                if ($fallbackPending !== null) {
                    $pendingPaymentId = (int) $fallbackPending['id_pagamento'];
                    $idPagamento = 0;
                } else {
                    throw new RuntimeException('Pagamento non trovato per questa fattura.', 404);
                }
            }
        }
        if ($existingPagamento !== null) {
            if (!$hasImportoDocumento && isset($existingPagamento['importo_documento'])) {
                $importoDocumento = (float) $existingPagamento['importo_documento'];
            }
            if (!$hasImportUid && isset($existingPagamento['import_uid']) && $existingPagamento['import_uid'] !== null) {
                $importUid = (string) $existingPagamento['import_uid'];
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

    /**
     * @return array<string,mixed>|null
     */
    private function fetchPendingPaymentByImportUid(?string $importUid): ?array
    {
        if ($importUid === null || $importUid === '') {
            return null;
        }

        $stmt = $this->pdo->prepare('SELECT id_pagamento FROM tb_pagamenti WHERE import_uid = :uid LIMIT 1');
        $stmt->bindValue(':uid', $importUid, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return $this->fetchPendingPaymentById((int) $row['id_pagamento']);
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
            $invoiceStmt = $this->pdo->prepare(
                'SELECT DISTINCT id_fattura FROM appoggio_pagamenti_fattura WHERE id_pagamento = :id AND id_fattura IS NOT NULL'
            );
            $invoiceStmt->bindValue(':id', $idPagamento, PDO::PARAM_INT);
            $invoiceStmt->execute();
            $invoiceIds = [];
            foreach ($invoiceStmt->fetchAll(PDO::FETCH_COLUMN) ?: [] as $invoiceId) {
                $invoiceIds[] = (int) $invoiceId;
            }

            $manageTransaction = !$this->pdo->inTransaction();
            if ($manageTransaction) {
                $this->pdo->beginTransaction();
            }

            try {
                $deleteAssignments = $this->pdo->prepare('DELETE FROM appoggio_pagamenti_fattura WHERE id_pagamento = :id');
                $deleteAssignments->bindValue(':id', $idPagamento, PDO::PARAM_INT);
                $deleteAssignments->execute();

                $deleteStaged = $this->pdo->prepare('DELETE FROM tb_pagamenti WHERE id_pagamento = :id LIMIT 1');
                $deleteStaged->bindValue(':id', $idPagamento, PDO::PARAM_INT);
                $deleteStaged->execute();
                if ($deleteStaged->rowCount() === 0) {
                    throw new RuntimeException('Pagamento non trovato o già eliminato.', 404);
                }

                foreach ($invoiceIds as $invoiceId) {
                    $this->updateSaldoFromPayments($invoiceId);
                }

                if ($manageTransaction) {
                    $this->pdo->commit();
                }
            } catch (\Throwable $exception) {
                if ($manageTransaction && $this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                throw $exception;
            }

            return;
        }

        if ($idFattura <= 0) {
            $assignmentInfo = $this->fetchAssignmentForDeletion($idPagamento, null);
            $stmt = $this->pdo->prepare(
                'DELETE FROM appoggio_pagamenti_fattura WHERE id_pag_fattura = :id_pagamento LIMIT 1'
            );
            $stmt->bindValue(':id_pagamento', $idPagamento, PDO::PARAM_INT);
            $stmt->execute();
            $deleted = $stmt->rowCount() > 0;
            if (!$deleted) {
                throw new RuntimeException('Pagamento non trovato o gi� eliminato.', 404);
            }
            $this->updatePendingAllocationAfterDelete($assignmentInfo, $deleted);
            return;
        }

        $assignmentInfo = $this->fetchAssignmentForDeletion($idPagamento, $idFattura);
        $stmt = $this->pdo->prepare(
            'DELETE FROM appoggio_pagamenti_fattura WHERE id_pag_fattura = :id_pagamento AND id_fattura = :id_fattura LIMIT 1'
        );
        $stmt->bindValue(':id_pagamento', $idPagamento, PDO::PARAM_INT);
        $stmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
        $stmt->execute();

        $deleted = $stmt->rowCount() > 0;
        if (!$deleted) {
            throw new RuntimeException('Pagamento non trovato o gi� eliminato.', 404);
        }
        $this->updatePendingAllocationAfterDelete($assignmentInfo, $deleted);

        $this->updateSaldoFromPayments($idFattura);
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchAssignmentForDeletion(int $idPagamento, ?int $idFattura): ?array
    {
        if ($idPagamento <= 0) {
            return null;
        }

        $sql = 'SELECT id_pagamento, importo FROM appoggio_pagamenti_fattura WHERE id_pag_fattura = :id';
        if ($idFattura !== null && $idFattura > 0) {
            $sql .= ' AND id_fattura = :id_fattura';
        }
        $sql .= ' LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idPagamento, PDO::PARAM_INT);
        if ($idFattura !== null && $idFattura > 0) {
            $stmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return [
            'id_pagamento' => isset($row['id_pagamento']) ? (int) $row['id_pagamento'] : null,
            'importo' => isset($row['importo']) ? (float) $row['importo'] : null,
        ];
    }

    private function updatePendingAllocationAfterDelete(?array $assignmentInfo, bool $deleted): void
    {
        if (!$deleted || $assignmentInfo === null) {
            return;
        }

        $pendingId = isset($assignmentInfo['id_pagamento']) ? (int) $assignmentInfo['id_pagamento'] : 0;
        $importo = isset($assignmentInfo['importo']) ? (float) $assignmentInfo['importo'] : 0.0;
        if ($pendingId <= 0 || $importo <= 0) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE tb_pagamenti
             SET importo_allocato = GREATEST(0, importo_allocato - :importo), updated_at = NOW()
             WHERE id_pagamento = :id
             LIMIT 1'
        );
        $stmt->bindValue(':importo', number_format($importo, 2, '.', ''), PDO::PARAM_STR);
        $stmt->bindValue(':id', $pendingId, PDO::PARAM_INT);
        $stmt->execute();
    }

    private function updateSaldoFromPayments(int $idFattura): void
    {
        if ($idFattura <= 0) {
            return;
        }

        $invoiceStmt = $this->pdo->prepare('SELECT totale, id_stato_fatt FROM tb_fatture WHERE id_fattura = :id LIMIT 1');
        $invoiceStmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $invoiceStmt->execute();
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        if ($invoice === false) {
            return;
        }

        $totale = isset($invoice['totale']) ? (float) $invoice['totale'] : 0.0;
        $currentStatusId = isset($invoice['id_stato_fatt']) ? (int) $invoice['id_stato_fatt'] : null;
        if ($currentStatusId !== null && $currentStatusId <= 0) {
            $currentStatusId = null;
        }

        $paidStmt = $this->pdo->prepare(
            'SELECT COALESCE(SUM(importo), 0) AS totale_pagato FROM appoggio_pagamenti_fattura WHERE id_fattura = :id'
        );
        $paidStmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $paidStmt->execute();
        $totalePagatoRaw = $paidStmt->fetchColumn();
        $totalePagato = $totalePagatoRaw !== false ? (float) $totalePagatoRaw : 0.0;

        $saldo = round(max(0.0, $totale - $totalePagato), 2);
        $newStatusId = null;
        if ($totale > 0) {
            $isFullyUnpaid = abs($saldo - $totale) < 0.009;
            $isFullyPaid = abs($saldo) < 0.009;
            if ($isFullyUnpaid) {
                $newStatusId = $this->getStatoIdByCode('inviata');
            } elseif ($isFullyPaid) {
                $saldo = 0.0;
                $newStatusId = $this->getStatoIdByCode('pagata');
            } elseif ($saldo > 0 && $saldo < $totale) {
                $newStatusId = $this->getStatoIdByCode('pagataparziale');
            }
        }

        $sql = 'UPDATE tb_fatture SET saldo = :saldo, updated_at = NOW()';
        if ($newStatusId !== null) {
            $sql .= ', id_stato_fatt = :id_stato';
        }
        $sql .= ' WHERE id_fattura = :id LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':saldo', number_format($saldo, 2, '.', ''), PDO::PARAM_STR);
        if ($newStatusId !== null) {
            $stmt->bindValue(':id_stato', $newStatusId, PDO::PARAM_INT);
        }
        $stmt->bindValue(':id', $idFattura, PDO::PARAM_INT);
        $stmt->execute();
        if ($newStatusId !== null && $newStatusId !== $currentStatusId) {
            $this->logStatusHistory($idFattura, $currentStatusId, $newStatusId, 'Sistema pagamenti');
        }
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

    private function getStatoIdByCode(string $code): ?int
    {
        if (array_key_exists($code, $this->statoIdCache)) {
            return $this->statoIdCache[$code];
        }

        $stmt = $this->pdo->prepare('SELECT id_stato FROM cfg_stati_fattura WHERE code = :code LIMIT 1');
        $stmt->bindValue(':code', $code, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            $this->statoIdCache[$code] = null;
            return null;
        }

        $id = (int) $row['id_stato'];
        $this->statoIdCache[$code] = $id > 0 ? $id : null;

        return $this->statoIdCache[$code];
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

    private function ensureStatusLogTableExists(): bool
    {
        if ($this->statusLogTableEnsured) {
            return $this->statusLogTableAvailable;
        }

        try {
            $sql = <<<'SQL'
                CREATE TABLE IF NOT EXISTS tb_fatture_status_log (
                    id_log BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    id_fattura INT NOT NULL,
                    from_status_id INT NULL,
                    to_status_id INT NULL,
                    from_status_label VARCHAR(191) NULL,
                    to_status_label VARCHAR(191) NULL,
                    note VARCHAR(500) NULL,
                    actor VARCHAR(191) NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id_log),
                    KEY idx_fsl_fattura (id_fattura),
                    KEY idx_fsl_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL;
            $this->pdo->exec($sql);
            $this->statusLogTableAvailable = true;
        } catch (\Throwable $ignored) {
            $this->statusLogTableAvailable = false;
        }

        $this->statusLogTableEnsured = true;
        return $this->statusLogTableAvailable;
    }

    private function ensureComboKeyColumn(): bool
    {
        if ($this->comboKeySupported !== null) {
            return $this->comboKeySupported;
        }

        $exists = false;
        try {
            $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_fatture_righe LIKE 'combo_key'");
            $exists = $stmt && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            if (!$exists) {
                $this->pdo->exec("ALTER TABLE tb_fatture_righe ADD COLUMN combo_key VARCHAR(255) NULL AFTER id_prodotto");
                $stmt = $this->pdo->query("SHOW COLUMNS FROM tb_fatture_righe LIKE 'combo_key'");
                $exists = $stmt && $stmt->fetch(PDO::FETCH_ASSOC) !== false;
            }
        } catch (\Throwable $ignored) {
            $exists = false;
        }

        $this->comboKeySupported = $exists;
        return $this->comboKeySupported;
    }

    private function ensurePreventivoRigheMapTableExists(): bool
    {
        if ($this->preventivoRigheMapEnsured) {
            return $this->preventivoRigheMapAvailable;
        }

        try {
            $sql = <<<'SQL'
                CREATE TABLE IF NOT EXISTS appoggio_preventivo_fattura_righe (
                    id_riga_preventivo INT UNSIGNED NOT NULL,
                    id_fattura INT UNSIGNED NOT NULL,
                    id_fattura_riga INT UNSIGNED NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id_riga_preventivo, id_fattura_riga),
                    KEY idx_apfr_fattura (id_fattura),
                    KEY idx_apfr_riga (id_riga_preventivo),
                    KEY idx_apfr_fattura_riga (id_fattura_riga),
                    CONSTRAINT fk_apfr_fattura FOREIGN KEY (id_fattura) REFERENCES tb_fatture (id_fattura) ON DELETE CASCADE,
                    CONSTRAINT fk_apfr_fattura_riga FOREIGN KEY (id_fattura_riga) REFERENCES tb_fatture_righe (id_riga) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL;
            $this->pdo->exec($sql);
            $this->preventivoRigheMapAvailable = true;
        } catch (\Throwable $ignored) {
            $this->preventivoRigheMapAvailable = false;
        }

        $this->preventivoRigheMapEnsured = true;
        return $this->preventivoRigheMapAvailable;
    }

    private function logStatusHistory(int $idFattura, ?int $fromStatusId, ?int $toStatusId, ?string $actor = null): void
    {
        if ($fromStatusId === $toStatusId) {
            return;
        }
        if (!$this->ensureStatusLogTableExists()) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO tb_fatture_status_log (
                id_fattura,
                from_status_id,
                to_status_id,
                from_status_label,
                to_status_label,
                actor
            ) VALUES (
                :id_fattura,
                :from_status_id,
                :to_status_id,
                :from_label,
                :to_label,
                :actor
            )'
        );
        $stmt->bindValue(':id_fattura', $idFattura, PDO::PARAM_INT);
        if ($fromStatusId !== null) {
            $stmt->bindValue(':from_status_id', $fromStatusId, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':from_status_id', null, PDO::PARAM_NULL);
        }
        if ($toStatusId !== null) {
            $stmt->bindValue(':to_status_id', $toStatusId, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':to_status_id', null, PDO::PARAM_NULL);
        }
        $fromLabel = $this->fetchStatusLabel($fromStatusId);
        if ($fromLabel !== null) {
            $stmt->bindValue(':from_label', $fromLabel, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':from_label', null, PDO::PARAM_NULL);
        }
        $toLabel = $this->fetchStatusLabel($toStatusId);
        if ($toLabel !== null) {
            $stmt->bindValue(':to_label', $toLabel, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':to_label', null, PDO::PARAM_NULL);
        }
        $resolvedActor = $actor ?? $this->resolveActorName();
        if ($resolvedActor !== null) {
            $stmt->bindValue(':actor', $resolvedActor, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':actor', null, PDO::PARAM_NULL);
        }
        $stmt->execute();
    }

    private function fetchStatusLabel(?int $id): ?string
    {
        if ($id === null) {
            return null;
        }
        if (array_key_exists($id, $this->statusLabelCache)) {
            return $this->statusLabelCache[$id];
        }

        $stmt = $this->pdo->prepare('SELECT label FROM cfg_stati_fattura WHERE id_stato = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $label = $stmt->fetchColumn();
        $this->statusLabelCache[$id] = $label !== false ? (string) $label : null;

        return $this->statusLabelCache[$id];
    }

    private function resolveActorName(): ?string
    {
        $tokenActor = $this->resolveActorFromToken();
        if ($tokenActor !== null && $tokenActor !== '') {
            return $tokenActor;
        }

        $candidates = [
            $_SERVER['HTTP_X_USER_NAME'] ?? null,
            $_SERVER['HTTP_X_AUTH_USER'] ?? null,
            $_SERVER['AUTH_USER'] ?? null,
            $_SERVER['REMOTE_USER'] ?? null,
            $_SERVER['USER'] ?? null,
        ];

        foreach ($candidates as $value) {
            if (is_string($value)) {
                $trimmed = trim($value);
                if ($trimmed !== '') {
                    return $trimmed;
                }
            }
        }

        return 'Sistema';
    }

    private function resolveActorFromToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!is_string($header) || $header === '') {
            return null;
        }
        if (stripos($header, 'Bearer ') !== 0) {
            return null;
        }
        $token = trim(substr($header, 7));
        if ($token === '') {
            return null;
        }
        $secret = getenv('JWT_SECRET');
        if (!$secret) {
            return null;
        }
        try {
            $payload = JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable $exception) {
            return null;
        }

        if (isset($payload->username) && is_string($payload->username) && trim($payload->username) !== '') {
            return trim($payload->username);
        }
        if (isset($payload->email) && is_string($payload->email) && trim($payload->email) !== '') {
            return trim($payload->email);
        }
        if (isset($payload->sub) && (is_string($payload->sub) || is_numeric($payload->sub))) {
            return 'user#' . (string) $payload->sub;
        }

        return null;
    }
}
