-- Add Split PAY field to fiscal data tables (idempotent)
-- MySQL/MariaDB safe dynamic checks against information_schema

SET @db := DATABASE();

SET @stmt := IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'tb_anagrafiche_fiscali'
      AND COLUMN_NAME = 'split_pay'
  ),
  'SELECT ''tb_anagrafiche_fiscali.split_pay already exists''',
  'ALTER TABLE tb_anagrafiche_fiscali ADD COLUMN split_pay TINYINT(1) NULL AFTER banca'
);
PREPARE s1 FROM @stmt;
EXECUTE s1;
DEALLOCATE PREPARE s1;

SET @stmt := IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'tb_anagrafiche_fiscali_archive'
      AND COLUMN_NAME = 'split_pay'
  ),
  'SELECT ''tb_anagrafiche_fiscali_archive.split_pay already exists''',
  'ALTER TABLE tb_anagrafiche_fiscali_archive ADD COLUMN split_pay TINYINT(1) NULL AFTER banca'
);
PREPARE s2 FROM @stmt;
EXECUTE s2;
DEALLOCATE PREPARE s2;
