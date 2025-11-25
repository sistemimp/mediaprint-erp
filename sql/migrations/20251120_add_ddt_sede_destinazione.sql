ALTER TABLE `tb_ddt`
    ADD COLUMN `id_sede_destinazione` INT(10) UNSIGNED NULL AFTER `id_causale`;

SET @has_sedi := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'tb_sedi'
  LIMIT 1
);

SET @sql_fk := IF(
  @has_sedi > 0,
  'ALTER TABLE `tb_ddt` ADD CONSTRAINT `fk_ddt_sede_destinazione` FOREIGN KEY (`id_sede_destinazione`) REFERENCES `tb_sedi` (`id_sede`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `tb_ddt_archive`
    ADD COLUMN `id_sede_destinazione` INT(10) UNSIGNED NULL AFTER `id_anagrafica`;
