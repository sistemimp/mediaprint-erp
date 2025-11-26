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
}
