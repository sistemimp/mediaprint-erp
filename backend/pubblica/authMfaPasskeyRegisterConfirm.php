<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\MfaRepository;
use MediaPrint\Repo\PasskeyChallengeRepository;
use MediaPrint\Repo\PasskeyRepository;
use MediaPrint\Service\PasskeyService;

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

$challengeToken = trim((string) ($payload['challenge_token'] ?? ''));
$credential = $payload['credential'] ?? null;
$label = isset($payload['label']) ? trim((string) $payload['label']) : null;

if ($challengeToken === '' || !is_array($credential)) {
    HttpResponse::error('Challenge o credential mancanti.', 422);
}

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);
    if ($accountId <= 0) {
        throw new RuntimeException('Account non valido.', 401);
    }

    $pdo = Database::getConnection();
    $passkeys = new PasskeyRepository($pdo);
    $service = new PasskeyService(
        $passkeys,
        new PasskeyChallengeRepository($pdo),
        new MfaRepository($pdo),
        getenv('WEB_AUTHN_RP_ID') ?: ($_SERVER['HTTP_HOST'] ?? 'localhost'),
        getenv('WEB_AUTHN_ORIGIN') ?: ((isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost')),
    );

    $username = trim((string) ($auth['username'] ?? ($auth['email'] ?? 'utente')));
    if ($username === '') {
        $username = 'utente';
    }
    $displayName = trim((string) ($auth['username'] ?? ($auth['email'] ?? 'Account')));
    if ($displayName === '') {
        $displayName = $username;
    }

    $source = $service->verifyAttestation($accountId, $challengeToken, $credential, $username, $displayName);
    $existing = $passkeys->findOneByCredentialId($source->publicKeyCredentialId);
    if ($existing !== null) {
        throw new RuntimeException('Passkey già registrata per questo account.', 409);
    }
    $passkeys->insertCredentialSource($accountId, $source, $label);

    $accounts = new AccountsRepository($pdo);
    $state = $accounts->getMfaState($accountId);
    if ($state === null) {
        throw new RuntimeException('Account non valido.', 404);
    }
    $currentMethod = strtolower((string) ($state['mfa_method'] ?? 'none'));
    $nextMethod = resolveMfaMethod($currentMethod, 'passkey');
    $accounts->updateAccount($accountId, [
        'has_mfa' => 1,
        'mfa_method' => $nextMethod,
    ]);

    HttpResponse::json([
        'ok' => true,
        'has_mfa' => true,
        'mfa_method' => $nextMethod,
    ], 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

function resolveMfaMethod(string $current, string $requested): string
{
    $current = strtolower($current);
    $requested = strtolower($requested);
    if ($current === 'both' || $current === $requested) {
        return $current === '' ? 'none' : $current;
    }
    if ($current === 'none' || $current === '') {
        return $requested;
    }
    return 'both';
}
