<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Repo\MfaRepository;
use MediaPrint\Service\MfaService;
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

$code = trim((string) ($payload['code'] ?? ''));
if ($code === '') {
    HttpResponse::error('Codice OTP obbligatorio.', 422);
}

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);
    $pdo = Database::getConnection();
    $service = new MfaService(
        new AccountsRepository($pdo),
        new AuthRepository($pdo),
        new MfaRepository($pdo),
    );
    $service->confirmOtpSetup($accountId, $code);
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
