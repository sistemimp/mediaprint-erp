<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Backend\AuthGuard;
use PDO;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

/**
 * @return array{start:DateTimeImmutable,end:DateTimeImmutable,period:string,months:int}
 */
function resolveDashboardPeriod(?string $periodRaw): array
{
    $period = strtolower(trim((string) $periodRaw));
    $allowed = ['monthly', 'quarterly', 'semiannual', 'yearly'];
    if (!in_array($period, $allowed, true)) {
        $period = 'monthly';
    }

    $now = new DateTimeImmutable('now');
    $year = (int) $now->format('Y');
    $month = (int) $now->format('n');
    $months = 1;

    if ($period === 'quarterly') {
        $quarterIndex = intdiv($month - 1, 3);
        $startMonth = ($quarterIndex * 3) + 1;
        $months = 3;
        $start = new DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
    } elseif ($period === 'semiannual') {
        $startMonth = $month <= 6 ? 1 : 7;
        $months = 6;
        $start = new DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
    } elseif ($period === 'yearly') {
        $months = 12;
        $start = new DateTimeImmutable(sprintf('%d-01-01 00:00:00', $year));
    } else {
        $start = new DateTimeImmutable($now->format('Y-m-01 00:00:00'));
    }

    $end = $start->modify('+' . $months . ' months');

    return [
        'start' => $start,
        'end' => $end,
        'period' => $period,
        'months' => $months,
    ];
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['anag.view']);
    $allowed = null;
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        if ($allowed === []) {
            HttpResponse::json([
                'ok' => true,
                'kpi' => [
                    'totale_generale' => 0,
                    'nuovi_mese_corrente' => 0,
                    'nuovi_mese_precedente' => 0,
                    'perc_change_mom' => null,
                    'period' => $_GET['period'] ?? 'monthly',
                ],
                'status_counts' => [],
                'latest' => [],
            ], 200);
            return;
        }
    }

    $pdo = Database::getConnection();

    $onlyActive = isset($_GET['only_active']) && (int) $_GET['only_active'] === 1;
    $range = resolveDashboardPeriod($_GET['period'] ?? null);
    $prevStart = $range['start']->modify('-' . $range['months'] . ' months');
    $prevEnd = $range['start'];
    $activeWhere = $onlyActive ? " WHERE stato = 'attiva'" : '';
    $allowedClause = '';
    $allowedParams = [];
    if (is_array($allowed)) {
        $placeholders = [];
        foreach ($allowed as $index => $id) {
            $key = ':allowed_' . $index;
            $placeholders[] = $key;
            $allowedParams[$key] = $id;
        }
        $allowedClause = ' AND id_anagrafica IN (' . implode(',', $placeholders) . ')';
    }

    $statusCounts = [];
    try {
        $sql = 'SELECT COALESCE(stato, "sconosciuto") AS stato, COUNT(*) AS totale
             FROM tb_anagrafiche'
            . ($onlyActive ? " WHERE stato = 'attiva'" : ' WHERE 1=1')
            . $allowedClause . '
             GROUP BY COALESCE(stato, "sconosciuto")
             ORDER BY totale DESC';
        if ($allowedClause === '') {
            $stmt = $pdo->query($sql);
        } else {
            $stmt = $pdo->prepare($sql);
            foreach ($allowedParams as $key => $value) {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            }
            $stmt->execute();
        }
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
        $stmt = $pdo->prepare(
            'SELECT id_anagrafica, ragione_sociale, piva, codice_fiscale, stato, created_at
             FROM tb_anagrafiche
             WHERE created_at >= :start AND created_at < :end'
            . ($onlyActive ? " AND stato = 'attiva'" : '')
            . $allowedClause . '
             ORDER BY created_at DESC
             LIMIT 10'
        );
        $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
        $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
        foreach ($allowedParams as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
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

    if ($allowedClause === '') {
        $totalStmt = $pdo->query('SELECT COUNT(*) FROM tb_anagrafiche' . $activeWhere);
        $totalGenerale = (int) ($totalStmt ? ($totalStmt->fetchColumn() ?: 0) : 0);
    } else {
        $totalStmt = $pdo->prepare('SELECT COUNT(*) FROM tb_anagrafiche' . ($onlyActive ? " WHERE stato = 'attiva'" : ' WHERE 1=1') . $allowedClause);
        foreach ($allowedParams as $key => $value) {
            $totalStmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $totalStmt->execute();
        $totalGenerale = (int) ($totalStmt->fetchColumn() ?: 0);
    }

    $countStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM tb_anagrafiche
         WHERE created_at >= :start AND created_at < :end'
        . ($onlyActive ? " AND stato = 'attiva'" : '')
        . $allowedClause
    );
    $countStmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $countStmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    foreach ($allowedParams as $key => $value) {
        $countStmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $countStmt->execute();
    $newCurrent = (int) ($countStmt->fetchColumn() ?: 0);

    $prevStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM tb_anagrafiche
         WHERE created_at >= :start AND created_at < :end'
        . ($onlyActive ? " AND stato = 'attiva'" : '')
        . $allowedClause
    );
    $prevStmt->bindValue(':start', $prevStart->format('Y-m-d H:i:s'));
    $prevStmt->bindValue(':end', $prevEnd->format('Y-m-d H:i:s'));
    foreach ($allowedParams as $key => $value) {
        $prevStmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $prevStmt->execute();
    $newPrev = (int) ($prevStmt->fetchColumn() ?: 0);

    $percChange = $newPrev === 0 ? null : round((($newCurrent - $newPrev) / $newPrev) * 100, 1);

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'totale_generale' => $totalGenerale,
            'nuovi_mese_corrente' => $newCurrent,
            'nuovi_mese_precedente' => $newPrev,
            'perc_change_mom' => $percChange,
            'period' => $range['period'],
        ],
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
