# Architettura

## Separazione FE/BE e deployment
- Frontend React (src/) serve le viste CoreUI/Vite e gestisce routing, layout e
  autenticazione con `AuthContext`.
- Backend PHP (backend/) carica `backend/bootstrap.php`, legge `.env`, valida
  input e delega a service/repository (PDO + transazioni).
- Endpoints pubblici in `backend/pubblica` e server WebSocket in `backend/ws`.
- Database MySQL con dump `sql/mediaprint_erp_v2.sql`; eventuali script di
  migrazione (`sql/*.sql`) vanno applicati in ordine per mantenere consistenza.

## Flussi principali
1. Il frontend invoca `src/services/apiClient.js` (base URL, token, error handling)
   e i client specifici (`anagrafiche.js`, `preventivi.js`, `lavorazioni.js`, ecc).
2. Il backend autentica il JWT, controlla permessi (`cfg_auth_permessi`) e richiama
   service/repository.
3. Il repository manipola le tabelle MySQL (`tb_*`), normalizza i payload e
   restituisce JSON con `success`/`items`/`message`.
4. Il frontend aggiorna lo stato Redux/locale, mostra widget CoreUI e rende
   i modali o le tabelle verdi.

## Componenti frontend chiave
- `src/routes.js` riassume tutte le rotte protette (dashboard, preventivi, DDT,
  fatture, pagamenti, lavorazioni, accounts, notifiche, messaggi, ecc.).
- `src/_nav.js` costruisce il menu CoreUI con `permissions` e `CNavGroup/CNavItem`.
- `AppHeader`, `AppSidebar`, `AppContent`, `RequireAuth` proteggono il layout e
  inseriscono `ChatNotificationBell`, `AppNotificationBell` (notifiche/lavorazioni)
  e `InstantMessagingWidget`.
- `src/services/instantMessagingSocket.js` mantiene la connessione WebSocket e
  notifica `AppNotificationBell``/`InstantMessagingPanel`.
- `src/services/desktopNotifications.js` centralizza la Notification API per
  badge/campanello (con `showDesktopNotification`).

## Componenti backend chiave
- `backend/src/Repositories` contiene l’accesso a tabelle come `tb_preventivi`,
  `tb_fatture`, `tb_lavorazioni`, `tb_pacchetti`, `tb_im_message`.
- `backend/src/Service` coordina logiche su contratti, pagamenti, preventivi,
  pacchetti e messaging.
- `backend/pubblica` espone file PHP (accounts, anagrafiche, contatti, DDT,
  fatture, pagamenti, lavorazioni, notifiche, im, pacchetti, prodotti…).
- `backend/ws/instant-messaging-server.js` riceve connessioni socket, valida
  token contro l’API (`IM_API_BASE_URL`) e inoltra eventi di chat/notifica.

## Convenzioni e osservazioni
- Risposte JSON con `code`, `message`, `items`, `payload`, `errors`.
- Error handler centrali (`apiClient`) mostrano toasts o CAlert per gli errori.
- JWT e permessi (`pack.read`, `msg.read`, `lavor.read`, ecc.) determinano
  visibilità del menu e bilanciamento lato server.
- La documentazione `docs/API.md` è parziale: per aggiornamenti recenti
  consultare direttamente `backend/pubblica`.
