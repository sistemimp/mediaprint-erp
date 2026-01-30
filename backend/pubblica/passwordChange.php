<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\AuthRepository;
use MediaPrint\Service\PasswordResetService;

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
    if ($accountId <= 0) {
        throw new \RuntimeException('Account non valido.', 401);
    }

    $currentPassword = (string) ($payload['current_password'] ?? '');
    $password = (string) ($payload['password'] ?? '');
    $confirmation = (string) ($payload['password_confirmation'] ?? $payload['confirm_password'] ?? '');
    if ($currentPassword === '' || $password === '' || $confirmation === '') {
        throw new \RuntimeException('Password obbligatorie.', 422);
    }
    if ($password !== $confirmation) {
        throw new \RuntimeException('Le password non coincidono.', 422);
    }
    if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password) || !preg_match('/[^A-Za-z0-9]/', $password)) {
        throw new \RuntimeException('La nuova password deve contenere almeno 8 caratteri, una lettera, un numero e un carattere speciale.', 422);
    }

    $pdo = Database::getConnection();
    $authRepository = new AuthRepository($pdo);
    $account = $authRepository->findActiveAccountById($accountId);
    if ($account === null) {
        throw new \RuntimeException('Account non valido.', 401);
    }
    if (!password_verify($currentPassword, (string) ($account['password_hash'] ?? ''))) {
        throw new \RuntimeException('Password attuale non valida.', 401);
    }

    $service = new PasswordResetService(
        $authRepository,
        new AccountsRepository($pdo),
    );

    $result = $service->changePassword($accountId, $password);
    HttpResponse::json($result, 200);
} catch (\RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (\Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
