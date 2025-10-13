-- Aggiunge il riferimento alla categoria del prodotto sulle righe preventivo
ALTER TABLE tb_preventivi_righe
  ADD COLUMN id_categoria INT NULL AFTER id_prodotto,
  ADD INDEX idx_preventivi_righe_id_categoria (id_categoria);
