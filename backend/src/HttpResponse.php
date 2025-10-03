<?php

namespace MediaPrint\Backend;

final class HttpResponse
{
    public static function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $message, int $status = 400, array $extra = []): void
    {
        $payload = array_merge(['message' => $message], $extra);
        self::json($payload, $status);
    }
}
