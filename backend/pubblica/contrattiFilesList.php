<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\ContrattiRepository;
use MediaPrint\Service\ContrattiService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    header('Allow: GET, OPTIONS');
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'GET') {
    header('Allow: GET, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['contr.read']);

    $allowedMap = null;
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $allowed = array_map('intval', $allowed);
        $allowedMap = array_fill_keys($allowed, true);
        $_GET['exclude_draft'] = 1;
    }

    $service = new ContrattiService(new ContrattiRepository(Database::getConnection()));
    $detail = $service->detail($_GET);

    if ($allowedMap !== null) {
        $idAnag = isset($detail['contratto']['id_anagrafica']) ? (int) $detail['contratto']['id_anagrafica'] : 0;
        if ($idAnag <= 0 || !isset($allowedMap[$idAnag])) {
            throw new RuntimeException('Contratto non trovato.', 404);
        }
    }

    $result = $service->filesList($_GET);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
