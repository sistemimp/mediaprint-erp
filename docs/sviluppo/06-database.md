# Database

## Artefatti disponibili
- Dump principale: `sql/mediaprint_erp_v2.sql`

## Macro-aree dati coperte
- Sicurezza e utenti: `cfg_auth_accounts`, `cfg_auth_permessi`, ruoli
- Anagrafiche/contatti/sedi e lookup tipologie
- Prodotti/categorie/variazioni + lookup fiscali (IVA, nature, regimi)
- Preventivi/revisioni/righe cedolari/log
- DDT e fatture (con pagamenti associati)
- Pagamenti/import/ledger
- Lavorazioni/attivita/assegnazioni/file/notifiche
- Contratti/file/revisioni
- Pacchetti e righe pacchetto
- Messaggistica istantanea (accounts/thread/messages)
- Ticketing e release notes (persistenza modulo supporto)

## Note operative
- I permessi DB guidano sia visibilita menu FE sia autorizzazioni endpoint BE.
- Per analisi schema dettagliata, usare il dump SQL come fonte primaria.
- Per una vista rapida relazionale, vedere `docs/sviluppo/11-schema-er-sintetico.md`.
