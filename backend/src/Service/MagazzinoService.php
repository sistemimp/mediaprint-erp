<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use MediaPrint\Repo\MagazzinoRepository;
use MediaPrint\Repo\ProdottiRepository;

final class MagazzinoService
{
    public function __construct(private MagazzinoRepository $repository) {}

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function stockList(array $query): array
    {
        $search = isset($query['q']) ? trim((string) $query['q']) : null;
        $onlyAlerts = isset($query['only_alerts']) ? (int) $query['only_alerts'] === 1 : false;
        $includeUnmanaged = isset($query['include_unmanaged']) ? (int) $query['include_unmanaged'] === 1 : false;
        $idCategoria = isset($query['id_categoria']) ? (int) $query['id_categoria'] : null;
        if ($idCategoria !== null && $idCategoria <= 0) {
            $idCategoria = null;
        }
        $items = $this->repository->listScorte($search, $onlyAlerts, $includeUnmanaged, $idCategoria);
        $unitaMisura = $this->repository->listUnitaMisura();
        return [
            'items' => $items,
            'meta' => [
                'unita_misura_options' => $unitaMisura,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function stockConfigUpdate(array $input): array
    {
        $idProdotto = $this->sanitizeInt($input['id_articolo'] ?? ($input['id_prodotto'] ?? 0), 1, PHP_INT_MAX);
        if ($idProdotto <= 0) {
            throw new \RuntimeException('ID articolo non valido.', 422);
        }

        $product = $this->repository->findProductForStock($idProdotto);
        if ($product === null) {
            throw new \RuntimeException('Articolo non trovato.', 404);
        }

        $soglia = null;
        if (array_key_exists('soglia_scorta', $input) && $input['soglia_scorta'] !== null && $input['soglia_scorta'] !== '') {
            $soglia = (float) $input['soglia_scorta'];
            if ($soglia < 0) {
                throw new \RuntimeException('Soglia scorta non valida.', 422);
            }
        }
        $idUnita = null;
        if (array_key_exists('id_unita', $input) && $input['id_unita'] !== null && $input['id_unita'] !== '') {
            $idUnita = (int) $input['id_unita'];
            if ($idUnita <= 0) {
                throw new \RuntimeException('Unita di misura non valida.', 422);
            }
            $validUnits = $this->repository->listUnitaMisura();
            $validUnitIds = array_map(static fn (array $row): int => (int) ($row['id_unita'] ?? 0), $validUnits);
            if (!in_array($idUnita, $validUnitIds, true)) {
                throw new \RuntimeException('Unita di misura non valida.', 422);
            }
        }

        $this->repository->updateProductStockConfig($idProdotto, [
            'gestione_magazzino' => !empty($input['gestione_magazzino']) ? 1 : 0,
            'soglia_scorta' => $soglia,
            'id_unita' => $idUnita,
        ]);

        $updated = $this->repository->findProductForStock($idProdotto);
        return ['ok' => true, 'item' => $updated];
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function stockMovementCreate(array $input): array
    {
        $idProdotto = $this->sanitizeInt($input['id_articolo'] ?? ($input['id_prodotto'] ?? 0), 1, PHP_INT_MAX);
        if ($idProdotto <= 0) {
            throw new \RuntimeException('ID articolo non valido.', 422);
        }

        $tipo = strtolower(trim((string) ($input['tipo_movimento'] ?? $input['tipo'] ?? '')));
        if ($tipo === '') {
            throw new \RuntimeException('Tipo movimento obbligatorio.', 422);
        }

        if (!array_key_exists('quantita', $input) || !is_numeric($input['quantita'])) {
            throw new \RuntimeException('Quantita movimento non valida.', 422);
        }
        $quantita = (float) $input['quantita'];
        if ($tipo !== 'rettifica' && $quantita <= 0) {
            throw new \RuntimeException('Quantita movimento non valida.', 422);
        }

        $createdBy = $this->sanitizeOptionalInt($input['created_by'] ?? ($input['id_account'] ?? null));
        $note = isset($input['note']) ? trim((string) $input['note']) : null;
        if ($note === '') {
            $note = null;
        }

        $movement = $this->repository->registerMovimento(
            $idProdotto,
            $tipo,
            $quantita,
            $note,
            $createdBy > 0 ? $createdBy : null
        );

        $updated = $this->repository->findProductForStock($idProdotto);
        return [
            'ok' => true,
            'movimento' => $movement,
            'prodotto' => $updated,
        ];
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function movementList(array $query): array
    {
        $search = isset($query['q']) ? trim((string) $query['q']) : null;
        $idProdotto = isset($query['id_articolo'])
            ? (int) $query['id_articolo']
            : (isset($query['id_prodotto']) ? (int) $query['id_prodotto'] : 0);
        if ($idProdotto < 0) {
            $idProdotto = 0;
        }
        $idCategoria = isset($query['id_categoria']) ? (int) $query['id_categoria'] : 0;
        if ($idCategoria < 0) {
            $idCategoria = 0;
        }

        $tipo = isset($query['tipo_movimento']) ? strtolower(trim((string) $query['tipo_movimento'])) : '';
        if ($tipo !== '' && !in_array($tipo, ['carico', 'scarico', 'rettifica'], true)) {
            throw new \RuntimeException('Tipo movimento non valido.', 422);
        }

        $dateFrom = $this->sanitizeDate($query['date_from'] ?? null);
        $dateTo = $this->sanitizeDate($query['date_to'] ?? null);
        $limit = $this->sanitizeInt($query['limit'] ?? 200, 1, 1000);

        $items = $this->repository->listMovimenti([
            'search' => $search,
            'id_prodotto' => $idProdotto > 0 ? $idProdotto : null,
            'id_categoria' => $idCategoria > 0 ? $idCategoria : null,
            'tipo_movimento' => $tipo !== '' ? $tipo : null,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'limit' => $limit,
        ]);

        return ['items' => $items];
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function productConsumptionList(array $query): array
    {
        $idProdotto = isset($query['id_prodotto']) ? (int) $query['id_prodotto'] : 0;
        $comboKey = isset($query['combo_key']) ? trim((string) $query['combo_key']) : null;
        $idVariazione = isset($query['id_variazione']) ? (int) $query['id_variazione'] : 0;
        $idArticolo = isset($query['id_articolo']) ? (int) $query['id_articolo'] : 0;
        $items = $this->repository->listProductConsumptions(
            $idProdotto > 0 ? $idProdotto : null,
            array_key_exists('combo_key', $query) ? ($comboKey ?? '') : null,
            array_key_exists('id_variazione', $query) ? ($idVariazione > 0 ? $idVariazione : 0) : null,
            $idArticolo > 0 ? $idArticolo : null,
        );

        $prodotti = [];
        try {
            $prodottiRepo = new ProdottiRepository($this->repository->getConnection());
            $prodotti = $prodottiRepo->listProdotti(null, null);
        } catch (\Throwable $ignored) {
            $prodotti = [];
        }
        $productVariations = [];
        try {
            $productVariations = $this->repository->listProdottoVariazioniLinks();
        } catch (\Throwable $ignored) {
            $productVariations = [];
        }
        $articoli = $this->repository->listScorte(null, false, true, null);

        return [
            'items' => $items,
            'meta' => [
                'prodotti' => $prodotti,
                'product_variations' => $productVariations,
                'articoli' => $articoli,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function productConsumptionSave(array $input): array
    {
        $idProdotto = $this->sanitizeInt($input['id_prodotto'] ?? 0, 1, PHP_INT_MAX);
        if ($idProdotto <= 0) {
            throw new \RuntimeException('ID prodotto non valido.', 422);
        }
        $prodottiRepo = new ProdottiRepository($this->repository->getConnection());
        $comboKey = isset($input['combo_key']) ? trim((string) $input['combo_key']) : '';
        $requestedVariationId = 0;
        if (array_key_exists('id_variazione', $input) && $input['id_variazione'] !== null && $input['id_variazione'] !== '') {
            $requestedVariationId = (int) $input['id_variazione'];
            if ($requestedVariationId <= 0) {
                throw new \RuntimeException('ID variazione non valido.', 422);
            }
        }
        $comboItems = $prodottiRepo->listPrezziCombinatiByProdotto($idProdotto);
        if (count($comboItems) > 0 && $comboKey === '' && $requestedVariationId <= 0) {
            throw new \RuntimeException('Seleziona una combinazione del prodotto.', 422);
        }
        if ($comboKey !== '') {
            $comboFound = false;
            foreach ($comboItems as $combo) {
                if (trim((string) ($combo['combo_key'] ?? '')) === $comboKey) {
                    $comboFound = true;
                    break;
                }
            }
            if (!$comboFound) {
                throw new \RuntimeException('La combinazione non e valida per il prodotto selezionato.', 422);
            }
        }
        $idVariazione = 0;
        if ($comboKey !== '') {
            $ids = array_values(array_filter(array_map('intval', explode('+', $comboKey)), static fn (int $v): bool => $v > 0));
            if (count($ids) === 1) {
                $idVariazione = $ids[0];
            }
        } elseif ($requestedVariationId > 0) {
            $idVariazione = $requestedVariationId;
            $validVariations = $prodottiRepo->listVariazioniByProdotto($idProdotto);
            $validVariationIds = array_map(
                static fn (array $row): int => (int) ($row['id_variazione'] ?? 0),
                $validVariations
            );
            if (!in_array($idVariazione, $validVariationIds, true)) {
                throw new \RuntimeException('La variazione non e valida per il prodotto selezionato.', 422);
            }
        }
        $rows = $input['rows'] ?? [];
        if (!is_array($rows)) {
            throw new \RuntimeException('Formato righe consumo non valido.', 422);
        }

        $normalized = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $idArticolo = isset($row['id_articolo']) ? (int) $row['id_articolo'] : 0;
            $q = isset($row['quantita_per_unita']) && is_numeric($row['quantita_per_unita'])
                ? (float) $row['quantita_per_unita']
                : 0.0;
            $s = isset($row['scarto_percento']) && is_numeric($row['scarto_percento'])
                ? (float) $row['scarto_percento']
                : 0.0;
            $attivo = isset($row['attivo']) && (int) $row['attivo'] === 0 ? 0 : 1;

            if ($idArticolo <= 0 || $q <= 0) {
                continue;
            }
            $normalized[] = [
                'id_articolo' => $idArticolo,
                'quantita_per_unita' => $q,
                'scarto_percento' => $s < 0 ? 0 : $s,
                'attivo' => $attivo,
            ];
        }

        $this->repository->replaceProductConsumptions(
            $idProdotto,
            $comboKey !== '' ? $comboKey : null,
            $idVariazione > 0 ? $idVariazione : null,
            $normalized
        );
        $items = $this->repository->listProductConsumptions(
            $idProdotto,
            $comboKey !== '' ? $comboKey : '',
            $idVariazione > 0 ? $idVariazione : 0,
            null
        );
        return ['ok' => true, 'items' => $items];
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function articleCreateAndLinkProducts(array $input): array
    {
        $nome = trim((string) ($input['nome'] ?? ''));
        if ($nome === '') {
            throw new \RuntimeException('Nome articolo obbligatorio.', 422);
        }

        $codice = $this->sanitizeOptionalString($input['codice'] ?? null);
        $idCategoria = $this->sanitizeOptionalInt($input['id_categoria'] ?? null);
        $giacenza = isset($input['giacenza_attuale']) && is_numeric($input['giacenza_attuale'])
            ? (float) $input['giacenza_attuale']
            : 0.0;
        if ($giacenza < 0) {
            throw new \RuntimeException('Giacenza iniziale non valida.', 422);
        }

        $soglia = null;
        if (array_key_exists('soglia_scorta', $input) && $input['soglia_scorta'] !== null && $input['soglia_scorta'] !== '') {
            if (!is_numeric($input['soglia_scorta'])) {
                throw new \RuntimeException('Soglia scorta non valida.', 422);
            }
            $soglia = (float) $input['soglia_scorta'];
            if ($soglia < 0) {
                throw new \RuntimeException('Soglia scorta non valida.', 422);
            }
        }

        $idUnita = null;
        if (array_key_exists('id_unita', $input) && $input['id_unita'] !== null && $input['id_unita'] !== '') {
            $idUnita = (int) $input['id_unita'];
            if ($idUnita <= 0) {
                throw new \RuntimeException('Unita di misura non valida.', 422);
            }
            $validUnits = $this->repository->listUnitaMisura();
            $validUnitIds = array_map(static fn (array $row): int => (int) ($row['id_unita'] ?? 0), $validUnits);
            if (!in_array($idUnita, $validUnitIds, true)) {
                throw new \RuntimeException('Unita di misura non valida.', 422);
            }
        }

        $rows = $input['rows'] ?? [];
        if (!is_array($rows)) {
            throw new \RuntimeException('Formato collegamenti prodotto non valido.', 422);
        }

        $normalizedRows = [];
        $prodottiRepo = new ProdottiRepository($this->repository->getConnection());
        $variationsByProduct = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $idProdotto = isset($row['id_prodotto']) ? (int) $row['id_prodotto'] : 0;
            $comboKey = isset($row['combo_key']) ? trim((string) $row['combo_key']) : '';
            $idVariazione = isset($row['id_variazione']) ? (int) $row['id_variazione'] : 0;
            $q = isset($row['quantita_per_unita']) && is_numeric($row['quantita_per_unita'])
                ? (float) $row['quantita_per_unita']
                : 0.0;
            $s = isset($row['scarto_percento']) && is_numeric($row['scarto_percento'])
                ? (float) $row['scarto_percento']
                : 0.0;
            $attivo = isset($row['attivo']) && (int) $row['attivo'] === 0 ? 0 : 1;
            if ($idProdotto <= 0 || $q <= 0) {
                continue;
            }
            if (!array_key_exists($idProdotto, $variationsByProduct)) {
                $variationsByProduct[$idProdotto] = [
                    'variations' => $prodottiRepo->listVariazioniByProdotto($idProdotto),
                    'combos' => $prodottiRepo->listPrezziCombinatiByProdotto($idProdotto),
                ];
            }
            $comboItems = $variationsByProduct[$idProdotto]['combos'] ?? [];
            if (count($comboItems) > 0) {
                if ($comboKey === '') {
                    throw new \RuntimeException('Seleziona una combinazione per i prodotti che la prevedono.', 422);
                }
                $comboFound = false;
                foreach ($comboItems as $combo) {
                    if (trim((string) ($combo['combo_key'] ?? '')) === $comboKey) {
                        $comboFound = true;
                        break;
                    }
                }
                if (!$comboFound) {
                    throw new \RuntimeException('Una combinazione selezionata non e valida per il prodotto.', 422);
                }
            }
            if ($comboKey !== '') {
                $ids = array_values(array_filter(array_map('intval', explode('+', $comboKey)), static fn (int $v): bool => $v > 0));
                $idVariazione = count($ids) === 1 ? $ids[0] : 0;
            }
            $mapKey = $idProdotto . ':' . ($comboKey !== '' ? $comboKey : max(0, $idVariazione));
            $normalizedRows[$mapKey] = [
                'id_prodotto' => $idProdotto,
                'combo_key' => $comboKey !== '' ? $comboKey : null,
                'id_variazione' => $idVariazione > 0 ? $idVariazione : null,
                'quantita_per_unita' => $q,
                'scarto_percento' => $s < 0 ? 0 : $s,
                'attivo' => $attivo,
            ];
        }

        $idArticolo = $this->repository->createArticleWithConsumptions([
            'codice' => $codice,
            'nome' => $nome,
            'id_categoria' => $idCategoria > 0 ? $idCategoria : null,
            'gestione_magazzino' => !array_key_exists('gestione_magazzino', $input) || !empty($input['gestione_magazzino']) ? 1 : 0,
            'giacenza_attuale' => $giacenza,
            'soglia_scorta' => $soglia,
            'id_unita' => $idUnita,
            'note' => $this->sanitizeOptionalString($input['note'] ?? null),
            'attivo' => 1,
        ], array_values($normalizedRows));

        return [
            'ok' => true,
            'item' => $this->repository->findProductForStock($idArticolo),
            'links' => $this->repository->listProductConsumptions(null, null, null, $idArticolo),
        ];
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function machineList(array $query): array
    {
        $tipo = isset($query['tipo']) ? strtolower(trim((string) $query['tipo'])) : null;
        if ($tipo !== null && $tipo !== '' && !in_array($tipo, ['stampante', 'imbustatrice', 'cellophanatrice'], true)) {
            throw new \RuntimeException('Tipo macchina non valido.', 422);
        }
        $all = isset($query['all']) ? (int) $query['all'] === 1 : false;
        $items = $this->repository->listMacchine($tipo !== '' ? $tipo : null, !$all);
        return ['items' => $items];
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function machineDetail(array $query): array
    {
        $id = $this->sanitizeInt($query['id_macchina'] ?? ($query['id'] ?? 0), 1, PHP_INT_MAX);
        if ($id <= 0) {
            throw new \RuntimeException('ID macchina non valido.', 422);
        }
        $item = $this->repository->getMacchinaById($id);
        if ($item === null) {
            throw new \RuntimeException('Macchina non trovata.', 404);
        }
        return ['item' => $item];
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function machineSave(array $input): array
    {
        $id = $this->sanitizeOptionalInt($input['id_macchina'] ?? ($input['id'] ?? null));
        $codice = trim((string) ($input['codice'] ?? ''));
        $nome = trim((string) ($input['nome'] ?? ''));
        $tipo = strtolower(trim((string) ($input['tipo'] ?? '')));

        if ($codice === '' || $nome === '') {
            throw new \RuntimeException('Codice e nome macchina sono obbligatori.', 422);
        }
        if (!in_array($tipo, ['stampante', 'imbustatrice', 'cellophanatrice'], true)) {
            throw new \RuntimeException('Tipo macchina non valido.', 422);
        }

        $stato = strtolower(trim((string) ($input['stato'] ?? 'attiva')));
        if (!in_array($stato, ['attiva', 'ferma', 'manutenzione', 'dismessa'], true)) {
            throw new \RuntimeException('Stato macchina non valido.', 422);
        }

        $capacita = null;
        if (array_key_exists('capacita_oraria', $input) && $input['capacita_oraria'] !== null && $input['capacita_oraria'] !== '') {
            $capacita = (float) $input['capacita_oraria'];
            if ($capacita < 0) {
                throw new \RuntimeException('Capacita oraria non valida.', 422);
            }
        }

        $idSaved = $this->repository->saveMacchina([
            'id_macchina' => $id > 0 ? $id : null,
            'codice' => $codice,
            'nome' => $nome,
            'tipo' => $tipo,
            'marca' => $this->sanitizeOptionalString($input['marca'] ?? null),
            'modello' => $this->sanitizeOptionalString($input['modello'] ?? null),
            'seriale' => $this->sanitizeOptionalString($input['seriale'] ?? null),
            'reparto' => $this->sanitizeOptionalString($input['reparto'] ?? null),
            'stato' => $stato,
            'capacita_oraria' => $capacita,
            'data_installazione' => $this->sanitizeDate($input['data_installazione'] ?? null),
            'data_ultima_manutenzione' => $this->sanitizeDate($input['data_ultima_manutenzione'] ?? null),
            'data_prossima_manutenzione' => $this->sanitizeDate($input['data_prossima_manutenzione'] ?? null),
            'note' => $this->sanitizeOptionalString($input['note'] ?? null),
            'attiva' => array_key_exists('attiva', $input) ? ((int) $input['attiva'] === 1 ? 1 : 0) : 1,
        ]);

        $item = $this->repository->getMacchinaById($idSaved);
        return ['ok' => true, 'item' => $item];
    }

    private function sanitizeOptionalInt($value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }
        return max(0, (int) $value);
    }

    private function sanitizeOptionalString($value): ?string
    {
        if ($value === null) {
            return null;
        }
        $text = trim((string) $value);
        return $text === '' ? null : $text;
    }

    private function sanitizeDate($value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        try {
            $dt = new \DateTimeImmutable($value);
            return $dt->format('Y-m-d');
        } catch (\Throwable $ignored) {
            return null;
        }
    }

    private function sanitizeInt($value, int $min, int $max): int
    {
        if (is_numeric($value)) {
            $int = (int) $value;
        } else {
            $int = (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
        }
        if ($int < $min) {
            return $min;
        }
        if ($int > $max) {
            return $max;
        }
        return $int;
    }
}
