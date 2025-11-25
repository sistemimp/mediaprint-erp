<?php

namespace MediaPrint\Backend;

final class HttpResponse
{
    public static function json(array $data, int $status = 200): void
    {
        $payload = self::sanitizePayload($data);
        $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            $status = 500;
            $fallback = [
                'message' => 'Impossibile serializzare la risposta JSON.',
                'error' => json_last_error_msg(),
            ];
            $encoded = json_encode($fallback, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{"message":"Impossibile serializzare la risposta JSON."}';
        }

        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo $encoded;
        exit;
    }

    public static function error(string $message, int $status = 400, array $extra = []): void
    {
        $payload = array_merge(['message' => $message], $extra);
        self::json($payload, $status);
    }

    /**
     * @param mixed $value
     * @return mixed
     */
    private static function sanitizePayload($value)
    {
        if (is_array($value)) {
            $result = [];
            foreach ($value as $key => $item) {
                $result[$key] = self::sanitizePayload($item);
            }
            return $result;
        }

        if (is_object($value)) {
            if ($value instanceof \JsonSerializable) {
                return self::sanitizePayload($value->jsonSerialize());
            }
            if (method_exists($value, '__toString')) {
                return self::sanitizePayload((string) $value);
            }
            return self::sanitizePayload(get_object_vars($value));
        }

        if (is_string($value)) {
            if ($value === '') {
                return '';
            }
            if (!self::isUtf8($value)) {
                if (function_exists('mb_convert_encoding')) {
                    $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
                } elseif (function_exists('iconv')) {
                    $converted = @iconv('Windows-1252', 'UTF-8//IGNORE', $value);
                    if ($converted !== false) {
                        $value = $converted;
                    }
                } else {
                    $value = utf8_encode($value);
                }
            }
            $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value);
            return $clean ?? '';
        }

        return $value;
    }

    private static function isUtf8(string $value): bool
    {
        return preg_match('//u', $value) === 1;
    }
}
