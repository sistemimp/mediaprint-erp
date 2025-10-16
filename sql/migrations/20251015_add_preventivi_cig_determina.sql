-- Crea tabelle CIG e Determina collegate ai preventivi (1:N)
-- tb_preventivi_cig: id_cig, id_preventivo, cig, data_cig, motivazione
-- tb_preventivi_determina: id_determina, id_preventivo, determina, data_determina, motivazione

CREATE TABLE IF NOT EXISTS `tb_preventivi_cig` (
  `id_cig` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `cig` varchar(50) NOT NULL,
  `data_cig` date DEFAULT NULL,
  `motivazione` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_cig`),
  KEY `idx_prev_cig_prev` (`id_preventivo`),
  KEY `idx_prev_cig_code` (`cig`),
  CONSTRAINT `fk_prev_cig_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tb_preventivi_determina` (
  `id_determina` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `determina` varchar(100) NOT NULL,
  `data_determina` date DEFAULT NULL,
  `motivazione` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_determina`),
  KEY `idx_prev_det_prev` (`id_preventivo`),
  KEY `idx_prev_det_code` (`determina`),
  CONSTRAINT `fk_prev_det_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

