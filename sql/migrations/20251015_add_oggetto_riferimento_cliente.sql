-- Aggiunge i campi "oggetto" e "riferimento_cliente" a tb_preventivi e tb_preventivi_archive
ALTER TABLE `tb_preventivi`
  ADD COLUMN `oggetto` VARCHAR(255) NULL AFTER `data_preventivo`,
  ADD COLUMN `riferimento_cliente` VARCHAR(255) NULL AFTER `oggetto`;

ALTER TABLE `tb_preventivi_archive`
  ADD COLUMN `oggetto` VARCHAR(255) NULL AFTER `totale`,
  ADD COLUMN `riferimento_cliente` VARCHAR(255) NULL AFTER `oggetto`;

