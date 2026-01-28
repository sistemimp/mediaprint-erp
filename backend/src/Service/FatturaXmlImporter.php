<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use DOMDocument;
use DOMNode;
use DOMXPath;
use MediaPrint\Repo\AnagraficheRepository;
use MediaPrint\Repo\FattureRepository;
use PDO;
use RuntimeException;
use ZipArchive;

final class FatturaXmlImporter
{
    private const DEFAULT_TIPO_FATTURA_ID = 2;

    // Repository per interagire con le fatture salvate in base dati e per il log di importazione.
    private FattureRepository $fattureRepository;
    // Repository per gestire anagrafiche clienti.
    private AnagraficheRepository $anagraficheRepository;
    // Mappe che collegano i codici SDI ai loro ID locali.
    private array $tipoMap = [];
    private array $esigibilitaMap = [];
    private array $modalitaMap = [];
    private array $naturaMap = [];
    /** @var array<string,int|null> */
    private array $tipoFatturaCache = [];
    // Valori di default per alcune configurazioni SDI.
    private ?int $defaultNaturaId = null;
    private ?int $defaultSezionaleId = null;
    /** @var array<string,int|null> */
    private array $stateIdCache = [];

    public function __construct(private PDO $pdo)
    {
        $this->fattureRepository = new FattureRepository($pdo);
        $this->anagraficheRepository = new AnagraficheRepository($pdo);
        $this->loadSdiMappings();
        $this->defaultSezionaleId = $this->resolveDefaultSezionale();
    }

