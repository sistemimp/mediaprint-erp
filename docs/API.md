# MediaPrint ERP — Documentazione API

Questa documentazione descrive le API sottostanti il progetto MediaPrint ERP esposte dalla cartella `backend/pubblica`.

- Base URL di produzione: `https://gestionale.mediaprint.it/pubblica/`
- Content-Type: `application/json` (per tutte le richieste POST)
- Risposte: JSON con codici HTTP significativi (`200`, `201`, `4xx`, `5xx`)
- Autenticazione: JWT via `Authorization: Bearer <token>` (login via `/login.php`)

Nota: in sviluppo il frontend può usare `/api` come proxy verso `backend/pubblica`.

## Autenticazione

POST `/login.php`

- Body JSON
  - `identifier` | `email` | `username`: string (uno tra questi)
  - `password`: string
- Risposte
  - 200 OK: `{ token: string, user: { id, accountType, username, email, mustChangePassword, hasMfa, roles: [{id,code,label}], permissions: [{id,code,label}], lastLogin } }`
  - 401/403/422/500: `{ message: string, ... }`
- Esempio richiesta
```json
{
  "identifier": "m.rossi",
  "password": "••••••••"
}
```
- Esempio risposta
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 12,
    "accountType": "admin",
    "username": "m.rossi",
    "email": "m.rossi@example.com",
    "mustChangePassword": false,
    "hasMfa": false,
    "roles": [{ "id": 1, "code": "admin", "label": "Amministratore" }],
    "permissions": [{ "id": 101, "code": "anagrafiche.read", "label": "Lettura anagrafiche" }],
    "lastLogin": "2025-10-09 14:22:31"
  }
}
```

## Convenzioni di errore

- Metodo non consentito: 405 `{ message: "Metodo non consentito." }`
- Validazione: 422 `{ message: "..." }`
- Non trovato: 404 `{ message: "..." }`
- Errore interno: 500 `{ message: "Errore interno inatteso.", error?: string }`
- Dashboard: su errore `{ ok: false, error: string, message: string }`

## Anagrafiche

### Lista attive
GET `/anagraficheList.php`

- Query param
  - `search`: string (facoltativo)
  - `sort_by`: `ragione_sociale` | `piva` | `codice_fiscale` | `stato` | `created_at`
  - `sort_direction`: `asc` | `desc` (default `asc`)
  - `page`: int (>=1)
  - `per_page`: int (1..100)
- Risposta 200
```json
{
  "data": [
    {
      "id_anagrafica": 123,
      "ragione_sociale": "ACME S.p.A.",
      "piva": "IT01234567890",
      "codice_fiscale": "ABCDEF12G34H567I",
      "stato": "attiva",
      "created_at": "2025-09-05 10:00:00",
      "updated_at": "2025-10-01 09:12:33",
      "indirizzo": "Via Roma 1",
      "cap": "20100",
      "citta": "Milano",
      "provincia": "MI",
      "nazione": "IT"
    }
  ],
  "meta": { "total": 42, "page": 1, "per_page": 20, "pages": 3 }
}
```

Note
- La lista esclude di default le anagrafiche con `is_active = 0`.
- Se presente, l’indirizzo è prelevato dalla sede legale.

### Lista archivio
GET `/anagraficheArchiveList.php`

- Query param
  - `search`, `sort_by` (`ragione_sociale` | `piva` | `codice_fiscale` | `archived_at`), `sort_direction` (`asc`|`desc`), `page`, `per_page`
- Risposta 200
```json
{
  "data": [
    { "id_anagrafica": 98, "ragione_sociale": "Foo SRL", "piva": "...", "codice_fiscale": "...", "stato": "disattiva", "archived_at": "2025-08-01 10:05:00" }
  ],
  "meta": { "total": 3, "page": 1, "per_page": 20, "pages": 1 }
}
```

### Dettaglio
GET `/anagraficheDetail.php`

- Query param
  - `id` | `id_anagrafica`: int (obbligatorio)
- Risposta 200
```json
{
  "anagrafica": { "id_anagrafica": 123, "ragione_sociale": "ACME S.p.A.", "piva": "...", "codice_fiscale": "...", "stato": "attiva", "is_active": 1, "id_tipologia": 1, "id_sdi_regime_fiscale": null, "is_pa": 0, "note": null, "created_at": "...", "updated_at": "..." },
  "fiscale": { "pec": null, "codice_sdi": null, "iban": null, "banca": null, "id_cond_pagamento": null, "modalita_pagamento": null, "giorni_pagamento": null, "altri_dati": null },
  "contatti": [ { "id_contatto": 1, "nome": "Mario", "ruolo": "", "telefono": "", "cellulare": "", "email": "", "is_predefinito": 0, "id_sede": 10 } ],
  "sedi": [ { "id_sede": 10, "id_tipo": 1, "denominazione": "Sede legale", "indirizzo": "Via Roma 1", "cap": "20100", "comune": "Milano", "provincia": "MI", "nazione_iso2": "IT", "telefono": null, "email": null, "note": null, "is_legale": 1, "is_predefinita": 1, "created_at": "...", "updated_at": "..." } ],
  "preventivi": [ { "id_preventivo": 45, "anno_preventivo": 2025, "numero_documento": 12, "data_preventivo": "2025-09-28", "totale": 123.45, "stato": "bozza" } ],
  "ddt": [ { "id_ddt": 7, "anno": 2025, "numero_documento": 3, "data_ddt": "2025-09-01", "totale_pezzi": 10, "causale": "Vendita", "note": null } ],
  "fatture": [ { "id_fattura": 9, "anno": 2025, "numero_documento": 15, "data_fattura": "2025-09-30", "tipo": "immediata", "stato": "bozza", "totale": 200.0, "saldo": 0.0 } ]
}
```

### Creazione
POST `/anagraficheCreate.php`

- Body JSON (campi principali)
  - `ragione_sociale` (obbligatorio)
  - `piva`, `codice_fiscale`, `email`, `telefono`, `indirizzo`, `cap`, `citta`, `provincia`, `nazione`, `note`
  - `id_tipologia`, `id_sdi_regime_fiscale` (int)
  - `is_pa`, `is_active` (0/1), `stato` (default `attiva`)
- Risposte
  - 201 Created: `{ id_anagrafica: number }`
  - 422 su validazione

### Aggiornamento
POST `/anagraficheUpdate.php`

- Body JSON (parziale)
  - `id` | `id_anagrafica`: int (obbligatorio)
  - `anagrafica`: campi base aggiornabili (come in create). Se include `is_active: 0` attiva l’archiviazione completa e la cancellazione dai master.
  - `fiscale`: `{ pec, codice_sdi, iban, banca, id_cond_pagamento, modalita_pagamento, giorni_pagamento, altri_dati }`
  - `sedi`: lista operazioni `[{ action: "create"|"update"|"delete", id_sede?, denominazione?, indirizzo?, civico?, cap?, comune?, provincia?, nazione_iso2?, telefono?, email?, note?, is_legale?, is_predefinita? }]`
  - `contatti`: lista operazioni `[{ action: "create"|"update"|"delete", id_contatto?, nome?, ruolo?, telefono?, cellulare?, email?, is_predefinito?, id_sede? }]`
- Risposta 200: `{ ok: true }`

### Riattivazione da archivio
POST `/anagraficheReactivate.php`

- Body JSON: `{ id | id_anagrafica }`
- Risposta 200: `{ ok: true }`

## Prodotti

### Categorie — lista
GET `/prodotti/categorie/list.php`

- Risposta 200
```json
{ "items": [ { "id_categoria": 1, "nome": "Etichette" } ] }
```

### Categorie — crea/aggiorna
POST `/prodotti/categorie/save.php`

- Body JSON: `{ id_categoria?: int, nome: string }`
- Risposta 200: `{ id_categoria: int }`

### Prodotti — lista
GET `/prodotti/list.php`

- Query param
  - `id_categoria`: int (facoltativo)
  - `q`: ricerca su nome/codice (facoltativo)
- Risposta 200
```json
{ "items": [ { "id_prodotto": 10, "id_categoria": 1, "codice": "P-001", "nome": "Carta 100g", "prezzo_listino": 12.5, "id_iva": 1, "iva_percento": 22 } ] }
```

### Prodotti — dettaglio
GET `/prodotti/detail.php?id=...`

- Risposta 200
```json
{ "item": { "id_prodotto": 10, "id_categoria": 1, "codice": "P-001", "nome": "Carta 100g", "descrizione": null, "prezzo_listino": 12.5, "id_iva": 1 } }
```

### Prodotti — creazione
POST `/prodotti/create.php`

- Body JSON: `{ nome: string, codice?: string, id_categoria?: int, prezzo_listino?: number, id_iva?: int }`
- Risposta 201: `{ id_prodotto: int }`

### Prodotti - aggiornamento
POST `/prodotti/update.php`

- Body JSON: `{ id_prodotto: int, nome: string, codice?: string, id_categoria?: int, prezzo_listino?: number, id_iva?: int }`
- Risposta 200: `{ ok: true }`

## Fatture

### Export XML SdI
GET `/fattureExportXml.php`

- Query param
  - `id`: int (obbligatorio) – identificativo della fattura da esportare
- Risposta 200: viene inviato direttamente l'XML (`Content-Type: application/xml`, `Content-Disposition: attachment; filename="..."`).
- Errori: JSON `{ message: "..." }` con codici HTTP coerenti (422 su validazione, 404 se non trovata, 500 su errori interni).

Note operative:
- L'esportazione si basa sulle righe e sui dati fiscali presenti su `tb_fatture`; eventuali campi mancanti generano errori espliciti.
- È necessario valorizzare in `.env` le variabili `ERP_AZIENDA_*` (denominazione, P.IVA, indirizzo, regime fiscale, ecc.) per compilare le sezioni `CedentePrestatore` e `DatiTrasmissione`.

### Variazioni — lista
GET `/prodotti/variazioni/list.php`

- Risposta 200
```json
{ "items": [ { "id_variazione": 5, "codice": "V-RED", "nome": "Colore Rosso", "categoria": "Colore", "prezzo": 0.5 } ] }
```

### Variazioni — crea/aggiorna
POST `/prodotti/variazioni/save.php`

- Body JSON: `{ id_variazione?: int, nome: string, prezzo?: number|null, categoria?: string|null, codice?: string|null }`
- Risposta 200: `{ id_variazione: int }`

### Variazioni — elimina
POST `/prodotti/variazioni/delete.php`

- Body JSON: `{ id_variazione: int }`
- Risposta 200: `{ ok: true }`

### Variazioni per prodotto — lista/azioni
GET/POST `/prodotti/variazioni/prodotto.php`

- GET query: `id_prodotto` (int)
  - 200: `{ items: [ { id_variazione, codice, nome, categoria, prezzo, delta_prezzo } ] }`
- POST body:
  - Link: `{ action: "link", id_prodotto: int, id_variazione: int, delta?: number }`
  - Unlink: `{ action: "unlink", id_prodotto: int, id_variazione: int }`
  - Set delta: `{ action: "set", id_prodotto: int, id_variazione: int, delta: number }`
  - Risposta 200: `{ ok: true }`

### Prezzi combinati (multi-variazione)
GET/POST `/prodotti/variazioni/prezzi.php`

- GET query: `id_prodotto` (int)
  - 200: `{ items: [ { id, id_prodotto, combo_key, var_ids: [int,...], prezzo } ] }`
- POST body:
  - Upsert: `{ action: "upsert", id_prodotto: int, var_ids: [int,...], prezzo: number }`
  - Delete: `{ action: "delete", id_prodotto: int, var_ids: [int,...] }`
  - Risposta 200: `{ id: int }` per upsert, `{ ok: true }` per delete

Note
- La chiave combinazione `combo_key` è ottenuta ordinando gli ID variazione e unendoli con `+`.
- Se esiste un prezzo combinato per le variazioni scelte, il frontend può usarlo come prezzo finale del prodotto in alternativa a `prezzo_listino + somma(delta)`.

## Preventivi

### Lista ultimi
GET `/preventiviList.php`

- Query param: `limit` (int, max 10)
- Risposta 200
```json
{
  "data": [
    {
      "id_preventivo": 101,
      "anno_preventivo": 2025,
      "numero_documento": 12,
      "data_preventivo": "2025-10-05",
      "totale_imponibile": 100,
      "totale_sconto": 0,
      "totale_iva": 22,
      "totale": 122,
      "ragione_sociale": "ACME S.p.A.",
      "stato_code": "bozza",
      "stato_label": "Bozza",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### Dettaglio
GET `/preventiviDetail.php?id=...`

- Risposta 200
```json
{
  "data": { "id_preventivo": 101, "anno_preventivo": 2025, "numero_documento": 12, "data_preventivo": "2025-10-05", "oggetto": "Stampa brochure A4", "riferimento_cliente": "ORD-2025-003", "stato_code": "bozza", "totale": 122, "totale_imponibile": 100, "totale_sconto": 0, "totale_iva": 22, "note": null, "id_anagrafica": 123, "ragione_sociale": "ACME S.p.A." },
  "righe": [ { "id_riga": 1, "id_prodotto": 10, "descrizione": "Carta 100g", "quantita": 2, "prezzo_unitario": 50, "sconto": 0, "importo_scontato": 100, "iva": 22, "id_sdi_natura_iva": null, "totale": 122, "posizione": 1 } ],
  "meta": {
    "editable": true,
    "revisions": [
      {
        "id_revisione": 1,
        "id_preventivo": 101,
        "numero_revision": 1,
        "label": "Rev.1",
        "note": "Email inviata: Preventivo 12/2025",
        "operatore": "mrossi",
        "created_at": "2025-10-05 15:30:00"
      }
    ]
  }
}
```

- `meta.revisions`: elenco delle revisioni (ordine decrescente), ogni voce contiene `id_revisione`, `numero_revision`, `label`, `note`, `operatore` e `created_at`.

### Dettaglio revisione
GET `/preventiviRevisionDetail.php?id=...`

- Risposta 200
```json
{
  "revision": {
    "id_revisione": 1,
    "id_preventivo": 101,
    "numero_revision": 1,
    "label": "Rev.1",
    "note": "Email inviata: Preventivo 12/2025",
    "operatore": "mrossi",
    "created_at": "2025-10-05 15:30:00",
    "payload": {
      "detail": {
        "data": { "numero_documento": 12, "anno_preventivo": 2025, "data_preventivo": "...", "oggetto": "...", "totale": 122, "...": "..." },
        "righe": [ /* stesse righe inviate */ ],
        "cig": [],
        ...
      }
    }
  }
}
```

- `payload.detail` è il dettaglio completo del preventivo al momento dell'invio (stessa struttura restituita da `preventiviDetail`).

### Revisioni in lista documenti
POST `/preventiviRevisionsSummary.php`

- Body JSON: `{ ids: number[] }` (es. `[45, 82, 123]`)
- Risposta 200
```json
{
  "data": [
    {
      "id_preventivo": 45,
      "revisions": [
        { "id_revisione": 1, "label": "Rev.1", "created_at": "...", "totale_imponibile": 100, "totale_iva": 22, "totale": 122 },
        { "id_revisione": 2, "label": "Rev.2", "created_at": "...", "totale_imponibile": 120, "totale_iva": 26.4, "totale": 146.4 }
      ]
    }
  ]
}
```

- L'array `data` restituisce per ogni `id_preventivo` la lista di revisioni disponibili, con i totali di `imponibile`, `IVA` e `totale` da mostrare in lista.
- `meta.revisions`: elenco delle revisioni (ordine decrescente), ogni voce contiene `id_revisione`, `numero_revision`, `label`, `note`, `operatore` e `created_at`.

### Crea/aggiorna/invia
POST `/preventiviCreate.php`

- Body JSON
  - Per nuova bozza: `{ id_anagrafica: int, data_preventivo?: string(YYYY-MM-DD), oggetto?: string, riferimento_cliente?: string, note?: string, righe?: [ { descrizione, quantita?, prezzo?, sconto?, iva?, id_prodotto?, id_sdi_natura_iva? } ], totals?: { imponibile, sconto, totaleIva, totale }, send?: boolean }`
  - Per aggiornare bozza esistente: aggiungere `id_preventivo` (int)
  - Per “inviare” (confermare/numero): impostare `send: true`
- Risposte
  - 201 Created: 
    - Se bozza: `{ status: "draft", id_preventivo, anno_preventivo?, numero_documento? }`
    - Se inviato: `{ status: "sent", id_preventivo, anno_preventivo, numero_documento }`
  - 422/404 su errori
-
### Lista nuovi clienti mese
GET `/dashboardNewClients.php`

- Query param: `limit` (int, default 20, max 100)
- Risposta 200
```json
{
  "ok": true,
  "data": [
    {
      "id_anagrafica": 123,
      "ragione_sociale": "ACME S.p.A.",
      "piva": "IT01234567890",
      "codice_fiscale": null,
      "email": "info@acme.it",
      "created_at": "2025-12-01 09:12:00"
    }
  ],
  "meta": { "limit": 20, "count": 1 }
}
```


## Dashboard

GET `/dashboard.php`

- Query param: `only_active` (0|1)
- Risposta 200
```json
{
  "ok": true,
  "kpi": {
    "totale_generale": 1200,
    "nuovi_mese_corrente": 30,
    "nuovi_mese_precedente": 20,
    "perc_change_mom": 50.0
  },
  "series": [
    { "mese": "2025-06", "tot": 200, "attive": 180, "disattive": 20 }
  ],
  "sales": {
    "fatturato": 3800.25,
    "nuovi_clienti": 12,
    "tasso_conversione": 41.7,
    "preventivi_totali": 29,
    "preventivi_confermati": 12,
    "period": "2025-06"
  }
}
```

- `fatture_series`: lista degli ultimi 12 mesi con `mese`, `totale` (importo fatture emesse) e `pagate` (parte saldata), utile per disegnare l’andamento del fatturato.
- `conversion_series`: ultimi 6 mesi con `periodo`, `totale` preventivi, `confermati` (stato confermato) e `tasso` (%) di conversione.

- `sales`: riepilogo delle vendite del mese corrente con fatturato (IVA compresa), numero di nuovi clienti acquisiti, percentuale di preventivi accettati, conteggio totale e confermato dei preventivi e il periodo in formato `YYYY-MM`.

## Configurazioni

### Nature IVA
GET `/natureIvaList.php`

- Risposta 200
```json
{ "items": [ { "id_natura": 1, "code": "N1", "label": "Escluse ex art.15" } ] }
```

### Aliquote IVA
GET `/ivaList.php`

- Risposta 200
```json
{ "items": [ { "id_iva": 1, "label": "22%", "aliquota": 22 } ] }
```

### Termini di pagamento
GET `/paymentTermsList.php`

- Risposta 200
```json
{ "items": [ { "id": 1, "label": "30 gg" } ] }
```

## Indice completo endpoint

Questa sezione elenca tutte le route presenti in `backend/pubblica/`.
Per le route gia documentate in dettaglio, fare riferimento alle sezioni
specifiche sopra.

### Sessione e profilo
- POST `/login.php` - login JWT (vedi sezione Autenticazione)
- GET `/me.php` - profilo utente autenticato

### Accounts
- GET `/accountsList.php` - lista account (query: `page`, `per_page`)
- POST `/accountsCreate.php` - crea account (body JSON)
- POST `/accountsUpdate.php` - aggiorna account (body JSON)
- POST `/accountsDelete.php` - elimina account (body JSON)
- POST `/accountsResetPassword.php` - reset password (body JSON)
- POST `/accountsWelcomeEmail.php` - invio email benvenuto (body JSON)
- GET `/accountsRolesList.php` - lista ruoli disponibili
- GET `/accountsAnagrafiche.php` - elenco anagrafiche associabili
- GET `/accountsContattiList.php` - elenco contatti associabili

### Anagrafiche
- GET `/anagraficheList.php` - lista attive (vedi sezione Anagrafiche)
- GET `/anagraficheArchiveList.php` - lista archivio (vedi sezione Anagrafiche)
- GET `/anagraficheDetail.php` - dettaglio (vedi sezione Anagrafiche)
- POST `/anagraficheCreate.php` - creazione (vedi sezione Anagrafiche)
- POST `/anagraficheUpdate.php` - aggiornamento (vedi sezione Anagrafiche)
- POST `/anagraficheReactivate.php` - riattivazione da archivio
- GET `/anagraficheDashboard.php` - KPI anagrafiche (query: `only_active`, `period`)

### Contratti
- GET `/contrattiList.php` - lista contratti
- GET `/contrattiDetail.php` - dettaglio contratto
- POST `/contrattiSave.php` - crea/aggiorna contratto
- POST `/contrattiDelete.php` - elimina contratto
- POST `/contrattiStatus.php` - lista stati contratto
- GET `/contrattiActive.php` - contratti attivi (query: `id_anagrafica`)
- GET `/contrattiRevisionDetail.php` - dettaglio revisione (query: `id`)
- POST `/contrattiSendEmail.php` - invio contratto via email

### Preventivi
- GET `/preventiviList.php` - lista (vedi sezione Preventivi)
- GET `/preventiviDetail.php` - dettaglio (vedi sezione Preventivi)
- POST `/preventiviCreate.php` - crea/aggiorna/invia (vedi sezione Preventivi)
- GET `/preventiviRevisionDetail.php` - dettaglio revisione (query: `id`)
- POST `/preventiviRevisionsSummary.php` - riepilogo revisioni
- POST `/preventiviSendEmail.php` - invio email preventivo
- GET `/preventiviStatus.php` - lista stati preventivo
- GET `/preventiviArchiveList.php` - lista archivio
- POST `/preventiviArchive.php` - archivia preventivo
- POST `/preventiviReactivate.php` - riattiva preventivo
- POST `/preventiviEmitDdt.php` - genera DDT da preventivo
- POST `/preventiviEmitFattura.php` - genera fattura da preventivo
- POST `/preventiviGenerateLavorazione.php` - genera lavorazione
- GET `/preventiviOggettiList.php` - lista oggetti
- POST `/preventiviOggettiCreate.php` - crea oggetto
- GET `/preventiviDashboard.php` - KPI preventivi (query: `period`)

### DDT
- GET `/ddtList.php` - lista DDT (query: `limit`)
- GET `/ddtDetail.php` - dettaglio DDT (query: `id`)
- POST `/ddtUpdate.php` - crea/aggiorna DDT
- GET `/ddtCausaliList.php` - lista causali
- GET `/ddtDestinazioni.php` - lista destinazioni
- GET `/ddtDashboard.php` - KPI DDT (query: `period`)

### Fatture
- GET `/fattureList.php` - lista (query: `limit`)
- GET `/fattureDetail.php` - dettaglio (query: `id`)
- POST `/fattureUpdate.php` - crea/aggiorna fattura
- GET `/fattureStatusLog.php` - log stati (query: `id`, `limit`, `offset`)
- GET `/fattureConfig.php` - configurazioni fatture
- GET `/fattureDashboard.php` - KPI fatture (query: `period`)
- GET `/fattureExportXml.php` - export XML SdI (vedi sezione Fatture)
- GET `/fatturePagamentiList.php` - pagamenti fattura (query: `id`)
- POST `/fatturePagamentiSave.php` - salva pagamento
- POST `/fatturePagamentiDelete.php` - elimina pagamento

### Prodotti e variazioni
- GET `/prodotti/list.php` - lista prodotti (vedi sezione Prodotti)
- GET `/prodotti/detail.php` - dettaglio prodotto (vedi sezione Prodotti)
- POST `/prodotti/create.php` - crea prodotto (vedi sezione Prodotti)
- POST `/prodotti/update.php` - aggiorna prodotto (vedi sezione Prodotti)
- POST `/prodotti/delete.php` - elimina prodotto
- GET `/prodotti/categorie/list.php` - lista categorie
- POST `/prodotti/categorie/save.php` - crea/aggiorna categoria
- GET `/prodotti/variazioni/list.php` - lista variazioni
- POST `/prodotti/variazioni/save.php` - crea/aggiorna variazione
- POST `/prodotti/variazioni/delete.php` - elimina variazione
- GET/POST `/prodotti/variazioni/prodotto.php` - link/unlink variazioni
- GET/POST `/prodotti/variazioni/prezzi.php` - prezzi combinati
- GET `/prodottiDashboard.php` - KPI prodotti

### Lavorazioni
- GET `/lavorazioniList.php` - lista lavorazioni
- GET `/lavorazioniDetail.php` - dettaglio lavorazione
- POST `/lavorazioniUpdate.php` - crea/aggiorna lavorazione
- POST `/lavorazioniStatus.php` - aggiorna stato lavorazione
- POST `/lavorazioniAssign.php` - assegna lavorazione
- GET `/lavorazioniAssignmentsConfig.php` - config assegnazioni
- GET `/lavorazioniDashboard.php` - KPI lavorazioni
- GET `/lavorazioniDocuments.php` - documenti lavorazione
- GET `/lavorazioniFilesList.php` - lista file allegati
- GET `/lavorazioniFilesDownload.php` - download file (query: `id`)
- POST `/lavorazioniFilesUpload.php` - upload file (multipart, field `file`)
- GET `/lavorazioniNotifications.php` - lista notifiche (query: `id_account`)
- POST `/lavorazioniNotificationsRead.php` - segna notifiche lette
- POST `/lavorazioniNotifyOperators.php` - notifica operatori
- POST `/lavorazioniActivityCreate.php` - crea attivita
- POST `/lavorazioniActivityUpdate.php` - aggiorna attivita
- POST `/lavorazioniActivityDelete.php` - elimina attivita
- POST `/lavorazioniActivityStatus.php` - stato attivita
- POST `/lavorazioniActivityAssign.php` - assegna attivita
- POST `/lavorazioniActivityReport.php` - report attivita
- GET `/lavorazioniActivityTemplates.php` - lista template
- POST `/lavorazioniActivityTemplatesSave.php` - salva template

### Pagamenti
- GET `/pagamentiList.php` - lista pagamenti (query: `q`, `id_anagrafica`, `date_from`, `date_to`, `pending_only_open`)
- GET `/pagamentiDetail.php` - dettaglio pagamento (query: `id`)
- GET `/pagamentiLedger.php` - ledger (query: `q`, `limit`)
- GET `/pagamentiInvoicesSearch.php` - ricerca fatture (query: `q`, `limit`, `id_anagrafica`, `solo_aperti`)
- POST `/pagamentiAssignAnagrafica.php` - associa anagrafica
- GET `/pagamentiDashboard.php` - KPI pagamenti (query: `period`)
- POST `/pagamentiImportUpload.php` - upload file import (multipart, field `file`)
- POST `/pagamentiImportConfirm.php` - conferma import

### Pacchetti
- GET `/pacchettiList.php` - lista pacchetti (query: `q`)
- GET `/pachettiDetail.php` - dettaglio pacchetto (query: `id`/`id_pacchetto`)
- GET `/Pacchetti/list.php` - lista pacchetti (query: `q`)
- GET `/Pacchetti/detail.php` - dettaglio pacchetto (query: `id`/`id_pacchetto`)
- POST `/Pacchetti/save.php` - crea/aggiorna pacchetto
- POST `/Pacchetti/delete.php` - elimina pacchetto

### Dashboard
- GET `/dashboard.php` - KPI generali (vedi sezione Dashboard)
- GET `/dashboardNewClients.php` - nuovi clienti (query: `limit`, `period`)

## Dettagli endpoint (campi noti)

<!-- BEGIN: endpoint-details -->
### Accounts
#### `GET /accountsAnagrafiche.php`
- Permessi: `cfg.view`

#### `GET /accountsContattiList.php`
- Permessi: `cfg.view`

#### `POST /accountsCreate.php`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /accountsDelete.php`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /accountsList.php`
- Query: `page`, `per_page`
- Permessi: `cfg.view`

#### `POST /accountsResetPassword.php`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /accountsRolesList.php`
- Permessi: `cfg.view`

#### `POST /accountsUpdate.php`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /accountsWelcomeEmail.php`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

### Altro
#### `GET /pachettiDetail.php`
- Query: `id`, `id_pacchetto`
- Permessi: `cfg.view`

#### `GET /prodottiDashboard.php`
- Permessi: `cfg.view`

### Anagrafiche
#### `GET /anagraficheArchiveList.php`
- Query: `allowed_anagrafiche`
- Permessi: `anag.view`

#### `POST /anagraficheCreate.php`
- Permessi: `anag.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /anagraficheDashboard.php`
- Query: `only_active`, `period`
- Permessi: `anag.view`

#### `GET /anagraficheDetail.php`
- Query: `allowed_anagrafiche`
- Permessi: `anag.view`

#### `GET /anagraficheList.php`
- Query: `allowed_anagrafiche`
- Permessi: `anag.view`

#### `POST /anagraficheReactivate.php`
- Permessi: `anag.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /anagraficheUpdate.php`
- Permessi: `anag.edit`
- Accesso: utenti con accountType `cliente` non consentiti

### Configurazioni
#### `GET /ivaList.php`
- Note: nessun parametro specifico rilevato

#### `GET /natureIvaList.php`
- Note: nessun parametro specifico rilevato

#### `GET /paymentTermsList.php`
- Note: nessun parametro specifico rilevato

### Contratti
#### `GET /contrattiActive.php`
- Query: `id_anagrafica`
- Permessi: `anag.view`

#### `POST /contrattiDelete.php`
- Permessi: `anag.edit`

#### `GET /contrattiDetail.php`
- Permessi: `anag.view`

#### `GET /contrattiList.php`
- Permessi: `anag.view`

#### `GET /contrattiRevisionDetail.php`
- Query: `id`

#### `POST /contrattiSave.php`
- Permessi: `anag.edit`

#### `POST /contrattiSendEmail.php`
- Note: nessun parametro specifico rilevato

#### `POST /contrattiStatus.php`
- Note: nessun parametro specifico rilevato

### DDT
#### `GET /ddtCausaliList.php`
- Note: nessun parametro specifico rilevato

#### `GET /ddtDashboard.php`
- Query: `period`
- Permessi: `ddt.view`

#### `GET /ddtDestinazioni.php`
- Note: nessun parametro specifico rilevato

#### `GET /ddtDetail.php`
- Query: `id`
- Permessi: `ddt.view`

#### `GET /ddtList.php`
- Query: `limit`
- Permessi: `ddt.view`

#### `POST /ddtUpdate.php`
- Body JSON: `aspetto`, `cura_trasporto`, `data_ddt`, `data_trasporto`, `destinazione_merce`, `id`, `id_anagrafica`, `id_causale`, `id_ddt`, `id_destinazione_predefinita`, `id_sede_destinazione`, `note`, `numero_colli`, `righe`, `stato_documento`, `vettore`

### Dashboard
#### `GET /dashboard.php`
- Query: `only_active`, `period`
- Permessi: `anag.view`, `cfg.view`, `ddt.view`, `fatt.view`, `job.view`, `pay.view`, `prev.view`

#### `GET /dashboardNewClients.php`
- Query: `limit`, `period`
- Permessi: `anag.view`

### Fatture
#### `GET /fattureConfig.php`
- Note: nessun parametro specifico rilevato

#### `GET /fattureDashboard.php`
- Query: `period`
- Permessi: `fatt.view`

#### `GET /fattureDetail.php`
- Query: `id`
- Permessi: `fatt.view`

#### `GET /fattureExportXml.php`
- Query: `id`

#### `GET /fattureList.php`
- Query: `limit`
- Permessi: `fatt.view`

#### `POST /fatturePagamentiDelete.php`
- Body JSON: `id_fattura`, `id_pag_fattura`, `id_pagamento`

#### `GET /fatturePagamentiList.php`
- Query: `id`

#### `POST /fatturePagamentiSave.php`
- Note: nessun parametro specifico rilevato

#### `GET /fattureStatusLog.php`
- Query: `id`, `limit`, `offset`

#### `POST /fattureUpdate.php`
- Body JSON: `cliente_banca`, `cliente_codice_sdi`, `cliente_giorni_pagamento`, `cliente_iban`, `cliente_id_cond_pagamento`, `cliente_modalita_pagamento`, `cliente_pec`, `data_fattura`, `id`, `id_fattura`, `id_stato_fatt`, `note`, `righe`, `saldo`

### Lavorazioni
#### `POST /lavorazioniActivityAssign.php`
- Permessi: `job.assign`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniActivityCreate.php`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniActivityDelete.php`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniActivityReport.php`
- Permessi: `job.report`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniActivityStatus.php`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /lavorazioniActivityTemplates.php`
- Permessi: `job.admin`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniActivityTemplatesSave.php`
- Permessi: `job.admin`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniActivityUpdate.php`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniAssign.php`
- Permessi: `job.assign`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /lavorazioniAssignmentsConfig.php`
- Permessi: `job.assign`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /lavorazioniDashboard.php`
- Query: `allowed_anagrafiche`
- Permessi: `job.analytics`

#### `GET /lavorazioniDetail.php`
- Query: `allowed_anagrafiche`
- Permessi: `job.view`

#### `GET /lavorazioniDocuments.php`
- Query: `allowed_anagrafiche`
- Permessi: `job.view`

#### `GET /lavorazioniFilesDownload.php`
- Query: `id`
- Permessi: `job.view`

#### `GET /lavorazioniFilesList.php`
- Query: `allowed_anagrafiche`
- Permessi: `job.view`

#### `POST /lavorazioniFilesUpload.php`
- File upload: multipart field `file`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /lavorazioniList.php`
- Query: `allowed_anagrafiche`
- Permessi: `job.view`

#### `GET /lavorazioniNotifications.php`
- Query: `id_account`
- Permessi: `job.view`

#### `POST /lavorazioniNotificationsRead.php`
- Body JSON: `id_account`
- Permessi: `job.view`

#### `POST /lavorazioniNotifyOperators.php`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniStatus.php`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /lavorazioniUpdate.php`
- Permessi: `job.manage`
- Accesso: utenti con accountType `cliente` non consentiti

### Pacchetti
#### `GET /pacchettiList.php`
- Query: `q`
- Permessi: `cfg.view`

### Pacchetti (legacy path)
#### `POST /Pacchetti/delete.php`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /Pacchetti/detail.php`
- Query: `id`, `id_pacchetto`
- Permessi: `cfg.view`

#### `GET /Pacchetti/list.php`
- Query: `q`
- Permessi: `cfg.view`

#### `POST /Pacchetti/save.php`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

### Pagamenti
#### `POST /pagamentiAssignAnagrafica.php`
- Body JSON: `id`, `id_anagrafica`, `id_pagamento`
- Permessi: `pay.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /pagamentiDashboard.php`
- Query: `period`
- Permessi: `pay.view`

#### `GET /pagamentiDetail.php`
- Query: `id`
- Permessi: `pay.view`

#### `POST /pagamentiImportConfirm.php`
- Body JSON: `items`
- Permessi: `pay.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /pagamentiImportUpload.php`
- File upload: multipart field `file`
- Permessi: `pay.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /pagamentiInvoicesSearch.php`
- Query: `allowed_anagrafiche`, `id_anagrafica`, `limit`, `q`, `solo_aperti`
- Permessi: `pay.view`

#### `GET /pagamentiLedger.php`
- Query: `limit`, `q`
- Permessi: `pay.view`

#### `GET /pagamentiList.php`
- Query: `allowed_anagrafiche`, `date_from`, `date_to`, `id_anagrafica`, `pending_only_open`, `q`
- Permessi: `pay.view`

### Preventivi
#### `POST /preventiviArchive.php`
- Permessi: `prev.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /preventiviArchiveList.php`
- Query: `allowed_anagrafiche`
- Permessi: `prev.view`

#### `POST /preventiviCreate.php`
- Note: nessun parametro specifico rilevato

#### `GET /preventiviDashboard.php`
- Query: `period`
- Permessi: `prev.view`

#### `GET /preventiviDetail.php`
- Query: `allowed_anagrafiche`
- Permessi: `prev.view`

#### `POST /preventiviEmitDdt.php`
- Note: nessun parametro specifico rilevato

#### `POST /preventiviEmitFattura.php`
- Note: nessun parametro specifico rilevato

#### `POST /preventiviGenerateLavorazione.php`
- Note: nessun parametro specifico rilevato

#### `GET /preventiviList.php`
- Query: `allowed_anagrafiche`
- Permessi: `prev.view`

#### `POST /preventiviOggettiCreate.php`
- Body JSON: `active`, `attivo`, `label`

#### `GET /preventiviOggettiList.php`
- Note: nessun parametro specifico rilevato

#### `POST /preventiviReactivate.php`
- Note: nessun parametro specifico rilevato

#### `GET /preventiviRevisionDetail.php`
- Query: `id`

#### `POST /preventiviRevisionsSummary.php`
- Body JSON: `ids`

#### `POST /preventiviSendEmail.php`
- Note: nessun parametro specifico rilevato

#### `POST /preventiviStatus.php`
- Note: nessun parametro specifico rilevato

### Prodotti
#### `GET /prodotti/categorie/list.php`
- Permessi: `cfg.view`

#### `POST /prodotti/categorie/save.php`
- Body JSON: `id_categoria`, `nome`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /prodotti/create.php`
- Body JSON: `codice`, `id_categoria`, `id_iva`, `id_sdi_natura_iva`, `nome`, `prezzo_listino`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /prodotti/delete.php`
- Body JSON: `id`, `id_prodotto`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /prodotti/detail.php`
- Query: `id`
- Permessi: `cfg.view`

#### `GET /prodotti/list.php`
- Query: `id_categoria`, `q`
- Permessi: `cfg.view`

#### `POST /prodotti/update.php`
- Body JSON: `codice`, `id_categoria`, `id_iva`, `id_prodotto`, `id_sdi_natura_iva`, `nome`, `prezzo_listino`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `POST /prodotti/variazioni/delete.php`
- Body JSON: `id_variazione`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

#### `GET /prodotti/variazioni/list.php`
- Permessi: `cfg.view`

#### `GET/POST /prodotti/variazioni/prezzi.php`
- Query: `id_prodotto`
- Body JSON: `action`, `id_prodotto`, `prezzo`, `var_ids`
- Permessi: `cfg.view`

#### `GET/POST /prodotti/variazioni/prodotto.php`
- Query: `id_prodotto`
- Body JSON: `action`, `delta`, `id_prodotto`, `id_variazione`
- Permessi: `cfg.view`

#### `POST /prodotti/variazioni/save.php`
- Body JSON: `categoria`, `codice`, `id_variazione`, `nome`, `prezzo`
- Permessi: `cfg.edit`
- Accesso: utenti con accountType `cliente` non consentiti

### Sessione
#### `POST /login.php`
- Body JSON: `email`, `identifier`, `password`, `username`

#### `GET /me.php`
- Note: nessun parametro specifico rilevato
<!-- END: endpoint-details -->

## Sicurezza e CORS

- CORS abilitato globalmente in bootstrap.
- JWT generato con algoritmo HS256, issuer `mediaprint-erp`, audience `mediaprint-client`, TTL configurabile via env.
- Variabili ambiente server: `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL`.

## Note operative

- Impostare header `Authorization: Bearer <token>` dove richiesto (gli endpoint pubblici attuali non validano ancora il token, ma l’integrazione è prevista/consigliata).
- Per POST inviare sempre `Content-Type: application/json`.
