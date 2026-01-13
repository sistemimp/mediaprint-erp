<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Service\PaymentTerms;

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
    AuthGuard::requirePermissions($auth, ['anag.read', 'fatt.read']);

        $pdo = Database::getConnection();
    $items = PaymentTerms::all($pdo);
    HttpResponse::json(['items' => $items], 200);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
