<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Backend\AuthGuard;

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
    AuthGuard::requirePermissions($auth, ['prev.read']);
    $allowed = null;
    $isAcquisto = isset($_GET['is_acquisto']) ? (int) $_GET['is_acquisto'] : 0;
    $excludeDraftLatest = false;
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        $excludeDraftLatest = true;
        if ($allowed === []) {
            HttpResponse::json([
                'ok' => true,
                'conversion' => ['total' => 0, 'accepted' => 0],
                'series' => [],
                'status_counts' => [],
                'top_clients' => [],
                'latest' => [],
                'period' => $_GET['period'] ?? 'monthly',
            ], 200);
            return;
        }
    }

    $pdo = Database::getConnection();
    $repo = new PreventiviRepository($pdo);

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
        $allowedClause = ' AND p.id_anagrafica IN (' . implode(',', $placeholders) . ')';
    }

    $stmt = $pdo->prepare(
        'SELECT
            COUNT(p.id_preventivo) AS total,
            SUM(CASE WHEN sp.code = \'confermato\' THEN 1 ELSE 0 END) AS accepted
         FROM tb_preventivi p
         LEFT JOIN cfg_stati_preventivo sp ON sp.id_stato = p.id_stato_prev
         WHERE COALESCE(p.data_preventivo, p.created_at) >= :start
           AND COALESCE(p.data_preventivo, p.created_at) < :end
           AND p.is_acquisto = :is_acquisto'
        . $allowedClause
    );
    $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    $stmt->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
    foreach ($allowedParams as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $conversion = [
        'total' => (int) ($row['total'] ?? 0),
        'accepted' => (int) ($row['accepted'] ?? 0),
    ];

    $series = $repo->fetchConversionSeriesLast6($allowed, $isAcquisto);

    $statusStmt = $pdo->prepare(
        'SELECT
            s.id_stato,
            s.code,
            s.label,
            s.ordering,
            COUNT(p.id_preventivo) AS tot
         FROM cfg_stati_preventivo s
         LEFT JOIN tb_preventivi p
           ON p.id_stato_prev = s.id_stato
          AND COALESCE(p.data_preventivo, p.created_at) >= :start
          AND COALESCE(p.data_preventivo, p.created_at) < :end
          AND p.is_acquisto = :is_acquisto'
        . $allowedClause . '
         WHERE s.attivo = 1
         GROUP BY s.id_stato, s.code, s.label, s.ordering
         ORDER BY s.ordering ASC, s.id_stato ASC'
    );
    $statusStmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $statusStmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    $statusStmt->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
    foreach ($allowedParams as $key => $value) {
        $statusStmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $statusStmt->execute();
    $rows = $statusStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $statusCounts = [];
    foreach ($rows as $r) {
        $statusCounts[] = [
            'id_stato' => (int) $r['id_stato'],
            'code' => (string) $r['code'],
            'label' => (string) $r['label'],
            'ordering' => (int) $r['ordering'],
            'tot' => (int) $r['tot'],
        ];
    }

    $topStmt = $pdo->prepare(
        'SELECT
            a.id_anagrafica,
            a.ragione_sociale,
            COUNT(p.id_preventivo) AS num_preventivi,
            COALESCE(SUM(p.totale), 0) AS totale
         FROM tb_preventivi p
         LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = p.id_anagrafica
         WHERE COALESCE(p.data_preventivo, p.created_at) >= :start
           AND COALESCE(p.data_preventivo, p.created_at) < :end
           AND p.is_acquisto = :is_acquisto'
        . $allowedClause . '
         GROUP BY a.id_anagrafica, a.ragione_sociale
         ORDER BY totale DESC
         LIMIT 5'
    );
    $topStmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $topStmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    $topStmt->bindValue(':is_acquisto', $isAcquisto, PDO::PARAM_INT);
    foreach ($allowedParams as $key => $value) {
        $topStmt->bindValue($key, $value, PDO::PARAM_INT);
    }
    $topStmt->execute();
    $rows = $topStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $topClients = [];
    foreach ($rows as $row) {
        $topClients[] = [
            'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
            'ragione_sociale' => $row['ragione_sociale'] ?? null,
            'num_preventivi' => (int) $row['num_preventivi'],
            'totale' => (float) $row['totale'],
        ];
    }

    $latest = $repo->listLatest(10, $allowed, $excludeDraftLatest, $isAcquisto);

    HttpResponse::json([
        'ok' => true,
        'conversion' => $conversion,
        'series' => $series,
        'status_counts' => $statusCounts,
        'top_clients' => $topClients,
        'latest' => $latest,
        'period' => $range['period'],
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
