<?php
declare(strict_types=1);

namespace MediaPrint\Service;

use DateTimeImmutable;
use DOMDocument;
use DOMElement;
use MediaPrint\Repo\FattureRepository;
use MediaPrint\Service\PaymentTerms;
use PDO;
use RuntimeException;

final class FatturaXmlExporter
{
    private FattureRepository $repo;

    /**
     * @var array<int,string>
     */
    private array $naturaMap;

    /**
     * @var list<array<string,mixed>>
     */
    private array $paymentTerms;

    public function __construct(private PDO $pdo)
    {
        $this->repo = new FattureRepository($pdo);
        $this->naturaMap = $this->loadNaturaMap();
        $this->paymentTerms = PaymentTerms::all($pdo);
    }

    /**
     * @return array{filename:string,content:string}
     */
    public function export(int $id): array
    {
        if ($id <= 0) {
            throw new RuntimeException('ID fattura non valido.', 422);
        }

        $detail = $this->repo->fetchDetail($id);
        if ($detail === null) {
            throw new RuntimeException('Fattura non trovata.', 404);
        }

        $lines = isset($detail['righe']) && is_array($detail['righe']) ? $detail['righe'] : [];
        if (empty($lines)) {
            throw new RuntimeException('La fattura non contiene righe da esportare.', 422);
        }

        $xml = $this->buildXml($detail, $lines);

        return [
            'filename' => $this->buildFilename($detail),
            'content' => $xml,
        ];
    }

