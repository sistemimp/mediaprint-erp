<?php
declare(strict_types=1);

namespace MediaPrint\Backend;

final class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $isAllowed = self::isAllowedOrigin(is_string($origin) ? $origin : '');

        if ($isAllowed) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true'); // se usi cookie/sessione
        }

        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Access-Token, X-Requested-With, Accept, Cache-Control, Pragma');
        header('Access-Control-Max-Age: 86400');
        header('Vary: Origin');

        // Se è una preflight OPTIONS, rispondi subito
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private static function isAllowedOrigin(string $origin): bool
    {
        if ($origin === '') {
            return false;
        }

        $allowedOrigins = self::resolveAllowedOrigins();
        if (in_array($origin, $allowedOrigins, true)) {
            return true;
        }

        $parts = parse_url($origin);
        $scheme = isset($parts['scheme']) ? strtolower((string) $parts['scheme']) : '';
        $host = isset($parts['host']) ? strtolower((string) $parts['host']) : '';

        return $scheme === 'http' && ($host === 'localhost' || $host === '127.0.0.1');
    }

    /**
     * @return list<string>
     */
    private static function resolveAllowedOrigins(): array
    {
        $defaults = [
            'https://gestionale.mediaprint.it',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ];

        $fromEnv = getenv('CORS_ALLOWED_ORIGINS');
        if ($fromEnv === false || trim($fromEnv) === '') {
            return $defaults;
        }

        $items = preg_split('/[\s,;]+/', (string) $fromEnv) ?: [];
        $normalized = [];
        foreach ($items as $item) {
            $candidate = trim($item);
            if ($candidate !== '') {
                $normalized[] = $candidate;
            }
        }

        return $normalized === [] ? $defaults : array_values(array_unique($normalized));
    }
}
