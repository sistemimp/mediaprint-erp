<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use PDO;
use Throwable;

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['anag.read']);

    $pdo = Database::getConnection();
    $stmt = $pdo->query('SELECT id_regime, code, label FROM cfg_sdi_regime_fiscale WHERE attivo = 1 ORDER BY label ASC');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $items = array_map(static fn ($row) => [
        'id_regime' => isset($row['id_regime']) ? (int) $row['id_regime'] : null,
        'code' => $row['code'] ?? null,
        'label' => $row['label'] ?? null,
    ], $rows);

    HttpResponse::json(['items' => $items], 200);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
