# Backend

## Struttura
- `backend/bootstrap.php` inizializza `.env`, CORS, JWT e repository autoload.
- `backend/pubblica/` contiene gli endpoint pubblici PHP organizzati per moduli.
- `backend/src/Repositories` gestisce l’accesso alle tabelle (`tb_anagrafiche`,
  `tb_preventivi`, `tb_fatture`, `tb_lavorazioni`, `tb_pagamenti`, `tb_pacchetti`,
  `tb_im*`, etc.).
- `backend/src/Service` coordina logiche su contratti, pagamenti, preventivi,
  notifiche e pacchetti.
- `backend/ws/instant-messaging-server.js` ospita il server WebSocket `socket.io`.

## Autenticazione e permessi
- `backend/pubblica/login.php` restituisce un JWT con ruoli/permessi e scadenza
  (`JWT_TTL`).
- Le richieste usano il bearer token e controllano permessi (es. `pack.read`,
  `msg.read`, `prev.read`, `fatt.read`), definiti in `cfg_auth_permessi`.
- Gli `accounts*.php` consentono di creare, aggiornare, eliminare account, gestire
  password, inviare email di benvenuto e aggiornare permessi.

## Moduli ed endpoint principali
- **Accounts:** `accountsList`, `accountsDetail`, `accountsCreate`, `accountsUpdate`,
  `accountsDelete`, `accountsResetPassword`, `accountsPermissionsUpdate`,
  `accountsWelcomeEmail`, `accountsContattiList`, `accountsAnagrafiche`.
- **Anagrafiche:** lista, dettaglio, archivio, riattiva; dashboard/overview per
  KPI, ricerca e log (`anagraficheList.php`, `anagraficheDetail.php`, etc.).
- **Contratti:** CRUD (`contrattiSave`, `contrattiDetail`, `contrattiList`,
  `contrattiStatus`), gestione file (`contrattiFilesUpload/Download/Delete/List`),
  invio email, revisioni e dashboard.
- **Preventivi:** creazione/lista/dettaglio, revisioni, revisione log e timeline,
  invio email, generazione lavorazioni (`preventiviGenerateLavorazione.php`),
  gestione righe cedolare (`preventiviLineCedCreate/Delete`),
  conversione in DDT/Fattura (`preventiviEmitDdt.php`, `preventiviEmitFattura.php`),
  archiviazione e riattivazione.
- **DDT:** dashboard, causali, destinazioni, creazione, lista, dettaglio, update.
- **Fatture:** dashboard/lista/dettagli, status log e pagamenti, configurazione,
  esportazione XML (SdI), import XML (`fattureImportXml.php`), pagamenti (v2),
  documentazione (status, download, pagamenti).
- **Pagamenti:** import (`pagamentiImportUpload`, `pagamentiImportConfirm`),
  associamento fatture, ledger, dashboard KPI, `pagamentiAssignAnagrafica`,
  dettaglio, lista e eventuali filtri.
- **Lavorazioni:** planner, assegnazioni, documenti, file upload/download,
  templates attività, dashboard, notifiche (`lavorazioniNotifications.php`,
  `lavorazioniNotificationsRead.php`, `lavorazioniNotificationsLatest*.php`),
  attività (create/update/delete/status/activity), report ed esportazioni.
- **Prodotti:** dashboard/fatturazione, lista/dettagli, categorie, variazioni,
  nature IVA, regimi fiscali, `prodottiFatturazione.php`, `prodottiDashboard.php`.
- **Pacchetti:** CRUD con `backend/pubblica/Pacchetti/*` e permessi `pack.*`.
- **Immediate messaging & notifiche:** `imAccountsList`,
  `imThreadsList`, `imThreadCreate`, `imMessagesSend`, `imMessagesList`,
  `imThreadRead`, `imAccountsList` supportano chat; `backend/ws` spinge eventi
  ai client.
- **Dashboard:** `dashboard.php`, `dashboardNewClients.php`, `pagamentiDashboard.php`,
  `preventiviDashboard.php`, `fattureDashboard.php`, `lavorazioniDashboard.php`.

## Streaming & notifiche in tempo reale
- Il server WebSocket `backend/ws/instant-messaging-server.js` valida il JWT via
  `IM_API_BASE_URL` e pubblica eventi a `instantMessagingSocket`.
- Lato frontend, `desktopNotifications` e `AppNotificationBell` mostrano nuove
  notifiche, aggiornano lo stato `lavorazioniNotifications` e scaricano toasts.
- Gli endpoint `lavorazioniNotifications*.php` servono badge e gestiscono la
  segnalazione quando una lavorazione richiede attenzione.

## Export/import XML
- `fattureExportXml.php` genera l’XML per SdI; occorrono variabili
  `ERP_AZIENDA_*` (`denominazione`, `piva`, `regime fiscale`, indirizzo, ecc.).
- `fattureImportXml.php` importa file SdI o XML clienti; validazioni lato backend
  assicurano structure e permessi.

## Convenzioni errori
- Risposte JSON con `code`, `message`, `errors`, `payload`. Errori 4xx/5xx e
  logging su STDOUT/monolog se configurato.
- I repository usano transazioni e rollback, ad esempio per pacchetti/righe o
  upload di file multipli (`tb_lavorazioni_files`).
