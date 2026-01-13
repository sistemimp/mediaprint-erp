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
if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prod.create']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    $input = json_decode(file_get_contents('php://input') ?: 'null', true) ?: [];
    $nome = isset($input['nome']) ? trim((string) $input['nome']) : '';
    if ($nome === '') {
        throw new RuntimeException('Nome prodotto obbligatorio', 422);
    }
    $codice = $input['codice'] ?? null;
    $idCategoria = isset($input['id_categoria']) ? (int) $input['id_categoria'] : null;
    if ($idCategoria === 0) { $idCategoria = null; }
    $prezzoListino = $input['prezzo_listino'] ?? null;
    $idIva = $input['id_iva'] ?? null;
    $idNatura = $input['id_sdi_natura_iva'] ?? null;

    $repo = new ProdottiRepository(Database::getConnection());
    $idProdotto = $repo->createProdotto([
        'codice' => $codice,
        'nome' => $nome,
        'id_categoria' => $idCategoria,
        'prezzo_listino' => $prezzoListino !== null ? (float) $prezzoListino : null,
        'id_iva' => $idIva !== null ? (int) $idIva : null,
        'id_sdi_natura_iva' => $idNatura !== null ? (int) $idNatura : null,
    ]);

    HttpResponse::json(['id_prodotto' => $idProdotto], 201);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
