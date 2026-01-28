# Frontend

## Layout, routing e autorizzazioni
- `src/App.js` definisce il wrapper CoreUI, il `Suspense` per il caricamento
  lazy delle rotte e il `RequireAuth` per proteggere accessi segnalati.
- `src/routes.js` mappa tutte le pagine disponibili: dashboard, anagrafiche,
  prodotti, pacchetti, preventivi, DDT, fatture, pagamenti, lavorazioni,
  contatti, accounts, notifiche, messaggi e profilo.
- `src/_nav.js` genera il menu principale (sidebar) con gruppi,
  permessi (`pack.read`, `contr.read`, `msg.read`, ecc.) e icone CoreUI.
- `src/components/AppHeader`, `AppSidebar`, `AppContent` compongono il layout
  CoreUI standard, includendo `ChatNotificationBell`, `AppNotificationBell`
  (che usa `lavorazioniNotifications`) e `InstantMessagingWidget`.

## Client API e servizi
- `src/services/apiClient.js` centralizza base URL, headers, error handling,
  interceptor di token e fallback `/api` per dev proxy.
- Client esposti:
  - `accounts.js`, `anagrafiche.js`
  - `contratti.js`, `ddt.js`, `fatture.js`, `lavorazioni.js`
  - `pagamenti.js`, `pacchetti.js`, `preventivi.js`, `prodotti.js`
  - `instantMessagingApi.js`, `instantMessagingSocket.js`
  - `desktopNotifications.js` (Notification API + toast), `profileAvatar.js`
  - `paymentTerms.js`, `permissions.js`, `dashboard.js`
- `instantMessagingSocket` mantiene la connessione WebSocket e chiama
  `AppNotificationBell` per caricare nuove notifiche (`lavorazioniNotifications`).

## Viste e moduli
- Cartelle `src/views/` ospitano tutte le UI:
  `accounts/`, `anagrafica/`, `contratti/`, `ddt/`, `fatture/`, `lavorazioni/`,
  `pagamenti/`, `pacchetti/`, `preventivi/`, `prodotti/`, `dashboard/`,
  `im/`, `notifiche/`, `profile/` (oltre alle viste CoreUI di base).
- Ogni modulo ha pagine per dashboard/lista/dettaglio (quando previste) e
  modali per selezione prodotto, invio email, upload file, ecc.
- `src/components/InstantMessagingPanel` + `InstantMessagingWidget` gestiscono
  la chat persistente con preview, toasts e desktop notification.
- `NotificationsList` (pagina `/notifiche`) mostra l’elenco completo delle
  notifiche `lavorazioniNotifications` e permette di navigare verso
  preventivi/fatture/lavorazioni segnalate.

## Notifiche e messaggistica in tempo reale
- `AppNotificationBell` richiama `fetchLavorazioneNotifications` e
  segnala badge/testo nel menu; `showDesktopNotification` visualizza alert
  browser per nuove notifiche.
- `InstantMessagingWidget` e `InstantMessagingPanel` consumano
  `instantMessagingSocket` + `instantMessagingApi` per thread, messaggi
  e allegati (usano `ChatNotificationBell` in header).
- `desktopNotifications.js` attiva le Notification API solo quando i permessi
  sono concessi e abbina toast per nuove conversazioni o notifiche critiche.

## Servizi condivisi
- `src/hooks/useDebounce`, `useSearchParams`, ecc. (in `src/hooks/`) aiutano
  nei moduli di ricerca e debouncing.
- `src/utils` contiene helper di formattazione (valute, date, query string)
  e `store.js` centralizza eventuali stati condivisi.
