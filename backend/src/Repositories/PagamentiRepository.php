<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use DateTimeImmutable;
use PDO;
use RuntimeException;

final class PagamentiRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * Situazione dare/avere per cliente.
     *
     * @return list<array<string,mixed>>
     */
    public function listLedger(?string $search = null, int $limit = 200, ?array $allowedAnagrafiche = null): array
    {
        $limit = max(1, min($limit, 500));
        $term = $search !== null ? trim($search) : '';
        $allowed = null;
        if (is_array($allowedAnagrafiche)) {
            $allowed = array_values(array_filter(array_map('intval', $allowedAnagrafiche), static fn($id) => $id > 0));
            if ($allowed === []) {
                return [];
            }
        }

        $sql = <<<'SQL'
            SELECT
                a.id_anagrafica,
                a.ragione_sociale,
                a.piva,
                a.codice_fiscale,
                COALESCE(f.totale_fatturato, 0) AS totale_fatturato,
                COALESCE(f.totale_pagato, 0) AS totale_fatture_pagato,
                COALESCE(p.totale_pagamenti, 0) + COALESCE(pending.pending_residuo, 0) AS totale_pagamenti,
                COALESCE(pending.pending_residuo, 0) AS pending_residuo,
                COALESCE(pending.has_pending_unassigned, 0) AS has_pending_unassigned,
                COALESCE(f.totale_fatturato, 0) - (COALESCE(p.totale_pagamenti, 0) + COALESCE(pending.pending_residuo, 0)) AS saldo_residuo
            FROM tb_anagrafiche a
            LEFT JOIN (
                SELECT
                    id_anagrafica,
                    SUM(totale) AS totale_fatturato,
                    SUM(CASE WHEN id_stato_fatt = 4 THEN totale ELSE 0 END) AS totale_pagato
                FROM tb_fatture
                GROUP BY id_anagrafica
            ) f ON f.id_anagrafica = a.id_anagrafica
            LEFT JOIN (
                SELECT
                    t.id_anagrafica,
                    SUM(p.importo) AS totale_pagamenti
                FROM appoggio_pagamenti_fattura p
                INNER JOIN tb_fatture t ON t.id_fattura = p.id_fattura
                GROUP BY t.id_anagrafica
            ) p ON p.id_anagrafica = a.id_anagrafica
            LEFT JOIN (
                SELECT
                    id_anagrafica_hint,
                    SUM(GREATEST(COALESCE(importo_totale, 0) - COALESCE(importo_allocato, 0), 0)) AS pending_residuo,
                    MAX(CASE WHEN (COALESCE(importo_totale, 0) - COALESCE(importo_allocato, 0)) > 0.009 THEN 1 ELSE 0 END) AS has_pending_unassigned
                FROM tb_pagamenti
                WHERE id_anagrafica_hint IS NOT NULL
                GROUP BY id_anagrafica_hint
            ) pending ON pending.id_anagrafica_hint = a.id_anagrafica
            WHERE a.is_active = 1
        SQL;

        $params = [];
        if ($allowed !== null) {
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $key = ':allowed_' . $index;
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $sql .= ' AND a.id_anagrafica IN (' . implode(',', $placeholders) . ')';
        }
        if ($term !== '') {
            $like = '%' . $term . '%';
            $sql .= ' AND (a.ragione_sociale LIKE :term_nome OR a.piva LIKE :term_piva OR a.codice_fiscale LIKE :term_cf)';
            $params[':term_nome'] = $like;
            $params[':term_piva'] = $like;
            $params[':term_cf'] = $like;
        }

        $sql .= ' ORDER BY saldo_residuo DESC, a.ragione_sociale ASC LIMIT ' . $limit;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_anagrafica' => (int) $row['id_anagrafica'],
                'ragione_sociale' => $row['ragione_sociale'] ?? '',
                'piva' => $row['piva'] ?? null,
                'codice_fiscale' => $row['codice_fiscale'] ?? null,
                'totale_fatturato' => (float) $row['totale_fatturato'],
                'totale_pagato' => (float) $row['totale_pagamenti'],
                'totale_fatture_pagata' => (float) $row['totale_fatture_pagato'],
                'saldo_residuo' => (float) $row['saldo_residuo'],
                'pending_residuo' => (float) ($row['pending_residuo'] ?? 0),
                'has_pending_unassigned' => ((int) ($row['has_pending_unassigned'] ?? 0)) === 1,
            ];
        }

        return $items;
    }

    /**
     * @return list<array{id_anagrafica:int, ragione_sociale:string, saldo_residuo:float, totale_fatturato:float}>
     */
    public function listTopClientsByBalance(int $limit = 5, ?array $allowedAnagrafiche = null): array
    {
        $rows = $this->listLedger(null, $limit, $allowedAnagrafiche);
        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id_anagrafica' => (int) ($row['id_anagrafica'] ?? 0),
                'ragione_sociale' => (string) ($row['ragione_sociale'] ?? ''),
                'saldo_residuo' => (float) ($row['saldo_residuo'] ?? 0),
                'totale_fatturato' => (float) ($row['totale_fatturato'] ?? 0),
            ];
        }
        return $out;
    }

    /**
     * Lista pagamenti registrati.
     *
     * @param array<string,mixed> $filters
     * @return list<array<string,mixed>>
     */
    public function listPagamenti(array $filters = []): array
    {
        $assignedWhere = [];
        $pendingWhere = [];
        $params = [];
        $onlyOpenPending = !empty($filters['pending_only_open']);

        if (!empty($filters['allowed_anagrafiche']) && is_array($filters['allowed_anagrafiche'])) {
            $allowed = array_values(array_filter(array_map('intval', $filters['allowed_anagrafiche']), static fn($id) => $id > 0));
            if ($allowed === []) {
                return [];
            }
            $assignedPlaceholders = [];
            $pendingPlaceholders = [];
            foreach ($allowed as $index => $id) {
                $assignedKey = ':allowed_a_' . $index;
                $pendingKey = ':allowed_p_' . $index;
                $assignedPlaceholders[] = $assignedKey;
                $pendingPlaceholders[] = $pendingKey;
                $params[$assignedKey] = $id;
                $params[$pendingKey] = $id;
            }
            $assignedWhere[] = 'f.id_anagrafica IN (' . implode(',', $assignedPlaceholders) . ')';
            $pendingWhere[] = 'pag.id_anagrafica_hint IN (' . implode(',', $pendingPlaceholders) . ')';
        }

        if (!empty($filters['id_anagrafica'])) {
            $assignedWhere[] = 'f.id_anagrafica = :id_anagrafica_a';
            $pendingWhere[] = 'pag.id_anagrafica_hint = :id_anagrafica_p';
            $params[':id_anagrafica_a'] = (int) $filters['id_anagrafica'];
            $params[':id_anagrafica_p'] = (int) $filters['id_anagrafica'];
        }
        if (!empty($filters['date_from'])) {
            $assignedWhere[] = 'p.data_pagamento >= :date_from_a';
            $pendingWhere[] = 'pag.data_pagamento >= :date_from_p';
            $params[':date_from_a'] = $filters['date_from'];
            $params[':date_from_p'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $assignedWhere[] = 'p.data_pagamento <= :date_to_a';
            $pendingWhere[] = 'pag.data_pagamento <= :date_to_p';
            $params[':date_to_a'] = $filters['date_to'];
            $params[':date_to_p'] = $filters['date_to'];
        }
        if (!empty($filters['q'])) {
            $term = '%' . trim((string) $filters['q']) . '%';
            $assignedWhere[] = '('
                . 'a.ragione_sociale LIKE :term_cliente_a '
                . 'OR f.numero_documento LIKE :term_numero_a '
                . 'OR CAST(f.anno AS CHAR) LIKE :term_anno_a '
                . 'OR p.note LIKE :term_note_a'
                . ')';
            $pendingWhere[] = '('
                . 'pag.cliente_nome_hint LIKE :term_cliente_p '
                . 'OR pag.reference LIKE :term_numero_p '
                . 'OR pag.note LIKE :term_note_p'
                . ')';
            $params[':term_cliente_a'] = $term;
            $params[':term_numero_a'] = $term;
            $params[':term_anno_a'] = $term;
            $params[':term_note_a'] = $term;
            $params[':term_cliente_p'] = $term;
            $params[':term_numero_p'] = $term;
            $params[':term_note_p'] = $term;
        }

        $assignedSql = <<<'SQL'
            SELECT
                p.id_pag_fattura,
                p.id_fattura,
                p.id_metodo,
                p.id_mp,
                p.data_pagamento,
                p.importo,
                p.importo_documento,
                p.import_uid,
                p.note,
                f.numero_documento,
                f.anno,
                f.totale,
                f.data_fattura,
                f.saldo,
                a.id_anagrafica,
                a.ragione_sociale,
                a.piva,
                mp.code AS mp_code,
                mp.label AS mp_label,
                mt.code AS metodo_code,
                mt.label AS metodo_label,
                agg.totale_importato AS aggregato_totale_importo,
                agg.totale_documento AS aggregato_importo_documento,
                'assigned' AS source,
                NULL AS pending_importo_totale,
                NULL AS pending_importo_allocato,
                NULL AS pending_allocato_calcolato,
                NULL AS pending_cliente_hint,
                NULL AS pending_id_anagrafica,
                NULL AS pending_reference,
                p.id_pagamento AS pending_source_id
            FROM appoggio_pagamenti_fattura p
            LEFT JOIN tb_fatture f ON f.id_fattura = p.id_fattura
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = p.id_mp
            LEFT JOIN cfg_metodi_pagamento mt ON mt.id_metodo = p.id_metodo
            LEFT JOIN (
                SELECT
                    import_uid,
                    SUM(importo) AS totale_importato,
                    MAX(importo_documento) AS totale_documento
                FROM appoggio_pagamenti_fattura
                WHERE import_uid IS NOT NULL
                GROUP BY import_uid
            ) agg ON agg.import_uid = p.import_uid
        SQL;

        if ($assignedWhere) {
            $assignedSql .= ' WHERE ' . implode(' AND ', $assignedWhere);
        }

        $pendingSql = <<<'SQL'
            SELECT
                pag.id_pagamento AS id_pag_fattura,
                NULL AS id_fattura,
                pag.id_metodo,
                pag.id_mp,
                pag.data_pagamento,
                NULL AS importo,
                pag.importo_totale AS importo_documento,
                pag.import_uid,
                pag.note,
                NULL AS numero_documento,
                NULL AS anno,
                NULL AS totale,
                NULL AS data_fattura,
                NULL AS saldo,
                pag.id_anagrafica_hint AS id_anagrafica,
                pag.cliente_nome_hint AS ragione_sociale,
                NULL AS piva,
                mp.code AS mp_code,
                mp.label AS mp_label,
                mt.code AS metodo_code,
                mt.label AS metodo_label,
                NULL AS aggregato_totale_importo,
                NULL AS aggregato_importo_documento,
                'pending' AS source,
                pag.importo_totale AS pending_importo_totale,
                pag.importo_allocato AS pending_importo_allocato,
                pend_alloc.totale_allocato AS pending_allocato_calcolato,
                pag.cliente_nome_hint AS pending_cliente_hint,
                pag.id_anagrafica_hint AS pending_id_anagrafica,
                pag.reference AS pending_reference,
                pag.id_pagamento AS pending_source_id
            FROM tb_pagamenti pag
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = pag.id_mp
            LEFT JOIN cfg_metodi_pagamento mt ON mt.id_metodo = pag.id_metodo
            LEFT JOIN (
                SELECT
                    id_pagamento,
                    COALESCE(SUM(importo), 0) AS totale_allocato
                FROM appoggio_pagamenti_fattura
                WHERE id_pagamento IS NOT NULL
                GROUP BY id_pagamento
            ) pend_alloc ON pend_alloc.id_pagamento = pag.id_pagamento
SQL;

        $pendingConditions = $pendingWhere ?: [];
        if ($onlyOpenPending) {
            $pendingConditions[] = '(pag.importo_totale - pag.importo_allocato) > 0.009';
        }
        if ($pendingConditions) {
            $pendingSql .= ' WHERE ' . implode(' AND ', $pendingConditions);
        }

        $sql = $assignedSql . ' UNION ALL ' . $pendingSql . ' ORDER BY COALESCE(data_pagamento, id_pag_fattura) DESC, id_pag_fattura DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = $this->mapPagamentoRow($row);
        }

        return $items;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function fetchPagamento(int $id): ?array
    {
        $sql = <<<'SQL'
            SELECT
                p.id_pag_fattura,
                p.id_fattura,
                p.id_metodo,
                p.id_mp,
                p.data_pagamento,
                p.importo,
                p.importo_documento,
                p.import_uid,
                p.note,
                f.numero_documento,
                f.anno,
                f.totale,
                f.saldo,
                f.data_fattura,
                a.id_anagrafica,
                a.ragione_sociale,
                a.piva,
                mp.code AS mp_code,
                mp.label AS mp_label,
                mt.code AS metodo_code,
                mt.label AS metodo_label,
                agg.totale_importato AS aggregato_totale_importo,
                agg.totale_documento AS aggregato_importo_documento
            FROM appoggio_pagamenti_fattura p
            LEFT JOIN tb_fatture f ON f.id_fattura = p.id_fattura
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = p.id_mp
            LEFT JOIN cfg_metodi_pagamento mt ON mt.id_metodo = p.id_metodo
            LEFT JOIN (
                SELECT
                    import_uid,
                    SUM(importo) AS totale_importato,
                    MAX(importo_documento) AS totale_documento
                FROM appoggio_pagamenti_fattura
                WHERE import_uid IS NOT NULL
                GROUP BY import_uid
            ) agg ON agg.import_uid = p.import_uid
            WHERE p.id_pag_fattura = :id
            LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return $this->fetchPendingPagamentoDetail($id);
        }

        $detail = $this->mapPagamentoRow($row);
        $detail['staging'] = false;

        $importUid = isset($detail['import_uid']) ? (string) $detail['import_uid'] : '';
        if ($importUid !== '') {
            $assignments = $this->fetchAllocazioniByImportUid($importUid);
        } else {
            $assignments = [$detail];
        }
        if (empty($assignments)) {
            $assignments = [$detail];
        }

        $detail['assegnazioni'] = $assignments;
        $detail['assegnazioni_stats'] = $this->buildAllocazioniStats($assignments);

        return $detail;
    }

    /**
     * @param array<string,mixed> $criteria
     * @return array{match:?array<string,mixed>,warnings:list<string>}
     */
    public function resolveInvoiceForRow(array $criteria): array
    {
        $warnings = [];

        if (!empty($criteria['id_fattura'])) {
            $detail = $this->fetchInvoiceSummary((int) $criteria['id_fattura']);
            if ($detail !== null) {
                return ['match' => $detail, 'warnings' => $warnings];
            }
            $warnings[] = 'Fattura specificata non trovata.';
        }

        $numero = $criteria['numero_fattura'] ?? null;
        $anno = $criteria['fattura_anno'] ?? null;
        $cliente = $criteria['cliente_nome'] ?? null;
        if ($numero !== null && $anno !== null) {
            $params = [
                ':numero' => (int) $numero,
                ':anno' => (int) $anno,
            ];
            $sql = 'SELECT f.id_fattura FROM tb_fatture f INNER JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica WHERE f.numero_documento = :numero AND f.anno = :anno';
            if ($cliente) {
                $sql .= ' AND a.ragione_sociale LIKE :cliente';
                $params[':cliente'] = '%' . $cliente . '%';
            }
            $sql .= ' ORDER BY f.id_fattura DESC LIMIT 1';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row !== false) {
                $detail = $this->fetchInvoiceSummary((int) $row['id_fattura']);
                if ($detail !== null) {
                    return ['match' => $detail, 'warnings' => $warnings];
                }
            }
        }

        if ($cliente !== null && $cliente !== '') {
            $stmt = $this->pdo->prepare(
                'SELECT id_anagrafica FROM tb_anagrafiche WHERE ragione_sociale LIKE :cliente ORDER BY id_anagrafica LIMIT 1'
            );
            $stmt->execute([':cliente' => '%' . $cliente . '%']);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row !== false) {
                return [
                    'match' => [
                        'id_fattura' => null,
                        'id_anagrafica' => (int) $row['id_anagrafica'],
                        'cliente' => $cliente,
                        'ragione_sociale' => $cliente,
                    ],
                    'warnings' => $warnings,
                ];
            }
        }

        $note = isset($criteria['note']) ? (string) $criteria['note'] : '';
        if ($note !== '') {
            $softClient = $this->resolveAnagraficaByNoteSoft($note);
            if ($softClient !== null) {
                return [
                    'match' => [
                        'id_fattura' => null,
                        'id_anagrafica' => (int) $softClient['id_anagrafica'],
                        'cliente' => $softClient['ragione_sociale'],
                        'ragione_sociale' => $softClient['ragione_sociale'],
                    ],
                    'warnings' => $warnings,
                ];
            }
        }

        return ['match' => null, 'warnings' => $warnings];
    }

    /**
     * Query di supporto per suggerire fatture.
     *
     * @param array<string,mixed> $filters
     * @return list<array<string,mixed>>
     */
    public function searchFatture(array $filters = []): array
    {
        $limit = isset($filters['limit']) ? max(1, min((int) $filters['limit'], 200)) : 50;
        $where = [];
        $params = [];

        if (!empty($filters['id_anagrafica'])) {
            $where[] = 'f.id_anagrafica = :id_anagrafica';
            $params[':id_anagrafica'] = (int) $filters['id_anagrafica'];
        }
        if (!empty($filters['allowed_anagrafiche']) && is_array($filters['allowed_anagrafiche'])) {
            $allowed = array_values(array_filter(array_map('intval', $filters['allowed_anagrafiche']), static fn ($id) => $id > 0));
            if ($allowed === []) {
                return [];
            }
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $key = ':allowed_' . $index;
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $where[] = 'f.id_anagrafica IN (' . implode(',', $placeholders) . ')';
        }
        if (!empty($filters['q'])) {
            $term = '%' . trim((string) $filters['q']) . '%';
            $where[] = '('
                . 'a.ragione_sociale LIKE :term_cliente '
                . 'OR f.numero_documento LIKE :term_numero '
                . 'OR CAST(f.anno AS CHAR) LIKE :term_anno'
                . ')';
            $params[':term_cliente'] = $term;
            $params[':term_numero'] = $term;
            $params[':term_anno'] = $term;
        }
        if (!empty($filters['solo_aperti'])) {
            $where[] = '(f.saldo IS NULL OR f.saldo > 0)';
        }

        $sql = <<<'SQL'
            SELECT
                f.id_fattura,
                f.numero_documento,
                f.anno,
                f.data_fattura,
                f.totale,
                f.saldo,
                a.id_anagrafica,
                a.ragione_sociale
            FROM tb_fatture f
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
        SQL;

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY COALESCE(f.data_fattura, f.created_at) DESC, f.id_fattura DESC LIMIT ' . $limit;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'id_fattura' => (int) $row['id_fattura'],
                'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
                'anno' => isset($row['anno']) ? (int) $row['anno'] : null,
                'totale' => isset($row['totale']) ? (float) $row['totale'] : null,
                'saldo' => isset($row['saldo']) ? (float) $row['saldo'] : null,
                'data_fattura' => $row['data_fattura'] ?? null,
                'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
                'ragione_sociale' => $row['ragione_sociale'] ?? null,
            ];
        }

        return $items;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchInvoiceSummary(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT f.id_fattura, f.numero_documento, f.anno, f.totale, f.saldo, f.data_fattura, f.id_anagrafica, a.ragione_sociale
             FROM tb_fatture f
             LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
             WHERE f.id_fattura = :id
             LIMIT 1'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return [
            'id_fattura' => (int) $row['id_fattura'],
            'numero_documento' => isset($row['numero_documento']) ? (int) $row['numero_documento'] : null,
            'anno' => isset($row['anno']) ? (int) $row['anno'] : null,
            'totale' => isset($row['totale']) ? (float) $row['totale'] : null,
            'saldo' => isset($row['saldo']) ? (float) $row['saldo'] : null,
            'data_fattura' => $row['data_fattura'] ?? null,
            'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
            'ragione_sociale' => $row['ragione_sociale'] ?? null,
        ];
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function mapPagamentoRow(array $row): array
    {
        $source = $row['source'] ?? 'assigned';

        if ($source === 'pending') {
            $importoDocumento = isset($row['pending_importo_totale']) ? (float) $row['pending_importo_totale'] : (isset($row['importo_documento']) ? (float) $row['importo_documento'] : null);
            $calcolato = isset($row['pending_allocato_calcolato']) ? (float) $row['pending_allocato_calcolato'] : null;
            $allocato = $calcolato !== null ? $calcolato : (isset($row['pending_importo_allocato']) ? (float) $row['pending_importo_allocato'] : 0.0);
            if ($allocato < 0) {
                $allocato = 0.0;
            }
            $residuoPagamento = $importoDocumento !== null ? round($importoDocumento - $allocato, 2) : null;
            if ($residuoPagamento !== null && $residuoPagamento < 0) {
                $residuoPagamento = 0.0;
            }

            return [
                'id_pagamento' => (int) $row['id_pag_fattura'],
                'id_fattura' => null,
                'id_metodo' => isset($row['id_metodo']) ? (int) $row['id_metodo'] : null,
                'id_mp' => isset($row['id_mp']) ? (int) $row['id_mp'] : null,
                'data_pagamento' => $row['data_pagamento'] ?? null,
                'importo' => $importoDocumento,
                'importo_documento' => $importoDocumento,
                'import_uid' => $row['import_uid'] ?? null,
                'residuo_pagamento' => $residuoPagamento,
                'note' => $row['note'] ?? null,
                'id_anagrafica' => isset($row['pending_id_anagrafica']) ? (int) $row['pending_id_anagrafica'] : null,
                'cliente' => $row['pending_cliente_hint'] ?? $row['ragione_sociale'] ?? null,
                'piva' => $row['piva'] ?? null,
                'fattura_display' => null,
                'fattura_numero' => null,
                'fattura_anno' => null,
                'fattura_totale' => null,
                'fattura_saldo' => null,
                'modalita_code' => $row['mp_code'] ?? null,
                'modalita_label' => $row['mp_label'] ?? null,
                'metodo_code' => $row['metodo_code'] ?? null,
                'metodo_label' => $row['metodo_label'] ?? null,
                'fattura_data' => null,
                'reference' => $row['pending_reference'] ?? null,
                'staging' => true,
                'importo_totale' => $importoDocumento,
                'importo_allocato' => $allocato,
            ];
        }

        $numero = isset($row['numero_documento']) ? (int) $row['numero_documento'] : null;
        $anno = isset($row['anno']) ? (int) $row['anno'] : null;
        $fatturaDisplay = null;
        if ($numero !== null && $anno !== null) {
            $fatturaDisplay = sprintf('%d/%d', $anno, $numero);
        } elseif ($numero !== null) {
            $fatturaDisplay = (string) $numero;
        }

        $importo = isset($row['importo']) ? (float) $row['importo'] : null;
        $importoDocumento = isset($row['importo_documento']) ? (float) $row['importo_documento'] : null;
        $aggregatoTotale = isset($row['aggregato_totale_importo']) ? (float) $row['aggregato_totale_importo'] : null;
        $aggregatoDocumento = isset($row['aggregato_importo_documento']) ? (float) $row['aggregato_importo_documento'] : null;
        $pendingTotal = isset($row['pending_importo_totale']) ? (float) $row['pending_importo_totale'] : null;
        $pendingAllocato = isset($row['pending_importo_allocato']) ? (float) $row['pending_importo_allocato'] : null;
        $residuoPagamento = null;

        if ($pendingTotal !== null) {
            $residuoPagamento = round($pendingTotal - ($pendingAllocato ?? 0.0), 2);
        } elseif ($aggregatoDocumento !== null) {
            $residuoPagamento = round($aggregatoDocumento - ($aggregatoTotale ?? 0.0), 2);
        } elseif ($importoDocumento !== null) {
            $residuoPagamento = round($importoDocumento - ($importo ?? 0), 2);
        }
        if ($residuoPagamento !== null && $residuoPagamento < 0) {
            $residuoPagamento = 0.0;
        }

        $displayImporto = $importo;
        if (($displayImporto === null || $displayImporto <= 0) && ($row['id_fattura'] ?? null) === null && $importoDocumento !== null) {
            $displayImporto = $importoDocumento;
        }

        return [
            'id_pagamento' => (int) $row['id_pag_fattura'],
            'id_fattura' => isset($row['id_fattura']) ? (int) $row['id_fattura'] : null,
            'id_metodo' => isset($row['id_metodo']) ? (int) $row['id_metodo'] : null,
            'id_mp' => isset($row['id_mp']) ? (int) $row['id_mp'] : null,
            'data_pagamento' => $row['data_pagamento'] ?? null,
            'importo' => $displayImporto,
            'importo_documento' => $importoDocumento ?? $pendingTotal,
            'import_uid' => $row['import_uid'] ?? null,
            'residuo_pagamento' => $residuoPagamento,
            'note' => $row['note'] ?? null,
            'id_anagrafica' => isset($row['id_anagrafica']) && $row['id_anagrafica'] !== null
                ? (int) $row['id_anagrafica']
                : (isset($row['pending_id_anagrafica']) ? (int) $row['pending_id_anagrafica'] : null),
            'cliente' => $row['ragione_sociale'] ?? $row['pending_cliente_hint'] ?? null,
            'piva' => $row['piva'] ?? null,
            'fattura_display' => $fatturaDisplay,
            'fattura_numero' => $numero,
            'fattura_anno' => $anno,
            'fattura_totale' => isset($row['totale']) ? (float) $row['totale'] : null,
            'fattura_saldo' => isset($row['saldo']) ? (float) $row['saldo'] : null,
            'modalita_code' => $row['mp_code'] ?? null,
            'modalita_label' => $row['mp_label'] ?? null,
            'metodo_code' => $row['metodo_code'] ?? null,
            'metodo_label' => $row['metodo_label'] ?? null,
            'fattura_data' => $row['data_fattura'] ?? null,
            'reference' => $row['pending_reference'] ?? null,
            'staging' => false,
            'importo_totale' => $importoDocumento ?? $pendingTotal ?? $displayImporto,
            'importo_allocato' => $pendingAllocato ?? $aggregatoTotale ?? $importo,
        ];
    }

    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function createPendingPayment(array $data): array
    {
        $idModalita = isset($data['id_mp']) ? (int) $data['id_mp'] : 0;
        if ($idModalita <= 0) {
            throw new RuntimeException('Selezionare una modalita di pagamento SdI valida.', 422);
        }

        $idMetodo = isset($data['id_metodo']) ? (int) $data['id_metodo'] : null;
        if ($idMetodo !== null && $idMetodo <= 0) {
            $idMetodo = null;
        }

        $importoDocumentoRaw = $data['importo_documento'] ?? null;
        if (!is_numeric($importoDocumentoRaw)) {
            throw new RuntimeException('Specificare un importo totale valido per il pagamento importato.', 422);
        }
        $importoDocumento = round((float) $importoDocumentoRaw, 2);
        if ($importoDocumento <= 0) {
            throw new RuntimeException('L\'importo totale del pagamento deve essere maggiore di zero.', 422);
        }

        $importUid = isset($data['import_uid']) ? trim((string) $data['import_uid']) : '';
        if ($importUid === '') {
            $importUid = $this->generateImportUid();
        }

        $note = isset($data['note']) ? trim((string) $data['note']) : null;
        if ($note === '') {
            $note = null;
        }

        $reference = isset($data['reference']) ? trim((string) $data['reference']) : null;
        if ($reference === '') {
            $reference = null;
        }

        $clienteHint = isset($data['cliente_hint']) ? trim((string) $data['cliente_hint']) : null;
        if ($clienteHint === '') {
            $clienteHint = null;
        }

        $clienteIdHint = isset($data['id_anagrafica_hint']) ? (int) $data['id_anagrafica_hint'] : null;
        if ($clienteIdHint !== null && $clienteIdHint <= 0) {
            $clienteIdHint = null;
        }

        $dateValue = $this->normalizeDate(isset($data['data_pagamento']) ? (string) $data['data_pagamento'] : null);

        $stmt = $this->pdo->prepare(
            'INSERT INTO tb_pagamenti (import_uid, reference, data_pagamento, importo_totale, importo_allocato, id_metodo, id_mp, note, id_anagrafica_hint, cliente_nome_hint)
             VALUES (:import_uid, :reference, :data_pagamento, :importo_totale, 0, :id_metodo, :id_mp, :note, :id_anagrafica_hint, :cliente_nome_hint)'
        );
        $stmt->bindValue(':import_uid', $importUid, PDO::PARAM_STR);
        if ($reference !== null) {
            $stmt->bindValue(':reference', $reference, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':reference', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':data_pagamento', $dateValue, PDO::PARAM_STR);
        $stmt->bindValue(':importo_totale', number_format($importoDocumento, 2, '.', ''), PDO::PARAM_STR);
        if ($idMetodo !== null) {
            $stmt->bindValue(':id_metodo', $idMetodo, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_metodo', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':id_mp', $idModalita, PDO::PARAM_INT);
        if ($note !== null) {
            $stmt->bindValue(':note', $note, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':note', null, PDO::PARAM_NULL);
        }
        if ($clienteIdHint !== null) {
            $stmt->bindValue(':id_anagrafica_hint', $clienteIdHint, PDO::PARAM_INT);
        } else {
            $stmt->bindValue(':id_anagrafica_hint', null, PDO::PARAM_NULL);
        }
        if ($clienteHint !== null) {
            $stmt->bindValue(':cliente_nome_hint', $clienteHint, PDO::PARAM_STR);
        } else {
            $stmt->bindValue(':cliente_nome_hint', null, PDO::PARAM_NULL);
        }

        $stmt->execute();

        $pending = $this->fetchPendingPagamentoDetail((int) $this->pdo->lastInsertId());
        if ($pending === null) {
            throw new RuntimeException('Impossibile ricaricare il pagamento importato.', 500);
        }

        return $pending;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function fetchAllocazioniByImportUid(string $importUid): array
    {
        if ($importUid === '') {
            return [];
        }

        $sql = <<<'SQL'
            SELECT
                p.id_pag_fattura,
                p.id_fattura,
                p.id_metodo,
                p.id_mp,
                p.data_pagamento,
                p.importo,
                p.importo_documento,
                p.import_uid,
                p.note,
                f.numero_documento,
                f.anno,
                f.totale,
                f.data_fattura,
                f.saldo,
                a.id_anagrafica,
                a.ragione_sociale,
                a.piva,
                mp.code AS mp_code,
                mp.label AS mp_label,
                mt.code AS metodo_code,
                mt.label AS metodo_label,
                agg.totale_importato AS aggregato_totale_importo,
                agg.totale_documento AS aggregato_importo_documento,
                'assigned' AS source,
                NULL AS pending_importo_totale,
                NULL AS pending_importo_allocato,
                NULL AS pending_cliente_hint,
                NULL AS pending_id_anagrafica,
                NULL AS pending_reference,
                p.id_pagamento AS pending_source_id
            FROM appoggio_pagamenti_fattura p
            LEFT JOIN tb_fatture f ON f.id_fattura = p.id_fattura
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = p.id_mp
            LEFT JOIN cfg_metodi_pagamento mt ON mt.id_metodo = p.id_metodo
            LEFT JOIN (
                SELECT
                    import_uid,
                    SUM(importo) AS totale_importato,
                    MAX(importo_documento) AS totale_documento
                FROM appoggio_pagamenti_fattura
                WHERE import_uid IS NOT NULL
                GROUP BY import_uid
            ) agg ON agg.import_uid = p.import_uid
            WHERE p.import_uid = :import_uid
            ORDER BY COALESCE(p.data_pagamento, p.id_pag_fattura) DESC, p.id_pag_fattura DESC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':import_uid', $importUid, PDO::PARAM_STR);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = $this->mapPagamentoRow($row);
        }

        return $items;
    }

    /**
     * @param list<array<string,mixed>> $allocazioni
     * @return array{totale:float|null,allocato:float|null,residuo:float|null}
     */
    private function buildAllocazioniStats(array $allocazioni): array
    {
        $totale = null;
        $allocato = 0.0;
        foreach ($allocazioni as $entry) {
            if (isset($entry['importo_documento']) && $entry['importo_documento'] !== null && $totale === null) {
                $totale = (float) $entry['importo_documento'];
            }
            if (isset($entry['importo']) && $entry['importo'] !== null) {
                $allocato += (float) $entry['importo'];
            }
        }

        $allocato = round($allocato, 2);
        $allocatoValue = $allocato;
        if ($totale === null && $allocatoValue === 0.0) {
            $allocatoValue = null;
        }

        $residuo = null;
        if ($totale !== null) {
            $residuo = round($totale - $allocato, 2);
            if ($residuo < 0) {
                $residuo = 0.0;
            }
        }

        return [
            'totale' => $totale,
            'allocato' => $allocatoValue,
            'residuo' => $residuo,
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchPendingPagamentoDetail(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT
                pag.id_pagamento,
                pag.import_uid,
                pag.reference,
                pag.data_pagamento,
                pag.importo_totale,
                pag.importo_allocato,
                pag.id_metodo,
                pag.id_mp,
                pag.note,
                pag.id_anagrafica_hint,
                pag.cliente_nome_hint,
                a.ragione_sociale AS cliente_ragione_sociale,
                a.piva AS cliente_piva,
                mp.code AS mp_code,
                mp.label AS mp_label,
                mt.code AS metodo_code,
                mt.label AS metodo_label
             FROM tb_pagamenti pag
             LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = pag.id_anagrafica_hint
             LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = pag.id_mp
             LEFT JOIN cfg_metodi_pagamento mt ON mt.id_metodo = pag.id_metodo
             WHERE pag.id_pagamento = :id
             LIMIT 1'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        $assignments = $this->fetchAllocazioniByPagamentoId((int) $row['id_pagamento']);
        $importoTotale = isset($row['importo_totale']) ? (float) $row['importo_totale'] : null;
        $storedAllocato = isset($row['importo_allocato']) ? (float) $row['importo_allocato'] : 0.0;
        $calculatedAllocato = 0.0;
        foreach ($assignments as $assignment) {
            if (isset($assignment['importo']) && $assignment['importo'] !== null) {
                $calculatedAllocato += (float) $assignment['importo'];
            }
        }
        $calculatedAllocato = round($calculatedAllocato, 2);
        $allocatoEffettivo = $calculatedAllocato > 0 ? $calculatedAllocato : $storedAllocato;
        if ($allocatoEffettivo < 0) {
            $allocatoEffettivo = 0.0;
        }

        $residuo = $importoTotale !== null ? round($importoTotale - $allocatoEffettivo, 2) : null;
        if ($residuo !== null && $residuo < 0) {
            $residuo = 0.0;
        }

        return [
            'id_pagamento' => (int) $row['id_pagamento'],
            'id_fattura' => null,
            'id_metodo' => isset($row['id_metodo']) ? (int) $row['id_metodo'] : null,
            'id_mp' => isset($row['id_mp']) ? (int) $row['id_mp'] : null,
            'data_pagamento' => $row['data_pagamento'] ?? null,
            'importo' => null,
            'importo_documento' => isset($row['importo_totale']) ? (float) $row['importo_totale'] : null,
            'importo_allocato' => $allocatoEffettivo,
            'import_uid' => $row['import_uid'] ?? null,
            'residuo_pagamento' => $residuo,
            'note' => $row['note'] ?? null,
                'id_anagrafica' => isset($row['id_anagrafica_hint']) ? (int) $row['id_anagrafica_hint'] : null,
                'cliente' => $row['cliente_ragione_sociale'] ?? $row['cliente_nome_hint'] ?? null,
                'piva' => $row['cliente_piva'] ?? null,
            'fattura_display' => null,
            'fattura_numero' => null,
            'fattura_anno' => null,
            'fattura_totale' => null,
            'fattura_saldo' => null,
            'modalita_code' => $row['mp_code'] ?? null,
            'modalita_label' => $row['mp_label'] ?? null,
            'metodo_code' => $row['metodo_code'] ?? null,
            'metodo_label' => $row['metodo_label'] ?? null,
            'fattura_data' => null,
            'reference' => $row['reference'] ?? null,
            'staging' => true,
            'assegnazioni' => $assignments ?: [],
            'assegnazioni_stats' => [
                'totale' => $importoTotale,
                'allocato' => $allocatoEffettivo,
                'residuo' => $residuo,
            ],
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function fetchAllocazioniByPagamentoId(int $id): array
    {
        $sql = <<<'SQL'
            SELECT
                p.id_pag_fattura,
                p.id_fattura,
                p.id_metodo,
                p.id_mp,
                p.data_pagamento,
                p.importo,
                p.importo_documento,
                p.import_uid,
                p.note,
                f.numero_documento,
                f.anno,
                f.totale,
                f.data_fattura,
                f.saldo,
                a.id_anagrafica,
                a.ragione_sociale,
                a.piva,
                mp.code AS mp_code,
                mp.label AS mp_label,
                mt.code AS metodo_code,
                mt.label AS metodo_label,
                NULL AS aggregato_totale_importo,
                NULL AS aggregato_importo_documento,
                'assigned' AS source,
                NULL AS pending_importo_totale,
                NULL AS pending_importo_allocato,
                NULL AS pending_cliente_hint,
                NULL AS pending_id_anagrafica,
                NULL AS pending_reference,
                p.id_pagamento AS pending_source_id
            FROM appoggio_pagamenti_fattura p
            LEFT JOIN tb_fatture f ON f.id_fattura = p.id_fattura
            LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            LEFT JOIN cfg_sdi_modalita_pagamento mp ON mp.id_modalita = p.id_mp
            LEFT JOIN cfg_metodi_pagamento mt ON mt.id_metodo = p.id_metodo
            WHERE p.id_pagamento = :id
            ORDER BY COALESCE(p.data_pagamento, p.id_pag_fattura) DESC, p.id_pag_fattura DESC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $items = [];
        foreach ($rows as $row) {
            $items[] = $this->mapPagamentoRow($row);
        }

        return $items;
    }

    /**
     * @return array<string,mixed>
     */
    public function assignPendingPaymentToAnagrafica(int $idPagamento, ?int $idAnagrafica): array
    {
        if ($idPagamento <= 0) {
            throw new RuntimeException('ID pagamento non valido per l\'assegnazione del cliente.', 422);
        }

        $checkStmt = $this->pdo->prepare('SELECT id_pagamento FROM tb_pagamenti WHERE id_pagamento = :id LIMIT 1');
        $checkStmt->bindValue(':id', $idPagamento, PDO::PARAM_INT);
        $checkStmt->execute();
        if ($checkStmt->fetch(PDO::FETCH_ASSOC) === false) {
            throw new RuntimeException('Pagamento non trovato per l\'assegnazione del cliente.', 404);
        }

        $ragioneSociale = null;
        if ($idAnagrafica !== null && $idAnagrafica > 0) {
            $clienteStmt = $this->pdo->prepare('SELECT ragione_sociale FROM tb_anagrafiche WHERE id_anagrafica = :id LIMIT 1');
            $clienteStmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
            $clienteStmt->execute();
            $clienteRow = $clienteStmt->fetch(PDO::FETCH_ASSOC);
            if ($clienteRow === false) {
                throw new RuntimeException('Cliente selezionato non trovato.', 404);
            }
            $ragioneSociale = $clienteRow['ragione_sociale'] ?? null;
        } else {
            $idAnagrafica = null;
        }

        $updateStmt = $this->pdo->prepare(
            'UPDATE tb_pagamenti
             SET id_anagrafica_hint = :id_anagrafica, cliente_nome_hint = :cliente_nome
             WHERE id_pagamento = :id
             LIMIT 1'
        );
        if ($idAnagrafica !== null) {
            $updateStmt->bindValue(':id_anagrafica', $idAnagrafica, PDO::PARAM_INT);
        } else {
            $updateStmt->bindValue(':id_anagrafica', null, PDO::PARAM_NULL);
        }
        if ($ragioneSociale !== null) {
            $updateStmt->bindValue(':cliente_nome', $ragioneSociale, PDO::PARAM_STR);
        } else {
            $updateStmt->bindValue(':cliente_nome', null, PDO::PARAM_NULL);
        }
        $updateStmt->bindValue(':id', $idPagamento, PDO::PARAM_INT);
        $updateStmt->execute();

        $detail = $this->fetchPagamento($idPagamento);
        if ($detail === null) {
            throw new RuntimeException('Impossibile ricaricare il pagamento aggiornato.', 500);
        }

        return $detail;
    }

    /**
     * Tenta riassegnazione automatica cliente su pagamento importato da campo note.
     *
     * @return array{updated:bool,data:array<string,mixed>}
     */
    public function tryAutoAssignPendingPaymentByNote(int $idPagamento): array
    {
        if ($idPagamento <= 0) {
            throw new RuntimeException('ID pagamento non valido per riassegnazione.', 422);
        }

        $stmt = $this->pdo->prepare(
            'SELECT id_pagamento, note, id_anagrafica_hint
             FROM tb_pagamenti
             WHERE id_pagamento = :id
             LIMIT 1'
        );
        $stmt->bindValue(':id', $idPagamento, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            throw new RuntimeException('Pagamento non trovato.', 404);
        }

        $note = trim((string) ($row['note'] ?? ''));
        $existingCustomer = isset($row['id_anagrafica_hint']) ? (int) $row['id_anagrafica_hint'] : 0;
        if ($existingCustomer > 0) {
            $detail = $this->fetchPagamento($idPagamento);
            if ($detail === null) {
                throw new RuntimeException('Impossibile ricaricare il pagamento.', 500);
            }
            return ['updated' => false, 'data' => $detail];
        }

        if ($note === '') {
            $detail = $this->fetchPagamento($idPagamento);
            if ($detail === null) {
                throw new RuntimeException('Impossibile ricaricare il pagamento.', 500);
            }
            return ['updated' => false, 'data' => $detail];
        }

        $resolved = $this->resolveAnagraficaByNoteSoft($note);
        if ($resolved === null) {
            $detail = $this->fetchPagamento($idPagamento);
            if ($detail === null) {
                throw new RuntimeException('Impossibile ricaricare il pagamento.', 500);
            }
            return ['updated' => false, 'data' => $detail];
        }

        $updatedDetail = $this->assignPendingPaymentToAnagrafica($idPagamento, (int) $resolved['id_anagrafica']);
        return ['updated' => true, 'data' => $updatedDetail];
    }

    /**
     * Esegue auto-riassegnazione cliente sui pagamenti pending non assegnati
     * sfruttando i pattern appresi dai pagamenti mappati manualmente.
     *
     * @return array{checked:int,updated:int,updated_ids:list<int>}
     */
    public function autoReassignPendingByLearnedMappings(int $limit = 300): array
    {
        $limit = max(1, min($limit, 1000));
        $stmt = $this->pdo->prepare(
            'SELECT id_pagamento, note
             FROM tb_pagamenti
             WHERE id_anagrafica_hint IS NULL
               AND note IS NOT NULL
               AND TRIM(note) <> \'\'
             ORDER BY id_pagamento DESC
             LIMIT ' . $limit
        );
        $stmt->execute();
        $pendingRows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if ($pendingRows === []) {
            return ['checked' => 0, 'updated' => 0, 'updated_ids' => []];
        }

        $trainingRows = $this->fetchTrainingMappingsForAutoAssign();
        $checked = 0;
        $updated = 0;
        $updatedIds = [];

        foreach ($pendingRows as $pending) {
            $checked++;
            $idPagamento = (int) ($pending['id_pagamento'] ?? 0);
            $note = trim((string) ($pending['note'] ?? ''));
            if ($idPagamento <= 0 || $note === '') {
                continue;
            }

            $learned = $this->resolveAnagraficaByLearnedNoteMapping($note, $trainingRows);
            $resolved = $learned ?? $this->resolveAnagraficaByNoteSoft($note);
            if ($resolved === null) {
                continue;
            }

            $this->assignPendingPaymentToAnagrafica($idPagamento, (int) $resolved['id_anagrafica']);
            $updated++;
            $updatedIds[] = $idPagamento;
        }

        return [
            'checked' => $checked,
            'updated' => $updated,
            'updated_ids' => $updatedIds,
        ];
    }

    private function normalizeDate(?string $date): string
    {
        $value = $date !== null && trim($date) !== '' ? trim($date) : 'now';
        try {
            $parsed = new DateTimeImmutable($value);
        } catch (\Throwable $exception) {
            throw new RuntimeException('Data pagamento non valida.', 422, $exception);
        }

        return $parsed->format('Y-m-d');
    }

    private function generateImportUid(): string
    {
        return bin2hex(random_bytes(16));
    }

    /**
     * Tenta una risoluzione "morbida" cliente da nota bonifico.
     *
     * @return array{id_anagrafica:int,ragione_sociale:string}|null
     */
    private function resolveAnagraficaByNoteSoft(string $note): ?array
    {
        $normalizedNote = $this->normalizeSearchText($note);
        $tokens = $this->extractMeaningfulTokens($note);
        if (count($tokens) < 2) {
            return null;
        }

        $stmt = $this->pdo->query(
            'SELECT id_anagrafica, ragione_sociale
             FROM tb_anagrafiche
             WHERE is_active = 1 AND ragione_sociale IS NOT NULL AND ragione_sociale <> \'\''
        );
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        if ($rows === []) {
            return null;
        }

        $best = null;
        $secondScore = 0;
        foreach ($rows as $row) {
            $ragioneSociale = (string) ($row['ragione_sociale'] ?? '');
            if ($ragioneSociale === '') {
                continue;
            }
            $normName = $this->normalizeSearchText($ragioneSociale);
            $leadPhrase = $this->extractLeadingBusinessPhrase($normName);
            $score = 0;
            $longHit = false;
            $prefixHit = false;
            foreach ($tokens as $token) {
                if ($token === '') {
                    continue;
                }
                if (str_contains($normName, $token)) {
                    $score++;
                    if (strlen($token) >= 6) {
                        $longHit = true;
                    }
                }
            }
            if ($leadPhrase !== '' && str_contains($normalizedNote, $leadPhrase)) {
                $score += 3;
                $prefixHit = true;
            }
            if ($score <= 0) {
                continue;
            }

            if ($best === null || $score > $best['score']) {
                $secondScore = $best['score'] ?? 0;
                $best = [
                    'id_anagrafica' => (int) $row['id_anagrafica'],
                    'ragione_sociale' => $ragioneSociale,
                    'score' => $score,
                    'long_hit' => $longHit,
                    'prefix_hit' => $prefixHit,
                ];
                continue;
            }
            if ($score > $secondScore) {
                $secondScore = $score;
            }
        }

        if ($best === null) {
            return null;
        }

        // Soglia minima: almeno 2 match e vantaggio netto sul secondo candidato.
        if ($best['score'] < 2) {
            return null;
        }
        if ($best['score'] === $secondScore) {
            return null;
        }
        if ($best['score'] === 2 && !$best['long_hit'] && !$best['prefix_hit']) {
            return null;
        }

        return [
            'id_anagrafica' => (int) $best['id_anagrafica'],
            'ragione_sociale' => (string) $best['ragione_sociale'],
        ];
    }

    /**
     * @return list<string>
     */
    private function extractMeaningfulTokens(string $input): array
    {
        $normalized = $this->normalizeSearchText($input);
        if ($normalized === '') {
            return [];
        }
        $parts = preg_split('/\s+/', $normalized) ?: [];
        $stopWords = [
            'BONIFICO', 'VOSTRO', 'FAVORE', 'SEPA', 'ISTANTANEO', 'DEL', 'ALLE', 'DA', 'PER',
            'TRN', 'FT', 'FATT', 'FATTURA', 'SALDO', 'ACCONTO', 'DOCUMENTO', 'COMM', 'SPESE',
            'N', 'NR', 'NUMERO', 'CIG', 'MAND', 'PAGAMENTO', 'VS',
        ];
        $stopMap = array_fill_keys($stopWords, true);
        $tokens = [];
        foreach ($parts as $part) {
            $token = trim($part);
            if ($token === '' || isset($stopMap[$token])) {
                continue;
            }
            if (strlen($token) < 3) {
                continue;
            }
            if (preg_match('/^\d+$/', $token) === 1) {
                continue;
            }
            $tokens[$token] = true;
            if (count($tokens) >= 12) {
                break;
            }
        }
        return array_keys($tokens);
    }

    private function normalizeSearchText(string $value): string
    {
        $upper = strtoupper(trim($value));
        if ($upper === '') {
            return '';
        }
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $upper);
        if ($ascii !== false) {
            $upper = $ascii;
        }
        $upper = preg_replace('/[^A-Z0-9]+/', ' ', $upper) ?? '';
        $upper = preg_replace('/\s+/', ' ', $upper) ?? '';
        return trim($upper);
    }

    private function extractLeadingBusinessPhrase(string $normalizedCompanyName): string
    {
        if ($normalizedCompanyName === '') {
            return '';
        }
        $parts = preg_split('/\s+/', $normalizedCompanyName) ?: [];
        $stop = [
            'SRL', 'S R L', 'SPA', 'S P A', 'SAS', 'S A S', 'SNC', 'S N C', 'SS', 'S S',
            'SOCIETA', 'COOPERATIVA', 'CONSORZIO', 'DITTA',
        ];
        $tokens = [];
        foreach ($parts as $part) {
            $token = trim($part);
            if ($token === '') {
                continue;
            }
            if (in_array($token, $stop, true)) {
                break;
            }
            if (strlen($token) < 2) {
                continue;
            }
            $tokens[] = $token;
            if (count($tokens) >= 3) {
                break;
            }
        }
        return trim(implode(' ', $tokens));
    }

    /**
     * @return list<array{id_anagrafica:int,ragione_sociale:string,note:string}>
     */
    private function fetchTrainingMappingsForAutoAssign(): array
    {
        $sql = <<<'SQL'
            SELECT
                f.id_anagrafica,
                a.ragione_sociale,
                p.note
            FROM appoggio_pagamenti_fattura p
            INNER JOIN tb_fatture f ON f.id_fattura = p.id_fattura
            INNER JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
            WHERE p.note IS NOT NULL
              AND TRIM(p.note) <> ''
              AND a.ragione_sociale IS NOT NULL
              AND TRIM(a.ragione_sociale) <> ''
            ORDER BY p.id_pag_fattura DESC
            LIMIT 2500
        SQL;

        $stmt = $this->pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $row) {
            $idAnagrafica = isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : 0;
            $ragioneSociale = trim((string) ($row['ragione_sociale'] ?? ''));
            $note = trim((string) ($row['note'] ?? ''));
            if ($idAnagrafica <= 0 || $ragioneSociale === '' || $note === '') {
                continue;
            }
            $out[] = [
                'id_anagrafica' => $idAnagrafica,
                'ragione_sociale' => $ragioneSociale,
                'note' => $note,
            ];
        }
        return $out;
    }

    /**
     * @param list<array{id_anagrafica:int,ragione_sociale:string,note:string}> $trainingRows
     * @return array{id_anagrafica:int,ragione_sociale:string}|null
     */
    private function resolveAnagraficaByLearnedNoteMapping(string $note, array $trainingRows): ?array
    {
        if ($trainingRows === []) {
            return null;
        }
        $targetTokens = $this->extractMeaningfulTokens($note);
        if (count($targetTokens) < 2) {
            return null;
        }
        $targetSet = array_fill_keys($targetTokens, true);

        $scores = [];
        $labels = [];
        foreach ($trainingRows as $row) {
            $trainTokens = $this->extractMeaningfulTokens($row['note']);
            if (count($trainTokens) < 2) {
                continue;
            }
            $common = 0;
            foreach ($trainTokens as $token) {
                if (isset($targetSet[$token])) {
                    $common++;
                }
            }
            if ($common < 2) {
                continue;
            }

            $id = (int) $row['id_anagrafica'];
            $trainSize = max(1, count($trainTokens));
            $targetSize = max(1, count($targetTokens));
            $ratioTrain = $common / $trainSize;
            $ratioTarget = $common / $targetSize;
            $score = ($common * 2.0) + ($ratioTrain * 3.0) + ($ratioTarget * 3.0);

            if (!isset($scores[$id]) || $score > $scores[$id]) {
                $scores[$id] = $score;
                $labels[$id] = $row['ragione_sociale'];
            }
        }

        if ($scores === []) {
            return null;
        }

        arsort($scores);
        $ids = array_keys($scores);
        $bestId = (int) $ids[0];
        $bestScore = (float) $scores[$bestId];
        $secondScore = count($ids) > 1 ? (float) $scores[(int) $ids[1]] : 0.0;

        if ($bestScore < 6.0) {
            return null;
        }
        if (($bestScore - $secondScore) < 1.5) {
            return null;
        }

        return [
            'id_anagrafica' => $bestId,
            'ragione_sociale' => (string) ($labels[$bestId] ?? ''),
        ];
    }
}
