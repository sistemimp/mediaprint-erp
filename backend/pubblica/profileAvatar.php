<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;

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
    $accountId = AuthGuard::getAccountId($auth);
    if ($accountId <= 0) {
        throw new RuntimeException('Account non valido.', 401);
    }

    $repo = new AccountsRepository(Database::getConnection());
    $avatarPath = $repo->getAccountAvatarPath($accountId);
    if (!$avatarPath) {
        throw new RuntimeException('Immagine profilo non trovata.', 404);
    }

    $safePath = ltrim($avatarPath, '/');
    if (strpos($safePath, '..') !== false) {
        throw new RuntimeException('Percorso non valido.', 404);
    }

    $uploadsCandidates = [];
    $envPath = getenv('UPLOADS_DIR') ?: (getenv('UPLOADS_BASE_PATH') ?: '');
    if (is_string($envPath) && $envPath !== '') {
        $uploadsCandidates[] = rtrim($envPath, '/');
    }
    $uploadsCandidates[] = dirname(__DIR__, 2) . '/uploads';
    $uploadsCandidates[] = dirname(__DIR__, 1) . '/uploads';

    $fullPath = null;
    foreach ($uploadsCandidates as $base) {
        $candidate = $base . '/' . $safePath;
        if (is_readable($candidate)) {
            $fullPath = $candidate;
            break;
        }
    }
    if ($fullPath === null) {
        throw new RuntimeException('Immagine profilo non disponibile.', 404);
    }

    $mime = function_exists('mime_content_type') ? mime_content_type($fullPath) : null;
    if (!is_string($mime) || $mime === '') {
        $mime = 'application/octet-stream';
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($fullPath));
    readfile($fullPath);
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
