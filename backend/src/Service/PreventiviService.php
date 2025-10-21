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
        $cig = $this->repository->getCigList($id);
        $determine = $this->repository->getDetermineList($id);
        // Oggetti selezionati (multi-select) e relative etichette
        $selectedOggettiRows = $this->repository->getOggettiForPreventivo($id);
        $selectedOggettiIds = [];
        $selectedOggettiDetail = [];
        foreach ($selectedOggettiRows as $item) {
            $oid = isset($item['id_oggetto']) ? (int) $item['id_oggetto'] : 0;
            if ($oid <= 0) {
                continue;
            }
            $selectedOggettiIds[] = $oid;
            $selectedOggettiDetail[] = [
                'id_oggetto' => $oid,
                'label' => isset($item['label']) && $item['label'] !== null ? (string) $item['label'] : null,
                'attivo' => isset($item['attivo']) ? (int) $item['attivo'] : 0,
                'ordering' => isset($item['ordering']) ? (int) $item['ordering'] : null,
            ];
        }
        $row['oggetti'] = $selectedOggettiIds;
        $row['oggetti_detail'] = $selectedOggettiDetail;
        $statuses = $this->repository->listStatuses();
        $currentStatus = [
            'code' => $row['stato_code'] ?? null,
            'label' => $row['stato_label'] ?? ($row['stato_code'] ?? null),
        ];
        return [
            'data' => $row,
            'righe' => $righe,
            'cig' => $cig,
            'determine' => $determine,
            'meta' => [
                'editable' => $editable,
                'statuses' => $statuses,
                'current_status' => $currentStatus,
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
     * Elenco preventivi archiviati con ricerca/sort/paginazione lato server.
     *
     * @return array{data: list<array<string,mixed>>, meta: array<string,int>}
     */
    public function listArchived(array $input): array
    {
        $filters = [
            'search' => isset($input['search']) ? (string) $input['search'] : null,
            'sort_by' => isset($input['sort_by']) ? (string) $input['sort_by'] : 'data_preventivo',
            'sort_direction' => (isset($input['sort_direction']) && strtolower((string)$input['sort_direction']) === 'asc') ? 'asc' : 'desc',
            'page' => isset($input['page']) ? max(1, (int) $input['page']) : 1,
            'per_page' => isset($input['per_page']) ? max(1, (int) $input['per_page']) : 20,
        ];

        $result = $this->repository->searchArchived($filters);
        $total = (int) $result['total'];
        $perPage = (int) $filters['per_page'];
        $page = (int) $filters['page'];
        $pages = (int) max(1, (int) ceil($total / max($perPage, 1)));

        return [
            'data' => $result['data'],
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'pages' => $pages,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function changeStatus(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido.', 422);
        }

        $code = isset($input['stato']) ? (string) $input['stato'] : (isset($input['code']) ? (string) $input['code'] : '');
        $code = strtolower(trim($code));
        if ($code === '') {
            throw new \RuntimeException('Codice stato mancante.', 422);
        }

        $existing = $this->repository->getById($id);
        if ($existing === null) {
            throw new \RuntimeException('Preventivo non trovato.', 404);
        }

        $status = $this->repository->findStatusByCode($code);
        if ($status === null) {
            throw new \RuntimeException('Stato preventivo non valido.', 422);
        }

        $this->repository->updateStatus($id, $status['id_stato']);

        $detail = $this->repository->fetchDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Preventivo non trovato dopo l\'aggiornamento.', 500);
        }

        $editable = ($detail['stato_code'] ?? 'bozza') === 'bozza';
        $statuses = $this->repository->listStatuses();

        return [
            'data' => $detail,
            'meta' => [
                'editable' => $editable,
                'statuses' => $statuses,
                'current_status' => [
                    'code' => $detail['stato_code'] ?? null,
                    'label' => $detail['stato_label'] ?? ($detail['stato_code'] ?? null),
                ],
            ],
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

        // Vincolo: l'anagrafica deve essere attiva per creare/aggiornare/confirmare un preventivo
        if ($idAnagrafica > 0 && !$this->repository->existsAnagrafica($idAnagrafica)) {
            throw new \RuntimeException('Anagrafica disattivata o inesistente. Operazione non consentita.', 422);
        }

        $dataPrev = isset($input['data_preventivo']) ? (string) $input['data_preventivo'] : null;
        $note = isset($input['note']) ? (string) $input['note'] : null;
        $oggetto = isset($input['oggetto']) ? (string) $input['oggetto'] : null; // kept for compatibility; will be overridden by computed text
        // Multi-select oggetti + testo custom
        $oggettiIds = [];
        if (isset($input['oggetti']) && is_array($input['oggetti'])) {
            foreach ($input['oggetti'] as $oid) {
                $oid = (int) $oid;
                if ($oid > 0) { $oggettiIds[] = $oid; }
            }
        }
        // Niente testo custom: rimosso
        $rifCliente = isset($input['riferimento_cliente']) ? (string) $input['riferimento_cliente'] : null;

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

        // Normalizza CIG e Determine (opzionali)
        $cigItems = [];
        if (isset($input['cig']) && is_array($input['cig'])) {
            foreach ($input['cig'] as $c) {
                if (!is_array($c)) continue;
                $cigItems[] = [
                    'cig' => (string) ($c['cig'] ?? $c['code'] ?? ''),
                    'data_cig' => isset($c['data_cig']) ? (string) $c['data_cig'] : (isset($c['data']) ? (string) $c['data'] : null),
                    'motivazione' => isset($c['motivazione']) ? (string) $c['motivazione'] : (isset($c['note']) ? (string) $c['note'] : null),
                ];
            }
        }
        $detItems = [];
        if (isset($input['determine']) && is_array($input['determine'])) {
            foreach ($input['determine'] as $d) {
                if (!is_array($d)) continue;
                $detItems[] = [
                    'determina' => (string) ($d['determina'] ?? $d['numero'] ?? ''),
                    'data_determina' => isset($d['data_determina']) ? (string) $d['data_determina'] : (isset($d['data']) ? (string) $d['data'] : null),
                    'motivazione' => isset($d['motivazione']) ? (string) $d['motivazione'] : (isset($d['note']) ? (string) $d['note'] : null),
                ];
            }
        } elseif (isset($input['determina']) && is_array($input['determina'])) { // compat: 'determina'
            foreach ($input['determina'] as $d) {
                if (!is_array($d)) continue;
                $detItems[] = [
                    'determina' => (string) ($d['determina'] ?? $d['numero'] ?? ''),
                    'data_determina' => isset($d['data_determina']) ? (string) $d['data_determina'] : (isset($d['data']) ? (string) $d['data'] : null),
                    'motivazione' => isset($d['motivazione']) ? (string) $d['motivazione'] : (isset($d['note']) ? (string) $d['note'] : null),
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

            // Se non passato un id_anagrafica valido, verifica comunque che l'anagrafica legata sia attiva
            if ($idAnagrafica <= 0) {
                $curr = $this->repository->fetchDetail($idPrev);
                if ($curr && isset($curr['id_anagrafica']) && !$this->repository->existsAnagrafica((int)$curr['id_anagrafica'])) {
                    throw new \RuntimeException('Anagrafica disattivata o inesistente. Operazione non consentita.', 422);
                }
            }

            $updated = $this->repository->updateDraft($idPrev, [
                'id_anagrafica' => $idAnagrafica ?: null,
                'data_preventivo' => $dataPrev,
                'note' => $note,
                'oggetto' => $oggetto, // will be recomputed from selections below
                'riferimento_cliente' => $rifCliente,
                'totale_imponibile' => $totImpon,
                'totale_sconto' => $totSconto,
                'totale_iva' => $totIva,
                'totale' => $totale,
            ]);

            // Aggiorna selezioni oggetto + testo (solo da label selezionate)
            $this->repository->replaceOggettiAndUpdateText($idPrev, $oggettiIds);

            if (!empty($lines)) {
                // aggiorna righe bozza
                $this->repository->replaceLines($idPrev, $lines);
            }
            // sostituisce CIG e Determine (consente anche svuotamento)
            $this->repository->replaceCig($idPrev, $cigItems);
            $this->repository->replaceDetermine($idPrev, $detItems);

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
            'oggetto' => $oggetto, // will be recomputed from selections
            'riferimento_cliente' => $rifCliente,
            'totale_imponibile' => $totImpon,
            'totale_sconto' => $totSconto,
            'totale_iva' => $totIva,
            'totale' => $totale,
        ]);

        // Imposta selezioni multi-oggetto e aggiorna testo
        $this->repository->replaceOggettiAndUpdateText($draft['id_preventivo'], $oggettiIds);

        if (!empty($lines)) {
            $this->repository->replaceLines($draft['id_preventivo'], $lines);
        }
        // Inserisce CIG/Determine per la bozza
        $this->repository->replaceCig($draft['id_preventivo'], $cigItems);
        $this->repository->replaceDetermine($draft['id_preventivo'], $detItems);

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

    /**
     * Ripristina un preventivo dall'archivio creando una nuova bozza con nuova numerazione.
     * Richiede che l'anagrafica cliente sia attiva.
     * Input: id | id_preventivo (riferito all'archivio)
     * Output: { status: 'draft', id_preventivo:int, anno_preventivo:int, numero_documento:int }
     */
    public function reactivate(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido per il ripristino.', 422);
        }

        $arch = $this->repository->getArchivedById($id);
        if ($arch === null) {
            throw new \RuntimeException('Preventivo archiviato non trovato.', 404);
        }

        $idAnag = (int) $arch['id_anagrafica'];
        if ($idAnag <= 0 || !$this->repository->existsAnagrafica($idAnag)) {
            throw new \RuntimeException('Anagrafica non attiva: ripristinare il cliente prima di ripristinare il preventivo.', 422);
        }

        // Inserisce una nuova bozza con nuova numerazione anno/corrente
        $draft = $this->repository->insertDraft([
            'id_anagrafica' => $idAnag,
            'data_preventivo' => $arch['data_preventivo'] ?? null,
            'note' => $arch['note'] ?? null,
            'oggetto' => $arch['oggetto'] ?? null,
            'riferimento_cliente' => $arch['riferimento_cliente'] ?? null,
            'totale_imponibile' => isset($arch['totale_imponibile']) ? (float) $arch['totale_imponibile'] : 0.0,
            'totale_sconto' => isset($arch['totale_sconto']) ? (float) $arch['totale_sconto'] : 0.0,
            'totale_iva' => isset($arch['totale_iva']) ? (float) $arch['totale_iva'] : 0.0,
            'totale' => isset($arch['totale']) ? (float) $arch['totale'] : 0.0,
        ]);

        // Niente testo custom da archivio

        // Prova a ripristinare anche le righe dall'archivio (se presente)
        $archivedLines = $this->repository->getArchivedLines($id);
        if (!empty($archivedLines)) {
            $lines = [];
            foreach ($archivedLines as $l) {
                $lines[] = [
                    'descrizione' => (string) ($l['descrizione'] ?? ''),
                    'quantita' => isset($l['quantita']) ? (float) $l['quantita'] : 1.0,
                    'prezzo' => isset($l['prezzo_unitario']) ? (float) $l['prezzo_unitario'] : 0.0,
                    'sconto' => isset($l['sconto']) ? (float) $l['sconto'] : 0.0,
                    'iva' => isset($l['iva']) ? (float) $l['iva'] : null,
                    'id_prodotto' => isset($l['id_prodotto']) ? (int) $l['id_prodotto'] : null,
                    'id_sdi_natura_iva' => isset($l['id_sdi_natura_iva']) ? (int) $l['id_sdi_natura_iva'] : null,
                ];
            }
            if (!empty($lines)) {
                $this->repository->replaceLines($draft['id_preventivo'], $lines);
            }
        }

        // Rimuove il preventivo dall'archivio (testata + eventuali righe archiviate)
        $this->repository->deleteFromArchive($id);

        return [
            'status' => 'draft',
            'id_preventivo' => $draft['id_preventivo'],
            'anno_preventivo' => $draft['anno_preventivo'] ?? null,
            'numero_documento' => $draft['numero_documento'] ?? null,
        ];
    }

    /**
     * Archivia un preventivo (sposta in archivio e rimuove dai tavoli attivi).
     * Input: id | id_preventivo
     * Output: { ok: true }
     */
    public function archive(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_preventivo']) ? (int) $input['id_preventivo'] : 0);
        if ($id <= 0) {
            throw new \RuntimeException('ID preventivo mancante o non valido per archiviazione.', 422);
        }

        $existing = $this->repository->getById($id);
        if ($existing === null) {
            throw new \RuntimeException('Preventivo non trovato o già archiviato.', 404);
        }

        $this->repository->archiveById($id);
        return ['ok' => true];
    }
}
