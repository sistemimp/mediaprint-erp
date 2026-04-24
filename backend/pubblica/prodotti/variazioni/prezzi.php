<?php
declare(strict_types=1);

require __DIR__ . '/../../../bootstrap.php';

use MediaPrint\Repo\ProdottiRepository;
use MediaPrint\Repo\MagazzinoRepository;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Backend\AuthGuard;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { HttpResponse::json(['message' => 'OK']); }

try {
    $auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prod.read']);
    if (AuthGuard::getAccountType($auth) === 'cliente') {
        HttpResponse::json(['items' => []], 200);
        return;
    }

    $connection = Database::getConnection();
    $repo = new ProdottiRepository($connection);
    $magazzinoRepo = new MagazzinoRepository($connection);

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
        // Normalizzazione unica usata da upsert/delete singoli e bulk per produrre combo_key canonica.
        $normalizeVarIds = static function (array $ids): array {
            $filtered = array_values(array_filter(array_map(
                static fn ($value): int => (int) $value,
                $ids
            ), static fn (int $value): bool => $value > 0));
            sort($filtered, SORT_NUMERIC);
            return $filtered;
        };

        $action = isset($input['action']) ? (string) $input['action'] : '';
        if ($action === 'upsert') {
            $varIds = array_values(isset($input['var_ids']) && is_array($input['var_ids']) ? $input['var_ids'] : []);
            $prezzo = isset($input['prezzo']) ? (float) $input['prezzo'] : 0.0;
            $id = $repo->upsertPrezzoCombinato($idProdotto, $varIds, $prezzo);
            $seeded = $magazzinoRepo->seedComboConsumptionsFromVariations($idProdotto, $varIds);
            HttpResponse::json(['id' => $id, 'seeded_articles' => $seeded], 200);
        } elseif ($action === 'bulk_upsert') {
            $rows = isset($input['rows']) && is_array($input['rows']) ? $input['rows'] : [];
            if (count($rows) === 0) {
                HttpResponse::json(['ok' => true, 'processed' => 0, 'seeded_articles' => 0], 200);
                return;
            }
            // Guardia applicativa per evitare richieste massive in un'unica transazione.
            if (count($rows) > 2000) {
                throw new RuntimeException('Troppe combinazioni in una singola richiesta.', 422);
            }

            $started = false;
            if (!$connection->inTransaction()) {
                $connection->beginTransaction();
                $started = true;
            }
            try {
                $processed = 0;
                $seededTotal = 0;
                foreach ($rows as $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $varIds = array_values(isset($row['var_ids']) && is_array($row['var_ids']) ? $row['var_ids'] : []);
                    $normalizedVarIds = $normalizeVarIds($varIds);
                    if (count($normalizedVarIds) === 0) {
                        continue;
                    }
                    $prezzo = isset($row['prezzo']) ? (float) $row['prezzo'] : 0.0;
                    $repo->upsertPrezzoCombinato($idProdotto, $normalizedVarIds, $prezzo);
                    // Sincronizza automaticamente i consumi magazzino in base alle variazioni selezionate.
                    $seededTotal += $magazzinoRepo->seedComboConsumptionsFromVariations($idProdotto, $normalizedVarIds);
                    $processed++;
                }

                if ($started && $connection->inTransaction()) {
                    $connection->commit();
                }
                HttpResponse::json([
                    'ok' => true,
                    'processed' => $processed,
                    'seeded_articles' => $seededTotal,
                ], 200);
            } catch (Throwable $e) {
                if ($started && $connection->inTransaction()) {
                    $connection->rollBack();
                }
                throw $e;
            }
        } elseif ($action === 'delete') {
            $varIds = array_values(isset($input['var_ids']) && is_array($input['var_ids']) ? $input['var_ids'] : []);
            $repo->deletePrezzoCombinato($idProdotto, $varIds);
            $normalizedVarIds = $normalizeVarIds($varIds);
            if (count($normalizedVarIds) > 0) {
                $comboKey = implode('+', $normalizedVarIds);
                // Rimuove anche gli eventuali consumi magazzino associati alla combinazione.
                $magazzinoRepo->replaceProductConsumptions($idProdotto, $comboKey, null, []);
            }
            HttpResponse::json(['ok' => true], 200);
        } elseif ($action === 'bulk_delete') {
            $rows = isset($input['rows']) && is_array($input['rows']) ? $input['rows'] : [];
            if (count($rows) === 0) {
                HttpResponse::json(['ok' => true, 'deleted' => 0], 200);
                return;
            }
            // Stessa soglia del bulk_upsert per tempi/lock prevedibili.
            if (count($rows) > 2000) {
                throw new RuntimeException('Troppe combinazioni in una singola richiesta.', 422);
            }

            $started = false;
            if (!$connection->inTransaction()) {
                $connection->beginTransaction();
                $started = true;
            }
            try {
                $deleted = 0;
                foreach ($rows as $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $varIds = array_values(isset($row['var_ids']) && is_array($row['var_ids']) ? $row['var_ids'] : []);
                    $normalizedVarIds = $normalizeVarIds($varIds);
                    if (count($normalizedVarIds) === 0) {
                        continue;
                    }
                    $repo->deletePrezzoCombinato($idProdotto, $normalizedVarIds);
                    $comboKey = implode('+', $normalizedVarIds);
                    $magazzinoRepo->replaceProductConsumptions($idProdotto, $comboKey, null, []);
                    $deleted++;
                }
                if ($started && $connection->inTransaction()) {
                    $connection->commit();
                }
                HttpResponse::json(['ok' => true, 'deleted' => $deleted], 200);
            } catch (Throwable $e) {
                if ($started && $connection->inTransaction()) {
                    $connection->rollBack();
                }
                throw $e;
            }
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
