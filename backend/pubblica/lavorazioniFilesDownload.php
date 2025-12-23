<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\LavorazioniRepository;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Backend\AuthGuard;

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
    AuthGuard::requirePermissions($auth, ['job.view']);

    $fileId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($fileId <= 0) {
        throw new RuntimeException('File non valido.', 422);
    }

    $repo = new LavorazioniRepository(Database::getConnection());
    $file = $repo->findLavorazioneFile($fileId);
    if ($file === null) {
        throw new RuntimeException('File non trovato.', 404);
    }

    $lavorazioneId = isset($file['id_lavorazione']) ? (int) $file['id_lavorazione'] : 0;
    $fileName = isset($file['file_name']) ? (string) $file['file_name'] : '';
    if ($lavorazioneId <= 0 || $fileName === '') {
        throw new RuntimeException('File non valido.', 422);
    }

    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $detail = $repo->findDetail($lavorazioneId);
        if ($detail === null || !in_array((int) ($detail['id_anagrafica'] ?? 0), $allowed, true)) {
            throw new RuntimeException('File non trovato.', 404);
        }
    }

    $path = dirname(__DIR__, 2) . '/uploads/lavorazioni/' . $lavorazioneId . '/' . $fileName;
    if (!is_readable($path)) {
        throw new RuntimeException('File non disponibile.', 404);
    }

    $repo->logLavorazioneFileDownload($fileId, AuthGuard::getAccountId($auth));

    $mime = isset($file['mime_type']) ? (string) $file['mime_type'] : 'application/octet-stream';
    $originalName = isset($file['original_name']) ? (string) $file['original_name'] : $fileName;

    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . addslashes($originalName) . '"');
    header('Content-Length: ' . filesize($path));
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
