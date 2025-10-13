<?php
declare(strict_types=1);

require __DIR__ . '/../../../bootstrap.php';

use MediaPrint\Repo\ProdottiRepository;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { HttpResponse::json(['message' => 'OK']); }

try {
    $repo = new ProdottiRepository(Database::getConnection());

    if ($method === 'GET') {
        $id = isset($_GET['id_prodotto']) ? (int) $_GET['id_prodotto'] : 0;
        if ($id <= 0) { throw new RuntimeException('ID non valido', 422); }
        $items = $repo->listPrezziCombinatiByProdotto($id);
        HttpResponse::json(['items' => $items], 200);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input') ?: 'null', true) ?: [];
        $idProdotto = isset($input['id_prodotto']) ? (int) $input['id_prodotto'] : 0;
        if ($idProdotto <= 0) { throw new RuntimeException('ID prodotto non valido', 422); }

        $action = isset($input['action']) ? (string) $input['action'] : '';
        if ($action === 'upsert') {
            $varIds = array_values(isset($input['var_ids']) && is_array($input['var_ids']) ? $input['var_ids'] : []);
            $prezzo = isset($input['prezzo']) ? (float) $input['prezzo'] : 0.0;
            $id = $repo->upsertPrezzoCombinato($idProdotto, $varIds, $prezzo);
            HttpResponse::json(['id' => $id], 200);
        } elseif ($action === 'delete') {
            $varIds = array_values(isset($input['var_ids']) && is_array($input['var_ids']) ? $input['var_ids'] : []);
            $repo->deletePrezzoCombinato($idProdotto, $varIds);
            HttpResponse::json(['ok' => true], 200);
        } else {
            throw new RuntimeException('Azione non valida', 422);
        }
    }

    header('Allow: GET, POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) { $code = 422; }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}

