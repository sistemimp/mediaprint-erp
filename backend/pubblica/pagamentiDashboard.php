<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\PagamentiRepository;
use PDO;

require __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

/**
 * @return array{start:string,end:string}
 */
function resolveMonthRange(): array
{
    $start = new DateTimeImmutable('first day of this month 00:00:00');
    $end = $start->modify('+1 month');

    return [
        'start' => $start->format('Y-m-d H:i:s'),
        'end' => $end->format('Y-m-d H:i:s'),
    ];
}

try {
    $pdo = Database::getConnection();
    $repo = new PagamentiRepository($pdo);
    $range = resolveMonthRange();

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS totale, COALESCE(SUM(importo), 0) AS totale_importo
         FROM appoggio_pagamenti_fattura
         WHERE data_pagamento >= :start AND data_pagamento < :end'
    );
    $stmt->bindValue(':start', $range['start']);
    $stmt->bindValue(':end', $range['end']);
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
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
