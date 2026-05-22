<?php
namespace MediaPrint\Service;

use DateTimeImmutable;
use Firebase\JWT\JWT;
use MediaPrint\Repo\AuthRepository;
use RuntimeException;

final class AuthService
{
    private array $allowedAccountTypes;

    public function __construct(private readonly AuthRepository $repository)
    {
        $allowed = getenv('ALLOW_ACCOUNT_TYPES') ?: 'admin,operatore,cliente';
        $parts = array_map(static fn(string $value): string => strtolower(trim($value)), explode(',', $allowed));
        $this->allowedAccountTypes = array_values(array_filter($parts));
    }

    public function login(string $identifier, string $password): array
    {
        $identifier = trim($identifier);
        if ($identifier === '' || $password === '') {
            throw new RuntimeException('Email/username e password sono obbligatori.');
        }

        $account = $this->repository->findActiveAccount($identifier);
        if ($account === null) {
            throw new RuntimeException('Credenziali non valide.');
        }

        if ($this->allowedAccountTypes !== [] && !in_array(strtolower((string) $account['account_type']), $this->allowedAccountTypes, true)) {
            throw new RuntimeException('Accesso non autorizzato per il tipo di account.');
        }

        if (!password_verify($password, (string) $account['password_hash'])) {
            throw new RuntimeException('Credenziali non valide.');
        }

        if ((int) ($account['has_mfa'] ?? 0) === 1) {
            return [
                'mfa_required' => true,
                'account' => [
                    'id_account' => (int) $account['id_account'],
                    'username' => $account['username'],
                    'mfa_method' => $account['mfa_method'] ?? 'otp',
                ],
                'mfa_otpauth_uri' => $this->buildTotpUri($account),
            ];
        }

        return $this->buildLoginResult($account);
    }

    private function buildLoginResult(array $account): array
    {
        $roles = $this->repository->getAccountRoles((int) $account['id_account'], isset($account['id_ruolo']) ? (int) $account['id_ruolo'] : null);
        $roleIds = array_map(static fn(array $role): int => (int) $role['id_ruolo'], $roles);
        $permissions = $this->resolveAccountPermissions((int) $account['id_account'], $roleIds);

        $this->repository->updateLastLogin((int) $account['id_account']);

        $token = $this->generateToken($account, $roles, $permissions);

        return [
            'token' => $token,
            'user' => $this->buildUserPayload($account, $roles, $permissions),
        ];
    }

    public function issueTokenForAccountId(int $accountId): array
    {
        $account = $this->repository->findActiveAccountById($accountId);
        if ($account === null) {
            throw new RuntimeException('Account non trovato o disattivato.', 404);
        }
        return $this->buildLoginResult($account);
    }

    public function getUserSnapshot(int $accountId): array
    {
        if ($accountId <= 0) {
            throw new RuntimeException('Account non valido.');
        }

        $account = $this->repository->findActiveAccountById($accountId);
        if ($account === null) {
            throw new RuntimeException('Account non valido o disattivato.', 401);
        }

        if ($this->allowedAccountTypes !== [] && !in_array(strtolower((string) $account['account_type']), $this->allowedAccountTypes, true)) {
            throw new RuntimeException('Accesso non autorizzato per il tipo di account.', 403);
        }

        $roles = $this->repository->getAccountRoles((int) $account['id_account'], isset($account['id_ruolo']) ? (int) $account['id_ruolo'] : null);
        $roleIds = array_map(static fn(array $role): int => (int) $role['id_ruolo'], $roles);
        $permissions = $this->resolveAccountPermissions((int) $account['id_account'], $roleIds);

        $payload = $this->buildUserPayload($account, $roles, $permissions);
        if (strtolower((string) ($account['account_type'] ?? '')) === 'cliente') {
            $payload['id_anagrafica'] = $this->repository->getPrimaryAnagraficaIdForAccount((int) $account['id_account']);
        }

        return $payload;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listPermissions(): array
    {
        return $this->repository->listPermissions();
    }

    private function generateToken(array $account, array $roles, array $permissions): string
    {
        $secret = getenv('JWT_SECRET')?: '04fb222b0c3ba451e9f1b7f72f756f33bc7dc5d9db127275ac40080819c114d63dc2f29de59075a285cd753e9454ed53';
        if (!$secret) {
            throw new RuntimeException('JWT_SECRET non configurato.');
        }

        $issuer = getenv('JWT_ISSUER') ?: 'mediaprint-erp';
        $audience = getenv('JWT_AUDIENCE') ?: 'mediaprint-client';
        $now = new DateTimeImmutable('now');
        // Expire at the end of the login day (server timezone).
        $expires = $now->setTime(23, 59, 59);
        if ($expires === false) {
            throw new RuntimeException('Impossibile calcolare la scadenza del token.');
        }

        $roleCodes = array_map(static fn(array $role): string => $role['code'], $roles);
        $permissionCodes = array_map(static fn(array $permission): string => $permission['code'], $permissions);

        $payload = [
            'iss' => $issuer,
            'aud' => $audience,
            'iat' => $now->getTimestamp(),
            'nbf' => $now->getTimestamp(),
            'exp' => $expires->getTimestamp(),
            'sub' => (int) $account['id_account'],
            'account_type' => $account['account_type'],
            'username' => $account['username'],
            'email' => $account['email'],
            'roles' => $roleCodes,
            'permissions' => $permissionCodes,
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    /**
     * @param list<int> $roleIds
     * @return list<array<string, mixed>>
     */
    private function resolveAccountPermissions(int $accountId, array $roleIds): array
    {
        if ($this->repository->hasAccountPermissions($accountId)) {
            return $this->repository->getAccountPermissions($accountId);
        }

        return $this->repository->getPermissionsForRoles($roleIds);
    }

    private function buildTotpUri(array $account): ?string
    {
        $secret = trim((string) ($account['mfa_secret'] ?? ''));
        if ($secret === '') {
            return null;
        }
        $issuer = urlencode(getenv('MFA_ISSUER') ?: 'MediaPrint ERP');
        $label = urlencode(sprintf('MediaPrint ERP:%s', $account['username']));
        $digits = 6;
        $period = 30;
        return sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d',
            $label,
            $secret,
            $issuer,
            $digits,
            $period
        );
    }

    private function buildUserPayload(array $account, array $roles, array $permissions): array
    {
        return [
            'id' => (int) $account['id_account'],
            'accountType' => $account['account_type'],
            'username' => $account['username'],
            'email' => $account['email'],
            'mustChangePassword' => (bool) $account['must_change_pwd'],
            'hasMfa' => (bool) $account['has_mfa'],
            'avatarPath' => isset($account['avatar_path']) && $account['avatar_path'] !== '' ? $account['avatar_path'] : null,
            'roles' => array_map(
                static fn(array $role): array => [
                    'id' => (int) $role['id_ruolo'],
                    'code' => $role['code'],
                    'label' => $role['label'],
                ],
                $roles
            ),
            'permissions' => array_map(
                static fn(array $permission): array => [
                    'id' => (int) $permission['id_permesso'],
                    'code' => $permission['code'],
                    'label' => $permission['label'],
                ],
                $permissions
            ),
            'mfa_method' => $account['mfa_method'] ?? 'none',
            'lastLogin' => $account['last_login'],
        ];
    }
}
