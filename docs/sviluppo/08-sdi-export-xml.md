# Export XML SdI (fatture)

## Endpoint
- `GET /fattureExportXml.php`
- File: `backend/pubblica/fattureExportXml.php`

## Input
Query param:
- `id` (obbligatorio) - id fattura da esportare

## Output
- `Content-Type: application/xml`
- `Content-Disposition: attachment; filename="..."` con XML allegato
- Errori in JSON con codice HTTP coerente (422/404/500)

## Variabili ambiente richieste
Da impostare in `backend/.env`:
- `ERP_AZIENDA_DENOMINAZIONE`
- `ERP_AZIENDA_PIVA`
- `ERP_AZIENDA_CODICE_FISCALE`
- `ERP_AZIENDA_INDIRIZZO`
- `ERP_AZIENDA_CIVICO`
- `ERP_AZIENDA_CAP`
- `ERP_AZIENDA_COMUNE`
- `ERP_AZIENDA_PROVINCIA`
- `ERP_AZIENDA_NAZIONE`
- `ERP_AZIENDA_REGIME_FISCALE` (es. RF01)
- `ERP_AZIENDA_FORMATO_TRASMISSIONE` (es. FPR12)
- `ERP_AZIENDA_VALUTA`
- `ERP_AZIENDA_PROGRESSIVO_PREFIX`
- `ERP_AZIENDA_MODALITA_PAGAMENTO` (es. MP05)
- `ERP_AZIENDA_CONDIZIONI_PAGAMENTO` (es. TP02)

## Note operative
- L'export usa i dati della fattura e delle sue righe presenti a DB.
- Se mancano campi obbligatori, la risposta contiene un errore esplicativo.
- Il frontend richiama l'endpoint tramite `src/services/fatture.js`.
