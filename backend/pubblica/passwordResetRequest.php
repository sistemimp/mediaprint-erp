<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Service\PasswordResetService;
use RuntimeException;
use Throwable;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

$payload = json_decode(file_get_contents('php://input') ?: 'null', true);
if (!is_array($payload)) {
    $payload = [];
}

$identifier = (string) ($payload['identifier'] ?? $payload['email'] ?? $payload['username'] ?? '');

$service = new PasswordResetService(
    new AuthRepository(Database::getConnection()),
    new AccountsRepository(Database::getConnection()),
);

try {
    $service->requestReset($identifier);
    HttpResponse::json(['ok' => true], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
