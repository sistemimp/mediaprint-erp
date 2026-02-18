<?php
declare(strict_types=1);

namespace MediaPrint\Backend;

final class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $isAllowed = false;
        if (is_string($origin) && $origin !== '') {
            $allowedOrigins = [
                'https://gestionale.mediaprint.it',
            ];
            if (in_array($origin, $allowedOrigins, true)) {
                $isAllowed = true;
            } else {
                $parts = parse_url($origin);
                $scheme = isset($parts['scheme']) ? strtolower((string) $parts['scheme']) : '';
                $host = isset($parts['host']) ? strtolower((string) $parts['host']) : '';
                if ($scheme === 'http' && ($host === 'localhost' || $host === '127.0.0.1')) {
                    $isAllowed = true;
                }
            }
        }

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
}
