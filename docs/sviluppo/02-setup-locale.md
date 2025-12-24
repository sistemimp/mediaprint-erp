# Setup locale

## Prerequisiti
- Node.js + npm
- PHP con estensione PDO per MySQL
- Composer (per le dipendenze backend)
- MySQL (schema e dati di riferimento in `sql/`)

## Frontend
Da root progetto:
```bash
npm install
npm start
```

Comandi utili:
```bash
npm run build
npm run serve
```

Variabili ambiente frontend (opzionali):
- `VITE_API_BASE_URL` (default `/api`)
- `VITE_AUTH_LOGIN_URL`
- `VITE_CHAT_WS_URL` (se non impostata usa `ws://localhost:4005/ws/chat`)

## Backend
Da `backend/`:
```bash
composer install
```

Configurare `backend/.env` con:
- Parametri DB (host, nome db, utente, password)
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL`
- CORS (se previsto nel `.env`)
- Variabili `ERP_AZIENDA_*` per export XML SdI (vedi `docs/sviluppo/08-sdi-export-xml.md`)

## Database
Dump disponibili in `sql/`:
- `sql/mediaprint_erp.sql` (schema + dati di riferimento)
- `sql/20250107_add_contratti_status_revisioni.sql` (integrazione contratti)

Esempio import:
```bash
mysql -u <user> -p <database> < sql/mediaprint_erp.sql
mysql -u <user> -p <database> < sql/20250107_add_contratti_status_revisioni.sql
```
