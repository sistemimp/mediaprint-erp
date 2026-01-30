<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\DdtRepository;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Backend\AuthGuard;
use PDO;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

/**
 * @return array{start:DateTimeImmutable,end:DateTimeImmutable,period:string}
 */
function resolveDashboardPeriod(?string $periodRaw): array
{
    $period = strtolower(trim((string) $periodRaw));
    $allowed = ['monthly', 'quarterly', 'semiannual', 'yearly'];
    if (!in_array($period, $allowed, true)) {
        $period = 'monthly';
    }

    $months = match ($period) {
        'quarterly' => 3,
        'semiannual' => 6,
        'yearly' => 12,
        default => 1,
    };
    $end = new DateTimeImmutable('now');
    $start = $end->modify('-' . $months . ' months');

    return [
        'start' => $start,
        'end' => $end,
        'period' => $period,
    ];
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['ddt.read']);
    $allowed = null;
    $excludeDraftLatest = false;
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $excludeDraftLatest = true;
        if ($allowed === []) {
            HttpResponse::json([
                'ok' => true,
                'kpi' => [
                    'totale' => 0,
                    'totale_mese' => 0,
                    'bozze' => 0,
                    'emessi' => 0,
                    'pezzi_mese' => 0,
                ],
                'top_causali' => [],
                'latest' => [],
                'period' => $_GET['period'] ?? 'monthly',
            ], 200);
            return;
        }
    }
    $pdo = Database::getConnection();
    $repo = new DdtRepository($pdo);
    $range = resolveDashboardPeriod($_GET['period'] ?? null);
    $allowedClause = '';
    $allowedParams = [];
    if (is_array($allowed)) {
        $placeholders = [];
        foreach ($allowed as $index => $id) {
            $key = ':allowed_' . $index;
            $placeholders[] = $key;
            $allowedParams[$key] = $id;
        }
        $allowedClause = ' AND d.id_anagrafica IN (' . implode(',', $placeholders) . ')';
    }

    if ($allowedClause === '') {
        $totale = (int) ($pdo->query('SELECT COUNT(*) FROM tb_ddt')->fetchColumn() ?: 0);
    } else {
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tb_ddt d WHERE 1=1' . $allowedClause);
        foreach ($allowedParams as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
        $totale = (int) ($stmt->fetchColumn() ?: 0);
    }

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total,
                COALESCE(SUM(totale_pezzi), 0) AS pezzi
         FROM tb_ddt d
         WHERE data_ddt >= :start AND data_ddt < :end'
        . $allowedClause
    );
    $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    foreach ($allowedParams as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $totaleMese = (int) ($row['total'] ?? 0);
    $pezziMese = (float) ($row['pezzi'] ?? 0);

    if ($allowedClause === '') {
        $bozze = (int) ($pdo->query('SELECT COUNT(*) FROM tb_ddt WHERE stato_documento = 1')->fetchColumn() ?: 0);
        $emessi = (int) ($pdo->query('SELECT COUNT(*) FROM tb_ddt WHERE stato_documento = 2')->fetchColumn() ?: 0);
    } else {
        $bozzeStmt = $pdo->prepare('SELECT COUNT(*) FROM tb_ddt d WHERE stato_documento = 1' . $allowedClause);
        foreach ($allowedParams as $key => $value) {
            $bozzeStmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $bozzeStmt->execute();
        $bozze = (int) ($bozzeStmt->fetchColumn() ?: 0);

        $emessiStmt = $pdo->prepare('SELECT COUNT(*) FROM tb_ddt d WHERE stato_documento = 2' . $allowedClause);
        foreach ($allowedParams as $key => $value) {
            $emessiStmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $emessiStmt->execute();
        $emessi = (int) ($emessiStmt->fetchColumn() ?: 0);
    }

    $topCausali = [];
    try {
        $stmt = $pdo->prepare(
            'SELECT c.id_causale, c.label, COUNT(d.id_ddt) AS totale
             FROM cfg_causali_ddt c
             LEFT JOIN tb_ddt d
               ON d.id_causale = c.id_causale
               AND d.data_ddt >= :start AND d.data_ddt < :end'
            . $allowedClause . '
              WHERE c.attivo = 1
             GROUP BY c.id_causale, c.label
             ORDER BY totale DESC, c.label ASC
             LIMIT 5'
        );
        $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
        $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
        foreach ($allowedParams as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as $row) {
            $topCausali[] = [
                'id_causale' => (int) $row['id_causale'],
                'label' => (string) $row['label'],
                'totale' => (int) $row['totale'],
            ];
        }
    } catch (Throwable) {
        $topCausali = [];
    }

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'totale' => $totale,
            'totale_mese' => $totaleMese,
            'bozze' => $bozze,
            'emessi' => $emessi,
            'pezzi_mese' => $pezziMese,
        ],
        'top_causali' => $topCausali,
        'latest' => $repo->listLatest(10, $allowed, $excludeDraftLatest),
        'period' => $range['period'],
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
