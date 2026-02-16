# Backend

## Struttura
- `backend/bootstrap.php`: bootstrap config, env e autoload
- `backend/pubblica/`: endpoint HTTP
- `backend/src/Repositories`: persistenza dati
- `backend/src/Service`: regole applicative
- `backend/ws/instant-messaging-server.js`: server realtime

## Autenticazione, password, MFA
- Login: `login.php`, profilo corrente: `me.php`
- Gestione password: `passwordChange.php`, `passwordResetRequest.php`, `passwordResetChange.php`
- MFA: endpoint `authMfa*.php` (OTP e passkey)
- Account admin: `accounts*.php`, `accountsRolesList.php`, `accountsPermissionsUpdate.php`

## Endpoint per dominio (macro)
- Anagrafiche: `anagrafiche*.php`, lookup `tipologie*.php`
- Prodotti/fiscale: `prodotti*`, `ivaList.php`, `natureIvaList.php`, `regimiFiscaliList.php`
- Pacchetti: `Pacchetti/list.php|detail.php|save.php|delete.php` + `pacchettiList.php`
- Contratti: `contratti*.php`, file `contrattiFiles*.php`
- Preventivi: `preventivi*.php` (incl. revisioni, cedolari, emissione DDT/Fattura)
- DDT: `ddt*.php`
- Fatture: `fatture*.php` (incl. export/import XML e pagamenti)
- Pagamenti: `pagamenti*.php`
- Lavorazioni: `lavorazioni*.php` (attivita, file, notifiche, status)
- IM: `im*.php`
- Ticketing: `tickets*.php`
- Release notes: `releaseNotes*.php`

## Realtime e notifiche
- WS usa token JWT per autenticare socket
- Polling backend notifiche lavorazioni e push eventi `im.notification`
- Inoltro eventi chat thread/message verso account target connessi

## Note operative
- Esiste un endpoint storico `pachettiDetail.php` (typo nel nome file):
  mantenere compatibilita finche non viene dismesso.
- Per mappa endpoint aggiornata, usare `Get-ChildItem backend/pubblica`.
