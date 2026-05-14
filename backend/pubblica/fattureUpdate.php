<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\FattureRepository;

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
    AuthGuard::requirePermissions($auth, ['fatt.write']);

        $input = file_get_contents('php://input');
    $payload = json_decode($input ?: '[]', true);
    if (!is_array($payload)) {
        $payload = $_POST ?? [];
    }

    $id = isset($payload['id_fattura'])
        ? (int) $payload['id_fattura']
        : (isset($payload['id']) ? (int) $payload['id'] : 0);
    if ($id <= 0) {
        throw new RuntimeException('ID fattura mancante o non valido.', 422);
    }

    $updates = [];
    if (array_key_exists('data_fattura', $payload)) {
        $updates['data_fattura'] = $payload['data_fattura'];
    }
    if (array_key_exists('note', $payload)) {
        $updates['note'] = $payload['note'];
    }
    if (array_key_exists('id_stato_fatt', $payload)) {
        $updates['id_stato_fatt'] = $payload['id_stato_fatt'];
    }
    if (array_key_exists('saldo', $payload)) {
        $updates['saldo'] = $payload['saldo'];
    }
    if (array_key_exists('cliente_pec', $payload)) {
        $updates['cliente_pec'] = $payload['cliente_pec'];
    }
    if (array_key_exists('cliente_codice_sdi', $payload)) {
        $updates['cliente_codice_sdi'] = $payload['cliente_codice_sdi'];
    }
    if (array_key_exists('cliente_iban', $payload)) {
        $updates['cliente_iban'] = $payload['cliente_iban'];
    }
    if (array_key_exists('cliente_banca', $payload)) {
        $updates['cliente_banca'] = $payload['cliente_banca'];
    }
    if (array_key_exists('cliente_modalita_pagamento', $payload)) {
        $updates['cliente_modalita_pagamento'] = $payload['cliente_modalita_pagamento'];
    }
    if (array_key_exists('cliente_id_cond_pagamento', $payload)) {
        $updates['cliente_id_cond_pagamento'] = $payload['cliente_id_cond_pagamento'];
    }
    if (array_key_exists('cliente_giorni_pagamento', $payload)) {
        $updates['cliente_giorni_pagamento'] = $payload['cliente_giorni_pagamento'];
    }
    if (array_key_exists('ricalcola_saldi', $payload)) {
        $updates['ricalcola_saldi'] = $payload['ricalcola_saldi'];
    }
    if (array_key_exists('righe', $payload)) {
        $updates['righe'] = is_array($payload['righe']) ? $payload['righe'] : [];
    }

    if (empty($updates)) {
        throw new RuntimeException('Nessun dato da aggiornare per la fattura.', 422);
    }

    $repo = new FattureRepository(Database::getConnection());
    $detail = $repo->updateDetail($id, $updates);

    HttpResponse::json(['data' => $detail], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
