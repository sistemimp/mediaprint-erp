<?php
declare(strict_types=1);

require __DIR__ . '/../../../bootstrap.php';

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
    AuthGuard::requirePermissions($auth, ['prod.write']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    $input = json_decode(file_get_contents('php://input') ?: 'null', true) ?: [];
    $id = isset($input['id_categoria']) ? (int) $input['id_categoria'] : null;
    // Upsert contract: 0/null => create, id>0 => update.
    if ($id === 0) { $id = null; }
    $nome = isset($input['nome']) ? trim((string) $input['nome']) : '';
    if ($nome === '') {
        throw new RuntimeException('Nome categoria obbligatorio', 422);
    }
    $repo = new ProdottiRepository(Database::getConnection());
    $newId = $repo->upsertCategoria($id, $nome);
    HttpResponse::json(['id_categoria' => $newId], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
