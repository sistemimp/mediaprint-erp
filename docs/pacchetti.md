# Sezione Pacchetti

## Dove si accede
- Il menu `Pacchetti` è un gruppo nel layout principale e compare solo se l’utente ha il permesso `pack.read`. ◆ `src/_nav.js:55`
- I permessi associati a questa sezione (lettura, scrittura, creazione, cancellazione) sono registrati in `cfg_auth_permessi` per la compagnia (`pack.read`, `pack.write`, `pack.create`, `pack.delete`). ◆ `sql/mediaprint_erp_v2.sql:725`

## Lista pacchetti
- La schermata `/pacchetti/lista` esegue il fetch di massimo 200 record via `fetchPacchetti`, applica la ricerca per nome/codice e il filtro “Solo attivi”, mostra spinner ed errori e ordina i risultati per nome prima di renderizzare la tabella con codice, nome, stato e ultimo aggiornamento; cliccando sull’icona si passa ai dettagli. ◆ `src/views/pacchetti/PacchettiList.js:27`
- Il pulsante “Nuovo pacchetto” è bloccato ai profili senza `pack.create`, dunque chi ha il diritto può aprire il form di creazione dalla lista. ◆ `src/views/pacchetti/PacchettiList.js:72`

## Creare un pacchetto
- La pagina `/pacchetti/crea` raccoglie metadati (codice, nome obbligatorio, descrizione, attivo) e mantiene stato per righe e modal, gestendo spinner e messaggi di esito sul salvataggio con `savePacchetto`. ◆ `src/views/pacchetti/PacchettiCreate.js:212`
- Il “Selettore prodotti” è un modal con uno stepper (categoria → prodotto → variazioni/combinazioni → riepilogo) che usa `fetchProdotti`, `fetchProdottoVariazioni` e `fetchProdottoPrezziCombinati`; i prezzi suggeriti considerano la combinazione selezionata e impostano automaticamente quantità, IVA e natura. ◆ `src/views/pacchetti/PacchettiCreate.js:274`
- Nella sezione “Righe pacchetto” si possono aggiungere righe dal selettore oppure manualmente, modificare descrizione, quantità, prezzo, sconto, aliquota e natura (la select è disabilitata se l’IVA è diversa da 0) e visualizzare imponibile/IVA/totale formato in euro. ◆ `src/views/pacchetti/PacchettiCreate.js:507`
- Il salvataggio invia payload con `righe` (anche vuote) verso `savePacchetto`, imposta il flag `attivo` e, se viene restituito l’ID, naviga    automaticamente alla pagina di dettaglio. ◆ `src/views/pacchetti/PacchettiCreate.js:212`

## Visualizzare/modificare un pacchetto
- `/pacchetti/dettagli?id=...` carica i dati (`fetchPacchettoDetail` + lineup `fetchNatureIva`/`fetchCategorieProdotti`) e popola il form con blocco su non-id e spinner error handling. ◆ `src/views/pacchetti/PacchettiDetail.js:53`
- Il dettaglio riutilizza lo stesso modal stepper con permessi `pack.write`, consente di aggiungere righe manuali o via selettore, calcola subtotal/IVA/totale per riga e raggruppa la tabella per categoria e prodotto (cap). ◆ `src/views/pacchetti/PacchettiDetail.js:393`
- Le righe possono essere salvate o rimosse, gli input mantenuti inline e il bottone “Salva” invia `savePacchetto`; c’è anche un pulsante “Elimina” che conferma prima di chiamare `deletePacchetto` e rimanda alla lista. ◆ `src/views/pacchetti/PacchettiDetail.js:343`

## API pubbliche e servizi
- `fetchPacchetti`, `fetchPacchettoDetail`, `savePacchetto` e `deletePacchetto` sono wrapper di `apiFetch` verso le rotte REST dei pacchetti (`/Pacchetti/list.php`, `/Pacchetti/detail.php`, `/Pacchetti/save.php`, `/Pacchetti/delete.php`). ◆ `src/services/pacchetti.js:3`
- I file `backend/pubblica/Pacchetti/*` sono gli endpoint pubblici che applicano l’autenticazione/permessi (`pack.read`/`pack.write`/`pack.delete`), espongono metodi GET/POST coerenti e rifiutano l’accesso ai clienti. ◆ `backend/pubblica/Pacchetti/list.php:1` ◆ `backend/pubblica/Pacchetti/detail.php:1` ◆ `backend/pubblica/Pacchetti/save.php:1` ◆ `backend/pubblica/Pacchetti/delete.php:1`
- Il servizio applica la logica (`PacchettiService::list/detail/save/delete`), valida l’ID/nome, filtra il flag `only_active` e costruisce il payload per il repository. ◆ `backend/src/Service/PacchettiService.php:13`
- Il repository (`tb_pacchetti`, `tb_pacchetti_righe`) gestisce la query filtrata, la lettura dei dettagli, la persistenza dell’header, la sostituzione atomica delle righe (con gestione della colonna `combo_key` dinamica) e la cancellazione in transazione. ◆ `backend/src/Repositories/PacchettiRepository.php:37`

## Permessi e ruoli
- Gli accessi `pack.*` (read/write/create/delete) sono definiti in `cfg_auth_permessi` e controllano sia il rendering dei pulsanti lato client sia le guardie autenticate lato server. ◆ `sql/mediaprint_erp_v2.sql:725`

## Integrazione con altri moduli
- `fetchPacchetti`/`fetchPacchettoDetail` vengono riutilizzati nei modali di Contratti, Preventivi e Fatture per importare righe predefinite, mantenendo la stessa UI di selezione. ◆ `src/views/contratti/ContrattiCreate.js:190` ◆ `src/views/contratti/ContrattiDetail.js:346` ◆ `src/views/preventivi/PreventiviCreate.js:366` ◆ `src/views/fatture/FattureDetail.js:650`

## Schema dati rilevante
- Le tabelle coinvolte sono `tb_pacchetti` (header con codice, nome, descrizione, stato, timestamp) e `tb_pacchetti_righe` (righe con prodotto, combo, categoria, descrizione, quantità, prezzo, sconto, IVA, natura). Il repository allinea i tipi e ordina per categoria/prodotto grazie ai campi salvati. ◆ `backend/src/Repositories/PacchettiRepository.php:37`
