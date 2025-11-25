ALTER TABLE `tb_ddt`
    ADD COLUMN `aspetto` VARCHAR(255) NULL AFTER `destinazione_merce`,
    ADD COLUMN `numero_colli` INT UNSIGNED NULL AFTER `aspetto`,
    ADD COLUMN `cura_trasporto` VARCHAR(255) NULL AFTER `numero_colli`,
    ADD COLUMN `data_trasporto` DATE NULL AFTER `cura_trasporto`,
    ADD COLUMN `vettore` VARCHAR(255) NULL AFTER `data_trasporto`;

ALTER TABLE `tb_ddt_archive`
    ADD COLUMN `aspetto` VARCHAR(255) NULL AFTER `destinazione_merce`,
    ADD COLUMN `numero_colli` INT UNSIGNED NULL AFTER `aspetto`,
    ADD COLUMN `cura_trasporto` VARCHAR(255) NULL AFTER `numero_colli`,
    ADD COLUMN `data_trasporto` DATE NULL AFTER `cura_trasporto`,
    ADD COLUMN `vettore` VARCHAR(255) NULL AFTER `data_trasporto`;
