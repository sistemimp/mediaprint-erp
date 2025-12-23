<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
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
    AuthGuard::requirePermissions($auth, ['anag.view']);

    $service = new ContrattiService(new ContrattiRepository(Database::getConnection()));
    $result = $service->detail($_GET);

    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $allowedMap = array_fill_keys(array_map('intval', $allowed), true);
        $idAnag = isset($result['contratto']['id_anagrafica']) ? (int) $result['contratto']['id_anagrafica'] : 0;
        if ($idAnag <= 0 || !isset($allowedMap[$idAnag])) {
            throw new RuntimeException('Contratto non trovato.', 404);
        }
    }

    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) { $code = 422; }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

