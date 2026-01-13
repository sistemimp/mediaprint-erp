<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\HttpResponse;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Access-Token');

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    if ($method === 'GET') {
        AuthGuard::requirePermissions($auth, ['prev.read']);
    } else {
        AuthGuard::requirePermissions($auth, ['prev.write']);
    }

    $dataDir = __DIR__ . '/../data';
    $dataFile = $dataDir . '/preventivi_status_log.json';
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0777, true);
    }
    if (!file_exists($dataFile)) {
        file_put_contents($dataFile, json_encode([]), LOCK_EX);
    }

    $readJson = static function (string $path): array {
        $fp = @fopen($path, 'r');
        if (!$fp) {
            return [];
        }
        @flock($fp, LOCK_SH);
        $raw = stream_get_contents($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);
        if ($raw === false) {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    };

    $writeJson = static function (string $path, array $data): bool {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return (bool) file_put_contents($path, $json, LOCK_EX);
    };

    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (string) $_GET['id'] : '';
        if ($id === '') {
            HttpResponse::error('Parametro id mancante.', 422);
        }

        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
        $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
        $limit = max(1, min($limit, 500));
        $offset = max(0, $offset);

        $store = $readJson($dataFile);
        $items = isset($store[$id]) && is_array($store[$id]) ? $store[$id] : [];

        usort($items, static function (array $a, array $b): int {
            $ta = isset($a['at']) ? strtotime((string) $a['at']) : 0;
            $tb = isset($b['at']) ? strtotime((string) $b['at']) : 0;
            if ($ta === $tb) {
                return 0;
            }
            return ($ta > $tb) ? -1 : 1;
        });

        $itemsPage = array_slice($items, $offset, $limit);

        HttpResponse::json([
            'items' => $itemsPage,
            'meta' => [
                'total' => count($items),
                'limit' => $limit,
                'offset' => $offset,
                'count' => count($itemsPage),
            ],
        ]);
    }

    $input = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($input)) {
        HttpResponse::error('Body non valido.', 422);
    }

    $id = isset($input['id']) ? (string) $input['id'] : '';
    if ($id === '') {
        HttpResponse::error('Campo id mancante.', 422);
    }

    $event = [
        'id' => $id,
        'at' => isset($input['at']) ? $input['at'] : date('c'),
        'from_status' => $input['from_status'] ?? null,
        'to_status' => $input['to_status'] ?? null,
        'note' => $input['note'] ?? null,
        'description' => $input['description'] ?? null,
        'context' => $input['context'] ?? null,
        'user_id' => $input['user_id'] ?? null,
        'user_name' => $input['user_name'] ?? null,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];

    $store = $readJson($dataFile);
    if (!isset($store[$id]) || !is_array($store[$id])) {
        $store[$id] = [];
    }

    $store[$id][] = $event;
    if (count($store[$id]) > 200) {
        $store[$id] = array_slice($store[$id], -200);
    }

    $writeJson($dataFile, $store);

    HttpResponse::json(['ok' => true, 'data' => $event], 201);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
