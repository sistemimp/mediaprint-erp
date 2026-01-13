<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Repo\ConfigRepository;
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
$auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prod.read']);

        $repo = new ConfigRepository(Database::getConnection());
    $items = $repo->listNaturaIva();
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

