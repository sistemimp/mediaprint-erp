-- Migration: ticketing bug system

CREATE TABLE IF NOT EXISTS `tb_bug_tickets` (
  `id_ticket` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `titolo` varchar(200) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `modulo` varchar(120) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `stato` enum('aperto','in_lavorazione','risolto','chiuso') NOT NULL DEFAULT 'aperto',
  `priorita` enum('bassa','media','alta','critica') NOT NULL DEFAULT 'media',
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `assigned_to` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_ticket`),
  KEY `idx_ticket_status` (`stato`),
  KEY `idx_ticket_priority` (`priorita`),
  KEY `idx_ticket_assigned` (`assigned_to`),
  KEY `idx_ticket_created` (`created_by`),
  CONSTRAINT `fk_ticket_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_ticket_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tb_bug_ticket_messages` (
  `id_message` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_ticket` int(10) unsigned NOT NULL,
  `message` text NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_message`),
  KEY `idx_ticket_message_ticket` (`id_ticket`),
  CONSTRAINT `fk_ticket_message_ticket` FOREIGN KEY (`id_ticket`) REFERENCES `tb_bug_tickets` (`id_ticket`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_message_account` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'bug.read', 'Ticketing bug - Leggere', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'bug.read');

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'bug.write', 'Ticketing bug - Scrivere/Modificare', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'bug.write');

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'bug.create', 'Ticketing bug - Creare', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'bug.create');

INSERT IGNORE INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT 1, p.id_permesso
FROM `cfg_auth_permessi` p
WHERE p.code IN ('bug.read', 'bug.write', 'bug.create');
