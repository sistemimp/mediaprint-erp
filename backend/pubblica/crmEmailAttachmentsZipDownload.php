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

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['msg.read']);

    $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($payload)) {
        HttpResponse::error('Payload non valido.', 422);
    }

    $idEmail = isset($payload['id_email']) ? (int) $payload['id_email'] : 0;
    $attachments = isset($payload['attachments']) && is_array($payload['attachments']) ? $payload['attachments'] : [];

    $service = new CrmEmailService();
    $file = $service->downloadAttachmentsZip($idEmail, $attachments);

    $filename = trim((string) ($file['filename'] ?? 'allegati.zip'));
    if ($filename === '') {
        $filename = 'allegati.zip';
    }
    $mimeType = trim((string) ($file['mime_type'] ?? 'application/zip'));
    if ($mimeType === '') {
        $mimeType = 'application/zip';
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

