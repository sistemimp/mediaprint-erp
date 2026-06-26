<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\ClienteFondiRepository;

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
    AuthGuard::requirePermissions($auth, ['pay.read']);

    $idFondo = isset($_GET['id_fondo']) ? (int) $_GET['id_fondo'] : 0;
    if ($idFondo <= 0) {
        throw new RuntimeException('ID fondo non valido.', 422);
    }
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 200;

    $repo = new ClienteFondiRepository(Database::getConnection());
    $fondo = $repo->getFondo($idFondo);
    if ($fondo === null) {
        throw new RuntimeException('Fondo non trovato.', 404);
    }

    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        if (!in_array((int) $fondo['id_anagrafica'], $allowed, true)) {
            throw new RuntimeException('Fondo non trovato.', 404);
        }
    }

    $items = $repo->listMovimenti($idFondo, $limit);
    HttpResponse::json(['fondo' => $fondo, 'items' => $items], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

