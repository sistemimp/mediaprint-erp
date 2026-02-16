# Setup locale

## Prerequisiti
- Node.js 18+ (consigliato 20)
- npm
- PHP 8 con PDO MySQL
- Composer
- MySQL

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
npm run start:ws
```

Variabili frontend:
- `VITE_API_BASE_URL` (default `/api` in sviluppo con proxy)
- `VITE_AUTH_LOGIN_URL`
- `VITE_IM_WS_URL` (es. `wss://<host>/ws/im`)

## Backend PHP
Da `backend/`:
```bash
composer install
```

Configurare `backend/.env` con almeno:
- DB: `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- JWT: `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL`
- CORS: `CORS_ORIGIN` (se FE e BE su host diversi)
- XML fatture: variabili `ERP_AZIENDA_*` (vedi `08-sdi-export-xml.md`)
- WS bridge: `IM_API_BASE_URL`

## Server websocket (IM)
Da `backend/ws/`:
```bash
npm install
npm start
```

Variabili WS:
- `IM_WS_HOST` (default `127.0.0.1`)
- `IM_WS_PORT` (default `4010`)
- `IM_API_BASE_URL` (base backend per validazione token e notifiche)

## Database
Import dump principale:
```bash
mysql -u <user> -p <database> < sql/mediaprint_erp_v2.sql
```

## Verifica minima post-setup
- Login funzionante (`backend/pubblica/login.php`)
- Routing FE disponibile (`src/routes.js`)
- Ping WS su `backend/ws` attivo
- Almeno una chiamata a endpoint protetto con token valida
