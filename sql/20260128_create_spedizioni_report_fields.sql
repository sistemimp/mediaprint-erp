-- Adds a generic configuration table for shipping report fields (per affrancatura).
CREATE TABLE IF NOT EXISTS `cfg_lavorazioni_spedizioni_report_fields` (
  `id_field` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_affrancatura` INT(10) UNSIGNED DEFAULT NULL,
  `field_code` VARCHAR(64) NOT NULL,
  `label` VARCHAR(128) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `ordering` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 100,
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_field`),
  UNIQUE KEY `uq_report_field` (`id_affrancatura`, `field_code`),
  KEY `idx_report_affrancatura` (`id_affrancatura`),
  CONSTRAINT `fk_report_affrancatura` FOREIGN KEY (`id_affrancatura`)
    REFERENCES `cfg_lavorazioni_spedizioni_affrancature` (`id_affrancatura`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
