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

    $sender = isset($_GET['sender']) ? trim((string) $_GET['sender']) : '';
    $subject = isset($_GET['subject']) ? trim((string) $_GET['subject']) : '';
    $anagrafica = isset($_GET['anagrafica']) ? trim((string) $_GET['anagrafica']) : '';
    $conversationKey = isset($_GET['conversation_key']) ? trim((string) $_GET['conversation_key']) : '';
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    $pageSize = isset($_GET['page_size']) ? (int) $_GET['page_size'] : 100;

    $service = new CrmEmailService();
    HttpResponse::json(
        $service->searchArchiveEmails($sender, $subject, $anagrafica, $page, $pageSize, $conversationKey),
        200
    );
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
