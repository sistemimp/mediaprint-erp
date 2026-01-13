START TRANSACTION;

CREATE TABLE IF NOT EXISTS `auth_account_permessi` (
  `id_account` bigint(20) unsigned NOT NULL,
  `id_permesso` smallint(5) unsigned NOT NULL,
  `is_allowed` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_account`,`id_permesso`),
  KEY `fk_ap_permesso` (`id_permesso`),
  CONSTRAINT `fk_ap_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_ap_permesso` FOREIGN KEY (`id_permesso`) REFERENCES `cfg_auth_permessi` (`id_permesso`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TEMPORARY TABLE `tmp_perm_map` (
  `old_code` varchar(64) NOT NULL,
  `new_code` varchar(64) NOT NULL
);

INSERT INTO `tmp_perm_map` (`old_code`, `new_code`) VALUES
  ('anag.view','anag.read'),
  ('anag.edit','anag.write'),
  ('anag.edit','anag.create'),
  ('prev.view','prev.read'),
  ('prev.edit','prev.write'),
  ('prev.edit','prev.create'),
  ('prev.approve','prev.write'),
  ('fatt.view','fatt.read'),
  ('fatt.edit','fatt.write'),
  ('fatt.edit','fatt.create'),
  ('fatt.send_sdi','fatt.write'),
  ('fatt.storno','fatt.write'),
  ('ddt.view','ddt.read'),
  ('ddt.edit','ddt.write'),
  ('ddt.edit','ddt.create'),
  ('pay.view','pay.read'),
  ('pay.edit','pay.write'),
  ('pay.edit','pay.create'),
  ('job.view','job.read'),
  ('job.manage','job.write'),
  ('job.manage','job.create'),
  ('job.assign','job.write'),
  ('job.report','job.read'),
  ('job.analytics','job.read'),
  ('job.admin','job.write'),
  ('contratti.view','contr.read'),
  ('contratti.edit','contr.write'),
  ('contratti.edit','contr.create'),
  ('cfg.view','prod.read'),
  ('cfg.view','pack.read'),
  ('cfg.view','acct.read'),
  ('cfg.edit','prod.write'),
  ('cfg.edit','prod.create'),
  ('cfg.edit','pack.write'),
  ('cfg.edit','pack.create'),
  ('cfg.edit','acct.write'),
  ('cfg.edit','acct.create');

CREATE TEMPORARY TABLE `tmp_role_perms` AS
SELECT rp.id_ruolo, p.code
FROM auth_ruolo_permesso rp
INNER JOIN cfg_auth_permessi p ON p.id_permesso = rp.id_permesso;

CREATE TEMPORARY TABLE `tmp_account_perms` AS
SELECT ap.id_account, p.code, ap.is_allowed
FROM auth_account_permessi ap
INNER JOIN cfg_auth_permessi p ON p.id_permesso = ap.id_permesso;

DELETE FROM auth_account_permessi;
DELETE FROM auth_ruolo_permesso;
DELETE FROM cfg_auth_permessi;

INSERT INTO `cfg_auth_permessi` VALUES
  (1,'prod.read','Prodotti - Leggere',1),
  (2,'prod.write','Prodotti - Scrivere/Modificare',1),
  (3,'prod.create','Prodotti - Creare',1),
  (4,'prod.delete','Prodotti - Eliminare',1),
  (5,'pack.read','Pacchetti - Leggere',1),
  (6,'pack.write','Pacchetti - Scrivere/Modificare',1),
  (7,'pack.create','Pacchetti - Creare',1),
  (8,'pack.delete','Pacchetti - Eliminare',1),
  (9,'contr.read','Contratti - Leggere',1),
  (10,'contr.write','Contratti - Scrivere/Modificare',1),
  (11,'contr.create','Contratti - Creare',1),
  (12,'contr.delete','Contratti - Eliminare',1),
  (13,'anag.read','Anagrafica - Leggere',1),
  (14,'anag.write','Anagrafica - Scrivere/Modificare',1),
  (15,'anag.create','Anagrafica - Creare',1),
  (16,'anag.delete','Anagrafica - Eliminare',1),
  (17,'acct.read','Account - Leggere',1),
  (18,'acct.write','Account - Scrivere/Modificare',1),
  (19,'acct.create','Account - Creare',1),
  (20,'acct.delete','Account - Eliminare',1),
  (21,'prev.read','Preventivi - Leggere',1),
  (22,'prev.write','Preventivi - Scrivere/Modificare',1),
  (23,'prev.create','Preventivi - Creare',1),
  (24,'prev.delete','Preventivi - Eliminare',1),
  (25,'ddt.read','DDT - Leggere',1),
  (26,'ddt.write','DDT - Scrivere/Modificare',1),
  (27,'ddt.create','DDT - Creare',1),
  (28,'ddt.delete','DDT - Eliminare',1),
  (29,'fatt.read','Fatture - Leggere',1),
  (30,'fatt.write','Fatture - Scrivere/Modificare',1),
  (31,'fatt.create','Fatture - Creare',1),
  (32,'fatt.delete','Fatture - Eliminare',1),
  (33,'pay.read','Pagamenti - Leggere',1),
  (34,'pay.write','Pagamenti - Scrivere/Modificare',1),
  (35,'pay.create','Pagamenti - Creare',1),
  (36,'pay.delete','Pagamenti - Eliminare',1),
  (37,'job.read','Lavorazioni - Leggere',1),
  (38,'job.write','Lavorazioni - Scrivere/Modificare',1),
  (39,'job.create','Lavorazioni - Creare',1),
  (40,'job.delete','Lavorazioni - Eliminare',1),
  (41,'msg.read','Messaggi - Leggere',1),
  (42,'msg.write','Messaggi - Scrivere/Modificare',1),
  (43,'msg.create','Messaggi - Creare',1),
  (44,'msg.delete','Messaggi - Eliminare',1);

INSERT INTO auth_ruolo_permesso (id_ruolo, id_permesso)
SELECT DISTINCT r.id_ruolo, p.id_permesso
FROM tmp_role_perms r
INNER JOIN tmp_perm_map m ON m.old_code = r.code
INNER JOIN cfg_auth_permessi p ON p.code = m.new_code;

INSERT IGNORE INTO auth_ruolo_permesso (id_ruolo, id_permesso)
SELECT 1, id_permesso FROM cfg_auth_permessi;

INSERT INTO auth_account_permessi (id_account, id_permesso, is_allowed)
SELECT a.id_account, p.id_permesso, a.is_allowed
FROM tmp_account_perms a
INNER JOIN tmp_perm_map m ON m.old_code = a.code
INNER JOIN cfg_auth_permessi p ON p.code = m.new_code;

COMMIT;
