<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
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

    $idPagamento = isset($payload['id_pagamento']) ? (int) $payload['id_pagamento'] : (isset($payload['id']) ? (int) $payload['id'] : 0);
    if ($idPagamento <= 0) {
        throw new RuntimeException('ID pagamento mancante o non valido.', 422);
    }

    $idAnagrafica = null;
    if (array_key_exists('id_anagrafica', $payload)) {
        if ($payload['id_anagrafica'] === '' || $payload['id_anagrafica'] === null) {
            $idAnagrafica = null;
        } else {
            $idAnagrafica = (int) $payload['id_anagrafica'];
            if ($idAnagrafica <= 0) {
                $idAnagrafica = null;
            }
        }
    }

    $repo = new PagamentiRepository(Database::getConnection());
    $detail = $repo->assignPendingPaymentToAnagrafica($idPagamento, $idAnagrafica);

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
