<?php
// backend/src/Repositories/ConfigRepository.php

namespace MediaPrint\Repo;

use PDO;

final class ConfigRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return list<array{id_natura:int, code:string, label:string}>
     */
    public function listNaturaIva(): array
    {
        $stmt = $this->pdo->query('SELECT id_natura, code, label FROM cfg_sdi_natura_iva WHERE attivo = 1 ORDER BY code ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(
            fn ($r) => [
                'id_natura' => (int) $r['id_natura'],
                'code' => (string) $r['code'],
                'label' => (string) ($r['label'] ?? $r['code']),
            ],
            $rows
        );
    }
}
