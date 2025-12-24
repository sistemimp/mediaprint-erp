# Panorama progetto

MediaPrint ERP e un gestionale con frontend React (CoreUI + Vite) e backend PHP
con endpoint REST-like in `backend/pubblica`. La base dati e MySQL con dump
disponibili nella cartella `sql`.

Stack principale:
- Frontend: React 19, Vite, CoreUI, React Router
- Backend: PHP con PDO, pattern Repository/Service
- Auth: JWT
- DB: MySQL (dump in `sql/`)

Stato attuale (dalle sorgenti presenti):
- Autenticazione con JWT, sessione frontend e route protette
- Moduli anagrafiche, prodotti, preventivi e dashboard con servizi FE e API BE
- Moduli aggiuntivi presenti in FE/BE: contratti, lavorazioni, pagamenti,
  pacchetti, DDT, fatture
- Export XML SdI lato fatture

Note:
- La documentazione API completa e in `docs/API.md` ma copre solo una parte
  degli endpoint presenti in `backend/pubblica`.
- Le viste CoreUI di base (charts, forms, widgets, ecc.) sono presenti come
  parte del template.
