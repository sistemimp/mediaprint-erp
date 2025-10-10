<?php
declare(strict_types=1);

// Fix per trigger: trg_anagrafica_to_archive
// Usa Database PDO del progetto e ricrea il trigger evitando l'uso illegale di NEW.*

require dirname(__DIR__) . '/vendor/autoload.php';

// Carica .env locale se presente (semplice parser key=value)
$envFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
if (is_file($envFile) && is_readable($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#')) { continue; }
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $k = trim($parts[0]);
            $v = trim($parts[1]);
            // rimuove eventuali apici
            if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
                $v = substr($v, 1, -1);
            }
            if ($k !== '') {
                putenv($k . '=' . $v);
            }
        }
    }
}

use MediaPrint\Backend\Database;

function main(): void {
    $pdo = Database::getConnection();
    $pdo->exec('SET time_zone = "+00:00"');

    $dropSql = 'DROP TRIGGER IF EXISTS trg_anagrafica_to_archive';

    $createSql = <<<'SQL'
CREATE TRIGGER trg_anagrafica_to_archive
AFTER UPDATE ON tb_anagrafiche
FOR EACH ROW
BEGIN
  IF OLD.is_active = 1 AND NEW.is_active = 0 THEN
    SET @__archiver := COALESCE(@archived_by, SUBSTRING_INDEX(CURRENT_USER(), '@', 1));
    SET @__batch := COALESCE(@archive_batch_id, UUID());

    INSERT INTO tb_anagrafiche_archive (
      id_anagrafica,
      id_tipologia,
      id_sdi_regime_fiscale,
      is_pa,
      ragione_sociale,
      piva,
      codice_fiscale,
      note,
      created_at,
      updated_at,
      archived_at,
      archived_by,
      archive_batch_id,
      inactive_since,
      last_document_date,
      archive_note
    ) VALUES (
      NEW.id_anagrafica,
      NEW.id_tipologia,
      NEW.id_sdi_regime_fiscale,
      NEW.is_pa,
      NEW.ragione_sociale,
      NEW.piva,
      NEW.codice_fiscale,
      NEW.note,
      NEW.created_at,
      NEW.updated_at,
      NOW(),
      @__archiver,
      @__batch,
      CURDATE(),
      NULL,
      'Archiviata da trigger disattivazione (is_active=0)'
    );

    INSERT INTO tb_anagrafiche_fiscali_archive (
      id_anagrafica,
      pec,
      codice_sdi,
      iban,
      banca,
      id_cond_pagamento,
      modalita_pagamento,
      giorni_pagamento,
      altri_dati,
      archived_at,
      archived_by,
      archive_batch_id,
      archive_note
    )
    SELECT
      f.id_anagrafica,
      f.pec,
      f.codice_sdi,
      f.iban,
      f.banca,
      f.id_cond_pagamento,
      f.modalita_pagamento,
      f.giorni_pagamento,
      f.altri_dati,
      NOW()                              AS archived_at,
      @__archiver                        AS archived_by,
      @__batch                           AS archive_batch_id,
      'Archivio: anagrafica disattivata' AS archive_note
    FROM tb_anagrafiche_fiscali f
    WHERE f.id_anagrafica = NEW.id_anagrafica
      AND NOT EXISTS (
        SELECT 1 FROM tb_anagrafiche_fiscali_archive fa
        WHERE fa.id_anagrafica = f.id_anagrafica
      );

    INSERT INTO tb_sedi_archive (
      id_sede,
      id_anagrafica,
      id_tipo,
      denominazione,
      indirizzo,
      civico,
      cap,
      comune,
      provincia,
      nazione_iso2,
      telefono,
      email,
      note,
      is_legale,
      is_predefinita,
      created_at,
      updated_at,
      archived_at,
      archived_by,
      archive_batch_id,
      archive_note
    )
    SELECT
      s.id_sede,
      s.id_anagrafica,
      s.id_tipo,
      s.denominazione,
      s.indirizzo,
      s.civico,
      s.cap,
      s.comune,
      s.provincia,
      s.nazione_iso2,
      s.telefono,
      s.email,
      s.note,
      s.is_legale,
      s.is_predefinita,
      s.created_at,
      s.updated_at,
      NOW()                              AS archived_at,
      @__archiver                        AS archived_by,
      @__batch                           AS archive_batch_id,
      'Archivio: anagrafica disattivata' AS archive_note
    FROM tb_sedi s
    WHERE s.id_anagrafica = NEW.id_anagrafica
      AND NOT EXISTS (
        SELECT 1 FROM tb_sedi_archive sa
        WHERE sa.id_sede = s.id_sede
      );

    INSERT INTO tb_sedi_contatti_archive (
      id_contatto,
      id_sede,
      nome,
      ruolo,
      telefono,
      cellulare,
      email,
      is_predefinito,
      created_at,
      updated_at,
      archived_at,
      archived_by,
      archive_batch_id,
      archive_note
    )
    SELECT
      c.id_contatto,
      c.id_sede,
      c.nome,
      c.ruolo,
      c.telefono,
      c.cellulare,
      c.email,
      c.is_predefinito,
      c.created_at,
      c.updated_at,
      NOW()                              AS archived_at,
      @__archiver                        AS archived_by,
      @__batch                           AS archive_batch_id,
      'Archivio: anagrafica disattivata' AS archive_note
    FROM tb_sedi_contatti c
    WHERE c.id_sede IN (
      SELECT s.id_sede FROM tb_sedi s WHERE s.id_anagrafica = NEW.id_anagrafica
    )
      AND NOT EXISTS (
        SELECT 1 FROM tb_sedi_contatti_archive ca
        WHERE ca.id_contatto = c.id_contatto
      );
  END IF;
END
SQL;

    echo "Droppo trigger se esiste...\n";
    $pdo->exec($dropSql);
    echo "Ricreo trigger corretto...\n";
    $pdo->exec($createSql);
    echo "OK: trigger aggiornato.\n";
}

main();
