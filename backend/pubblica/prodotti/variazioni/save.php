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
    AuthGuard::requirePermissions($auth, ['cfg.edit']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    $input = json_decode(file_get_contents('php://input') ?: 'null', true) ?: [];
    $id = isset($input['id_variazione']) ? (int) $input['id_variazione'] : null;
    if ($id === 0) { $id = null; }
    $nome = isset($input['nome']) ? trim((string) $input['nome']) : '';
    if ($nome === '') {
        throw new RuntimeException('Nome variazione obbligatorio', 422);
    }
    $prezzo = null;
    if (array_key_exists('prezzo', $input) && $input['prezzo'] !== null && $input['prezzo'] !== '') {
        $prezzo = (float) $input['prezzo'];
    }
    $categoria = isset($input['categoria']) ? trim((string) $input['categoria']) : null;
    $codice = isset($input['codice']) ? trim((string) $input['codice']) : null;
    $repo = new ProdottiRepository(Database::getConnection());
    $newId = $repo->upsertVariazione($id, $nome, $prezzo, $categoria ?: null, $codice ?: null);
    HttpResponse::json(['id_variazione' => $newId], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
