<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\TicketsRepository;
use RuntimeException;

final class TicketsService
{
    private const STATI = ['aperto', 'in_lavorazione', 'risolto', 'chiuso'];
    private const PRIORITA = ['bassa', 'media', 'alta', 'critica'];

    public function __construct(private TicketsRepository $repository) {}

    /**
     * @param array<string, mixed> $filters
     */
    public function list(array $filters = []): array
    {
        $normalized = [
            'q' => isset($filters['q']) ? trim((string) $filters['q']) : null,
            'stato' => isset($filters['stato']) ? $this->normalizeStatus((string) $filters['stato'], false) : null,
            'priorita' => isset($filters['priorita']) ? $this->normalizePriority((string) $filters['priorita'], false) : null,
            'assigned_to' => isset($filters['assigned_to']) ? $this->normalizeId($filters['assigned_to']) : null,
            'created_by' => isset($filters['created_by']) ? $this->normalizeId($filters['created_by']) : null,
        ];

        return ['items' => $this->repository->listTickets($normalized)];
    }

    public function detail(int $idTicket): array
    {
        if ($idTicket <= 0) {
            throw new RuntimeException('ID ticket non valido.', 422);
        }

        $ticket = $this->repository->getTicket($idTicket);
        if ($ticket === null) {
            throw new RuntimeException('Ticket non trovato.', 404);
        }

        $messages = $this->repository->listMessages($idTicket);

        return ['ticket' => $ticket, 'messages' => $messages];
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
        $assignedTo = $this->normalizeId($payload['assigned_to'] ?? null);

        $idTicket = $this->repository->createTicket([
            'titolo' => $titolo,
            'descrizione' => $this->normalizeText($payload['descrizione'] ?? null),
            'stato' => $stato,
            'priorita' => $priorita,
            'modulo' => $this->normalizeText($payload['modulo'] ?? null),
            'url' => $this->normalizeText($payload['url'] ?? null),
            'created_by' => $createdBy,
            'assigned_to' => $assignedTo,
        ]);

        return ['id_ticket' => $idTicket];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(array $payload): array
    {
        $idTicket = isset($payload['id_ticket']) ? (int) $payload['id_ticket'] : 0;
        if ($idTicket <= 0) {
            throw new RuntimeException('ID ticket non valido.', 422);
        }

        $current = $this->repository->getTicket($idTicket);
        if ($current === null) {
            throw new RuntimeException('Ticket non trovato.', 404);
        }

        $titolo = array_key_exists('titolo', $payload)
            ? trim((string) $payload['titolo'])
            : (string) ($current['titolo'] ?? '');
        if ($titolo === '') {
            throw new RuntimeException('Il titolo è obbligatorio.', 422);
        }

        $stato = array_key_exists('stato', $payload)
            ? $this->normalizeStatus((string) $payload['stato'], true)
            : (string) ($current['stato'] ?? 'aperto');

        $priorita = array_key_exists('priorita', $payload)
            ? $this->normalizePriority((string) $payload['priorita'], true)
            : (string) ($current['priorita'] ?? 'media');

        $assignedTo = array_key_exists('assigned_to', $payload)
            ? $this->normalizeId($payload['assigned_to'])
            : (isset($current['assigned_to']) ? (int) $current['assigned_to'] : null);

        $closedAt = $current['closed_at'] ?? null;
        if (array_key_exists('stato', $payload)) {
            if (in_array($stato, ['risolto', 'chiuso'], true)) {
                $closedAt = 'NOW';
            } else {
                $closedAt = null;
            }
        }

        $this->repository->updateTicket($idTicket, [
            'titolo' => $titolo,
            'descrizione' => array_key_exists('descrizione', $payload)
                ? $this->normalizeText($payload['descrizione'])
                : ($current['descrizione'] ?? null),
            'stato' => $stato,
            'priorita' => $priorita,
            'modulo' => array_key_exists('modulo', $payload)
                ? $this->normalizeText($payload['modulo'])
                : ($current['modulo'] ?? null),
            'url' => array_key_exists('url', $payload)
                ? $this->normalizeText($payload['url'])
                : ($current['url'] ?? null),
            'assigned_to' => $assignedTo,
            'closed_at' => $closedAt,
        ]);

        return ['id_ticket' => $idTicket];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function addMessage(array $payload, ?int $createdBy): array
    {
        $idTicket = isset($payload['id_ticket']) ? (int) $payload['id_ticket'] : 0;
        if ($idTicket <= 0) {
            throw new RuntimeException('ID ticket non valido.', 422);
        }

        $ticket = $this->repository->getTicket($idTicket);
        if ($ticket === null) {
            throw new RuntimeException('Ticket non trovato.', 404);
        }

        $message = trim((string) ($payload['message'] ?? ''));
        if ($message === '') {
            throw new RuntimeException('Il messaggio è obbligatorio.', 422);
        }

        $idMessage = $this->repository->addMessage($idTicket, $message, $createdBy);
        return ['id_message' => $idMessage];
    }

    private function normalizeStatus(string $status, bool $strict): ?string
    {
        $value = strtolower(trim($status));
        if ($value === '') {
            return $strict ? 'aperto' : null;
        }
        if (!in_array($value, self::STATI, true)) {
            if ($strict) {
                throw new RuntimeException('Stato ticket non valido.', 422);
            }
            return null;
        }
        return $value;
    }

    private function normalizePriority(string $priority, bool $strict): ?string
    {
        $value = strtolower(trim($priority));
        if ($value === '') {
            return $strict ? 'media' : null;
        }
        if (!in_array($value, self::PRIORITA, true)) {
            if ($strict) {
                throw new RuntimeException('Priorità ticket non valida.', 422);
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
