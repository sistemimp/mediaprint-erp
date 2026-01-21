# Database

## Dump disponibili
- `sql/mediaprint_erp.sql`
- `sql/20250107_add_contratti_status_revisioni.sql`

## Dati gestiti (macro aree)
- Anagrafiche e contatti
- Prodotti, categorie, variazioni e nature IVA
- Preventivi e revisioni
- DDT e fatture
- Contratti e stati
- Pagamenti, scadenze e modalita
- Lavorazioni e assegnazioni

Nota: per dettagli su vincoli, tabelle e trigger consultare i file SQL.

## Migrazioni incremental
- `sql/20260126_add_spedizioni_affrancatura_column.sql` (aggiunge la colonna `id_affrancatura` a `tb_lavorazioni_spedizioni`, in modo che il dettaglio delle spedizioni possa riportare l'affrancatura selezionata)
