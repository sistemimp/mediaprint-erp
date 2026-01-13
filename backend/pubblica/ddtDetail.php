<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\DdtRepository;
use MediaPrint\Repo\AccountsRepository;
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
    AuthGuard::requirePermissions($auth, ['ddt.read']);
    $allowed = null;
    $excludeDraft = false;
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $excludeDraft = true;
    }

    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        throw new RuntimeException('ID DDT mancante o non valido.', 422);
    }

    $repo = new DdtRepository(Database::getConnection());
    $detail = $repo->fetchById($id);
    if ($detail === null) {
        throw new RuntimeException('DDT non trovato.', 404);
    }
    if (is_array($allowed) && $allowed !== [] && !in_array((int) ($detail['id_anagrafica'] ?? 0), $allowed, true)) {
        throw new RuntimeException('DDT non trovato.', 404);
    }
    if ($excludeDraft && (int) ($detail['stato_documento'] ?? 1) === 1) {
        throw new RuntimeException('DDT non trovato.', 404);
    }

    HttpResponse::json(['data' => $detail], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
