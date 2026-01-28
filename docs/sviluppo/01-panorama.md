# Panorama progetto

MediaPrint ERP è un gestionale full-stack in cui il frontend React (CoreUI +
Vite) dialoga con un backend PHP (PDO + repository/service) attraverso
endpoint HTTP pubblici (`backend/pubblica`). Il database MySQL è versionato
in `sql/` mentre i contenuti di messaggistica istantanea usano un server
`socket.io` in `backend/ws` per chat e notifiche in tempo reale.

## Stack
- **Frontend:** React 19, Vite, CoreUI (iv standard + pro), React Router 7, Redux 5,
  `socket.io-client`, helper per notifiche desktop e WebSocket.
- **Backend:** PHP 8 con autoload e configurazione `.env`, JWT (`firebase/php-jwt`),
  repository con PDO, endpoint pubblici sotto `backend/pubblica`.
- **Realtime:** WebSocket Node.js in `backend/ws/instant-messaging-server.js`,
  istanze FE con `instantMessagingSocket` e `InstantMessagingWidget`.
- **DB:** MySQL con dump `sql/mediaprint_erp_v2.sql` e migrazioni incrementali;
  script `sql/*.sql` per aggiornamenti (es. rimozione delta prezzi, purge documenti,
  rimozione spedizioni postali).

## Stato attuale (dalle sorgenti presenti)
- **Autenticazione:** login JWT con permessi/ruoli, `AuthContext`, `RequireAuth`,
  gestione token e refresh tramite `src/context/AuthContext.js`.
- **Accounts:** lista, dettaglio, creazione, eliminazione, reset password,
  invio email di benvenuto e aggiornamento permessi (`accounts*.php`).
- **Anagrafiche:** dashboard, lista, modifica e archiviazione con log,
  servizi `anagrafiche.js` e repository dedicato (`anagrafiche*.php`).
- **Prodotti:** dashboard, lista, categorie, variazioni, listini e fatturazione
  (`prodotti/dashboard`, `prodottiFatturazione.php`), nature IVA/regimi fiscali.
- **Preventivi:** dashboard/lista/dettagli, creazione guidata, revisioni,
  generazione lavorazioni, conversione in DDT/fattura e notifiche email.
- **DDT:** dashboard, creazione/lista/dettagli/aggiornamento con causali e
  destinazioni, esportazione per fatturazione.
- **Fatture:** dashboard/lista/dettagli, import/export XML (SdI),
  pagamenti collegati, status log, configurazione e scadenze.
- **Pagamenti:** dashboard/ledger, import CSV/Excel, associazione a fatture,
  dashboard KPI (`pagamentiDashboard.php`).
- **Lavorazioni:** planner, assegnazione operatori, file (upload/download),
  templates attività, notifiche in tempo reale (`lavorazioniNotifications*.php`),
  dashboard e documenti.
- **Contratti:** creazione/lista/dettagli, upload/download file, invio email,
  stati e revisioni (`contratti*.php`) con supporto a notifiche e pacchetti.
- **Pacchetti:** CRUD con selettore prodotti/variazioni, riutilizzo in Contratti,
  Preventivi e Fatture, permessi `pack.*`, endpoint dedicati in
  `backend/pubblica/Pacchetti`.
- **Messaging & notifiche:** chat in tempo reale, widget di messaggistica,
  campanello notifiche (`AppNotificationBell`) che usa desktop notification
  e segnala preventivi/fatture/lavorazioni con route dirette.
- **Instant Messaging Server:** `backend/ws` e endpoint `im*.php`, `InstantMessagingPanel`
  e `InstantMessagingWidget` gestiscono conversazioni, allegati e thread.

## Note
- `docs/API.md` è ancora un subset della totalità degli endpoint; il codice
  sorgente è la fonte primaria per le ultime rotte disponibili.
- Il theme CoreUI e il layout standard (`src/components/App*`) supportano
  l’inserimento rapido di nuovi moduli e widget, mantenendo le convenzioni
  di permessi/ruoli già adottate.
