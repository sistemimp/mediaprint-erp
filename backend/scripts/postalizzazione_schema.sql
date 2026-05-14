-- =====================================================
-- Schema: Postalizzazione Massiva (MySQL 8+)
-- Target: 200K+ invii per campagna con query rapide su stato/esito
-- =====================================================

CREATE DATABASE IF NOT EXISTS postalizzazione CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE postalizzazione;

-- -----------------------------------------------------
-- 1) Campagne (dati minimi)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS campagne (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codice_campagna VARCHAR(40) NOT NULL,
  nome_campagna VARCHAR(150) NOT NULL,
  id_cliente BIGINT UNSIGNED NOT NULL,
  canale_postale VARCHAR(40) NOT NULL,
  stato_campagna ENUM('bozza','importata','in_lavorazione','postalizzata','chiusa','annullata') NOT NULL DEFAULT 'bozza',
  data_creazione DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_aggiornamento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_campagne_codice (codice_campagna),
  KEY idx_campagne_cliente_stato (id_cliente, stato_campagna),
  KEY idx_campagne_data (data_creazione)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 2) Invii (dati minimi + 50 campi spare)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS invii (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_campagna BIGINT UNSIGNED NOT NULL,

  -- chiavi operative
  codice_invio VARCHAR(80) NOT NULL,
  riferimento_esterno VARCHAR(120) DEFAULT NULL,

  -- anagrafica minima postalizzazione
  nome_destinatario VARCHAR(150) NOT NULL,
  indirizzo VARCHAR(255) NOT NULL,
  cap CHAR(5) NOT NULL,
  citta VARCHAR(120) NOT NULL,
  provincia CHAR(2) NOT NULL,

  -- metadati invio
  stato_invio ENUM('acquisito','validato','in_stampa','affidato_vettore','postalizzato','errore') NOT NULL DEFAULT 'acquisito',
  data_prevista_spedizione DATE DEFAULT NULL,
  data_postalizzazione DATETIME DEFAULT NULL,
  tracking_code VARCHAR(120) DEFAULT NULL,

  -- payload variabile oltre ai campi standard
  extra_json JSON DEFAULT NULL,

  -- 50 campi spare mappabili da CSV/Excel
  spare_01 VARCHAR(255) DEFAULT NULL,
  spare_02 VARCHAR(255) DEFAULT NULL,
  spare_03 VARCHAR(255) DEFAULT NULL,
  spare_04 VARCHAR(255) DEFAULT NULL,
  spare_05 VARCHAR(255) DEFAULT NULL,
  spare_06 VARCHAR(255) DEFAULT NULL,
  spare_07 VARCHAR(255) DEFAULT NULL,
  spare_08 VARCHAR(255) DEFAULT NULL,
  spare_09 VARCHAR(255) DEFAULT NULL,
  spare_10 VARCHAR(255) DEFAULT NULL,
  spare_11 VARCHAR(255) DEFAULT NULL,
  spare_12 VARCHAR(255) DEFAULT NULL,
  spare_13 VARCHAR(255) DEFAULT NULL,
  spare_14 VARCHAR(255) DEFAULT NULL,
  spare_15 VARCHAR(255) DEFAULT NULL,
  spare_16 VARCHAR(255) DEFAULT NULL,
  spare_17 VARCHAR(255) DEFAULT NULL,
  spare_18 VARCHAR(255) DEFAULT NULL,
  spare_19 VARCHAR(255) DEFAULT NULL,
  spare_20 VARCHAR(255) DEFAULT NULL,
  spare_21 VARCHAR(255) DEFAULT NULL,
  spare_22 VARCHAR(255) DEFAULT NULL,
  spare_23 VARCHAR(255) DEFAULT NULL,
  spare_24 VARCHAR(255) DEFAULT NULL,
  spare_25 VARCHAR(255) DEFAULT NULL,
  spare_26 VARCHAR(255) DEFAULT NULL,
  spare_27 VARCHAR(255) DEFAULT NULL,
  spare_28 VARCHAR(255) DEFAULT NULL,
  spare_29 VARCHAR(255) DEFAULT NULL,
  spare_30 VARCHAR(255) DEFAULT NULL,
  spare_31 VARCHAR(255) DEFAULT NULL,
  spare_32 VARCHAR(255) DEFAULT NULL,
  spare_33 VARCHAR(255) DEFAULT NULL,
  spare_34 VARCHAR(255) DEFAULT NULL,
  spare_35 VARCHAR(255) DEFAULT NULL,
  spare_36 VARCHAR(255) DEFAULT NULL,
  spare_37 VARCHAR(255) DEFAULT NULL,
  spare_38 VARCHAR(255) DEFAULT NULL,
  spare_39 VARCHAR(255) DEFAULT NULL,
  spare_40 VARCHAR(255) DEFAULT NULL,
  spare_41 VARCHAR(255) DEFAULT NULL,
  spare_42 VARCHAR(255) DEFAULT NULL,
  spare_43 VARCHAR(255) DEFAULT NULL,
  spare_44 VARCHAR(255) DEFAULT NULL,
  spare_45 VARCHAR(255) DEFAULT NULL,
  spare_46 VARCHAR(255) DEFAULT NULL,
  spare_47 VARCHAR(255) DEFAULT NULL,
  spare_48 VARCHAR(255) DEFAULT NULL,
  spare_49 VARCHAR(255) DEFAULT NULL,
  spare_50 VARCHAR(255) DEFAULT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_invii_campagna FOREIGN KEY (id_campagna) REFERENCES campagne(id) ON DELETE CASCADE,

  UNIQUE KEY uk_invii_campagna_codice (id_campagna, codice_invio),
  KEY idx_invii_campagna_stato (id_campagna, stato_invio),
  KEY idx_invii_campagna_cap (id_campagna, cap),
  KEY idx_invii_campagna_citta (id_campagna, citta),
  KEY idx_invii_campagna_provincia (id_campagna, provincia),
  KEY idx_invii_tracking (tracking_code),
  KEY idx_invii_data_postalizzazione (data_postalizzazione),
  KEY idx_invii_created (created_at)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 3) Esiti postalizzazione (storico eventi)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS esiti (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_invio BIGINT UNSIGNED NOT NULL,
  codice_esito VARCHAR(60) NOT NULL,
  descrizione_esito VARCHAR(255) DEFAULT NULL,
  stato_esito ENUM('in_attesa','consegnato','non_recapitato','giacenza','reso','annullato') NOT NULL,
  data_evento DATETIME NOT NULL,
  fonte VARCHAR(80) DEFAULT NULL,
  scan_path VARCHAR(500) DEFAULT NULL,
  dettaglio_json JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_esiti_invio FOREIGN KEY (id_invio) REFERENCES invii(id) ON DELETE CASCADE,

  KEY idx_esiti_invio_data (id_invio, data_evento DESC),
  KEY idx_esiti_stato_data (stato_esito, data_evento DESC),
  KEY idx_esiti_codice (codice_esito)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 4) Import CSV/Excel + Mapping dinamico colonne
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS import_job (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_campagna BIGINT UNSIGNED NOT NULL,
  nome_file VARCHAR(255) NOT NULL,
  tipo_file ENUM('csv','xlsx','xls') NOT NULL,
  stato_job ENUM('caricato','mapping','validazione','importazione','completato','errore') NOT NULL DEFAULT 'caricato',
  righe_totali INT UNSIGNED NOT NULL DEFAULT 0,
  righe_importate INT UNSIGNED NOT NULL DEFAULT 0,
  righe_scartate INT UNSIGNED NOT NULL DEFAULT 0,
  messaggio_errore TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_import_job_campagna FOREIGN KEY (id_campagna) REFERENCES campagne(id) ON DELETE CASCADE,
  KEY idx_import_job_campagna_data (id_campagna, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS import_mapping (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_import_job BIGINT UNSIGNED NOT NULL,
  csv_colonna VARCHAR(255) NOT NULL,
  db_campo VARCHAR(80) NOT NULL,
  posizione_colonna INT UNSIGNED NOT NULL,
  trasformazione VARCHAR(80) DEFAULT NULL,
  required_field TINYINT(1) NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  CONSTRAINT fk_import_mapping_job FOREIGN KEY (id_import_job) REFERENCES import_job(id) ON DELETE CASCADE,
  UNIQUE KEY uk_import_mapping_job_field (id_import_job, db_campo),
  KEY idx_import_mapping_job_pos (id_import_job, posizione_colonna)
) ENGINE=InnoDB;

-- staging righe grezze (opzionale ma utile per audit/errori)
CREATE TABLE IF NOT EXISTS import_row_staging (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_import_job BIGINT UNSIGNED NOT NULL,
  numero_riga INT UNSIGNED NOT NULL,
  raw_json JSON NOT NULL,
  esito_validazione ENUM('ok','ko') NOT NULL DEFAULT 'ok',
  errore_validazione VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_import_row_job FOREIGN KEY (id_import_job) REFERENCES import_job(id) ON DELETE CASCADE,
  KEY idx_import_row_job_riga (id_import_job, numero_riga),
  KEY idx_import_row_job_esito (id_import_job, esito_validazione)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- Vista utile: ultimo esito per invio
-- -----------------------------------------------------
CREATE OR REPLACE VIEW v_invii_ultimo_esito AS
SELECT
  i.id AS id_invio,
  i.id_campagna,
  i.codice_invio,
  i.nome_destinatario,
  i.indirizzo,
  i.cap,
  i.citta,
  i.provincia,
  i.stato_invio,
  e.stato_esito,
  e.codice_esito,
  e.data_evento,
  e.scan_path
FROM invii i
LEFT JOIN esiti e
  ON e.id = (
    SELECT e2.id
    FROM esiti e2
    WHERE e2.id_invio = i.id
    ORDER BY e2.data_evento DESC, e2.id DESC
    LIMIT 1
  );

-- -----------------------------------------------------
-- Query operative consigliate (commento)
-- -----------------------------------------------------
-- 1) KPI campagna:
-- SELECT stato_invio, COUNT(*) FROM invii WHERE id_campagna=? GROUP BY stato_invio;
-- 2) Lista invii per campagna paginata:
-- SELECT * FROM invii WHERE id_campagna=? ORDER BY id LIMIT 200 OFFSET ?;
-- 3) Esiti recenti campagna:
-- SELECT e.* FROM esiti e JOIN invii i ON i.id=e.id_invio WHERE i.id_campagna=? ORDER BY e.data_evento DESC LIMIT 500;
