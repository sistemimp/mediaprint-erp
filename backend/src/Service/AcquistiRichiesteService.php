<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\TicketsRepository;
use RuntimeException;

final class AcquistiRichiesteService
{
    private const MODULO = 'acquisti';
    private const PERMISSION_MANAGE_ALL = 'acquisti.tickets.all';

    public function __construct(private TicketsRepository $repository) {}

    /**
     * @param array<string, mixed> $filters
     * @param array<string, mixed> $auth
     */
    public function list(array $filters = [], array $auth = []): array
    {
        $accountId = $this->extractAccountId($auth);
        if ($accountId <= 0) {
            throw new RuntimeException('Account non valido.', 401);
        }

        $normalized = [
            'q' => isset($filters['q']) ? trim((string) $filters['q']) : null,
            'stato' => isset($filters['stato']) ? $this->normalizeStatus((string) $filters['stato'], false) : null,
            'priorita' => isset($filters['priorita']) ? $this->normalizePriority((string) $filters['priorita'], false) : null,
            'assigned_to' => isset($filters['assigned_to']) ? $this->normalizeId($filters['assigned_to']) : null,
            'created_by' => isset($filters['created_by']) ? $this->normalizeId($filters['created_by']) : null,
            'modulo' => self::MODULO,
        ];
        if (!$this->canManageAllAcquistiTickets($auth)) {
            $normalized['visible_to_account'] = $accountId;
        }

        return ['items' => $this->repository->listTickets($normalized)];
    }

