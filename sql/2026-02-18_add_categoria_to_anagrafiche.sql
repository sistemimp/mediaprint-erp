-- Add categoria field to anagrafiche tables (idempotent)
-- Run this before deploying backend changes that read/write `categoria`.

SET @db := DATABASE();

SET @stmt := IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'tb_anagrafiche'
      AND COLUMN_NAME = 'categoria'
  ),
  'SELECT ''tb_anagrafiche.categoria already exists''',
  'ALTER TABLE tb_anagrafiche ADD COLUMN categoria VARCHAR(120) NULL AFTER is_pa'
);
PREPARE s1 FROM @stmt;
EXECUTE s1;
DEALLOCATE PREPARE s1;

SET @stmt := IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME = 'tb_anagrafiche_archive'
      AND COLUMN_NAME = 'categoria'
  ),
  'SELECT ''tb_anagrafiche_archive.categoria already exists''',
  'ALTER TABLE tb_anagrafiche_archive ADD COLUMN categoria VARCHAR(120) NULL AFTER is_pa'
);
PREPARE s2 FROM @stmt;
EXECUTE s2;
DEALLOCATE PREPARE s2;
