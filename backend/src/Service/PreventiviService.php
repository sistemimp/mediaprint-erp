<?php
// backend/src/Service/PreventiviService.php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\PreventiviRepository;

final class PreventiviService
{
    public function __construct(private PreventiviRepository $repository) {}

    /**
     * @return array<string, mixed>
     */
    public function detail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }

        $row = $this->repository->fetchDetail($id);
        if ($row === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $editable = ($row['stato_code'] ?? 'bozza') === 'bozza';
        $righe = $this->repository->getLines($id);
        return [
            'data' => $row,
            'righe' => $righe,
            'meta' => [
                'editable' => $editable,
            ],
        ];
    }

    /**
     * @return array{data: list<array<string, mixed>>}
     */
    public function listLatest(array $input): array
    {
        $limit = isset($input['limit']) ? (int) $input['limit'] : 10;
        // vincola a massimo 10 come da richiesta
        $limit = max(1, min($limit, 10));

        $rows = $this->repository->listLatest($limit);

        return [
            'data' => $rows,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function create(array $input): array
    {
        $idPrev = isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0;
        $idAnagrafica = isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0;
        if ($idPrev <= 0 && $idAnagrafica <= 0) {
            throw new \RuntimeException('Cliente (anagrafica) mancante o non valido.', 422);
        }

        $dataPrev = isset($input['data_preventivo']) ? (string) $input['data_preventivo'] : null;
        $note = isset($input['note']) ? (string) $input['note'] : null;

        $totImpon = isset($input['totale_imponibile']) ? (float) $input['totale_imponibile'] : 0.0;
        $totSconto = isset($input['totale_sconto']) ? (float) $input['totale_sconto'] : 0.0;
        $totIva = isset($input['totale_iva']) ? (float) $input['totale_iva'] : 0.0;
        $totale = isset($input['totale']) ? (float) $input['totale'] : ($totImpon + $totIva);

        $send = isset($input['send']) ? (int) $input['send'] === 1 : false;
        $lines = [];
        if (isset($input['righe']) && is_array($input['righe'])) {
            // normalizza righe
            foreach ($input['righe'] as $r) {
                if (!is_array($r)) continue;
                $lines[] = [
                    'descrizione' => (string) ($r['descrizione'] ?? ''),
                    'quantita' => isset($r['quantita']) ? (float) $r['quantita'] : 1.0,
                    'prezzo' => isset($r['prezzo']) ? (float) $r['prezzo'] : (isset($r['prezzo_unitario']) ? (float) $r['prezzo_unitario'] : 0.0),
                    'sconto' => isset($r['sconto']) ? (float) $r['sconto'] : 0.0,
                    'iva' => isset($r['iva']) ? (float) $r['iva'] : 22.0,
                    'id_prodotto' => isset($r['id_prodotto']) ? (int) $r['id_prodotto'] : null,
                    'id_sdi_natura_iva' => isset($r['id_sdi_natura_iva']) ? (int) $r['id_sdi_natura_iva'] : null,
                ];
            }
        }

        if ($idPrev > 0) {
            $existing = $this->repository->getById($idPrev);
            if ($existing === null) {
                throw new \RuntimeException('Preventivo non trovato.', 404);
            }
            if ($existing['stato_code'] !== null && $existing['stato_code'] !== 'bozza' && !$send) {
                throw new \RuntimeException('Il preventivo non è in stato bozza, impossibile aggiornare.', 422);
            }

            $updated = $this->repository->updateDraft($idPrev, [
                'id_anagrafica' => $idAnagrafica ?: null,
                'data_preventivo' => $dataPrev,
                'note' => $note,
                'totale_imponibile' => $totImpon,
                'totale_sconto' => $totSconto,
                'totale_iva' => $totIva,
                'totale' => $totale,
            ]);

            if (!empty($lines)) {
                // aggiorna righe bozza
                $this->repository->replaceLines($idPrev, $lines);
            }

            if ($send) {
                $numbered = $this->repository->confirmAndNumber($idPrev);
                return [
                    'status' => 'sent',
                    'id_preventivo' => $numbered['id_preventivo'],
                    'anno_preventivo' => $numbered['anno_preventivo'],
                    'numero_documento' => $numbered['numero_documento'],
                ];
            }

            return [
                'status' => 'draft',
                'id_preventivo' => $updated['id_preventivo'],
                'anno_preventivo' => $updated['anno_preventivo'] ?? null,
                'numero_documento' => $updated['numero_documento'] ?? null,
            ];
        }

        // Nuova bozza con progressivo
        $draft = $this->repository->insertDraft([
            'id_anagrafica' => $idAnagrafica,
            'data_preventivo' => $dataPrev,
            'note' => $note,
            'totale_imponibile' => $totImpon,
            'totale_sconto' => $totSconto,
            'totale_iva' => $totIva,
            'totale' => $totale,
        ]);

        if (!empty($lines)) {
            $this->repository->replaceLines($draft['id_preventivo'], $lines);
        }

        if ($send) {
            $numbered = $this->repository->confirmAndNumber($draft['id_preventivo']);
            return [
                'status' => 'sent',
                'id_preventivo' => $numbered['id_preventivo'],
                'anno_preventivo' => $numbered['anno_preventivo'],
                'numero_documento' => $numbered['numero_documento'],
            ];
        }

        return [
            'status' => 'draft',
            'id_preventivo' => $draft['id_preventivo'],
            'anno_preventivo' => $draft['anno_preventivo'] ?? null,
            'numero_documento' => $draft['numero_documento'] ?? null,
        ];
    }
}
