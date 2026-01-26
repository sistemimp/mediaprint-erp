<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use MediaPrint\Repo\LavorazioniRepository;
use MediaPrint\Repo\PreventiviRepository;

final class LavorazioniService
{
    public function __construct(private LavorazioniRepository $repository) {}

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function dashboard(array $query): array
    {
        $filters = $this->buildFilters($query);
        $stats = $this->repository->fetchDashboard($filters);
        $stats['filters'] = [
            'stato' => $query['stato'] ?? '',
            'reparto' => $query['reparto'] ?? '',
            'periodo' => $filters['periodo_code'] ?? ($query['periodo'] ?? ''),
        ];
        return $stats;
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function list(array $query): array
    {
        $page = $this->sanitizeInt($query['page'] ?? 1, 1, PHP_INT_MAX);
        $pageSizeValue = $query['page_size'] ?? ($query['pageSize'] ?? 20);
        $pageSize = $this->sanitizeInt($pageSizeValue, 1, 100);

        $filters = $this->buildFilters($query, true);
        $result = $this->repository->paginateLavorazioni($filters, $page, $pageSize);

        $total = (int) ($result['total'] ?? 0);
        $totalPages = max(1, (int) ceil($total / $pageSize));

        $summary = $this->repository->fetchDashboard($filters);

        return [
            'items' => $result['items'] ?? [],
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total_items' => $total,
                'total_pages' => $totalPages,
            ],
            'filters' => [
                'search' => trim((string) ($query['search'] ?? '')),
                'stato' => $query['stato'] ?? '',
                'reparto' => $query['reparto'] ?? '',
                'periodo' => $filters['periodo_code'] ?? ($query['periodo'] ?? ''),
            ],
            'summary' => $summary['totali'] ?? $summary,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function assignmentOptions(array $query = []): array
    {
        $reparti = array_map(
            static function (array $row): array {
                return [
                    'id' => isset($row['id_reparto']) ? (int) $row['id_reparto'] : null,
                    'code' => $row['code'] ?? null,
                    'label' => $row['label'] ?? null,
                ];
            },
            $this->repository->listActiveReparti(),
        );

        $operatori = array_map(
            static function (array $row): array {
                $id = isset($row['id_account']) ? (int) $row['id_account'] : null;
                if ($id === null || $id <= 0) {
                    return null;
                }
                return [
                    'id_account' => $id,
                    'username' => $row['username'] ?? null,
                    'email' => $row['email'] ?? null,
                ];
            },
            $this->repository->listActiveOperators(),
        );

        $operatori = array_values(array_filter($operatori));

        return [
            'reparti' => $reparti,
            'operatori' => $operatori,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function changeStatus(array $input): array
    {
        $id = $this->sanitizeInt(
            $input['id'] ?? ($input['id_lavorazione'] ?? ($input['lavorazione_id'] ?? 0)),
            1,
            PHP_INT_MAX,
        );
        if ($id <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }

        $rawState = (string) ($input['stato'] ?? ($input['status'] ?? ($input['code'] ?? '')));
        $stato = $this->filterEnum($rawState, ['aperta', 'pianificata', 'in_produzione', 'completata', 'annullata', 'sospesa']);
        if ($stato === null) {
            throw new \RuntimeException('Stato lavorazione non valido.', 422);
        }

        $detail = $this->repository->findDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        $currentState = isset($detail['stato']) ? strtolower((string) $detail['stato']) : null;
        if ($currentState === $stato) {
            return [
                'ok' => true,
                'id_lavorazione' => $id,
                'stato' => $stato,
                'lavorazione' => $detail,
            ];
        }

        $this->repository->updateStato($id, $stato);
        $updated = $this->repository->findDetail($id);

        return [
            'ok' => true,
            'id_lavorazione' => $id,
            'stato' => $stato,
            'lavorazione' => $updated ?? $detail,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function detail(array $query): array
    {
        $id = $this->sanitizeInt($query['id'] ?? ($query['id_lavorazione'] ?? 0), 1, PHP_INT_MAX);
        if ($id <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }

        $detail = $this->repository->findDetail($id);
        if ($detail === null) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }
        if (isset($query['allowed_anagrafiche']) && is_array($query['allowed_anagrafiche'])) {
            $allowed = array_map('intval', $query['allowed_anagrafiche']);
            if (!in_array((int) ($detail['id_anagrafica'] ?? 0), $allowed, true)) {
                throw new \RuntimeException('Lavorazione non trovata.', 404);
            }
        }

        $stampaRows = [];
        $postaliRows = [];
        $preventivoId = isset($detail['id_preventivo']) ? (int) $detail['id_preventivo'] : 0;
        $storedPostaliRows = method_exists($this->repository, 'listPostaliRowsForLavorazione')
            ? $this->repository->listPostaliRowsForLavorazione($id)
            : [];
        if (!empty($storedPostaliRows)) {
            $postaliRows = $storedPostaliRows;
        }
        if ($preventivoId > 0) {
            $preventiviRepository = new PreventiviRepository($this->repository->getConnection());
            $lines = $preventiviRepository->getLines($preventivoId);
            $stampaRows = array_values(array_filter($lines, function (array $line): bool {
                $category = $line['categoria'] ?? null;
                return $this->isStampaCategory(is_string($category) ? $category : null);
            }));
            if (empty($postaliRows)) {
                $postaliRows = array_values(array_filter($lines, function (array $line): bool {
                    return $this->isTariffePostaliLine($line);
                }));
            }
        }

        $postaActivityId = 0;
        if (isset($detail['attivita']) && is_array($detail['attivita'])) {
            foreach ($detail['attivita'] as $task) {
                $label = isset($task['titolo']) ? (string) $task['titolo'] : '';
                if ($this->isPostaActivityLabel($label)) {
                    $postaActivityId = isset($task['id_attivita']) ? (int) $task['id_attivita'] : 0;
                    if ($postaActivityId > 0) {
                        break;
                    }
                }
            }
        }
        if ($postaActivityId > 0 && !empty($postaliRows)) {
            $cedMap = $this->repository->listActivityCedQuantities($postaActivityId);
            if (!empty($cedMap)) {
                $postaliRows = array_map(function (array $row) use ($cedMap): array {
                    $idRiga = isset($row['id_riga']) ? (int) $row['id_riga'] : 0;
                    $row['quantita_ced'] = $idRiga > 0 && array_key_exists($idRiga, $cedMap)
                        ? $cedMap[$idRiga]
                        : null;
                    return $row;
                }, $postaliRows);
            }
        }
        if (!empty($postaliRows)) {
            foreach ($postaliRows as &$row) {
                $warning = !empty($row['created_by_ced']);
                if (array_key_exists('quantita_ced', $row) && $row['quantita_ced'] !== null) {
                    $diff = abs((float) $row['quantita_ced'] - (float) ($row['quantita'] ?? 0));
                    if ($diff > 0.0001) {
                        $warning = true;
                    }
                }
                $row['ced_warning'] = $warning;
            }
            unset($row);
        }

        if (isset($detail['attivita']) && is_array($detail['attivita'])) {
            $detail['attivita'] = array_map(function (array $task) use ($stampaRows): array {
                $label = isset($task['titolo']) ? (string) $task['titolo'] : '';
                if ($this->isStampaActivityLabel($label)) {
                    $activityId = isset($task['id_attivita']) ? (int) $task['id_attivita'] : 0;
                    $cedMap = $activityId > 0 ? $this->repository->listActivityCedQuantities($activityId) : [];
                    $task['stampa_righe_preventivo'] = array_map(function (array $row) use ($cedMap): array {
                        $idRiga = isset($row['id_riga']) ? (int) $row['id_riga'] : 0;
                        $row['quantita_ced'] = $idRiga > 0 && array_key_exists($idRiga, $cedMap)
                            ? $cedMap[$idRiga]
                            : null;
                        return $row;
                    }, $stampaRows);
                } else {
                    $task['stampa_righe_preventivo'] = [];
                }
                return $task;
            }, $detail['attivita']);
        }

        $detail['tariffe_postali_righe_preventivo'] = $postaliRows;

        return $detail;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function saveActivityCedQuantities(array $input): array
    {
        $activityId = $this->sanitizeInt($input['id_attivita'] ?? ($input['attivita_id'] ?? 0), 1, PHP_INT_MAX);
        if ($activityId <= 0) {
            throw new \RuntimeException('ID attivita mancante o non valido.', 422);
        }

        $activity = $this->repository->findActivity($activityId);
        if ($activity === null) {
            throw new \RuntimeException('Attivita non trovata.', 404);
        }

        $rows = $input['rows'] ?? [];
        if (!is_array($rows)) {
            throw new \RuntimeException('Formato righe non valido.', 422);
        }

        $normalized = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $idRiga = isset($row['id_riga_preventivo']) ? (int) $row['id_riga_preventivo'] : 0;
            if ($idRiga <= 0) {
                continue;
            }
            $raw = $row['quantita_ced'] ?? null;
            $value = null;
            if ($raw !== null && $raw !== '') {
                $candidate = is_string($raw) ? str_replace(',', '.', $raw) : $raw;
                if (!is_numeric($candidate)) {
                    continue;
                }
                $value = (string) $candidate;
            }
            $normalized[] = [
                'id_riga_preventivo' => $idRiga,
                'quantita_ced' => $value,
            ];
        }

        $this->repository->replaceActivityCedQuantities($activityId, $normalized);

        $lavorazioneId = isset($activity['id_lavorazione']) ? (int) $activity['id_lavorazione'] : 0;
        if ($lavorazioneId > 0) {
            $stmt = $this->repository->getConnection()->prepare('SELECT id_preventivo FROM tb_lavorazioni WHERE id_lavorazione = :id LIMIT 1');
            $stmt->bindValue(':id', $lavorazioneId, \PDO::PARAM_INT);
            $stmt->execute();
            $preventivoId = (int) ($stmt->fetchColumn() ?: 0);
            if ($preventivoId > 0) {
                $prevRepo = new PreventiviRepository($this->repository->getConnection());
                $cedStatus = $prevRepo->findStatusByCode('revisionato_ced');
                if ($cedStatus !== null) {
                    $prevRepo->updateStatus($preventivoId, (int) $cedStatus['id_stato']);
                }
            }
        }

        return [
            'ok' => true,
        ];
    }

    private function isStampaCategory(?string $category): bool
    {
        $value = trim((string) ($category ?? ''));
        if ($value === '') {
            return false;
        }
        $lower = function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
        $normalized = preg_replace('/[^a-z0-9]+/', '', $lower);
        if ($normalized === 'stampa') {
            return true;
        }
        return str_starts_with($normalized, 'stampa') && str_contains($normalized, 'imbustamento');
    }

    private function isStampaActivityLabel(string $label): bool
    {
        $value = trim($label);
        if ($value === '') {
            return false;
        }
        $lower = function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
        return str_contains($lower, 'stampa');
    }

    private function isPostaActivityLabel(string $label): bool
    {
        $value = trim($label);
        if ($value === '') {
            return false;
        }
        $lower = function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
        return str_contains($lower, 'posta');
    }

    private function isTariffePostaliCategory(?string $category): bool
    {
        $value = trim((string) ($category ?? ''));
        if ($value === '') {
            return false;
        }
        $lower = function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
        $normalized = preg_replace('/[^a-z0-9]+/', '', $lower);
        if ($normalized === 'tariffepostali') {
            return true;
        }
        return str_starts_with($normalized, 'tariffepostali');
    }

    private function isTariffePostaliLine(array $line): bool
    {
        $idCategoria = isset($line['id_categoria']) ? (int) $line['id_categoria'] : 0;
        if ($idCategoria === 2) {
            return true;
        }
        $category = $line['categoria'] ?? $line['categoria_nome'] ?? null;
        return $this->isTariffePostaliCategory(is_string($category) ? $category : null);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function sanitizeOptionalInt($value): int
    {
        $candidate = isset($value) ? (int) $value : 0;
        return $candidate > 0 ? $candidate : 0;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function updateInfo(array $input): array
    {
        $lavorazioneId = $this->sanitizeInt(
            $input['id'] ?? ($input['id_lavorazione'] ?? ($input['lavorazione_id'] ?? 0)),
            1,
            PHP_INT_MAX,
        );
        if ($lavorazioneId <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }

        $detail = $this->repository->findDetail($lavorazioneId);
        if ($detail === null) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        $updates = [];

        if (array_key_exists('titolo', $input)) {
            $titolo = trim((string) $input['titolo']);
            if ($titolo === '') {
                throw new \RuntimeException('Titolo lavorazione mancante.', 422);
            }
            $updates['titolo'] = $titolo;
        }

        if (array_key_exists('descrizione', $input)) {
            $descrizione = trim((string) ($input['descrizione'] ?? ''));
            $updates['descrizione'] = $descrizione !== '' ? $descrizione : null;
        }

        if (array_key_exists('stato', $input)) {
            $stato = $this->filterEnum($input['stato'], ['aperta', 'pianificata', 'in_produzione', 'completata', 'annullata', 'sospesa']);
            if ($stato === null) {
                throw new \RuntimeException('Stato lavorazione non valido.', 422);
            }
            $updates['stato'] = $stato;
        }

        if (array_key_exists('priorita', $input)) {
            $priorita = $this->filterEnum($input['priorita'], ['low', 'medium', 'high', 'critical']);
            if ($priorita === null) {
                throw new \RuntimeException('Priorita lavorazione non valida.', 422);
            }
            $updates['priorita'] = $priorita;
        }

        if (array_key_exists('id_reparto', $input)) {
            $candidate = $input['id_reparto'];
            if ($candidate === null || $candidate === '') {
                $updates['id_reparto'] = null;
            } else {
                $idReparto = (int) $candidate;
                $updates['id_reparto'] = $idReparto > 0 ? $idReparto : null;
            }
        } elseif (array_key_exists('reparto', $input)) {
            $resolved = $this->resolveRepartoId((string) $input['reparto']);
            if ($resolved === null) {
                throw new \RuntimeException('Reparto non valido.', 422);
            }
            $updates['id_reparto'] = $resolved;
        }

        if (array_key_exists('data_inizio_prevista', $input)) {
            $raw = $input['data_inizio_prevista'];
            if ($raw === null || $raw === '') {
                $updates['data_inizio_prevista'] = null;
            } else {
                $parsed = $this->sanitizeDate($raw);
                if ($parsed === null) {
                    throw new \RuntimeException('Data inizio prevista non valida.', 422);
                }
                $updates['data_inizio_prevista'] = $parsed;
            }
        }

        if (array_key_exists('data_fine_prevista', $input)) {
            $raw = $input['data_fine_prevista'];
            if ($raw === null || $raw === '') {
                $updates['data_fine_prevista'] = null;
            } else {
                $parsed = $this->sanitizeDate($raw);
                if ($parsed === null) {
                    throw new \RuntimeException('Data fine prevista non valida.', 422);
                }
                $updates['data_fine_prevista'] = $parsed;
            }
        }

        $start = array_key_exists('data_inizio_prevista', $updates)
            ? $updates['data_inizio_prevista']
            : ($detail['data_inizio_prevista'] ?? null);
        $end = array_key_exists('data_fine_prevista', $updates)
            ? $updates['data_fine_prevista']
            : ($detail['data_fine_prevista'] ?? null);
        if ($start !== null && $end !== null) {
            $startDt = new \DateTimeImmutable($start);
            $endDt = new \DateTimeImmutable($end);
            if ($startDt > $endDt) {
                throw new \RuntimeException('Il periodo previsto non e valido.', 422);
            }
        }

        if (array_key_exists('data_avvio_reale', $input)) {
            $raw = $input['data_avvio_reale'];
            if ($raw === null || $raw === '') {
                $updates['data_avvio_reale'] = null;
            } else {
                $parsed = $this->sanitizeDateTime($raw);
                if ($parsed === null) {
                    throw new \RuntimeException('Data avvio reale non valida.', 422);
                }
                $updates['data_avvio_reale'] = $parsed;
            }
        }

        if (array_key_exists('note', $input)) {
            $rawNote = (string) $input['note'];
            $note = trim($rawNote);
            $updates['note'] = $note !== '' ? $note : null;
        }

        if ($updates !== []) {
            $this->repository->updateInfo($lavorazioneId, $updates);
        }
        $updated = $this->repository->findDetail($lavorazioneId);

        return [
            'ok' => true,
            'lavorazione' => $updated ?? $detail,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function activityTemplates(array $query): array
    {
        $all = isset($query['all']) ? (int) $query['all'] === 1 : false;
        $items = $this->repository->listActivityTemplates(!$all);
        return ['items' => $items];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function saveActivityTemplate(array $input): array
    {
        $id = $this->sanitizeInt($input['id_template'] ?? ($input['id'] ?? 0), 1, PHP_INT_MAX);
        if ($id <= 0) {
            $id = 0;
        }

        $titolo = trim((string) ($input['titolo'] ?? ''));
        if ($titolo === '') {
            throw new \RuntimeException('Titolo template obbligatorio.', 422);
        }

        $descrizione = null;
        if (array_key_exists('descrizione', $input)) {
            $descrizione = trim((string) ($input['descrizione'] ?? ''));
            if ($descrizione === '') {
                $descrizione = null;
            }
        }

        $priorita = $this->sanitizePriority($input['priorita'] ?? null);

        $idReparto = null;
        if (array_key_exists('id_reparto', $input)) {
            $candidate = $input['id_reparto'];
            if ($candidate !== null && $candidate !== '') {
                $idReparto = (int) $candidate;
                if ($idReparto <= 0) {
                    $idReparto = null;
                }
            }
        }

        $durata = null;
        if (array_key_exists('durata_predefinita_giorni', $input)) {
            $candidate = $input['durata_predefinita_giorni'];
            if ($candidate !== null && $candidate !== '') {
                $durataValue = (int) $candidate;
                $durata = $durataValue > 0 ? $durataValue : null;
            }
        }

        $ordering = 100;
        if (array_key_exists('ordering', $input)) {
            $candidate = (int) $input['ordering'];
            if ($candidate >= 0) {
                $ordering = $candidate;
            }
        }

        $attivo = array_key_exists('attivo', $input) ? ((int) $input['attivo'] === 1 ? 1 : 0) : 1;

        $newId = $this->repository->upsertActivityTemplate($id > 0 ? $id : null, [
            'titolo' => $titolo,
            'descrizione' => $descrizione,
            'priorita' => $priorita,
            'id_reparto' => $idReparto,
            'durata_predefinita_giorni' => $durata,
            'attivo' => $attivo,
            'ordering' => $ordering,
        ]);

        return ['id_template' => $newId];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createActivity(array $input): array
    {
        $lavorazioneId = $this->sanitizeInt($input['id_lavorazione'] ?? ($input['lavorazione_id'] ?? $input['id'] ?? 0), 1, PHP_INT_MAX);
        if ($lavorazioneId <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }
        if (!$this->repository->existsLavorazione($lavorazioneId)) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        $templateId = isset($input['id_template']) ? (int) $input['id_template'] : (isset($input['template_id']) ? (int) $input['template_id'] : 0);
        $template = null;
        if ($templateId > 0) {
            $template = $this->repository->findActivityTemplate($templateId);
            if ($template === null) {
                throw new \RuntimeException('Template attività non trovato.', 404);
            }
            if (isset($template['attivo']) && (int) $template['attivo'] !== 1) {
                throw new \RuntimeException('Template attività disattivato.', 422);
            }
        }

        $titolo = trim((string) ($input['titolo'] ?? ''));
        if ($titolo === '' && $template !== null) {
            $titolo = trim((string) ($template['titolo'] ?? ''));
        }
        if ($titolo === '') {
            throw new \RuntimeException('Specificare il titolo dell\'attività.', 422);
        }

        $descrizione = trim((string) ($input['descrizione'] ?? ''));
        if ($descrizione === '' && $template !== null) {
            $descrizione = trim((string) ($template['descrizione'] ?? ''));
        }

        $priorita = $this->sanitizePriority($input['priorita'] ?? ($template['priorita'] ?? null));

        $idReparto = null;
        if (array_key_exists('id_reparto', $input)) {
            $candidate = (int) $input['id_reparto'];
            $idReparto = $candidate > 0 ? $candidate : null;
        } elseif (!empty($input['reparto'])) {
            $idReparto = $this->resolveRepartoId((string) $input['reparto']);
        } elseif ($template !== null && !empty($template['id_reparto'])) {
            $idReparto = (int) $template['id_reparto'];
        }

        $dataScadenza = $this->sanitizeDate($input['data_scadenza'] ?? null);
        $quantita = null;
        if (isset($input['quantita_prevista']) && $input['quantita_prevista'] !== '') {
            $quantita = (float) $input['quantita_prevista'];
        }

        $operatorIds = $this->normalizeOperatorIds($input['operatori'] ?? ($input['operators'] ?? []));
        if ($operatorIds !== []) {
            $operatorIds = $this->repository->filterOperatorIds($operatorIds);
        }

        $activity = $this->repository->createActivity($lavorazioneId, [
            'titolo' => $titolo,
            'descrizione' => $descrizione !== '' ? $descrizione : null,
            'priorita' => $priorita,
            'id_reparto' => $idReparto,
            'data_scadenza' => $dataScadenza,
            'quantita_prevista' => $quantita,
            'note' => $input['note'] ?? null,
            'stato' => 'todo',
            'operator_ids' => $operatorIds,
        ]);

        return ['activity' => $activity];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function assignLavorazione(array $input): array
    {
        $lavorazioneId = $this->sanitizeInt($input['id_lavorazione'] ?? ($input['lavorazione_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($lavorazioneId <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }

        $detail = $this->repository->findDetail($lavorazioneId);
        if ($detail === null) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        $repartoId = null;
        if (array_key_exists('id_reparto', $input)) {
            $candidate = (int) $input['id_reparto'];
            $repartoId = $candidate > 0 ? $candidate : null;
        } elseif (!empty($input['reparto'])) {
            $repartoId = $this->resolveRepartoId((string) $input['reparto']);
        }

        $operatorIds = $this->normalizeOperatorIds($input['operatori'] ?? ($input['operators'] ?? []));
        if ($operatorIds !== []) {
            $operatorIds = $this->repository->filterOperatorIds($operatorIds);
        }

        $this->repository->updateLavorazioneAssignments($lavorazioneId, $repartoId, $operatorIds);
        $updated = $this->repository->findDetail($lavorazioneId);

        return [
            'ok' => true,
            'lavorazione' => $updated ?? $detail,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function assignActivity(array $input): array
    {
        $activityId = $this->sanitizeInt($input['id_attivita'] ?? ($input['attivita_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($activityId <= 0) {
            throw new \RuntimeException('ID attività mancante o non valido.', 422);
        }

        $activity = $this->repository->findActivity($activityId);
        if ($activity === null) {
            throw new \RuntimeException('Attività non trovata.', 404);
        }

        $repartoId = null;
        if (array_key_exists('id_reparto', $input)) {
            $candidate = (int) $input['id_reparto'];
            $repartoId = $candidate > 0 ? $candidate : null;
        } elseif (!empty($input['reparto'])) {
            $repartoId = $this->resolveRepartoId((string) $input['reparto']);
        }

        $operatorIds = $this->normalizeOperatorIds($input['operatori'] ?? ($input['operators'] ?? []));
        if ($operatorIds !== []) {
            $operatorIds = $this->repository->filterOperatorIds($operatorIds);
        }

        $this->repository->updateActivityAssignments($activityId, $repartoId, $operatorIds);
        $updated = $this->repository->findActivity($activityId);

        return [
            'ok' => true,
            'activity' => $updated ?? $activity,
        ];
    }

    public function deleteActivity(array $input): array
    {
        $activityId = $this->sanitizeInt($input['id_attivita'] ?? ($input['attivita_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($activityId <= 0) {
            throw new \RuntimeException('ID attività mancante o non valido.', 422);
        }

        $activity = $this->repository->findActivity($activityId);
        if ($activity === null) {
            throw new \RuntimeException('Attività non trovata.', 404);
        }

        $meta = $this->repository->deleteActivity($activityId);
        $lavorazioneId = $meta['lavorazione_id'] ?? 0;
        if ($lavorazioneId > 0) {
            $jobDetailBefore = $this->repository->findDetail($lavorazioneId);
            $jobStateBefore = strtolower($jobDetailBefore['stato'] ?? '');
            $newPercent = $this->repository->calculateLavorazionePercentuale($lavorazioneId);
            $this->repository->updateLavorazionePercentuale($lavorazioneId, $newPercent);
            $hasSuspended = $this->repository->hasSuspendedActivities($lavorazioneId);
            if ($hasSuspended && $jobStateBefore !== 'sospesa') {
                $this->repository->updateStato($lavorazioneId, 'sospesa');
            } elseif (!$hasSuspended && $jobStateBefore === 'sospesa') {
                $this->repository->updateStato($lavorazioneId, 'in_produzione');
            }
        }

        return [
            'ok' => true,
            'lavorazione_id' => $lavorazioneId,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function updateActivityStatus(array $input): array
    {
        $activityId = $this->sanitizeInt($input['id_attivita'] ?? ($input['attivita_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($activityId <= 0) {
            throw new \RuntimeException('ID attivit? mancante o non valido.', 422);
        }

        $status = $this->filterEnum($input['stato'] ?? ($input['status'] ?? ''), ['todo', 'in_progress', 'done', 'cancelled', 'sospesa']);
        if ($status === null) {
            throw new \RuntimeException('Stato attivit? non valido.', 422);
        }

        $activity = $this->repository->findActivity($activityId);
        if ($activity === null) {
            throw new \RuntimeException('Attivit? non trovata.', 404);
        }
        $oldStatus = isset($activity['stato']) ? strtolower((string) $activity['stato']) : null;

        $percentInput = array_key_exists('percentuale', $input) ? $this->sanitizePercent($input['percentuale']) : null;
        $percentuale = $percentInput ?? $this->derivePercentByStatus($status, $activity);
        if ($percentuale === null) {
            $percentuale = 0;
        }

        $activityMeta = $this->repository->updateActivityStatus($activityId, $status, $percentuale);
        if ($oldStatus !== null && $oldStatus !== $status) {
            $lavorazioneId = isset($activity['id_lavorazione']) ? (int) $activity['id_lavorazione'] : 0;
            if ($lavorazioneId > 0) {
                $actor = $this->resolveActorFromToken();
                $actorId = $actor['id'] ?? null;
                if ($actorId === null) {
                    $actorId = $this->resolveActorIdFromInput($input);
                }
                $titolo = isset($activity['titolo']) ? (string) $activity['titolo'] : '';
                $label = $titolo !== '' ? sprintf('%s (ID %d)', $titolo, $activityId) : sprintf('ID %d', $activityId);
                $note = sprintf('Stato attivita %s: %s -> %s.', $label, $oldStatus, $status);
                $this->repository->createTimelineEvent(
                    $lavorazioneId,
                    $activityId,
                    'attivita_stato',
                    $note,
                    ['stato' => $oldStatus],
                    ['stato' => $status],
                    $actorId,
                );
            }
        }
        $lavorazioneId = $activityMeta['lavorazione_id'] ?? 0;
        $jobStateBefore = null;
        if ($lavorazioneId > 0) {
            $jobDetailBefore = $this->repository->findDetail($lavorazioneId);
            $jobStateBefore = strtolower($jobDetailBefore['stato'] ?? '');
            $newPercent = $this->repository->calculateLavorazionePercentuale($lavorazioneId);
            $this->repository->updateLavorazionePercentuale($lavorazioneId, $newPercent);

            $hasSuspended = $this->repository->hasSuspendedActivities($lavorazioneId);
            if ($hasSuspended && $jobStateBefore !== 'sospesa') {
                $this->repository->updateStato($lavorazioneId, 'sospesa');
            } elseif (!$hasSuspended) {
                if ($status === 'in_progress' && $jobStateBefore !== 'in_produzione') {
                    $this->repository->updateStato($lavorazioneId, 'in_produzione');
                } elseif ($jobStateBefore === 'sospesa') {
                    $this->repository->updateStato($lavorazioneId, 'in_produzione');
                }
            }
            if ($jobStateBefore !== 'annullata') {
                $openActivities = $this->repository->countOpenActivities($lavorazioneId);
                if ($openActivities === 0 && $newPercent >= 100 && $jobStateBefore !== 'completata') {
                    $this->repository->updateStato($lavorazioneId, 'completata');
                }
            }
        }

        $updated = $this->repository->findActivity($activityId);
        return [
            'ok' => true,
            'activity' => $updated,
        ];
    }

    /**
     * @return array{id:?int,name:?string}
     */
    private function resolveActorFromToken(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!is_string($header) || $header === '' || stripos($header, 'Bearer ') !== 0) {
            return ['id' => null, 'name' => null];
        }
        $token = trim(substr($header, 7));
        if ($token === '') {
            return ['id' => null, 'name' => null];
        }
        $secret = getenv('JWT_SECRET') ?: '04fb222b0c3ba451e9f1b7f72f756f33bc7dc5d9db127275ac40080819c114d63dc2f29de59075a285cd753e9454ed53';
        if (!$secret) {
            return ['id' => null, 'name' => null];
        }
        try {
            $payload = JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable $exception) {
            return ['id' => null, 'name' => null];
        }

        $id = null;
        if (isset($payload->sub) && (is_string($payload->sub) || is_numeric($payload->sub))) {
            $candidate = (int) $payload->sub;
            $id = $candidate > 0 ? $candidate : null;
        }

        $name = null;
        if (isset($payload->username) && is_string($payload->username) && trim($payload->username) !== '') {
            $name = trim($payload->username);
        } elseif (isset($payload->email) && is_string($payload->email) && trim($payload->email) !== '') {
            $name = trim($payload->email);
        } elseif ($id !== null) {
            $name = 'user#' . (string) $id;
        }

        return ['id' => $id, 'name' => $name];
    }

    private function resolveActorIdFromInput(array $input): ?int
    {
        $candidates = [
            $input['created_by'] ?? null,
            $input['id_account'] ?? null,
            $input['id_operatore'] ?? null,
            $input['operatore_id'] ?? null,
            $input['user_id'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if ($candidate === null || $candidate === '') {
                continue;
            }
            if (is_numeric($candidate)) {
                $value = (int) $candidate;
                if ($value > 0) {
                    return $value;
                }
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function updateActivityInfo(array $input): array
    {
        $activityId = $this->sanitizeInt($input['id_attivita'] ?? ($input['attivita_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($activityId <= 0) {
            throw new \RuntimeException('ID attivita mancante o non valido.', 422);
        }

        $activity = $this->repository->findActivity($activityId);
        if ($activity === null) {
            throw new \RuntimeException('Attivita non trovata.', 404);
        }

        $updates = [];

        if (array_key_exists('titolo', $input)) {
            $titolo = trim((string) $input['titolo']);
            if ($titolo === '') {
                throw new \RuntimeException('Titolo attivita mancante.', 422);
            }
            $updates['titolo'] = $titolo;
        }

        if (array_key_exists('descrizione', $input)) {
            $descrizione = trim((string) ($input['descrizione'] ?? ''));
            $updates['descrizione'] = $descrizione !== '' ? $descrizione : null;
        }

        if (array_key_exists('priorita', $input)) {
            $priorita = $this->sanitizePriority($input['priorita']);
            $updates['priorita'] = $priorita;
        }

        if (array_key_exists('id_reparto', $input)) {
            $candidate = $input['id_reparto'];
            if ($candidate === null || $candidate === '') {
                $updates['id_reparto'] = null;
            } else {
                $idReparto = (int) $candidate;
                $updates['id_reparto'] = $idReparto > 0 ? $idReparto : null;
            }
        }

        if (array_key_exists('data_scadenza', $input)) {
            $raw = $input['data_scadenza'];
            if ($raw === null || $raw === '') {
                $updates['data_scadenza'] = null;
            } else {
                $parsed = $this->sanitizeDate($raw);
                if ($parsed === null) {
                    throw new \RuntimeException('Data scadenza non valida.', 422);
                }
                $updates['data_scadenza'] = $parsed;
            }
        }

        if (array_key_exists('note', $input)) {
            $rawNote = (string) $input['note'];
            $note = trim($rawNote);
            $updates['note'] = $note !== '' ? $note : null;
        }

        if (array_key_exists('quantita_prevista', $input)) {
            if ($input['quantita_prevista'] === null || $input['quantita_prevista'] === '') {
                $updates['quantita_prevista'] = null;
            } else {
                $updates['quantita_prevista'] = (float) $input['quantita_prevista'];
            }
        }

        if ($updates !== []) {
            $this->repository->updateActivityInfo($activityId, $updates);
        }

        $updated = $this->repository->findActivity($activityId);

        return [
            'ok' => true,
            'activity' => $updated ?? $activity,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function updateActivityReport(array $input): array
    {
        $activityId = $this->sanitizeInt($input['id_attivita'] ?? ($input['attivita_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($activityId <= 0) {
            throw new \RuntimeException('ID attivita mancante o non valido.', 422);
        }

        $dataAvvio = $this->sanitizeDateTime($input['data_avvio'] ?? ($input['data_inizio'] ?? null));
        $dataFine = $this->sanitizeDateTime($input['data_fine'] ?? ($input['data_end'] ?? null));
        $operatoreId = null;
        if (array_key_exists('id_operatore', $input)) {
            $candidate = (int) $input['id_operatore'];
            $operatoreId = $candidate > 0 ? $candidate : null;
        }
        $noteRaw = array_key_exists('note', $input) ? (string) $input['note'] : null;
        $note = $noteRaw !== null ? trim($noteRaw) : null;
        if ($note === '') {
            $note = null;
        }

        $activity = $this->repository->findActivity($activityId);
        if ($activity === null) {
            throw new \RuntimeException('Attivita non trovata.', 404);
        }

        $this->repository->updateActivityReport($activityId, $dataAvvio, $dataFine, $operatoreId, $note);
        $updated = $this->repository->findActivity($activityId);

        return [
            'ok' => true,
            'activity' => $updated ?? $activity,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function notifyOperators(array $input): array
    {
        $lavorazioneId = $this->sanitizeInt($input['id_lavorazione'] ?? ($input['lavorazione_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($lavorazioneId <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }

        $detail = $this->repository->findDetail($lavorazioneId);
        if ($detail === null) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        $activityId = null;
        if (!empty($input['id_attivita']) || !empty($input['attivita_id'])) {
            $candidate = $this->sanitizeInt($input['id_attivita'] ?? $input['attivita_id'], 1, PHP_INT_MAX);
            if ($candidate > 0) {
                $activity = $this->repository->findActivity($candidate);
                if ($activity === null) {
                    throw new \RuntimeException('Attività non trovata.', 404);
                }
                if ((int) ($activity['id_lavorazione'] ?? 0) !== $lavorazioneId) {
                    throw new \RuntimeException('Attività non appartenente alla lavorazione selezionata.', 422);
                }
                $activityId = $candidate;
            }
        }

        $title = trim((string) ($input['titolo'] ?? ($input['title'] ?? '')));
        if ($title === '') {
            $title = $activityId !== null
                ? sprintf('Aggiornamento attività #%d', $activityId)
                : sprintf('Aggiornamento lavorazione %s', $detail['codice'] ?? (string) $lavorazioneId);
        }

        $message = trim((string) ($input['messaggio'] ?? ($input['message'] ?? '')));
        if ($message === '') {
            throw new \RuntimeException('Specificare il contenuto della notifica.', 422);
        }

        $operatorIds = $this->normalizeOperatorIds($input['operatori'] ?? ($input['operators'] ?? []));
        if ($operatorIds !== []) {
            $operatorIds = $this->repository->filterOperatorIds($operatorIds);
        } elseif ($activityId !== null) {
            $operatorIds = $this->repository->getOperatorIdsForActivity($activityId);
        } else {
            $operatorIds = $this->repository->getOperatorIdsForLavorazione($lavorazioneId);
        }

        if ($operatorIds === []) {
            throw new \RuntimeException('Nessun operatore valido da notificare.', 422);
        }

        $actor = $this->resolveActorFromToken();
        $inserted = $this->repository->createNotifications(
            $lavorazioneId,
            $activityId,
            $operatorIds,
            $title,
            $message,
            $actor['id'] ?? $this->resolveActorIdFromInput($input),
        );

        return [
            'ok' => true,
            'notifiche_inserite' => $inserted,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function notifications(array $query): array
    {
        $accountId = $this->sanitizeInt($query['id_account'] ?? ($query['account_id'] ?? 0), 1, PHP_INT_MAX);
        if ($accountId <= 0) {
            throw new \RuntimeException('ID account non valido per le notifiche.', 422);
        }

        $limit = $this->sanitizeInt($query['limit'] ?? 10, 1, 100);
        $onlyUnread = isset($query['only_unread']) ? (int) $query['only_unread'] === 1 : false;

        $items = $this->repository->listNotificationsForAccount($accountId, $limit, $onlyUnread);
        $unread = $this->repository->countUnreadNotifications($accountId);

        return [
            'items' => $items,
            'unread' => $unread,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function notificationsMarkRead(array $input): array
    {
        $accountId = $this->sanitizeInt($input['id_account'] ?? ($input['account_id'] ?? 0), 1, PHP_INT_MAX);
        if ($accountId <= 0) {
            throw new \RuntimeException('ID account non valido per aggiornare le notifiche.', 422);
        }

        $ids = $input['id_notifiche'] ?? ($input['notifiche'] ?? ($input['ids'] ?? []));
        $idList = $this->normalizeOperatorIds($ids); // reuse method for array of ints
        if ($idList === []) {
            throw new \RuntimeException('Nessuna notifica selezionata.', 422);
        }

        $updated = $this->repository->markNotificationsRead($accountId, $idList);

        return [
            'ok' => true,
            'notifiche_aggiornate' => $updated,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function documents(array $query): array
    {
        $lavorazioneId = $this->sanitizeInt($query['id_lavorazione'] ?? ($query['lavorazione_id'] ?? ($query['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($lavorazioneId <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }
        if (!$this->repository->existsLavorazione($lavorazioneId)) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        return $this->repository->fetchRelatedDocuments($lavorazioneId);
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    public function filesList(array $query): array
    {
        $lavorazioneId = $this->sanitizeInt($query['id_lavorazione'] ?? ($query['lavorazione_id'] ?? ($query['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($lavorazioneId <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }
        if (!$this->repository->existsLavorazione($lavorazioneId)) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        $items = $this->repository->listLavorazioneFiles($lavorazioneId);
        return ['items' => $items];
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $file
     * @return array<string, mixed>
     */
    public function uploadFile(array $input, array $file): array
    {
        $lavorazioneId = $this->sanitizeInt($input['id_lavorazione'] ?? ($input['lavorazione_id'] ?? ($input['id'] ?? 0)), 1, PHP_INT_MAX);
        if ($lavorazioneId <= 0) {
            throw new \RuntimeException('ID lavorazione mancante o non valido.', 422);
        }
        if (!$this->repository->existsLavorazione($lavorazioneId)) {
            throw new \RuntimeException('Lavorazione non trovata.', 404);
        }

        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new \RuntimeException('File mancante o non valido.', 422);
        }
        if (isset($file['error']) && (int) $file['error'] !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('Errore durante il caricamento del file.', 422);
        }

        $categoria = isset($input['categoria']) ? trim((string) $input['categoria']) : 'cliente';
        $categoria = in_array($categoria, ['cliente', 'anteprima', 'altro'], true) ? $categoria : 'cliente';

        $titolo = isset($input['titolo']) ? trim((string) $input['titolo']) : '';
        $originalName = isset($file['name']) ? basename((string) $file['name']) : 'file';
        if ($titolo === '') {
            $titolo = $originalName;
        }

        $note = isset($input['note']) ? trim((string) $input['note']) : null;
        if ($note === '') {
            $note = null;
        }

        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $safeExtension = $extension !== '' ? preg_replace('/[^a-zA-Z0-9]+/', '', $extension) : '';
        $fileName = sprintf('%s.%s', uniqid('lav_', true), $safeExtension !== '' ? $safeExtension : 'bin');

        $baseDir = dirname(__DIR__, 2) . '/uploads/lavorazioni/' . $lavorazioneId;
        if (!is_dir($baseDir) && !mkdir($baseDir, 0775, true) && !is_dir($baseDir)) {
            throw new \RuntimeException('Impossibile creare la cartella di upload.', 500);
        }

        $destination = $baseDir . '/' . $fileName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \RuntimeException('Impossibile salvare il file caricato.', 500);
        }

        $actor = $this->resolveActorFromToken();
        $createdBy = $actor['id'] ?? $this->resolveActorIdFromInput($input);

        $idFile = $this->repository->createLavorazioneFile($lavorazioneId, [
            'titolo' => $titolo,
            'categoria' => $categoria,
            'original_name' => $originalName,
            'file_name' => $fileName,
            'mime_type' => isset($file['type']) ? (string) $file['type'] : 'application/octet-stream',
            'size_bytes' => isset($file['size']) ? (int) $file['size'] : 0,
            'note' => $note,
            'created_by' => $createdBy,
        ]);

        return [
            'id_file' => $idFile,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, mixed>
     */
    private function buildFilters(array $query, bool $withSearch = false): array
    {
        $filters = [
            'stato' => $this->filterEnum($query['stato'] ?? null, ['aperta', 'pianificata', 'in_produzione', 'completata', 'annullata', 'sospesa']),
            'reparto_id' => null,
            'date_from' => null,
            'date_to' => null,
            'search' => null,
            'periodo_code' => null,
            'allowed_anagrafiche' => null,
        ];

        if (!empty($query['reparto'])) {
            $filters['reparto_id'] = $this->resolveRepartoId((string) $query['reparto']);
        }

        $periodo = $this->resolvePeriodo($query['periodo'] ?? null);
        $filters['date_from'] = $periodo['from'];
        $filters['date_to'] = $periodo['to'];
        $filters['periodo_code'] = $periodo['code'];

        if ($withSearch) {
            $search = trim((string) ($query['search'] ?? ''));
            $filters['search'] = $search !== '' ? $search : null;
        }
        if (isset($query['allowed_anagrafiche']) && is_array($query['allowed_anagrafiche'])) {
            $filters['allowed_anagrafiche'] = $query['allowed_anagrafiche'];
        }

        return $filters;
    }

    private function resolveRepartoId(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (ctype_digit($value)) {
            $id = (int) $value;
            return $id > 0 ? $id : null;
        }

        return $this->repository->findRepartoIdByCode($value);
    }

    /**
     * @param mixed $value
     */
    private function sanitizeInt($value, int $min, int $max): int
    {
        if (is_numeric($value)) {
            $int = (int) $value;
        } else {
            $int = (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
        }
        if ($int < $min) {
            return $min;
        }
        if ($int > $max) {
            return $max;
        }
        return $int;
    }

    /**
     * @param mixed $value
     * @param array<int, string> $allowed
     */
    private function filterEnum($value, array $allowed): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $normalized = strtolower(trim($value));
        return in_array($normalized, $allowed, true) ? $normalized : null;
    }

    /**
     * @param mixed $value
     * @return array{from: ?string, to: ?string, code: ?string}
     */
    private function resolvePeriodo($value): array
    {
        if (!is_string($value) || trim($value) === '') {
            return ['from' => null, 'to' => null, 'code' => null];
        }
        $code = strtolower(trim($value));
        $now = new \DateTimeImmutable('now');
        switch ($code) {
            case '7d':
                $from = $now->modify('-7 days')->format('Y-m-d');
                return ['from' => $from, 'to' => null, 'code' => '7d'];
            case '30d':
                $from = $now->modify('-30 days')->format('Y-m-d');
                return ['from' => $from, 'to' => null, 'code' => '30d'];
            case '90d':
                $from = $now->modify('-90 days')->format('Y-m-d');
                return ['from' => $from, 'to' => null, 'code' => '90d'];
            case 'year':
                $from = (new \DateTimeImmutable($now->format('Y') . '-01-01'))->format('Y-m-d');
                return ['from' => $from, 'to' => null, 'code' => 'year'];
            default:
                return ['from' => null, 'to' => null, 'code' => null];
        }
    }

    /**
     * @param mixed $value
     */
    private function sanitizePriority($value): string
    {
        if (!is_string($value)) {
            return 'medium';
        }
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['low', 'medium', 'high', 'critical'], true) ? $normalized : 'medium';
    }

    private function sanitizePercent($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            return null;
        }
        $number = (int) $value;
        if ($number < 0) {
            return 0;
        }
        if ($number > 100) {
            return 100;
        }
        return $number;
    }

    private function derivePercentByStatus(string $status, array $activityMeta): ?int
    {
        switch ($status) {
            case 'done':
                return 100;
            case 'cancelled':
                return 50;
            case 'todo':
                return 0;
            case 'sospesa':
                return 50;
            case 'in_progress':
                $estimated = $this->estimatePercentFromSchedule(
                    $activityMeta['data_creazione'] ?? null,
                    $activityMeta['data_scadenza'] ?? null,
                );
                return $estimated ?? 10;
            default:
                return 0;
        }
    }

    private function estimatePercentFromSchedule(?string $start, ?string $end): ?int
    {
        if (!is_string($start) || !is_string($end) || trim($start) === '' || trim($end) === '') {
            return null;
        }

        try {
            $startDt = new \DateTimeImmutable($start);
            $endDt = new \DateTimeImmutable($end);
        } catch (\Throwable $exception) {
            return null;
        }

        if ($endDt <= $startDt) {
            return null;
        }

        $now = new \DateTimeImmutable('now');
        $total = $endDt->getTimestamp() - $startDt->getTimestamp();
        $elapsed = $now->getTimestamp() - $startDt->getTimestamp();
        $ratio = max(0, min(1, $total > 0 ? $elapsed / $total : 0));
        $percent = (int) round(10 + ($ratio * 80));
        return max(10, min(90, $percent));
    }

    /**
     * @param mixed $value
     */
    private function sanitizeDate($value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        try {
            $dt = new \DateTimeImmutable($value);
            return $dt->format('Y-m-d');
        } catch (\Throwable $exception) {
            return null;
        }
    }

    /**
     * @param mixed $value
     */
    private function sanitizeDateTime($value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        try {
            $dt = new \DateTimeImmutable($value);
            return $dt->format('Y-m-d H:i:s');
        } catch (\Throwable $exception) {
            return null;
        }
    }

    /**
     * @param mixed $value
     * @return array<int, int>
     */
    private function normalizeOperatorIds($value): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (is_string($value)) {
            $parts = array_filter(array_map('trim', explode(',', $value)), static fn ($part) => $part !== '');
            $value = $parts;
        }
        if (!is_array($value)) {
            return [];
        }
        $ids = [];
        foreach ($value as $item) {
            if (is_array($item) && isset($item['id_account'])) {
                $candidate = (int) $item['id_account'];
            } else {
                $candidate = (int) $item;
            }
            if ($candidate > 0) {
                $ids[] = $candidate;
            }
        }

        return array_values(array_unique($ids));
    }
}
