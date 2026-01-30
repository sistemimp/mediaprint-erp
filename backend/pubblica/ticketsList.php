<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Repo\TicketsRepository;
use MediaPrint\Service\TicketsService;
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
    AuthGuard::requireAdmin($auth);
    AuthGuard::requirePermissions($auth, ['bug.read']);

    $filters = [
        'q' => isset($_GET['q']) ? (string) $_GET['q'] : null,
        'stato' => isset($_GET['stato']) ? (string) $_GET['stato'] : null,
        'priorita' => isset($_GET['priorita']) ? (string) $_GET['priorita'] : null,
        'assigned_to' => isset($_GET['assigned_to']) ? (int) $_GET['assigned_to'] : null,
        'created_by' => isset($_GET['created_by']) ? (int) $_GET['created_by'] : null,
    ];

    $service = new TicketsService(new TicketsRepository(Database::getConnection()));
    $result = $service->list($filters);

    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
