-- Add contract statuses + revisions support

CREATE TABLE IF NOT EXISTS `cfg_stati_contratto` (
  `id_stato` TINYINT(3) UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `label` VARCHAR(64) NOT NULL,
  `ordering` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `attivo` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_stato`),
  UNIQUE KEY `uq_contr_stato_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cfg_stati_contratto` (`code`, `label`, `ordering`, `attivo`) VALUES
('bozza', 'Bozza', 10, 1),
('inviato', 'Inviato', 20, 1),
('confermato', 'Confermato', 30, 1),
('rifiutato', 'Rifiutato', 40, 1),
('annullato', 'Annullato', 50, 1)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `ordering` = VALUES(`ordering`),
  `attivo` = VALUES(`attivo`);

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'tb_contratti'
    AND column_name = 'id_stato_contr'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `tb_contratti` ADD COLUMN `id_stato_contr` INT UNSIGNED NULL AFTER `attivo`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `tb_contratti`
SET `id_stato_contr` = (
  SELECT `id_stato` FROM `cfg_stati_contratto` WHERE `code` = 'bozza' LIMIT 1
)
WHERE `id_stato_contr` IS NULL;

CREATE TABLE IF NOT EXISTS `tb_contratti_revisioni` (
  `id_revisione` INT AUTO_INCREMENT PRIMARY KEY,
  `id_contratto` INT UNSIGNED NOT NULL,
  `numero_revision` INT NOT NULL,
  `label` VARCHAR(32) NOT NULL,
  `note` TEXT NULL,
  `operatore` VARCHAR(255) NULL,
  `payload` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_contr_revision` (`id_contratto`, `numero_revision`),
  CONSTRAINT `fk_contr_revision_contratto` FOREIGN KEY (`id_contratto`)
    REFERENCES `tb_contratti` (`id_contratto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
