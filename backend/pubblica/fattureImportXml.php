<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Service\FatturaXmlImporter;

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
    AuthGuard::requirePermissions($auth, ['fatt.create']);

    $files = $_FILES['file'] ?? null;
    if ($files === null) {
        throw new RuntimeException('File mancante', 422);
    }

    $uploads = [];
    if (is_array($files['name'])) {
        $count = count($files['name']);
        for ($i = 0; $i < $count; $i++) {
            $uploads[] = [
                'name' => $files['name'][$i] ?? null,
                'type' => $files['type'][$i] ?? null,
                'tmp_name' => $files['tmp_name'][$i] ?? null,
                'error' => $files['error'][$i] ?? null,
                'size' => $files['size'][$i] ?? null,
            ];
        }
    } else {
        $uploads[] = $files;
    }

    $isAcquisto = isset($_GET['is_acquisto']) ? (int) $_GET['is_acquisto'] : (isset($_POST['is_acquisto']) ? (int) $_POST['is_acquisto'] : 0);
    $importer = new FatturaXmlImporter(Database::getConnection());
    $results = [];
    foreach ($uploads as $upload) {
        $label = $upload['name'] ?? 'file';
        if (!empty($upload['error'])) {
            $results[] = [
                'file' => $label,
                'ok' => false,
                'message' => sprintf('Errore upload: %s', $upload['error']),
            ];
            continue;
        }

        try {
            $payload = $importer->import($upload, $isAcquisto === 1);
            $results[] = [
                'file' => $label,
                'ok' => true,
                'invoice' => $payload['invoice'] ?? null,
                'progressivo_invio' => $payload['progressivo_invio'] ?? null,
                'numero_documento' => $payload['numero_documento_originale'] ?? null,
                'log' => $payload['log'] ?? null,
            ];
        } catch (RuntimeException $exception) {
            $results[] = [
                'file' => $label,
                'ok' => false,
                'message' => $exception->getMessage(),
                'log' => $importer->getImportLogForUpload($upload),
            ];
        }
    }

    HttpResponse::json(['results' => $results], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
