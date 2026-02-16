# Frontend

## Struttura generale
- `src/App.js`: shell, guardie auth, mounting layout
- `src/routes.js`: rotte lazy per moduli gestionali
- `src/_nav.js`: sidebar CoreUI filtrata per permessi
- `src/views/`: pagine per dominio
- `src/services/`: client API e servizi condivisi

## Moduli UI presenti
- Dashboard (`dashboard`, varianti REW/MP)
- Anagrafica
- Prodotti
- Pacchetti
- Contratti
- Preventivi
- DDT
- Fatture
- Pagamenti
- Lavorazioni
- Messaggi / notifiche
- Account / profilo
- Ticketing
- Release notes

## Servizi client principali
- Infrastruttura: `apiClient.js`, `permissions.js`
- Dominio: `anagrafiche.js`, `prodotti.js`, `contratti.js`, `preventivi.js`, `ddt.js`, `fatture.js`, `pagamenti.js`, `lavorazioni.js`, `pacchetti.js`, `accounts.js`
- Realtime/notifiche: `instantMessagingApi.js`, `instantMessagingSocket.js`, `desktopNotifications.js`
- Extra: `tickets.js`, `releaseNotes.js`, `passwordReset.js`, `dashboard.js`, `profileAvatar.js`

## Autorizzazioni
- Le voci menu in `src/_nav.js` usano permessi (`prod.read`, `pack.read`, `msg.read`, ecc.)
- Le rotte sono protette da auth context/guard
- Alcune funzioni (es. create/import) richiedono permessi write dedicati

## Notifiche e websocket
- `InstantMessagingWidget` e `InstantMessagingPanel` gestiscono chat/thread
- `AppNotificationBell` e `NotificationsList` gestiscono notifiche lavorazioni
- `desktopNotifications.js` integra Notification API browser

## Coerenza FE/BE
- I nomi endpoint usati nei servizi FE sono allineati a `backend/pubblica`
- Ogni nuovo endpoint deve essere riflesso in:
  - servizio in `src/services`
  - vista in `src/views` (se esposta a UI)
  - eventuale voce in `src/_nav.js` + route in `src/routes.js`