    /**
     * @param array<string,mixed> $detail
     * @param list<array<string,mixed>> $lines
     */
    private function buildXml(array $detail, array $lines): string
    {
        $company = $this->loadCompanyConfig();
        $documentDate = $this->resolveInvoiceDate($detail['data_fattura'] ?? null);
        $progressivoInvio = $this->buildProgressivoInvio($detail, $company);
        $destinatarioCode = $this->resolveDestinatarioCode($detail['cliente_codice_sdi'] ?? '');
        $customerName = $this->sanitizeText($detail['cliente_ragione_sociale'] ?? 'Cliente', 80, 'Cliente');
        $customerCountry = strtoupper($detail['cliente_nazione'] ?? '') ?: 'IT';
        $customerAddress = [
            'indirizzo' => $this->sanitizeText($detail['cliente_indirizzo'] ?? 'ND', 60, 'ND'),
            'civico' => $this->sanitizeText($detail['cliente_civico'] ?? ''),
            'cap' => $this->sanitizeCap($detail['cliente_cap'] ?? ''),
            'comune' => $this->sanitizeText($detail['cliente_comune'] ?? 'ND', 60, 'ND'),
            'provincia' => $this->sanitizeProvincia($detail['cliente_provincia'] ?? ''),
            'nazione' => $customerCountry,
        ];

        $doc = new DOMDocument('1.0', 'UTF-8');
        $doc->formatOutput = true;

        $root = $doc->createElement('p:FatturaElettronica');
        $root->setAttribute('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#');
        $root->setAttribute('xmlns:p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $root->setAttribute('xsi:schemaLocation', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.2.xsd');
        $root->setAttribute('versione', $company['formato']);
        $doc->appendChild($root);

        $header = $doc->createElement('FatturaElettronicaHeader');
        $root->appendChild($header);

        $datiTrasmissione = $doc->createElement('DatiTrasmissione');
        $header->appendChild($datiTrasmissione);
        $idTrasmittente = $doc->createElement('IdTrasmittente');
        $this->appendTextElement($doc, $idTrasmittente, 'IdPaese', $company['nazione']);
        $this->appendTextElement($doc, $idTrasmittente, 'IdCodice', $company['piva']);
        $datiTrasmissione->appendChild($idTrasmittente);
        $this->appendTextElement($doc, $datiTrasmissione, 'ProgressivoInvio', $progressivoInvio);
        $this->appendTextElement($doc, $datiTrasmissione, 'FormatoTrasmissione', $company['formato']);
        $this->appendTextElement($doc, $datiTrasmissione, 'CodiceDestinatario', $destinatarioCode);
        if (!empty($detail['cliente_pec'])) {
            $this->appendTextElement($doc, $datiTrasmissione, 'PECDestinatario', strtolower(trim((string) $detail['cliente_pec'])));
        }

        $cedente = $doc->createElement('CedentePrestatore');
        $header->appendChild($cedente);
        $datiAnagraficiCed = $doc->createElement('DatiAnagrafici');
        $cedente->appendChild($datiAnagraficiCed);
        $idFiscale = $doc->createElement('IdFiscaleIVA');
        $this->appendTextElement($doc, $idFiscale, 'IdPaese', $company['nazione']);
        $this->appendTextElement($doc, $idFiscale, 'IdCodice', $company['piva']);
        $datiAnagraficiCed->appendChild($idFiscale);
        if ($company['codice_fiscale'] !== '') {
            $this->appendTextElement($doc, $datiAnagraficiCed, 'CodiceFiscale', $company['codice_fiscale']);
        }
        $anagraficaCed = $doc->createElement('Anagrafica');
        $this->appendTextElement($doc, $anagraficaCed, 'Denominazione', $company['denominazione']);
        $datiAnagraficiCed->appendChild($anagraficaCed);
        $this->appendTextElement($doc, $datiAnagraficiCed, 'RegimeFiscale', $company['regime']);

        $sedeCedente = $doc->createElement('Sede');
        $this->appendTextElement($doc, $sedeCedente, 'Indirizzo', $company['indirizzo']);
        if ($company['civico'] !== '') {
            $this->appendTextElement($doc, $sedeCedente, 'NumeroCivico', $company['civico']);
        }
        $this->appendTextElement($doc, $sedeCedente, 'CAP', $company['cap']);
        $this->appendTextElement($doc, $sedeCedente, 'Comune', $company['comune']);
        if ($company['provincia'] !== '') {
            $this->appendTextElement($doc, $sedeCedente, 'Provincia', $company['provincia']);
        }
        $this->appendTextElement($doc, $sedeCedente, 'Nazione', $company['nazione']);
        $cedente->appendChild($sedeCedente);

        $cessionario = $doc->createElement('CessionarioCommittente');
        $header->appendChild($cessionario);
        $datiAnagraficiCli = $doc->createElement('DatiAnagrafici');
        [$clienteVatCountry, $clienteVatCode] = $this->parseVat($detail['cliente_piva'] ?? null, $customerCountry);
        if ($clienteVatCode !== null && $clienteVatCode !== '') {
            $idFiscaleCliente = $doc->createElement('IdFiscaleIVA');
            $this->appendTextElement($doc, $idFiscaleCliente, 'IdPaese', $clienteVatCountry ?: $customerCountry);
            $this->appendTextElement($doc, $idFiscaleCliente, 'IdCodice', $clienteVatCode);
            $datiAnagraficiCli->appendChild($idFiscaleCliente);
        } elseif (!empty($detail['cliente_codice_fiscale'])) {
            $this->appendTextElement(
                $doc,
                $datiAnagraficiCli,
                'CodiceFiscale',
                $this->sanitizeFiscalCode((string) $detail['cliente_codice_fiscale'])
            );
        }
        $anagraficaCli = $doc->createElement('Anagrafica');
        $this->appendTextElement($doc, $anagraficaCli, 'Denominazione', $customerName);
        $datiAnagraficiCli->appendChild($anagraficaCli);
        $cessionario->appendChild($datiAnagraficiCli);

        $sedeCliente = $doc->createElement('Sede');
        $this->appendTextElement($doc, $sedeCliente, 'Indirizzo', $customerAddress['indirizzo']);
        if ($customerAddress['civico'] !== '') {
            $this->appendTextElement($doc, $sedeCliente, 'NumeroCivico', $customerAddress['civico']);
        }
        $this->appendTextElement($doc, $sedeCliente, 'CAP', $customerAddress['cap']);
        $this->appendTextElement($doc, $sedeCliente, 'Comune', $customerAddress['comune']);
        if ($customerAddress['provincia'] !== '') {
            $this->appendTextElement($doc, $sedeCliente, 'Provincia', $customerAddress['provincia']);
        }
        $this->appendTextElement($doc, $sedeCliente, 'Nazione', $customerAddress['nazione']);
        $cessionario->appendChild($sedeCliente);

        $body = $doc->createElement('FatturaElettronicaBody');
        $root->appendChild($body);

        $datiGenerali = $doc->createElement('DatiGenerali');
        $body->appendChild($datiGenerali);
        $datiDocumento = $doc->createElement('DatiGeneraliDocumento');
        $datiGenerali->appendChild($datiDocumento);
        $tipoDocumento = strtoupper((string) ($detail['sdi_td_code'] ?? 'TD01'));
        $this->appendTextElement($doc, $datiDocumento, 'TipoDocumento', $tipoDocumento);
        $this->appendTextElement($doc, $datiDocumento, 'Divisa', $company['divisa']);
        $this->appendTextElement($doc, $datiDocumento, 'Data', $documentDate);
        $this->appendTextElement($doc, $datiDocumento, 'Numero', $this->resolveDocumentNumber($detail));

        $summary = $this->summarizeLines($lines);
        $totalDocumento = isset($detail['totale']) && is_numeric($detail['totale'])
            ? (float) $detail['totale']
            : $this->calculateSummaryTotal($summary);
        $this->appendTextElement($doc, $datiDocumento, 'ImportoTotaleDocumento', $this->formatAmount($totalDocumento));
        if (!empty($detail['note'])) {
            $this->appendTextElement(
                $doc,
                $datiDocumento,
                'Causale',
                $this->sanitizeText((string) $detail['note'], 200)
            );
        }

        $datiBeniServizi = $doc->createElement('DatiBeniServizi');
        $body->appendChild($datiBeniServizi);
        $this->appendLineItems($doc, $datiBeniServizi, $lines);
        $this->appendSummaryNodes(
            $doc,
            $datiBeniServizi,
            $summary,
            strtoupper((string) ($detail['sdi_esig_code'] ?? 'I'))
        );

        $datiPagamento = $doc->createElement('DatiPagamento');
        $body->appendChild($datiPagamento);
        $this->appendTextElement($doc, $datiPagamento, 'CondizioniPagamento', $company['condizioni_pagamento']);
        $modalitaPagamento = strtoupper((string) ($detail['sdi_mp_code'] ?? $company['modalita_pagamento']));
        $schedule = $detail['condizioni_pagamento_rate'] ?? [];
        if (!is_array($schedule) || empty($schedule)) {
            $schedule = PaymentTerms::buildSchedule(
                isset($detail['cliente_id_cond_pagamento']) ? (int) $detail['cliente_id_cond_pagamento'] : null,
                $documentDate,
                $totalDocumento,
                $this->paymentTerms
            );
        }
        if (empty($schedule)) {
            $schedule = [[
                'due_date' => $this->resolveDueDate($documentDate, $detail['cliente_giorni_pagamento'] ?? null),
                'amount' => $totalDocumento,
            ]];
        }

        foreach ($schedule as $item) {
            $dettaglioPagamento = $doc->createElement('DettaglioPagamento');
            $datiPagamento->appendChild($dettaglioPagamento);
            $this->appendTextElement($doc, $dettaglioPagamento, 'ModalitaPagamento', $modalitaPagamento);
            $dueDate = isset($item['due_date']) ? (string) $item['due_date'] : $documentDate;
            $this->appendTextElement($doc, $dettaglioPagamento, 'DataScadenzaPagamento', $dueDate);
            $importo = isset($item['amount']) && is_numeric($item['amount']) ? (float) $item['amount'] : $totalDocumento;
            $this->appendTextElement($doc, $dettaglioPagamento, 'ImportoPagamento', $this->formatAmount($importo));
        }

        return (string) $doc->saveXML();
    }

