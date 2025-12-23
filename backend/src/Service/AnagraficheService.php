<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\AnagraficheRepository;
use MediaPrint\Repo\ContrattiRepository;
use RuntimeException;

final class AnagraficheService
{
    public function __construct(private AnagraficheRepository $repository) {}

    /**
     * @return array{data: list<array<string,mixed>>, meta: array<string,int>}
     */
    public function list(array $input): array
    {
        $filters = [
            'search' => isset($input['search']) ? (string) $input['search'] : null,
            'sort_by' => isset($input['sort_by']) ? (string) $input['sort_by'] : 'ragione_sociale',
            'sort_direction' => (isset($input['sort_direction']) && strtolower((string)$input['sort_direction']) === 'desc') ? 'desc' : 'asc',
            'page' => isset($input['page']) ? max(1, (int) $input['page']) : 1,
            'per_page' => isset($input['per_page']) ? max(1, (int) $input['per_page']) : 20,
        ];
        if (isset($input['allowed_anagrafiche']) && is_array($input['allowed_anagrafiche'])) {
            $filters['allowed_ids'] = $input['allowed_anagrafiche'];
        }

        $result = $this->repository->search($filters);
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
     * @return array<string,mixed>
     */
    public function detail(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0);
        if ($id <= 0) {
            throw new RuntimeException('ID anagrafica mancante o non valido.', 422);
        }
        if (isset($input['allowed_anagrafiche']) && is_array($input['allowed_anagrafiche'])) {
            $allowed = array_map('intval', $input['allowed_anagrafiche']);
            if (!in_array($id, $allowed, true)) {
                throw new RuntimeException('Anagrafica non trovata.', 404);
            }
        }

        $detail = $this->repository->findDetail($id);
        if ($detail === null) {
            throw new RuntimeException('Anagrafica non trovata.', 404);
        }

        $contrattiRepo = new ContrattiRepository($this->repository->getPdo());
        $detail['contratti'] = $contrattiRepo->list(['id_anagrafica' => $id]);

        $kpiPeriod = isset($input['kpi_period']) ? (string) $input['kpi_period'] : (isset($input['period']) ? (string) $input['period'] : null);
        $detail['kpi'] = $this->repository->getKpi($id, $kpiPeriod);

        return $detail;
    }

    /**
     * Aggiorna anagrafica (base, fiscale, sedi, contatti) in transazione.
     *
     * Input:
     * - id | id_anagrafica: int (obbligatorio)
     * - anagrafica: array (campi base opzionali)
     * - fiscale: array (campi fiscali opzionali)
     * - sedi: list operazioni [{ action: create|update|delete, id_sede?, ...campi }]
     * - contatti: list operazioni [{ action: create|update|delete, id_contatto?, ...campi }]
     *
     * @return array{ok: bool}
     */
    public function update(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0);
        if ($id <= 0) {
            throw new RuntimeException('ID anagrafica mancante o non valido.', 422);
        }

        // Se l'anagrafica risulta in stato "disattiva", blocca ogni modifica eccetto riattivazione
        $current = $this->repository->getBaseStatus($id);
        if ($current === null) {
            throw new RuntimeException('Anagrafica non trovata.', 404);
        }
        $currentStato = strtolower(trim((string)($current['stato'] ?? '')));
        if ($currentStato === 'disattiva') {
            $hasFiscale = isset($input['fiscale']) && is_array($input['fiscale']);
            $hasSedi = isset($input['sedi']) && is_array($input['sedi']);
            $hasContatti = isset($input['contatti']) && is_array($input['contatti']);
            $hasAnagrafica = isset($input['anagrafica']) && is_array($input['anagrafica']);

            $allow = false;
            if ($hasAnagrafica) {
                $keys = array_keys($input['anagrafica']);
                $allowedKeys = ['stato', 'is_active'];
                $onlyAllowedKeys = count(array_diff($keys, $allowedKeys)) === 0;
                $requestedStato = isset($input['anagrafica']['stato']) ? strtolower(trim((string)$input['anagrafica']['stato'])) : '';
                $requestedIsActive = array_key_exists('is_active', $input['anagrafica']) ? (int)$input['anagrafica']['is_active'] : null;
                if ($onlyAllowedKeys && $requestedStato === 'attiva' && ($requestedIsActive === null || $requestedIsActive === 1)) {
                    $allow = true;
                }
            }

            if (!$allow || $hasFiscale || $hasSedi || $hasContatti) {
                throw new RuntimeException("Anagrafica disattivata: modifiche non consentite. E' possibile solo la riattivazione.", 403);
            }
        }

