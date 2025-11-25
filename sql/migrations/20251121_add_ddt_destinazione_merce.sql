ALTER TABLE `tb_ddt`
    ADD COLUMN `destinazione_merce` VARCHAR(255) NULL AFTER `note`;

ALTER TABLE `tb_ddt_archive`
    ADD COLUMN `destinazione_merce` VARCHAR(255) NULL AFTER `note`;
