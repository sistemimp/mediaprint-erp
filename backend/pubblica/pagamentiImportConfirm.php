<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;
use MediaPrint\Repo\PagamentiRepository;

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';

if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
    $input = file_get_contents('php://input') ?: '{}';
    $payload = json_decode($input, true);
    if (!is_array($payload)) {
        throw new RuntimeException('Payload non valido.', 422);
    }

    $items = $payload['items'] ?? null;
    if (!is_array($items) || empty($items)) {
        throw new RuntimeException('Specificare almeno un pagamento da importare.', 422);
    }

    $pdo = Database::getConnection();
    $repo = new FattureRepository($pdo);
    $pagamentiRepo = new PagamentiRepository($pdo);

    $inserted = 0;
    $createdIds = [];

    foreach ($items as $index => $row) {
        if (!is_array($row)) {
            continue;
        }
        $dataPagamento = isset($row['data_pagamento']) ? trim((string) $row['data_pagamento']) : null;
        if ($dataPagamento === null || $dataPagamento === '') {
            throw new RuntimeException('Specificare la data pagamento per tutte le righe.', 422);
        }

        $allocations = $row['allocations'] ?? null;
        $allocInsert = [];
        $totalAllocated = 0.0;
        if (is_array($allocations)) {
            foreach ($allocations as $alloc) {
                if (!is_array($alloc)) {
                    continue;
                }
                $fattura = isset($alloc['id_fattura']) ? (int) $alloc['id_fattura'] : 0;
                $importo = isset($alloc['importo']) ? (float) $alloc['importo'] : 0.0;
                if ($fattura <= 0 || $importo <= 0) {
                    throw new RuntimeException('Indicare fattura e importo valido per ogni associazione.', 422);
                }
                $allocInsert[] = [
                    'id_fattura' => $fattura,
                    'importo' => round($importo, 2),
                ];
                $totalAllocated += $importo;
            }
        }

        $importoDocumento = null;
        if (isset($row['importo_totale'])) {
            $rawTotale = (float) $row['importo_totale'];
            if ($rawTotale > 0) {
                $importoDocumento = round($rawTotale, 2);
            }
        }
        if ($importoDocumento === null && $totalAllocated > 0) {
            $importoDocumento = round($totalAllocated, 2);
        }
        if ($importoDocumento === null || $importoDocumento <= 0) {
            throw new RuntimeException('Specificare l\'importo totale per ogni pagamento importato.', 422);
        }

        $importUid = isset($row['import_uid']) ? trim((string) $row['import_uid']) : null;
        if ($importUid === '') {
            $importUid = null;
        }

        $noteParts = [];
        if (!empty($row['reference'])) {
            $noteParts[] = 'Rif: ' . (string) $row['reference'];
        }
        if (!empty($row['note'])) {
            $noteParts[] = (string) $row['note'];
        }
        $note = trim(implode(' - ', array_filter($noteParts)));
        if (empty($allocInsert)) {
            $payment = $pagamentiRepo->createPendingPayment([
                'data_pagamento' => $dataPagamento,
                'id_metodo' => isset($row['id_metodo']) ? (int) $row['id_metodo'] : null,
                'id_mp' => isset($row['id_mp']) ? (int) $row['id_mp'] : null,
                'note' => $note !== '' ? $note : null,
                'importo_documento' => $importoDocumento,
                'import_uid' => $importUid,
                'reference' => $row['reference'] ?? null,
                'cliente_hint' => $row['cliente_nome'] ?? null,
                'id_anagrafica_hint' => isset($row['cliente_id_hint']) ? (int) $row['cliente_id_hint'] : null,
            ]);
            $createdIds[] = $payment['id_pagamento'] ?? null;
            $inserted++;
            continue;
        }

        $isPrimaryAllocation = true;
        foreach ($allocInsert as $allocData) {
            $payment = $repo->savePagamento([
                'id_fattura' => $allocData['id_fattura'],
                'data_pagamento' => $dataPagamento,
                'importo' => $allocData['importo'],
                'importo_documento' => $isPrimaryAllocation ? $importoDocumento : null,
                'import_uid' => $importUid,
                'id_metodo' => isset($row['id_metodo']) && $row['id_metodo'] !== '' ? (int) $row['id_metodo'] : null,
                'id_mp' => isset($row['id_mp']) && $row['id_mp'] !== '' ? (int) $row['id_mp'] : null,
                'note' => $note !== '' ? $note : null,
            ]);
            $isPrimaryAllocation = false;

            $createdIds[] = $payment['id_pagamento'] ?? null;
            $inserted++;
        }
    }

    HttpResponse::json([
        'inserted' => $inserted,
        'ids' => array_values(array_filter($createdIds)),
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
