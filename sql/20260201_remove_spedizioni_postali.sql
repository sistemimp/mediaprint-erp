-- Remove Spedizioni postali tables
-- Safe to run multiple times.

DROP TABLE IF EXISTS tb_lavorazioni_spedizioni_report_values;
DROP TABLE IF EXISTS tb_lavorazioni_spedizioni_report_quantities;
DROP TABLE IF EXISTS tb_lavorazioni_spedizioni;

DROP TABLE IF EXISTS cfg_lavorazioni_spedizioni_porti;
DROP TABLE IF EXISTS cfg_lavorazioni_spedizioni_autorizzazioni;
DROP TABLE IF EXISTS cfg_lavorazioni_spedizioni_tariffe;
DROP TABLE IF EXISTS cfg_lavorazioni_spedizioni_report_fields;
DROP TABLE IF EXISTS cfg_lavorazioni_spedizioni_affrancature;
DROP TABLE IF EXISTS cfg_lavorazioni_spedizioni_operatori_postali;
