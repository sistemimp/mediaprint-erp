<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\ReleaseNotesRepository;
use RuntimeException;

final class ReleaseNotesService
{
    public function __construct(private ReleaseNotesRepository $repository) {}

    /**
     * @return array{items:list<array<string, mixed>>}
     */
    public function list(): array
    {
        return ['items' => $this->repository->listNotes()];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload, ?int $createdBy): array
    {
        $titolo = trim((string) ($payload['titolo'] ?? ''));
        $contenuto = trim((string) ($payload['contenuto'] ?? ''));
        // Versione opzionale: puo' essere valorizzata anche in un secondo momento.
        $versione = isset($payload['versione']) ? trim((string) $payload['versione']) : null;

        if ($titolo === '' || $contenuto === '') {
            throw new RuntimeException('Titolo e contenuto sono obbligatori.', 422);
        }

        if ($versione !== null && $versione === '') {
            $versione = null;
        }

        $id = $this->repository->createNote($titolo, $versione, $contenuto, $createdBy);
        return ['id_note' => $id];
    }
}
