<?php
declare(strict_types=1);

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
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

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);
    if ($accountId <= 0) {
        throw new RuntimeException('Account non valido.', 401);
    }

    $pdo = Database::getConnection();
    $service = new PasskeyService(
        new PasskeyRepository($pdo),
        new PasskeyChallengeRepository($pdo),
        new MfaRepository($pdo),
        getenv('WEB_AUTHN_RP_ID') ?: ($_SERVER['HTTP_HOST'] ?? 'localhost'),
        getenv('WEB_AUTHN_ORIGIN') ?: ((isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost')),
    );

    $options = $service->createAssertionOptionsForAccount($accountId);
    HttpResponse::json($options, 200);
} catch (RuntimeException $exception) {
    $code = (int) ($exception->getCode() ?: 400);
    if ($code < 400 || $code > 599) {
        $code = 400;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
