<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Repo\LavorazioniRepository;
use MediaPrint\Service\PreventiviService;
use MediaPrint\Service\NotificationsService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

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
    AuthGuard::requirePermissions($auth, ['prev.create']);

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
    $result = $service->create($payload);

    $isNew = empty($payload['id_preventivo']) && !empty($result['id_preventivo']);
    if ($isNew) {
        $idPreventivo = (int) $result['id_preventivo'];
        $numero = isset($result['numero_documento']) ? (int) $result['numero_documento'] : null;
        $anno = isset($result['anno_preventivo']) ? (int) $result['anno_preventivo'] : null;
        $label = $numero ? ('Preventivo ' . $numero . ($anno ? '/' . $anno : '')) : ('Preventivo #' . $idPreventivo);
        $payloadData = [
            'entity' => 'preventivo',
            'action' => 'created',
            'id_preventivo' => $idPreventivo,
            'numero_documento' => $numero,
            'anno_preventivo' => $anno,
            'route' => '/preventivi/dettagli?id=' . $idPreventivo,
        ];
        $notifications = new NotificationsService(new LavorazioniRepository($connection));
        $notifications->notifyAllOperators(
            'Nuovo preventivo',
            $label . ' creato.',
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
