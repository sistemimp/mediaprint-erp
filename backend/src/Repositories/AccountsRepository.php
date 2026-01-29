<?php
declare(strict_types=1);

namespace MediaPrint\Repo;

use PDO;

final class AccountsRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @return array{data: list<array<string, mixed>>, total: int}
     */
    public function search(array $filters): array
    {
        $sql = <<<'SQL'
            SELECT
                a.id_account,
                a.account_type,
                a.username,
                a.email,
                a.id_ruolo,
                a.id_contatto,
                a.is_active,
                a.must_change_pwd,
                a.has_mfa,
                a.avatar_path,
                a.last_login,
                a.created_at,
                a.updated_at,
                r.code AS role_code,
                r.label AS role_label
            FROM auth_accounts a
            LEFT JOIN cfg_auth_ruoli r ON r.id_ruolo = a.id_ruolo
        SQL;

        $where = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[] = '(a.username LIKE :needle OR a.email LIKE :needle)';
            $params[':needle'] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['account_type'])) {
            $where[] = 'a.account_type = :account_type';
            $params[':account_type'] = $filters['account_type'];
        }

        if (array_key_exists('is_active', $filters) && $filters['is_active'] !== null) {
            $where[] = 'a.is_active = :is_active';
            $params[':is_active'] = (int) $filters['is_active'];
        }

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sortable = [
            'username' => 'a.username',
            'email' => 'a.email',
            'account_type' => 'a.account_type',
            'role' => 'r.label',
            'last_login' => 'a.last_login',
            'created_at' => 'a.created_at',
            'is_active' => 'a.is_active',
        ];

        $sortBy = $sortable[$filters['sort_by'] ?? 'username'] ?? 'a.username';
        $direction = strtolower((string) ($filters['sort_direction'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';

        $sql .= " ORDER BY {$sortBy} {$direction}";

        $page = max((int) ($filters['page'] ?? 1), 1);
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        $offset = ($page - 1) * $perPage;

        $sql .= ' LIMIT ' . (int) $perPage . ' OFFSET ' . (int) $offset;

        $statement = $this->pdo->prepare($sql);
        foreach ($params as $placeholder => $value) {
            if ($placeholder === ':is_active') {
                $statement->bindValue($placeholder, $value, PDO::PARAM_INT);
            } else {
                $statement->bindValue($placeholder, $value, PDO::PARAM_STR);
            }
        }
        $statement->execute();
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $countSql = 'SELECT COUNT(*) FROM auth_accounts a';
        if ($where) {
            $countSql .= ' WHERE ' . implode(' AND ', $where);
        }
        $countStatement = $this->pdo->prepare($countSql);
        foreach ($params as $placeholder => $value) {
            if ($placeholder === ':is_active') {
                $countStatement->bindValue($placeholder, $value, PDO::PARAM_INT);
            } else {
                $countStatement->bindValue($placeholder, $value, PDO::PARAM_STR);
            }
        }
        $countStatement->execute();
        $total = (int) $countStatement->fetchColumn();

        return [
            'data' => $rows,
            'total' => $total,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listRoles(): array
    {
        $stmt = $this->pdo->query('SELECT id_ruolo, code, label FROM cfg_auth_ruoli ORDER BY label ASC');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listPermissionsCatalog(): array
    {
        $stmt = $this->pdo->query('SELECT id_permesso, code, label, attivo FROM cfg_auth_permessi ORDER BY code ASC');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @param list<int> $roleIds
     * @return list<array<string, mixed>>
     */
    public function listPermissionsForRoles(array $roleIds): array
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
              AND p.attivo = 1
            ORDER BY p.code
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($roleIds);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return list<array{id_permesso:int,is_allowed:int}>
     */
    public function listAccountPermissions(int $accountId): array
    {
        $stmt = $this->pdo->prepare('SELECT id_permesso, is_allowed FROM auth_account_permessi WHERE id_account = :id');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param list<int> $catalogIds
     * @param list<int> $allowedIds
     */
    public function replaceAccountPermissions(int $accountId, array $catalogIds, array $allowedIds): void
    {
        $delete = $this->pdo->prepare('DELETE FROM auth_account_permessi WHERE id_account = :id');
        $delete->bindValue(':id', $accountId, PDO::PARAM_INT);
        $delete->execute();

        if ($catalogIds === []) {
            return;
        }

        $allowed = array_flip($allowedIds);
        $insert = $this->pdo->prepare(
            'INSERT INTO auth_account_permessi (id_account, id_permesso, is_allowed) VALUES (:account, :permesso, :allowed)'
        );

        foreach ($catalogIds as $permessoId) {
            $insert->bindValue(':account', $accountId, PDO::PARAM_INT);
            $insert->bindValue(':permesso', $permessoId, PDO::PARAM_INT);
            $insert->bindValue(':allowed', isset($allowed[$permessoId]) ? 1 : 0, PDO::PARAM_INT);
            $insert->execute();
        }
    }

    public function accountExists(int $accountId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM auth_accounts WHERE id_account = :id LIMIT 1');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getAccountDetail(int $accountId): ?array
    {
        $sql = <<<'SQL'
            SELECT
                a.id_account,
                a.account_type,
                a.username,
                a.email,
                a.id_ruolo,
                a.id_contatto,
                a.is_active,
                a.must_change_pwd,
                a.has_mfa,
                a.avatar_path,
                a.last_login,
                a.created_at,
                a.updated_at,
                r.code AS role_code,
                r.label AS role_label
            FROM auth_accounts a
            LEFT JOIN cfg_auth_ruoli r ON r.id_ruolo = a.id_ruolo
            WHERE a.id_account = :id
            LIMIT 1
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * @return array{account_type:string,id_contatto:?int}|null
     */
    public function getAccountMeta(int $accountId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT account_type, id_contatto FROM auth_accounts WHERE id_account = :id LIMIT 1');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        return [
            'account_type' => (string) ($row['account_type'] ?? ''),
            'id_contatto' => isset($row['id_contatto']) ? (int) $row['id_contatto'] : null,
        ];
    }

    /**
     * @return list<array{id_contatto:int,is_primary:int}>
     */
    public function listAccountContatti(int $accountId): array
    {
        $stmt = $this->pdo->prepare('SELECT id_contatto, is_primary FROM auth_account_contatti WHERE id_account = :id');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @return array{username:string,email:?string,must_change_pwd:int}|null
     */
    public function getAccountEmail(int $accountId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT username, email, must_change_pwd FROM auth_accounts WHERE id_account = :id LIMIT 1');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        return [
            'username' => (string) ($row['username'] ?? ''),
            'email' => isset($row['email']) ? (string) $row['email'] : null,
            'must_change_pwd' => isset($row['must_change_pwd']) ? (int) $row['must_change_pwd'] : 0,
        ];
    }

    /**
     * @return array{id_temp:int,temp_password:string,expires_at:string}|null
     */
    public function getActiveTempPassword(int $accountId): ?array
    {
        $sql = <<<SQL
            SELECT id_temp, temp_password, expires_at
            FROM auth_account_temp_passwords
            WHERE id_account = :id
              AND used_at IS NULL
              AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        return [
            'id_temp' => (int) $row['id_temp'],
            'temp_password' => (string) $row['temp_password'],
            'expires_at' => (string) $row['expires_at'],
        ];
    }

    /**
     * @return int id_temp
     */
    public function createTempPassword(int $accountId, string $tempPassword, string $expiresAt): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO auth_account_temp_passwords (id_account, temp_password, expires_at) VALUES (:id, :pwd, :exp)');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->bindValue(':pwd', $tempPassword, PDO::PARAM_STR);
        $stmt->bindValue(':exp', $expiresAt, PDO::PARAM_STR);
        $stmt->execute();
        return (int) $this->pdo->lastInsertId();
    }

    public function logAccountEmail(int $accountId, string $email, string $type, ?int $tempId): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO auth_account_email_log (id_account, email, email_type, id_temp) VALUES (:id, :email, :type, :temp)');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->bindValue(':email', $email, PDO::PARAM_STR);
        $stmt->bindValue(':type', $type, PDO::PARAM_STR);
        if ($tempId === null) {
            $stmt->bindValue(':temp', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':temp', $tempId, PDO::PARAM_INT);
        }
        $stmt->execute();
    }

    public function markTempPasswordsUsed(int $accountId): void
    {
        $stmt = $this->pdo->prepare('UPDATE auth_account_temp_passwords SET used_at = NOW() WHERE id_account = :id AND used_at IS NULL');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * @param list<int> $contattiIds
     */
    public function replaceAccountContatti(int $accountId, array $contattiIds, ?int $primaryId): void
    {
        $delete = $this->pdo->prepare('DELETE FROM auth_account_contatti WHERE id_account = :id');
        $delete->bindValue(':id', $accountId, PDO::PARAM_INT);
        $delete->execute();

        if ($contattiIds === []) {
            return;
        }

        $insert = $this->pdo->prepare('INSERT INTO auth_account_contatti (id_account, id_contatto, is_primary) VALUES (:account, :contatto, :primary)');
        foreach ($contattiIds as $contattoId) {
            $insert->bindValue(':account', $accountId, PDO::PARAM_INT);
            $insert->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
            $insert->bindValue(':primary', ($primaryId !== null && $contattoId === $primaryId) ? 1 : 0, PDO::PARAM_INT);
            $insert->execute();
        }
    }

    public function usernameExists(string $username, ?int $excludeId = null): bool
    {
        $sql = 'SELECT 1 FROM auth_accounts WHERE username = :username';
        if ($excludeId !== null) {
            $sql .= ' AND id_account <> :exclude_id';
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':username', $username, PDO::PARAM_STR);
        if ($excludeId !== null) {
            $stmt->bindValue(':exclude_id', $excludeId, PDO::PARAM_INT);
        }
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    public function roleExists(int $roleId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM cfg_auth_ruoli WHERE id_ruolo = :id LIMIT 1');
        $stmt->bindValue(':id', $roleId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    /**
     * @return int id_account
     */
    public function createAccount(array $data): int
    {
        $sql = <<<'SQL'
            INSERT INTO auth_accounts (
                account_type,
                username,
                email,
                password_hash,
                id_ruolo,
                id_contatto,
                is_active,
                must_change_pwd,
                has_mfa,
                mfa_secret
            )
            VALUES (
                :account_type,
                :username,
                :email,
                :password_hash,
                :id_ruolo,
                :id_contatto,
                :is_active,
                :must_change_pwd,
                :has_mfa,
                :mfa_secret
            )
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':account_type', $data['account_type'], PDO::PARAM_STR);
        $stmt->bindValue(':username', $data['username'], PDO::PARAM_STR);
        $stmt->bindValue(':email', $data['email'], $data['email'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':password_hash', $data['password_hash'], PDO::PARAM_STR);
        $stmt->bindValue(':id_ruolo', $data['id_ruolo'], PDO::PARAM_INT);
        $stmt->bindValue(':id_contatto', $data['id_contatto'], $data['id_contatto'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':is_active', $data['is_active'], PDO::PARAM_INT);
        $stmt->bindValue(':must_change_pwd', $data['must_change_pwd'], PDO::PARAM_INT);
        $stmt->bindValue(':has_mfa', $data['has_mfa'], PDO::PARAM_INT);
        $stmt->bindValue(':mfa_secret', $data['mfa_secret'], $data['mfa_secret'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->execute();

        return (int) $this->pdo->lastInsertId();
    }

    public function updateAccount(int $accountId, array $data): void
    {
        $columns = [];
        $params = [':id' => $accountId];
        $types = [':id' => PDO::PARAM_INT];

        $map = [
            'account_type' => PDO::PARAM_STR,
            'username' => PDO::PARAM_STR,
            'email' => PDO::PARAM_STR,
            'id_ruolo' => PDO::PARAM_INT,
            'id_contatto' => PDO::PARAM_INT,
            'is_active' => PDO::PARAM_INT,
            'must_change_pwd' => PDO::PARAM_INT,
            'has_mfa' => PDO::PARAM_INT,
            'avatar_path' => PDO::PARAM_STR,
        ];

        foreach ($map as $key => $type) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $columns[] = "{$key} = :{$key}";
            $value = $data[$key];
            if ($value === null || $value === '') {
                $params[":{$key}"] = null;
                $types[":{$key}"] = PDO::PARAM_NULL;
            } else {
                $params[":{$key}"] = $type === PDO::PARAM_INT ? (int) $value : (string) $value;
                $types[":{$key}"] = $type;
            }
        }

        if ($columns === []) {
            return;
        }

        $sql = 'UPDATE auth_accounts SET ' . implode(', ', $columns) . ' WHERE id_account = :id';
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $ph => $val) {
            $stmt->bindValue($ph, $val, $types[$ph] ?? PDO::PARAM_STR);
        }
        $stmt->execute();
    }

    public function setAccountActive(int $accountId, int $isActive): void
    {
        $stmt = $this->pdo->prepare('UPDATE auth_accounts SET is_active = :active WHERE id_account = :id');
        $stmt->bindValue(':active', $isActive, PDO::PARAM_INT);
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
    }

    public function updatePassword(int $accountId, string $passwordHash, int $mustChange): void
    {
        $stmt = $this->pdo->prepare('UPDATE auth_accounts SET password_hash = :hash, must_change_pwd = :must_change WHERE id_account = :id');
        $stmt->bindValue(':hash', $passwordHash, PDO::PARAM_STR);
        $stmt->bindValue(':must_change', $mustChange, PDO::PARAM_INT);
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
    }

    public function getAccountAvatarPath(int $accountId): ?string
    {
        $stmt = $this->pdo->prepare('SELECT avatar_path FROM auth_accounts WHERE id_account = :id LIMIT 1');
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        if ($value === false || $value === null) {
            return null;
        }
        $path = trim((string) $value);
        return $path === '' ? null : $path;
    }

    /**
     * @return list<array{id_anagrafica:int,ragione_sociale:string}>
     */
    public function listActiveAnagrafiche(): array
    {
        $stmt = $this->pdo->query('SELECT id_anagrafica, ragione_sociale FROM tb_anagrafiche WHERE is_active = 1 ORDER BY ragione_sociale ASC');
        return $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    }

    /**
     * @return list<int>
     */
    public function listAccountAnagraficheIds(int $accountId): array
    {
        $sql = <<<SQL
            SELECT DISTINCT ca.id_anagrafica
            FROM auth_account_contatti ac
            INNER JOIN tb_contatti_anagrafiche ca ON ca.id_contatto = ac.id_contatto
            WHERE ac.id_account = :id
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $ids = [];
        foreach ($rows as $row) {
            if (isset($row['id_anagrafica'])) {
                $ids[] = (int) $row['id_anagrafica'];
            }
        }
        return array_values(array_unique(array_filter($ids, static fn(int $id): bool => $id > 0)));
    }

    /**
     * @return list<array{id_anagrafica:int,is_predefinita:int}>
     */
    public function listAccountAnagrafiche(int $accountId): array
    {
        $sql = <<<'SQL'
            SELECT ca.id_anagrafica, ca.is_predefinita
            FROM auth_accounts a
            INNER JOIN tb_contatti_anagrafiche ca ON ca.id_contatto = a.id_contatto
            WHERE a.id_account = :id
        SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $accountId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * @param list<int> $ids
     * @return list<int>
     */
    public function listValidAnagrafiche(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = "SELECT id_anagrafica FROM tb_anagrafiche WHERE is_active = 1 AND id_anagrafica IN ({$placeholders})";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($ids);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map(static fn(array $row): int => (int) $row['id_anagrafica'], $rows);
    }

    /**
     * @param list<int> $anagraficaIds
     */
    public function replaceContattoAnagrafiche(int $contattoId, array $anagraficaIds, int $defaultId): void
    {
        $delete = $this->pdo->prepare('DELETE FROM tb_contatti_anagrafiche WHERE id_contatto = :id');
        $delete->bindValue(':id', $contattoId, PDO::PARAM_INT);
        $delete->execute();

        if ($anagraficaIds === []) {
            return;
        }

        $insert = $this->pdo->prepare('INSERT INTO tb_contatti_anagrafiche (id_contatto, id_anagrafica, is_predefinita) VALUES (:contatto, :anagrafica, :default)');
        foreach ($anagraficaIds as $anagraficaId) {
            $insert->bindValue(':contatto', $contattoId, PDO::PARAM_INT);
            $insert->bindValue(':anagrafica', $anagraficaId, PDO::PARAM_INT);
            $insert->bindValue(':default', $anagraficaId === $defaultId ? 1 : 0, PDO::PARAM_INT);
            $insert->execute();
        }
    }

    /**
     * @param list<int> $anagraficaIds
     * @return list<array<string, mixed>>
     */
    public function listContattiForAnagrafiche(array $anagraficaIds): array
    {
        if ($anagraficaIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($anagraficaIds), '?'));
        $sql = <<<SQL
            SELECT
                sc.id_contatto,
                sc.nome,
                sc.email,
                sc.ruolo,
                a.id_anagrafica,
                a.ragione_sociale
            FROM tb_contatti_anagrafiche ca
            INNER JOIN tb_sedi_contatti sc ON sc.id_contatto = ca.id_contatto
            INNER JOIN tb_anagrafiche a ON a.id_anagrafica = ca.id_anagrafica
            WHERE a.is_active = 1
              AND ca.id_anagrafica IN ({$placeholders})
            ORDER BY a.ragione_sociale ASC, sc.nome ASC
        SQL;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($anagraficaIds);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
