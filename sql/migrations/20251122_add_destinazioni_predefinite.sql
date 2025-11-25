CREATE TABLE IF NOT EXISTS `cfg_destinazioni_merce` (
    `id_destinazione` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(150) NOT NULL,
    `indirizzo` VARCHAR(255) NULL,
    `cap` VARCHAR(20) NULL,
    `comune` VARCHAR(100) NULL,
    `provincia` VARCHAR(50) NULL,
    `nazione_iso2` VARCHAR(2) NULL,
    `note` VARCHAR(255) NULL,
    `attivo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_destinazione`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `tb_ddt`
    ADD COLUMN `id_destinazione_predefinita` INT(10) UNSIGNED NULL AFTER `id_sede_destinazione`;

ALTER TABLE `tb_ddt_archive`
    ADD COLUMN `id_destinazione_predefinita` INT(10) UNSIGNED NULL AFTER `id_sede_destinazione`,
    ADD COLUMN `destinazione_merce` VARCHAR(255) NULL AFTER `note`;

SET @has_dest := (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'cfg_destinazioni_merce'
    LIMIT 1
);

SET @sql_fk_dest := IF(
    @has_dest > 0,
    'ALTER TABLE `tb_ddt` ADD CONSTRAINT `fk_ddt_destinazione_predefinita` FOREIGN KEY (`id_destinazione_predefinita`) REFERENCES `cfg_destinazioni_merce` (`id_destinazione`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT 1'
);

PREPARE stmt FROM @sql_fk_dest;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
