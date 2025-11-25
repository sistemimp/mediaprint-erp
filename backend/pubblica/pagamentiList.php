<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PagamentiRepository;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'GET') {
    header('Allow: GET, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $filters = [
        'q' => isset($_GET['q']) ? trim((string) $_GET['q']) : null,
        'id_anagrafica' => isset($_GET['id_anagrafica']) ? (int) $_GET['id_anagrafica'] : null,
        'date_from' => isset($_GET['date_from']) ? trim((string) $_GET['date_from']) : null,
        'date_to' => isset($_GET['date_to']) ? trim((string) $_GET['date_to']) : null,
    ];

    $repo = new PagamentiRepository(Database::getConnection());
    $items = $repo->listPagamenti($filters);

    HttpResponse::json(['items' => $items], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

