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
    $id = isset($_GET['id']) ? (int) $_GET['id'] : (isset($_GET['id_pacchetto']) ? (int) $_GET['id_pacchetto'] : 0);
    $service = new PacchettiService(new PacchettiRepository(Database::getConnection()));
    $result = $service->detail(['id' => $id]);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = $exception->getCode();
    if ($code < 400 || $code >= 600) { $code = 422; }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
