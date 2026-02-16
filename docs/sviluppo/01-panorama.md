# Panorama progetto

MediaPrint ERP e un gestionale full-stack con frontend React/CoreUI e backend PHP.
Il frontend chiama endpoint HTTP in `backend/pubblica` e integra notifiche/chat
in tempo reale tramite `backend/ws/instant-messaging-server.js` (socket.io).

## Stack
- Frontend: React 19, Vite, CoreUI, React Router, servizi API custom
- Backend: PHP 8, PDO, repository/service layer, JWT
- Realtime: Node.js + socket.io (`backend/ws`)
- Database: MySQL (`sql/mediaprint_erp_v2.sql` + migrazioni incrementali)

## Moduli principali presenti
- Dashboard: viste aggregate (`dashboard`, `dashboardNewClients`)
- Auth/Account: login JWT, profilo, gestione account/ruoli/permessi
- Anagrafiche: dashboard, lista, dettaglio, creazione, archivio/riattivazione
- Prodotti: dashboard, lista, categorie, variazioni, lookup fiscali
- Pacchetti: CRUD pacchetti con righe riusabili
- Contratti: CRUD, stato, revisioni, upload/download file, invio email
- Preventivi: CRUD, revisioni, righe cedolari, conversione verso DDT/Fattura
- DDT: dashboard, causali/destinazioni, lista/dettaglio/update
- Fatture: dashboard, lista/dettaglio/update, pagamenti, export/import XML
- Pagamenti: lista, dettaglio, ledger, import file, dashboard KPI
- Lavorazioni: planner/lista, dettaglio, assegnazioni, attivita, file, notifiche
- Messaggistica istantanea: thread/messaggi/allegati + websocket
- Notifiche: campanella, lista notifiche, badge realtime
- Ticketing: lista/dettaglio ticket (`src/views/tickets`, `tickets*.php`)
- Release notes: timeline aggiornamenti (`releaseNotesList/Create`)

## Stato documentazione
- La copertura funzionale in `docs/sviluppo` e allineata al repository.
- `docs/API.md` resta parziale: per nomi endpoint completi usare `backend/pubblica/`.
