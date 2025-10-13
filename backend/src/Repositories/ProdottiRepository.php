<?php
// backend/src/Repositories/ProdottiRepository.php

namespace MediaPrint\Repo;

use PDO;

final class ProdottiRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return list<array{id_categoria:int, nome:string}>
     */
    public function listCategorie(): array
    {
        $stmt = $this->pdo->query('SELECT id_categoria, nome FROM tb_categorie ORDER BY nome ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(
            fn ($r) => [
                'id_categoria' => (int) $r['id_categoria'],
                'nome' => (string) $r['nome'],
            ],
            $rows
        );
    }

    /**
     * @return list<array{
     *   id_prodotto:int,
     *   id_categoria:int|null,
     *   codice:?string,
     *   nome:string,
     *   prezzo_listino:float|null,
     *   id_iva:int|null,
     *   iva_percento:float|null
     * }>
     */
    public function listProdotti(?int $idCategoria = null, ?string $search = null, ?bool $soloAttivi = true): array
    {
        $sql = <<<'SQL'
            SELECT p.id_prodotto, p.id_categoria, p.codice, p.nome, p.prezzo_listino, p.id_iva, p.id_sdi_natura_iva, i.percento AS iva_percento
            FROM tb_prodotti p
            LEFT JOIN cfg_iva i ON i.id_iva = p.id_iva
            WHERE 1=1
        SQL;
        $cond = [];
        $params = [];
        if ($idCategoria !== null) {
            $cond[] = 'p.id_categoria = :cat';
            $params[':cat'] = $idCategoria;
        }
        if ($soloAttivi === true) {
            $cond[] = 'p.attivo = 1';
        }
        if ($search !== null && trim($search) !== '') {
            $cond[] = '(p.nome LIKE :q1 OR p.codice LIKE :q2)';
            $like = '%' . trim($search) . '%';
            $params[':q1'] = $like;
            $params[':q2'] = $like;
        }
        if (!empty($cond)) {
            $sql .= ' AND ' . implode(' AND ', $cond);
        }
        $sql .= ' ORDER BY p.nome ASC LIMIT 200';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            if ($k === ':cat') {
                $stmt->bindValue($k, (int) $v, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($k, (string) $v, PDO::PARAM_STR);
            }
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_prodotto' => (int) $r['id_prodotto'],
                'id_categoria' => isset($r['id_categoria']) ? (int) $r['id_categoria'] : null,
                'codice' => $r['codice'] ?? null,
                'nome' => (string) $r['nome'],
                'prezzo_listino' => isset($r['prezzo_listino']) ? (float) $r['prezzo_listino'] : null,
                'id_iva' => isset($r['id_iva']) ? (int) $r['id_iva'] : null,
                'id_sdi_natura_iva' => isset($r['id_sdi_natura_iva']) ? (int) $r['id_sdi_natura_iva'] : null,
                'iva_percento' => isset($r['iva_percento']) ? (float) $r['iva_percento'] : null,
            ];
        }
        return $out;
    }

    /**
     * @return array{id_prodotto:int,id_categoria:?int,codice:?string,nome:string,descrizione:?string,prezzo_listino:?float,id_iva:?int}
     */
    public function getProdottoById(int $id): array
    {
        $stmt = $this->pdo->prepare('SELECT id_prodotto, id_categoria, codice, nome, descrizione, prezzo_listino, id_iva, id_sdi_natura_iva FROM tb_prodotti WHERE id_prodotto = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \RuntimeException('Prodotto non trovato', 404);
        }
        return [
            'id_prodotto' => (int) $row['id_prodotto'],
            'id_categoria' => isset($row['id_categoria']) ? (int) $row['id_categoria'] : null,
            'codice' => $row['codice'] ?? null,
            'nome' => (string) $row['nome'],
            'descrizione' => $row['descrizione'] ?? null,
            'prezzo_listino' => isset($row['prezzo_listino']) ? (float) $row['prezzo_listino'] : null,
            'id_iva' => isset($row['id_iva']) ? (int) $row['id_iva'] : null,
            'id_sdi_natura_iva' => isset($row['id_sdi_natura_iva']) ? (int) $row['id_sdi_natura_iva'] : null,
        ];
    }

    /**
     * @param array{codice:?string,nome:string,id_categoria:?int,prezzo_listino:?float,id_iva?:?int} $data
     * @return int id_prodotto
     */
    public function createProdotto(array $data): int
    {
        $sql = 'INSERT INTO tb_prodotti (id_categoria, codice, nome, prezzo_listino, id_iva, id_sdi_natura_iva, attivo) VALUES (:id_categoria, :codice, :nome, :prezzo_listino, :id_iva, :id_sdi_natura_iva, 1)';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id_categoria', $data['id_categoria'], $data['id_categoria'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':codice', $data['codice'] ?? null, $data['codice'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':nome', $data['nome'], PDO::PARAM_STR);
        if (array_key_exists('prezzo_listino', $data)) {
            $stmt->bindValue(':prezzo_listino', $data['prezzo_listino']);
        } else {
            $stmt->bindValue(':prezzo_listino', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':id_iva', $data['id_iva'] ?? null, (isset($data['id_iva']) && $data['id_iva'] !== null) ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':id_sdi_natura_iva', $data['id_sdi_natura_iva'] ?? null, (isset($data['id_sdi_natura_iva']) && $data['id_sdi_natura_iva'] !== null) ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array{id_prodotto:int,codice:?string,nome:string,id_categoria:?int,prezzo_listino:?float,id_iva?:?int} $data
     */
    public function updateProdotto(array $data): void
    {
        $sql = 'UPDATE tb_prodotti SET id_categoria = :id_categoria, codice = :codice, nome = :nome, prezzo_listino = :prezzo_listino, id_iva = :id_iva, id_sdi_natura_iva = :id_sdi_natura_iva WHERE id_prodotto = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', (int) $data['id_prodotto'], PDO::PARAM_INT);
        $stmt->bindValue(':id_categoria', $data['id_categoria'], $data['id_categoria'] !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':codice', $data['codice'] ?? null, $data['codice'] !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':nome', $data['nome'], PDO::PARAM_STR);
        if (array_key_exists('prezzo_listino', $data)) {
            $stmt->bindValue(':prezzo_listino', $data['prezzo_listino']);
        } else {
            $stmt->bindValue(':prezzo_listino', null, PDO::PARAM_NULL);
        }
        $stmt->bindValue(':id_iva', $data['id_iva'] ?? null, (isset($data['id_iva']) && $data['id_iva'] !== null) ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->bindValue(':id_sdi_natura_iva', $data['id_sdi_natura_iva'] ?? null, (isset($data['id_sdi_natura_iva']) && $data['id_sdi_natura_iva'] !== null) ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();
    }

    /**
     * @return int id_categoria
     */
    public function upsertCategoria(?int $idCategoria, string $nome): int
    {
        if ($idCategoria !== null && $idCategoria > 0) {
            $stmt = $this->pdo->prepare('UPDATE tb_categorie SET nome = :nome WHERE id_categoria = :id');
            $stmt->bindValue(':id', $idCategoria, PDO::PARAM_INT);
            $stmt->bindValue(':nome', $nome, PDO::PARAM_STR);
            $stmt->execute();
            return $idCategoria;
        }
        $stmt = $this->pdo->prepare('INSERT INTO tb_categorie (nome) VALUES (:nome)');
        $stmt->bindValue(':nome', $nome, PDO::PARAM_STR);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @return list<array{id_variazione:int,nome:string}>
     */
    public function listVariazioni(): array
    {
        $stmt = $this->pdo->query('SELECT id_variazione, codice, nome, categoria, prezzo FROM tb_variazioni ORDER BY nome ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(fn($r) => [ 'id_variazione' => (int) $r['id_variazione'], 'codice' => $r['codice'] ?? null, 'nome' => (string) $r['nome'], 'categoria' => $r['categoria'] ?? null, 'prezzo' => isset($r['prezzo']) ? (float) $r['prezzo'] : 0.0 ], $rows);
    }

    /**
     * @return int id_variazione
     */
    public function upsertVariazione(?int $idVariazione, string $nome, ?float $prezzo = null, ?string $categoria = null, ?string $codice = null): int
    {
        if ($idVariazione !== null && $idVariazione > 0) {
            $stmt = $this->pdo->prepare('UPDATE tb_variazioni SET nome = :nome, categoria = :categoria, prezzo = :prezzo, codice = :codice WHERE id_variazione = :id');
            $stmt->bindValue(':id', $idVariazione, PDO::PARAM_INT);
            $stmt->bindValue(':nome', $nome, PDO::PARAM_STR);
            if ($categoria === null || $categoria === '') {
                $stmt->bindValue(':categoria', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':categoria', $categoria, PDO::PARAM_STR);
            }
            if ($prezzo === null) {
                $stmt->bindValue(':prezzo', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':prezzo', $prezzo);
            }
            if ($codice === null || $codice === '') {
                $stmt->bindValue(':codice', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':codice', $codice, PDO::PARAM_STR);
            }
            $stmt->execute();
            return $idVariazione;
        }
        $stmt = $this->pdo->prepare('INSERT INTO tb_variazioni (nome, categoria, prezzo, codice) VALUES (:nome, :categoria, :prezzo, :codice)');
        $stmt->bindValue(':nome', $nome, PDO::PARAM_STR);
        if ($categoria === null || $categoria === '') {
            $stmt->bindValue(':categoria', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':categoria', $categoria, PDO::PARAM_STR);
        }
        if ($prezzo === null) {
            $stmt->bindValue(':prezzo', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':prezzo', $prezzo);
        }
        if ($codice === null || $codice === '') {
            $stmt->bindValue(':codice', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':codice', $codice, PDO::PARAM_STR);
        }
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @return list<array{id_variazione:int,nome:string}>
     */
    public function listVariazioniByProdotto(int $idProdotto): array
    {
        $sql = 'SELECT v.id_variazione, v.codice, v.nome, v.categoria, v.prezzo, pv.delta_prezzo
                FROM appoggio_prodotto_variazione pv
                JOIN tb_variazioni v ON v.id_variazione = pv.id_variazione
                WHERE pv.id_prodotto = :id
                ORDER BY v.nome ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idProdotto, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(fn($r) => [ 'id_variazione' => (int) $r['id_variazione'], 'codice' => $r['codice'] ?? null, 'nome' => (string) $r['nome'], 'categoria' => $r['categoria'] ?? null, 'prezzo' => isset($r['prezzo']) ? (float) $r['prezzo'] : 0.0, 'delta_prezzo' => isset($r['delta_prezzo']) ? (float) $r['delta_prezzo'] : 0.0 ], $rows);
    }

    public function linkVariazioneToProdotto(int $idProdotto, int $idVariazione, float $deltaPrezzo = 0.0): void
    {
        // inserisce o aggiorna delta prezzo evitando duplicati
        $stmt = $this->pdo->prepare('INSERT INTO appoggio_prodotto_variazione (id_prodotto, id_variazione, delta_prezzo) VALUES (:p, :v, :d)
            ON DUPLICATE KEY UPDATE delta_prezzo = VALUES(delta_prezzo)');
        $stmt->bindValue(':p', $idProdotto, PDO::PARAM_INT);
        $stmt->bindValue(':v', $idVariazione, PDO::PARAM_INT);
        $stmt->bindValue(':d', $deltaPrezzo);
        $stmt->execute();
    }

    public function unlinkVariazioneFromProdotto(int $idProdotto, int $idVariazione): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM appoggio_prodotto_variazione WHERE id_prodotto = :p AND id_variazione = :v');
        $stmt->bindValue(':p', $idProdotto, PDO::PARAM_INT);
        $stmt->bindValue(':v', $idVariazione, PDO::PARAM_INT);
        $stmt->execute();
    }

    public function updateVariazioneDelta(int $idProdotto, int $idVariazione, float $deltaPrezzo): void
    {
        $stmt = $this->pdo->prepare('UPDATE appoggio_prodotto_variazione SET delta_prezzo = :d WHERE id_prodotto = :p AND id_variazione = :v');
        $stmt->bindValue(':p', $idProdotto, PDO::PARAM_INT);
        $stmt->bindValue(':v', $idVariazione, PDO::PARAM_INT);
        $stmt->bindValue(':d', $deltaPrezzo);
        $stmt->execute();
    }

    public function deleteVariazione(int $idVariazione): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM tb_variazioni WHERE id_variazione = :id');
        $stmt->bindValue(':id', $idVariazione, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * Prezzi combinati per prodotto in base a più variazioni.
     * La chiave di combinazione è una stringa deterministica con ID variazioni ordinati e separati da '+'.
     * Esempio: "12+45".
     *
     * @return list<array{id:int,id_prodotto:int,combo_key:string,var_ids:list<int>,prezzo:float}>
     */
    public function listPrezziCombinatiByProdotto(int $idProdotto): array
    {
        $stmt = $this->pdo->prepare('SELECT id, id_prodotto, combo_key, prezzo FROM tb_prezzi_variazioni WHERE id_prodotto = :p ORDER BY combo_key ASC');
        $stmt->bindValue(':p', $idProdotto, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $r) {
            $key = (string) $r['combo_key'];
            $ids = [];
            foreach (explode('+', $key) as $part) {
                $n = (int) trim($part);
                if ($n > 0) { $ids[] = $n; }
            }
            $out[] = [
                'id' => (int) $r['id'],
                'id_prodotto' => (int) $r['id_prodotto'],
                'combo_key' => $key,
                'var_ids' => $ids,
                'prezzo' => isset($r['prezzo']) ? (float) $r['prezzo'] : 0.0,
            ];
        }
        return $out;
    }

    /**
     * Inserisce/Aggiorna un prezzo combinato per prodotto.
     * @param list<int> $varIds
     * @return int ID record
     */
    public function upsertPrezzoCombinato(int $idProdotto, array $varIds, float $prezzo): int
    {
        $filtered = array_values(array_filter(array_map(fn($v) => (int) $v, $varIds), fn($v) => $v > 0));
        sort($filtered, SORT_NUMERIC);
        if (empty($filtered)) { throw new \RuntimeException('Nessuna variazione valida', 422); }
        $comboKey = implode('+', $filtered);

        $stmt = $this->pdo->prepare('INSERT INTO tb_prezzi_variazioni (id_prodotto, combo_key, prezzo) VALUES (:p, :k, :z)
            ON DUPLICATE KEY UPDATE prezzo = VALUES(prezzo)');
        $stmt->bindValue(':p', $idProdotto, PDO::PARAM_INT);
        $stmt->bindValue(':k', $comboKey, PDO::PARAM_STR);
        $stmt->bindValue(':z', $prezzo);
        $stmt->execute();

        $sel = $this->pdo->prepare('SELECT id FROM tb_prezzi_variazioni WHERE id_prodotto = :p AND combo_key = :k LIMIT 1');
        $sel->bindValue(':p', $idProdotto, PDO::PARAM_INT);
        $sel->bindValue(':k', $comboKey, PDO::PARAM_STR);
        $sel->execute();
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['id'] ?? 0);
    }

    /**
     * Elimina un prezzo combinato dato un insieme di variazioni.
     * @param list<int> $varIds
     */
    public function deletePrezzoCombinato(int $idProdotto, array $varIds): void
    {
        $filtered = array_values(array_filter(array_map(fn($v) => (int) $v, $varIds), fn($v) => $v > 0));
        sort($filtered, SORT_NUMERIC);
        if (empty($filtered)) { throw new \RuntimeException('Nessuna variazione valida', 422); }
        $comboKey = implode('+', $filtered);
        $stmt = $this->pdo->prepare('DELETE FROM tb_prezzi_variazioni WHERE id_prodotto = :p AND combo_key = :k');
        $stmt->bindValue(':p', $idProdotto, PDO::PARAM_INT);
        $stmt->bindValue(':k', $comboKey, PDO::PARAM_STR);
        $stmt->execute();
    }
}
