<?php
declare(strict_types=1);

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
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

/**
 * @param array<int,array{nome:string,categoria:?string}> $variations
 */
function buildComboLabel(string $comboKey, array $variations): string
{
    $ids = array_values(array_filter(array_map('intval', explode('+', (string) $comboKey)), static fn (int $id): bool => $id > 0));
    if ($ids === []) {
        return '';
    }

    $groups = [];
    foreach ($ids as $id) {
        if (isset($variations[$id])) {
            $categoria = $variations[$id]['categoria'] ?: 'Opzione';
            $groups[$categoria][] = $variations[$id]['nome'];
        } else {
            $groups['Opzione'][] = '#' . $id;
        }
    }

    $parts = [];
    foreach ($groups as $categoria => $names) {
        $parts[] = $categoria . ': ' . implode(', ', $names);
    }

    return implode(' ; ', $parts);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prod.read']);

    if (AuthGuard::getAccountType($auth) === 'cliente') {
        HttpResponse::json([
            'ok' => true,
            'kpi' => [
                'prodotti_totali' => 0,
                'prodotti_fatturati' => 0,
                'quantita_totale' => 0,
                'fatturato_totale' => 0,
            ],
            'items' => [],
            'period' => $_GET['period'] ?? 'monthly',
            'combo_stats_supported' => false,
        ], 200);
        return;
    }

    $pdo = Database::getConnection();
    $range = resolveDashboardPeriod($_GET['period'] ?? null);
    $periodStart = $range['start']->format('Y-m-d H:i:s');
    $periodEnd = $range['end']->format('Y-m-d H:i:s');

    $productStmt = $pdo->prepare(
        'SELECT
            p.id_prodotto,
            p.nome,
            p.codice,
            c.nome AS categoria,
            COALESCE(stats.quantita, 0) AS quantita,
            COALESCE(stats.fatturato, 0) AS fatturato,
            COALESCE(stats.righe, 0) AS righe,
            COALESCE(stats.fatture, 0) AS fatture
         FROM tb_prodotti p
         LEFT JOIN tb_categorie c ON c.id_categoria = p.id_categoria
         LEFT JOIN (
            SELECT
                r.id_prodotto,
                SUM(r.quantita) AS quantita,
                SUM(r.totale) AS fatturato,
                COUNT(*) AS righe,
                COUNT(DISTINCT f.id_fattura) AS fatture
            FROM tb_fatture_righe r
            JOIN tb_fatture f ON f.id_fattura = r.id_fattura
            LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
            WHERE COALESCE(f.data_fattura, f.created_at) >= :start
              AND COALESCE(f.data_fattura, f.created_at) < :end
              AND (sf.code IS NULL OR sf.code <> \'bozza\')
            GROUP BY r.id_prodotto
         ) stats ON stats.id_prodotto = p.id_prodotto
         ORDER BY fatturato DESC, p.nome ASC'
    );
    $productStmt->bindValue(':start', $periodStart);
    $productStmt->bindValue(':end', $periodEnd);
    $productStmt->execute();
    $productRows = $productStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $comboPricing = [];
    $comboStmt = $pdo->query(
        'SELECT id_prodotto, combo_key, prezzo
         FROM tb_prezzi_variazioni
         ORDER BY id_prodotto ASC, combo_key ASC'
    );
    $comboRows = $comboStmt ? ($comboStmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    foreach ($comboRows as $row) {
        $prodId = (int) ($row['id_prodotto'] ?? 0);
        $comboKey = (string) ($row['combo_key'] ?? '');
        if ($prodId <= 0 || $comboKey === '') {
            continue;
        }
        if (!isset($comboPricing[$prodId])) {
            $comboPricing[$prodId] = [];
        }
        $comboPricing[$prodId][$comboKey] = [
            'combo_key' => $comboKey,
            'prezzo_listino' => isset($row['prezzo']) ? (float) $row['prezzo'] : null,
            'quantita' => 0,
            'fatturato' => 0,
            'righe' => 0,
            'fatture' => 0,
        ];
    }

    $comboStatsSupported = false;
    try {
        $checkStmt = $pdo->query("SHOW COLUMNS FROM tb_fatture_righe LIKE 'combo_key'");
        $comboStatsSupported = $checkStmt && $checkStmt->fetch(PDO::FETCH_ASSOC) !== false;
    } catch (Throwable) {
        $comboStatsSupported = false;
    }

    if ($comboStatsSupported) {
        $comboStatsStmt = $pdo->prepare(
            'SELECT
                r.id_prodotto,
                r.combo_key,
                SUM(r.quantita) AS quantita,
                SUM(r.totale) AS fatturato,
                COUNT(*) AS righe,
                COUNT(DISTINCT f.id_fattura) AS fatture
             FROM tb_fatture_righe r
             JOIN tb_fatture f ON f.id_fattura = r.id_fattura
             LEFT JOIN cfg_stati_fattura sf ON sf.id_stato = f.id_stato_fatt
             WHERE r.combo_key IS NOT NULL
               AND r.combo_key <> \'\'
               AND COALESCE(f.data_fattura, f.created_at) >= :start
               AND COALESCE(f.data_fattura, f.created_at) < :end
               AND (sf.code IS NULL OR sf.code <> \'bozza\')
             GROUP BY r.id_prodotto, r.combo_key'
        );
        $comboStatsStmt->bindValue(':start', $periodStart);
        $comboStatsStmt->bindValue(':end', $periodEnd);
        $comboStatsStmt->execute();
        $comboStatsRows = $comboStatsStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($comboStatsRows as $row) {
            $prodId = (int) ($row['id_prodotto'] ?? 0);
            $comboKey = (string) ($row['combo_key'] ?? '');
            if ($prodId <= 0 || $comboKey === '') {
                continue;
            }
            if (!isset($comboPricing[$prodId])) {
                $comboPricing[$prodId] = [];
            }
            if (!isset($comboPricing[$prodId][$comboKey])) {
                $comboPricing[$prodId][$comboKey] = [
                    'combo_key' => $comboKey,
                    'prezzo_listino' => null,
                    'quantita' => 0,
                    'fatturato' => 0,
                    'righe' => 0,
                    'fatture' => 0,
                ];
            }
            $comboPricing[$prodId][$comboKey]['quantita'] = isset($row['quantita']) ? (float) $row['quantita'] : 0;
            $comboPricing[$prodId][$comboKey]['fatturato'] = isset($row['fatturato']) ? (float) $row['fatturato'] : 0;
            $comboPricing[$prodId][$comboKey]['righe'] = isset($row['righe']) ? (int) $row['righe'] : 0;
            $comboPricing[$prodId][$comboKey]['fatture'] = isset($row['fatture']) ? (int) $row['fatture'] : 0;
        }
    }

    $comboKeys = [];
    foreach ($comboPricing as $prodCombos) {
        foreach ($prodCombos as $comboKey => $combo) {
            $ids = array_values(array_filter(array_map('intval', explode('+', (string) $comboKey)), static fn (int $id): bool => $id > 0));
            foreach ($ids as $id) {
                $comboKeys[$id] = true;
            }
        }
    }

    $variations = [];
    if ($comboKeys !== []) {
        $ids = array_keys($comboKeys);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $varStmt = $pdo->prepare(
            'SELECT id_variazione, nome, categoria
             FROM tb_variazioni
             WHERE id_variazione IN (' . $placeholders . ')'
        );
        foreach ($ids as $index => $id) {
            $varStmt->bindValue($index + 1, $id, PDO::PARAM_INT);
        }
        $varStmt->execute();
        $varRows = $varStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($varRows as $row) {
            $varId = (int) ($row['id_variazione'] ?? 0);
            if ($varId <= 0) {
                continue;
            }
            $variations[$varId] = [
                'nome' => (string) ($row['nome'] ?? ('#' . $varId)),
                'categoria' => isset($row['categoria']) && $row['categoria'] !== '' ? (string) $row['categoria'] : null,
            ];
        }
    }

    $items = [];
    $fatturatoTotale = 0.0;
    $quantitaTotale = 0.0;
    $prodottiFatturati = 0;
    foreach ($productRows as $row) {
        $prodId = (int) ($row['id_prodotto'] ?? 0);
        $fatturato = isset($row['fatturato']) ? (float) $row['fatturato'] : 0.0;
        $quantita = isset($row['quantita']) ? (float) $row['quantita'] : 0.0;
        $fatturatoTotale += $fatturato;
        $quantitaTotale += $quantita;
        if ($fatturato > 0) {
            $prodottiFatturati++;
        }

        $comboList = [];
        if (isset($comboPricing[$prodId])) {
            foreach ($comboPricing[$prodId] as $combo) {
                $label = buildComboLabel((string) $combo['combo_key'], $variations);
                $comboList[] = [
                    'combo_key' => $combo['combo_key'],
                    'combo_label' => $label !== '' ? $label : null,
                    'prezzo_listino' => $combo['prezzo_listino'],
                    'quantita' => $combo['quantita'],
                    'fatturato' => $combo['fatturato'],
                    'righe' => $combo['righe'],
                    'fatture' => $combo['fatture'],
                ];
            }
            usort($comboList, static function (array $a, array $b): int {
                $byRevenue = ($b['fatturato'] ?? 0) <=> ($a['fatturato'] ?? 0);
                if ($byRevenue !== 0) {
                    return $byRevenue;
                }
                return strcmp((string) ($a['combo_key'] ?? ''), (string) ($b['combo_key'] ?? ''));
            });
        }

        $items[] = [
            'id_prodotto' => $prodId,
            'nome' => $row['nome'] ?? null,
            'codice' => $row['codice'] ?? null,
            'categoria' => $row['categoria'] ?? null,
            'quantita' => $quantita,
            'fatturato' => $fatturato,
            'righe' => isset($row['righe']) ? (int) $row['righe'] : 0,
            'fatture' => isset($row['fatture']) ? (int) $row['fatture'] : 0,
            'combinazioni' => $comboList,
        ];
    }

    HttpResponse::json([
        'ok' => true,
        'kpi' => [
            'prodotti_totali' => count($productRows),
            'prodotti_fatturati' => $prodottiFatturati,
            'quantita_totale' => $quantitaTotale,
            'fatturato_totale' => $fatturatoTotale,
        ],
        'items' => $items,
        'period' => $range['period'],
        'combo_stats_supported' => $comboStatsSupported,
    ], 200);
} catch (Throwable $exception) {
    $code = (int) ($exception->getCode() ?: 500);
    if ($code < 400 || $code > 599) {
        $code = 500;
    }
    HttpResponse::error('Errore interno inatteso.', $code, ['error' => $exception->getMessage()]);
}
