<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
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

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);

    $password = (string) ($payload['password'] ?? '');
    $confirmation = (string) ($payload['password_confirmation'] ?? $payload['confirm_password'] ?? '');
    if ($password === '' || $confirmation === '') {
        throw new RuntimeException('Password obbligatoria.', 422);
    }
    if ($password !== $confirmation) {
        throw new RuntimeException('Le password non coincidono.', 422);
    }

    $service = new PasswordResetService(
        new AuthRepository(Database::getConnection()),
        new AccountsRepository(Database::getConnection()),
    );

    $result = $service->changePassword($accountId, $password);
    HttpResponse::json($result, 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