    /**
     * @return array{denominazione:string,piva:string,codice_fiscale:string,indirizzo:string,civico:string,cap:string,comune:string,provincia:string,nazione:string,regime:string,formato:string,divisa:string,progressivo_prefix:string,modalita_pagamento:string,condizioni_pagamento:string}
     */
    private function loadCompanyConfig(): array
    {
        $mapping = [
            'denominazione' => getenv('ERP_AZIENDA_DENOMINAZIONE') ?: '',
            'piva' => getenv('ERP_AZIENDA_PIVA') ?: '',
            'codice_fiscale' => getenv('ERP_AZIENDA_CODICE_FISCALE') ?: '',
            'indirizzo' => getenv('ERP_AZIENDA_INDIRIZZO') ?: '',
            'civico' => getenv('ERP_AZIENDA_CIVICO') ?: '',
            'cap' => getenv('ERP_AZIENDA_CAP') ?: '',
            'comune' => getenv('ERP_AZIENDA_COMUNE') ?: '',
            'provincia' => getenv('ERP_AZIENDA_PROVINCIA') ?: '',
            'nazione' => getenv('ERP_AZIENDA_NAZIONE') ?: 'IT',
            'regime' => getenv('ERP_AZIENDA_REGIME_FISCALE') ?: 'RF01',
            'formato' => getenv('ERP_AZIENDA_FORMATO_TRASMISSIONE') ?: 'FPR12',
            'divisa' => getenv('ERP_AZIENDA_VALUTA') ?: 'EUR',
            'progressivo_prefix' => getenv('ERP_AZIENDA_PROGRESSIVO_PREFIX') ?: 'INV',
            'modalita_pagamento' => getenv('ERP_AZIENDA_MODALITA_PAGAMENTO') ?: 'MP05',
            'condizioni_pagamento' => getenv('ERP_AZIENDA_CONDIZIONI_PAGAMENTO') ?: 'TP02',
        ];

        $requiredKeys = ['denominazione', 'piva', 'indirizzo', 'cap', 'comune', 'provincia'];
        $missing = [];
        foreach ($requiredKeys as $key) {
            if (trim((string) $mapping[$key]) === '') {
                $missing[] = strtoupper('ERP_AZIENDA_' . $key);
            }
        }
        if (!empty($missing)) {
            throw new RuntimeException(
                'Configurare le variabili ambiente richieste per l\'esportazione XML: ' . implode(', ', $missing),
                500
            );
        }

        $vatRaw = isset($mapping['piva']) ? (string) $mapping['piva'] : '';
        $vatNumber = strtoupper(preg_replace('/[^A-Z0-9]/', '', $vatRaw) ?? '');
        if ($vatNumber === '') {
            throw new RuntimeException('Partita IVA aziendale non valida.', 500);
        }

        $cfRaw = isset($mapping['codice_fiscale']) ? (string) $mapping['codice_fiscale'] : '';
        $cfSanitized = preg_replace('/[^A-Z0-9]/', '', $cfRaw) ?: $vatNumber;
        $codiceFiscale = strtoupper($cfSanitized);

        return [
            'denominazione' => $this->sanitizeText((string) $mapping['denominazione'], 80),
            'piva' => $vatNumber,
            'codice_fiscale' => $codiceFiscale,
            'indirizzo' => $this->sanitizeText((string) $mapping['indirizzo'], 60),
            'civico' => $this->sanitizeText((string) $mapping['civico']),
            'cap' => $this->sanitizeCap((string) $mapping['cap']),
            'comune' => $this->sanitizeText((string) $mapping['comune'], 60),
            'provincia' => $this->sanitizeProvincia((string) $mapping['provincia']),
            'nazione' => strtoupper($mapping['nazione'] ?: 'IT'),
            'regime' => strtoupper($mapping['regime'] ?: 'RF01'),
            'formato' => strtoupper($mapping['formato'] ?: 'FPR12'),
            'divisa' => strtoupper($mapping['divisa'] ?: 'EUR'),
            'progressivo_prefix' => strtoupper(
                preg_replace('/[^A-Z0-9]/', '', $mapping['progressivo_prefix'] ?: 'INV') ?? 'INV'
            ),
            'modalita_pagamento' => strtoupper($mapping['modalita_pagamento'] ?: 'MP05'),
            'condizioni_pagamento' => strtoupper($mapping['condizioni_pagamento'] ?: 'TP02'),
        ];
    }

