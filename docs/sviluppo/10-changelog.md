# Changelog sintetico

- 2026-01-28: aggiornato il menu (`src/_nav.js`) e il routing (`src/routes.js`)
  con dashboard, accounts, notifiche/messaggi, pacchetti/contratti; introdotte
  `desktopNotifications.js`, `instantMessagingSocket.js` e `AppNotificationBell`
  per badge/desktop notification realtime.
- 2026-01-27: aggiunto `fattureImportXml.php` (con input multipart), espanso il
  servizio frontend `src/services/fatture.js`, migliorata la gestione pagamenti e
  aggiornati i payload per `fattureStatusLog`, `pagamentiImport*`.
- 2026-01-23: potenziate le API preventivi e lavorazioni (`preventiviGenerateLavorazione`,
  `preventiviLineCedCreate/Delete`, `lavorazioniActivityCedQuantitiesSave`,
  `lavorazioniNotifications*`); aggiunti gli script SQL `20260123_remove_delta_prezzo_prod_variazioni.sql`
  e `20260127_purge_documents.sql`.
- 2026-01-20: esposti `regimiFiscaliList.php`, `tipologieAnagraficheList.php`,
  `tipologieSediList.php` e aggiornati i form FE per usare questi lookup.
- 2026-01-19: endpoint contratti abbondanti (`contrattiFilesUpload/Download/Delete/List`,
  `contrattiSendEmail`), notifiche/lavorazioni collegate e nuova vista
  `NotificationsList`.
- 2026-01-13: aggiunto il servizio `prodottiFatturazione.php`, estesa la dashboard FI
  e aggiornati i client FE/prodotti per richiedere regimi fiscali/nature IVA.
- 2025-10-10: pulizia file temporanei di sviluppo.
- 2025-10-10: setup iniziale FE/BE e moduli chiave.
- 2025-10-03: bootstrap progetto, CoreUI, struttura backend.
