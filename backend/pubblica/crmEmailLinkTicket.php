<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Service\CrmEmailService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Preflight CORS.
if ($method === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    HttpResponse::json(['message' => 'OK']);
}

// Endpoint write-only: accetta solo POST.
if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    // Verifica sessione e permesso necessario per collegare la mail.
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['msg.write']);

    // Parsing payload con fallback safe.
    $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($payload)) {
        $payload = [];
    }

    // Normalizzazione dati input e conversioni base.
    $idEmail = isset($payload['id_email']) ? (int) $payload['id_email'] : 0;
    $idTicket = isset($payload['id_ticket']) ? (int) $payload['id_ticket'] : 0;
    $sectionType = isset($payload['section_type']) ? trim((string) $payload['section_type']) : '';
    $sectionId = isset($payload['section_id']) ? (int) $payload['section_id'] : null;

    // Delega al service il collegamento email-ticket e sezione gestionale opzionale.
    $service = new CrmEmailService();
    HttpResponse::json(
        $service->linkEmailTicket($idEmail, $idTicket, $sectionType, $sectionId),
        200
    );
} catch (RuntimeException $exception) {
    // Mappa eccezioni di dominio in status HTTP coerenti.
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    // Fallback su errore inatteso.
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
