<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;
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
    AuthGuard::requirePermissions($auth, ['fatt.read']);
    $allowed = null;
    $excludeDraft = false;
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $excludeDraft = true;
    }

    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $isAcquisto = isset($_GET['is_acquisto']) ? (int) $_GET['is_acquisto'] : null;
    if ($id <= 0) {
        throw new RuntimeException('ID fattura mancante o non valido.', 422);
    }

    $repo = new FattureRepository(Database::getConnection());
    $detail = $repo->fetchDetail($id);
    if ($detail === null) {
        throw new RuntimeException('Fattura non trovata.', 404);
    }
    if ($isAcquisto !== null && (int) ($detail['is_acquisto'] ?? 0) !== $isAcquisto) {
        throw new RuntimeException('Fattura non trovata.', 404);
    }
    if (is_array($allowed) && $allowed !== [] && !in_array((int) ($detail['id_anagrafica'] ?? 0), $allowed, true)) {
        throw new RuntimeException('Fattura non trovata.', 404);
    }
    if ($excludeDraft && strtolower((string) ($detail['stato_code'] ?? '')) === 'bozza') {
        throw new RuntimeException('Fattura non trovata.', 404);
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
