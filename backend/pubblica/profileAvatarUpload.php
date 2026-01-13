<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Service\AccountsService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    $accountId = AuthGuard::getAccountId($auth);

    $file = $_FILES['avatar'] ?? ($_FILES['file'] ?? null);
    if (!is_array($file)) {
        throw new RuntimeException('File mancante.', 422);
    }

    $service = new AccountsService(new AccountsRepository(Database::getConnection()));
    $result = $service->uploadAvatar($accountId, $file);

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
