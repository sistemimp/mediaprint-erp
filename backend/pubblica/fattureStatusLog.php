<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'GET') {
    header('Allow: GET, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        throw new RuntimeException('ID fattura mancante o non valido.', 422);
    }

    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
    $limit = max(1, min($limit, 200));
    $offset = max(0, $offset);

    $repo = new FattureRepository(Database::getConnection());
    $items = $repo->listStatusLog($id, $limit, $offset);

    HttpResponse::json(
        [
            'items' => $items,
            'meta' => [
                'limit' => $limit,
                'offset' => $offset,
                'count' => count($items),
            ],
        ],
        200,
    );
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

