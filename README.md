# MediaPrint ERP — Report Attività (aggiornato al 2025-10-10)

## Panoramica
- Frontend: React + Vite con CoreUI, autenticazione JWT, routing protetto e viste per moduli ERP.
- Backend: PHP (PDO) con servizi e repository, autenticazione JWT, endpoint REST-like in `backend/pubblica`.
- Database: dump schema/dati in `sql/mediaprint_erp_v2_2025-10-09_17-25-42.sql`.

## Funzionalità Completate
- Autenticazione
  - Login con JWT (`backend/pubblica/login.php`), validazioni ruoli/permessi, TTL configurabile.
  - Frontend `AuthContext` con persistenza token, `RequireAuth` per protezione rotte.
- Anagrafiche (Clienti/Fornitori)
  - Lista con ricerca, ordinamento, paginazione; normalizzazione metadati risposta.
  - Dettaglio e aggiornamento anagrafica (dati base, fiscali, contatti, sedi).
  - Archivio: lista anagrafiche archiviate e riattivazione dall’archivio.
  - Logica server per archiviazione/riattivazione completa su più tabelle (repository `AnagraficheRepository`).
- Prodotti
  - Categorie: lista e salvataggio (`/prodotti/categorie/*`).
  - Prodotti: lista, dettaglio, creazione e aggiornamento (`/prodotti/*`).
  - Variazioni: CRUD e collegamento a prodotto con gestione `delta` prezzo.
  - Nature IVA: lista (`/natureIvaList.php`).
- Preventivi
  - Lista ultimi preventivi e dettaglio.
  - Creazione preventivo con invio totali e flag di invio email.
- Dashboard
  - Endpoint KPI/serie (`/dashboard.php`), funzione di fetch lato FE; viste dashboard presenti.

## Struttura Progetto
- Frontend
  - Servizi API: `src/services/{apiClient,anagrafiche,prodotti,preventivi,dashboard}.js`.
  - Viste: `src/views/` per moduli (anagrafiche, preventivi, prodotti, ddt, fatture, dashboard).
  - Routing e layout CoreUI; `RequireAuth` per protezione aree riservate.
  - Config base URL: `VITE_API_BASE_URL` (fallback `/api` in dev, produzione `https://gestionale.mediaprint.it/pubblica/`).
  - Login URL configurabile: `VITE_AUTH_LOGIN_URL`.
- Backend
  - Bootstrap con CORS, autoload, `.env` reader (`backend/bootstrap.php`).
  - Repository/Service: `backend/src/{Repositories,Service}` (JWT via `firebase/php-jwt`).
  - Endpoint pubblici PHP in `backend/pubblica` coerenti con i servizi FE.

## Endpoints Principali (backend/pubblica)
- Autenticazione: `login.php`
- Anagrafiche: `anagraficheList.php`, `anagraficheArchiveList.php`, `anagraficheDetail.php`, `anagraficheCreate.php`, `anagraficheUpdate.php`, `anagraficheReactivate.php`
- Prodotti: `prodotti/list.php`, `prodotti/detail.php`, `prodotti/create.php`, `prodotti/update.php`
- Prodotti/Categorie: `prodotti/categorie/list.php`, `prodotti/categorie/save.php`
- Prodotti/Variazioni: `prodotti/variazioni/list.php`, `prodotti/variazioni/save.php`, `prodotti/variazioni/delete.php`, `prodotti/variazioni/prodotto.php`
- Preventivi: `preventiviList.php`, `preventiviCreate.php`, `preventiviDetail.php`
- Fatture: `fattureList.php`, `fattureDetail.php`, `fattureUpdate.php`, `fattureConfig.php`, `fattureExportXml.php`
- Varie: `natureIvaList.php`, `dashboard.php`

## Stato Moduli UI
- Completati: Autenticazione, Anagrafiche (lista/dettaglio/archivio/riattiva), Prodotti (categorie/prodotti/variazioni), Preventivi (lista/crea/dettaglio), Dashboard (viste presenti).
- Presenti come viste iniziali: DDT, Fatture (servizi API lato FE da completare/collegare).

## Configurazione e Avvio
- Frontend
  - Variabili: `VITE_API_BASE_URL`, `VITE_AUTH_LOGIN_URL` (opzionali).
  - Dev: `npm install` e `npm start` (Vite), base URL `/api` se proxy configurato.
- Backend
  - `composer install` in `backend/`, impostare `.env` (DB, JWT, CORS).
  - Richiede DB conforme al dump in `sql/`.
- Instant messaging (WebSocket)
  - `npm install` in `backend/ws/` e avvio con `node instant-messaging-server.js`.
  - Imposta `VITE_IM_WS_URL` lato frontend e `IM_API_BASE_URL` lato server se necessario.

### Variabili per esportazione XML SdI
Per usare l'endpoint `fattureExportXml.php` impostare in `backend/.env` i dati aziendali richiesti dal tracciato SdI:
- `ERP_AZIENDA_DENOMINAZIONE`, `ERP_AZIENDA_PIVA`, `ERP_AZIENDA_CODICE_FISCALE`
- `ERP_AZIENDA_INDIRIZZO`, `ERP_AZIENDA_CIVICO`, `ERP_AZIENDA_CAP`, `ERP_AZIENDA_COMUNE`, `ERP_AZIENDA_PROVINCIA`, `ERP_AZIENDA_NAZIONE`
- `ERP_AZIENDA_REGIME_FISCALE` (es. `RF01`), `ERP_AZIENDA_FORMATO_TRASMISSIONE` (es. `FPR12`), `ERP_AZIENDA_VALUTA`
- `ERP_AZIENDA_PROGRESSIVO_PREFIX` (prefisso progressivo invio), `ERP_AZIENDA_MODALITA_PAGAMENTO` (es. `MP05`), `ERP_AZIENDA_CONDIZIONI_PAGAMENTO` (es. `TP02`)

Tutti i valori sono obbligatori salvo nota diversa; in assenza il backend risponde con errore esplicativo.

## Note Tecniche Rilevanti
- Client HTTP centralizzato (`apiClient.js`) con gestione base URL, query param, JSON e error handling.
- Repository PHP con PDO e query sicure; gestione archivi/restore con controlli di esistenza e vincoli FK.
- JWT con claims ruoli/permessi e scadenza configurabile; CORS applicato globalmente.

## Changelog Sintetico (ultimi commit)
- 2025-10-10: Pulizia file temporanei di sviluppo.
- 2025-10-10: Secondo commit (setup iniziale FE/BE e moduli chiave).
- 2025-10-03: Primo commit (bootstrap progetto, CoreUI, struttura backend).

## Prossimi Passi Suggeriti
- Collegare servizi FE per DDT e Fatture (CRUD + lista/dettaglio).
- Validazioni avanzate lato FE/BE per creazione/aggiornamento preventivi.
- Test end-to-end minimi (login, CRUD anagrafiche, flusso preventivo).
- Documentare proxy dev (`/api`) e deployment backend.

