<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PagamentiRepository;
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
    $pdo = Database::getConnection();
    $repo = new PagamentiRepository($pdo);
    $range = resolveDashboardPeriod($_GET['period'] ?? null);

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS totale, COALESCE(SUM(importo), 0) AS totale_importo
         FROM appoggio_pagamenti_fattura
         WHERE data_pagamento >= :start AND data_pagamento < :end'
    );
    $stmt->bindValue(':start', $range['start']->format('Y-m-d H:i:s'));
    $stmt->bindValue(':end', $range['end']->format('Y-m-d H:i:s'));
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $pagamentiMese = (int) ($row['totale'] ?? 0);
    $importoMese = (float) ($row['totale_importo'] ?? 0);

    $stmt = $pdo->query(
        'SELECT COUNT(*) AS totale, COALESCE(SUM(GREATEST(importo_totale - importo_allocato, 0)), 0) AS residuo
         FROM tb_pagamenti
         WHERE (importo_totale - importo_allocato) > 0.009'
    );
    $row = $stmt ? ($stmt->fetch(PDO::FETCH_ASSOC) ?: []) : [];
    $pendingCount = (int) ($row['totale'] ?? 0);
    $pendingResiduo = (float) ($row['residuo'] ?? 0);

    $latest = [];
    try {
        $stmt = $pdo->query(
            'SELECT * FROM (
                SELECT
                    p.id_pag_fattura AS id_pagamento,
                    p.data_pagamento,
                    p.importo AS importo,
                    a.ragione_sociale AS cliente,
                    a.id_anagrafica AS id_anagrafica,
                    f.numero_documento AS numero_documento,
                    f.anno AS anno,
                    "assigned" AS source
                FROM appoggio_pagamenti_fattura p
                LEFT JOIN tb_fatture f ON f.id_fattura = p.id_fattura
                LEFT JOIN tb_anagrafiche a ON a.id_anagrafica = f.id_anagrafica
                UNION ALL
                SELECT
                    pag.id_pagamento AS id_pagamento,
                    pag.data_pagamento,
                    pag.importo_totale AS importo,
                    pag.cliente_nome_hint AS cliente,
                    pag.id_anagrafica_hint AS id_anagrafica,
                    pag.reference AS numero_documento,
                    NULL AS anno,
                    "pending" AS source
                FROM tb_pagamenti pag
            ) x
            ORDER BY COALESCE(x.data_pagamento, "1970-01-01") DESC, x.id_pagamento DESC
            LIMIT 10'
        );
        $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
        foreach ($rows as $row) {
            $latest[] = [
                'id_pagamento' => (int) $row['id_pagamento'],
                'data_pagamento' => $row['data_pagamento'] ?? null,
                'importo' => isset($row['importo']) ? (float) $row['importo'] : null,
                'cliente' => $row['cliente'] ?? null,
                'id_anagrafica' => isset($row['id_anagrafica']) ? (int) $row['id_anagrafica'] : null,
                'numero_documento' => $row['numero_documento'] ?? null,
                'anno' => isset($row['anno']) ? (int) $row['anno'] : null,
                'source' => $row['source'] ?? null,
            ];
        }
    } catch (Throwable) {
        $latest = [];
    }

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'pagamenti_mese' => $pagamentiMese,
            'importo_mese' => $importoMese,
            'pending_count' => $pendingCount,
            'pending_residuo' => $pendingResiduo,
        ],
        'top_clients' => $repo->listTopClientsByBalance(5),
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
