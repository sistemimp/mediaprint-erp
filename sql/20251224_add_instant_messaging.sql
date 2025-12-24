-- Instant messaging tables (one-to-one conversations)

CREATE TABLE IF NOT EXISTS `im_threads` (
  `id_thread` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pair_key` varchar(64) NOT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_message_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_thread`),
  UNIQUE KEY `uq_im_pair` (`pair_key`),
  KEY `idx_im_created_by` (`created_by`),
  CONSTRAINT `fk_im_thread_creator` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `im_participants` (
  `id_thread` bigint(20) unsigned NOT NULL,
  `id_account` bigint(20) unsigned NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_thread`, `id_account`),
  KEY `idx_im_participant_account` (`id_account`),
  CONSTRAINT `fk_im_participant_thread` FOREIGN KEY (`id_thread`) REFERENCES `im_threads` (`id_thread`) ON DELETE CASCADE,
  CONSTRAINT `fk_im_participant_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `im_messages` (
  `id_message` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_thread` bigint(20) unsigned NOT NULL,
  `id_account` bigint(20) unsigned NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_message`),
  KEY `idx_im_messages_thread` (`id_thread`),
  KEY `idx_im_messages_sender` (`id_account`),
  CONSTRAINT `fk_im_message_thread` FOREIGN KEY (`id_thread`) REFERENCES `im_threads` (`id_thread`) ON DELETE CASCADE,
  CONSTRAINT `fk_im_message_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
