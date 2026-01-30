<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PasskeyRepository;
use RuntimeException;
use Throwable;

require __DIR__ . '/../bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';
if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}
if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo !== POST non consentito.', 405);
}

$payload = json_decode(file_get_contents('php://input') ?: '[]', true);
if (!is_array($payload)) {
    HttpResponse::error('Formato JSON non valido.', 400);
}

$credentialId = trim((string) ($payload['credential_id'] ?? ''));
if ($credentialId === '') {
    HttpResponse::error('Credential ID della passkey obbligatorio.', 422);
}

$decoded = base64_decode($credentialId, true);
if ($decoded === false || $decoded === '') {
    HttpResponse::error('Credential ID non valido.', 422);
}

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);
    $pdo = Database::getConnection();
    $repository = new PasskeyRepository($pdo);
    $deleted = $repository->deleteByCredentialId($decoded);
    if (!$deleted) {
        HttpResponse::error('Passkey non trovata.', 404);
    }
    HttpResponse::json(['ok' => true], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
