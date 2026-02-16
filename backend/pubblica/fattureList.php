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
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 200;
    $dateFrom = isset($_GET['date_from']) ? trim((string) $_GET['date_from']) : null;
    $dateTo = isset($_GET['date_to']) ? trim((string) $_GET['date_to']) : null;
    $isAcquisto = isset($_GET['is_acquisto']) ? (int) $_GET['is_acquisto'] : 0;
    if ($dateFrom === '') {
        $dateFrom = null;
    }
    if ($dateTo === '') {
        $dateTo = null;
    }
    $repo = new FattureRepository(Database::getConnection());
    $items = $repo->listLatest($limit, $allowed, $excludeDraft, $dateFrom, $dateTo, $isAcquisto);

    HttpResponse::json(['data' => $items], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
