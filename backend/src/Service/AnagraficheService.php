<?php
// backend/src/Services/AnagraficheService.php

declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\AnagraficheRepository;

use RuntimeException;

final class AnagraficheService
{
    public function __construct(private AnagraficheRepository $repository) {}

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function list(array $input): array
    {
        $filters = [
            'search' => isset($input['search']) ? trim((string)$input['search']) : null,
            'page' => (int)($input['page'] ?? 1),
            'per_page' => (int)($input['per_page'] ?? 20),
            'sort_by' => $input['sort_by'] ?? null,
            'sort_direction' => $input['sort_direction'] ?? null,
        ];

        if ($filters['per_page'] > 100) {
            throw new RuntimeException('per_page non può superare 100.');
        }

        $result = $this->repository->search($filters);

        $total = $result['total'];
        $page = max($filters['page'], 1);
        $perPage = max(1, min($filters['per_page'], 100));
        $lastPage = (int)ceil($total / $perPage);

        return [
            'data' => $result['data'],
            'meta' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => max($lastPage, 1),
                'from' => $total > 0 ? (($page - 1) * $perPage) + 1 : 0,
                'to' => min($page * $perPage, $total),
                'sort_by' => $filters['sort_by'] ?? 'ragione_sociale',
                'sort_direction' => strtolower($filters['sort_direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(array $input): array
    {
        $id = isset($input['id']) ? (int)$input['id'] : 0;

        if ($id <= 0) {
            throw new RuntimeException('ID anagrafica non valido.', 422);
        }

        $detail = $this->repository->findDetail($id);

        if ($detail === null) {
            throw new RuntimeException('Anagrafica non trovata.', 404);
        }

        return $detail;
    }
}