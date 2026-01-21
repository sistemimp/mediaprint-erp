-- Adds the affrancatura reference for shipping authorizations.
ALTER TABLE `cfg_lavorazioni_spedizioni_autorizzazioni`
    ADD COLUMN IF NOT EXISTS `id_affrancatura` INT(10) UNSIGNED DEFAULT NULL AFTER `id_autorizzazione`;

UPDATE cfg_lavorazioni_spedizioni_autorizzazioni AS aut
INNER JOIN cfg_lavorazioni_spedizioni_tariffe AS tr ON aut.id_tariffa = tr.id_tariffa
SET aut.id_affrancatura = tr.id_affrancatura;

ALTER TABLE `cfg_lavorazioni_spedizioni_autorizzazioni`
    MODIFY COLUMN `id_affrancatura` INT(10) UNSIGNED NOT NULL,
    ADD KEY `idx_autorizzazione_affrancatura` (`id_affrancatura`);

ALTER TABLE `cfg_lavorazioni_spedizioni_autorizzazioni`
    ADD CONSTRAINT `fk_autorizzazione_affrancatura_cfg`
        FOREIGN KEY (`id_affrancatura`) REFERENCES `cfg_lavorazioni_spedizioni_affrancature` (`id_affrancatura`)
        ON DELETE CASCADE;
