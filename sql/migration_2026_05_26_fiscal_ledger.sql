-- Migrazione fiscale/contabile non distruttiva
-- Compatibile MySQL/MariaDB
-- Data: 2026-05-26

START TRANSACTION;

-- 1) Fondo cliente per causale (es. affrancatura, anticipo generico)
CREATE TABLE IF NOT EXISTS tb_cliente_fondi (
  id_fondo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_anagrafica INT(10) UNSIGNED NOT NULL,
  causale_code VARCHAR(64) NOT NULL,
  causale_label VARCHAR(191) NOT NULL,
  saldo_attuale DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  attivo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_fondo),
  UNIQUE KEY uq_cliente_fondo_causale (id_anagrafica, causale_code),
  KEY idx_cliente_fondo_anagrafica (id_anagrafica),
  CONSTRAINT fk_cliente_fondo_anagrafica
    FOREIGN KEY (id_anagrafica) REFERENCES tb_anagrafiche (id_anagrafica)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Ledger immutabile dei movimenti del fondo cliente
CREATE TABLE IF NOT EXISTS tb_cliente_fondi_movimenti (
  id_movimento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_fondo BIGINT UNSIGNED NOT NULL,
  id_anagrafica INT(10) UNSIGNED NOT NULL,
  tipo_movimento ENUM('entrata','uscita','storno') NOT NULL,
  importo DECIMAL(12,2) NOT NULL,
  saldo_progressivo DECIMAL(12,2) NOT NULL,
  riferimento_tipo VARCHAR(32) DEFAULT NULL,
  riferimento_id BIGINT UNSIGNED DEFAULT NULL,
  id_fattura INT(10) UNSIGNED DEFAULT NULL,
  id_lavorazione INT(10) UNSIGNED DEFAULT NULL,
  id_pagamento INT(10) UNSIGNED DEFAULT NULL,
  note TEXT DEFAULT NULL,
  created_by INT(11) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  prev_hash CHAR(64) DEFAULT NULL,
  row_hash CHAR(64) NOT NULL,
  PRIMARY KEY (id_movimento),
  KEY idx_fondo_mov_fondo (id_fondo, id_movimento),
  KEY idx_fondo_mov_anagrafica (id_anagrafica, id_movimento),
  KEY idx_fondo_mov_fattura (id_fattura),
  KEY idx_fondo_mov_lavorazione (id_lavorazione),
  KEY idx_fondo_mov_pagamento (id_pagamento),
  CONSTRAINT fk_fondo_mov_fondo
    FOREIGN KEY (id_fondo) REFERENCES tb_cliente_fondi (id_fondo)
    ON DELETE RESTRICT,
  CONSTRAINT fk_fondo_mov_anagrafica
    FOREIGN KEY (id_anagrafica) REFERENCES tb_anagrafiche (id_anagrafica)
    ON DELETE RESTRICT,
  CONSTRAINT fk_fondo_mov_fattura
    FOREIGN KEY (id_fattura) REFERENCES tb_fatture (id_fattura)
    ON DELETE SET NULL,
  CONSTRAINT fk_fondo_mov_lavorazione
    FOREIGN KEY (id_lavorazione) REFERENCES tb_lavorazioni (id_lavorazione)
    ON DELETE SET NULL,
  CONSTRAINT fk_fondo_mov_pagamento
    FOREIGN KEY (id_pagamento) REFERENCES tb_pagamenti (id_pagamento)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Allocazioni tra incassi (anche anticipi) e fatture
CREATE TABLE IF NOT EXISTS tb_fatture_incassi_allocazioni (
  id_allocazione BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_fattura INT(10) UNSIGNED NOT NULL,
  id_pagamento INT(10) UNSIGNED DEFAULT NULL,
  id_movimento_fondo BIGINT UNSIGNED DEFAULT NULL,
  tipo_fonte ENUM('pagamento','fondo') NOT NULL,
  importo DECIMAL(12,2) NOT NULL,
  data_allocazione DATE NOT NULL,
  note TEXT DEFAULT NULL,
  created_by INT(11) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_allocazione),
  KEY idx_alloc_fattura (id_fattura, data_allocazione),
  KEY idx_alloc_pagamento (id_pagamento),
  KEY idx_alloc_movfondo (id_movimento_fondo),
  CONSTRAINT fk_alloc_fattura
    FOREIGN KEY (id_fattura) REFERENCES tb_fatture (id_fattura)
    ON DELETE RESTRICT,
  CONSTRAINT fk_alloc_pagamento
    FOREIGN KEY (id_pagamento) REFERENCES tb_pagamenti (id_pagamento)
    ON DELETE SET NULL,
  CONSTRAINT fk_alloc_movfondo
    FOREIGN KEY (id_movimento_fondo) REFERENCES tb_cliente_fondi_movimenti (id_movimento)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Lock fiscale documento (blocco forte dopo emissione/invio)
CREATE TABLE IF NOT EXISTS tb_fatture_fiscal_lock (
  id_fattura INT(10) UNSIGNED NOT NULL,
  lock_reason VARCHAR(191) NOT NULL,
  locked_by INT(11) DEFAULT NULL,
  locked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_fattura),
  CONSTRAINT fk_fiscal_lock_fattura
    FOREIGN KEY (id_fattura) REFERENCES tb_fatture (id_fattura)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) Hardening indici utili su query di bilancio/riconciliazione
CREATE INDEX idx_fatture_stato_data_anag
  ON tb_fatture (id_stato_fatt, data_fattura, id_anagrafica);

CREATE INDEX idx_apf_fatt_data
  ON appoggio_pagamenti_fattura (id_fattura, data_pagamento);

CREATE INDEX idx_pagamenti_data_anag_hint
  ON tb_pagamenti (data_pagamento, id_anagrafica_hint);

-- 6) Rimozione causale_movimento (legacy)
SET @drop_causale_mov_col := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tb_cliente_fondi_movimenti'
        AND COLUMN_NAME = 'causale_movimento'
    ),
    'ALTER TABLE tb_cliente_fondi_movimenti DROP COLUMN causale_movimento',
    'SELECT 1'
  )
);
PREPARE stmt_drop_causale_mov_col FROM @drop_causale_mov_col;
EXECUTE stmt_drop_causale_mov_col;
DEALLOCATE PREPARE stmt_drop_causale_mov_col;

COMMIT;
