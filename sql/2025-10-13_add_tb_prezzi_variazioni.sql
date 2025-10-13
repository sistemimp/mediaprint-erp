-- Crea tabella per prezzi combinati di variazioni per prodotto
CREATE TABLE IF NOT EXISTS `tb_prezzi_variazioni` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_prodotto` INT(10) UNSIGNED NOT NULL,
  `combo_key` VARCHAR(255) NOT NULL,
  `prezzo` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_prod_combo` (`id_prodotto`,`combo_key`),
  CONSTRAINT `fk_prezzi_var_prod` FOREIGN KEY (`id_prodotto`) REFERENCES `tb_prodotti` (`id_prodotto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

