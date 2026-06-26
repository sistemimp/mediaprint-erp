<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\AccountsRepository;
use MediaPrint\Repo\ClienteFondiRepository;

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

    $input = file_get_contents('php://input');
    $payload = json_decode($input ?: '[]', true);
    if (!is_array($payload)) {
        $payload = $_POST ?? [];
    }

    $idFondo = isset($payload['id_fondo']) ? (int) $payload['id_fondo'] : 0;
    $idAnagrafica = isset($payload['id_anagrafica']) ? (int) $payload['id_anagrafica'] : 0;
    $causaleCode = isset($payload['causale_code']) ? (string) $payload['causale_code'] : '';
    $causaleLabel = isset($payload['causale_label']) ? (string) $payload['causale_label'] : '';
    $tipo = strtolower(trim((string) ($payload['tipo_movimento'] ?? '')));
    $importo = isset($payload['importo']) ? (float) $payload['importo'] : 0.0;
    $allocazioni = isset($payload['allocazioni']) && is_array($payload['allocazioni']) ? $payload['allocazioni'] : [];
    $note = isset($payload['note']) ? trim((string) $payload['note']) : null;

    if ($idFondo <= 0) {
        if ($idAnagrafica <= 0) {
            throw new RuntimeException('Specificare id_fondo oppure id_anagrafica.', 422);
        }
        if ($causaleCode === '') {
            throw new RuntimeException('causale_code obbligatorio quando manca id_fondo.', 422);
        }
    }
    if (!in_array($tipo, ['entrata', 'uscita'], true)) {
        throw new RuntimeException('tipo_movimento non valido (entrata|uscita).', 422);
    }
    if ($importo <= 0 && !($tipo === 'uscita' && $allocazioni !== [])) {
        throw new RuntimeException('importo deve essere maggiore di zero.', 422);
    }

    $repo = new ClienteFondiRepository(Database::getConnection());

    if ($idFondo > 0) {
        $fondo = $repo->getFondo($idFondo);
        if ($fondo === null) {
            throw new RuntimeException('Fondo non trovato.', 404);
        }
        $idAnagraficaTarget = (int) $fondo['id_anagrafica'];
    } else {
        $fondo = $repo->ensureFondo($idAnagrafica, $causaleCode, $causaleLabel);
        $idFondo = (int) $fondo['id_fondo'];
        $idAnagraficaTarget = (int) $fondo['id_anagrafica'];
    }

    if (AuthGuard::getAccountType($auth) === 'cliente') {
        $accountsRepo = new AccountsRepository(Database::getConnection());
        $allowed = $accountsRepo->listAccountAnagraficheIds(AuthGuard::getAccountId($auth));
        if (!in_array($idAnagraficaTarget, $allowed, true)) {
            throw new RuntimeException('Accesso non consentito.', 403);
        }
    }

    $meta = [
        'note' => $note,
        'created_by' => AuthGuard::getAccountId($auth),
        'riferimento_tipo' => $payload['riferimento_tipo'] ?? null,
        'riferimento_id' => isset($payload['riferimento_id']) ? (int) $payload['riferimento_id'] : null,
        'id_fattura' => isset($payload['id_fattura']) ? (int) $payload['id_fattura'] : null,
        'id_lavorazione' => isset($payload['id_lavorazione']) ? (int) $payload['id_lavorazione'] : null,
        'id_pagamento' => isset($payload['id_pagamento']) ? (int) $payload['id_pagamento'] : null,
        'data_allocazione' => isset($payload['data_allocazione']) ? trim((string) $payload['data_allocazione']) : null,
    ];
    if ($tipo === 'entrata') {
        $result = $repo->addEntrata($idFondo, $importo, $meta);
    } elseif ($allocazioni !== []) {
        $result = $repo->allocateUscitaToFatture($idFondo, $allocazioni, [
            'note' => $note,
            'created_by' => AuthGuard::getAccountId($auth),
            'data_allocazione' => $meta['data_allocazione'] ?? null,
        ]);
    } else {
        $result = $repo->addUscita($idFondo, $importo, $meta);
    }

    $updatedFondo = $repo->getFondo($idFondo);
    HttpResponse::json(['data' => $result, 'fondo' => $updatedFondo], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
