<?php
declare(strict_types=1);

require __DIR__ . '/../../bootstrap.php';

use MediaPrint\Repo\PacchettiRepository;
use MediaPrint\Service\PacchettiService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;

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
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['pack.read']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        // Risposta vuota ma shape invariata per evitare branch speciali nel frontend.
        HttpResponse::json(['data' => null, 'righe' => []], 200);
        return;
    }

    $id = isset($_GET['id']) ? (int) $_GET['id'] : (isset($_GET['id_pacchetto']) ? (int) $_GET['id_pacchetto'] : 0);
    // Supporta sia parametro nuovo (id) sia alias storico (id_pacchetto).
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
