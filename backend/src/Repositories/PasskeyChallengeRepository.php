<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use DateTimeInterface;
use PDO;

final class PasskeyChallengeRepository
{
    private bool $schemaChecked = false;

    public function __construct(private PDO $pdo)
    {
    }

    public function storeChallenge(
        int $accountId,
        string $token,
        string $challenge,
        string $type,
        DateTimeInterface $expiresAt
    ): void {
        $this->ensureSchema();
        $stmt = $this->pdo->prepare(<<<SQL
            INSERT INTO auth_mfa_passkey_challenges (
                id_account,
                token,
                challenge,
                type,
                expires_at
            ) VALUES (
                :id_account,
                :token,
                :challenge,
                :type,
                :expires_at
            )
            ON DUPLICATE KEY UPDATE
              challenge = VALUES(challenge),
              expires_at = VALUES(expires_at),
              type = VALUES(type)
        SQL);
        $binaryToken = hex2bin($token);
        if ($binaryToken === false) {
            throw new \InvalidArgumentException('Token MFA non valido.');
        }
        $stmt->execute([
            'id_account' => $accountId,
            'token' => $binaryToken,
            'challenge' => $challenge,
            'type' => $type,
            'expires_at' => $expiresAt->format('Y-m-d H:i:s'),
        ]);
    }

    public function consumeChallenge(string $token, string $type): ?array
    {
        $this->ensureSchema();
        $binary = hex2bin($token);
        if ($binary === false) {
            return null;
        }
        $stmt = $this->pdo->prepare('
            SELECT id_challenge, id_account, challenge
            FROM auth_mfa_passkey_challenges
            WHERE token = :token AND type = :type
            LIMIT 1
        ');
        $stmt->execute([
            'token' => $binary,
            'type' => $type,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $expires = $this->pdo->prepare('
            SELECT expires_at FROM auth_mfa_passkey_challenges WHERE id_challenge = :id LIMIT 1
        ');
        $expires->execute(['id' => $row['id_challenge']]);
        $expiresAt = $expires->fetchColumn();
        if ($expiresAt !== false && new \DateTimeImmutable($expiresAt) < new \DateTimeImmutable('now')) {
            $this->deleteChallenge((int) $row['id_challenge']);
            return null;
        }
        $this->deleteChallenge((int) $row['id_challenge']);
        return [
            'id_account' => (int) $row['id_account'],
            'challenge' => $row['challenge'],
        ];
    }

    private function deleteChallenge(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM auth_mfa_passkey_challenges WHERE id_challenge = :id');
        $stmt->execute(['id' => $id]);
    }

    private function ensureSchema(): void
    {
        if ($this->schemaChecked) {
            return;
        }
        $this->schemaChecked = true;

        $tableExists = $this->pdo->query("SHOW TABLES LIKE 'auth_mfa_passkey_challenges'")->fetchColumn();
        if (!$tableExists) {
            $this->pdo->exec(<<<SQL
                CREATE TABLE IF NOT EXISTS auth_mfa_passkey_challenges (
                    id_challenge BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                    id_account BIGINT(20) UNSIGNED NOT NULL,
                    token VARBINARY(64) NOT NULL,
                    challenge VARBINARY(64) NOT NULL,
                    type ENUM('assertion','attestation') NOT NULL DEFAULT 'assertion',
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id_challenge),
                    UNIQUE KEY idx_passkey_challenge_token (token),
                    KEY idx_passkey_challenge_account (id_account)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);
            return;
        }

        $columns = $this->pdo->query("SHOW COLUMNS FROM auth_mfa_passkey_challenges")
            ->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $columnNames = array_map(static fn(array $col): string => (string) ($col['Field'] ?? ''), $columns);
        $hasColumn = static fn(string $name): bool => in_array($name, $columnNames, true);

        if (!$hasColumn('token')) {
            $this->pdo->exec('ALTER TABLE auth_mfa_passkey_challenges ADD COLUMN token VARBINARY(64) NOT NULL');
        }
        if (!$hasColumn('challenge')) {
            $this->pdo->exec('ALTER TABLE auth_mfa_passkey_challenges ADD COLUMN challenge VARBINARY(64) NOT NULL');
        }
        if (!$hasColumn('type')) {
            $this->pdo->exec("ALTER TABLE auth_mfa_passkey_challenges ADD COLUMN type ENUM('assertion','attestation') NOT NULL DEFAULT 'assertion'");
        }
        if (!$hasColumn('expires_at')) {
            $this->pdo->exec('ALTER TABLE auth_mfa_passkey_challenges ADD COLUMN expires_at DATETIME NOT NULL');
        }
        if (!$hasColumn('created_at')) {
            $this->pdo->exec('ALTER TABLE auth_mfa_passkey_challenges ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
        }

        try {
            $this->pdo->exec('CREATE UNIQUE INDEX idx_passkey_challenge_token ON auth_mfa_passkey_challenges (token)');
        } catch (\Throwable $_) {
        }
        try {
            $this->pdo->exec('CREATE INDEX idx_passkey_challenge_account ON auth_mfa_passkey_challenges (id_account)');
        } catch (\Throwable $_) {
        }
    }
}
