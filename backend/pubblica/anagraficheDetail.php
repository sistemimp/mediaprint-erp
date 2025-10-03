<?php
use MediaPrint\Backend\Cors;
require __DIR__ . '/../bootstrap.php';

use MediaPrint\Repo\AnagraficheRepository;
use MediaPrint\Service\AnagraficheService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'GET') {
    header('Allow: GET, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $service = new AnagraficheService(
        new AnagraficheRepository(Database::getConnection())
    );

    $result = $service->detail($_GET);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
