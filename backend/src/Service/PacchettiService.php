<?php
// backend/src/Service/PacchettiService.php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\PacchettiRepository;

final class PacchettiService
{
    public function __construct(private PacchettiRepository $repository) {}

    /**
     * @return array{items:list<array<string,mixed>>}
     */
    public function list(array $input): array
    {
        $q = isset($input['q']) ? (string) $input['q'] : null;
        $onlyActive = null;
        if (isset($input['only_active'])) {
            $val = $input['only_active'];
            if (is_scalar($val)) {
                $onlyActive = filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            }
        }
        // only_active nullo = nessun filtro esplicito sullo stato.
        $rows = $this->repository->listPacchetti($q, $onlyActive);
        return ['items' => $rows];
    }

    /**
     * @return array{data:array<string,mixed>,righe:list<array<string,mixed>>}
     */
    public function detail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_pacchetto']) ? (int) $input['id_pacchetto'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID pacchetto mancante o non valido.', 422);
        }
        $row = $this->repository->getById($id);
        if ($row === null) {
            throw new \RuntimeException('Pacchetto non trovato.', 404);
        }
        $righe = $this->repository->getLines($id);
        return [ 'data' => $row, 'righe' => $righe ];
    }

    /**
     * Crea/Aggiorna un pacchetto e, se presenti, le righe.
     * Input: { id_pacchetto?, codice?, nome, descrizione?, attivo?, righe? }
     * Output: { id_pacchetto:int }
     * @return array{id_pacchetto:int}
     */
    public function save(array $input): array
    {
        $id = isset($input['id_pacchetto']) ? (int) $input['id_pacchetto'] : 0;
        $nome = trim((string) ($input['nome'] ?? ''));
        if ($nome === '') { throw new \RuntimeException('Nome pacchetto obbligatorio', 422); }

        $data = [
            'codice' => isset($input['codice']) && trim((string)$input['codice']) !== '' ? (string) $input['codice'] : null,
            'nome' => $nome,
            'descrizione' => isset($input['descrizione']) && trim((string)$input['descrizione']) !== '' ? (string) $input['descrizione'] : null,
            'attivo' => !empty($input['attivo']) ? 1 : 0,
        ];

        $lines = [];
        $hasLinesPayload = array_key_exists('righe', $input);
        // Se "righe" non e' presente, in update lasciamo inalterate le righe esistenti.
        if ($hasLinesPayload && is_array($input['righe'])) {
            foreach ($input['righe'] as $r) {
                if (!is_array($r)) continue;
                $idCategoria = isset($r['id_categoria']) ? (int) $r['id_categoria'] : null;
                if ($idCategoria !== null && $idCategoria <= 0) { $idCategoria = null; }
                $categoriaNome = isset($r['categoria_nome']) && trim((string)$r['categoria_nome']) !== ''
                    ? (string) $r['categoria_nome']
                    : null;
                $comboKey = isset($r['combo_key']) ? trim((string) $r['combo_key']) : null;
                if ($comboKey === '') {
                    $comboKey = null;
                }
                $lines[] = [
                    'descrizione' => (string) ($r['descrizione'] ?? ''),
                    'quantita' => isset($r['quantita']) ? (float) $r['quantita'] : 1.0,
                    'prezzo' => isset($r['prezzo']) ? (float) $r['prezzo'] : (isset($r['prezzo_unitario']) ? (float) $r['prezzo_unitario'] : 0.0),
                    'sconto' => isset($r['sconto']) ? (float) $r['sconto'] : 0.0,
                    'iva' => isset($r['iva']) ? (float) $r['iva'] : null,
                    'id_prodotto' => isset($r['id_prodotto']) ? (int) $r['id_prodotto'] : null,
                    'combo_key' => $comboKey,
                    'id_sdi_natura_iva' => isset($r['id_sdi_natura_iva']) ? (int) $r['id_sdi_natura_iva'] : null,
                    'id_categoria' => $idCategoria,
                    'categoria_nome' => $categoriaNome,
                ];
            }
        }

        if ($id > 0) {
            $this->repository->update($id, $data);
            if ($hasLinesPayload) {
                // replace totale voluto: evita divergenze tra frontend e DB su ordinamento/contenuto.
                $this->repository->replaceLines($id, $lines);
            }
            return ['id_pacchetto' => $id];
        }

        $newId = $this->repository->create($data);
        if ($hasLinesPayload) {
            $this->repository->replaceLines($newId, $lines);
        }
        return ['id_pacchetto' => $newId];
    }

    public function delete(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_pacchetto']) ? (int) $input['id_pacchetto'] : 0);
        if ($id <= 0) { throw new \RuntimeException('ID pacchetto non valido.', 422); }
        $this->repository->delete($id);
        return ['status' => 'ok'];
    }
}
