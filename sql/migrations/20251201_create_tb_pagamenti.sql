CREATE TABLE `tb_pagamenti` (
    `id_pagamento` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `import_uid` VARCHAR(64) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `data_pagamento` DATE NOT NULL,
    `importo_totale` DECIMAL(12,2) NOT NULL,
    `importo_allocato` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `id_metodo` SMALLINT(5) UNSIGNED NULL,
    `id_mp` TINYINT(3) UNSIGNED NOT NULL,
    `note` TEXT NULL,
    `id_anagrafica_hint` INT UNSIGNED NULL,
    `cliente_nome_hint` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id_pagamento`),
    UNIQUE KEY `uniq_tb_pagamenti_import_uid` (`import_uid`),
    KEY `idx_tb_pagamenti_id_mp` (`id_mp`),
    KEY `idx_tb_pagamenti_id_metodo` (`id_metodo`),
    KEY `idx_tb_pagamenti_cliente_hint` (`id_anagrafica_hint`),
CONSTRAINT `fk_tb_pagamenti_modalita`
  FOREIGN KEY (`id_mp`) REFERENCES `cfg_sdi_modalita_pagamento` (`id_modalita`) ON DELETE RESTRICT
      CONSTRAINT `fk_tb_pagamenti_metodo` FOREIGN KEY (`id_metodo`) REFERENCES `cfg_metodi_pagamento` (`id_metodo`) ON DELETE SET NULL,
    CONSTRAINT `fk_tb_pagamenti_cliente_hint` FOREIGN KEY (`id_anagrafica_hint`) REFERENCES `tb_anagrafiche` (`id_anagrafica`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `appoggio_pagamenti_fattura`
    ADD COLUMN `id_pagamento` INT UNSIGNED NULL AFTER `id_pag_fattura`,
    ADD KEY `idx_apf_pagamento` (`id_pagamento`),
    ADD CONSTRAINT `fk_apf_pagamento` FOREIGN KEY (`id_pagamento`) REFERENCES `tb_pagamenti` (`id_pagamento`) ON DELETE SET NULL;
