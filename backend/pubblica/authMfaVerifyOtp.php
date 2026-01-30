<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Repo\MfaRepository;
use MediaPrint\Service\AuthService;
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

$mfaToken = trim((string) ($payload['mfa_token'] ?? ''));
$code = trim((string) ($payload['code'] ?? ''));
if ($mfaToken === '' || $code === '') {
    HttpResponse::error('Token MFA e codice OTP sono obbligatori.', 422);
}

try {
    $pdo = Database::getConnection();
    $accountsRepository = new AccountsRepository($pdo);
    $authRepository = new AuthRepository($pdo);
    $mfaRepository = new MfaRepository($pdo);
    $mfaService = new MfaService($accountsRepository, $authRepository, $mfaRepository);

    $accountId = $mfaService->consumeSessionToken($mfaToken);
    if ($accountId === null) {
        HttpResponse::error('Token MFA non valido o scaduto.', 401);
    }

    if (!$mfaService->verifyOtpForAccount($accountId, $code)) {
        HttpResponse::error('Codice OTP non valido.', 401);
    }

    $authService = new AuthService($authRepository);
    $result = $authService->issueTokenForAccountId($accountId);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
