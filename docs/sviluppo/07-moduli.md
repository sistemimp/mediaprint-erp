# Moduli e copertura FE/BE

Questa mappa si basa sui file presenti nel repository.

## Copertura end-to-end (servizi FE + endpoint BE)
- Anagrafiche
  - FE: `src/services/anagrafiche.js`
  - BE: `backend/pubblica/anagrafiche*.php`
- Prodotti
  - FE: `src/services/prodotti.js`
  - BE: `backend/pubblica/prodotti/*`
- Preventivi
  - FE: `src/services/preventivi.js`
  - BE: `backend/pubblica/preventivi*.php`
- Dashboard
  - FE: `src/services/dashboard.js`
  - BE: `backend/pubblica/dashboard*.php`
- Fatture
  - FE: `src/services/fatture.js`
  - BE: `backend/pubblica/fatture*.php`
- DDT
  - FE: `src/services/ddt.js`
  - BE: `backend/pubblica/ddt*.php`
- Contratti
  - FE: `src/services/contratti.js`
  - BE: `backend/pubblica/contratti*.php`
- Lavorazioni
  - FE: `src/services/lavorazioni.js`
  - BE: `backend/pubblica/lavorazioni*.php`
- Pagamenti
  - FE: `src/services/pagamenti.js`
  - BE: `backend/pubblica/pagamenti*.php`
- Pacchetti
  - FE: `src/services/pacchetti.js`
  - BE: `backend/pubblica/Pacchetti/*` e `backend/pubblica/pacchetti*.php`
- Accounts
  - FE: `src/services/accounts.js`
  - BE: `backend/pubblica/accounts*.php`
- Chat
  - FE: `src/services/chatServer.js`, `src/services/chatSocket.js`
  - BE: server Node avviato con `npm run chat-server`

## Viste UI presenti
Cartelle in `src/views/`:
- `accounts`, `anagrafica`, `contratti`, `ddt`, `fatture`, `lavorazioni`
- `pagamenti`, `pacchetti`, `preventivi`, `prodotti`, `chat`, `dashboard`

## Gap documentazione
- `docs/API.md` copre solo un sottoinsieme degli endpoint presenti.
- Per i moduli non ancora documentati si consiglia di allineare
  `docs/API.md` con i file in `backend/pubblica/`.
