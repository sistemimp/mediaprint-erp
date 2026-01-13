<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Service\PreventiviService;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Access-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prev.write']);

    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        $data = [];
    }

    $service = new PreventiviService(
        new PreventiviRepository(Database::getConnection()),
    );
    $result = $service->changeStatus($data);

    HttpResponse::json($result, 200);
} catch (Throwable $e) {
    $code = (int) ($e->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error($e->getMessage(), $code);
}
