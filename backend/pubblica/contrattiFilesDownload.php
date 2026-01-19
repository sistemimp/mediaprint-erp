<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\ContrattiRepository;

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

    $fileId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($fileId <= 0) {
        throw new RuntimeException('File non valido.', 422);
    }

    $repo = new ContrattiRepository(Database::getConnection());
    $file = $repo->findFile($fileId);
    if ($file === null) {
        throw new RuntimeException('File non trovato.', 404);
    }

    $contrattoId = isset($file['id_contratto']) ? (int) $file['id_contratto'] : 0;
    $fileName = isset($file['file_name']) ? (string) $file['file_name'] : '';
    if ($contrattoId <= 0 || $fileName === '') {
        throw new RuntimeException('File non valido.', 422);
    }

    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $allowed = array_map('intval', $allowed);
        $allowedMap = array_fill_keys($allowed, true);

        $contract = $repo->getById($contrattoId);
        if ($contract === null) {
            throw new RuntimeException('File non trovato.', 404);
        }

        $idAnag = isset($contract['id_anagrafica']) ? (int) $contract['id_anagrafica'] : 0;
        $statusCode = strtolower((string) ($contract['stato_code'] ?? 'bozza'));
        if ($idAnag <= 0 || !isset($allowedMap[$idAnag]) || $statusCode === 'bozza') {
            throw new RuntimeException('File non trovato.', 404);
        }
    }

    $path = dirname(__DIR__) . '/uploads/contratti/' . $contrattoId . '/' . $fileName;
    if (!is_readable($path)) {
        throw new RuntimeException('File non disponibile.', 404);
    }

    $repo->logFileDownload($fileId, AuthGuard::getAccountId($auth));

    $mime = isset($file['mime_type']) ? (string) $file['mime_type'] : 'application/octet-stream';
    $originalName = isset($file['original_name']) ? (string) $file['original_name'] : $fileName;
    $size = filesize($path);
    if ($size === false) {
        $size = 0;
    }

    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . addslashes($originalName) . '"');
    header('Content-Length: ' . $size);
    readfile($path);
    exit;
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
