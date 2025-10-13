-- Aggiunge campo opzionale per natura IVA predefinita sul prodotto
ALTER TABLE `tb_prodotti`
  ADD COLUMN `id_sdi_natura_iva` TINYINT(3) UNSIGNED NULL AFTER `id_iva`;

ALTER TABLE `tb_prodotti`
  ADD CONSTRAINT `fk_prod_sdi_natura` FOREIGN KEY (`id_sdi_natura_iva`) REFERENCES `cfg_sdi_natura_iva` (`id_natura`) ON DELETE SET NULL;

