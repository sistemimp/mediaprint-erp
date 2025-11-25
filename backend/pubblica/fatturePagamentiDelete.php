<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

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
    $input = file_get_contents('php://input');
    $payload = json_decode($input ?: '[]', true);
    if (!is_array($payload)) {
        $payload = $_POST ?? [];
    }

    $idFattura = isset($payload['id_fattura']) ? (int) $payload['id_fattura'] : 0;
    $idPagamento = isset($payload['id_pagamento'])
        ? (int) $payload['id_pagamento']
        : (isset($payload['id_pag_fattura']) ? (int) $payload['id_pag_fattura'] : 0);
    if ($idPagamento <= 0) {
        throw new RuntimeException('ID pagamento non valido.', 422);
    }

    $repo = new FattureRepository(Database::getConnection());
    $repo->deletePagamento($idFattura, $idPagamento);

    HttpResponse::json(['message' => 'Pagamento eliminato.'], 200);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
