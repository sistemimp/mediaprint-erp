# Database

## Dump disponibili
- `sql/mediaprint_erp_v2.sql` (schema completo + dati di riferimento).

## Migrazioni incremental
- `sql/20260123_remove_delta_prezzo_prod_variazioni.sql` (rimuove il campo
  `delta_prezzo` dalle variazioni prodotti e riallinea i calcoli del listino).
- `sql/20260127_purge_documents.sql` (pulisce documenti temporanei e righe
  non più referenziate da lavorazioni/fatture).
- `sql/20260201_remove_spedizioni_postali.sql` (depreca i riferimenti alle
  spedizioni postali nei record lavorazioni/spedizioni).

## Dati gestiti (macro aree)
- Anagrafiche, contatti, sedi, tipologie (tabella `tb_anagrafiche`,
  `tipologieAnagraficheList.php`, `tipologieSediList.php`).
- Prodotti, categorie, variazioni, nature IVA, regimi fiscali,
  `prodottiFatturazione.php`.
- Preventivi, revisioni, linee cedolari, conversione in DDT/Fattura,
  log di stato e notifiche (`tb_preventivi`, `preventiviStatusLog.php`).
- DDT e Fatture con dashboard, esportazione/import XML SdI, pagamenti
  associati (`tb_ddt`, `tb_fatture`, `fatturePagamenti*.php`).
- Pagamenti, ledger, import (CSV/Excel) e dashboard KPI (`pagamentiImport*`,
  `pagamentiLedger.php`).
- Lavorazioni (planner, assegnazioni, attività, documenti, notifiche,
  `lavorazioniActivity*.php`, `lavorazioniNotifications*.php`).
- Contratti con file, revisioni e invii email (`tb_contratti`, `contrattiFiles*`).
- Pacchetti e righe (`tb_pacchetti`, `tb_pacchetti_righe`), riutilizzati in
  contratti/preventivi/fatture.
- Accounts + permessi + ruoli (`cfg_auth_accounts`, `cfg_auth_permessi`).
- Instant messaging (`tb_im_accounts`, `tb_im_threads`, `tb_im_messages`)
  e notifiche di lavorazione.

## Note operative
- Gli script di migrazione vanno applicati subito dopo il dump principale per
  evitare mismatch tra tabelle e query (ordina come sopra).
- `cfg_auth_permessi` e `cfg_auth_ruoli` definiscono i permessi usati sia su
  FE (`src/_nav.js`) sia su BE (`accountsPermissionsUpdate.php`).
- Le tabelle IM/notifiche alimentano `AppNotificationBell`, `NotificationsList`
  e `InstantMessagingPanel`.
