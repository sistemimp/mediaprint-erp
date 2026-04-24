<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Service\CrmEmailService;

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
    AuthGuard::requirePermissions($auth, ['msg.read']);

    $idEmail = isset($_GET['id_email']) ? (int) $_GET['id_email'] : 0;
    $attachment = isset($_GET['attachment']) ? (string) $_GET['attachment'] : '';

    $service = new CrmEmailService();
    $file = $service->downloadAttachment($idEmail, $attachment);

    $filename = trim((string) ($file['filename'] ?? 'allegato.bin'));
    if ($filename === '') {
        $filename = 'allegato.bin';
    }
    $mimeType = trim((string) ($file['mime_type'] ?? 'application/octet-stream'));
    if ($mimeType === '') {
        $mimeType = 'application/octet-stream';
    }
    $content = (string) ($file['content'] ?? '');

    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . addslashes($filename) . '"');
    header('Content-Length: ' . strlen($content));
    echo $content;
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

