-- Stores numeric values entered in the dynamic report for each shipping.
CREATE TABLE IF NOT EXISTS `tb_lavorazioni_spedizioni_report_values` (
  `id_value` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_spedizione` INT(10) UNSIGNED NOT NULL,
  `field_code` VARCHAR(64) NOT NULL,
  `value` VARCHAR(512) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_value`),
  UNIQUE KEY `uq_spedizione_field` (`id_spedizione`, `field_code`),
  KEY `idx_spedizione_report` (`id_spedizione`),
  CONSTRAINT `fk_spedizioni_report_spedizione` FOREIGN KEY (`id_spedizione`)
    REFERENCES `tb_lavorazioni_spedizioni` (`id_spedizione`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
