<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\MfaRepository;
use MediaPrint\Repo\PasskeyChallengeRepository;
use MediaPrint\Repo\PasskeyRepository;
use MediaPrint\Service\PasskeyService;
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

$payload = json_decode(file_get_contents('php://input') ?: '[]', true);
if (!is_array($payload)) {
    HttpResponse::error('Formato JSON non valido.', 400);
}

$mfaToken = trim((string) ($payload['mfa_token'] ?? ''));
if ($mfaToken === '') {
    HttpResponse::error('Token MFA mancanti.', 422);
}

$pdo = Database::getConnection();
$service = new PasskeyService(
    new PasskeyRepository($pdo),
    new PasskeyChallengeRepository($pdo),
    new MfaRepository($pdo),
    getenv('WEB_AUTHN_RP_ID') ?: ($_SERVER['HTTP_HOST'] ?? 'localhost'),
    getenv('WEB_AUTHN_ORIGIN') ?: ((isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost')),
);

try {
    $options = $service->createAssertionOptions($mfaToken);
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
