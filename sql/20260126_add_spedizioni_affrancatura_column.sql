-- Adds the affrancatura reference needed by the lavorazioni shipping detail page.
ALTER TABLE `tb_lavorazioni_spedizioni`
    ADD COLUMN IF NOT EXISTS `id_affrancatura` INT(10) UNSIGNED DEFAULT NULL AFTER `id_operatore_postale`,
    ADD CONSTRAINT `fk_tb_lavorazioni_spedizioni_affrancatura`
        FOREIGN KEY (`id_affrancatura`) REFERENCES `cfg_lavorazioni_spedizioni_affrancature` (`id_affrancatura`)
        ON DELETE SET NULL ON UPDATE CASCADE;
