<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\InstantMessagingRepository;
use MediaPrint\Service\InstantMessagingService;

require __DIR__ . '/../bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo !== POST non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['msg.create']);
    $accountId = AuthGuard::getAccountId($auth);
    $payload = json_decode(file_get_contents('php://input') ?: '[]', true);
    if (!is_array($payload)) {
        HttpResponse::error('Formato JSON non valido.', 400);
    }

    $targetIds = [];
    if (isset($payload['id_accounts']) && is_array($payload['id_accounts'])) {
        $targetIds = $payload['id_accounts'];
    } elseif (isset($payload['id_account'])) {
        $targetIds = [(int) $payload['id_account']];
    }
    $hasValidTarget = false;
    foreach ($targetIds as $targetId) {
        if ((int) $targetId > 0) {
            $hasValidTarget = true;
            break;
        }
    }
    if (!$hasValidTarget) {
        HttpResponse::error('Account di destinazione non valido.', 422);
    }

    $service = new InstantMessagingService(new InstantMessagingRepository(Database::getConnection()));
    $thread = $service->createThread($accountId, $targetIds);
    HttpResponse::json(['data' => $thread], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