    /**
     * @param array<string,mixed> $detail
     * @param array<string,string> $company
     */
    private function buildProgressivoInvio(array $detail, array $company): string
    {
        $baseNumber = $detail['numero_documento'] ?? $detail['id_fattura'] ?? '';
        $cleanNumber = preg_replace('/[^0-9]/', '', (string) $baseNumber) ?: (string) ($detail['id_fattura'] ?? 0);
        $progressivo = $company['progressivo_prefix'] . str_pad($cleanNumber, 5, '0', STR_PAD_LEFT);
        return substr($progressivo, 0, 10);
    }

    /**
     * @param array<string,mixed> $detail
     */
    private function buildFilename(array $detail): string
    {
        $numero = isset($detail['numero_documento']) ? (string) $detail['numero_documento'] : '';
        $anno = isset($detail['anno']) ? (string) $detail['anno'] : '';
        $parts = array_filter([$anno, $numero ?: (string) ($detail['id_fattura'] ?? '')]);
        $suffix = !empty($parts) ? implode('-', $parts) : (string) ($detail['id_fattura'] ?? 'fattura');
        $safe = preg_replace('/[^A-Za-z0-9_\-]/', '_', $suffix) ?? $suffix;
        return sprintf('fattura_%s.xml', $safe ?: 'documento');
    }

