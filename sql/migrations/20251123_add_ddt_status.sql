ALTER TABLE `tb_ddt`
    ADD COLUMN `stato_documento` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1 AFTER `id_destinazione_predefinita`;

ALTER TABLE `tb_ddt_archive`
    ADD COLUMN `stato_documento` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1 AFTER `id_destinazione_predefinita`;

UPDATE `tb_ddt` SET `stato_documento` = 1 WHERE `stato_documento` IS NULL;
UPDATE `tb_ddt_archive` SET `stato_documento` = 1 WHERE `stato_documento` IS NULL;
