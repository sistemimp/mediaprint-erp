-- Abilitazione assegnazioni dirette delle lavorazioni agli operatori

CREATE TABLE IF NOT EXISTS `tb_lavorazioni_operatori` (
    `id_associazione` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_lavorazione` INT(10) UNSIGNED NOT NULL,
    `id_account` BIGINT(20) UNSIGNED NOT NULL,
    `ruolo` ENUM('owner','collaboratore') NOT NULL DEFAULT 'owner',
    `assegnata_il` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_associazione`),
    UNIQUE KEY `uq_lavorazione_operatore` (`id_lavorazione`, `id_account`),
    KEY `idx_lavorazione_operatore_account` (`id_account`),
    CONSTRAINT `fk_lavorazione_operatore_job` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE,
    CONSTRAINT `fk_lavorazione_operatore_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