    private function resolveInvoiceDate(?string $raw): string
    {
        if ($raw) {
            try {
                return (new DateTimeImmutable($raw))->format('Y-m-d');
            } catch (\Throwable $exception) {
                // fall back
            }
        }

        return (new DateTimeImmutable('today'))->format('Y-m-d');
    }

    private function resolveDueDate(string $invoiceDate, mixed $giorniPagamento): string
    {
        try {
            $date = new DateTimeImmutable($invoiceDate);
        } catch (\Throwable $exception) {
            $date = new DateTimeImmutable('today');
        }
        $days = is_numeric($giorniPagamento) ? (int) $giorniPagamento : 0;
        if ($days > 0) {
            $date = $date->modify(sprintf('+%d days', $days));
        }

        return $date->format('Y-m-d');
    }

    private function resolveDestinatarioCode(?string $raw): string
    {
        $code = strtoupper(trim((string) $raw));
        $code = preg_replace('/[^A-Z0-9]/', '', $code) ?? '';
        if ($code === '') {
            return '0000000';
        }
        return str_pad(substr($code, 0, 7), 7, '0', STR_PAD_RIGHT);
    }

    /**
     * @param list<array<string,mixed>> $lines
     */
    private function appendLineItems(DOMDocument $doc, DOMElement $container, array $lines): void
    {
        $index = 1;
        foreach ($lines as $line) {
            $calc = $this->calculateLine($line);
            $dettaglio = $doc->createElement('DettaglioLinee');
            $this->appendTextElement($doc, $dettaglio, 'NumeroLinea', (string) $index);
            $descrizione = $this->sanitizeText($line['descrizione'] ?? '', 1000, sprintf('Riga %d', $index));
            $this->appendTextElement($doc, $dettaglio, 'Descrizione', $descrizione);
            $this->appendTextElement($doc, $dettaglio, 'Quantita', $this->formatQuantity($calc['quantita']));
            $this->appendTextElement($doc, $dettaglio, 'PrezzoUnitario', $this->formatAmount($calc['unitario']));
            $this->appendTextElement($doc, $dettaglio, 'PrezzoTotale', $this->formatAmount($calc['imponibile']));
            $this->appendTextElement($doc, $dettaglio, 'AliquotaIVA', $this->formatAliquota($calc['aliquota']));
            $naturaCode = $calc['natura'];
            if ($calc['aliquota'] == 0.0 && $naturaCode !== null) {
                $this->appendTextElement($doc, $dettaglio, 'Natura', $naturaCode);
            }
            $container->appendChild($dettaglio);
            $index++;
        }
    }

