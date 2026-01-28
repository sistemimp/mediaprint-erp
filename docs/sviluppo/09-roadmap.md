# Roadmap suggerita

## Documentazione
- Allineare `docs/API.md` con la mappa completa di endpoint in `backend/pubblica`
  (accounts, contratti/files, IM, notifiche, prodotti di fatturazione).
- Documentare la composizione e l’importazione del dump (`sql/mediaprint_erp_v2.sql`
  + migrazioni) in modo da riprodurre l’ambiente su nuove macchine.
- Specificare il deployment del server WebSocket (`backend/ws`) e i comandi
  (`npm run start:ws`) che devono essere eseguiti quando si pubblica il backend.

## Funzionalità da consolidare
- Validazioni end-to-end per flussi critici: login/autenticazione, CRUD
  anagrafiche, preventivi → DDT → fattura, notifiche e messaggistica.
- Monitorare la copertura notifiche (AppNotificationBell + NotificationsList)
  per assicurare che i payload di `lavorazioniNotifications` siano coerenti
  con le rotte proposte.
- Continuare a inserire test manuali o automatizzati per import/export XML,
  import pagamenti e upload file contratti/lavorazioni.

## Operativo
- Tenere sincronizzati `src/_nav.js` e `src/routes.js` quando si aggiungono nuovi
  permessi o sezioni nel menu.
- Mantenere aggiornato il file `.env.example` (se presente) con tutti i nuovi
  flag `ERP_AZIENDA_*`, IM e JWT.
- Documentare i passaggi di build/deploy (`npm run build`, `composer install`,
  `patch-package`, `npm run start:ws`, script di migrazione) per il rilascio
  su ambienti di test/produzione.
