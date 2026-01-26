<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

use MediaPrint\Backend\AuthGuard;
use MediaPrint\Backend\Database;
use MediaPrint\Backend\HttpResponse;
use MediaPrint\Repo\LavorazioniRepository;
use MediaPrint\Repo\PreventiviRepository;
use MediaPrint\Service\NotificationsService;
use MediaPrint\Service\PreventiviService;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    header('Allow: POST, OPTIONS');
    HttpResponse::json(['message' => 'OK']);
}

if ($method !== 'POST') {
    header('Allow: POST, OPTIONS');
    HttpResponse::error('Metodo non consentito.', 405);
}

try {
$auth = AuthGuard::requireAuth();
    AuthGuard::requirePermissions($auth, ['prev.write']);

    $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($payload)) {
        $payload = [];
    }
    $preventivoId = isset($payload['id_preventivo'])
        ? (int) $payload['id_preventivo']
        : (int) ($payload['id'] ?? 0);
    if ($preventivoId > 0) {
        $payload['id_preventivo'] = $preventivoId;
    }

    $connection = Database::getConnection();
    $preventiviRepository = new PreventiviRepository($connection);
    $lavorazioniRepository = new LavorazioniRepository($connection);
    $service = new PreventiviService(
        $preventiviRepository,
        null,
        null,
        $lavorazioniRepository
    );

    $normalizeVariationCategory = static function (?string $category): string {
        $normalized = trim((string) ($category ?? ''));
        if ($normalized === '') {
            return '';
        }
        if (function_exists('mb_strtolower')) {
            $normalized = mb_strtolower($normalized);
        } else {
            $normalized = strtolower($normalized);
        }
        $normalized = (string) preg_replace('/[^\p{L}0-9]+/u', '_', $normalized);
        $normalized = trim(preg_replace('/_+/', '_', $normalized), '_');
        return $normalized;
    };

    $extractVariationIds = static function (?string $comboKey): array {
        if ($comboKey === null) {
            return [];
        }
        $parts = preg_split('/\\+/', (string) $comboKey);
        if ($parts === false) {
            return [];
        }
        $ids = [];
        foreach ($parts as $part) {
            $candidate = trim((string) $part);
            if ($candidate === '') {
                continue;
            }
            $id = (int) $candidate;
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        return $ids;
    };

    $loadVariationsById = static function (\PDO $pdo, array $ids): array {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn (int $value): bool => $value > 0)));
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare(sprintf(
            'SELECT id_variazione, nome, categoria FROM tb_variazioni WHERE id_variazione IN (%s)',
            $placeholders,
        ));
        foreach ($ids as $index => $value) {
            $stmt->bindValue($index + 1, $value, \PDO::PARAM_INT);
        }
        $stmt->execute();
        $map = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $id = isset($row['id_variazione']) ? (int) $row['id_variazione'] : 0;
            if ($id <= 0) {
                continue;
            }
            $map[$id] = [
                'nome' => $row['nome'] ?? '',
                'categoria' => $row['categoria'] ?? null,
            ];
        }
        return $map;
    };

    $buildStampaRows = static function (
        array $lines,
        string $label,
        array $fieldMap,
        array $variationsById
    ) use ($extractVariationIds, $normalizeVariationCategory): array {
        $normalizedLabel = strtolower(trim($label));
        if ($normalizedLabel === '' || empty($lines) || empty($fieldMap)) {
            return [];
        }
        $rows = [];
        foreach ($lines as $line) {
            $category = strtolower(trim((string) ($line['categoria'] ?? $line['categoria_nome'] ?? '')));
            if ($category === '') {
                continue;
            }
            if ($category !== $normalizedLabel) {
                continue;
            }
            $values = [];
            if (isset($fieldMap['materiale'])) {
                $descr = (string) ($line['descrizione'] ?? $line['prodotto_nome'] ?? $line['prodotto_codice'] ?? '');
                $values[$fieldMap['materiale']] = $descr;
            }
            if (isset($fieldMap['quantita'])) {
                $values[$fieldMap['quantita']] = (string) (isset($line['quantita']) ? $line['quantita'] : 1);
            }
            if (isset($fieldMap['elementi_per_plico'])) {
                $values[$fieldMap['elementi_per_plico']] = '1';
            }
            if (isset($fieldMap['combo_key'])) {
                $values[$fieldMap['combo_key']] = trim((string) ($line['combo_key'] ?? ''));
            }
            if (isset($fieldMap['id_riga_preventivo'])) {
                $values[$fieldMap['id_riga_preventivo']] = (string) (isset($line['id_riga']) ? $line['id_riga'] : 0);
            }

            $variationFieldValues = [];
            $variationIds = $extractVariationIds($line['combo_key'] ?? null);
            foreach ($variationIds as $variationId) {
                $variation = $variationsById[$variationId] ?? null;
                if ($variation === null) {
                    continue;
                }
                $fieldCode = $normalizeVariationCategory($variation['categoria'] ?? null);
                if ($fieldCode === '' || !isset($fieldMap[$fieldCode])) {
                    continue;
                }
                $variationName = trim((string) ($variation['nome'] ?? ''));
                if ($variationName === '') {
                    continue;
                }
                if (isset($variationFieldValues[$fieldCode])) {
                    $variationFieldValues[$fieldCode] .= ', ' . $variationName;
                } else {
                    $variationFieldValues[$fieldCode] = $variationName;
                }
            }
            foreach ($variationFieldValues as $fieldCode => $fieldValue) {
                $fieldId = $fieldMap[$fieldCode] ?? null;
                if ($fieldId === null) {
                    continue;
                }
                $values[$fieldId] = $fieldValue;
            }
            if ($values !== []) {
                $rows[] = $values;
            }
        }
        return $rows;
    };

    $isTariffePostaliLine = static function (array $line): bool {
        $idCategoria = isset($line['id_categoria']) ? (int) $line['id_categoria'] : 0;
        if ($idCategoria === 2) {
            return true;
        }
        $category = $line['categoria'] ?? $line['categoria_nome'] ?? null;
        $value = trim((string) ($category ?? ''));
        if ($value === '') {
            return false;
        }
        if (function_exists('mb_strtolower')) {
            $value = mb_strtolower($value);
        } else {
            $value = strtolower($value);
        }
        $normalized = preg_replace('/[^a-z0-9]+/', '', $value);
        if ($normalized === 'tariffepostali') {
            return true;
        }
        return str_starts_with($normalized, 'tariffepostali');
    };

    $result = $service->generateLavorazione($payload);
    $lavorazioneId = (int) ($result['id_lavorazione'] ?? ($result['lavorazione']['id_lavorazione'] ?? 0));
    if ($lavorazioneId > 0 && $preventivoId > 0) {
        $oggetti = $preventiviRepository->getOggettiForPreventivo($preventivoId);
        if ($oggetti === []) {
            $oggettoTestuale = $preventiviRepository->getOggettoText($preventivoId);
            if ($oggettoTestuale !== null && $oggettoTestuale !== '') {
                $oggetti = [['label' => $oggettoTestuale]];
            }
        }
        $preventivoLines = $preventiviRepository->getLines($preventivoId);
        $fieldMap = [];
        if (method_exists($lavorazioniRepository, 'listStampaReportFields')) {
            $stampaFields = $lavorazioniRepository->listStampaReportFields(true);
            foreach ($stampaFields as $field) {
                $code = isset($field['field_code']) ? strtolower(trim((string) $field['field_code'])) : '';
                $idField = isset($field['id_field']) ? (int) $field['id_field'] : 0;
                if ($code !== '' && $idField > 0) {
                    $fieldMap[$code] = $idField;
                }
            }
        }
        $variationIds = [];
        foreach ($preventivoLines as $line) {
            $variationIds = array_merge($variationIds, $extractVariationIds($line['combo_key'] ?? null));
        }
        $variationIds = array_values(array_unique($variationIds));
        $variationsById = $loadVariationsById($connection, $variationIds);

        if (method_exists($lavorazioniRepository, 'replacePostaliRowsForLavorazione')) {
            $postaliRows = array_values(array_filter($preventivoLines, static function (array $line) use ($isTariffePostaliLine): bool {
                return $isTariffePostaliLine($line);
            }));
            if (!empty($postaliRows)) {
                $normalizedRows = array_map(static function (array $line): array {
                    return [
                        'id_riga_preventivo' => isset($line['id_riga']) ? (int) $line['id_riga'] : 0,
                        'id_prodotto' => $line['id_prodotto'] ?? null,
                        'categoria' => $line['categoria'] ?? $line['categoria_nome'] ?? null,
                        'prodotto_codice' => $line['prodotto_codice'] ?? null,
                        'prodotto_nome' => $line['prodotto_nome'] ?? null,
                        'descrizione' => $line['descrizione'] ?? null,
                        'quantita' => $line['quantita'] ?? null,
                        'prezzo_unitario' => $line['prezzo_unitario'] ?? null,
                        'totale' => $line['totale'] ?? null,
                        'combo_key' => $line['combo_key'] ?? null,
                        'created_by_ced' => !empty($line['created_by_ced']) ? 1 : 0,
                    ];
                }, $postaliRows);
                $lavorazioniRepository->replacePostaliRowsForLavorazione($lavorazioneId, $normalizedRows);
            } else {
                $lavorazioniRepository->replacePostaliRowsForLavorazione($lavorazioneId, []);
            }
        }

        $createdActivities = 0;
        foreach ($oggetti as $oggetto) {
            $label = trim((string) ($oggetto['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $activity = $lavorazioniRepository->createActivity($lavorazioneId, [
                'titolo' => $label,
                'note' => sprintf('Oggetto preventivo: %s', $label),
            ]);
            $activityId = isset($activity['id_attivita']) ? (int) $activity['id_attivita'] : 0;
            if (
                $activityId > 0
                && $fieldMap !== []
                && method_exists($lavorazioniRepository, 'ensureStampaReport')
                && method_exists($lavorazioniRepository, 'replaceStampaReportRows')
            ) {
                $stampaRows = $buildStampaRows($preventivoLines, $label, $fieldMap, $variationsById);
                if ($stampaRows !== []) {
                    $reportId = $lavorazioniRepository->ensureStampaReport($activityId);
                    $lavorazioniRepository->replaceStampaReportRows($reportId, $stampaRows);
                }
            }
            $createdActivities++;
        }
        if ($createdActivities > 0) {
            $result['attivita_create'] = ((int) ($result['attivita_create'] ?? 0)) + $createdActivities;
        }
    }

    if (!empty($result['id_lavorazione'])) {
        $idLavorazione = (int) $result['id_lavorazione'];
        $codice = isset($result['codice']) ? (string) $result['codice'] : null;
        $label = $codice && $codice !== '' ? ('Lavorazione ' . $codice) : ('Lavorazione #' . $idLavorazione);
        $payloadData = [
            'entity' => 'lavorazione',
            'action' => 'created',
            'id_lavorazione' => $idLavorazione,
            'codice' => $codice,
            'route' => '/lavorazioni/dettaglio?id=' . $idLavorazione,
        ];
        $notifications = new NotificationsService(new LavorazioniRepository($connection));
        $notifications->notifyAllOperators(
            'Nuova lavorazione',
            $label . ' generata.',
            $payloadData,
            AuthGuard::getAccountId($auth),
        );
    }

    HttpResponse::json($result, 201);
} catch (RuntimeException $exception) {
    $code = (int) $exception->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 422;
    }
    HttpResponse::error($exception->getMessage(), $code);
} catch (Throwable $throwable) {
    HttpResponse::error('Errore interno inatteso.', 500, ['error' => $throwable->getMessage()]);
}
