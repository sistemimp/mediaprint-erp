<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Service\PreventiviService;

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
    $service = new PreventiviService(new PreventiviRepository(Database::getConnection()));
    $result = $service->streamPublicAcceptancePdf($_GET);
    $path = (string) ($result['path'] ?? '');
    $filename = (string) ($result['filename'] ?? 'preventivo.pdf');
    if ($path === '' || !is_readable($path)) {
        throw new RuntimeException('PDF non disponibile.', 404);
    }

    $size = filesize($path);
    if ($size === false) {
        $size = 0;
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . addslashes($filename) . '"');
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