        return $this->repository->transactional(function () use ($id, $input): array {
            if (isset($input['anagrafica']) && is_array($input['anagrafica'])) {
                // Se is_active=0 richiesto, esegue archiviazione completa + delete
                if (array_key_exists('is_active', $input['anagrafica']) && (int) $input['anagrafica']['is_active'] === 0) {
                    $this->repository->archiveAndDeleteCascade($id);
                    // Non proseguire con altre mutazioni (documenti/sedi/contatti) perché già archiviate/eliminate
                    return ['ok' => true];
                }

                // Altrimenti normale update
                $this->repository->updateAnagrafica($id, $input['anagrafica']);
            }

            if (isset($input['fiscale']) && is_array($input['fiscale'])) {
                $this->repository->upsertFiscale($id, $input['fiscale']);
            }

            if (isset($input['sedi']) && is_array($input['sedi'])) {
                foreach ($input['sedi'] as $op) {
                    if (!is_array($op) || !isset($op['action'])) { continue; }
                    $action = strtolower((string) $op['action']);
                    if ($action === 'create') {
                        $this->repository->insertSede($id, $op);
                    } elseif ($action === 'update') {
                        $sedeId = isset($op['id_sede']) ? (int) $op['id_sede'] : 0;
                        if ($sedeId <= 0) { throw new RuntimeException('id_sede mancante per update sede.', 422); }
                        $this->repository->updateSede($id, $sedeId, $op);
                    } elseif ($action === 'delete') {
                        $sedeId = isset($op['id_sede']) ? (int) $op['id_sede'] : 0;
                        if ($sedeId <= 0) { throw new RuntimeException('id_sede mancante per delete sede.', 422); }
                        $this->repository->deleteSede($id, $sedeId);
                    }
                }
            }

            if (isset($input['contatti']) && is_array($input['contatti'])) {
                foreach ($input['contatti'] as $op) {
                    if (!is_array($op) || !isset($op['action'])) { continue; }
                    $action = strtolower((string) $op['action']);
                    if ($action === 'create') {
                        $this->repository->insertContatto($id, $op);
                    } elseif ($action === 'update') {
                        $contattoId = isset($op['id_contatto']) ? (int) $op['id_contatto'] : 0;
                        if ($contattoId <= 0) { throw new RuntimeException('id_contatto mancante per update contatto.', 422); }
                        $this->repository->updateContatto($id, $contattoId, $op);
                    } elseif ($action === 'delete') {
                        $contattoId = isset($op['id_contatto']) ? (int) $op['id_contatto'] : 0;
                        if ($contattoId <= 0) { throw new RuntimeException('id_contatto mancante per delete contatto.', 422); }
                        $this->repository->deleteContatto($id, $contattoId);
                    } elseif ($action === 'restore') {
                        $archivedContattoId = isset($op['id_contatto']) ? (int) $op['id_contatto'] : 0;
                        if ($archivedContattoId <= 0) { throw new RuntimeException('id_contatto mancante per restore contatto.', 422); }
                        $this->repository->restoreArchivedContatto($id, $archivedContattoId, $op);
                    } elseif ($action === 'archive') {
                        $contattoId = isset($op['id_contatto']) ? (int) $op['id_contatto'] : 0;
                        if ($contattoId <= 0) { throw new RuntimeException('id_contatto mancante per archiviazione contatto.', 422); }
                        $this->repository->archiveContatto($id, $contattoId);
                    } elseif ($action === 'hard_delete') {
                        $archivedContattoId = isset($op['id_contatto']) ? (int) $op['id_contatto'] : 0;
                        if ($archivedContattoId <= 0) { throw new RuntimeException('id_contatto mancante per eliminazione definitiva contatto.', 422); }
                        $this->repository->hardDeleteArchivedContatto($archivedContattoId);
                    }
                }
            }

            return ['ok' => true];
        });
    }

    /**
     * @return array{data: list<array<string,mixed>>, meta: array<string,int>}
     */
    public function listArchived(array $input): array
    {
        $filters = [
            'search' => isset($input['search']) ? (string) $input['search'] : null,
            'sort_by' => isset($input['sort_by']) ? (string) $input['sort_by'] : 'archived_at',
            'sort_direction' => (isset($input['sort_direction']) && strtolower((string)$input['sort_direction']) === 'asc') ? 'asc' : 'desc',
            'page' => isset($input['page']) ? max(1, (int) $input['page']) : 1,
            'per_page' => isset($input['per_page']) ? max(1, (int) $input['per_page']) : 20,
        ];
        if (isset($input['allowed_anagrafiche']) && is_array($input['allowed_anagrafiche'])) {
            $filters['allowed_ids'] = $input['allowed_anagrafiche'];
        }

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
     * Crea una nuova anagrafica di base e restituisce l'ID creato.
     *
     * Input accettati (tutti opzionali salvo ragione_sociale):
     * - ragione_sociale: string (obbligatorio)
     * - piva, codice_fiscale, email, telefono, indirizzo, cap, citta, provincia, nazione, note: string
     * - id_tipologia, id_sdi_regime_fiscale: int
     * - is_pa, is_active: int (0/1)
     * - stato: string (default 'attiva')
     *
     * @return array{ id_anagrafica: int }
     */
    public function create(array $input): array
    {
        $ragioneSociale = isset($input['ragione_sociale']) ? trim((string) $input['ragione_sociale']) : '';
        if ($ragioneSociale === '') {
            throw new RuntimeException('Ragione sociale obbligatoria.', 422);
        }

        $data = [
            'ragione_sociale' => $ragioneSociale,
            'piva' => isset($input['piva']) ? (string) $input['piva'] : null,
            'codice_fiscale' => isset($input['codice_fiscale']) ? (string) $input['codice_fiscale'] : null,
            'indirizzo' => isset($input['indirizzo']) ? (string) $input['indirizzo'] : null,
            'cap' => isset($input['cap']) ? (string) $input['cap'] : null,
            'citta' => isset($input['citta']) ? (string) $input['citta'] : null,
            'provincia' => isset($input['provincia']) ? (string) $input['provincia'] : null,
            'nazione' => isset($input['nazione']) ? (string) $input['nazione'] : null,
            'email' => isset($input['email']) ? (string) $input['email'] : null,
            'telefono' => isset($input['telefono']) ? (string) $input['telefono'] : null,
            'note' => isset($input['note']) ? (string) $input['note'] : null,
            'id_tipologia' => isset($input['id_tipologia']) ? (int) $input['id_tipologia'] : 1,
            'id_sdi_regime_fiscale' => isset($input['id_sdi_regime_fiscale']) ? (int) $input['id_sdi_regime_fiscale'] : null,
            'is_pa' => isset($input['is_pa']) ? (int) $input['is_pa'] : 0,
            'is_active' => isset($input['is_active']) ? (int) $input['is_active'] : 1,
            'stato' => isset($input['stato']) && trim((string)$input['stato']) !== '' ? (string) $input['stato'] : 'attiva',
        ];

        $id = $this->repository->createAnagrafica($data);

        return ['id_anagrafica' => $id];
    }

    /**
     * Riattiva una anagrafica dall'archivio nelle tabelle principali.
     * Input: id | id_anagrafica
     * Output: { ok: true }
     */
    public function reactivate(array $input): array
    {
        $id = isset($input['id']) ? (int) $input['id'] : (isset($input['id_anagrafica']) ? (int) $input['id_anagrafica'] : 0);
        if ($id <= 0) {
            throw new RuntimeException('ID anagrafica mancante o non valido.', 422);
        }

        return $this->repository->transactional(function () use ($id): array {
            $this->repository->reactivateFromArchive($id);
            return ['ok' => true];
        });
    }
}
