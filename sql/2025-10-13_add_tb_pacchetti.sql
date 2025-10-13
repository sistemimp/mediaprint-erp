-- Crea tabelle per pacchetti prodotti

CREATE TABLE IF NOT EXISTS tb_pacchetti (
  id_pacchetto INT AUTO_INCREMENT PRIMARY KEY,
  codice VARCHAR(64) NULL,
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT NULL,
  attivo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_tb_pacchetti_codice (codice)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_pacchetti_righe (
  id_riga INT AUTO_INCREMENT PRIMARY KEY,
  id_pacchetto INT NOT NULL,
  id_prodotto INT NULL,
  descrizione VARCHAR(255) NOT NULL,
  quantita DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  prezzo_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  sconto DECIMAL(5,2) NULL,
  iva DECIMAL(5,2) NULL,
  id_sdi_natura_iva INT NULL,
  posizione INT NULL,
  CONSTRAINT fk_pacchetti_righe_pacchetto FOREIGN KEY (id_pacchetto) REFERENCES tb_pacchetti(id_pacchetto) ON DELETE CASCADE,
  INDEX idx_pacchetti_righe_pacchetto (id_pacchetto),
  INDEX idx_pacchetti_righe_posizione (posizione)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

