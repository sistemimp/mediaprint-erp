CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_purge_documents`()
BEGIN
    DECLARE read_done BOOLEAN DEFAULT FALSE;
    DECLARE current_table VARCHAR(64);
    DECLARE table_exists BOOLEAN DEFAULT FALSE;
    DECLARE table_cursor CURSOR FOR
        SELECT table_name
        FROM (
            SELECT 'appoggio_preventivo_ddt' AS table_name
            UNION ALL SELECT 'appoggio_preventivo_fattura'
            UNION ALL SELECT 'appoggio_preventivo_fattura_righe'
            UNION ALL SELECT 'tb_preventivi_righe'
            UNION ALL SELECT 'tb_preventivi_righe_archive'
            UNION ALL SELECT 'tb_preventivi_contatti'
            UNION ALL SELECT 'tb_preventivi_contatti_archive'
            UNION ALL SELECT 'tb_preventivi_revisioni'
            UNION ALL SELECT 'tb_preventivi_cig'
            UNION ALL SELECT 'tb_preventivi_determina'
            UNION ALL SELECT 'tb_preventivi_oggetti_map'
            UNION ALL SELECT 'tb_preventivi_archive'
            UNION ALL SELECT 'tb_preventivi'
            UNION ALL SELECT 'tb_lavorazioni_attivita_ced_quantita'
            UNION ALL SELECT 'tb_lavorazioni_attivita'
            UNION ALL SELECT 'tb_lavorazioni_attivita_operatori'
            UNION ALL SELECT 'tb_lavorazioni_attivita_report'
            UNION ALL SELECT 'tb_lavorazioni_eventi'
            UNION ALL SELECT 'tb_lavorazioni_files_downloads'
            UNION ALL SELECT 'tb_lavorazioni_files'
            UNION ALL SELECT 'tb_lavorazioni_notifiche'
            UNION ALL SELECT 'tb_lavorazioni_operatori'
            UNION ALL SELECT 'tb_lavorazioni_spedizioni_postali_righe'
            UNION ALL SELECT 'tb_lavorazioni'
            UNION ALL SELECT 'tb_ddt_righe'
            UNION ALL SELECT 'tb_ddt'
            UNION ALL SELECT 'tb_ddt_archive'
            UNION ALL SELECT 'tb_fatture_righe'
            UNION ALL SELECT 'tb_fatture'
            UNION ALL SELECT 'tb_fatture_archive'
            UNION ALL SELECT 'tb_fatture_status_log'
            UNION ALL SELECT 'tb_fatture_import_log'
        ) AS tables_to_clean;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET read_done = TRUE;

    SET FOREIGN_KEY_CHECKS = 0;
    START TRANSACTION;

    OPEN table_cursor;
    clean_loop: LOOP
        FETCH table_cursor INTO current_table;
        IF read_done THEN
            LEAVE clean_loop;
        END IF;

        SELECT COUNT(*) > 0
        INTO table_exists
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE()
          AND table_name = current_table;

        IF table_exists THEN
            SET @sql = CONCAT('DELETE FROM `', current_table, '`;');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END LOOP;
    CLOSE table_cursor;

    SET read_done = FALSE;
    OPEN table_cursor;
    reset_loop: LOOP
        FETCH table_cursor INTO current_table;
        IF read_done THEN
            LEAVE reset_loop;
        END IF;

        SELECT COUNT(*) > 0
        INTO table_exists
        FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = current_table
          AND extra LIKE '%auto_increment%';

        IF table_exists THEN
            SET @sql = CONCAT('ALTER TABLE `', current_table, '` AUTO_INCREMENT = 1;');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
        
    END LOOP;
    CLOSE table_cursor;


    SET @sql = "UPDATE `cfg_sezionali_progress` SET `next_num` = '0' WHERE 1";
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    SET FOREIGN_KEY_CHECKS = 1;
    COMMIT;
END ;;