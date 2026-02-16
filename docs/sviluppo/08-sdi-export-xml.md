# Export e import XML SdI (fatture)

## Endpoint
- Export: `backend/pubblica/fattureExportXml.php` (GET, query `id`)
- Import: `backend/pubblica/fattureImportXml.php` (POST multipart, campo `file`)

## Export XML
- Genera XML fattura con nodi obbligatori SdI
- Restituisce attachment XML in caso positivo
- Restituisce JSON con errore in caso di validazione fallita

## Import XML
- Accetta file XML/SdI via upload
- Esegue validazioni sintattiche e controlli applicativi
- Restituisce JSON con esito e dettagli errori/avvisi

## Variabili ambiente richieste
Configurare in `backend/.env`:
- `ERP_AZIENDA_DENOMINAZIONE`
- `ERP_AZIENDA_PIVA`
- `ERP_AZIENDA_CODICE_FISCALE`
- `ERP_AZIENDA_INDIRIZZO`
- `ERP_AZIENDA_CIVICO`
- `ERP_AZIENDA_CAP`
- `ERP_AZIENDA_COMUNE`
- `ERP_AZIENDA_PROVINCIA`
- `ERP_AZIENDA_NAZIONE`
- `ERP_AZIENDA_REGIME_FISCALE`
- `ERP_AZIENDA_FORMATO_TRASMISSIONE`
- `ERP_AZIENDA_VALUTA`
- `ERP_AZIENDA_PROGRESSIVO_PREFIX`
- `ERP_AZIENDA_MODALITA_PAGAMENTO`
- `ERP_AZIENDA_CONDIZIONI_PAGAMENTO`

## Frontend
- Servizio: `src/services/fatture.js`
- UI: viste fatture con azioni import/export e feedback utente

## Controlli raccomandati
- Test export su fattura completa e incompleta
- Test import su XML valido, duplicato e malformato
- Verifica coerenza progressivo con prefisso azienda
