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

    $idAnagrafica = isset($_GET['id_anagrafica']) ? (int) $_GET['id_anagrafica'] : null;
    $onlyActive = !isset($_GET['only_active']) || (int) $_GET['only_active'] === 1;

    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        if ($allowed === []) {
            HttpResponse::json(['items' => []], 200);
        }
        if ($idAnagrafica !== null && !in_array($idAnagrafica, $allowed, true)) {
            throw new RuntimeException('Accesso non consentito all\'anagrafica richiesta.', 403);
        }
    }

    $repo = new ClienteFondiRepository(Database::getConnection());
    $items = $repo->listFondi($idAnagrafica, $onlyActive);

    if (isset($allowed) && is_array($allowed)) {
        $items = array_values(array_filter($items, static fn (array $x): bool => in_array((int) ($x['id_anagrafica'] ?? 0), $allowed, true)));
    }

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

