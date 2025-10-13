<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->query('SELECT id_iva, percento, descrizione FROM cfg_iva ORDER BY percento ASC');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $items = array_map(static function ($r) {
        return [
            'id_iva' => (int) $r['id_iva'],
            'percento' => isset($r['percento']) ? (float) $r['percento'] : 0.0,
            'descrizione' => $r['descrizione'] ?? null,
        ];
    }, $rows);
    HttpResponse::json(['items' => $items], 200);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

