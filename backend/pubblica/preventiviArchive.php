<?php
declare(strict_types=1);

use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Service\PreventiviService;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\AuthGuard;

header('Content-Type: application/json; charset=utf-8');

try {
    require __DIR__ . '/../bootstrap.php';

    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prev.edit']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    if (!is_array($data)) { $data = []; }

    $service = new PreventiviService(
        new PreventiviRepository(Database::getConnection())
    );
    $result = $service->archive($data);

    http_response_code(200);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $code = (int) ($e->getCode() ?: 500);
    if ($code < 400 || $code > 599) { $code = 500; }
    http_response_code($code);
    echo json_encode([
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
