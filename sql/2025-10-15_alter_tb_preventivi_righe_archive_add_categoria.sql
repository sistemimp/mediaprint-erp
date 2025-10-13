-- Se presente, allinea la tabella archivio delle righe preventivo con il nuovo campo categoria
ALTER TABLE tb_preventivi_righe_archive
  ADD COLUMN id_categoria INT NULL AFTER id_prodotto,
  ADD INDEX idx_prev_arch_righe_idcat (id_categoria);
