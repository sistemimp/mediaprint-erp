<?php
namespace MediaPrint\Repo;

use PDO;

final class AuthRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findActiveAccount(string $identifier): ?array
    {
        $sql = <<<SQL
        SELECT
            a.id_account,
            a.account_type,
            a.username,
            a.email,
            a.password_hash,
            a.id_ruolo,
            a.id_contatto,
            a.is_active,
            a.must_change_pwd,
            a.has_mfa,
            a.mfa_secret,
            a.last_login,
            a.created_at,
            a.updated_at,
            r.code AS primary_role_code,
            r.label AS primary_role_label
        FROM auth_accounts AS a
        LEFT JOIN cfg_auth_ruoli AS r ON r.id_ruolo = a.id_ruolo
        WHERE a.is_active = 1 AND (a.username = :username OR a.email = :email)
        LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'username' => $identifier,
            'email' => $identifier
        ]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function getAccountRoles(int $accountId, ?int $primaryRoleId): array
    {
        $roles = [];
        if ($primaryRoleId !== null) {
            $stmt = $this->pdo->prepare('SELECT id_ruolo, code, label FROM cfg_auth_ruoli WHERE id_ruolo = :id_ruolo');
            $stmt->execute(['id_ruolo' => $primaryRoleId]);
            $primary = $stmt->fetch();
            if ($primary) {
                $roles[(int) $primary['id_ruolo']] = $primary;
            }
        }

        $sql = <<<SQL
        SELECT r.id_ruolo, r.code, r.label
        FROM auth_account_ruoli ar
        INNER JOIN cfg_auth_ruoli r ON r.id_ruolo = ar.id_ruolo
        WHERE ar.id_account = :id_account
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id_account' => $accountId]);
        while ($row = $stmt->fetch()) {
            $roles[(int) $row['id_ruolo']] = $row;
        }

        return array_values($roles);
    }

    public function getPermissionsForRoles(array $roleIds): array
    {
        if ($roleIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($roleIds), '?'));
        $sql = <<<SQL
        SELECT DISTINCT p.id_permesso, p.code, p.label
        FROM auth_ruolo_permesso rp
        INNER JOIN cfg_auth_permessi p ON p.id_permesso = rp.id_permesso
        WHERE rp.id_ruolo IN ({$placeholders})
        ORDER BY p.code
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($roleIds);

        return $stmt->fetchAll() ?: [];
    }

    public function updateLastLogin(int $accountId): void
    {
        $stmt = $this->pdo->prepare('UPDATE auth_accounts SET last_login = NOW() WHERE id_account = :id');
        $stmt->execute(['id' => $accountId]);
    }
}
