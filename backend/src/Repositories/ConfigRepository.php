<?php
// backend/src/Repositories/ConfigRepository.php

namespace MediaPrint\Repo;

use PDO;

final class ConfigRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * @return array<string, string|null>
     */
    public function getSettingsByPrefix(string $prefix): array
    {
        $stmt = $this->pdo->prepare('SELECT k, v FROM cfg_settings WHERE k LIKE :prefix AND attivo = 1');
        $stmt->bindValue(':prefix', $prefix . '%', PDO::PARAM_STR);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $result = [];
        foreach ($rows as $row) {
            $key = isset($row['k']) ? (string) $row['k'] : '';
            if ($key === '') {
                continue;
            }
            $result[$key] = array_key_exists('v', $row) ? ($row['v'] !== null ? (string) $row['v'] : null) : null;
        }
        return $result;
    }

    public function setSetting(string $key, ?string $value, ?string $note = null, bool $active = true): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO cfg_settings (k, v, note, attivo) VALUES (:k, :v, :note, :attivo)
             ON DUPLICATE KEY UPDATE v = VALUES(v), note = VALUES(note), attivo = VALUES(attivo), updated_at = NOW()'
        );
        $stmt->bindValue(':k', $key, PDO::PARAM_STR);
        $stmt->bindValue(':v', $value, $value === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':note', $note, $note === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':attivo', $active ? 1 : 0, PDO::PARAM_INT);
        $stmt->execute();
    }

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
