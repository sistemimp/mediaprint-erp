# Setup locale

## Prerequisiti
- Node.js (>= 18/20 consigliato) + npm
- PHP 8 con estensione PDO/MySQL
- Composer
- MySQL compatibile con il dump `sql/mediaprint_erp_v2.sql`

## Frontend
Da root progetto:
```bash
npm install
npm start
```
Il progetto usa Vite, quindi `npm start` avvia il server di sviluppo e proxya
le chiamate verso il backend (`VITE_API_BASE_URL` o `/api` se si usa proxy).
Per la build:
```bash
npm run build
npm run serve
```
Per avviare anche il server WebSocket IM dal root:
```bash
npm run start:ws
```
Questo comando esegue internamente `npm --prefix backend/ws start`.

### Variabili frontend disponibili
- `VITE_API_BASE_URL` (default `/api`, override per puntare a
  `https://gestionale.mediaprint.it/pubblica`)
- `VITE_AUTH_LOGIN_URL` (per autenticazione esterna o redirect alla login)
- `VITE_IM_WS_URL` (es. `wss://wss.mediaprint.it/ws/im`)

## Backend
Da `backend/`:
```bash
composer install
```
Configurare `backend/.env` con:
- parametri DB (`DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`)
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL`
- `CORS_ORIGIN` se si usa differente host
- variabili `ERP_AZIENDA_*` richieste per export XML (vedi
  `docs/sviluppo/08-sdi-export-xml.md`)
- `IM_API_BASE_URL` (es. `https://gestionale.mediaprint.it/pubblica`) usata
  dal WS per autenticare le richieste

## Instant messaging (WebSocket)
Da `backend/ws/`:
```bash
npm install
npm start
```
Variabili personalizzabili:
- `IM_WS_HOST` (default `0.0.0.0`)
- `IM_WS_PORT` (default `4010`)
- `IM_API_BASE_URL` (base URL backend per validare token e recuperare dati)

## Database
Importare il dump principale:
```bash
mysql -u <user> -p <database> < sql/mediaprint_erp_v2.sql
```
Poi applicare le migrazioni incremental (nell’ordine):
- `sql/20260123_remove_delta_prezzo_prod_variazioni.sql`
- `sql/20260127_purge_documents.sql`
- `sql/20260201_remove_spedizioni_postali.sql`

Questi script aggiornano tabelle prodotti/pacchetti, rimuovono documenti
temporanei non più necessari e puliscono riferimenti alle spedizioni
postali ormai inattive.
