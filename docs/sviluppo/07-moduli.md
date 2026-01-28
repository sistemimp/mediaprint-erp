# Moduli e copertura FE/BE

Questa mappa raccoglie la corrispondenza tra i servizi frontend e gli endpoint
PHP/WS che si trovano nel repository.

## Copertura end-to-end (servizi FE + endpoint BE)
- **Auth e account:** FE `AuthContext`, `RequireAuth`, `src/views/pages/login`;
  BE `backend/pubblica/login.php`, `accounts*.php` (list/detail/create/update/delete,
  reset password, permessi,anagrafiche collegate).
- **Anagrafiche:** `src/services/anagrafiche.js`, `src/views/anagrafica/*`;
  BE `anagraficheList.php`, `anagraficheDetail.php`, `anagraficheCreate`,
  `anagraficheUpdate`, `anagraficheArchiveList`, `anagraficheReactivate`.
- **Prodotti:** `src/services/prodotti.js`, `src/views/prodotti/*`;
  BE `prodottiDashboard`, `prodottiFatturazione`, `prodotti/list.php`,
  `prodotti/detail.php`, `prodotti/create.php`, `prodotti/update.php`,
  `prodotti/categorie/*`, `prodotti/variazioni/*`, `natureIvaList`,
  `regimiFiscaliList`.
- **Pacchetti:** `src/services/pacchetti.js`, `src/views/pacchetti/*`;
  BE `backend/pubblica/Pacchetti/*`, `pacchettiList.php`, `pacchettiDetail`,
  `pacchettiSave`, `pacchettiDelete`.
- **Preventivi:** `src/services/preventivi.js`, `src/views/preventivi/*`;
  BE `preventiviList`, `preventiviDetail`, `preventiviCreate`, `preventiviUpdate`,
  `preventiviGenerateLavorazione`, `preventiviLineCed*`, `preventiviEmitDdt`,
  `preventiviEmitFattura`, `preventiviStatus`, `preventiviStatusLog`,
  `preventiviRevisionDetail`.
- **DDT:** `src/services/ddt.js`, `src/views/ddt/*`;
  BE `ddtList`, `ddtDetail`, `ddtUpdate`, `ddtDashboard`, `ddtDestinazioni`,
  `ddtCausaliList`.
- **Fatture:** `src/services/fatture.js`, `src/views/fatture/*`;
  BE `fattureList`, `fattureDetail`, `fattureUpdate`, `fattureStatusLog`,
  `fatturePagamenti*`, `fattureExportXml`, `fattureImportXml`, `fattureConfig`.
- **Pagamenti:** `src/services/pagamenti.js`, `src/views/pagamenti/*`;
  BE `pagamentiList`, `pagamentiDetail`, `pagamentiImportUpload`,
  `pagamentiImportConfirm`, `pagamentiInvoicesSearch`, `pagamentiLedger`,
  `pagamentiDashboard`.
- **Lavorazioni:** `src/services/lavorazioni.js`, `src/views/lavorazioni/*`,
  `LavorazioniTemplates`;
  BE `lavorazioniList`, `lavorazioniDetail`, `lavorazioniUpdate`,
  `lavorazioniAssign`, `lavorazioniFiles*`, `lavorazioniDocuments`,
  `lavorazioniActivity*`, `lavorazioniNotifications*.php`, `lavorazioniStatus`.
- **Contratti:** `src/services/contratti.js`, `src/views/contratti/*`;
  BE `contrattiList`, `contrattiDetail`, `contrattiSave`, `contrattiStatus`,
  `contrattiFiles*`, `contrattiRevisionDetail`, `contrattiSendEmail`.
- **Dashboard:** `src/services/dashboard.js`, `src/views/dashboard/*`;
  BE `dashboard.php`, `dashboardNewClients.php`, `preventiviDashboard`,
  `fattureDashboard`, `pagamentiDashboard`, `lavorazioniDashboard`.
- **Instant Messaging:** `instantMessagingApi.js`, `instantMessagingSocket.js`,
  `src/components/InstantMessagingPanel.js`, `src/views/im/InstantMessagingPage`;
  BE `imAccountsList`, `imThreadsList`, `imThreadCreate`, `imMessagesSend`,
  `imMessagesList`, `imThreadRead`, più server `backend/ws/instant-messaging-server.js`.
- **Notifiche:** `AppNotificationBell`, `NotificationsList`;
  BE `lavorazioniNotifications.php`, `lavorazioniNotificationsRead.php`,
  `lavorazioniNotificationsLatest*.php`.
- **Profilo/Permessi:** `src/views/profile`, `src/services/profileAvatar.js`,
  BE `profileAvatar.php`, `profileAvatarUpload.php`, `accountsPermissionsUpdate.php`.

## Viste/UI disponibili
- `src/views/accounts/`, `anagrafica/`, `contratti/`, `ddt/`, `fatture/`,
  `lavorazioni/`, `pagamenti/`, `pacchetti/`, `preventivi/`, `prodotti/`,
  `dashboard/`, `im/`, `notifiche/`, `profile/`.
- `InstantMessagingWidget` e `InstantMessagingPanel` sono caricati
  globalmente tramite `AppHeader`.
- Il menu (`src/_nav.js`) crea gruppi dinamici con permessi e mostra solo
  le voci abilitate per il ruolo.

## Integrazioni trasversali
- Le selezioni pacchetti (modali di `PacchettiList/Create/Detail`) vengono
  riutilizzate in contratti, preventivi e fatture per importare righe
  preconfezionate.
- Le notifiche `lavorazioniNotifications` possono reindirizzare a preventivi,
  fatture o lavorazioni (`payload.route` gestito da `AppNotificationBell`).
- Il server IM notifica sia la campanella (`AppNotificationBell`) sia il widget
  di chat; la stessa logica alimenta `desktopNotifications`.

## Gap documentazione
- `docs/API.md` è aggiornato solo per un sottoinsieme di endpoint: consultare
  direttamente `backend/pubblica/` per i nomi completi e le query.
- Manca una mappa delle tabelle/dati per contratti/pacchetti avanzati e dei
  campi extra usati in lavorazioni/attività.
