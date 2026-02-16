<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;
use MediaPrint\Repo\LavorazioniRepository;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Service\NotificationsService;
use MediaPrint\Service\PreventiviService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
$auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prev.write']);

        $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($payload)) {
        $payload = [];
    }

    $pdo = Database::getConnection();
    $service = new PreventiviService(
        new PreventiviRepository($pdo),
        null,
        new FattureRepository($pdo)
    );

    $result = $service->emitFattura($payload);

    if (!empty($result['fattura']['id_fattura'])) {
        $idFattura = (int) $result['fattura']['id_fattura'];
        $isAcquisto = !empty($result['fattura']['is_acquisto']);
        $payloadData = [
            'entity' => 'fattura',
            'action' => 'created',
            'id_fattura' => $idFattura,
            'route' => ($isAcquisto ? '/acquisti/fatture/dettagli?id=' : '/fatture/dettagli?id=') . $idFattura,
        ];
        $notifications = new NotificationsService(new LavorazioniRepository($pdo));
        $notifications->notifyAllOperators(
            $isAcquisto ? 'Nuova fattura acquisto' : 'Nuova fattura',
            ($isAcquisto ? 'Fattura di acquisto #' : 'Fattura #') . $idFattura . ' generata.',
            $payloadData,
            AuthGuard::getAccountId($auth),
        );
    }

    HttpResponse::json($result, 201);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