    /**
     * @param list<array{aliquota:float,imponibile:float,iva:float,natura:?string}> $summary
     */
    private function appendSummaryNodes(
        DOMDocument $doc,
        DOMElement $container,
        array $summary,
        string $esigibilita
    ): void {
        $esigibilitaValue = $esigibilita !== '' ? $esigibilita : 'I';
        foreach ($summary as $bucket) {
            $riepilogo = $doc->createElement('DatiRiepilogo');
            $this->appendTextElement($doc, $riepilogo, 'AliquotaIVA', $this->formatAliquota($bucket['aliquota']));
            $this->appendTextElement($doc, $riepilogo, 'ImponibileImporto', $this->formatAmount($bucket['imponibile']));
            $this->appendTextElement($doc, $riepilogo, 'Imposta', $this->formatAmount($bucket['iva']));
            if ($bucket['aliquota'] == 0.0 && $bucket['natura']) {
                $this->appendTextElement($doc, $riepilogo, 'Natura', $bucket['natura']);
            }
            $this->appendTextElement($doc, $riepilogo, 'EsigibilitaIVA', $esigibilitaValue);
            $container->appendChild($riepilogo);
        }
    }

    /**
     * @param list<array<string,mixed>> $lines
     * @return list<array{aliquota:float,imponibile:float,iva:float,natura:?string}>
     */
    private function summarizeLines(array $lines): array
    {
        $buckets = [];
        foreach ($lines as $line) {
            $calc = $this->calculateLine($line);
            $key = sprintf('%s|%s', $calc['aliquota'], $calc['natura'] ?? '');
            if (!isset($buckets[$key])) {
                $buckets[$key] = [
                    'aliquota' => $calc['aliquota'],
                    'imponibile' => 0.0,
                    'iva' => 0.0,
                    'natura' => $calc['natura'],
                ];
            }
            $buckets[$key]['imponibile'] += $calc['imponibile'];
            $buckets[$key]['iva'] += $calc['iva'];
        }

        return array_map(
            static function (array $bucket): array {
                $bucket['imponibile'] = round($bucket['imponibile'], 2);
                $bucket['iva'] = round($bucket['iva'], 2);
                return $bucket;
            },
            array_values($buckets)
        );
    }

    /**
     * @param array<string,mixed> $line
     * @return array{quantita:float,unitario:float,imponibile:float,iva:float,aliquota:float,natura:?string}
     */
    private function calculateLine(array $line): array
    {
        $qty = isset($line['quantita']) && is_numeric($line['quantita']) ? (float) $line['quantita'] : 1.0;
        if ($qty <= 0) {
            $qty = 1.0;
        }
        $unit = isset($line['prezzo_unitario']) && is_numeric($line['prezzo_unitario'])
            ? (float) $line['prezzo_unitario']
            : 0.0;
        $discount = isset($line['sconto']) && is_numeric($line['sconto']) ? (float) $line['sconto'] : 0.0;
        $aliquota = isset($line['aliquota_iva']) && is_numeric($line['aliquota_iva'])
            ? (float) $line['aliquota_iva']
            : null;
        $imponibile = isset($line['importo_scontato']) && is_numeric($line['importo_scontato'])
            ? (float) $line['importo_scontato']
            : null;

        if ($imponibile === null) {
            $gross = $qty * $unit;
            if ($discount > 0) {
                $gross -= $gross * ($discount / 100);
            }
            $imponibile = $gross;
        }

        $imponibile = max(0.0, round($imponibile, 2));
        $aliquotaValue = $aliquota !== null ? round($aliquota, 2) : 0.0;
        $iva = $aliquota !== null ? round($imponibile * ($aliquotaValue / 100), 2) : 0.0;

        return [
            'quantita' => $qty,
            'unitario' => $unit,
            'imponibile' => $imponibile,
            'iva' => $iva,
            'aliquota' => $aliquotaValue,
            'natura' => $this->resolveNaturaCode($line),
        ];
    }

