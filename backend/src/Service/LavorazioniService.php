<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\LavorazioniRepository;

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
        $stato = $this->filterEnum($rawState, ['aperta', 'pianificata', 'in_produzione', 'completata', 'annullata']);
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

        return $detail;
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
            throw new \RuntimeException('ID attivit� mancante o non valido.', 422);
        }

        $activity = $this->repository->findActivity($activityId);
        if ($activity === null) {
            throw new \RuntimeException('Attivit� non trovata.', 404);
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
                    throw new \RuntimeException('Attivit� non trovata.', 404);
                }
                if ((int) ($activity['id_lavorazione'] ?? 0) !== $lavorazioneId) {
                    throw new \RuntimeException('Attivit� non appartenente alla lavorazione selezionata.', 422);
                }
                $activityId = $candidate;
            }
        }

        $title = trim((string) ($input['titolo'] ?? ($input['title'] ?? '')));
        if ($title === '') {
            $title = $activityId !== null
                ? sprintf('Aggiornamento attivit� #%d', $activityId)
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

        $inserted = $this->repository->createNotifications($lavorazioneId, $activityId, $operatorIds, $title, $message);

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
    private function buildFilters(array $query, bool $withSearch = false): array
    {
        $filters = [
            'stato' => $this->filterEnum($query['stato'] ?? null, ['aperta', 'pianificata', 'in_produzione', 'completata', 'annullata']),
            'reparto_id' => null,
            'date_from' => null,
            'date_to' => null,
            'search' => null,
            'periodo_code' => null,
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
