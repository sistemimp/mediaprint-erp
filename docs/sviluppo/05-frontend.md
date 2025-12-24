# Frontend

## Struttura
- `src/services/` - client API e helper (apiClient, moduli ERP)
- `src/views/` - viste per moduli (anagrafiche, prodotti, preventivi, ecc.)
- `src/context/AuthContext.js` - gestione stato auth e token
- `src/components/RequireAuth.js` - route protette
- `src/App.js` - routing principale

## Servizi FE disponibili
Client presenti in `src/services/`:
- `accounts.js`, `anagrafiche.js`, `contratti.js`, `dashboard.js`, `ddt.js`
- `fatture.js`, `lavorazioni.js`, `pacchetti.js`, `pagamenti.js`
- `paymentTerms.js`, `preventivi.js`, `prodotti.js`
- `instantMessagingApi.js`, `instantMessagingSocket.js`

## Moduli UI
Cartelle principali in `src/views/`:
- `anagrafica`, `prodotti`, `preventivi`, `dashboard`
- `fatture`, `ddt`, `contratti`, `lavorazioni`, `pagamenti`, `pacchetti`
- `accounts`, `im`

Le viste di base (charts, forms, widgets, ecc.) sono parte del template CoreUI.
