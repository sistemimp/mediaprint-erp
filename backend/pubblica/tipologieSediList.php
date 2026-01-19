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
    $stmt = $pdo->query('SELECT id_tipo, codice, nome FROM cfg_sedi_tipo WHERE attivo = 1 ORDER BY nome ASC');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $items = array_map(static fn ($row) => [
        'id_tipo' => isset($row['id_tipo']) ? (int) $row['id_tipo'] : null,
        'code' => $row['codice'] ?? null,
        'label' => $row['nome'] ?? null,
    ], $rows);

    HttpResponse::json(['items' => $items], 200);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
