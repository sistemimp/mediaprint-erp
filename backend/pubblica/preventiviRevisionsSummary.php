<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PreventiviRepository;

header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
try {
$auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prev.read']);

        $raw = file_get_contents('php://input') ?: '';
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        $input = [];
    }
    $ids = array_values(array_filter(
        array_map(
            static fn ($value) => is_numeric($value) ? (int) $value : 0,
            $input['ids'] ?? [],
        ),
        static fn ($value) => $value > 0,
    ));
    $repository = new PreventiviRepository(Database::getConnection());
    $data = [];
    foreach ($ids as $id) {
        $revisions = $repository->listRevisions($id);
        if (empty($revisions)) {
            continue;
        }
        $summary = [];
        foreach ($revisions as $revision) {
            $detailData = $revision['payload']['detail']['data'] ?? [];
            $summary[] = [
                'id_revisione' => $revision['id_revisione'],
                'label' => $revision['label'],
                'numero_revision' => $revision['numero_revision'],
                'created_at' => $revision['created_at'],
                'totale_imponibile' => isset($detailData['totale_imponibile']) ? (float) $detailData['totale_imponibile'] : (float) ($detailData['totale'] ?? 0),
                'totale_iva' => isset($detailData['totale_iva']) ? (float) $detailData['totale_iva'] : 0.0,
                'totale' => isset($detailData['totale']) ? (float) $detailData['totale'] : (float) ($detailData['totale_imponibile'] ?? 0),
            ];
        }
        $data[] = [
            'id_preventivo' => $id,
            'revisions' => $summary,
        ];
    }

    HttpResponse::json(['data' => $data], 200);
} catch (\Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
