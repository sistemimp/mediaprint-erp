-- Modulo lavorazioni e attivita operative collegate al ciclo dei preventivi

CREATE TABLE IF NOT EXISTS `cfg_reparti_produttivi` (
    `id_reparto` SMALLINT(5) UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `label` VARCHAR(128) NOT NULL,
    `ordering` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 100,
    `attivo` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id_reparto`),
    UNIQUE KEY `uq_cfg_reparti_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cfg_reparti_produttivi` (`code`, `label`, `ordering`, `attivo`)
SELECT 'stampa', 'Stampa', 10, 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_reparti_produttivi` WHERE `code` = 'stampa');

INSERT INTO `cfg_reparti_produttivi` (`code`, `label`, `ordering`, `attivo`)
SELECT 'imbustamento', 'Imbustamento', 20, 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_reparti_produttivi` WHERE `code` = 'imbustamento');

INSERT INTO `cfg_reparti_produttivi` (`code`, `label`, `ordering`, `attivo`)
SELECT 'cellophanatura', 'Cellophanatura', 30, 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_reparti_produttivi` WHERE `code` = 'cellophanatura');


CREATE TABLE IF NOT EXISTS `tb_lavorazioni` (
    `id_lavorazione` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_preventivo` INT(10) UNSIGNED NOT NULL,
    `id_anagrafica` INT(10) UNSIGNED NOT NULL,
    `codice` VARCHAR(64) DEFAULT NULL,
    `titolo` VARCHAR(255) NOT NULL,
    `descrizione` TEXT DEFAULT NULL,
    `stato` ENUM('aperta','pianificata','in_produzione','completata','annullata') NOT NULL DEFAULT 'aperta',
    `priorita` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    `id_reparto` SMALLINT(5) UNSIGNED DEFAULT NULL,
    `data_inizio_prevista` DATE DEFAULT NULL,
    `data_fine_prevista` DATE DEFAULT NULL,
    `data_avvio_reale` DATETIME DEFAULT NULL,
    `data_chiusura` DATETIME DEFAULT NULL,
    `quantita_totale_prevista` DECIMAL(12,2) DEFAULT NULL,
    `quantita_totale_effettiva` DECIMAL(12,2) DEFAULT NULL,
    `percentuale_avanzamento` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
    `note` TEXT DEFAULT NULL,
    `created_by` BIGINT(20) UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT(20) UNSIGNED DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_lavorazione`),
    UNIQUE KEY `uq_lavorazioni_prev` (`id_preventivo`),
    UNIQUE KEY `uq_lavorazioni_codice` (`codice`),
    KEY `idx_lavorazioni_stato` (`stato`),
    KEY `idx_lavorazioni_reparto` (`id_reparto`),
    KEY `idx_lavorazioni_anagrafica` (`id_anagrafica`),
    CONSTRAINT `fk_lavorazioni_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE,
    CONSTRAINT `fk_lavorazioni_anagrafica` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`) ON DELETE RESTRICT,
    CONSTRAINT `fk_lavorazioni_reparto` FOREIGN KEY (`id_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL,
    CONSTRAINT `fk_lavorazioni_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
    CONSTRAINT `fk_lavorazioni_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `tb_lavorazioni_attivita` (
    `id_attivita` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_lavorazione` INT(10) UNSIGNED NOT NULL,
    `titolo` VARCHAR(255) NOT NULL,
    `descrizione` TEXT DEFAULT NULL,
    `stato` ENUM('todo','in_progress','done','cancelled') NOT NULL DEFAULT 'todo',
    `priorita` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    `id_reparto` SMALLINT(5) UNSIGNED DEFAULT NULL,
    `ordine` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
    `data_creazione` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `data_scadenza` DATETIME DEFAULT NULL,
    `data_completamento` DATETIME DEFAULT NULL,
    `quantita_prevista` DECIMAL(12,2) DEFAULT NULL,
    `quantita_effettiva` DECIMAL(12,2) DEFAULT NULL,
    `note` TEXT DEFAULT NULL,
    `created_by` BIGINT(20) UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT(20) UNSIGNED DEFAULT NULL,
    `completed_by` BIGINT(20) UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id_attivita`),
    KEY `idx_attivita_lavorazione` (`id_lavorazione`),
    KEY `idx_attivita_stato` (`stato`),
    KEY `idx_attivita_scadenza` (`data_scadenza`),
    CONSTRAINT `fk_attivita_lavorazione` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE,
    CONSTRAINT `fk_attivita_reparto` FOREIGN KEY (`id_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL,
    CONSTRAINT `fk_attivita_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
    CONSTRAINT `fk_attivita_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
    CONSTRAINT `fk_attivita_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `tb_lavorazioni_attivita_operatori` (
    `id_associazione` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_attivita` BIGINT(20) UNSIGNED NOT NULL,
    `id_account` BIGINT(20) UNSIGNED NOT NULL,
    `ruolo` ENUM('owner','collaboratore') NOT NULL DEFAULT 'owner',
    `assegnata_il` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_associazione`),
    UNIQUE KEY `uq_attivita_operatore` (`id_attivita`, `id_account`),
    KEY `idx_attivita_operatore_account` (`id_account`),
    CONSTRAINT `fk_attivita_operatore_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE CASCADE,
    CONSTRAINT `fk_attivita_operatore_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `tb_lavorazioni_attivita_allegati` (
    `id_allegato` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_attivita` BIGINT(20) UNSIGNED NOT NULL,
    `nome_file` VARCHAR(255) NOT NULL,
    `path_file` VARCHAR(512) NOT NULL,
    `mime_type` VARCHAR(128) DEFAULT NULL,
    `size_bytes` BIGINT(20) UNSIGNED DEFAULT NULL,
    `uploaded_by` BIGINT(20) UNSIGNED DEFAULT NULL,
    `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_allegato`),
    KEY `idx_attivita_allegati_attivita` (`id_attivita`),
    CONSTRAINT `fk_attivita_allegati_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE CASCADE,
    CONSTRAINT `fk_attivita_allegati_account` FOREIGN KEY (`uploaded_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `tb_lavorazioni_eventi` (
    `id_evento` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_lavorazione` INT(10) UNSIGNED NOT NULL,
    `id_attivita` BIGINT(20) UNSIGNED DEFAULT NULL,
    `evento` VARCHAR(128) NOT NULL,
    `old_value` JSON DEFAULT NULL,
    `new_value` JSON DEFAULT NULL,
    `note` TEXT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT(20) UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id_evento`),
    KEY `idx_eventi_lavorazione` (`id_lavorazione`),
    KEY `idx_eventi_attivita` (`id_attivita`),
    CONSTRAINT `fk_eventi_lavorazione` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE,
    CONSTRAINT `fk_eventi_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE SET NULL,
    CONSTRAINT `fk_eventi_account` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `tb_lavorazioni_notifiche` (
    `id_notifica` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_lavorazione` INT(10) UNSIGNED DEFAULT NULL,
    `id_attivita` BIGINT(20) UNSIGNED DEFAULT NULL,
    `id_account` BIGINT(20) UNSIGNED NOT NULL,
    `tipo` ENUM('email','dashboard') NOT NULL DEFAULT 'dashboard',
    `titolo` VARCHAR(191) DEFAULT NULL,
    `messaggio` TEXT DEFAULT NULL,
    `payload` JSON DEFAULT NULL,
    `stato` ENUM('pending','queued','sent','failed','read') NOT NULL DEFAULT 'pending',
    `scheduled_at` DATETIME DEFAULT NULL,
    `sent_at` DATETIME DEFAULT NULL,
    `read_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_notifica`),
    KEY `idx_notifiche_account` (`id_account`),
    KEY `idx_notifiche_stato` (`stato`),
    CONSTRAINT `fk_notifiche_lavorazione` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE,
    CONSTRAINT `fk_notifiche_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE SET NULL,
    CONSTRAINT `fk_notifiche_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `tb_lavorazioni_report_export` (
    `id_export` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `formato` ENUM('pdf','xlsx') NOT NULL,
    `filtro_periodo_da` DATE DEFAULT NULL,
    `filtro_periodo_a` DATE DEFAULT NULL,
    `filtro_id_anagrafica` INT(10) UNSIGNED DEFAULT NULL,
    `filtro_stato_lavorazione` VARCHAR(32) DEFAULT NULL,
    `filtro_reparto` SMALLINT(5) UNSIGNED DEFAULT NULL,
    `rows_count` INT(10) UNSIGNED NOT NULL DEFAULT 0,
    `file_name` VARCHAR(255) DEFAULT NULL,
    `file_path` VARCHAR(512) DEFAULT NULL,
    `id_account` BIGINT(20) UNSIGNED DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_export`),
    KEY `idx_report_account` (`id_account`),
    CONSTRAINT `fk_report_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
    CONSTRAINT `fk_report_reparto` FOREIGN KEY (`filtro_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cfg_lavorazioni_attivita_template` (
    `id_template` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `titolo` VARCHAR(191) NOT NULL,
    `descrizione` TEXT DEFAULT NULL,
    `priorita` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    `id_reparto` SMALLINT(5) UNSIGNED DEFAULT NULL,
    `durata_predefinita_giorni` SMALLINT(5) UNSIGNED DEFAULT NULL,
    `attivo` TINYINT(1) NOT NULL DEFAULT 1,
    `ordering` SMALLINT(5) UNSIGNED DEFAULT 100,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_template`),
    KEY `idx_template_attivo` (`attivo`),
    KEY `idx_template_reparto` (`id_reparto`),
    CONSTRAINT `fk_template_reparto` FOREIGN KEY (`id_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cfg_lavorazioni_attivita_template` (`titolo`, `descrizione`, `priorita`, `id_reparto`, `ordering`)
SELECT 'Impaginazione', 'Predisposizione file grafici per la commessa', 'medium', (SELECT id_reparto FROM cfg_reparti_produttivi WHERE code = 'stampa' LIMIT 1), 10
WHERE NOT EXISTS (SELECT 1 FROM `cfg_lavorazioni_attivita_template` WHERE `titolo` = 'Impaginazione');

INSERT INTO `cfg_lavorazioni_attivita_template` (`titolo`, `descrizione`, `priorita`, `id_reparto`, `ordering`)
SELECT 'Stampa', 'Produzione in reparto stampa', 'high', (SELECT id_reparto FROM cfg_reparti_produttivi WHERE code = 'stampa' LIMIT 1), 20
WHERE NOT EXISTS (SELECT 1 FROM `cfg_lavorazioni_attivita_template` WHERE `titolo` = 'Stampa');

INSERT INTO `cfg_lavorazioni_attivita_template` (`titolo`, `descrizione`, `priorita`, `id_reparto`, `ordering`)
SELECT 'Imbustamento', 'Preparazione e imbustamento del materiale', 'medium', (SELECT id_reparto FROM cfg_reparti_produttivi WHERE code = 'imbustamento' LIMIT 1), 30
WHERE NOT EXISTS (SELECT 1 FROM `cfg_lavorazioni_attivita_template` WHERE `titolo` = 'Imbustamento');


ALTER TABLE `tb_preventivi`
    ADD COLUMN `confermato_il` DATETIME DEFAULT NULL AFTER `note`,
    ADD COLUMN `confermato_da_account` BIGINT(20) UNSIGNED DEFAULT NULL AFTER `confermato_il`,
    ADD COLUMN `id_lavorazione_corrente` INT(10) UNSIGNED DEFAULT NULL AFTER `confermato_da_account`,
    ADD COLUMN `lavorazione_creata_il` DATETIME DEFAULT NULL AFTER `id_lavorazione_corrente`,
    ADD KEY `idx_prev_confermato_il` (`confermato_il`),
    ADD KEY `idx_prev_lavorazione_corrente` (`id_lavorazione_corrente`),
    ADD CONSTRAINT `fk_prev_confermato_da` FOREIGN KEY (`confermato_da_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
    ADD CONSTRAINT `fk_prev_lavorazione_corrente` FOREIGN KEY (`id_lavorazione_corrente`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE SET NULL;

ALTER TABLE `tb_preventivi_archive`
    ADD COLUMN `confermato_il` DATETIME DEFAULT NULL AFTER `note`,
    ADD COLUMN `confermato_da_account` BIGINT(20) UNSIGNED DEFAULT NULL AFTER `confermato_il`,
    ADD COLUMN `id_lavorazione_corrente` INT(10) UNSIGNED DEFAULT NULL AFTER `confermato_da_account`,
    ADD COLUMN `lavorazione_creata_il` DATETIME DEFAULT NULL AFTER `id_lavorazione_corrente`,
    ADD KEY `idx_prev_arch_confermato_il` (`confermato_il`),
    ADD KEY `idx_prev_arch_lavorazione` (`id_lavorazione_corrente`),
    ADD CONSTRAINT `fk_prev_arch_confermato_da` FOREIGN KEY (`confermato_da_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
    ADD CONSTRAINT `fk_prev_arch_lavorazione` FOREIGN KEY (`id_lavorazione_corrente`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE SET NULL;


INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'job.view', 'Visualizzare lavorazioni e attivita', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'job.view');

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'job.manage', 'Creare e aggiornare lavorazioni e attivita', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'job.manage');

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'job.assign', 'Assegnare attivita agli operatori', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'job.assign');

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'job.report', 'Generare ed esportare report di produzione', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'job.report');

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'job.analytics', 'Visualizzare dashboard e analytics produzione', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'job.analytics');

INSERT INTO `cfg_auth_permessi` (`code`, `label`, `attivo`)
SELECT 'job.admin', 'Gestire configurazioni e SLA lavorazioni', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_permessi` WHERE `code` = 'job.admin');


INSERT INTO `cfg_auth_ruoli` (`code`, `label`, `attivo`)
SELECT 'commerciale', 'Commerciale', 1
WHERE NOT EXISTS (SELECT 1 FROM `cfg_auth_ruoli` WHERE `code` = 'commerciale');


-- Assegna permessi job a ruoli chiave
INSERT INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT r.id_ruolo, p.id_permesso
FROM `cfg_auth_ruoli` r
JOIN `cfg_auth_permessi` p ON p.code = 'job.view'
WHERE r.code IN ('admin','operatore','commerciale')
  AND NOT EXISTS (
    SELECT 1 FROM `auth_ruolo_permesso` rp WHERE rp.id_ruolo = r.id_ruolo AND rp.id_permesso = p.id_permesso
  );

INSERT INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT r.id_ruolo, p.id_permesso
FROM `cfg_auth_ruoli` r
JOIN `cfg_auth_permessi` p ON p.code = 'job.manage'
WHERE r.code IN ('admin','operatore','commerciale')
  AND NOT EXISTS (
    SELECT 1 FROM `auth_ruolo_permesso` rp WHERE rp.id_ruolo = r.id_ruolo AND rp.id_permesso = p.id_permesso
  );

INSERT INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT r.id_ruolo, p.id_permesso
FROM `cfg_auth_ruoli` r
JOIN `cfg_auth_permessi` p ON p.code = 'job.assign'
WHERE r.code IN ('admin','operatore')
  AND NOT EXISTS (
    SELECT 1 FROM `auth_ruolo_permesso` rp WHERE rp.id_ruolo = r.id_ruolo AND rp.id_permesso = p.id_permesso
  );

INSERT INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT r.id_ruolo, p.id_permesso
FROM `cfg_auth_ruoli` r
JOIN `cfg_auth_permessi` p ON p.code = 'job.report'
WHERE r.code IN ('admin','operatore')
  AND NOT EXISTS (
    SELECT 1 FROM `auth_ruolo_permesso` rp WHERE rp.id_ruolo = r.id_ruolo AND rp.id_permesso = p.id_permesso
  );

INSERT INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT r.id_ruolo, p.id_permesso
FROM `cfg_auth_ruoli` r
JOIN `cfg_auth_permessi` p ON p.code = 'job.analytics'
WHERE r.code IN ('admin','operatore')
  AND NOT EXISTS (
    SELECT 1 FROM `auth_ruolo_permesso` rp WHERE rp.id_ruolo = r.id_ruolo AND rp.id_permesso = p.id_permesso
  );

INSERT INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT r.id_ruolo, p.id_permesso
FROM `cfg_auth_ruoli` r
JOIN `cfg_auth_permessi` p ON p.code = 'job.admin'
WHERE r.code IN ('admin')
  AND NOT EXISTS (
    SELECT 1 FROM `auth_ruolo_permesso` rp WHERE rp.id_ruolo = r.id_ruolo AND rp.id_permesso = p.id_permesso
  );

-- Il ruolo commerciale eredita i permessi chiave sui preventivi
INSERT INTO `auth_ruolo_permesso` (`id_ruolo`, `id_permesso`)
SELECT r.id_ruolo, p.id_permesso
FROM `cfg_auth_ruoli` r
JOIN `cfg_auth_permessi` p ON p.code IN ('anag.view','prev.view','prev.edit','prev.approve')
WHERE r.code = 'commerciale'
  AND NOT EXISTS (
    SELECT 1
    FROM `auth_ruolo_permesso` rp
    WHERE rp.id_ruolo = r.id_ruolo AND rp.id_permesso = p.id_permesso
  );
