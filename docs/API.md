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
  "contatti": [ { "id_contatto": 1, "nome": "Mario", "cognome": "Rossi", "ruolo": "", "telefono": "", "cellulare": "", "email": "", "is_predefinito": 0, "id_sede": 10 } ],
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
  - `contatti`: lista operazioni `[{ action: "create"|"update"|"delete", id_contatto?, nome?, cognome?, ruolo?, telefono?, cellulare?, email?, is_predefinito?, id_sede? }]`
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

### Prodotti — aggiornamento
POST `/prodotti/update.php`

- Body JSON: `{ id_prodotto: int, nome: string, codice?: string, id_categoria?: int, prezzo_listino?: number, id_iva?: int }`
- Risposta 200: `{ ok: true }`

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
  "data": { "id_preventivo": 101, "anno_preventivo": 2025, "numero_documento": 12, "data_preventivo": "2025-10-05", "stato_code": "bozza", "totale": 122, "totale_imponibile": 100, "totale_sconto": 0, "totale_iva": 22, "note": null, "id_anagrafica": 123, "ragione_sociale": "ACME S.p.A." },
  "righe": [ { "id_riga": 1, "id_prodotto": 10, "descrizione": "Carta 100g", "quantita": 2, "prezzo_unitario": 50, "sconto": 0, "importo_scontato": 100, "iva": 22, "id_sdi_natura_iva": null, "totale": 122, "posizione": 1 } ],
  "meta": { "editable": true }
}
```

### Crea/aggiorna/invia
POST `/preventiviCreate.php`

- Body JSON
  - Per nuova bozza: `{ id_anagrafica: int, data_preventivo?: string(YYYY-MM-DD), note?: string, righe?: [ { descrizione, quantita?, prezzo?, sconto?, iva?, id_prodotto?, id_sdi_natura_iva? } ], totals?: { imponibile, sconto, totaleIva, totale }, send?: boolean }`
  - Per aggiornare bozza esistente: aggiungere `id_preventivo` (int)
  - Per “inviare” (confermare/numero): impostare `send: true`
- Risposte
  - 201 Created: 
    - Se bozza: `{ status: "draft", id_preventivo, anno_preventivo?, numero_documento? }`
    - Se inviato: `{ status: "sent", id_preventivo, anno_preventivo, numero_documento }`
  - 422/404 su errori

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
  "series": [ { "mese": "2025-06", "tot": 200, "attive": 180, "disattive": 20 } ]
}
```

## Configurazioni

### Nature IVA
GET `/natureIvaList.php`

- Risposta 200
```json
{ "items": [ { "id_natura": 1, "code": "N1", "label": "Escluse ex art.15" } ] }
```

## Sicurezza e CORS

- CORS abilitato globalmente in bootstrap.
- JWT generato con algoritmo HS256, issuer `mediaprint-erp`, audience `mediaprint-client`, TTL configurabile via env.
- Variabili ambiente server: `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL`.

## Note operative

- Impostare header `Authorization: Bearer <token>` dove richiesto (gli endpoint pubblici attuali non validano ancora il token, ma l’integrazione è prevista/consigliata).
- Per POST inviare sempre `Content-Type: application/json`.

