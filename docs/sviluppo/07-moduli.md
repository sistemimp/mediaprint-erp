# Moduli e copertura FE/BE

Mappa sintetica tra frontend (`src/views`, `src/services`) e backend (`backend/pubblica`).

## Copertura end-to-end
- Auth/account: `AuthContext`, `accounts.js` <-> `login.php`, `me.php`, `accounts*.php`
- Password/MFA: `passwordReset.js` <-> `passwordReset*.php`, `authMfa*.php`
- Anagrafiche: `anagrafiche.js`, `views/anagrafica/*` <-> `anagrafiche*.php`
- Prodotti: `prodotti.js`, `views/prodotti/*` <-> `prodotti*.php`, `ivaList.php`, `natureIvaList.php`, `regimiFiscaliList.php`
- Pacchetti: `pacchetti.js`, `views/pacchetti/*` <-> `Pacchetti/*`, `pacchettiList.php`
- Contratti: `contratti.js`, `views/contratti/*` <-> `contratti*.php`, `contrattiFiles*.php`
- Preventivi: `preventivi.js`, `views/preventivi/*` <-> `preventivi*.php`
- DDT: `ddt.js`, `views/ddt/*` <-> `ddt*.php`
- Fatture: `fatture.js`, `views/fatture/*` <-> `fatture*.php`
- Pagamenti: `pagamenti.js`, `views/pagamenti/*` <-> `pagamenti*.php`
- Lavorazioni: `lavorazioni.js`, `views/lavorazioni/*` <-> `lavorazioni*.php`
- Messaggi: `instantMessagingApi.js`, `views/im/*` <-> `im*.php` + `backend/ws`
- Notifiche: componenti header/lista <-> `lavorazioniNotifications*.php`
- Ticketing: `tickets.js`, `views/tickets/*` <-> `tickets*.php`
- Release notes: `releaseNotes.js`, `views/release-notes/*` <-> `releaseNotes*.php`

## Integrazioni trasversali
- Pacchetti riusati in contratti/preventivi/fatture
- Flusso preventivo -> DDT/fattura con passaggi backend dedicati
- Notifiche realtime aggregate da websocket + endpoint lavorazioni

## Gap residui
- `docs/API.md` non copre ancora tutti gli endpoint attivi.
- Serve una matrice permesso -> route -> endpoint per audit completo.
