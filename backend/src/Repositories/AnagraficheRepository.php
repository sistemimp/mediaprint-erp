<?php
// backend/src/Repositories/AnagraficheRepository.php

namespace MediaPrint\Repo;

use PDO;

final class AnagraficheRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return array{data: list<array<string, mixed>>, total: int}
     */
    public function search(array $filters): array
    {
        $sql = <<<'SQL'
            SELECT
                id_anagrafica,
                ragione_sociale,
                piva,
                codice_fiscale,
                indirizzo,
                cap,
                citta,
                provincia,
                nazione,
                email,
                telefono,
                stato,
                created_at,
                updated_at
            FROM tb_anagrafiche
        SQL;

        $where = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[] = '(ragione_sociale LIKE :needle
                OR piva LIKE :needle
                OR codice_fiscale LIKE :needle)';
            $params[':needle'] = '%' . $filters['search'] . '%';
        }

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

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

        $direction = strtolower($filters['sort_direction']) === 'desc' ? 'DESC' : 'ASC';

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

        $countSql = 'SELECT COUNT(*) FROM tb_anagrafiche';
        if ($where) {
            $countSql .= ' WHERE ' . implode(' AND ', $where);
        }
        $countStatement = $this->pdo->prepare($countSql);
        if (!empty($params[':needle'])) {
            $countStatement->bindValue(':needle', $params[':needle'], PDO::PARAM_STR);
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
        $baseSql = <<<'SQL'
            SELECT
                id_anagrafica,
                id_tipologia,
                id_sdi_regime_fiscale,
                is_pa,
                is_active,
                stato,
                ragione_sociale,
                piva,
                codice_fiscale,
                indirizzo,
                cap,
                citta,
                provincia,
                nazione,
                email,
                telefono,
                note,
                created_at,
                updated_at
            FROM tb_anagrafiche
            WHERE id_anagrafica = :id
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
                id_cond_pagamento,
                modalita_pagamento,
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
                sc.cognome,
                sc.ruolo,
                sc.telefono,
                sc.cellulare,
                sc.email,
                sc.note,
                sc.is_referente,
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
            ORDER BY sc.is_predefinito DESC, sc.nome ASC, sc.cognome ASC
        SQL;

        $contattiStatement = $this->pdo->prepare($contattiSql);
        $contattiStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $contattiStatement->execute();
        $contatti = $contattiStatement->fetchAll(PDO::FETCH_ASSOC);

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
            LIMIT 10
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
            LIMIT 10
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
                f.totale_imponibile,
                f.totale_sconto,
                f.totale_iva,
                f.totale,
                f.saldo,
                sf.code AS stato_code,
                sf.label AS stato_label,
                f.created_at,
                f.updated_at
            FROM tb_fatture f
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            WHERE f.id_anagrafica = :id
            ORDER BY f.data_fattura DESC, f.created_at DESC
            LIMIT 10
        SQL;

        $fattureStatement = $this->pdo->prepare($fattureSql);
        $fattureStatement->bindValue(':id', $id, PDO::PARAM_INT);
        $fattureStatement->execute();
        $fatture = $fattureStatement->fetchAll(PDO::FETCH_ASSOC);

        return [
            'anagrafica' => $anagrafica,
            'fiscale' => $fiscale,
            'contatti' => $contatti,
            'preventivi' => $preventivi,
            'ddt' => $ddt,
            'fatture' => $fatture,
        ];
    }
}
