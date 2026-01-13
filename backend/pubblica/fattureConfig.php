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

        $repo = new FattureRepository(Database::getConnection());
    $payload = [
        'sezionali' => $repo->listSezionali(),
        'tipi' => $repo->listTipi(),
        'stati' => $repo->listStati(),
        'metodi_pagamento' => $repo->listMetodiPagamento(),
        'modalita_pagamento' => $repo->listModalitaPagamento(),
    ];

    HttpResponse::json($payload, 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
