<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\DdtRepository;

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
    AuthGuard::requirePermissions($auth, ['ddt.write']);

        $input = file_get_contents('php://input');
    $payload = json_decode($input ?: '[]', true);
    if (!is_array($payload)) {
        $payload = $_POST ?? [];
    }

    $id = isset($payload['id_ddt'])
        ? (int) $payload['id_ddt']
        : (isset($payload['id']) ? (int) $payload['id'] : 0);
    if ($id <= 0) {
        throw new RuntimeException('ID DDT mancante o non valido.', 422);
    }

    $updates = [];
    if (array_key_exists('id_anagrafica', $payload)) {
        $updates['id_anagrafica'] = $payload['id_anagrafica'];
    }
    if (array_key_exists('data_ddt', $payload)) {
        $updates['data_ddt'] = $payload['data_ddt'];
    }
    if (array_key_exists('id_causale', $payload)) {
        $updates['id_causale'] = $payload['id_causale'];
    }
    if (array_key_exists('note', $payload)) {
        $updates['note'] = $payload['note'];
    }
    if (array_key_exists('destinazione_merce', $payload)) {
        $updates['destinazione_merce'] = $payload['destinazione_merce'];
    }
    if (array_key_exists('aspetto', $payload)) {
        $updates['aspetto'] = $payload['aspetto'];
    }
    if (array_key_exists('numero_colli', $payload)) {
        $updates['numero_colli'] = $payload['numero_colli'];
    }
    if (array_key_exists('cura_trasporto', $payload)) {
        $updates['cura_trasporto'] = $payload['cura_trasporto'];
    }
    if (array_key_exists('data_trasporto', $payload)) {
        $updates['data_trasporto'] = $payload['data_trasporto'];
    }
    if (array_key_exists('vettore', $payload)) {
        $updates['vettore'] = $payload['vettore'];
    }
    if (array_key_exists('id_sede_destinazione', $payload)) {
        $updates['id_sede_destinazione'] = $payload['id_sede_destinazione'];
    }
    if (array_key_exists('id_destinazione_predefinita', $payload)) {
        $updates['id_destinazione_predefinita'] = $payload['id_destinazione_predefinita'];
    }
    if (array_key_exists('stato_documento', $payload)) {
        $updates['stato_documento'] = $payload['stato_documento'];
    }
    if (array_key_exists('righe', $payload)) {
        $updates['righe'] = is_array($payload['righe']) ? $payload['righe'] : [];
    }
    $performedBy = AuthGuard::getAccountId($auth);
    if ($performedBy > 0) {
        $updates['performed_by'] = $performedBy;
    }

    if (empty($updates)) {
        throw new RuntimeException('Nessun dato da aggiornare.', 422);
    }

    $repo = new DdtRepository(Database::getConnection());
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
