<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
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
$auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['fatt.read']);

        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        throw new RuntimeException('ID fattura mancante o non valido.', 422);
    }

    $repo = new FattureRepository(Database::getConnection());
    $result = $repo->listPagamenti($id);

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

