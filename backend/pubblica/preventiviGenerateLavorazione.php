<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\LavorazioniRepository;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Service\NotificationsService;
use MediaPrint\Service\PreventiviService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
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

    $connection = Database::getConnection();
    $service = new PreventiviService(
        new PreventiviRepository($connection),
        null,
        null,
        new LavorazioniRepository($connection)
    );

    $result = $service->generateLavorazione($payload);

    if (!empty($result['id_lavorazione'])) {
        $idLavorazione = (int) $result['id_lavorazione'];
        $codice = isset($result['codice']) ? (string) $result['codice'] : null;
        $label = $codice && $codice !== '' ? ('Lavorazione ' . $codice) : ('Lavorazione #' . $idLavorazione);
        $payloadData = [
            'entity' => 'lavorazione',
            'action' => 'created',
            'id_lavorazione' => $idLavorazione,
            'codice' => $codice,
            'route' => '/lavorazioni/dettaglio?id=' . $idLavorazione,
        ];
        $notifications = new NotificationsService(new LavorazioniRepository($connection));
        $notifications->notifyAllOperators(
            'Nuova lavorazione',
            $label . ' generata.',
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
