# Export e import XML SdI (fatture)

## Export
- `GET /fattureExportXml.php` (`backend/pubblica/fattureExportXml.php`)
- Query param `id` (obbligatorio) – id della fattura da esportare.
- Risposta: `Content-Type: application/xml` e `Content-Disposition` con
  attachment (altrimenti JSON con errori 422/404/500).
- Il backend concatena header fattura/righe, calcola `TotaleDocumento`
  e inserisce gli elementi obbligatori (`CessionarioCommittente`,
  `DatiBeniServizi`, `DatiPagamento`, ecc.).

## Import
- `POST /fattureImportXml.php` (`backend/pubblica/fattureImportXml.php`).
- Richiede un upload `multipart/form-data` con parametro `file` (XML o SdI)
  e può ricevere `tipo` per specificare il tipo di documento allegato.
- Il backend valida struttura XML, verifica il progressivo progressivo (sotto
  `ERP_AZIENDA_PROGRESSIVO_PREFIX`) e restituisce JSON con esito,
  dettagli e potenziali errori di validazione (422/400/500).
- Il frontend usa `src/services/fatture.js` (`exportFatturaXml`, `importFatturaXml`)
  per scaricare o inviare i file; la UI mostra spinner, toasts e il log dell’esito.

## Variabili ambiente richieste
Da definire in `backend/.env` (necessarie per export e per associare il progressivo):
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
- L’export prende i dati fattura + righe + pagamenti e costruisce l’XML
  con nodi obbligatori (se manca un campo viene restituito errore).
- L’import controlla che il file XML non sia già stato processato
  verificando il progressivo (prefisso `ERP_AZIENDA_PROGRESSIVO_PREFIX`) e
  la tipologia; eventuali errori sono spiegati nel JSON di risposta.
- I client FE mostrano spinner e messaggi grazie a `src/services/fatture.js`
  e alle toast globali (`BottomToast`, `AppNotificationBell`).
