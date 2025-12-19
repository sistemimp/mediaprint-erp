<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\AnagraficheDashboardRepository;

final class AnagraficheDashboardService
{
     public function __construct(private AnagraficheDashboardRepository $repository) {}

    /**
     * Ritorna payload pronto per il frontend:
     * [
     *   'kpi' => [
     *      'totale_generale' => int,
     *      'nuovi_mese_corrente' => int,
     *      'nuovi_mese_precedente' => int,
     *      'perc_change_mom' => float|null
     *   ],
     *   'series' => [ { mese, tot, attive, disattive }, ... ]
     * ]
     */
    public function getDashboardStats(bool $onlyActive = false): array
    {
        $kpi = $this->repository->fetchKpi($onlyActive);
        $prev = (int)($kpi['nuovi_mese_precedente'] ?? 0);
        $curr = (int)($kpi['nuovi_mese_corrente'] ?? 0);

        $kpi['perc_change_mom'] = $prev === 0 ? null : round((($curr - $prev) / $prev) * 100, 1);

        $series = $this->repository->fetchSeriesLast6($onlyActive);

        return [
            'kpi'    => $kpi,
            'series' => $series,
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function getNewClients(int $limit = 20, ?string $startDate = null, ?string $endDate = null): array
    {
        if ($startDate !== null && $endDate !== null) {
            return $this->repository->fetchNewClientsForRange($startDate, $endDate, $limit);
        }

        return $this->repository->fetchNewClientsCurrentMonth($limit);
    }
}
