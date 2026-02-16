# Architettura

## Vista generale
- FE: React/CoreUI in `src/` (routing, layout, permessi UI, servizi API)
- BE: PHP in `backend/` (auth, validazioni, repository/service)
- DB: MySQL in `sql/`
- Realtime: socket.io in `backend/ws/`

## Flusso request standard
1. Il FE usa `src/services/apiClient.js`.
2. La richiesta arriva a un endpoint in `backend/pubblica/*.php`.
3. Il BE valida token/permessi e delega a service/repository.
4. Il repository esegue query su tabelle `tb_*`/`cfg_*`.
5. Il FE aggiorna UI/stato locale e mostra feedback utente.

## Flusso realtime
1. Il client apre websocket con token (`instantMessagingSocket`).
2. `backend/ws/instant-messaging-server.js` valida token via `me.php`.
3. Il WS pubblica eventi chat/notifiche ai client connessi.
4. Il FE aggiorna `InstantMessagingWidget` e `AppNotificationBell`.

## Componenti FE chiave
- `src/App.js` (shell applicativa)
- `src/routes.js` (rotte lazy-loaded)
- `src/_nav.js` (menu con permessi)
- `src/components/AppHeader`, `AppSidebar`, `AppContent`
- `src/components/InstantMessagingPanel`, `InstantMessagingWidget`

## Componenti BE chiave
- `backend/bootstrap.php`
- `backend/pubblica/` (entrypoint endpoint)
- `backend/src/Repositories`
- `backend/src/Service`
- `backend/ws/instant-messaging-server.js`

## Sicurezza applicativa
- Auth JWT su endpoint protetti
- Permessi granulari (`cfg_auth_permessi`) usati sia lato FE che BE
- Endpoint dedicati a reset password e MFA (`authMfa*.php`, `passwordReset*.php`)

## Convenzioni
- Risposte JSON uniformi con campi come `code`, `message`, `items`, `payload`, `errors`
- Error handling FE centralizzato in `apiClient.js`
- `docs/API.md` non esaustivo: fonte primaria resta il codice
