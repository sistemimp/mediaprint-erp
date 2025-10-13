<?php
declare(strict_types=1);

// Crea tabella di archivio per le righe dei preventivi e un trigger opzionale
// per archiviare automaticamente le righe alla cancellazione.

require dirname(__DIR__) . '/vendor/autoload.php';

use MediaPrint\Backend\Database;

function tableExists(PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :t LIMIT 1');
    $stmt->bindValue(':t', $table, PDO::PARAM_STR);
    $stmt->execute();
    return $stmt->fetchColumn() !== false;
}

function main(): void {
    $pdo = Database::getConnection();
    $pdo->exec('SET time_zone = "+00:00"');

    // 1) Crea tabella archivio se non esiste
    if (!tableExists($pdo, 'tb_preventivi_righe_archive')) {
        echo "Creo tabella tb_preventivi_righe_archive...\n";
        $sql = <<<'SQL'
CREATE TABLE tb_preventivi_righe_archive (
  id_riga INT NOT NULL,
  id_preventivo INT NOT NULL,
  id_prodotto INT NULL,
  descrizione VARCHAR(1024) NOT NULL,
  quantita DECIMAL(18,6) NOT NULL DEFAULT 1,
  prezzo_unitario DECIMAL(18,6) NOT NULL DEFAULT 0,
  sconto DECIMAL(18,6) NULL,
  importo_scontato DECIMAL(18,6) NULL,
  iva DECIMAL(5,2) NULL,
  id_sdi_natura_iva INT NULL,
  totale DECIMAL(18,6) NULL,
  posizione INT NULL,
  archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_riga),
  KEY idx_prev_arch_righe_idprev (id_preventivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;
        $pdo->exec($sql);
        echo "OK\n";
    } else {
        echo "Tabella tb_preventivi_righe_archive già presente.\n";
    }

    // 2) Crea trigger AFTER DELETE su tb_preventivi_righe per archiviazione automatica
    echo "(Ri)creo trigger trg_preventivi_righe_to_archive...\n";
    $pdo->exec('DROP TRIGGER IF EXISTS trg_preventivi_righe_to_archive');
    $trigger = <<<'SQL'
CREATE TRIGGER trg_preventivi_righe_to_archive
AFTER DELETE ON tb_preventivi_righe
FOR EACH ROW
BEGIN
  INSERT INTO tb_preventivi_righe_archive (
    id_riga, id_preventivo, id_prodotto, descrizione, quantita, prezzo_unitario,
    sconto, importo_scontato, iva, id_sdi_natura_iva, totale, posizione, archived_at
  )
  SELECT
    OLD.id_riga, OLD.id_preventivo, OLD.id_prodotto, OLD.descrizione, OLD.quantita, OLD.prezzo_unitario,
    OLD.sconto, OLD.importo_scontato, OLD.iva, OLD.id_sdi_natura_iva, OLD.totale, OLD.posizione, NOW()
  FROM DUAL
  WHERE NOT EXISTS (
    SELECT 1 FROM tb_preventivi_righe_archive a WHERE a.id_riga = OLD.id_riga
  );
END
SQL;
    $pdo->exec($trigger);
    echo "OK: trigger creato.\n";
}

main();

