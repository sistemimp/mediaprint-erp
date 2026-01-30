-- Migration: release notes timeline

CREATE TABLE IF NOT EXISTS `tb_release_notes` (
  `id_note` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `titolo` varchar(200) NOT NULL,
  `versione` varchar(32) DEFAULT NULL,
  `contenuto` text NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_note`),
  KEY `idx_release_created_at` (`created_at`),
  KEY `idx_release_created_by` (`created_by`),
  CONSTRAINT `fk_release_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
