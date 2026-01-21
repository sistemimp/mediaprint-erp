-- Tracks per-zone weight/quantity tuples for shipping reports.
CREATE TABLE IF NOT EXISTS `tb_lavorazioni_spedizioni_report_quantities` (
  `id_quantity` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_spedizione` INT(10) UNSIGNED NOT NULL,
  `zona` VARCHAR(32) NOT NULL,
  `peso` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `quantita` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_quantity`),
  UNIQUE KEY `uq_spedizione_zona_peso` (`id_spedizione`, `zona`, `peso`),
  KEY `idx_spedizione_quantities` (`id_spedizione`),
  CONSTRAINT `fk_report_quantities_spedizione` FOREIGN KEY (`id_spedizione`)
    REFERENCES `tb_lavorazioni_spedizioni` (`id_spedizione`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
