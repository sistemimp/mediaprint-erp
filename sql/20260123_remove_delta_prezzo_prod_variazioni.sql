-- Rimuove il delta prezzo dalle variazioni prodotto
ALTER TABLE `appoggio_prodotto_variazione`
  DROP COLUMN `delta_prezzo`;
