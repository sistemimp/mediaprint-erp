<?php
declare(strict_types=1);

require __DIR__ . '/../../bootstrap.php';

use MediaPrint\Repo\ProdottiRepository;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;

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
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        // Per account cliente la lista catalogo interna non e' esposta.
        HttpResponse::json(['items' => []], 200);
        return;
    }

    $repo = new ProdottiRepository(Database::getConnection());
    $idCategoria = null;
    if (isset($_GET['id_categoria'])) {
        $tmp = (int) $_GET['id_categoria'];
        // id_categoria=0 viene trattato come filtro assente.
        if ($tmp > 0) { $idCategoria = $tmp; }
    }
    $search = isset($_GET['q']) ? (string) $_GET['q'] : null;
    $items = $repo->listProdotti($idCategoria, $search, true);
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
