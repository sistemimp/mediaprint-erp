<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;
use MediaPrint\Repo\PagamentiRepository;
use MediaPrint\Service\PagamentiImportService;
use MediaPrint\Backend\AuthGuard;

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['pay.write']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        throw new RuntimeException('Accesso non consentito.', 403);
    }

    if (empty($_FILES['file'])) {
        throw new RuntimeException('Caricare un file Excel o CSV.', 422);
    }

    $importer = new PagamentiImportService();
    $parsed = $importer->parseUploadedFile($_FILES['file']);

    $pdo = Database::getConnection();
    $pagamentiRepo = new PagamentiRepository($pdo);
    $fattureRepo = new FattureRepository($pdo);

    $metodi = $fattureRepo->listMetodiPagamento();
    $modalita = $fattureRepo->listModalitaPagamento();
    $metodiMap = [];
    foreach ($metodi as $entry) {
        $code = strtolower((string) $entry['code']);
        $metodiMap[$code] = $entry;
    }
    $modalitaMap = [];
    foreach ($modalita as $entry) {
        $code = strtolower((string) $entry['code']);
        $modalitaMap[$code] = $entry;
    }

    $items = [];
    foreach ($parsed['items'] as $row) {
        $normalized = normalize_import_row($row);
        if (empty($normalized['data_pagamento']) && !empty($normalized['data_valuta'])) {
            $normalized['data_pagamento'] = $normalized['data_valuta'];
        }
        $matchResult = $pagamentiRepo->resolveInvoiceForRow($normalized);
        $metodoInfo = null;
        if (!empty($normalized['metodo'])) {
            $key = strtolower($normalized['metodo']);
            if (isset($metodiMap[$key])) {
                $metodoInfo = $metodiMap[$key];
            } else {
                foreach ($metodi as $entry) {
                    if (strtolower($entry['label']) === $key) {
                        $metodoInfo = $entry;
                        break;
                    }
                }
            }
        }

        $modalitaInfo = null;
        if (!empty($normalized['modalita'])) {
            $key = strtolower($normalized['modalita']);
            if (isset($modalitaMap[$key])) {
                $modalitaInfo = $modalitaMap[$key];
            } else {
                foreach ($modalita as $entry) {
                    if (strtolower($entry['label']) === $key) {
                        $modalitaInfo = $entry;
                        break;
                    }
                }
            }
        }

        $items[] = [
            'temp_id' => bin2hex(random_bytes(8)),
            'reference' => $normalized['reference'] ?? null,
            'data_pagamento' => $normalized['data_pagamento'] ?? null,
            'importo' => $normalized['importo'] ?? null,
            'note' => $normalized['note'] ?? null,
            'cliente' => [
                'nome' => $normalized['cliente_nome'] ?? null,
                'riferimento' => $normalized['cliente_riferimento'] ?? null,
            ],
            'metodo' => $metodoInfo,
            'modalita' => $modalitaInfo,
            'auto_invoice' => $matchResult['match'],
            'warnings' => $matchResult['warnings'],
        ];
    }

    $validRows = array_filter(
        $items,
        static fn ($item) => !empty($item['data_pagamento']) || !empty($item['importo']) || !empty($item['note'])
    );
    if (count($validRows) === 0) {
        throw new RuntimeException('Impossibile interpretare i dati: controllare che il file contenga colonne data/note/importo.', 422);
    }

    HttpResponse::json([
        'items' => $items,
        'headers' => $parsed['headers'],
    ], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function normalize_import_row(array $row): array
{
    $out = [];
    $map = [
        'id_fattura' => ['id_fattura', 'fattura_id'],
        'numero_fattura' => ['numero_fattura', 'fattura_numero', 'num_fattura'],
        'fattura_anno' => ['fattura_anno', 'anno'],
        'cliente_nome' => ['cliente_nome', 'cliente', 'ragione_sociale'],
        'cliente_riferimento' => ['cliente_codice', 'cliente_id'],
        'reference' => ['riferimento', 'reference', 'rif', 'caus', 'causale'],
        'note' => ['note', 'descrizione'],
        'metodo' => ['metodo', 'metodo_pagamento'],
        'modalita' => ['modalita', 'modalita_pagamento', 'mp'],
        'data_pagamento' => ['data_pagamento', 'data', 'operaz', 'operazione', 'data_operazione', 'data_valuta'],
        'data_valuta' => ['data_valuta', 'valuta'],
        'importo' => ['importo', 'amount', 'eur'],
    ];

    foreach ($map as $target => $aliases) {
        foreach ($aliases as $alias) {
            if (array_key_exists($alias, $row) && $row[$alias] !== '') {
                $out[$target] = trim((string) $row[$alias]);
                break;
            }
        }
    }

    if (isset($out['importo'])) {
        $out['importo'] = parse_amount($out['importo']);
    }
    if (isset($out['data_pagamento'])) {
        $out['data_pagamento'] = parse_date_value($out['data_pagamento']);
    }
    if (isset($out['numero_fattura'])) {
        $out['numero_fattura'] = preg_replace('/[^0-9]/', '', (string) $out['numero_fattura']);
    }
    if (isset($out['fattura_anno'])) {
        $out['fattura_anno'] = preg_replace('/[^0-9]/', '', (string) $out['fattura_anno']);
    }
    if (isset($out['id_fattura'])) {
        $out['id_fattura'] = (int) preg_replace('/[^0-9]/', '', (string) $out['id_fattura']);
        if ($out['id_fattura'] <= 0) {
            unset($out['id_fattura']);
        }
    }

    return $out;
}

function parse_amount(string $value): ?float
{
    $clean = str_replace(["\r", "\n", "\t", ' ', "'"], '', $value);
    if ($clean === '') {
        return null;
    }

    $commaPos = strrpos($clean, ',');
    $dotPos = strrpos($clean, '.');
    if ($commaPos !== false && $dotPos !== false) {
        if ($commaPos > $dotPos) {
            // comma acts as decimal separator, dots as thousands
            $clean = str_replace('.', '', $clean);
            $clean = str_replace(',', '.', $clean);
        } else {
            // dot acts as decimal separator, commas as thousands
            $clean = str_replace(',', '', $clean);
        }
    } elseif ($commaPos !== false) {
        $clean = str_replace(',', '.', $clean);
    } else {
        $clean = str_replace(',', '', $clean);
    }

    return is_numeric($clean) ? round((float) $clean, 2) : null;
}

function parse_date_value(string $value): ?string
{
    $trim = trim($value);
    if ($trim === '') {
        return null;
    }
    // Excel serial?
    if (is_numeric($trim)) {
        $base = (int) $trim;
        $date = \DateTime::createFromFormat('Y-m-d', '1899-12-30');
        if ($date) {
            $date->modify('+' . $base . ' days');
            return $date->format('Y-m-d');
        }
    }
    try {
        $dt = new \DateTime($trim);
        return $dt->format('Y-m-d');
    } catch (\Throwable) {
        return null;
    }
}
