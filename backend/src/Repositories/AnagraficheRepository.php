<?php
// backend/src/Repositories/AnagraficheRepository.php

namespace MediaPrint\Repo;

use DateTimeImmutable;
use PDO;
use RuntimeException;
use Throwable;

final class AnagraficheRepository
{
    public function __construct(private PDO $pdo) {}

    public function getPdo(): PDO
    {
        return $this->pdo;
    }

    /**
     * Ritorna lo stato corrente dell'anagrafica (is_active, stato) oppure null se non esiste.
     *
     * @return array{is_active:int,stato:string}|null
     */
    public function getBaseStatus(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT is_active, stato FROM tb_anagrafiche WHERE id_anagrafica = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        return [
            'is_active' => (int) ($row['is_active'] ?? 0),
            'stato' => (string) ($row['stato'] ?? ''),
        ];
    }

    /**
     * @return array{data: list<array<string, mixed>>, total: int}
     */
    public function search(array $filters): array
    {
        if (isset($filters['allowed_ids']) && is_array($filters['allowed_ids'])) {
            $allowed = array_values(array_filter(array_map('intval', $filters['allowed_ids']), static fn($id) => $id > 0));
            if ($allowed === []) {
                return ['data' => [], 'total' => 0];
            }
        }

        $sql = <<<'SQL'
            SELECT
                id_anagrafica,
                id_tipologia,
                ragione_sociale,
                piva,
                codice_fiscale,
                stato,
                created_at,
                updated_at
            FROM tb_anagrafiche
        SQL;

        $where = [];
        $params = [];

        if (!empty($filters['search'])) {
            // Con ATTR_EMULATE_PREPARES=false non si possono riutilizzare gli stessi named placeholder
            // più volte nella stessa query. Usiamo placeholder distinti.
            $where[] = '(
                ragione_sociale LIKE :needle_rs
                OR piva LIKE :needle_piva
                OR codice_fiscale LIKE :needle_cf
            )';
            $like = '%' . $filters['search'] . '%';
            $params[':needle_rs'] = $like;
            $params[':needle_piva'] = $like;
            $params[':needle_cf'] = $like;

            // Estende la ricerca con normalizzazione P.IVA (senza spazi/punti/trattini) e CF/ragione case-insensitive
            $where[] = '(
                REPLACE(REPLACE(REPLACE(piva, " ", ""), ".", ""), "-", "") LIKE REPLACE(REPLACE(REPLACE(:needle_piva_norm, " ", ""), ".", ""), "-", "")
                OR UPPER(codice_fiscale) LIKE UPPER(:needle_cf_norm)
                OR UPPER(ragione_sociale) LIKE UPPER(:needle_rs_norm)
            )';
            $params[':needle_piva_norm'] = $like;
            $params[':needle_cf_norm'] = $like;
            $params[':needle_rs_norm'] = $like;
        }

        // Nasconde per default le anagrafiche disattivate/archiviate
        $where[] = 'is_active = 1';

        if (isset($filters['tipologie']) && is_array($filters['tipologie'])) {
            $tipologie = array_values(array_filter(array_map('intval', $filters['tipologie']), static fn($id) => $id > 0));
            if ($tipologie !== []) {
                $placeholders = implode(',', array_fill(0, count($tipologie), '?'));
                $where[] = "id_tipologia IN ({$placeholders})";
            }
        }

        if (isset($allowed) && $allowed !== []) {
            $placeholders = implode(',', array_fill(0, count($allowed), '?'));
            $where[] = "id_anagrafica IN ({$placeholders})";
        }
        $sql .= ' WHERE ' . implode(' AND ', $where);

        $sortable = [
            'ragione_sociale',
            'piva',
            'codice_fiscale',
            'stato',
            'created_at',
        ];
        $sortBy = in_array($filters['sort_by'], $sortable, true)
            ? $filters['sort_by']
            : 'ragione_sociale';

        $direction = strtolower($filters['sort_direction'] ?? '') === 'desc' ? 'DESC' : 'ASC';

        $sql .= " ORDER BY {$sortBy} {$direction}";

        $page = max((int)($filters['page'] ?? 1), 1);
        $perPage = max(1, min((int)($filters['per_page'] ?? 20), 100));
        $offset = ($page - 1) * $perPage;

        // Con MySQL e ATTR_EMULATE_PREPARES=false non si possono usare placeholder in LIMIT/OFFSET
        // quindi inseriamo valori interi validati direttamente nella query
        $sql .= ' LIMIT ' . (int) $perPage . ' OFFSET ' . (int) $offset;

        $statement = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            if (!is_string($placeholder)) {
                continue;
            }
            $statement->bindValue($placeholder, $value, PDO::PARAM_STR);
        }
        if (isset($allowed) && $allowed !== []) {
            $offsetParam = count($params);
            foreach ($allowed as $index => $id) {
                $statement->bindValue($offsetParam + $index + 1, $id, PDO::PARAM_INT);
            }
        }
        if (isset($tipologie) && $tipologie !== []) {
            $offsetParam = count($params) + (isset($allowed) ? count($allowed) : 0);
            foreach ($tipologie as $index => $id) {
                $statement->bindValue($offsetParam + $index + 1, $id, PDO::PARAM_INT);
            }
        }
        $statement->execute();
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        // Sovrascrive indirizzo/cap/citta/provincia con dati della sede legale, se presente
        if ($rows) {
            $ids = [];
            foreach ($rows as $r) {
                if (isset($r['id_anagrafica'])) {
                    $ids[] = (int) $r['id_anagrafica'];
                }
            }
            $ids = array_values(array_unique(array_filter($ids, fn($v) => $v > 0)));
            if (!empty($ids)) {
                $in = implode(',', $ids);
                $sediSql = "SELECT id_anagrafica, indirizzo, cap, comune, provincia, nazione_iso2 FROM tb_sedi WHERE is_legale = 1 AND id_anagrafica IN ($in)";
                $sediStmt = $this->pdo->query($sediSql);
                $sediRows = $sediStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
                $byAnag = [];
                foreach ($sediRows as $s) {
                    $byAnag[(int) $s['id_anagrafica']] = $s;
                }
                foreach ($rows as &$row) {
                    $aid = (int) $row['id_anagrafica'];
                    if (isset($byAnag[$aid])) {
                        $s = $byAnag[$aid];
                        if (!empty($s['indirizzo'])) $row['indirizzo'] = $s['indirizzo'];
                        if (!empty($s['cap'])) $row['cap'] = $s['cap'];
                        if (!empty($s['comune'])) $row['citta'] = $s['comune'];
                        if (!empty($s['provincia'])) $row['provincia'] = $s['provincia'];
                        if (!empty($s['nazione_iso2'])) $row['nazione'] = $s['nazione_iso2'];
                    }
                }
                unset($row);
            }
        }

        $countSql = 'SELECT COUNT(*) FROM tb_anagrafiche WHERE ' . implode(' AND ', $where);
        $countStatement = $this->pdo->prepare($countSql);
        foreach ($params as $placeholder => $value) {
            if (!is_string($placeholder)) {
                continue;
            }
            $countStatement->bindValue($placeholder, $value, PDO::PARAM_STR);
        }
        if (isset($allowed) && $allowed !== []) {
            $offsetParam = count($params);
            foreach ($allowed as $index => $id) {
                $countStatement->bindValue($offsetParam + $index + 1, $id, PDO::PARAM_INT);
            }
        }
        if (isset($tipologie) && $tipologie !== []) {
            $offsetParam = count($params) + (isset($allowed) ? count($allowed) : 0);
            foreach ($tipologie as $index => $id) {
                $countStatement->bindValue($offsetParam + $index + 1, $id, PDO::PARAM_INT);
            }
        }
        $countStatement->execute();
        $total = (int) $countStatement->fetchColumn();

        return [
            'data' => array_map(static fn (array $row) => $row, $rows),
            'total' => $total,
        ];
    }

    /**
     * Ricerca nelle anagrafiche archiviate (tb_anagrafiche_archive).
     *
     * @return array{data: list<array<string, mixed>>, total: int}
     */
    public function searchArchived(array $filters): array
    {
        $sql = <<<'SQL'
            SELECT
                id_anagrafica,
                ragione_sociale,
                piva,
                codice_fiscale,
                stato,
                archived_at
            FROM tb_anagrafiche_archive
        SQL;

        $where = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[] = '(ragione_sociale LIKE :needle
                OR piva LIKE :needle
                OR codice_fiscale LIKE :needle)';
            $params[':needle'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['allowed_ids']) && is_array($filters['allowed_ids'])) {
            $allowed = array_values(array_filter(array_map('intval', $filters['allowed_ids']), static fn ($id) => $id > 0));
            if ($allowed === []) {
                return ['data' => [], 'total' => 0];
            }
            $placeholders = [];
            foreach ($allowed as $index => $id) {
                $key = ':allowed_' . $index;
                $placeholders[] = $key;
                $params[$key] = $id;
            }
            $where[] = 'id_anagrafica IN (' . implode(',', $placeholders) . ')';
        }

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sortable = [
            'ragione_sociale',
            'piva',
            'codice_fiscale',
            'archived_at',
        ];
        $sortBy = in_array($filters['sort_by'], $sortable, true)
            ? $filters['sort_by']
            : 'archived_at';

        $direction = strtolower($filters['sort_direction'] ?? '') === 'asc' ? 'ASC' : 'DESC';

        $sql .= " ORDER BY {$sortBy} {$direction}";

        $page = max((int)($filters['page'] ?? 1), 1);
        $perPage = max(1, min((int)($filters['per_page'] ?? 20), 100));
        $offset = ($page - 1) * $perPage;

        $sql .= ' LIMIT :perPage OFFSET :offset';
        $params[':perPage'] = $perPage;
        $params[':offset'] = $offset;

        $statement = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            $type = $placeholder === ':perPage' || $placeholder === ':offset' ? PDO::PARAM_INT : PDO::PARAM_STR;
            $statement->bindValue($placeholder, $value, $type);
        }
        $statement->execute();
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        $countSql = 'SELECT COUNT(*) FROM tb_anagrafiche_archive';
        if ($where) {
            $countSql .= ' WHERE ' . implode(' AND ', $where);
        }
        $countStatement = $this->pdo->prepare($countSql);
        foreach ($params as $placeholder => $value) {
            if ($placeholder === ':perPage' || $placeholder === ':offset') {
                continue;
            }
            $type = str_starts_with((string) $placeholder, ':allowed_') ? PDO::PARAM_INT : PDO::PARAM_STR;
            $countStatement->bindValue($placeholder, $value, $type);
        }
        $countStatement->execute();
        $total = (int)$countStatement->fetchColumn();

        return [
            'data' => array_map(static fn ($row) => $row, $rows),
            'total' => $total,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findDetail(int $id): ?array
    {
        $exists = $this->pdo->prepare('SELECT 1 FROM tb_anagrafiche WHERE id_anagrafica = :id LIMIT 1');
        $exists->bindValue(':id', $id, PDO::PARAM_INT);
        $exists->execute();

        if ($exists->fetchColumn() === false) {
            return null;
        }

        $baseSql = <<<'SQL'
            SELECT
                a.id_anagrafica,
                a.id_tipologia,
                ta.code AS tipologia_code,
                ta.label AS tipologia_label,
                a.id_sdi_regime_fiscale,
                rf.code AS regime_code,
                rf.label AS regime_label,
                a.is_pa,
                a.categoria,
                a.is_active,
                a.stato,
                a.ragione_sociale,
                a.piva,
                a.codice_fiscale,
                a.note,
                a.created_at,
                a.updated_at
            FROM tb_anagrafiche a
            LEFT JOIN cfg_tipologia_anagrafica ta ON ta.id_tipologia = a.id_tipologia
            LEFT JOIN cfg_sdi_regime_fiscale rf ON rf.id_regime = a.id_sdi_regime_fiscale
            WHERE a.id_anagrafica = :id
            LIMIT 1
        SQL;

        $statement = $this->pdo->prepare($baseSql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $anagrafica = $statement->fetch(PDO::FETCH_ASSOC);

        if ($anagrafica === false) {
            return null;
        }

        $fiscaleSql = <<<'SQL'
            SELECT
                id_anagrafica,
                pec,
                codice_sdi,
                iban,
                banca,
                split_pay,
                id_cond_pagamento,
                modalita_pagamento,
                id_sezionale,
                giorni_pagamento,
                altri_dati
            FROM tb_anagrafiche_fiscali
            WHERE id_anagrafica = :id
            LIMIT 1
        SQL;

        $fiscaleStatement = $this->pdo->prepare($fiscaleSql);
        $fiscaleStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $fiscaleStatement->execute();
        $fiscale = $fiscaleStatement->fetch(PDO::FETCH_ASSOC) ?: null;

        $contattiSql = <<<'SQL'
            SELECT
                ca.id_contatto,
                ca.is_predefinita,
                sc.nome,
                sc.ruolo,
                sc.telefono,
                sc.cellulare,
                sc.email,
                sc.note,
                sc.stato,
                sc.is_predefinito,
                sc.id_sede,
                s.denominazione AS sede_denominazione,
                s.indirizzo AS sede_indirizzo,
                s.civico AS sede_civico,
                s.cap AS sede_cap,
                s.comune AS sede_comune,
                s.provincia AS sede_provincia,
                s.nazione_iso2 AS sede_nazione,
                s.telefono AS sede_telefono,
                s.email AS sede_email
            FROM tb_contatti_anagrafiche ca
            INNER JOIN tb_sedi_contatti sc ON sc.id_contatto = ca.id_contatto
            LEFT JOIN tb_sedi s ON s.id_sede = sc.id_sede
            WHERE ca.id_anagrafica = :id
            ORDER BY sc.is_predefinito DESC, sc.nome ASC
        SQL;

        $contattiStatement = $this->pdo->prepare($contattiSql);
        $contattiStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $contattiStatement->execute();
        $contatti = $contattiStatement->fetchAll(PDO::FETCH_ASSOC);

        // Contatti archiviati (collegati tramite sedi_archive -> include id_anagrafica)
        $contattiArchSql = <<<'SQL'
            SELECT
                ca.id_contatto,
                ca.nome,
                ca.ruolo,
                ca.telefono,
                ca.cellulare,
                ca.email,
                ca.note,
                ca.is_predefinito,
                ca.id_sede,
                sa.denominazione AS sede_denominazione,
                sa.indirizzo AS sede_indirizzo,
                sa.civico AS sede_civico,
                sa.cap AS sede_cap,
                sa.comune AS sede_comune,
                sa.provincia AS sede_provincia,
                sa.nazione_iso2 AS sede_nazione,
                sa.telefono AS sede_telefono,
                sa.email AS sede_email,
                ca.archived_at
            FROM tb_sedi_contatti_archive ca
            INNER JOIN tb_sedi_archive sa ON sa.id_sede = ca.id_sede
            WHERE sa.id_anagrafica = :id
            ORDER BY ca.archived_at DESC, ca.nome ASC
        SQL;

        $contattiArchStmt = $this->pdo->prepare($contattiArchSql);
        $contattiArchStmt->bindValue(':id', $id, PDO::PARAM_INT);
        $contattiArchStmt->execute();
        $contattiArchiviati = $contattiArchStmt->fetchAll(PDO::FETCH_ASSOC);

        $preventiviSql = <<<'SQL'
            SELECT
                p.id_preventivo,
                p.anno_preventivo,
                p.numero_documento,
                p.data_preventivo,
                p.totale_imponibile,
                p.totale_sconto,
                p.totale_iva,
                p.totale,
                sp.code AS stato_code,
                sp.label AS stato_label,
                p.created_at,
                p.updated_at
            FROM tb_preventivi p
            LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
            WHERE p.id_anagrafica = :id
            ORDER BY p.data_preventivo DESC, p.created_at DESC
            LIMIT 50
        SQL;

        $preventiviStatement = $this->pdo->prepare($preventiviSql);
        $preventiviStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $preventiviStatement->execute();
        $preventivi = $preventiviStatement->fetchAll(PDO::FETCH_ASSOC);

        $ddtSql = <<<'SQL'
            SELECT
                d.id_ddt,
                d.anno,
                d.numero_documento,
                d.data_ddt,
                d.totale_pezzi,
                d.totale_peso_kg,
                d.created_at,
                d.updated_at
            FROM tb_ddt d
            WHERE d.id_anagrafica = :id
            ORDER BY d.data_ddt DESC, d.created_at DESC
            LIMIT 50
        SQL;

        $ddtStatement = $this->pdo->prepare($ddtSql);
        $ddtStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $ddtStatement->execute();
        $ddt = $ddtStatement->fetchAll(PDO::FETCH_ASSOC);

        $fattureSql = <<<'SQL'
            SELECT
                f.id_fattura,
                f.anno,
                f.numero_documento,
                f.data_fattura,
                f.is_acquisto,
                f.id_sezionale,
                f.totale_imponibile,
                f.totale_sconto,
                f.totale_iva,
                f.totale,
                f.saldo,
                tf.code AS tipo_code,
                tf.label AS tipo_label,
                sz.code AS sezionale_code,
                sz.descrizione AS sezionale_label,
                sf.code AS stato_code,
                sf.label AS stato_label,
                f.created_at,
                f.updated_at
            FROM tb_fatture f
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
            LEFT JOIN cfg_sezionali sz ON sz.id_sezionale = f.id_sezionale
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            WHERE f.id_anagrafica = :id
            ORDER BY f.data_fattura DESC, f.created_at DESC
            LIMIT 50
        SQL;

        $fattureStatement = $this->pdo->prepare($fattureSql);
        $fattureStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $fattureStatement->execute();
        $fatture = $fattureStatement->fetchAll(PDO::FETCH_ASSOC);

        $sediSql = <<<'SQL'
            SELECT
                id_sede,
                id_tipo,
                denominazione,
                indirizzo,
                civico,
                cap,
                comune,
                provincia,
                nazione_iso2,
                telefono,
                email,
                note,
                is_legale,
                is_predefinita,
                created_at,
                updated_at
            FROM tb_sedi
            WHERE id_anagrafica = :id
            ORDER BY is_legale DESC, is_predefinita DESC, denominazione ASC, id_sede ASC
        SQL;

        $sediStatement = $this->pdo->prepare($sediSql);
        $sediStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $sediStatement->execute();
        $sedi = $sediStatement->fetchAll(PDO::FETCH_ASSOC);

        return [
            'anagrafica' => $anagrafica,
            'fiscale' => $fiscale,
            'contatti' => $contatti,
            'contatti_archiviati' => $contattiArchiviati,
            'preventivi' => $preventivi,
            'ddt' => $ddt,
            'fatture' => $fatture,
            'sedi' => $sedi,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getKpi(int $id, ?string $periodRaw = null): array
    {
        $range = $this->resolveKpiPeriod($periodRaw);
        $start = $range['start'];
        $end = $range['end'];
        $startSql = $start ? $start->format('Y-m-d H:i:s') : null;
        $endSql = $end ? $end->format('Y-m-d H:i:s') : null;

        $preventiviCount = $this->fetchCountByDateField($id, 'tb_preventivi', 'data_preventivo', $startSql, $endSql);
        $ddtCount = $this->fetchCountByDateField($id, 'tb_ddt', 'data_ddt', $startSql, $endSql);

        $fattureTotals = $this->fetchFattureTotals($id, $startSql, $endSql);
        $fattureCount = $fattureTotals['count'];
        $fattureTotale = $fattureTotals['totale'];
        $fattureSaldo = $fattureTotals['saldo'];

        $lastDocument = $this->fetchLastDocument($id, $startSql, $endSql);

        return [
            'period' => $range['period'],
            'start' => $startSql,
            'end' => $endSql,
            'preventivi' => [
                'count' => $preventiviCount,
            ],
            'ddt' => [
                'count' => $ddtCount,
            ],
            'fatture' => [
                'count' => $fattureCount,
                'totale' => $fattureTotale,
                'saldo' => $fattureSaldo,
            ],
            'last_document' => $lastDocument,
        ];
    }

    /**
     * @return array{period:string,start:?DateTimeImmutable,end:?DateTimeImmutable}
     */
    private function resolveKpiPeriod(?string $periodRaw): array
    {
        $period = strtolower(trim((string) $periodRaw));
        $allowed = ['all', 'month', 'quarter', 'semester', 'year'];
        if (!in_array($period, $allowed, true)) {
            $period = 'all';
        }

        if ($period === 'all') {
            return [
                'period' => $period,
                'start' => null,
                'end' => null,
            ];
        }

        $end = new DateTimeImmutable('now');
        $start = match ($period) {
            'month' => $end->modify('-1 month'),
            'quarter' => $end->modify('-3 months'),
            'semester' => $end->modify('-6 months'),
            'year' => $end->modify('-1 year'),
            default => $end->modify('-1 month'),
        };

        return [
            'period' => $period,
            'start' => $start,
            'end' => $end,
        ];
    }

    private function fetchCountByDateField(int $id, string $table, string $dateField, ?string $start, ?string $end): int
    {
        [$dateSql, $params] = $this->buildDateFilter($dateField, $start, $end);
        $sql = "SELECT COUNT(*) FROM {$table} WHERE id_anagrafica = :id{$dateSql}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $stmt->execute();

        return (int) ($stmt->fetchColumn() ?: 0);
    }

    /**
     * @return array{count:int,totale:float,saldo:float}
     */
    private function fetchFattureTotals(int $id, ?string $start, ?string $end): array
    {
        [$dateSql, $params] = $this->buildDateFilter('data_fattura', $start, $end);
        $sql = 'SELECT COUNT(*) AS tot_count, COALESCE(SUM(totale), 0) AS tot_sum, COALESCE(SUM(saldo), 0) AS saldo_sum
                FROM tb_fatture
                WHERE id_anagrafica = :id
                  AND COALESCE(is_acquisto, 0) = 0' . $dateSql;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'count' => (int) ($row['tot_count'] ?? 0),
            'totale' => (float) ($row['tot_sum'] ?? 0),
            'saldo' => (float) ($row['saldo_sum'] ?? 0),
        ];
    }

    /**
     * @return array{type:?string,date:?string,id:?int}
     */
    private function fetchLastDocument(int $id, ?string $start, ?string $end): array
    {
        $candidates = [
            $this->fetchLastDocumentForTable($id, 'tb_fatture', 'id_fattura', 'data_fattura', 'Fattura', $start, $end),
            $this->fetchLastDocumentForTable($id, 'tb_ddt', 'id_ddt', 'data_ddt', 'DDT', $start, $end),
            $this->fetchLastDocumentForTable($id, 'tb_preventivi', 'id_preventivo', 'data_preventivo', 'Preventivo', $start, $end),
        ];

        $latest = null;
        foreach ($candidates as $candidate) {
            if ($candidate === null) {
                continue;
            }
            $ts = strtotime((string) $candidate['date']);
            if ($ts === false) {
                continue;
            }
            if ($latest === null || $ts > $latest['ts']) {
                $latest = [
                    'ts' => $ts,
                    'type' => $candidate['type'],
                    'date' => $candidate['date'],
                    'id' => $candidate['id'],
                ];
            }
        }

        if ($latest === null) {
            return ['type' => null, 'date' => null, 'id' => null];
        }

        return [
            'type' => $latest['type'],
            'date' => $latest['date'],
            'id' => $latest['id'],
        ];
    }

    /**
     * @return array{type:string,date:string,id:int}|null
     */
    private function fetchLastDocumentForTable(
        int $id,
        string $table,
        string $idField,
        string $dateField,
        string $typeLabel,
        ?string $start,
        ?string $end
    ): ?array {
        [$dateSql, $params] = $this->buildDateFilter($dateField, $start, $end);
        $sql = "SELECT {$idField} AS doc_id, COALESCE({$dateField}, created_at) AS doc_date
                FROM {$table}
                WHERE id_anagrafica = :id{$dateSql}
                ORDER BY doc_date DESC
                LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['doc_date'])) {
            return null;
        }

        return [
            'type' => $typeLabel,
            'date' => (string) $row['doc_date'],
            'id' => isset($row['doc_id']) ? (int) $row['doc_id'] : 0,
        ];
    }

    /**
     * @return array{0:string,1:array<string,string>}
     */
    private function buildDateFilter(string $dateField, ?string $start, ?string $end): array
    {
        if (!$start || !$end) {
            return ['', []];
        }

        $sql = " AND COALESCE({$dateField}, created_at) >= :start AND COALESCE({$dateField}, created_at) < :end";
        return [$sql, [':start' => $start, ':end' => $end]];
    }

    /**
     * @template T
     * @param callable():T $callback
     * @return T
     */
    public function transactional(callable $callback)
    {
        $this->pdo->beginTransaction();

        try {
            $result = $callback();
            $this->pdo->commit();

            return $result;
        } catch (Throwable $throwable) {
            $this->pdo->rollBack();
            throw $throwable;
        }
    }

    public function updateAnagrafica(int $id, array $data): void
    {
        $check = $this->pdo->prepare('SELECT 1 FROM tb_anagrafiche WHERE id_anagrafica = :id LIMIT 1');
        $check->bindValue(':id', $id, PDO::PARAM_INT);
        $check->execute();

        if ($check->fetchColumn() === false) {
            throw new RuntimeException('Anagrafica non trovata.', 404);
        }

        $columns = [
            'ragione_sociale' => ['column' => 'ragione_sociale', 'type' => PDO::PARAM_STR],
            'piva' => ['column' => 'piva', 'type' => PDO::PARAM_STR],
            'codice_fiscale' => ['column' => 'codice_fiscale', 'type' => PDO::PARAM_STR],
            'note' => ['column' => 'note', 'type' => PDO::PARAM_STR],
            'id_tipologia' => ['column' => 'id_tipologia', 'type' => PDO::PARAM_INT],
            'id_sdi_regime_fiscale' => ['column' => 'id_sdi_regime_fiscale', 'type' => PDO::PARAM_INT],
            'is_pa' => ['column' => 'is_pa', 'type' => PDO::PARAM_INT],
            'categoria' => ['column' => 'categoria', 'type' => PDO::PARAM_STR],
            'is_active' => ['column' => 'is_active', 'type' => PDO::PARAM_INT],
            'stato' => ['column' => 'stato', 'type' => PDO::PARAM_STR],
        ];

        $setParts = [];
        $params = [':id' => $id];
        $types = [':id' => PDO::PARAM_INT];

        foreach ($columns as $key => $meta) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $placeholder = ':' . $key;
            $setParts[] = sprintf('%s = %s', $meta['column'], $placeholder);
            $value = $data[$key];

            if ($value === null || $value === '') {
                $params[$placeholder] = null;
                $types[$placeholder] = PDO::PARAM_NULL;
            } else {
                if ($meta['type'] === PDO::PARAM_INT) {
                    $params[$placeholder] = (int) $value;
                } else {
                    $params[$placeholder] = (string) $value;
                }
                $types[$placeholder] = $meta['type'];
            }
        }

        if (!$setParts) {
            throw new RuntimeException('Nessun campo valido per l\'aggiornamento.', 422);
        }

        $sql = 'UPDATE tb_anagrafiche SET ' . implode(', ', $setParts) . ' WHERE id_anagrafica = :id';
        $statement = $this->pdo->prepare($sql);

        foreach ($params as $placeholder => $value) {
            $type = $types[$placeholder] ?? PDO::PARAM_STR;
            $statement->bindValue($placeholder, $value, $type);
        }

        $statement->execute();
    }

    public function upsertFiscale(int $id, array $data): void
    {
        $columns = [
            'pec' => ['column' => 'pec', 'type' => PDO::PARAM_STR],
            'codice_sdi' => ['column' => 'codice_sdi', 'type' => PDO::PARAM_STR],
            'iban' => ['column' => 'iban', 'type' => PDO::PARAM_STR],
            'banca' => ['column' => 'banca', 'type' => PDO::PARAM_STR],
            'split_pay' => ['column' => 'split_pay', 'type' => PDO::PARAM_INT],
            'id_cond_pagamento' => ['column' => 'id_cond_pagamento', 'type' => PDO::PARAM_INT],
            'modalita_pagamento' => ['column' => 'modalita_pagamento', 'type' => PDO::PARAM_STR],
            'id_sezionale' => ['column' => 'id_sezionale', 'type' => PDO::PARAM_INT],
            'giorni_pagamento' => ['column' => 'giorni_pagamento', 'type' => PDO::PARAM_INT],
            'altri_dati' => ['column' => 'altri_dati', 'type' => PDO::PARAM_STR],
        ];

        $setColumns = [];
        $placeholders = [];
        $params = [':id' => $id];
        $types = [':id' => PDO::PARAM_INT];

        foreach ($columns as $key => $meta) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $placeholder = ':' . $key;
            $setColumns[] = $meta['column'];
            $placeholders[] = $placeholder;

            $value = $data[$key];
            if ($value === null || $value === '') {
                $params[$placeholder] = null;
                $types[$placeholder] = PDO::PARAM_NULL;
            } else {
                if ($meta['type'] === PDO::PARAM_INT) {
                    $params[$placeholder] = (int) $value;
                } else {
                    $params[$placeholder] = (string) $value;
                }
                $types[$placeholder] = $meta['type'];
            }
        }

        if (!$setColumns) {
            return;
        }

        $insertColumns = array_merge(['id_anagrafica'], $setColumns);
        $insertPlaceholders = array_merge([':id'], $placeholders);
        $updateAssignments = array_map(
            static fn (string $column) => sprintf('%1$s = VALUES(%1$s)', $column),
            $setColumns
        );

        $sql = sprintf(
            'INSERT INTO tb_anagrafiche_fiscali (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s',
            implode(', ', $insertColumns),
            implode(', ', $insertPlaceholders),
            implode(', ', $updateAssignments)
        );

        $statement = $this->pdo->prepare($sql);

        foreach ($params as $placeholder => $value) {
            $type = $types[$placeholder] ?? PDO::PARAM_STR;
            $statement->bindValue($placeholder, $value, $type);
        }

        $statement->execute();
    }

    public function insertSede(int $anagraficaId, array $data): int
    {
        $fields = $this->prepareSedeFields($data);

        if (!$fields['columns']) {
            throw new RuntimeException('Nessun dato valido per creare la sede.', 422);
        }

        if (($data['is_legale'] ?? null) === 1) {
            $this->unsetSedeFlag($anagraficaId, 'is_legale');
        }

        if (($data['is_predefinita'] ?? null) === 1) {
            $this->unsetSedeFlag($anagraficaId, 'is_predefinita');
        }

        $columns = array_merge(['id_anagrafica'], $fields['columns']);
        $placeholders = array_merge([':id_anagrafica'], $fields['placeholders']);

        $sql = sprintf(
            'INSERT INTO tb_sedi (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        $statement = $this->pdo->prepare($sql);
        $statement->bindValue(':id_anagrafica', $anagraficaId, PDO::PARAM_INT);

        foreach ($fields['params'] as $placeholder => $value) {
            $type = $fields['types'][$placeholder] ?? PDO::PARAM_STR;
            $statement->bindValue($placeholder, $value, $type);
        }

        $statement->execute();

        return (int) $this->pdo->lastInsertId();
    }

    public function updateSede(int $anagraficaId, int $sedeId, array $data): void
    {
        $fields = $this->prepareSedeFields($data);

        if (!$fields['assignments']) {
            return;
        }

        $check = $this->pdo->prepare('SELECT 1 FROM tb_sedi WHERE id_sede = :sede AND id_anagrafica = :anagrafica LIMIT 1');
        $check->bindValue(':sede', $sedeId, PDO::PARAM_INT);
        $check->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $check->execute();

        if ($check->fetchColumn() === false) {
            throw new RuntimeException('Sede non associata all\'anagrafica indicata.', 404);
        }

        if (array_key_exists('is_legale', $data) && (int) $data['is_legale'] === 1) {
            $this->unsetSedeFlag($anagraficaId, 'is_legale', $sedeId);
        }

        if (array_key_exists('is_predefinita', $data) && (int) $data['is_predefinita'] === 1) {
            $this->unsetSedeFlag($anagraficaId, 'is_predefinita', $sedeId);
        }

        $sql = 'UPDATE tb_sedi SET ' . implode(', ', $fields['assignments']) . ' WHERE id_sede = :id';
        $statement = $this->pdo->prepare($sql);
        $statement->bindValue(':id', $sedeId, PDO::PARAM_INT);

        foreach ($fields['params'] as $placeholder => $value) {
            $type = $fields['types'][$placeholder] ?? PDO::PARAM_STR;
            $statement->bindValue($placeholder, $value, $type);
        }

        $statement->execute();
    }

    public function deleteSede(int $anagraficaId, int $sedeId): void
    {
        $check = $this->pdo->prepare('SELECT 1 FROM tb_sedi WHERE id_sede = :sede AND id_anagrafica = :anagrafica LIMIT 1');
        $check->bindValue(':sede', $sedeId, PDO::PARAM_INT);
        $check->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $check->execute();

        if ($check->fetchColumn() === false) {
            throw new RuntimeException('Sede non associata all\'anagrafica indicata.', 404);
        }

        $delete = $this->pdo->prepare('DELETE FROM tb_sedi WHERE id_sede = :sede');
        $delete->bindValue(':sede', $sedeId, PDO::PARAM_INT);
        $delete->execute();
    }

    /**
     * @return array{columns: array<int, string>, placeholders: array<int, string>, assignments: array<int, string>, params: array<string, mixed>, types: array<string, int>}
     */
    private function prepareSedeFields(array $data): array
    {
        $definitions = [
            'id_tipo' => ['column' => 'id_tipo', 'type' => PDO::PARAM_INT],
            'denominazione' => ['column' => 'denominazione', 'type' => PDO::PARAM_STR],
            'indirizzo' => ['column' => 'indirizzo', 'type' => PDO::PARAM_STR],
            'civico' => ['column' => 'civico', 'type' => PDO::PARAM_STR],
            'cap' => ['column' => 'cap', 'type' => PDO::PARAM_STR],
            'comune' => ['column' => 'comune', 'type' => PDO::PARAM_STR],
            'provincia' => ['column' => 'provincia', 'type' => PDO::PARAM_STR],
            'nazione_iso2' => ['column' => 'nazione_iso2', 'type' => PDO::PARAM_STR],
            'telefono' => ['column' => 'telefono', 'type' => PDO::PARAM_STR],
            'email' => ['column' => 'email', 'type' => PDO::PARAM_STR],
            'note' => ['column' => 'note', 'type' => PDO::PARAM_STR],
            'is_legale' => ['column' => 'is_legale', 'type' => PDO::PARAM_INT],
            'is_predefinita' => ['column' => 'is_predefinita', 'type' => PDO::PARAM_INT],
        ];

        $columns = [];
        $placeholders = [];
        $assignments = [];
        $params = [];
        $types = [];

        foreach ($definitions as $key => $meta) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $placeholder = ':' . $key;
            $value = $data[$key];

            if ($value === null || $value === '') {
                $params[$placeholder] = null;
                $types[$placeholder] = PDO::PARAM_NULL;
            } else {
                if ($meta['type'] === PDO::PARAM_INT) {
                    $params[$placeholder] = (int) $value;
                } else {
                    $params[$placeholder] = (string) $value;
                }
                $types[$placeholder] = $meta['type'];
            }

            $columns[] = $meta['column'];
            $placeholders[] = $placeholder;
            $assignments[] = sprintf('%s = %s', $meta['column'], $placeholder);
        }

        return [
            'columns' => $columns,
            'placeholders' => $placeholders,
            'assignments' => $assignments,
            'params' => $params,
            'types' => $types,
        ];
    }

    private function unsetSedeFlag(int $anagraficaId, string $column, ?int $excludeSedeId = null): void
    {
        if (!in_array($column, ['is_legale', 'is_predefinita'], true)) {
            throw new RuntimeException('Flag sede non supportato.', 422);
        }

        $sql = sprintf('UPDATE tb_sedi SET %s = 0 WHERE id_anagrafica = :anagrafica', $column);
        if ($excludeSedeId !== null) {
            $sql .= ' AND id_sede <> :exclude';
        }

        $statement = $this->pdo->prepare($sql);
        $statement->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);

        if ($excludeSedeId !== null) {
            $statement->bindValue(':exclude', $excludeSedeId, PDO::PARAM_INT);
        }

        $statement->execute();
    }

    public function updateContatto(int $anagraficaId, int $contattoId, array $data): void
    {
        $check = $this->pdo->prepare(
            'SELECT 1 FROM tb_contatti_anagrafiche WHERE id_anagrafica = :anagrafica AND id_contatto = :contatto LIMIT 1'
        );
        $check->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $check->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $check->execute();

        if ($check->fetchColumn() === false) {
            throw new RuntimeException('Contatto non associato all\'anagrafica indicata.', 404);
        }

        $contactColumns = [
            'nome' => ['column' => 'nome', 'type' => PDO::PARAM_STR],
            'ruolo' => ['column' => 'ruolo', 'type' => PDO::PARAM_STR],
            'telefono' => ['column' => 'telefono', 'type' => PDO::PARAM_STR],
            'cellulare' => ['column' => 'cellulare', 'type' => PDO::PARAM_STR],
            'email' => ['column' => 'email', 'type' => PDO::PARAM_STR],
            'note' => ['column' => 'note', 'type' => PDO::PARAM_STR],
            'is_predefinito' => ['column' => 'is_predefinito', 'type' => PDO::PARAM_INT],
            'id_sede' => ['column' => 'id_sede', 'type' => PDO::PARAM_INT],
        ];

        $setParts = [];
        $params = [':id' => $contattoId];
        $types = [':id' => PDO::PARAM_INT];

        $willSetDefault = array_key_exists('is_predefinito', $data) && (int)$data['is_predefinito'] === 1;
        $targetSedeId = null;
        if ($willSetDefault) {
            if (array_key_exists('id_sede', $data) && $data['id_sede'] !== null && $data['id_sede'] !== '') {
                $targetSedeId = (int)$data['id_sede'];
            } else {
                $fetch = $this->pdo->prepare('SELECT id_sede FROM tb_sedi_contatti WHERE id_contatto = :id LIMIT 1');
                $fetch->bindValue(':id', $contattoId, PDO::PARAM_INT);
                $fetch->execute();
                $val = $fetch->fetchColumn();
                if ($val !== false) {
                    $targetSedeId = (int)$val;
                }
            }
            if ($targetSedeId !== null) {
                // Unset others BEFORE setting this one to avoid unique constraint violations
                $unset = $this->pdo->prepare('UPDATE tb_sedi_contatti SET is_predefinito = 0 WHERE id_sede = :sede AND id_contatto <> :id');
                $unset->bindValue(':sede', $targetSedeId, PDO::PARAM_INT);
                $unset->bindValue(':id', $contattoId, PDO::PARAM_INT);
                $unset->execute();
            }
        }

        foreach ($contactColumns as $key => $meta) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $placeholder = ':' . $key;
            $setParts[] = sprintf('%s = %s', $meta['column'], $placeholder);
            $value = $data[$key];

            if ($value === null || $value === '') {
                $params[$placeholder] = null;
                $types[$placeholder] = PDO::PARAM_NULL;
            } else {
                if ($meta['type'] === PDO::PARAM_INT) {
                    $params[$placeholder] = (int) $value;
                } else {
                    $params[$placeholder] = (string) $value;
                }
                $types[$placeholder] = $meta['type'];
            }
        }

        if ($setParts) {
            $contactSql = 'UPDATE tb_sedi_contatti SET ' . implode(', ', $setParts) . ' WHERE id_contatto = :id';
            $statement = $this->pdo->prepare($contactSql);

            foreach ($params as $placeholder => $value) {
                $type = $types[$placeholder] ?? PDO::PARAM_STR;
                $statement->bindValue($placeholder, $value, $type);
            }

            $statement->execute();
        }

        // Unset already handled before the update if needed

        // No association-table default handling here (only sede-level is_predefinito enforced)
    }

    public function insertContatto(int $anagraficaId, array $data): int
    {
        $contactDefinitions = [
            'nome' => ['column' => 'nome', 'type' => PDO::PARAM_STR],
            'ruolo' => ['column' => 'ruolo', 'type' => PDO::PARAM_STR],
            'telefono' => ['column' => 'telefono', 'type' => PDO::PARAM_STR],
            'cellulare' => ['column' => 'cellulare', 'type' => PDO::PARAM_STR],
            'email' => ['column' => 'email', 'type' => PDO::PARAM_STR],
            'note' => ['column' => 'note', 'type' => PDO::PARAM_STR],
            'is_predefinito' => ['column' => 'is_predefinito', 'type' => PDO::PARAM_INT],
            'id_sede' => ['column' => 'id_sede', 'type' => PDO::PARAM_INT],
        ];

        $columns = [];
        $placeholders = [];
        $params = [];
        $types = [];

        foreach ($contactDefinitions as $key => $meta) {
            if (!array_key_exists($key, $data)) {
                continue;
            }

            $placeholder = ':' . $key;
            $value = $data[$key];
            if ($value === null || $value === '') {
                $params[$placeholder] = null;
                $types[$placeholder] = PDO::PARAM_NULL;
            } else {
                if ($meta['type'] === PDO::PARAM_INT) {
                    $params[$placeholder] = (int) $value;
                } else {
                    $params[$placeholder] = (string) $value;
                }
                $types[$placeholder] = $meta['type'];
            }

            $columns[] = $meta['column'];
            $placeholders[] = $placeholder;
        }

        if (!$columns) {
            throw new RuntimeException('Nessun dato valido per creare il contatto.', 422);
        }

        $sql = sprintf(
            'INSERT INTO tb_sedi_contatti (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        // If new contact is marked as predefinito for a sede, unset others in the same sede BEFORE insert to avoid unique violations
        if (isset($data['is_predefinito']) && (int)$data['is_predefinito'] === 1 && isset($data['id_sede']) && $data['id_sede'] !== null && $data['id_sede'] !== '') {
            $sedeId = (int) $data['id_sede'];
            $unset = $this->pdo->prepare('UPDATE tb_sedi_contatti SET is_predefinito = 0 WHERE id_sede = :sede');
            $unset->bindValue(':sede', $sedeId, PDO::PARAM_INT);
            $unset->execute();
        }

        // Re-execute the INSERT now that conflicts are cleared
        $statement = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            $type = $types[$placeholder] ?? PDO::PARAM_STR;
            $statement->bindValue($placeholder, $value, $type);
        }
        $statement->execute();

        $newId = (int) $this->pdo->lastInsertId();

        // Associa il nuovo contatto all'anagrafica in modo idempotente
        // Evita errore 1062 (PRIMARY) in caso di doppio click o retry
        $isPredefAnagrafica = 0;
        $assocSql = 'INSERT INTO tb_contatti_anagrafiche (id_anagrafica, id_contatto, is_predefinita)
                     VALUES (:anagrafica, :contatto, :predef)
                     ON DUPLICATE KEY UPDATE is_predefinita = VALUES(is_predefinita)';
        $assoc = $this->pdo->prepare($assocSql);
        $assoc->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $assoc->bindValue(':contatto', $newId, PDO::PARAM_INT);
        $assoc->bindValue(':predef', $isPredefAnagrafica, PDO::PARAM_INT);
        $assoc->execute();

        return $newId;
    }

    public function deleteContatto(int $anagraficaId, int $contattoId): void
    {
        $check = $this->pdo->prepare(
            'SELECT 1 FROM tb_contatti_anagrafiche WHERE id_anagrafica = :anagrafica AND id_contatto = :contatto LIMIT 1'
        );
        $check->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $check->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $check->execute();

        if ($check->fetchColumn() === false) {
            throw new RuntimeException('Contatto non associato all\'anagrafica indicata.', 404);
        }

        // Remove row from dettagli contatto (sede + info)
        $delContact = $this->pdo->prepare('DELETE FROM tb_sedi_contatti WHERE id_contatto = :contatto');
        $delContact->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $delContact->execute();

        // Remove association between contatto e anagrafica
        $delAssoc = $this->pdo->prepare(
            'DELETE FROM tb_contatti_anagrafiche WHERE id_anagrafica = :anagrafica AND id_contatto = :contatto'
        );
        $delAssoc->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $delAssoc->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $delAssoc->execute();
    }

    /**
     * Archivia un contatto singolo spostandolo in tb_sedi_contatti_archive e
     * rimuovendolo dalle tabelle attive.
     */
    public function archiveContatto(int $anagraficaId, int $contattoId): void
    {
        // Verifica che il contatto sia associato all'anagrafica richiesta
        $check = $this->pdo->prepare(
            'SELECT 1 FROM tb_contatti_anagrafiche WHERE id_anagrafica = :anagrafica AND id_contatto = :contatto LIMIT 1'
        );
        $check->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $check->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $check->execute();

        if ($check->fetchColumn() === false) {
            throw new RuntimeException('Contatto non associato all\'anagrafica indicata.', 404);
        }

        // Inserisci in archivio se non esiste già
        $ins = $this->pdo->prepare(
            "INSERT INTO tb_sedi_contatti_archive (
                id_contatto, id_sede, nome, ruolo, telefono, cellulare, email,
                note, is_referente, is_predefinito,
                created_at, updated_at, archived_at, archived_by, archive_batch_id, archive_note
            )
            SELECT c.id_contatto, c.id_sede, c.nome, c.ruolo, c.telefono, c.cellulare, c.email,
                   c.note, 0 AS is_referente, c.is_predefinito,
                   c.created_at, c.updated_at, NOW(), SUBSTRING_INDEX(CURRENT_USER(), '@', 1), UUID(),
                   'Archiviato manualmente da anagrafica'
            FROM tb_sedi_contatti c
            WHERE c.id_contatto = :contatto
              AND NOT EXISTS (
                SELECT 1 FROM tb_sedi_contatti_archive ca WHERE ca.id_contatto = c.id_contatto
              )"
        );
        $ins->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $ins->execute();

        // Rimuovi dalle tabelle attive
        $delContact = $this->pdo->prepare('DELETE FROM tb_sedi_contatti WHERE id_contatto = :contatto');
        $delContact->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $delContact->execute();

        $delAssoc = $this->pdo->prepare('DELETE FROM tb_contatti_anagrafiche WHERE id_anagrafica = :anagrafica AND id_contatto = :contatto');
        $delAssoc->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $delAssoc->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
        $delAssoc->execute();
    }

    /**
     * Elimina definitivamente un contatto dall'archivio.
     */
    public function hardDeleteArchivedContatto(int $archivedContattoId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM tb_sedi_contatti_archive WHERE id_contatto = :id');
        $stmt->bindValue(':id', $archivedContattoId, PDO::PARAM_INT);
        $stmt->execute();
        // L'associazione in tb_contatti_anagrafiche non dovrebbe esistere per contatti archiviati;
        // in ogni caso, nessuna azione aggiuntiva è necessaria qui.
    }

    /**
     * Crea una nuova riga in tb_anagrafiche e restituisce l'ID.
     */
    public function createAnagrafica(array $data): int
    {
        $definitions = [
            'ragione_sociale' => ['column' => 'ragione_sociale', 'type' => PDO::PARAM_STR],
            'piva' => ['column' => 'piva', 'type' => PDO::PARAM_STR],
            'codice_fiscale' => ['column' => 'codice_fiscale', 'type' => PDO::PARAM_STR],
            'note' => ['column' => 'note', 'type' => PDO::PARAM_STR],
            'id_tipologia' => ['column' => 'id_tipologia', 'type' => PDO::PARAM_INT],
            'id_sdi_regime_fiscale' => ['column' => 'id_sdi_regime_fiscale', 'type' => PDO::PARAM_INT],
            'is_pa' => ['column' => 'is_pa', 'type' => PDO::PARAM_INT],
            'categoria' => ['column' => 'categoria', 'type' => PDO::PARAM_STR],
            'is_active' => ['column' => 'is_active', 'type' => PDO::PARAM_INT],
            'stato' => ['column' => 'stato', 'type' => PDO::PARAM_STR],
        ];

        $columns = [];
        $placeholders = [];
        $params = [];
        $types = [];

        foreach ($definitions as $key => $meta) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $placeholder = ':' . $key;
            $value = $data[$key];
            if ($value === null || $value === '') {
                $params[$placeholder] = null;
                $types[$placeholder] = PDO::PARAM_NULL;
            } else {
                if ($meta['type'] === PDO::PARAM_INT) {
                    $params[$placeholder] = (int) $value;
                } else {
                    $params[$placeholder] = (string) $value;
                }
                $types[$placeholder] = $meta['type'];
            }
            $columns[] = $meta['column'];
            $placeholders[] = $placeholder;
        }

        if (!in_array('ragione_sociale', array_keys($definitions), true) || !array_key_exists(':ragione_sociale', $params) || ($params[':ragione_sociale'] === null || $params[':ragione_sociale'] === '')) {
            throw new RuntimeException('Ragione sociale obbligatoria.', 422);
        }

        // Se non fornito, forziamo default ragionevoli per tipologia/attivit/stato
        if (!array_key_exists(':id_tipologia', $params)) {
            $columns[] = 'id_tipologia';
            $placeholders[] = ':id_tipologia';
            $params[':id_tipologia'] = 1;
            $types[':id_tipologia'] = PDO::PARAM_INT;
        }
        if (!array_key_exists(':is_active', $params)) {
            $columns[] = 'is_active';
            $placeholders[] = ':is_active';
            $params[':is_active'] = 1;
            $types[':is_active'] = PDO::PARAM_INT;
        }
        if (!array_key_exists(':stato', $params)) {
            $columns[] = 'stato';
            $placeholders[] = ':stato';
            $params[':stato'] = 'attiva';
            $types[':stato'] = PDO::PARAM_STR;
        }

        $sql = sprintf(
            'INSERT INTO tb_anagrafiche (%s) VALUES (%s)',
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $ph => $val) {
            $type = $types[$ph] ?? PDO::PARAM_STR;
            $stmt->bindValue($ph, $val, $type);
        }
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @return array{id_anagrafica:int, ragione_sociale:string, piva:?string, codice_fiscale:?string, id_tipologia?:int}|null
     */
    public function findByTaxIdentifier(?string $piva, ?string $codiceFiscale): ?array
    {
        $normalizedPiva = $this->normalizeTaxIdentifier($piva);
        $normalizedCf = $this->normalizeTaxIdentifier($codiceFiscale);

        $clauses = [];
        $params = [];

        if ($normalizedPiva !== null) {
            $clauses[] = 'REPLACE(REPLACE(REPLACE(UPPER(piva), " ", ""), ".", ""), "-", "") = :piva';
            $params[':piva'] = $normalizedPiva;
        }
        if ($normalizedCf !== null) {
            $clauses[] = 'REPLACE(REPLACE(REPLACE(UPPER(codice_fiscale), " ", ""), ".", ""), "-", "") = :codice_fiscale';
            $params[':codice_fiscale'] = $normalizedCf;
        }

        if (empty($clauses)) {
            return null;
        }

        $sql = 'SELECT id_anagrafica, ragione_sociale, piva, codice_fiscale, id_tipologia
                FROM tb_anagrafiche
                WHERE is_active = 1 AND (' . implode(' OR ', $clauses) . ')
                ORDER BY id_anagrafica DESC
                LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            $stmt->bindValue($placeholder, $value, PDO::PARAM_STR);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return [
            'id_anagrafica' => (int) $row['id_anagrafica'],
            'ragione_sociale' => (string) ($row['ragione_sociale'] ?? ''),
            'piva' => $row['piva'] !== null ? (string) $row['piva'] : null,
            'codice_fiscale' => $row['codice_fiscale'] !== null ? (string) $row['codice_fiscale'] : null,
            'id_tipologia' => isset($row['id_tipologia']) ? (int) $row['id_tipologia'] : null,
        ];
    }

    private function normalizeTaxIdentifier(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $cleaned = preg_replace('/[^A-Z0-9]/i', '', (string) $value);
        $cleaned = strtoupper($cleaned);
        return $cleaned === '' ? null : $cleaned;
    }

    /**
     * Elimina definitivamente l'anagrafica (dopo archiviazione via trigger).
     */
    public function hardDeleteAnagrafica(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM tb_anagrafiche WHERE id_anagrafica = :id AND is_active = 0');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * Archivia TUTTO e rimuove i record dalle tabelle principali.
     * Include: anagrafica base, fiscale, sedi, contatti sede, preventivi, ddt, fatture.
     * Sicuro da rieseguire (usa NOT EXISTS/UNIQUE per evitare duplicati in archive).
     */
    public function archiveAndDeleteCascade(int $idAnagrafica): void
    {
        // 1) Preventivi -> _archive (solo testata)
        $this->pdo->prepare(
            "INSERT INTO tb_preventivi_archive (
                id_preventivo, id_anagrafica, anno_preventivo, numero_documento, data_preventivo,
                stato, totale_imponibile, totale_sconto, totale_iva, totale, note,
                created_at, updated_at
            )
            SELECT p.id_preventivo, p.id_anagrafica, p.anno_preventivo, p.numero_documento, p.data_preventivo,
                   COALESCE(sp.code, 'bozza') AS stato,
                   p.totale_imponibile, p.totale_sconto, p.totale_iva, p.totale, p.note,
                   p.created_at, p.updated_at
            FROM tb_preventivi p
            LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
            WHERE p.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_preventivi_archive pa WHERE pa.id_preventivo = p.id_preventivo
              )"
        )->execute([':id' => $idAnagrafica]);

        // 2) Fatture -> _archive (solo testata)
        $this->pdo->prepare(
            "INSERT INTO tb_fatture_archive (
                id_fattura, id_anagrafica, anno, numero_documento, data_fattura,
                tipo, totale_imponibile, totale_sconto, totale_iva, totale, saldo,
                stato, note, created_at, updated_at
            )
            SELECT f.id_fattura, f.id_anagrafica, f.anno, f.numero_documento, f.data_fattura,
                   COALESCE(tf.code, 'immediata') AS tipo,
                   f.totale_imponibile, f.totale_sconto, f.totale_iva, f.totale, f.saldo,
                   COALESCE(sf.code, 'bozza') AS stato,
                   f.note, f.created_at, f.updated_at
            FROM tb_fatture f
            LEFT JOIN cfg_tipi_fattura tf ON tf.id_tipo = f.id_tipo_fatt
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            WHERE f.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_fatture_archive fa WHERE fa.id_fattura = f.id_fattura
              )"
        )->execute([':id' => $idAnagrafica]);

        // 3) DDT -> _archive (solo testata)
        $this->pdo->prepare(
            "INSERT INTO tb_ddt_archive (
                id_ddt, id_anagrafica, anno, numero_documento, data_ddt,
                causale, totale_pezzi, note, created_at, updated_at
            )
            SELECT d.id_ddt, d.id_anagrafica, d.anno, d.numero_documento, d.data_ddt,
                   COALESCE(c.label, NULL) AS causale,
                   d.totale_pezzi, d.note, d.created_at, d.updated_at
            FROM tb_ddt d
            LEFT JOIN cfg_causali_ddt c ON c.id_causale = d.id_causale
            WHERE d.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_ddt_archive da WHERE da.id_ddt = d.id_ddt
              )"
        )->execute([':id' => $idAnagrafica]);

        // 4) Anagrafica base -> _archive
        $this->pdo->prepare(
            "INSERT INTO tb_anagrafiche_archive (
                id_anagrafica, id_tipologia, id_sdi_regime_fiscale, is_pa, categoria,
                ragione_sociale, piva, codice_fiscale, note,
                created_at, updated_at, archived_at, archived_by, archive_batch_id,
                inactive_since, last_document_date, archive_note
            )
            SELECT a.id_anagrafica, a.id_tipologia, a.id_sdi_regime_fiscale, a.is_pa, a.categoria,
                   a.ragione_sociale, a.piva, a.codice_fiscale, a.note,
                   a.created_at, a.updated_at, NOW(), SUBSTRING_INDEX(CURRENT_USER(), '@', 1), UUID(),
                   CURDATE(), NULL, 'Archiviata da disattivazione'
            FROM tb_anagrafiche a
            WHERE a.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_anagrafiche_archive aa WHERE aa.id_anagrafica = a.id_anagrafica
              )"
        )->execute([':id' => $idAnagrafica]);

        // 5) Fiscale -> _archive
        $this->pdo->prepare(
            "INSERT INTO tb_anagrafiche_fiscali_archive (
                id_anagrafica, pec, codice_sdi, iban, banca,
                split_pay, id_cond_pagamento, modalita_pagamento, id_sezionale, giorni_pagamento, altri_dati,
                archived_at, archived_by, archive_batch_id, archive_note
            )
            SELECT f.id_anagrafica, f.pec, f.codice_sdi, f.iban, f.banca,
                   f.split_pay, f.id_cond_pagamento, f.modalita_pagamento, f.id_sezionale, f.giorni_pagamento, f.altri_dati,
                   NOW(), SUBSTRING_INDEX(CURRENT_USER(), '@', 1), UUID(), 'Archiviata da disattivazione'
            FROM tb_anagrafiche_fiscali f
            WHERE f.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_anagrafiche_fiscali_archive fa WHERE fa.id_anagrafica = f.id_anagrafica
              )"
        )->execute([':id' => $idAnagrafica]);

        // 6) Sedi -> _archive
        $this->pdo->prepare(
            "INSERT INTO tb_sedi_archive (
                id_sede, id_anagrafica, id_tipo, denominazione,
                indirizzo, civico, cap, comune, provincia, nazione_iso2,
                telefono, email, note, is_legale, is_predefinita,
                created_at, updated_at, archived_at, archived_by, archive_batch_id, archive_note
            )
            SELECT s.id_sede, s.id_anagrafica, s.id_tipo, s.denominazione,
                   s.indirizzo, s.civico, s.cap, s.comune, s.provincia, s.nazione_iso2,
                   s.telefono, s.email, s.note, s.is_legale, s.is_predefinita,
                   s.created_at, s.updated_at, NOW(), SUBSTRING_INDEX(CURRENT_USER(), '@', 1), UUID(),
                   'Archiviata da disattivazione'
            FROM tb_sedi s
            WHERE s.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_sedi_archive sa WHERE sa.id_sede = s.id_sede
              )"
        )->execute([':id' => $idAnagrafica]);

        // 7) Contatti sede -> _archive
        $this->pdo->prepare(
            "INSERT INTO tb_sedi_contatti_archive (
                id_contatto, id_sede, nome, ruolo, telefono, cellulare, email,
                note, is_referente, is_predefinito,
                created_at, updated_at, archived_at, archived_by, archive_batch_id, archive_note
            )
            SELECT c.id_contatto, c.id_sede, c.nome, c.ruolo, c.telefono, c.cellulare, c.email,
                   NULL AS note, 0 AS is_referente, c.is_predefinito,
                   c.created_at, c.updated_at, NOW(), SUBSTRING_INDEX(CURRENT_USER(), '@', 1), UUID(),
                   'Archiviata da disattivazione'
            FROM tb_sedi_contatti c
            WHERE c.id_sede IN (SELECT s.id_sede FROM tb_sedi s WHERE s.id_anagrafica = :id)
              AND NOT EXISTS (
                SELECT 1 FROM tb_sedi_contatti_archive ca WHERE ca.id_contatto = c.id_contatto
              )"
        )->execute([':id' => $idAnagrafica]);

        // Dopo archiviazione: elimina documenti collegati (righe verranno cancellate ON DELETE CASCADE)
        foreach (['tb_preventivi', 'tb_ddt', 'tb_fatture'] as $table) {
            $stmt = $this->pdo->prepare("DELETE FROM {$table} WHERE id_anagrafica = :id");
            $stmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
            $stmt->execute();
        }

        // Elimina fiscale per evitare FK residui
        $this->pdo->prepare('DELETE FROM tb_anagrafiche_fiscali WHERE id_anagrafica = :id')
            ->execute([':id' => $idAnagrafica]);

        // Infine elimina anagrafica (cascata rimuove sedi e contatti se non già svuotate)
        $this->pdo->prepare('DELETE FROM tb_anagrafiche WHERE id_anagrafica = :id')
            ->execute([':id' => $idAnagrafica]);
    }

    /**
     * Ripristina un contatto archiviato da tb_sedi_contatti_archive a tb_sedi_contatti
     * e ricrea l'associazione in tb_contatti_anagrafiche.
     */
    public function restoreArchivedContatto(int $anagraficaId, int $archivedContattoId, array $data = []): void
    {
        $arch = $this->pdo->prepare('SELECT * FROM tb_sedi_contatti_archive WHERE id_contatto = :id LIMIT 1');
        $arch->bindValue(':id', $archivedContattoId, PDO::PARAM_INT);
        $arch->execute();
        $row = $arch->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('Contatto archiviato non trovato.', 404);
        }

        // Determine destination sede
        $targetSedeId = null;
        if (array_key_exists('id_sede', $data) && $data['id_sede'] !== null && $data['id_sede'] !== '') {
            $targetSedeId = (int)$data['id_sede'];
            $chk = $this->pdo->prepare('SELECT 1 FROM tb_sedi WHERE id_anagrafica = :anag AND id_sede = :sede LIMIT 1');
            $chk->execute([':anag' => $anagraficaId, ':sede' => $targetSedeId]);
            if ($chk->fetchColumn() === false) {
                throw new RuntimeException('Sede di destinazione non valida per il ripristino.', 422);
            }
        } else {
            $candidate = isset($row['id_sede']) ? (int)$row['id_sede'] : 0;
            if ($candidate > 0) {
                $chk = $this->pdo->prepare('SELECT 1 FROM tb_sedi WHERE id_anagrafica = :anag AND id_sede = :sede LIMIT 1');
                $chk->execute([':anag' => $anagraficaId, ':sede' => $candidate]);
                if ($chk->fetchColumn() !== false) {
                    $targetSedeId = $candidate;
                }
            }
            if ($targetSedeId === null) {
                $pick = $this->pdo->prepare('SELECT id_sede FROM tb_sedi WHERE id_anagrafica = :anag ORDER BY is_predefinita DESC, is_legale DESC, id_sede ASC LIMIT 1');
                $pick->execute([':anag' => $anagraficaId]);
                $val = $pick->fetchColumn();
                if ($val === false) {
                    throw new RuntimeException('Nessuna sede attiva trovata per il ripristino del contatto.', 422);
                }
                $targetSedeId = (int)$val;
            }
        }

        $setDefault = 0;
        if (array_key_exists('is_predefinito', $data)) {
            $setDefault = (int)$data['is_predefinito'] === 1 ? 1 : 0;
        } elseif (isset($row['is_predefinito']) && (int)$row['is_predefinito'] === 1) {
            $setDefault = 1;
        }

        if ($setDefault === 1) {
            $unset = $this->pdo->prepare('UPDATE tb_sedi_contatti SET is_predefinito = 0 WHERE id_sede = :sede');
            $unset->bindValue(':sede', $targetSedeId, PDO::PARAM_INT);
            $unset->execute();
        }

        $ins = $this->pdo->prepare('INSERT INTO tb_sedi_contatti (id_sede, nome, ruolo, telefono, cellulare, email, note, is_predefinito) VALUES (:sede, :nome, :ruolo, :tel, :cell, :email, :note, :pref)');
        $ins->bindValue(':sede', $targetSedeId, PDO::PARAM_INT);
        $ins->bindValue(':nome', (string)($row['nome'] ?? ''), PDO::PARAM_STR);
        $ins->bindValue(':ruolo', isset($row['ruolo']) ? (string)$row['ruolo'] : null, $row['ruolo'] !== null && $row['ruolo'] !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $ins->bindValue(':tel', isset($row['telefono']) ? (string)$row['telefono'] : null, $row['telefono'] !== null && $row['telefono'] !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $ins->bindValue(':cell', isset($row['cellulare']) ? (string)$row['cellulare'] : null, $row['cellulare'] !== null && $row['cellulare'] !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $ins->bindValue(':email', isset($row['email']) ? (string)$row['email'] : null, $row['email'] !== null && $row['email'] !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $ins->bindValue(':note', isset($row['note']) ? (string)$row['note'] : null, $row['note'] !== null && $row['note'] !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $ins->bindValue(':pref', $setDefault, PDO::PARAM_INT);
        $ins->execute();

        $newId = (int)$this->pdo->lastInsertId();

        $assocSql = 'INSERT INTO tb_contatti_anagrafiche (id_anagrafica, id_contatto, is_predefinita) VALUES (:anagrafica, :contatto, 0) ON DUPLICATE KEY UPDATE is_predefinita = VALUES(is_predefinita)';
        $assoc = $this->pdo->prepare($assocSql);
        $assoc->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
        $assoc->bindValue(':contatto', $newId, PDO::PARAM_INT);
        $assoc->execute();

        $del = $this->pdo->prepare('DELETE FROM tb_sedi_contatti_archive WHERE id_contatto = :id');
        $del->bindValue(':id', $archivedContattoId, PDO::PARAM_INT);
        $del->execute();
    }
    /**
     * Riattiva una anagrafica dall'archivio riportandola nelle tabelle principali.
     * Ripristina: anagrafica base, fiscale, sedi, contatti sede.
     * (Documenti non ripristinati in questa versione.)
     */
    public function reactivateFromArchive(int $idAnagrafica): void
    {
        // 1) Ripristina tb_anagrafiche (usa stesso id)
        $sqlAnag = <<<'SQL'
            INSERT INTO tb_anagrafiche (
                id_anagrafica, id_tipologia, id_sdi_regime_fiscale, is_pa, categoria, is_active, stato,
                ragione_sociale, piva, codice_fiscale, note, created_at, updated_at
            )
            SELECT
                a.id_anagrafica, a.id_tipologia, a.id_sdi_regime_fiscale, a.is_pa, a.categoria, 1, 'attiva',
                a.ragione_sociale, a.piva, a.codice_fiscale, a.note, a.created_at, NOW()
            FROM tb_anagrafiche_archive a
            WHERE a.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_anagrafiche x WHERE x.id_anagrafica = a.id_anagrafica
              )
        SQL;
        $stmt = $this->pdo->prepare($sqlAnag);
        $stmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
        $stmt->execute();

        // 2) Fiscale
        $sqlFisc = <<<'SQL'
            INSERT INTO tb_anagrafiche_fiscali (
                id_anagrafica, pec, codice_sdi, iban, banca, id_cond_pagamento,
                split_pay, modalita_pagamento, id_sezionale, giorni_pagamento, altri_dati
            )
            SELECT
                f.id_anagrafica, f.pec, f.codice_sdi, f.iban, f.banca, f.id_cond_pagamento,
                f.split_pay, f.modalita_pagamento, f.id_sezionale, f.giorni_pagamento, f.altri_dati
            FROM tb_anagrafiche_fiscali_archive f
            WHERE f.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_anagrafiche_fiscali x WHERE x.id_anagrafica = f.id_anagrafica
              )
        SQL;
        $stmt = $this->pdo->prepare($sqlFisc);
        $stmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
        $stmt->execute();

        // 3) Sedi
        $sqlSedi = <<<'SQL'
            INSERT INTO tb_sedi (
                id_sede, id_anagrafica, id_tipo, denominazione, indirizzo, civico, cap,
                comune, provincia, nazione_iso2, telefono, email, note, is_legale, is_predefinita,
                created_at, updated_at
            )
            SELECT
                s.id_sede, s.id_anagrafica, s.id_tipo, s.denominazione, s.indirizzo, s.civico, s.cap,
                s.comune, s.provincia, s.nazione_iso2, s.telefono, s.email, s.note, s.is_legale, s.is_predefinita,
                s.created_at, NOW()
            FROM tb_sedi_archive s
            WHERE s.id_anagrafica = :id
              AND NOT EXISTS (
                SELECT 1 FROM tb_sedi x WHERE x.id_sede = s.id_sede
              )
        SQL;
        $stmt = $this->pdo->prepare($sqlSedi);
        $stmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
        $stmt->execute();

        // 4) Contatti sede
        $sqlCont = <<<'SQL'
            INSERT INTO tb_sedi_contatti (
                id_contatto, id_sede, nome, ruolo, telefono, cellulare, email, stato,
                is_predefinito, created_at, updated_at
            )
            SELECT
                c.id_contatto, c.id_sede, c.nome, c.ruolo, c.telefono, c.cellulare, c.email, 'Attivo' AS stato,
                c.is_predefinito, c.created_at, NOW()
            FROM tb_sedi_contatti_archive c
            WHERE c.id_sede IN (
                SELECT s.id_sede FROM tb_sedi_archive s WHERE s.id_anagrafica = :id
            )
              AND NOT EXISTS (
                SELECT 1 FROM tb_sedi_contatti x WHERE x.id_contatto = c.id_contatto
              )
        SQL;
        $stmt = $this->pdo->prepare($sqlCont);
        $stmt->bindValue(':id', $idAnagrafica, PDO::PARAM_INT);
        $stmt->execute();
    }
}
