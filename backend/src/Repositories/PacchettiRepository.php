<?php
// backend/src/Repositories/PacchettiRepository.php

namespace MediaPrint\Repo;

use PDO;

final class PacchettiRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return list<array{id_pacchetto:int,codice:?string,nome:string,attivo:int,updated_at:?string}>
     */
    public function listPacchetti(?string $search = null, ?bool $onlyActive = null): array
    {
        $sql = 'SELECT id_pacchetto, codice, nome, attivo, updated_at FROM tb_pacchetti WHERE 1=1';
        $params = [];
        if ($search !== null && trim($search) !== '') {
            $sql .= ' AND (nome LIKE :q OR codice LIKE :q)';
            $params[':q'] = '%' . trim($search) . '%';
        }
        if ($onlyActive === true) {
            $sql .= ' AND attivo = 1';
        }
        $sql .= ' ORDER BY attivo DESC, nome ASC LIMIT 200';

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v, PDO::PARAM_STR);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(
            fn ($r) => [
                'id_pacchetto' => (int) $r['id_pacchetto'],
                'codice' => $r['codice'] ?? null,
                'nome' => (string) $r['nome'],
                'attivo' => (int) ($r['attivo'] ?? 1),
                'updated_at' => $r['updated_at'] ?? null,
            ],
            $rows
        );
    }

    /**
     * @return array{id_pacchetto:int,codice:?string,nome:string,descrizione:?string,attivo:int,created_at:?string,updated_at:?string}|null
     */
    public function getById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id_pacchetto, codice, nome, descrizione, attivo, created_at, updated_at FROM tb_pacchetti WHERE id_pacchetto = :id LIMIT 1');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) return null;
        return [
            'id_pacchetto' => (int) $row['id_pacchetto'],
            'codice' => $row['codice'] ?? null,
            'nome' => (string) $row['nome'],
            'descrizione' => $row['descrizione'] ?? null,
            'attivo' => (int) ($row['attivo'] ?? 1),
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * @return list<array{id_riga:int,descrizione:string,quantita:float,prezzo_unitario:float,sconto:float|null,iva:float|null,id_prodotto:int|null,id_sdi_natura_iva:int|null,posizione:int|null}>
     */
    public function getLines(int $idPacchetto): array
    {
        $sql = 'SELECT id_riga, id_prodotto, descrizione, quantita, prezzo_unitario, sconto, iva, id_sdi_natura_iva, posizione FROM tb_pacchetti_righe WHERE id_pacchetto = :id ORDER BY COALESCE(posizione, id_riga) ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idPacchetto, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id_riga' => (int) $r['id_riga'],
                'descrizione' => (string) ($r['descrizione'] ?? ''),
                'quantita' => isset($r['quantita']) ? (float) $r['quantita'] : 1.0,
                'prezzo_unitario' => isset($r['prezzo_unitario']) ? (float) $r['prezzo_unitario'] : 0.0,
                'sconto' => isset($r['sconto']) ? (float) $r['sconto'] : null,
                'iva' => isset($r['iva']) ? (float) $r['iva'] : null,
                'id_prodotto' => isset($r['id_prodotto']) ? (int) $r['id_prodotto'] : null,
                'id_sdi_natura_iva' => isset($r['id_sdi_natura_iva']) ? (int) $r['id_sdi_natura_iva'] : null,
                'posizione' => isset($r['posizione']) ? (int) $r['posizione'] : null,
            ];
        }
        return $out;
    }

    /**
     * @param array{codice:?string,nome:string,descrizione:?string,attivo:bool|int} $data
     * @return int id_pacchetto
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO tb_pacchetti (codice, nome, descrizione, attivo, created_at, updated_at) VALUES (:codice, :nome, :descrizione, :attivo, NOW(), NOW())');
        $stmt->bindValue(':codice', $data['codice'] ?? null, ($data['codice'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':nome', (string) $data['nome'], PDO::PARAM_STR);
        $stmt->bindValue(':descrizione', $data['descrizione'] ?? null, ($data['descrizione'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':attivo', !empty($data['attivo']) ? 1 : 0, PDO::PARAM_INT);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array{codice?:?string,nome?:string,descrizione?:?string,attivo?:bool|int} $data
     */
    public function update(int $idPacchetto, array $data): void
    {
        $sql = 'UPDATE tb_pacchetti SET codice = :codice, nome = :nome, descrizione = :descrizione, attivo = :attivo, updated_at = NOW() WHERE id_pacchetto = :id LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $idPacchetto, PDO::PARAM_INT);
        $stmt->bindValue(':codice', $data['codice'] ?? null, ($data['codice'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':nome', (string) ($data['nome'] ?? ''), PDO::PARAM_STR);
        $stmt->bindValue(':descrizione', $data['descrizione'] ?? null, ($data['descrizione'] ?? null) !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
        $stmt->bindValue(':attivo', !empty($data['attivo']) ? 1 : 0, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * Sostituisce interamente le righe di un pacchetto.
     * @param list<array<string,mixed>> $lines
     */
    public function replaceLines(int $idPacchetto, array $lines): void
    {
        $this->pdo->beginTransaction();
        try {
            $del = $this->pdo->prepare('DELETE FROM tb_pacchetti_righe WHERE id_pacchetto = :id');
            $del->bindValue(':id', $idPacchetto, PDO::PARAM_INT);
            $del->execute();

            if (!empty($lines)) {
                $ins = $this->pdo->prepare(<<<'SQL'
                    INSERT INTO tb_pacchetti_righe (
                        id_pacchetto, id_prodotto, descrizione, quantita, prezzo_unitario, sconto, iva, id_sdi_natura_iva, posizione
                    ) VALUES (
                        :id_pacchetto, :id_prodotto, :descrizione, :quantita, :prezzo_unitario, :sconto, :iva, :id_sdi_natura_iva, :posizione
                    )
                SQL);

                $pos = 1;
                foreach ($lines as $line) {
                    $descr = trim((string) ($line['descrizione'] ?? ''));
                    if ($descr === '') { continue; }
                    $q = (float) ($line['quantita'] ?? 1);
                    $pu = (float) ($line['prezzo'] ?? $line['prezzo_unitario'] ?? 0);
                    $s = isset($line['sconto']) ? (float) $line['sconto'] : 0.0;
                    $iva = isset($line['iva']) ? (float) $line['iva'] : null;
                    $idProd = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
                    $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;

                    $ins->bindValue(':id_pacchetto', $idPacchetto, PDO::PARAM_INT);
                    $ins->bindValue(':id_prodotto', $idProd, $idProd === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                    $ins->bindValue(':descrizione', $descr, PDO::PARAM_STR);
                    $ins->bindValue(':quantita', $q, PDO::PARAM_STR);
                    $ins->bindValue(':prezzo_unitario', $pu, PDO::PARAM_STR);
                    $ins->bindValue(':sconto', $s, PDO::PARAM_STR);
                    $ins->bindValue(':iva', $iva, $iva === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                    $ins->bindValue(':id_sdi_natura_iva', $idNatura, $idNatura === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
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

    public function delete(int $idPacchetto): void
    {
        $this->pdo->beginTransaction();
        try {
            $delR = $this->pdo->prepare('DELETE FROM tb_pacchetti_righe WHERE id_pacchetto = :id');
            $delR->bindValue(':id', $idPacchetto, PDO::PARAM_INT);
            $delR->execute();
            $del = $this->pdo->prepare('DELETE FROM tb_pacchetti WHERE id_pacchetto = :id');
            $del->bindValue(':id', $idPacchetto, PDO::PARAM_INT);
            $del->execute();
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
