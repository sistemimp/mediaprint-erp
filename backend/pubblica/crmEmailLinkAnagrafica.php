<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Service\CrmEmailService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Preflight CORS.
if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

// Endpoint write-only: accetta solo POST.
if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    // Verifica sessione e permesso necessario per il collegamento CRM.
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['msg.write']);

    // Parsing payload JSON e validazione struttura minima.
    $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($payload)) {
        HttpResponse::error('Payload non valido.', 422);
    }

    // Normalizzazione input.
    $idEmail = isset($payload['id_email']) ? (int) $payload['id_email'] : 0;
    $idAnagrafica = isset($payload['id_anagrafica']) ? (int) $payload['id_anagrafica'] : 0;

    // Delega al service il collegamento email-anagrafica.
    $service = new CrmEmailService();
    HttpResponse::json($service->linkEmailAnagrafica($idEmail, $idAnagrafica), 200);
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