    /**
     * @param array<string, mixed> $auth
     */
    public function detail(int $idTicket, array $auth = []): array
    {
        if ($idTicket <= 0) {
            throw new RuntimeException('ID richiesta non valido.', 422);
        }

        $ticket = $this->repository->getTicket($idTicket);
        if ($ticket === null) {
            throw new RuntimeException('Richiesta non trovata.', 404);
        }
        if (($ticket['modulo'] ?? '') !== self::MODULO) {
            throw new RuntimeException('La richiesta non appartiene al modulo acquisti.', 422);
        }
        $this->assertCanAccessTicket($ticket, $auth);

        $messages = $this->repository->listMessages($idTicket);
        $preventivi = $this->repository->listAcquistiPreventiviLinks($idTicket);
        $assignees = $this->repository->listTicketAssignees($idTicket);

        return ['ticket' => $ticket, 'messages' => $messages, 'preventivi' => $preventivi, 'assignees' => $assignees];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload, ?int $createdBy): array
    {
        $titolo = trim((string) ($payload['titolo'] ?? ''));
        if ($titolo === '') {
            throw new RuntimeException('Il titolo è obbligatorio.', 422);
        }

        $stato = $this->normalizeStatus((string) ($payload['stato'] ?? 'aperto'), true);
        $priorita = $this->normalizePriority((string) ($payload['priorita'] ?? 'media'), true);
        $assignedToIds = $this->normalizeAssignedToIds($payload['assigned_to'] ?? null);
        $assignedTo = $assignedToIds[0] ?? null;

        $idTicket = $this->repository->createTicket([
            'titolo' => $titolo,
            'descrizione' => $this->normalizeText($payload['descrizione'] ?? null),
            'stato' => $stato,
            'priorita' => $priorita,
            'modulo' => self::MODULO,
            'url' => $this->normalizeText($payload['url'] ?? null),
            'created_by' => $createdBy,
            'assigned_to' => $assignedTo,
        ]);
        $this->repository->replaceTicketAssignees($idTicket, $assignedToIds);

        return ['id_ticket' => $idTicket];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $auth
     */
    public function update(array $payload, array $auth = []): array
    {
        $idTicket = isset($payload['id_ticket']) ? (int) $payload['id_ticket'] : 0;
        if ($idTicket <= 0) {
            throw new RuntimeException('ID richiesta non valido.', 422);
        }

        $current = $this->repository->getTicket($idTicket);
        if ($current === null) {
            throw new RuntimeException('Richiesta non trovata.', 404);
        }
        if (($current['modulo'] ?? '') !== self::MODULO) {
            throw new RuntimeException('La richiesta non appartiene al modulo acquisti.', 422);
        }
        $this->assertCanAccessTicket($current, $auth);

        $stato = array_key_exists('stato', $payload)
            ? $this->normalizeStatus((string) $payload['stato'], true)
            : (string) ($current['stato'] ?? 'aperto');

        $priorita = array_key_exists('priorita', $payload)
            ? $this->normalizePriority((string) $payload['priorita'], true)
            : (string) ($current['priorita'] ?? 'media');

        $assigneesInput = array_key_exists('assigned_to', $payload)
            ? $payload['assigned_to']
            : (isset($current['assigned_to']) ? [$current['assigned_to']] : []);
        $assignedToIds = $this->normalizeAssignedToIds($assigneesInput);
        $assignedTo = $assignedToIds[0] ?? null;

        $closedAt = $current['closed_at'] ?? null;
        if (array_key_exists('stato', $payload)) {
            if (in_array($stato, ['risolto', 'chiuso'], true)) {
                $closedAt = 'NOW';
            } else {
                $closedAt = null;
            }
        }

        $this->repository->updateTicket($idTicket, [
            'titolo' => (string) ($current['titolo'] ?? ''),
            'descrizione' => $current['descrizione'] ?? null,
            'stato' => $stato,
            'priorita' => $priorita,
            'modulo' => self::MODULO,
            'url' => $current['url'] ?? null,
            'assigned_to' => $assignedTo,
            'closed_at' => $closedAt,
        ]);
        $this->repository->replaceTicketAssignees($idTicket, $assignedToIds);

        return ['id_ticket' => $idTicket];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $auth
     */
    public function addMessage(array $payload, ?int $createdBy, array $auth = []): array
    {
        $idTicket = isset($payload['id_ticket']) ? (int) $payload['id_ticket'] : 0;
        if ($idTicket <= 0) {
            throw new RuntimeException('ID richiesta non valido.', 422);
        }

        $ticket = $this->repository->getTicket($idTicket);
        if ($ticket === null) {
            throw new RuntimeException('Richiesta non trovata.', 404);
        }
        if (($ticket['modulo'] ?? '') !== self::MODULO) {
            throw new RuntimeException('La richiesta non appartiene al modulo acquisti.', 422);
        }
        $this->assertCanAccessTicket($ticket, $auth);

        $message = trim((string) ($payload['message'] ?? ''));
        if ($message === '') {
            throw new RuntimeException('Il messaggio è obbligatorio.', 422);
        }

        $idMessage = $this->repository->addMessage($idTicket, $message, $createdBy);
        return ['id_message' => $idMessage];
    }

    /**
     * @param array<string, mixed> $auth
     */
    public function linkPreventivo(int $idTicket, int $idPreventivo, ?int $createdBy, array $auth = []): array
    {
        if ($idTicket <= 0) {
            throw new RuntimeException('ID richiesta non valido.', 422);
        }
        if ($idPreventivo <= 0) {
            throw new RuntimeException('ID preventivo non valido.', 422);
        }

        $ticket = $this->repository->getTicket($idTicket);
        if ($ticket === null) {
            throw new RuntimeException('Richiesta non trovata.', 404);
        }
        if (($ticket['modulo'] ?? '') !== self::MODULO) {
            throw new RuntimeException('La richiesta non appartiene al modulo acquisti.', 422);
        }
        $this->assertCanAccessTicket($ticket, $auth);

        if (!$this->repository->preventivoExistsAndIsAcquisto($idPreventivo)) {
            throw new RuntimeException('Preventivo acquisto non trovato.', 404);
        }

        $this->repository->linkAcquistiPreventivo($idTicket, $idPreventivo, $createdBy);

        return ['id_ticket' => $idTicket, 'id_preventivo' => $idPreventivo];
    }

    /**
     * @param array<string, mixed> $auth
     */
    public function unlinkPreventivo(int $idTicket, int $idPreventivo, array $auth = []): array
    {
        if ($idTicket <= 0) {
            throw new RuntimeException('ID richiesta non valido.', 422);
        }
        if ($idPreventivo <= 0) {
            throw new RuntimeException('ID preventivo non valido.', 422);
        }

        $ticket = $this->repository->getTicket($idTicket);
        if ($ticket === null) {
            throw new RuntimeException('Richiesta non trovata.', 404);
        }
        if (($ticket['modulo'] ?? '') !== self::MODULO) {
            throw new RuntimeException('La richiesta non appartiene al modulo acquisti.', 422);
        }
        $this->assertCanAccessTicket($ticket, $auth);

        $this->repository->unlinkAcquistiPreventivo($idTicket, $idPreventivo);

        return ['id_ticket' => $idTicket, 'id_preventivo' => $idPreventivo];
    }

    /**
     * @param array<string, mixed> $ticket
     * @param array<string, mixed> $auth
     */
    private function assertCanAccessTicket(array $ticket, array $auth): void
    {
        if ($this->canManageAllAcquistiTickets($auth)) {
            return;
        }

        $accountId = $this->extractAccountId($auth);
        $idTicket = isset($ticket['id_ticket']) ? (int) $ticket['id_ticket'] : 0;
        $createdBy = isset($ticket['created_by']) ? (int) $ticket['created_by'] : 0;
        if ($accountId <= 0) {
            throw new RuntimeException('Accesso non autorizzato.', 403);
        }

        if ($createdBy === $accountId) {
            return;
        }

        if ($idTicket > 0 && $this->repository->isAccountAssignedToTicket($idTicket, $accountId)) {
            return;
        }

        throw new RuntimeException('Accesso consentito solo ai creatori o operatori assegnati.', 403);
    }

    /**
     * @param array<string, mixed> $auth
     */
    private function canManageAllAcquistiTickets(array $auth): bool
    {
        if ($this->isAdmin($auth)) {
            return true;
        }
        if ($this->hasPermission($auth, self::PERMISSION_MANAGE_ALL)) {
            return true;
        }

        $accountId = $this->extractAccountId($auth);
        if ($accountId <= 0) {
            return false;
        }
        $managerIds = $this->managerAccountIdsFromEnv();
        return in_array($accountId, $managerIds, true);
    }

    /**
     * @param array<string, mixed> $auth
     */
    private function isAdmin(array $auth): bool
    {
        $roles = $auth['roles'] ?? [];
        if (!is_array($roles)) {
            return false;
        }
        foreach ($roles as $role) {
            if (is_string($role) && strtolower(trim($role)) === 'admin') {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $auth
     */
    private function hasPermission(array $auth, string $code): bool
    {
        $permissions = $auth['permissions'] ?? [];
        if (!is_array($permissions)) {
            return false;
        }
        foreach ($permissions as $permission) {
            if (is_string($permission) && trim($permission) === $code) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $auth
     */
    private function extractAccountId(array $auth): int
    {
        return isset($auth['sub']) ? (int) $auth['sub'] : 0;
    }

    /**
     * @return list<int>
     */
    private function managerAccountIdsFromEnv(): array
    {
        $raw = (string) (getenv('ACQUISTI_MANAGER_ACCOUNT_IDS') ?: getenv('ACQUISTI_MANAGER_ACCOUNT_ID') ?: '');
        if (trim($raw) === '') {
            return [];
        }
        $parts = preg_split('/[,\s;]+/', $raw) ?: [];
        $ids = [];
        foreach ($parts as $part) {
            $id = (int) trim((string) $part);
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }
        return array_values($ids);
    }

    private function normalizeStatus(string $status, bool $strict): ?string
    {
        $valid = ['aperto', 'in_lavorazione', 'risolto', 'chiuso'];
        $value = strtolower(trim($status));
        if ($value === '') {
            return $strict ? 'aperto' : null;
        }
        if (!in_array($value, $valid, true)) {
            if ($strict) {
                throw new RuntimeException('Stato richiesta non valido.', 422);
            }
            return null;
        }
        return $value;
    }

    private function normalizePriority(string $priority, bool $strict): ?string
    {
        $valid = ['bassa', 'media', 'alta', 'critica'];
        $value = strtolower(trim($priority));
        if ($value === '') {
            return $strict ? 'media' : null;
        }
        if (!in_array($value, $valid, true)) {
            if ($strict) {
                throw new RuntimeException('Priorità richiesta non valida.', 422);
            }
            return null;
        }
        return $value;
    }

    /**
     * @param mixed $value
     */
    private function normalizeId($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }

    /**
     * @param mixed $value
     * @return list<int>
     */
    private function normalizeAssignedToIds($value): array
    {
        $raw = is_array($value) ? $value : [$value];
        $ids = [];
        foreach ($raw as $item) {
            if ($item === null || $item === '') {
                continue;
            }
            $id = (int) $item;
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }
        return array_values($ids);
    }

    /**
     * @param mixed $value
     */
    private function normalizeText($value): ?string
    {
        if ($value === null) {
            return null;
        }
        $text = trim((string) $value);
        return $text === '' ? null : $text;
    }
}
