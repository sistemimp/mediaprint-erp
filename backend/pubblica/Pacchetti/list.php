<?php
declare(strict_types=1);

require __DIR__ . '/../../bootstrap.php';

use MediaPrint\Repo\PacchettiRepository;
use MediaPrint\Service\PacchettiService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    header('Allow: GET, OPTIONS');
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'GET') {
    header('Allow: GET, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $q = isset($_GET['q']) ? (string) $_GET['q'] : null;
    $onlyActive = isset($_GET['only_active']) ? $_GET['only_active'] : null;
    $service = new PacchettiService(new PacchettiRepository(Database::getConnection()));
    $result = $service->list(['q' => $q, 'only_active' => $onlyActive]);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = $exception->getCode();
    if ($code < 400 || $code >= 600) { $code = 422; }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
