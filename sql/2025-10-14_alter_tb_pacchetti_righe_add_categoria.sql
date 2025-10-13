-- Aggiunge i campi per memorizzare la categoria del prodotto sulle righe dei pacchetti
ALTER TABLE tb_pacchetti_righe
  ADD COLUMN id_categoria INT NULL AFTER id_prodotto,
  ADD COLUMN categoria_nome VARCHAR(191) NULL AFTER id_categoria;

ALTER TABLE tb_pacchetti_righe
  ADD INDEX idx_pacchetti_righe_id_categoria (id_categoria);
