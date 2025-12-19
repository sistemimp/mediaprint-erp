<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AnagraficheDashboardRepository;
use MediaPrint\Service\AnagraficheDashboardService;
use PDO;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

try {
    $pdo = Database::getConnection();

    $onlyActive = isset($_GET['only_active']) && (int) $_GET['only_active'] === 1;
    $repo = new AnagraficheDashboardRepository($pdo);
    $service = new AnagraficheDashboardService($repo);
    $stats = $service->getDashboardStats($onlyActive);

    $statusCounts = [];
    try {
        $stmt = $pdo->query(
            'SELECT COALESCE(stato, "sconosciuto") AS stato, COUNT(*) AS totale
             FROM tb_anagrafiche
             GROUP BY COALESCE(stato, "sconosciuto")
             ORDER BY totale DESC'
        );
        $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
        foreach ($rows as $row) {
            $statusCounts[] = [
                'stato' => (string) $row['stato'],
                'totale' => (int) $row['totale'],
            ];
        }
    } catch (Throwable) {
        $statusCounts = [];
    }

    $latest = [];
    try {
        $stmt = $pdo->query(
            'SELECT id_anagrafica, ragione_sociale, piva, codice_fiscale, stato, created_at
             FROM tb_anagrafiche
             ORDER BY created_at DESC
             LIMIT 10'
        );
        $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
        foreach ($rows as $row) {
            $latest[] = [
                'id_anagrafica' => (int) $row['id_anagrafica'],
                'ragione_sociale' => $row['ragione_sociale'] ?? null,
                'piva' => $row['piva'] ?? null,
                'codice_fiscale' => $row['codice_fiscale'] ?? null,
                'stato' => $row['stato'] ?? null,
                'created_at' => $row['created_at'] ?? null,
            ];
        }
    } catch (Throwable) {
        $latest = [];
    }

    HttpResponse::json([
        'ok' => true,
        'kpi' => $stats['kpi'] ?? [],
        'series' => $stats['series'] ?? [],
        'status_counts' => $statusCounts,
        'latest' => $latest,
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
