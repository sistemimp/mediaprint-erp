<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use DateTimeInterface;
use PDO;

final class MfaRepository
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function createSession(int $accountId, string $token, DateTimeInterface $expiresAt): void
    {
        $sql = '
            INSERT INTO auth_account_mfa_sessions (
                id_account,
                token,
                expires_at
            ) VALUES (
                :id_account,
                :token,
                :expires_at
            )';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'id_account' => $accountId,
            'token' => $token,
            'expires_at' => $expiresAt->format('Y-m-d H:i:s'),
        ]);
    }

    public function consumeSession(string $token): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_session, id_account, expires_at
            FROM auth_account_mfa_sessions
            WHERE token = :token
            LIMIT 1
        ');
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $expires = $row['expires_at'] ? new \DateTimeImmutable($row['expires_at']) : null;
        if ($expires !== null && $expires < new \DateTimeImmutable('now')) {
            $this->deleteSession((int) $row['id_session']);
            return null;
        }
        $this->deleteSession((int) $row['id_session']);
        return [
            'id_account' => (int) $row['id_account'],
        ];
    }

    private function deleteSession(int $sessionId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM auth_account_mfa_sessions WHERE id_session = :id');
        $stmt->execute(['id' => $sessionId]);
    }

    public function clearSessionsForAccount(int $accountId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM auth_account_mfa_sessions WHERE id_account = :id');
        $stmt->execute(['id' => $accountId]);
    }

    public function getSession(string $token): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT id_session, id_account, expires_at
            FROM auth_account_mfa_sessions
            WHERE token = :token
            LIMIT 1
        ');
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $expires = $row['expires_at'] ? new \DateTimeImmutable($row['expires_at']) : null;
        if ($expires !== null && $expires < new \DateTimeImmutable('now')) {
            $this->deleteSession((int) $row['id_session']);
            return null;
        }
        return [
            'id_session' => (int) $row['id_session'],
            'id_account' => (int) $row['id_account'],
        ];
    }
}