    /**
     * @param array<string,mixed> $upload
     * @return array<string,mixed>
     */
    public function import(array $upload): array
    {
        // 1. Recupero il contenuto XML dal file caricato (ZIP o puro XML).
        $xml = $this->extractXmlContent($upload);
        // 2. Inizializzo DOM per estrarre i nodi con XPath.
        $document = new DOMDocument('1.0', 'UTF-8');
        $document->preserveWhiteSpace = false;
        if (!@$document->loadXML($xml)) {
            throw new RuntimeException('Il file XML non sembra valido.', 422);
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2');

        // 3. Estraggo i nodi principali dell'header e del corpo.
        $header = $this->getRequiredNode($xpath, '/p:FatturaElettronica/FatturaElettronicaHeader');
        $body = $this->getRequiredNode($xpath, '/p:FatturaElettronica/FatturaElettronicaBody');
        $documento = $this->getRequiredNode($xpath, '/p:FatturaElettronica/FatturaElettronicaBody/DatiGenerali/DatiGeneraliDocumento');
        $formatoTrasmissione = $this->getNodeValue($xpath, $header, 'DatiTrasmissione/FormatoTrasmissione');

        // 4. Ricavo valori chiave come progressivo, destinatario, numerazione e data.
        $progressivoInvio = $this->getNodeValue($xpath, $header, 'DatiTrasmissione/ProgressivoInvio') ?? '';
        $codiceDestinatario = $this->getNodeValue($xpath, $header, 'DatiTrasmissione/CodiceDestinatario');
        $tipoDocumentoCode = $this->getNodeValue($xpath, $documento, 'TipoDocumento');
        $esigibilitaCode = $this->getNodeValue($xpath, $documento, 'EsigibilitaIVA');
        $numeroDocumento = $this->getNodeValue($xpath, $documento, 'Numero');
        $dataDocumento = $this->normalizeDate($this->getNodeValue($xpath, $documento, 'Data'));
        if ($dataDocumento === null) {
            throw new RuntimeException('La fattura SdI non contiene una data valida.', 422);
        }

        $noteDocumento = $this->getNodeValue($xpath, $documento, 'Causale');
        $importoTotale = $this->parseFloat($this->getNodeValue($xpath, $documento, 'ImportoTotaleDocumento'));
        $tipoFatturaId = $this->determineTipoFatturaId($tipoDocumentoCode);

        // 5. Leggo i dati cliente e risolvo o creo l'anagrafica associata.
        $customer = $this->parseCustomerData($xpath);
        $anagraficaId = $this->resolveCustomer($customer);

        // 6. Estraggo le righe e verifico la presenza di almeno una riga valida.
        $lines = $this->parseLineItems($xpath, $body);
        if (empty($lines)) {
            throw new RuntimeException('La fattura SdI non contiene righe utilizzabili.', 422);
        }

        // 7. Ricavo i dati di pagamento (modalità e giorni).
        $payment = $this->parsePaymentData($xpath, $body, $dataDocumento);
        $annoDocumento = (int) (new \DateTimeImmutable($dataDocumento))->format('Y');
        $numeroDocumentoNormalized = $this->normalizeDocumentNumber($numeroDocumento, $annoDocumento, $formatoTrasmissione);
        if ($numeroDocumentoNormalized === '') {
            $numeroDocumentoNormalized = $this->normalizeDocumentNumber($progressivoInvio, $annoDocumento, $formatoTrasmissione);
        }
        if ($numeroDocumentoNormalized === '') {
            throw new RuntimeException('Il numero fattura non è presente nell\'XML.', 422);
        }
        $codiceDestinatarioKey = $this->normalizeDestinatario($codiceDestinatario);
        // 8. Controllo che la fattura non sia già stata importata.
        if ($this->hasImportLog($numeroDocumentoNormalized, $codiceDestinatarioKey, $annoDocumento)) {
            throw new RuntimeException(sprintf('Fattura già importata (%s / %s).', $annoDocumento, $numeroDocumentoNormalized), 422);
        }

        // 9. Verifico che sia disponibile un sezionale attivo per l'importazione.
        if ($this->defaultSezionaleId === null) {
            throw new RuntimeException('Nessun sezionale attivo disponibile per l\'importazione.', 500);
        }

        // 10. Preparo il payload da salvare con i riferimenti SDI e i totali calcolati.

        $sezionaleId = $this->defaultSezionaleId;
        if ($this->containsPaIdentifier($numeroDocumento) || $this->containsPaIdentifier($numeroDocumentoNormalized)) {
            $sezionaleId = 2;
        }
        $statusId = $this->getStateIdByCode('pagata') ?? $this->getImportStateId() ?? 2;
        $payload = [
            'id_anagrafica' => $anagraficaId,
            'id_sezionale' => $sezionaleId,
            'id_tipo_fatt' => $tipoFatturaId,
            'id_stato_fatt' => $statusId,
            'data_fattura' => $dataDocumento,
            'id_sdi_tipo_documento' => $this->resolveSdiId($tipoDocumentoCode, $this->tipoMap),
            'id_sdi_esigibilita' => $this->resolveSdiId($esigibilitaCode, $this->esigibilitaMap),
            'id_sdi_modalita' => $payment['id_modalita'] ?? null,
            'cliente_pec' => $customer['pec'] ?? null,
            'cliente_codice_sdi' => $codiceDestinatario ? trim($codiceDestinatario) : null,
            'cliente_modalita_pagamento' => $payment['modalita_code'] ?? null,
            'cliente_giorni_pagamento' => $payment['giorni_pagamento'] ?? null,
            'note' => $this->buildNote($progressivoInvio, $numeroDocumento, $noteDocumento),
            'totale' => $importoTotale,
            'totale_imponibile' => $this->sumImponibile($lines),
            'totale_iva' => $this->sumIva($lines),
            'saldo' => 0.0,
            'created_at' => $dataDocumento,
            'updated_at' => $dataDocumento,
        ];

        // 11. Creo la fattura tramite repository e registro il log di importazione.
        $result = $this->fattureRepository->createFromPreventivo($payload, $lines);
        $this->recordImportLog($result['id_fattura'] ?? null, $numeroDocumentoNormalized, $codiceDestinatarioKey, $annoDocumento, $progressivoInvio);
        $logEntry = $this->fetchImportLogEntry($numeroDocumentoNormalized, $codiceDestinatarioKey, $annoDocumento);

        return [
            'ok' => true,
            'invoice' => $result,
            'payload' => $payload,
            'log' => $logEntry,
            'progressivo_invio' => $progressivoInvio,
            'numero_documento_originale' => $numeroDocumento,
        ];
    }

    // Estrae il testo XML dal file caricato: accetta sia file XML singolo che ZIP contenente XML.
    private function extractXmlContent(array $upload): string
    {
        if (empty($upload['tmp_name']) || !is_file($upload['tmp_name'])) {
            throw new RuntimeException('Impossibile leggere il file caricato.', 422);
        }

        $path = $upload['tmp_name'];
        $content = file_get_contents($path);
        if ($content === false || trim($content) === '') {
            throw new RuntimeException('Il file caricato è vuoto o non leggibile.', 422);
        }

        $zip = new ZipArchive();
        if ($zip->open($path) === true) {
            $xmlContent = null;
            for ($i = 0, $count = $zip->numFiles; $i < $count; $i++) {
                $name = $zip->getNameIndex($i);
                if (preg_match('/\.xml$/i', $name)) {
                    $xmlContent = $zip->getFromIndex($i);
                    break;
                }
            }
            $zip->close();
            if ($xmlContent === null) {
                throw new RuntimeException('Nessun file XML trovato nell\'archivio.', 422);
            }
            return $xmlContent;
        }

        return $content;
    }

    // Recupera le mappe SDI attive e imposta i valori di default utilizzabili durante l'importazione.
    private function loadSdiMappings(): void
    {
        $this->tipoMap = $this->loadMap('cfg_sdi_tipo_documento', 'id_tipo', 'code');
        $this->esigibilitaMap = $this->loadMap('cfg_sdi_esigibilita_iva', 'id_esig', 'code');
        $this->modalitaMap = $this->loadMap('cfg_sdi_modalita_pagamento', 'id_modalita', 'code');
        $this->naturaMap = $this->loadMap('cfg_sdi_natura_iva', 'id_natura', 'code');
        $this->defaultNaturaId = $this->resolveDefaultValueByCode($this->naturaMap, 'N1');
        if ($this->defaultNaturaId === null) {
            $this->defaultNaturaId = $this->resolveDefaultValue($this->naturaMap);
        }
    }

    /**
     * @param array<string,int> $map
     */
    // Restituisce l'ID che corrisponde esattamente a un codice SDI di default.
    private function resolveDefaultValueByCode(array $map, string $code): ?int
    {
        $key = strtoupper(trim($code));
        return $map[$key] ?? null;
    }

    /**
     * @param array<string,int> $map
     */
    // Prende il primo valore utile della mappa se non è stato trovato un codice specifico.
    private function resolveDefaultValue(array $map): ?int
    {
        foreach ($map as $value) {
            if ($value > 0) {
                return $value;
            }
        }
        return null;
    }

    // Legge una tabella di configurazione SDI attiva e costruisce una mappa codice→id.
    private function loadMap(string $table, string $idColumn, string $codeColumn): array
    {
        $stmt = $this->pdo->query(
            sprintf(
                'SELECT %s AS id, %s AS code FROM %s WHERE attivo = 1',
                $idColumn,
                $codeColumn,
                $table
            )
        );
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $map = [];
        foreach ($rows as $row) {
            $code = strtoupper(trim((string) ($row['code'] ?? '')));
            if ($code === '') {
                continue;
            }
            $map[$code] = (int) $row['id'];
        }
        return $map;
    }

    // Usa il primo sezionale attivo con ambito "fattura" oppure il primo disponibile.
    private function resolveDefaultSezionale(): ?int
    {
        $sezionali = $this->fattureRepository->listSezionali();
        foreach ($sezionali as $item) {
            if (($item['ambito'] ?? '') === 'fattura') {
                return (int) $item['id_sezionale'];
            }
        }
        return isset($sezionali[0]) ? (int) $sezionali[0]['id_sezionale'] : null;
    }

    // Recupera un nodo obbligatorio lanciando un'eccezione se mancante.
    private function getRequiredNode(DOMXPath $xpath, string $query, ?DOMNode $context = null): DOMNode
    {
        $node = $this->getNode($xpath, $query, $context);
        if ($node === null) {
            throw new RuntimeException(sprintf('Impossibile trovare il nodo %s all\'interno dell\'XML.', $query), 422);
        }
        return $node;
    }

    // Restituisce il primo nodo trovato oppure null se la query non restituisce risultati.
    private function getNode(DOMXPath $xpath, string $query, ?DOMNode $context = null): ?DOMNode
    {
        $nodes = $this->queryNodes($xpath, $query, $context);
        if ($this->isEmptyNodeList($nodes)) {
            return null;
        }

        return $nodes->item(0);
    }

    // Controlla se il risultato XPath è vuoto o invalido.
    private function isEmptyNodeList($nodes): bool
    {
        return $nodes === false || $nodes->length === 0;
    }

    // Costruisce un fallback XPath ignorando i namespace se l'espressione con prefisso fallisce.
    private function toLocalNameQuery(string $query): string
    {
        return preg_replace_callback(
            '/(?<![A-Za-z0-9_])(p:)([A-Za-z0-9_]+)/',
            fn ($matches) => '*[local-name()="' . $matches[2] . '"]',
            $query
        );
    }

    // Esegue la query XPath e permette eventuale fallback namespace-less (commentato per ora).
    private function queryNodes(DOMXPath $xpath, string $query, ?DOMNode $context = null)
    {
        $nodes = $xpath->query($query, $context);
        // if ($this->isEmptyNodeList($nodes)) {
        //     $fallback = $this->toLocalNameQuery($query);
        //     if ($fallback !== $query) {
        //         $nodes = $xpath->query($fallback, $context);
        //     }
        // }

        return $nodes;
    }

    // Estrae il testo del nodo richiesto, oppure null se non presente.
    private function getNodeValue(DOMXPath $xpath, DOMNode $context, string $query): ?string
    {
        $node = $this->getNode($xpath, $query, $context);
        if ($node === null) {
            return null;
        }
        return trim((string) $node->textContent);
    }

    private function parseFloat(?string $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        $clean = str_replace(',', '.', (string) $value);
        return (float) $clean;
    }

    // Normalizza la data SdI restituendo lo standard ISO Y-m-d oppure null se invalida.
    private function normalizeDate(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        try {
            $date = new \DateTimeImmutable(trim($value));
            return $date->format('Y-m-d');
        } catch (\Throwable $exception) {
            return null;
        }
    }

    // Raggruppa l'imponibile delle righe per costruire il totale imponibile.
    private function sumImponibile(array $lines): float
    {
        $total = 0.0;
        foreach ($lines as $line) {
            $total += $line['importo_scontato'] ?? 0.0;
        }
        return round($total, 2);
    }

    // Somma l'IVA calcolata su tutte le righe concordando la precisione finale.
    private function sumIva(array $lines): float
    {
        $total = 0.0;
        foreach ($lines as $line) {
            $total += $line['iva'] ?? 0.0;
        }
        return round($total, 2);
    }

    // Converte un codice SDI nella sua chiave locale tramite le mappe caricate.
    private function resolveSdiId(?string $code, array $map): ?int
    {
        if ($code === null) {
            return null;
        }
        $normalized = strtoupper(trim($code));
        return $map[$normalized] ?? null;
    }

    private function determineTipoFatturaId(?string $tipoDocumentoCode): int
    {
        if ($this->isCreditNoteDocument($tipoDocumentoCode)) {
            $resolved = $this->resolveTipoFatturaIdByCode('nota_credito');
            if ($resolved !== null) {
                return $resolved;
            }
        }

        return self::DEFAULT_TIPO_FATTURA_ID;
    }

    private function isCreditNoteDocument(?string $tipoDocumentoCode): bool
    {
        if ($tipoDocumentoCode === null) {
            return false;
        }

        return strtoupper(trim($tipoDocumentoCode)) === 'TD04';
    }

    private function resolveTipoFatturaIdByCode(string $code): ?int
    {
        $key = strtolower(trim($code));
        if ($key === '') {
            return null;
        }
        if (array_key_exists($key, $this->tipoFatturaCache)) {
            return $this->tipoFatturaCache[$key];
        }

        $stmt = $this->pdo->prepare('SELECT id_tipo FROM cfg_tipi_fattura WHERE LOWER(code) = :code AND attivo = 1 LIMIT 1');
        $stmt->bindValue(':code', $key, PDO::PARAM_STR);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        $id = $value === false ? null : (int) $value;
        $this->tipoFatturaCache[$key] = $id > 0 ? $id : null;
        return $this->tipoFatturaCache[$key];
    }

    // Estrae i dati anagrafici e di contatto del cliente dall'SDI.
    private function parseCustomerData(DOMXPath $xpath): array
    {
        $customerNode = $this->getRequiredNode($xpath,'/p:FatturaElettronica/FatturaElettronicaHeader/CessionarioCommittente');
        $denominazione = $this->getNodeValue($xpath, $customerNode, 'DatiAnagrafici/Anagrafica/Denominazione')
            ?? $this->getNodeValue($xpath, $customerNode, 'DatiAnagrafici/Anagrafica/Nome')
            ?? 'Cliente SDI';

        $vatNode = $this->getNode($xpath, 'DatiAnagrafici/IdFiscaleIVA', $customerNode);
        $piva = null;
        if ($vatNode !== null) {
            $paese = $this->getNodeValue($xpath, $vatNode, 'IdPaese');
            $codice = $this->getNodeValue($xpath, $vatNode, 'IdCodice');
            if ($codice !== null) {
                $piva = strtoupper(trim(($paese ?? '') . $codice));
            }
        }

        $codiceFiscale = $this->sanitizeTaxIdentifier(
            $this->getNodeValue($xpath, $customerNode, 'DatiAnagrafici/CodiceFiscale')
        );
        $pec = $this->getNodeValue($xpath, $customerNode, 'DatiAnagrafici/Contatti/Email')
            ?? $this->getNodeValue($xpath, $customerNode, 'Sede/Email');

        return [
            'ragione_sociale' => $denominazione,
            'piva' => $this->sanitizeTaxIdentifier($piva),
            'codice_fiscale' => $codiceFiscale,
            'pec' => $pec,
        ];
    }

    // Cerca un'anagrafica esistente oppure la crea con i dati estratti dal cliente.
    private function resolveCustomer(array $customer): int
    {
        $found = $this->anagraficheRepository->findByTaxIdentifier($customer['piva'] ?? null, $customer['codice_fiscale'] ?? null);
        if ($found !== null) {
            return $found['id_anagrafica'];
        }

        $createData = [
            'ragione_sociale' => $customer['ragione_sociale'],
            'piva' => $customer['piva'] ?? null,
            'codice_fiscale' => $customer['codice_fiscale'] ?? null,
        ];

        return $this->anagraficheRepository->createAnagrafica($createData);
    }

    // Pulisce identificativi fiscali (rimuove caratteri non numerici e prefissi 'IT').
    private function sanitizeTaxIdentifier(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $clean = preg_replace('/[^A-Z0-9]/i', '', (string) $value);
        $clean = strtoupper(trim($clean));
        if (str_starts_with($clean, 'IT') && ctype_digit(substr($clean, 2))) {
            $clean = substr($clean, 2);
        }
        return $clean === '' ? null : $clean;
    }

    // Estrae righe fattura, calcola importo, IVA e natura per ogni entry valida.
    private function parseLineItems(DOMXPath $xpath, DOMNode $body): array
    {
        $nodes = $this->queryNodes($xpath, 'DatiBeniServizi/DettaglioLinee', $body);
        if ($this->isEmptyNodeList($nodes)) {
            return [];
        }
        $lines = [];
        foreach ($nodes as $node) {
            $description = $this->getNodeValue($xpath, $node, 'Descrizione') ?? '';
            $quantity = $this->parseFloat($this->getNodeValue($xpath, $node, 'Quantita'));
            if ($quantity > 0.0) {
              $unitPrice = $this->parseFloat($this->getNodeValue($xpath, $node, 'PrezzoUnitario'));
              $aliquota = $this->parseFloat($this->getNodeValue($xpath, $node, 'AliquotaIVA'));
              $imponibile = $this->parseFloat($this->getNodeValue($xpath, $node, 'PrezzoTotale'));
              $iva = $imponibile * ($aliquota / 100);
              $naturaCode = $this->getNodeValue($xpath, $node, 'Natura');

              $lines[] = [
                    'descrizione' => $description,
                    'quantita' => $quantity,
                    'prezzo_unitario' => $unitPrice,
                    'aliquota_iva' => $aliquota,
                    'importo_scontato' => round($imponibile, 2),
                    'iva' => round($iva, 2),
                    'totale' => round($imponibile + $iva, 2),
                    'id_sdi_natura_iva' => $this->resolveNaturaId($naturaCode, $aliquota),
                ];
            }
        }

        return $lines;
    }

    // Determina la natura IVA scegliendo il codice SdI oppure il valore di default se aliquota zero.
    private function resolveNaturaId(?string $code, float $aliquota): ?int
    {
        $id = $this->resolveSdiId($code, $this->naturaMap);
        if ($id === null && (int) $aliquota === 0 && $this->defaultNaturaId !== null) {
            return $this->defaultNaturaId;
        }
        return $id;
    }

    /**
     * @param DOMXPath $xpath
     * @param DOMNode $body
     * @param string $invoiceDate
     * @return array{modalita_code:?string, id_modalita:?int, giorni_pagamento:?int}
     */
    // Ritorna modalità di pagamento e scadenza calcolando i giorni rispetto alla data fattura.
    private function parsePaymentData(DOMXPath $xpath, DOMNode $body, string $invoiceDate): array
    {
        $datiPagamento = $this->getNode($xpath, 'p:DatiPagamento', $body);
        if ($datiPagamento === null) {
            return ['modalita_code' => null, 'id_modalita' => null, 'giorni_pagamento' => null];
        }

        $detail = $this->getNode($xpath, 'p:DettaglioPagamento', $datiPagamento);
        if ($detail === null) {
            return ['modalita_code' => null, 'id_modalita' => null, 'giorni_pagamento' => null];
        }

        $modalitaCode = $this->getNodeValue($xpath, $detail, 'p:ModalitaPagamento');
        $dueDate = $this->normalizeDate($this->getNodeValue($xpath, $detail, 'p:DataScadenzaPagamento'));
        $modalitaId = $this->resolveSdiId($modalitaCode, $this->modalitaMap);
        $giorni = null;
        if ($dueDate !== null) {
            try {
                $start = new \DateTimeImmutable($invoiceDate);
                $end = new \DateTimeImmutable($dueDate);
                $diff = $end->diff($start);
                $giorni = (int) $diff->days;
            } catch (\Throwable $_) {
                $giorni = null;
            }
        }

        return [
            'modalita_code' => $modalitaCode,
            'id_modalita' => $modalitaId,
            'giorni_pagamento' => $giorni,
        ];
    }

    // Costruisce la nota interna concatenando progressivo SDI, numero e causale già presenti.
    private function buildNote(string $progressivo, ?string $numero, ?string $existing): string
    {
        $parts = [];
        if ($progressivo !== '') {
            $parts[] = sprintf('Import SDI progressivo %s', $progressivo);
        }
        if ($numero !== null) {
            $parts[] = sprintf('Documento originale %s', $numero);
        }
        if ($existing !== null && trim($existing) !== '') {
            $parts[] = trim($existing);
        }

        return implode(' - ', $parts);
    }

    // Normalizza il numero documento eliminando spazi superflui e fissando l'anno in coda.
    private function normalizeDocumentNumber(?string $numero, int $anno, ?string $formatoTrasmissione = null): string
    {
        $raw = trim((string) ($numero ?? ''));
        if ($raw === '') {
            return '';
        }
        $prefix = $this->determineDocumentPrefix($formatoTrasmissione);
        $sequence = $this->extractDocumentSequence($raw, $prefix, $anno);
        if ($sequence === '') {
            return '';
        }
        $suffix = sprintf('%02d', $anno % 100);
        return sprintf('%s/%s/%s', $prefix, $sequence, $suffix);
    }

    private function determineDocumentPrefix(?string $formatoTrasmissione): string
    {
        if ($formatoTrasmissione !== null && str_starts_with(strtoupper(trim($formatoTrasmissione)), 'FPA')) {
            return 'FATTPA';
        }
        return 'FPR';
    }

    private function extractDocumentSequence(string $value, string $prefix, int $anno): string
    {
        $trimmed = trim($value);
        $pipes = preg_replace('/^(' . preg_quote($prefix, '/') . ')\/?/i', '', $trimmed);
        $tokens = array_filter(array_map('trim', explode('/', $pipes)), static fn ($segment) => $segment !== '');
        $yearValue = (string) $anno;
        $yearSuffix = sprintf('%02d', $anno % 100);
        foreach ($tokens as $token) {
            $candidate = preg_replace('/[^A-Za-z0-9]/', '', $token);
            if ($candidate === '' || $candidate === $yearValue || $candidate === $yearSuffix) {
                continue;
            }
            return $candidate;
        }
        $fallback = preg_replace('/[^A-Za-z0-9]/', '', $pipes);
        return $fallback !== '' ? $fallback : '';
    }

    private function containsPaIdentifier(?string $value): bool
    {
        if ($value === null) {
            return false;
        }
        $normalized = strtoupper(trim($value));
        if ($normalized === '') {
            return false;
        }
        return str_contains($normalized, 'PA');
    }

    // Normalizza il codice destinatario o fornisce un placeholder 'ND'.
    private function normalizeDestinatario(?string $destinatario): string
    {
        $value = strtoupper(trim((string) ($destinatario ?? '')));
        return $value === '' ? 'ND' : $value;
    }

    private function getStateIdByCode(string $code): ?int
    {
        if (array_key_exists($code, $this->stateIdCache)) {
            return $this->stateIdCache[$code];
        }
        $stmt = $this->pdo->prepare('SELECT id_stato FROM cfg_stati_fattura WHERE code = :code LIMIT 1');
        $stmt->bindValue(':code', $code, PDO::PARAM_STR);
        $stmt->execute();
        $value = $stmt->fetchColumn();
        if ($value === false) {
            $this->stateIdCache[$code] = null;
            return null;
        }
        $id = (int) $value;
        $this->stateIdCache[$code] = $id > 0 ? $id : null;
        return $this->stateIdCache[$code];
    }

    // Verifica la presenza di un log di importazione per evitare duplicati.
    private function hasImportLog(string $numero, string $destinatario, int $anno): bool
    {
        $this->ensureImportLogTable();
        $stmt = $this->pdo->prepare(
            'SELECT 1 FROM tb_fatture_import_log WHERE numero_documento = :numero AND anno = :anno AND codice_destinatario = :destinatario LIMIT 1'
        );
        $stmt->bindValue(':numero', $numero, PDO::PARAM_STR);
        $stmt->bindValue(':anno', $anno, PDO::PARAM_INT);
        $stmt->bindValue(':destinatario', $destinatario, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchColumn() !== false;
    }

    // Registra un tentativo riuscito di importazione per tutelarsi da doppi inserimenti.
    private function recordImportLog(?int $idFattura, string $numero, string $destinatario, int $anno, string $progressivo): void
    {
        $this->ensureImportLogTable();
        $stmt = $this->pdo->prepare(
            'INSERT INTO tb_fatture_import_log (numero_documento, anno, codice_destinatario, progressivo_invio, id_fattura)
             VALUES (:numero, :anno, :destinatario, :progressivo, :fattura)'
        );
        $stmt->bindValue(':numero', $numero, PDO::PARAM_STR);
        $stmt->bindValue(':anno', $anno, PDO::PARAM_INT);
        $stmt->bindValue(':destinatario', $destinatario, PDO::PARAM_STR);
        $stmt->bindValue(':progressivo', $progressivo ?: null, PDO::PARAM_STR);
        $stmt->bindValue(':fattura', $idFattura, $idFattura ? PDO::PARAM_INT : PDO::PARAM_NULL);
        $stmt->execute();
    }

    private function fetchImportLogEntry(string $numero, string $destinatario, int $anno): ?array
    {
        $this->ensureImportLogTable();
        $stmt = $this->pdo->prepare(
            'SELECT id_import, numero_documento, anno, codice_destinatario, progressivo_invio, id_fattura, created_at
             FROM tb_fatture_import_log
             WHERE numero_documento = :numero AND anno = :anno AND codice_destinatario = :destinatario
             LIMIT 1'
        );
        $stmt->bindValue(':numero', $numero, PDO::PARAM_STR);
        $stmt->bindValue(':anno', $anno, PDO::PARAM_INT);
        $stmt->bindValue(':destinatario', $destinatario, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function getImportLogForUpload(array $upload): ?array
    {
        try {
            $xml = $this->extractXmlContent($upload);
        } catch (RuntimeException $exception) {
            return null;
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $document->preserveWhiteSpace = false;
        if (!@$document->loadXML($xml)) {
            return null;
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2');

        $header = $this->getNode($xpath, '/p:FatturaElettronica/p:FatturaElettronicaHeader');
        $body = $this->getNode($xpath, '/p:FatturaElettronica/p:FatturaElettronicaBody');
        if ($header === null || $body === null) {
            return null;
        }
        $documento = $this->getNode($xpath, 'p:DatiGenerali/p:DatiGeneraliDocumento', $body);
        if ($documento === null) {
            return null;
        }

        $progressivoInvio = $this->getNodeValue($xpath, $header, 'p:DatiTrasmissione/p:ProgressivoInvio') ?? '';
        $numeroDocumento = $this->getNodeValue($xpath, $documento, 'p:Numero');
        $formatoTrasmissione = $this->getNodeValue($xpath, $header, 'p:DatiTrasmissione/p:FormatoTrasmissione');
        $dataDocumento = $this->normalizeDate($this->getNodeValue($xpath, $documento, 'p:Data'));
        if ($dataDocumento === null) {
            return null;
        }
        $annoDocumento = (int) (new \DateTimeImmutable($dataDocumento))->format('Y');
        $numeroDocumentoNormalized = $this->normalizeDocumentNumber($numeroDocumento, $annoDocumento, $formatoTrasmissione);
        if ($numeroDocumentoNormalized === '') {
            $numeroDocumentoNormalized = $this->normalizeDocumentNumber($progressivoInvio, $annoDocumento, $formatoTrasmissione);
        }
        if ($numeroDocumentoNormalized === '') {
            return null;
        }
        $codiceDestinatario = $this->getNodeValue($xpath, $header, 'p:DatiTrasmissione/p:CodiceDestinatario');
        $destinatarioKey = $this->normalizeDestinatario($codiceDestinatario);

        return $this->fetchImportLogEntry($numeroDocumentoNormalized, $destinatarioKey, $annoDocumento);
    }

    private function getImportStateId(): ?int
    {
        return $this->getStateIdByCode('importate');
    }

    // Crea la tabella di log se non esiste (caching tramite static per non ricrearla ogni volta).
    // Si assicura che la tabella di log esista (ottimizzata con static per non ripeterla).
    private function ensureImportLogTable(): void
    {
        static $ensured = false;
        if ($ensured) {
            return;
        }
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS tb_fatture_import_log (
                id_import INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                numero_documento VARCHAR(64) NOT NULL,
                anno SMALLINT UNSIGNED NOT NULL,
                codice_destinatario VARCHAR(32) NOT NULL,
                progressivo_invio VARCHAR(64) DEFAULT NULL,
                id_fattura INT UNSIGNED DEFAULT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                UNIQUE KEY uq_fatt_import (numero_documento, anno, codice_destinatario)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        $ensured = true;
    }
}
