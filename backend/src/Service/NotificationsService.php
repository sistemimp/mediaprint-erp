<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\LavorazioniRepository;

final class NotificationsService
{
    public function __construct(private LavorazioniRepository $repository) {}

    public function notifyAllOperators(
        string $title,
        string $message,
        ?array $payload = null,
        ?int $createdBy = null,
        string $tipo = 'dashboard',
    ): int {
        $operators = $this->repository->listActiveOperators();
        $ids = [];
        foreach ($operators as $row) {
            $id = isset($row['id_account']) ? (int) $row['id_account'] : 0;
            if ($id > 0) {
                $ids[] = $id;
            }
        }

        return $this->repository->createGeneralNotifications($ids, $title, $message, $payload, $createdBy, $tipo);
    }
}
