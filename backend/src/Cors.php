<?php
declare(strict_types=1);

namespace MediaPrint\Backend;

final class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = [
            'http://localhost:3000',
            'https://gestionale.mediaprint.it',
        ];

        if ($origin && in_array($origin, $allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true'); // se usi cookie/sessione
        }

        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Pragma');
        header('Access-Control-Max-Age: 86400');
        header('Vary: Origin');

        // Se è una preflight OPTIONS, rispondi subito
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
