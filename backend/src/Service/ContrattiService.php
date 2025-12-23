<?php
// backend/src/Service/ContrattiService.php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\ContrattiRepository;

final class ContrattiService
{
    public function __construct(private ContrattiRepository $repository) {}

    /**
     * @return array{items:list<array<string,mixed>>}
     */
    public function list(array $input): array
    {
        $filters = [
            'q' => isset($input['q']) ? (string) $input['q'] : null,
            'id_anagrafica' => isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : null,
            'only_active' => isset($input['only_active']) ? (int) $input['only_active'] === 1 : null,
        ];
        $items = $this->repository->list($filters);
        return ['items' => $items];
    }

    /**
     * @return array<string,mixed>
     */
    public function detail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_contratto']) ? (int) $input['id_contratto'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido.', 422);
        }

        $header = $this->repository->getById($id);
        if ($header === null) {
            throw new \RuntimeException('Contratto non trovato.', 404);
        }
        $lines = $this->repository->getLines($id);
        foreach ($lines as &$line) {
            $line['sconti'] = $this->repository->getLineDiscounts((int) $line['id_riga']);
        }
        unset($line);

        return [
            'contratto' => $header,
            'righe' => $lines,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function active(array $input): array
    {
        $idAnag = isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0;
        if ($idAnag <= 0) {
            throw new \RuntimeException('Anagrafica mancante o non valida.', 422);
        }
        $ref = isset($input['date']) ? (string) $input['date'] : null;
        $header = $this->repository->findActiveContract($idAnag, $ref);
        if ($header === null) {
            return ['contratto' => null, 'righe' => []];
        }
        $lines = $this->repository->getLines((int) $header['id_contratto']);
        foreach ($lines as &$line) {
            $line['sconti'] = $this->repository->getLineDiscounts((int) $line['id_riga']);
        }
        unset($line);

        return [
            'contratto' => $header,
            'righe' => $lines,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function save(array $input): array
    {
        $id = isset($input['id_contratto']) ? (int) $input['id_contratto'] : (isset($input['id']) ? (int) $input['id'] : 0);
        $idAnag = isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0;
        if ($idAnag <= 0) {
            throw new \RuntimeException('Anagrafica mancante o non valida.', 422);
        }
        $titolo = isset($input['titolo']) ? trim((string) $input['titolo']) : '';
        if ($titolo === '') {
            throw new \RuntimeException('Titolo contratto mancante.', 422);
        }
        $dataInizio = isset($input['data_inizio']) ? (string) $input['data_inizio'] : '';
        if (trim($dataInizio) === '') {
            throw new \RuntimeException('Data inizio mancante.', 422);
        }
        $dataFine = isset($input['data_fine']) ? (string) $input['data_fine'] : null;
        if ($dataFine !== null && trim($dataFine) === '') {
            $dataFine = null;
        }
        if ($dataFine !== null && strtotime($dataFine) !== false && strtotime($dataInizio) !== false) {
            if (strtotime($dataFine) < strtotime($dataInizio)) {
                throw new \RuntimeException('La data fine non pu\u00f2 essere precedente alla data inizio.', 422);
            }
        }
        $codice = isset($input['codice']) ? trim((string) $input['codice']) : null;
        if ($codice === '') { $codice = null; }
        $testo = isset($input['testo_legale']) ? (string) $input['testo_legale'] : null;
        if ($testo !== null && trim($testo) === '') { $testo = null; }
        $rinnovo = isset($input['rinnovo_automatico']) ? (int) $input['rinnovo_automatico'] : 0;
        $attivo = isset($input['attivo']) ? (int) $input['attivo'] : 1;

        $lines = isset($input['righe']) && is_array($input['righe']) ? $input['righe'] : [];
        $normalizedLines = [];
        foreach ($lines as $line) {
            if (!is_array($line)) { continue; }
            $tipo = ($line['tipo_item'] ?? $line['tipo'] ?? 'prodotto') === 'pacchetto' ? 'pacchetto' : 'prodotto';
            $idProd = isset($line['id_prodotto']) ? (int) $line['id_prodotto'] : null;
            $idPkg = isset($line['id_pacchetto']) ? (int) $line['id_pacchetto'] : null;
            if ($tipo === 'prodotto' && ($idProd === null || $idProd <= 0)) {
                throw new \RuntimeException('Riga contratto prodotto senza prodotto valido.', 422);
            }
            if ($tipo === 'pacchetto' && ($idPkg === null || $idPkg <= 0)) {
                throw new \RuntimeException('Riga contratto pacchetto senza pacchetto valido.', 422);
            }
            $prezzo = $line['prezzo_unitario'] ?? $line['prezzo'] ?? null;
            if ($prezzo === null || $prezzo === '' || !is_numeric($prezzo)) {
                throw new \RuntimeException('Prezzo unitario non valido nelle righe contratto.', 422);
            }
            $iva = array_key_exists('iva', $line) ? $line['iva'] : null;
            $ivaVal = $iva !== null && $iva !== '' ? (float) $iva : null;
            $scontoBase = isset($line['sconto_base']) ? (float) $line['sconto_base'] : (isset($line['sconto']) ? (float) $line['sconto'] : 0.0);
            if ($scontoBase < 0 || $scontoBase > 100) {
                throw new \RuntimeException('Sconto base non valido nelle righe contratto.', 422);
            }
            $idNatura = isset($line['id_sdi_natura_iva']) ? (int) $line['id_sdi_natura_iva'] : null;
            if ($idNatura !== null && $idNatura <= 0) { $idNatura = null; }
            $descr = isset($line['descrizione']) ? trim((string) $line['descrizione']) : '';

            $sconti = isset($line['sconti']) && is_array($line['sconti']) ? $line['sconti'] : [];
            $tiers = [];
            foreach ($sconti as $sc) {
                if (!is_array($sc)) { continue; }
                $min = isset($sc['quantita_min']) ? (float) $sc['quantita_min'] : 0.0;
                $max = isset($sc['quantita_max']) && $sc['quantita_max'] !== '' ? (float) $sc['quantita_max'] : null;
                $perc = isset($sc['sconto']) ? (float) $sc['sconto'] : (isset($sc['sconto_percent']) ? (float) $sc['sconto_percent'] : 0.0);
                if ($min < 0 || $perc < 0 || $perc > 100) {
                    continue;
                }
                if ($max !== null && $max < $min) {
                    continue;
                }
                $tiers[] = [
                    'quantita_min' => $min,
                    'quantita_max' => $max,
                    'sconto' => $perc,
                ];
            }

            $normalizedLines[] = [
                'tipo_item' => $tipo,
                'id_prodotto' => $idProd,
                'id_pacchetto' => $idPkg,
                'descrizione' => $descr !== '' ? $descr : null,
                'prezzo_unitario' => (float) $prezzo,
                'iva' => $ivaVal,
                'id_sdi_natura_iva' => $idNatura,
                'sconto_base' => $scontoBase,
                'sconti' => $tiers,
            ];
        }

        if ($id > 0) {
            $existing = $this->repository->getById($id);
            if ($existing === null) {
                throw new \RuntimeException('Contratto non trovato.', 404);
            }
            $this->repository->update($id, [
                'id_anagrafica' => $idAnag,
                'codice' => $codice,
                'titolo' => $titolo,
                'testo_legale' => $testo,
                'data_inizio' => $dataInizio,
                'data_fine' => $dataFine,
                'rinnovo_automatico' => $rinnovo,
                'attivo' => $attivo,
            ]);
            if (array_key_exists('righe', $input)) {
                $this->repository->replaceLines($id, $normalizedLines);
            }
            return ['id_contratto' => $id];
        }

        $newId = $this->repository->create([
            'id_anagrafica' => $idAnag,
            'codice' => $codice,
            'titolo' => $titolo,
            'testo_legale' => $testo,
            'data_inizio' => $dataInizio,
            'data_fine' => $dataFine,
            'rinnovo_automatico' => $rinnovo,
            'attivo' => $attivo,
        ]);
        if (!empty($normalizedLines)) {
            $this->repository->replaceLines($newId, $normalizedLines);
        }
        return ['id_contratto' => $newId];
    }

    public function delete(array $input): array
    {
        $id = isset($input['id_contratto']) ? (int) $input['id_contratto'] : (isset($input['id']) ? (int) $input['id'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID contratto mancante o non valido.', 422);
        }
        $this->repository->delete($id);
        return ['ok' => true];
    }
}

