<?php
declare(strict_types=1);

namespace MediaPrint\Backend;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;

final class AuthGuard
{
    /**
     * @return array<string, mixed>
     */
    public static function requireAuth(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if ($header === '' || !is_string($header)) {
            $header = $_SERVER['HTTP_X_AUTHORIZATION'] ?? ($_SERVER['HTTP_X_ACCESS_TOKEN'] ?? '');
        }
        if ($header === '' || !is_string($header)) {
            $headers = null;
            if (function_exists('getallheaders')) {
                $headers = getallheaders();
            } elseif (function_exists('apache_request_headers')) {
                $headers = apache_request_headers();
            }
            if (is_array($headers)) {
                foreach ($headers as $name => $value) {
                    $key = strtolower((string) $name);
                    if (in_array($key, ['authorization', 'x-authorization', 'x-access-token'], true)) {
                        $header = (string) $value;
                        break;
                    }
                }
            }
        }
        if (is_string($header) && stripos($header, 'Bearer ') !== 0) {
            $trimmed = trim($header);
            if ($trimmed !== '' && substr_count($trimmed, '.') === 2) {
                $header = 'Bearer ' . $trimmed;
            }
        }
        if (!is_string($header) || $header === '' || stripos($header, 'Bearer ') !== 0) {
            throw new RuntimeException('Token mancante o non valido per header autorization.', 401);
        }

        $token = trim(substr($header, 7));
        if ($token === '') {
            throw new RuntimeException('Token mancante o non valido.', 401);
        }

        $secret = getenv('JWT_SECRET');
        if (!$secret) {
            throw new RuntimeException('JWT_SECRET non configurato.', 500);
        }
        try {
            $payload = JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable $exception) {
            throw new RuntimeException('Token non valido o scaduto.', 401);
        }
        $data = json_decode(json_encode($payload), true);
        if (!is_array($data)) {
            throw new RuntimeException('Token non valido.', 401);
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<string> $permissions
     */
    public static function requirePermissions(array $payload, array $permissions): void
    {
        if ($permissions === []) {
            return;
        }
        $accountType = strtolower((string) ($payload['account_type'] ?? ''));
        if ($accountType === 'cliente') {
            return;
        }
        $granted = $payload['permissions'] ?? [];
        if (!is_array($granted)) {
            $granted = [];
        }
        foreach ($permissions as $permission) {
            if (in_array($permission, $granted, true)) {
                return;
            }
        }
        throw new RuntimeException('Permesso mancante.', 403);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function requireAdmin(array $payload): void
    {
        $roles = $payload['roles'] ?? [];
        if (!is_array($roles)) {
            $roles = [];
        }
        foreach ($roles as $role) {
            if (is_string($role) && strtolower($role) === 'admin') {
                return;
            }
        }
        throw new RuntimeException('Accesso riservato agli amministratori.', 403);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function getAccountId(array $payload): int
    {
        return isset($payload['sub']) ? (int) $payload['sub'] : 0;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function getAccountType(array $payload): string
    {
        return strtolower((string) ($payload['account_type'] ?? ''));
    }
}
