<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Service\CrmEmailService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Preflight CORS: risponde subito senza passare dalla business logic.
if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

// Endpoint write-only: accetta solo POST.
if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    // Verifica sessione e permesso esplicito di scrittura messaggi.
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['msg.write']);

    // Parsing payload JSON con fallback a struttura vuota.
    $payload = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($payload)) {
        $payload = [];
    }

    // Normalizzazione input: conversioni tipo + trim.
    $idEmail = isset($payload['id_email']) ? (int) $payload['id_email'] : 0;
    $body = isset($payload['body']) ? trim((string) $payload['body']) : '';
    $subject = isset($payload['subject']) ? trim((string) $payload['subject']) : '';
    $ccRaw = $payload['cc'] ?? [];
    $cc = is_array($ccRaw) ? array_values($ccRaw) : [];

    // Delega invio e persistenza risposta al service CRM.
    $service = new CrmEmailService();
    HttpResponse::json($service->replyEmail($idEmail, $body, $subject, $cc), 200);
} catch (RuntimeException $exception) {
    // Converte errori dominio in HTTP 4xx/5xx coerenti.
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    // Fallback finale per errori inattesi.
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
