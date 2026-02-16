-- Patch: supporto documenti di acquisto (preventivi + fatture) con numerazione separata
-- Data: 2026-02-16

START TRANSACTION;

-- Flag acquisto su preventivi
ALTER TABLE tb_preventivi
  ADD COLUMN is_acquisto TINYINT(1) NOT NULL DEFAULT 0 AFTER id_anagrafica;

ALTER TABLE tb_preventivi_archive
  ADD COLUMN is_acquisto TINYINT(1) NOT NULL DEFAULT 0 AFTER id_anagrafica;

ALTER TABLE tb_preventivi
  DROP INDEX uq_prev_numero,
  ADD UNIQUE KEY uq_prev_numero (anno_preventivo, numero_documento, is_acquisto);

-- Flag acquisto su fatture
ALTER TABLE tb_fatture
  ADD COLUMN is_acquisto TINYINT(1) NOT NULL DEFAULT 0 AFTER id_anagrafica;

ALTER TABLE tb_fatture_archive
  ADD COLUMN is_acquisto TINYINT(1) NOT NULL DEFAULT 0 AFTER id_anagrafica;

ALTER TABLE tb_fatture
  DROP INDEX uq_fatt_numero_sezionale,
  ADD UNIQUE KEY uq_fatt_numero_sezionale (anno, id_sezionale, numero_documento, is_acquisto);

-- Progressivo sezionali separato per acquisti/vendite
ALTER TABLE cfg_sezionali_progress
  ADD COLUMN is_acquisto TINYINT(1) NOT NULL DEFAULT 0 AFTER anno;

ALTER TABLE cfg_sezionali_progress
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (id_sezionale, anno, is_acquisto);

COMMIT;

-- Allinea routine di numerazione (opzionale ma consigliato)
DROP FUNCTION IF EXISTS fn_preview_next_fattura_number;
DELIMITER ;;
CREATE FUNCTION fn_preview_next_fattura_number(
  p_id_sezionale INT,
  p_anno SMALLINT,
  p_is_acquisto TINYINT
) RETURNS int(11)
    READS SQL DATA
BEGIN
  DECLARE v_anno SMALLINT;
  DECLARE v_next INT;
  DECLARE v_from_prog INT;
  DECLARE v_from_docs INT;
  DECLARE v_acq TINYINT;

  SET v_anno = COALESCE(p_anno, YEAR(CURDATE()));
  SET v_acq = COALESCE(p_is_acquisto, 0);

  SELECT next_num INTO v_from_prog
  FROM cfg_sezionali_progress
  WHERE id_sezionale = p_id_sezionale
    AND anno = v_anno
    AND is_acquisto = v_acq;

  SELECT COALESCE(MAX(numero_documento), 0) + 1 INTO v_from_docs
  FROM tb_fatture
  WHERE id_sezionale = p_id_sezionale
    AND anno = v_anno
    AND is_acquisto = v_acq;

  SET v_next = COALESCE(v_from_prog, v_from_docs);
  IF v_next < 1 THEN
    SET v_next = 1;
  END IF;

  RETURN v_next;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_align_sezionali_progress;
DELIMITER ;;
CREATE PROCEDURE sp_align_sezionali_progress(
  IN p_id_sezionale INT,
  IN p_anno SMALLINT,
  IN p_is_acquisto TINYINT
)
BEGIN
  DECLARE v_cur_id INT;
  DECLARE v_cur_anno SMALLINT;
  DECLARE v_cur_acq TINYINT;
  DECLARE v_maxnum INT;
  DECLARE read_done INT DEFAULT 0;

  DECLARE cur CURSOR FOR
    SELECT s.id_sezionale, y.anno, y.is_acquisto
    FROM cfg_sezionali s
    JOIN (
      SELECT DISTINCT anno, is_acquisto FROM tb_fatture
      UNION SELECT DISTINCT anno, is_acquisto FROM cfg_sezionali_progress
    ) y
    WHERE (p_id_sezionale IS NULL OR s.id_sezionale = p_id_sezionale)
      AND (p_anno IS NULL OR y.anno = p_anno)
      AND (p_is_acquisto IS NULL OR y.is_acquisto = p_is_acquisto);

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET read_done = 1;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_cur_id, v_cur_anno, v_cur_acq;
    IF read_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SELECT COALESCE(MAX(numero_documento),0) + 1
    INTO v_maxnum
    FROM tb_fatture
    WHERE id_sezionale = v_cur_id
      AND anno = v_cur_anno
      AND is_acquisto = v_cur_acq;

    INSERT IGNORE INTO cfg_sezionali_progress(id_sezionale, anno, is_acquisto, next_num)
    VALUES (v_cur_id, v_cur_anno, v_cur_acq, v_maxnum);

    UPDATE cfg_sezionali_progress
    SET next_num = v_maxnum
    WHERE id_sezionale = v_cur_id
      AND anno = v_cur_anno
      AND is_acquisto = v_cur_acq;
  END LOOP;
  CLOSE cur;
END ;;
DELIMITER ;
