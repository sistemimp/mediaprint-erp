<?php
declare(strict_types=1);

use MediaPrint\Service\AnagraficheService;
use MediaPrint\Repo\AnagraficheRepository;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\AuthGuard;

header('Content-Type: application/json; charset=utf-8');
    require __DIR__ . '/../bootstrap.php';
try {
    // Parse JSON body
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['anag.write']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        $data = [];
    }

    $service = new AnagraficheService(
        new AnagraficheRepository(Database::getConnection())
    );

    $result = $service->reactivate($data);

    http_response_code(200);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $code = (int) ($e->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    http_response_code($code);
    echo json_encode([
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
