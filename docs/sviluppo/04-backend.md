# Backend

## Struttura
- Bootstrap: `backend/bootstrap.php`
- Endpoints: `backend/pubblica/*.php`
- Repository: `backend/src/Repositories`
- Service: `backend/src/Service`

## Autenticazione
- Login: `backend/pubblica/login.php`
- JWT con issuer/audience/ttl configurabili via `.env`
- Il frontend usa `Authorization: Bearer <token>`

## Moduli con endpoint dedicati (non esaustivo)
- Accounts: `accounts*.php`
- Anagrafiche: `anagrafiche*.php`
- Contratti: `contratti*.php`
- Preventivi: `preventivi*.php`
- DDT: `ddt*.php`
- Fatture: `fatture*.php`
- Pagamenti: `pagamenti*.php`
- Lavorazioni: `lavorazioni*.php`
- Prodotti: `prodotti/*`
- Dashboard: `dashboard*.php`

Nota: la lista completa e la descrizione degli endpoint esistenti e in
`backend/pubblica/`. La documentazione API in `docs/API.md` copre al momento
una parte di questi file.

## Convenzioni di errore
Riferimento: `docs/API.md`
- 405 metodo non consentito
- 422 validazione
- 404 non trovato
- 500 errore interno

## Export XML SdI
Endpoint: `backend/pubblica/fattureExportXml.php`
- Genera XML e lo invia come attachment
- Richiede variabili `ERP_AZIENDA_*` in `.env`

Dettagli in `docs/sviluppo/08-sdi-export-xml.md`.