    private function resolveNaturaCode(array $line): ?string
    {
        if (!empty($line['sdi_natura_code'])) {
            return (string) $line['sdi_natura_code'];
        }

        if (isset($line['id_sdi_natura_iva'])) {
            $id = (int) $line['id_sdi_natura_iva'];
            if ($id > 0 && isset($this->naturaMap[$id])) {
                return $this->naturaMap[$id];
            }
        }

        return null;
    }

    /**
     * @return array<int,string>
     */
    private function loadNaturaMap(): array
    {
        $stmt = $this->pdo->query('SELECT id_natura, code FROM cfg_sdi_natura_iva');
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        $map = [];
        foreach ($rows as $row) {
            $id = isset($row['id_natura']) ? (int) $row['id_natura'] : 0;
            if ($id > 0) {
                $map[$id] = (string) ($row['code'] ?? '');
            }
        }
        return $map;
    }

    private function sanitizeText(?string $value, ?int $maxLength = null, string $fallback = ''): string
    {
        $text = trim((string) $value);
        $text = preg_replace('/[\r\n\t]+/', ' ', $text) ?? '';
        $text = preg_replace('/\s{2,}/', ' ', $text) ?? '';
        if ($text === '' && $fallback !== '') {
            $text = $fallback;
        }
        if ($maxLength !== null && $maxLength > 0) {
            if (function_exists('mb_substr')) {
                $text = mb_substr($text, 0, $maxLength);
            } else {
                $text = substr($text, 0, $maxLength);
            }
        }
        return $text;
    }

    private function sanitizeCap(string $value): string
    {
        $cap = preg_replace('/[^0-9]/', '', $value) ?? '';
        if ($cap === '') {
            return '00000';
        }
        if (strlen($cap) < 5) {
            $cap = str_pad($cap, 5, '0', STR_PAD_LEFT);
        }
        return substr($cap, 0, 10);
    }

    private function sanitizeProvincia(string $value): string
    {
        $province = strtoupper(trim($value));
        if ($province === '') {
            return '';
        }
        return substr($province, 0, 2);
    }

    private function sanitizeFiscalCode(string $value): string
    {
        $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', $value) ?? '');
        return substr($code, 0, 16);
    }

    private function appendTextElement(DOMDocument $doc, DOMElement $parent, string $name, string $value): DOMElement
    {
        $element = $doc->createElement($name);
        $element->appendChild($doc->createTextNode($value));
        $parent->appendChild($element);
        return $element;
    }

    /**
     * @return array{0:?string,1:?string}
     */
    private function parseVat(?string $value, string $defaultCountry): array
    {
        $raw = strtoupper(trim((string) $value));
        if ($raw === '') {
            return [null, null];
        }
        $raw = preg_replace('/[^A-Z0-9]/', '', $raw) ?? '';
        if (preg_match('/^([A-Z]{2})([A-Z0-9]+)$/', $raw, $matches)) {
            return [$matches[1], $matches[2]];
        }
        return [$defaultCountry, $raw];
    }

    private function formatAmount(float $value): string
    {
        return number_format($value, 2, '.', '');
    }

    private function formatQuantity(float $value): string
    {
        $formatted = number_format($value, 5, '.', '');
        return rtrim(rtrim($formatted, '0'), '.') ?: '0';
    }

    private function formatAliquota(float $value): string
    {
        return number_format($value, 2, '.', '');
    }

    /**
     * @param list<array{aliquota:float,imponibile:float,iva:float,natura:?string}> $summary
     */
    private function calculateSummaryTotal(array $summary): float
    {
        $total = 0.0;
        foreach ($summary as $bucket) {
            $total += $bucket['imponibile'] + $bucket['iva'];
        }
        return round($total, 2);
    }

    /**
     * @param array<string,mixed> $detail
     */
    private function resolveDocumentNumber(array $detail): string
    {
        if (isset($detail['numero_documento']) && $detail['numero_documento']) {
            return (string) $detail['numero_documento'];
        }
        return (string) ($detail['id_fattura'] ?? '1');
    }
}
