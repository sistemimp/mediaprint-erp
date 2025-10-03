<?php
declare(strict_types=1);

namespace MediaPrint\Backend;

final class SessionManager
{
    private const DEFAULT_COOKIE_NAME = 'MEDIAPRINTSESSID';
    private const DEFAULT_SAMESITE = 'Lax';

    public static function ensureStarted(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $cookieName = getenv('SESSION_COOKIE_NAME') ?: self::DEFAULT_COOKIE_NAME;
        $lifetime = (int) (getenv('SESSION_COOKIE_LIFETIME') ?: 0);
        $sameSite = self::normalizeSameSite((string) (getenv('SESSION_COOKIE_SAMESITE') ?: self::DEFAULT_SAMESITE));
        $secure = self::isSecureRequest();
        $domain = (string) (getenv('SESSION_COOKIE_DOMAIN') ?: '');

        if (!headers_sent()) {
            session_name($cookieName);
            session_set_cookie_params([
                'lifetime' => $lifetime,
                'path' => '/',
                'domain' => $domain,
                'secure' => $secure,
                'httponly' => true,
                'samesite' => $sameSite,
            ]);
        }

        session_start();
    }

    public static function regenerate(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }

        session_regenerate_id(true);
    }

    public static function persistAuthState(array $authPayload): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }

        $_SESSION['auth'] = [
            'token' => $authPayload['token'] ?? null,
            'user' => $authPayload['user'] ?? null,
            'issued_at' => time(),
        ];
    }

    private static function isSecureRequest(): bool
    {
        if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
            return true;
        }

        if (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443) {
            return true;
        }

        return filter_var(getenv('SESSION_COOKIE_SECURE') ?: false, FILTER_VALIDATE_BOOLEAN);
    }

    private static function normalizeSameSite(string $value): string
    {
        $normalized = ucfirst(strtolower($value));
        return in_array($normalized, ['Lax', 'Strict', 'None'], true) ? $normalized : self::DEFAULT_SAMESITE;
    }
}
