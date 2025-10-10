<?php
declare(strict_types=1);

require __DIR__ . '/../../../bootstrap.php';

use MediaPrint\Repo\ProdottiRepository;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    HttpResponse::json(['message' => 'OK']);
}

try {
    $repo = new ProdottiRepository(Database::getConnection());

    if ($method === 'GET') {
        $id = isset($_GET['id_prodotto']) ? (int) $_GET['id_prodotto'] : 0;
        if ($id <= 0) { throw new RuntimeException('ID non valido', 422); }
        $items = $repo->listVariazioniByProdotto($id);
        HttpResponse::json(['items' => $items], 200);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input') ?: 'null', true) ?: [];
        $idProdotto = isset($input['id_prodotto']) ? (int) $input['id_prodotto'] : 0;
        $idVariazione = isset($input['id_variazione']) ? (int) $input['id_variazione'] : 0;
        $action = isset($input['action']) ? (string) $input['action'] : '';
        if ($idProdotto <= 0 || $idVariazione <= 0) { throw new RuntimeException('Parametri non validi', 422); }

        if ($action === 'link') {
            $delta = isset($input['delta']) ? (float) $input['delta'] : 0.0;
            $repo->linkVariazioneToProdotto($idProdotto, $idVariazione, $delta);
            HttpResponse::json(['ok' => true], 200);
        } elseif ($action === 'unlink') {
            $repo->unlinkVariazioneFromProdotto($idProdotto, $idVariazione);
            HttpResponse::json(['ok' => true], 200);
        } elseif ($action === 'set') {
            $delta = isset($input['delta']) ? (float) $input['delta'] : 0.0;
            $repo->updateVariazioneDelta($idProdotto, $idVariazione, $delta);
            HttpResponse::json(['ok' => true], 200);
        } else {
            throw new RuntimeException('Azione non valida', 422);
        }
    }

    header('Allow: GET, POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
