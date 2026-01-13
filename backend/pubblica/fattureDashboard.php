<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;
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

    $now = new DateTimeImmutable('now');
    $year = (int) $now->format('Y');
    $month = (int) $now->format('n');

    if ($period === 'quarterly') {
        $quarterIndex = intdiv($month - 1, 3);
        $startMonth = ($quarterIndex * 3) + 1;
        $start = new DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
        $end = $start->modify('+3 months');
    } elseif ($period === 'semiannual') {
        $startMonth = $month <= 6 ? 1 : 7;
        $start = new DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $year, $startMonth));
        $end = $start->modify('+6 months');
    } elseif ($period === 'yearly') {
        $start = new DateTimeImmutable(sprintf('%d-01-01 00:00:00', $year));
        $end = $start->modify('+1 year');
    } else {
        $start = new DateTimeImmutable($now->format('Y-m-01 00:00:00'));
        $end = $start->modify('+1 month');
    }

    return [
        'start' => $start,
        'end' => $end,
        'period' => $period,
    ];
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['fatt.read']);
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
                    'fatturato_mese' => 0,
                    'fatture_mese' => 0,
                    'fatture_aperte' => 0,
                    'saldo_aperto' => 0,
                ],
                'series' => [],
                'top_clients' => [],
                'latest' => [],
                'period' => $_GET['period'] ?? 'monthly',
            ], 200);
            return;
        }
    }
    $pdo = Database::getConnection();
    $repo = new FattureRepository($pdo);
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
        $allowedClause = ' AND f.id_anagrafica IN (' . implode(',', $placeholders) . ')';
    }

    $fatturatoMese = $repo->fetchCurrentMonthRevenue($allowed);

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS totale
         FROM tb_fatture f
         LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
         WHERE COALESCE(f.data_fattura, f.created_at) >= :start
           AND COALESCE(f.data_fattura, f.created_at) < :end
           AND (sf.code IS NULL OR sf.code <> \'bozza\')'
        . $allowedClause
    );
    $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    foreach ($allowedParams as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $stmt->execute();
    $fattureMese = (int) ($stmt->fetchColumn() ?: 0);

    if ($allowedClause === '') {
        $stmt = $pdo->query(
            'SELECT COUNT(*) AS total, COALESCE(SUM(saldo), 0) AS totale_saldo
             FROM tb_fatture f
             LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
             WHERE (sf.code IS NULL OR sf.code <> \'bozza\')
               AND f.saldo > 0.009'
        );
        $row = $stmt ? ($stmt->fetch(PDO::FETCH_ASSOC) ?: []) : [];
    } else {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS total, COALESCE(SUM(saldo), 0) AS totale_saldo
             FROM tb_fatture f
             LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
             WHERE (sf.code IS NULL OR sf.code <> \'bozza\')
               AND f.saldo > 0.009'
            . $allowedClause
        );
        foreach ($allowedParams as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_INT);
        }
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }
    $fattureAperte = (int) ($row['total'] ?? 0);
    $saldoAperto = (float) ($row['totale_saldo'] ?? 0);

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'fatturato_mese' => $fatturatoMese,
            'fatture_mese' => $fattureMese,
            'fatture_aperte' => $fattureAperte,
            'saldo_aperto' => $saldoAperto,
        ],
        'series' => $repo->fetchMonthlyTotalsLast12($allowed),
        'top_clients' => $repo->listTopClientsByRevenue(
            $range['start']->format('Y-m-d H:i:s'),
            $range['end']->format('Y-m-d H:i:s'),
            5,
            $allowed
        ),
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
