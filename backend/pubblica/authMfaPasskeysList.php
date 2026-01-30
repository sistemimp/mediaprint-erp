<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PasskeyRepository;
use RuntimeException;
use Throwable;

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
    $accountId = AuthGuard::getAccountId($auth);
    $pdo = Database::getConnection();
    $repository = new PasskeyRepository($pdo);
    $rows = $repository->listForAccount($accountId);
    $passkeys = [];
    foreach ($rows as $row) {
        $passkeys[] = [
            'credential_id' => isset($row['credential_id']) ? base64_encode($row['credential_id']) : null,
            'label' => $row['label'] ?? 'Passkey',
            'transports' => $row['transports'] ?? '',
            'created_at' => $row['created_at'] ?? null,
            'sign_count' => isset($row['sign_count']) ? (int) $row['sign_count'] : 0,
        ];
    }
    HttpResponse::json(['passkeys' => $passkeys], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
