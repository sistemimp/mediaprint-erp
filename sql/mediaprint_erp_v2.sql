/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: prova
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-ubu2004

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Sequence structure for `seq_tb_audit_log`
--

DROP SEQUENCE IF EXISTS `seq_tb_audit_log`;
CREATE SEQUENCE `seq_tb_audit_log` start with 1 minvalue 1 maxvalue 9223372036854775806 increment by 1 cache 1000 nocycle;
DO SETVAL(`seq_tb_audit_log`, 1, 0);

--
-- Table structure for table `appoggio_ddt_fattura`
--

DROP TABLE IF EXISTS `appoggio_ddt_fattura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `appoggio_ddt_fattura` (
  `id_ddt` int(10) unsigned NOT NULL,
  `id_fattura` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id_ddt`,`id_fattura`),
  KEY `idx_adf_fatt` (`id_fattura`),
  CONSTRAINT `fk_adf_ddt` FOREIGN KEY (`id_ddt`) REFERENCES `tb_ddt` (`id_ddt`) ON DELETE CASCADE,
  CONSTRAINT `fk_adf_fatt` FOREIGN KEY (`id_fattura`) REFERENCES `tb_fatture` (`id_fattura`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appoggio_ddt_fattura`
--

LOCK TABLES `appoggio_ddt_fattura` WRITE;
/*!40000 ALTER TABLE `appoggio_ddt_fattura` DISABLE KEYS */;
/*!40000 ALTER TABLE `appoggio_ddt_fattura` ENABLE KEYS */;
UNLOCK TABLES;
--
-- Table structure for table `auth_account_mfa_sessions`
--

DROP TABLE IF EXISTS `auth_account_mfa_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_account_mfa_sessions` (
  `id_session` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_account` bigint(20) unsigned NOT NULL,
  `token` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_session`),
  UNIQUE KEY `idx_mfa_sessions_token` (`token`),
  KEY `idx_mfa_sessions_account` (`id_account`),
  CONSTRAINT `fk_mfa_sessions_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `auth_account_passkeys`
--

DROP TABLE IF EXISTS `auth_account_passkeys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_account_passkeys` (
  `id_passkey` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_account` bigint(20) unsigned NOT NULL,
  `credential_id` varbinary(256) NOT NULL,
  `public_key` varbinary(1024) NOT NULL,
  `transports` varchar(255) DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `sign_count` int unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_passkey`),
  UNIQUE KEY `idx_passkeys_account_credential` (`id_account`, `credential_id`),
  KEY `idx_passkeys_account` (`id_account`),
  CONSTRAINT `fk_passkeys_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ai_adf_recalc
AFTER INSERT ON appoggio_ddt_fattura
FOR EACH ROW
BEGIN
  CALL sp_on_ddt_fattura_link_changed(NEW.id_fattura);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ad_adf_recalc
AFTER DELETE ON appoggio_ddt_fattura
FOR EACH ROW
BEGIN
  CALL sp_on_ddt_fattura_link_changed(OLD.id_fattura);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `appoggio_pagamenti_fattura`
--

DROP TABLE IF EXISTS `appoggio_pagamenti_fattura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `appoggio_pagamenti_fattura` (
  `id_pag_fattura` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_pagamento` int(10) unsigned DEFAULT NULL,
  `id_fattura` int(10) unsigned DEFAULT NULL,
  `id_metodo` smallint(5) unsigned DEFAULT NULL,
  `data_pagamento` date DEFAULT NULL,
  `importo` decimal(12,2) DEFAULT NULL,
  `importo_documento` decimal(12,2) DEFAULT NULL,
  `import_uid` varchar(64) DEFAULT NULL,
  `id_mp` smallint(5) unsigned DEFAULT NULL,
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id_pag_fattura`),
  KEY `idx_app_pf_fatt` (`id_fattura`),
  KEY `idx_apf_import_uid` (`import_uid`),
  KEY `fk_apf_metodo` (`id_metodo`),
  KEY `idx_apf_pagamento` (`id_pagamento`),
  CONSTRAINT `fk_apf_fatt` FOREIGN KEY (`id_fattura`) REFERENCES `tb_fatture` (`id_fattura`) ON DELETE CASCADE,
  CONSTRAINT `fk_apf_metodo` FOREIGN KEY (`id_metodo`) REFERENCES `cfg_metodi_pagamento` (`id_metodo`) ON DELETE SET NULL,
  CONSTRAINT `fk_apf_pagamento` FOREIGN KEY (`id_pagamento`) REFERENCES `tb_pagamenti` (`id_pagamento`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appoggio_pagamenti_fattura`
--

LOCK TABLES `appoggio_pagamenti_fattura` WRITE;
/*!40000 ALTER TABLE `appoggio_pagamenti_fattura` DISABLE KEYS */;
INSERT INTO `appoggio_pagamenti_fattura` VALUES
(2,6,3,NULL,'2025-05-06',1.51,377.06,'b6dad59d9b455a73',3,'Rif: BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA  SUOLO E SALUTE SRL PER  PAG. FT. N. 243 DEL 20 05 2025 COMM              0,00 SPESE              0,00 TRN 1001251564002485'),
(3,6,2,NULL,'2025-05-06',1.40,377.06,'b6dad59d9b455a73',3,'Rif: BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA  SUOLO E SALUTE SRL PER  PAG. FT. N. 243 DEL 20 05 2025 COMM              0,00 SPESE              0,00 TRN 1001251564002485'),
(4,6,2,NULL,'2025-05-06',0.11,377.06,'b6dad59d9b455a73',3,'Rif: BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA  SUOLO E SALUTE SRL PER  PAG. FT. N. 243 DEL 20 05 2025 COMM              0,00 SPESE              0,00 TRN 1001251564002485');
/*!40000 ALTER TABLE `appoggio_pagamenti_fattura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appoggio_preventivo_ddt`
--

DROP TABLE IF EXISTS `appoggio_preventivo_ddt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `appoggio_preventivo_ddt` (
  `id_preventivo` int(10) unsigned NOT NULL,
  `id_ddt` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id_preventivo`,`id_ddt`),
  KEY `idx_app_prevddt_prev` (`id_preventivo`),
  KEY `idx_app_prevddt_ddt` (`id_ddt`),
  CONSTRAINT `fk_app_prevddt_ddt` FOREIGN KEY (`id_ddt`) REFERENCES `tb_ddt` (`id_ddt`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_prevddt_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appoggio_preventivo_ddt`
--

LOCK TABLES `appoggio_preventivo_ddt` WRITE;
/*!40000 ALTER TABLE `appoggio_preventivo_ddt` DISABLE KEYS */;
INSERT INTO `appoggio_preventivo_ddt` VALUES
(1,1),
(1,2),
(2,3);
/*!40000 ALTER TABLE `appoggio_preventivo_ddt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appoggio_preventivo_fattura`
--

DROP TABLE IF EXISTS `appoggio_preventivo_fattura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `appoggio_preventivo_fattura` (
  `id_preventivo` int(10) unsigned NOT NULL,
  `id_fattura` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id_preventivo`,`id_fattura`),
  KEY `idx_app_prevfat_prev` (`id_preventivo`),
  KEY `idx_app_prevfat_fatt` (`id_fattura`),
  CONSTRAINT `fk_app_prevfat_fatt` FOREIGN KEY (`id_fattura`) REFERENCES `tb_fatture` (`id_fattura`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_prevfat_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appoggio_preventivo_fattura`
--

LOCK TABLES `appoggio_preventivo_fattura` WRITE;
/*!40000 ALTER TABLE `appoggio_preventivo_fattura` DISABLE KEYS */;
INSERT INTO `appoggio_preventivo_fattura` VALUES
(1,2),
(1,3);
/*!40000 ALTER TABLE `appoggio_preventivo_fattura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appoggio_prodotto_variazione`
--

DROP TABLE IF EXISTS `appoggio_prodotto_variazione`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `appoggio_prodotto_variazione` (
  `id_prodotto` int(10) unsigned NOT NULL,
  `id_variazione` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id_prodotto`,`id_variazione`),
  KEY `idx_pv_var` (`id_variazione`),
  CONSTRAINT `fk_pv_prod` FOREIGN KEY (`id_prodotto`) REFERENCES `tb_prodotti` (`id_prodotto`) ON DELETE CASCADE,
  CONSTRAINT `fk_pv_var` FOREIGN KEY (`id_variazione`) REFERENCES `tb_variazioni` (`id_variazione`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appoggio_prodotto_variazione`
--

LOCK TABLES `appoggio_prodotto_variazione` WRITE;
/*!40000 ALTER TABLE `appoggio_prodotto_variazione` DISABLE KEYS */;
INSERT INTO `appoggio_prodotto_variazione` VALUES
(6,40),
(6,41),
(6,42),
(8,47),
(8,48),
(8,49),
(11,1),
(11,2),
(11,3),
(11,4),
(11,5),
(11,6),
(11,7),
(11,20),
(11,21),
(11,22),
(11,23),
(11,24),
(12,1),
(12,2),
(12,5),
(12,6),
(12,7),
(12,20),
(12,21),
(12,22),
(12,23),
(12,24),
(13,11),
(13,12),
(13,13),
(13,14),
(14,1),
(14,2),
(14,8),
(14,9),
(14,10),
(14,20),
(14,21),
(14,22),
(14,23),
(14,24),
(15,1),
(15,2),
(15,3),
(15,4),
(15,20),
(15,21),
(15,22),
(15,23),
(15,24),
(16,11),
(16,12),
(16,13),
(16,14),
(17,1),
(17,2),
(18,1),
(18,2),
(19,11),
(19,12),
(19,13),
(19,14),
(19,31),
(19,32),
(19,33),
(19,43),
(19,44),
(19,45),
(19,46),
(20,1),
(20,2),
(20,8),
(20,9),
(20,10),
(21,1),
(21,2),
(21,20),
(21,21),
(21,22),
(21,23),
(21,24),
(36,11),
(36,12),
(36,13),
(36,14),
(36,31),
(36,32),
(36,33);
/*!40000 ALTER TABLE `appoggio_prodotto_variazione` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_account_contatti`
--

DROP TABLE IF EXISTS `auth_account_contatti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_account_contatti` (
  `id_account` bigint(20) unsigned NOT NULL,
  `id_contatto` bigint(20) unsigned NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_account`,`id_contatto`),
  KEY `idx_aac_contatto` (`id_contatto`),
  CONSTRAINT `fk_aac_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_aac_contatto` FOREIGN KEY (`id_contatto`) REFERENCES `tb_sedi_contatti` (`id_contatto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_account_contatti`
--

LOCK TABLES `auth_account_contatti` WRITE;
/*!40000 ALTER TABLE `auth_account_contatti` DISABLE KEYS */;
INSERT INTO `auth_account_contatti` VALUES
(1,1618,1,'2025-12-29 17:11:00'),
(7,1618,1,'2026-01-13 17:16:52'),
(7,1619,0,'2026-01-13 17:16:52');
/*!40000 ALTER TABLE `auth_account_contatti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_account_email_log`
--

DROP TABLE IF EXISTS `auth_account_email_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_account_email_log` (
  `id_log` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_account` bigint(20) unsigned NOT NULL,
  `email` varchar(160) NOT NULL,
  `email_type` varchar(40) NOT NULL,
  `id_temp` bigint(20) unsigned DEFAULT NULL,
  `sent_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_log`),
  KEY `idx_email_account` (`id_account`),
  KEY `idx_email_temp` (`id_temp`),
  CONSTRAINT `fk_email_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_temp` FOREIGN KEY (`id_temp`) REFERENCES `auth_account_temp_passwords` (`id_temp`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_account_email_log`
--

LOCK TABLES `auth_account_email_log` WRITE;
/*!40000 ALTER TABLE `auth_account_email_log` DISABLE KEYS */;
INSERT INTO `auth_account_email_log` VALUES
(1,8,'giampiero.z@postanetwork.it','welcome',1,'2025-12-30 16:22:21'),
(2,8,'giampiero.z@postanetwork.it','welcome',1,'2025-12-30 16:22:46');
/*!40000 ALTER TABLE `auth_account_email_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_account_permessi`
--

DROP TABLE IF EXISTS `auth_account_permessi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_account_permessi` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_account_permessi`
--

LOCK TABLES `auth_account_permessi` WRITE;
/*!40000 ALTER TABLE `auth_account_permessi` DISABLE KEYS */;
INSERT INTO `auth_account_permessi` VALUES
(7,1,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,2,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,3,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,4,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,5,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,6,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,7,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,8,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,9,1,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,10,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,11,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,12,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,13,1,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,14,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,15,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,16,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,17,1,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,18,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,19,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,20,0,'2025-12-30 15:02:45','2025-12-30 15:02:45'),
(7,21,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,22,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,23,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,24,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,25,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,26,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,27,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,28,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,29,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,30,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,31,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,32,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,33,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,34,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,35,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,36,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,37,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,38,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,39,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,40,0,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,41,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,42,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,43,1,'2025-12-30 15:02:46','2025-12-30 15:02:46'),
(7,44,1,'2025-12-30 15:02:46','2025-12-30 15:02:46');
/*!40000 ALTER TABLE `auth_account_permessi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_account_ruoli`
--

DROP TABLE IF EXISTS `auth_account_ruoli`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_account_ruoli` (
  `id_account` bigint(20) unsigned NOT NULL,
  `id_ruolo` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id_account`,`id_ruolo`),
  KEY `fk_ar_ruolo` (`id_ruolo`),
  CONSTRAINT `fk_ar_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_ar_ruolo` FOREIGN KEY (`id_ruolo`) REFERENCES `cfg_auth_ruoli` (`id_ruolo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_account_ruoli`
--

LOCK TABLES `auth_account_ruoli` WRITE;
/*!40000 ALTER TABLE `auth_account_ruoli` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_account_ruoli` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_account_temp_passwords`
--

DROP TABLE IF EXISTS `auth_account_temp_passwords`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_account_temp_passwords` (
  `id_temp` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_account` bigint(20) unsigned NOT NULL,
  `temp_password` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_temp`),
  KEY `idx_temp_account` (`id_account`),
  CONSTRAINT `fk_temp_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_account_temp_passwords`
--

LOCK TABLES `auth_account_temp_passwords` WRITE;
/*!40000 ALTER TABLE `auth_account_temp_passwords` DISABLE KEYS */;
INSERT INTO `auth_account_temp_passwords` VALUES
(1,8,'WUf5K5YLrWHW','2026-01-01 16:22:20',NULL,'2025-12-30 16:22:20');
/*!40000 ALTER TABLE `auth_account_temp_passwords` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_accounts`
--

DROP TABLE IF EXISTS `auth_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_accounts` (
  `id_account` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `account_type` enum('operatore','cliente') NOT NULL,
  `username` varchar(80) NOT NULL,
  `email` varchar(160) DEFAULT NULL,
  `password_hash` varchar(100) NOT NULL,
  `id_ruolo` tinyint(3) unsigned NOT NULL DEFAULT 3,
  `id_contatto` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `must_change_pwd` tinyint(1) NOT NULL DEFAULT 0,
  `has_mfa` tinyint(1) NOT NULL DEFAULT 0,
  `mfa_secret` varchar(128) DEFAULT NULL,
  `mfa_method` enum('none','otp','passkey','both') NOT NULL DEFAULT 'none',
  `avatar_path` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_account`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_auth_ruolo` (`id_ruolo`),
  KEY `fk_auth_contatto` (`id_contatto`),
  CONSTRAINT `fk_auth_contatto` FOREIGN KEY (`id_contatto`) REFERENCES `tb_sedi_contatti` (`id_contatto`) ON DELETE SET NULL,
  CONSTRAINT `fk_auth_ruolo` FOREIGN KEY (`id_ruolo`) REFERENCES `cfg_auth_ruoli` (`id_ruolo`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_accounts`
--

LOCK TABLES `auth_accounts` WRITE;
/*!40000 ALTER TABLE `auth_accounts` DISABLE KEYS */;
INSERT INTO `auth_accounts` VALUES
(1,'operatore','Alex Olivieri','alex.o@mediaprint.it','$2y$10$JkB3w1sOK6qwNJ2MJRSJeubmFPXJ5p7swDshAcocO/.jTQ0XtTNDW',1,NULL,1,0,0,NULL,'none','avatars/1/avatar_6952b140b4272122542101.jpg','2026-01-22 10:41:50','2025-10-01 10:41:38','2026-01-22 10:41:50'),
(2,'operatore','Simona Cappelletti','simona.c@mediaprint.it','$2y$10$GGynM5njfCwd7S6oCjP3geZr.ipXkLAOKvDBuhOzUPBuinxtIEASi',2,NULL,1,0,0,NULL,'none',NULL,'2025-12-29 14:47:55','2025-10-15 16:18:53','2025-12-29 14:47:55'),
(7,'cliente','ClienteMediaprint','nexus.olivieri@gmail.com','$2y$10$tDJ/Nl2nDqbHrhifKB/ZRuvVKKSK9PfvyD40evWzfMesqS0lJkZDa',3,1618,1,0,0,NULL,'none','avatars/7/avatar_6953bd9be26df9.60398937.jpg','2026-01-13 17:17:08','2025-12-29 17:19:00','2026-01-13 17:17:08'),
(8,'operatore','Giampiero Zippilli','giampiero.z@postanetwork.it','$2y$10$eXt5TT2oKZp/HddpROAHOud2YbazRdngnkSJGfeKFYa2FIkGfYy/S',1,NULL,1,1,0,NULL,'none',NULL,'2025-12-30 16:24:01','2025-12-30 15:31:41','2025-12-30 16:24:01'),
(9,'operatore','Daniele Sciarretta','daniele@mediaprint.it','$2y$10$TT6YOxKZcJTVQSFwcqzvAeXFMgr54p2HIRULil28DefMFslps2jDK',1,NULL,1,1,0,NULL,'none',NULL,NULL,'2026-01-13 17:04:21','2026-01-13 17:04:21');
/*!40000 ALTER TABLE `auth_accounts` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_auth_accounts_guard
BEFORE INSERT ON auth_accounts
FOR EACH ROW
BEGIN
  IF NEW.account_type='operatore' THEN
    SET NEW.id_contatto = NULL;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_auth_accounts_guard
BEFORE UPDATE ON auth_accounts
FOR EACH ROW
BEGIN
  IF NEW.account_type='operatore' THEN
    SET NEW.id_contatto = NULL;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `auth_password_reset`
--

DROP TABLE IF EXISTS `auth_password_reset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_password_reset` (
  `id_reset` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_account` bigint(20) unsigned NOT NULL,
  `token` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_reset`),
  UNIQUE KEY `token` (`token`),
  KEY `fk_reset_account` (`id_account`),
  CONSTRAINT `fk_reset_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_password_reset`
--

LOCK TABLES `auth_password_reset` WRITE;
/*!40000 ALTER TABLE `auth_password_reset` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_password_reset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_ruolo_permesso`
--

DROP TABLE IF EXISTS `auth_ruolo_permesso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_ruolo_permesso` (
  `id_ruolo` tinyint(3) unsigned NOT NULL,
  `id_permesso` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`id_ruolo`,`id_permesso`),
  KEY `fk_rp_permesso` (`id_permesso`),
  CONSTRAINT `fk_rp_permesso` FOREIGN KEY (`id_permesso`) REFERENCES `cfg_auth_permessi` (`id_permesso`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_ruolo` FOREIGN KEY (`id_ruolo`) REFERENCES `cfg_auth_ruoli` (`id_ruolo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_ruolo_permesso`
--

LOCK TABLES `auth_ruolo_permesso` WRITE;
/*!40000 ALTER TABLE `auth_ruolo_permesso` DISABLE KEYS */;
INSERT INTO `auth_ruolo_permesso` VALUES
(1,1),
(1,2),
(1,3),
(1,4),
(1,5),
(1,6),
(1,7),
(1,8),
(1,9),
(1,10),
(1,11),
(1,12),
(1,13),
(1,14),
(1,15),
(1,16),
(1,17),
(1,18),
(1,19),
(1,20),
(1,21),
(1,22),
(1,23),
(1,24),
(1,25),
(1,26),
(1,27),
(1,28),
(1,29),
(1,30),
(1,31),
(1,32),
(1,33),
(1,34),
(1,35),
(1,36),
(1,37),
(1,38),
(1,39),
(1,40),
(1,41),
(1,42),
(1,43),
(1,44);
/*!40000 ALTER TABLE `auth_ruolo_permesso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_auth_permessi`
--

DROP TABLE IF EXISTS `cfg_auth_permessi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_auth_permessi` (
  `id_permesso` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `label` varchar(128) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_permesso`),
  UNIQUE KEY `uq_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_auth_permessi`
--

LOCK TABLES `cfg_auth_permessi` WRITE;
/*!40000 ALTER TABLE `cfg_auth_permessi` DISABLE KEYS */;
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
/*!40000 ALTER TABLE `cfg_auth_permessi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_auth_ruoli`
--

DROP TABLE IF EXISTS `cfg_auth_ruoli`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_auth_ruoli` (
  `id_ruolo` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_ruolo`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_auth_ruoli`
--

LOCK TABLES `cfg_auth_ruoli` WRITE;
/*!40000 ALTER TABLE `cfg_auth_ruoli` DISABLE KEYS */;
INSERT INTO `cfg_auth_ruoli` VALUES
(1,'admin','Amministratore',1),
(2,'operatore','Operatore interno',1),
(3,'cliente','Cliente',1);
/*!40000 ALTER TABLE `cfg_auth_ruoli` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_causali_ddt`
--

DROP TABLE IF EXISTS `cfg_causali_ddt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_causali_ddt` (
  `id_causale` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_causale`),
  UNIQUE KEY `uq_caus_ddt_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_causali_ddt`
--

LOCK TABLES `cfg_causali_ddt` WRITE;
/*!40000 ALTER TABLE `cfg_causali_ddt` DISABLE KEYS */;
INSERT INTO `cfg_causali_ddt` VALUES
(1,'vendita','Vendita',1),
(2,'campionario','Campionario',1),
(3,'conto_lavoro','Conto lavoro',1),
(4,'conto_visiona','Conto visione',1),
(5,'reso','Reso',1);
/*!40000 ALTER TABLE `cfg_causali_ddt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_destinazioni_merce`
--

DROP TABLE IF EXISTS `cfg_destinazioni_merce`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_destinazioni_merce` (
  `id_destinazione` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(150) NOT NULL,
  `indirizzo` varchar(255) DEFAULT NULL,
  `cap` varchar(20) DEFAULT NULL,
  `comune` varchar(100) DEFAULT NULL,
  `provincia` varchar(50) DEFAULT NULL,
  `nazione_iso2` varchar(2) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_destinazione`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_destinazioni_merce`
--

LOCK TABLES `cfg_destinazioni_merce` WRITE;
/*!40000 ALTER TABLE `cfg_destinazioni_merce` DISABLE KEYS */;
INSERT INTO `cfg_destinazioni_merce` VALUES
(1,'Poste Italiane - Ascoli Piceno','Centro Operativo Zona Industriale Marino del Tronto','63100','ASCOLI PICENO','AP','IT',NULL,1,'2025-11-21 11:16:20','2025-11-21 11:16:20');
/*!40000 ALTER TABLE `cfg_destinazioni_merce` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_iva`
--

DROP TABLE IF EXISTS `cfg_iva`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_iva` (
  `id_iva` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(16) NOT NULL,
  `percento` decimal(5,2) NOT NULL,
  `descrizione` varchar(160) DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_iva`),
  UNIQUE KEY `uq_iva_code` (`code`),
  KEY `idx_iva_percento` (`percento`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_iva`
--

LOCK TABLES `cfg_iva` WRITE;
/*!40000 ALTER TABLE `cfg_iva` DISABLE KEYS */;
INSERT INTO `cfg_iva` VALUES
(1,'IVA22',22.00,'Aliquota 22%',1),
(2,'IVA10',10.00,'Aliquota 10%',1),
(3,'IVA4',4.00,'Aliquota 4%',1),
(4,'ESENTE',0.00,'Esente/Non imponibile',1);
/*!40000 ALTER TABLE `cfg_iva` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_lavorazioni_attivita_template`
--

DROP TABLE IF EXISTS `cfg_lavorazioni_attivita_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_lavorazioni_attivita_template` (
  `id_template` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `titolo` varchar(191) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `priorita` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `id_reparto` smallint(5) unsigned DEFAULT NULL,
  `durata_predefinita_giorni` smallint(5) unsigned DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `ordering` smallint(5) unsigned DEFAULT 100,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_template`),
  KEY `idx_template_attivo` (`attivo`),
  KEY `idx_template_reparto` (`id_reparto`),
  CONSTRAINT `fk_template_reparto` FOREIGN KEY (`id_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_attivita_template`
--

LOCK TABLES `cfg_lavorazioni_attivita_template` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_attivita_template` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_attivita_template` VALUES
(1,'Elaborazione','Predisposizione file grafici per la commessa','medium',1,1,1,10,'2025-11-26 12:22:35','2025-12-22 11:10:30'),
(2,'Stampa','Produzione in reparto stampa','medium',2,1,1,20,'2025-11-26 12:22:35','2025-12-22 11:10:11'),
(3,'Imbustamento','Preparazione e imbustamento del materiale','medium',2,1,1,30,'2025-11-26 12:22:35','2025-12-22 11:10:13'),
(4,'Spedizione','Preparazione e consegna del materiale','medium',2,1,1,40,'2025-12-22 11:07:53','2025-12-22 11:10:15');
/*!40000 ALTER TABLE `cfg_lavorazioni_attivita_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_lavorazioni_spedizioni_affrancature`
--

DROP TABLE IF EXISTS `cfg_lavorazioni_spedizioni_affrancature`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_lavorazioni_spedizioni_affrancature` (
  `id_affrancatura` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_operatore_postale` int(10) unsigned NOT NULL,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `ordering` smallint(5) unsigned NOT NULL DEFAULT 100,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_affrancatura`),
  UNIQUE KEY `uq_affrancatura_code` (`code`),
  KEY `idx_affrancatura_operatore` (`id_operatore_postale`),
  CONSTRAINT `fk_affrancatura_operatore` FOREIGN KEY (`id_operatore_postale`) REFERENCES `cfg_lavorazioni_spedizioni_operatori_postali` (`id_operatore_postale`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_affrancature`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_affrancature` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_affrancature` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_spedizioni_affrancature` VALUES
(7,1,'PT-AR','Raccomandata A/R',NULL,1,100,'2026-01-21 09:52:30','2026-01-21 09:52:30'),
(8,1,'PT-AG','Atto Giudiziario',NULL,1,100,'2026-01-21 09:52:46','2026-01-21 09:52:46'),
(9,1,'PT-PM','Posta Massiva',NULL,1,100,'2026-01-21 09:54:10','2026-01-21 09:54:10'),
(10,1,'PT-PT','Posta Target',NULL,1,100,'2026-01-21 09:54:10','2026-01-21 09:54:10'),
(11,1,'PT-PL','Posta Light',NULL,1,100,'2026-01-21 09:54:10','2026-01-21 09:54:10'),
(12,1,'PT-PE','Periodico',NULL,1,100,'2026-01-21 09:54:10','2026-01-21 09:54:10'),
(13,1,'PT-P4','Posta 4',NULL,1,100,'2026-01-21 09:54:10','2026-01-21 09:54:10'),
(14,2,'PN-M','Posta Massiva',NULL,1,100,'2026-01-21 09:54:53','2026-01-21 09:54:53'),
(15,2,'PN-P','Posta Pubblicitaria',NULL,1,100,'2026-01-21 09:56:04','2026-01-21 09:56:04'),
(16,2,'PN-AR','Raccomandata A/R',NULL,1,100,'2026-01-21 09:56:04','2026-01-21 09:56:04'),
(17,2,'PN-AG','Atti Giudiziari - Messo Notificatore Speciale',NULL,1,100,'2026-01-21 09:56:04','2026-01-21 09:56:04'),
(18,3,'D-PEC','Invio PEC',NULL,1,100,'2026-01-21 09:56:44','2026-01-21 09:56:44'),
(19,3,'D-E','Invio Email',NULL,1,100,'2026-01-21 09:58:32','2026-01-21 09:58:32'),
(20,3,'D-ENR','Invio Email No-Reply',NULL,1,100,'2026-01-21 09:58:32','2026-01-21 09:58:32'),
(21,3,'D-PDF','PDF per singolo invio',NULL,1,100,'2026-01-21 09:58:32','2026-01-21 09:58:32'),
(22,3,'D-SMS','Invio SMS',NULL,1,100,'2026-01-21 09:58:32','2026-01-21 09:58:32');
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_affrancature` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_lavorazioni_spedizioni_autorizzazioni`
--

DROP TABLE IF EXISTS `cfg_lavorazioni_spedizioni_autorizzazioni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_lavorazioni_spedizioni_autorizzazioni` (
  `id_autorizzazione` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_affrancatura` int(10) unsigned NOT NULL,
  `id_tariffa` int(10) unsigned DEFAULT NULL,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `ordering` smallint(5) unsigned NOT NULL DEFAULT 100,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_autorizzazione`),
  UNIQUE KEY `uq_autorizzazione_code` (`code`),
  KEY `idx_autorizzazione_affrancatura` (`id_affrancatura`),
  KEY `fk_autorizzazione_tariffa_cfg` (`id_tariffa`),
  CONSTRAINT `fk_autorizzazione_affrancatura_cfg` FOREIGN KEY (`id_affrancatura`) REFERENCES `cfg_lavorazioni_spedizioni_affrancature` (`id_affrancatura`) ON DELETE CASCADE,
  CONSTRAINT `fk_autorizzazione_tariffa_cfg` FOREIGN KEY (`id_tariffa`) REFERENCES `cfg_lavorazioni_spedizioni_tariffe` (`id_tariffa`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_autorizzazioni`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_autorizzazioni` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_autorizzazioni` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_spedizioni_autorizzazioni` VALUES
(11,9,NULL,'DCOOS2065','Mediaprint - DCOOS2065',NULL,1,100,'2026-01-21 10:24:01','2026-01-21 10:38:55'),
(12,7,NULL,'DCOCC0015','Mediaprint - DCOCC0015',NULL,1,100,'2026-01-21 10:24:26','2026-01-21 10:38:03'),
(13,8,NULL,'DCOPD1063','Mediaprint - DCOPD1063',NULL,1,100,'2026-01-21 10:39:56','2026-01-21 10:39:56');
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_autorizzazioni` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_lavorazioni_spedizioni_operatori_postali`
--

DROP TABLE IF EXISTS `cfg_lavorazioni_spedizioni_operatori_postali`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_lavorazioni_spedizioni_operatori_postali` (
  `id_operatore_postale` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `ordering` smallint(5) unsigned NOT NULL DEFAULT 100,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_operatore_postale`),
  UNIQUE KEY `uq_operatore_code` (`code`),
  KEY `idx_operatore_attivo` (`attivo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_operatori_postali`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_operatori_postali` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_operatori_postali` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_spedizioni_operatori_postali` VALUES
(1,'PT','Poste Italiane',NULL,1,100,'2026-01-21 09:50:54','2026-01-21 09:50:54'),
(2,'PN','Posta Network',NULL,1,100,'2026-01-21 09:50:54','2026-01-21 09:50:54'),
(3,'D','Digitale',NULL,1,100,'2026-01-21 09:51:25','2026-01-21 09:51:25'),
(4,'PP','Posta Privata',NULL,1,100,'2026-01-21 09:51:25','2026-01-21 09:51:25');
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_operatori_postali` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_lavorazioni_spedizioni_porti`
--

DROP TABLE IF EXISTS `cfg_lavorazioni_spedizioni_porti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_lavorazioni_spedizioni_porti` (
  `id_porto_destinazione` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_autorizzazione` int(10) unsigned NOT NULL,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `ordering` smallint(5) unsigned NOT NULL DEFAULT 100,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_porto_destinazione`),
  UNIQUE KEY `uq_porto_code` (`code`),
  KEY `idx_porto_autorizzazione` (`id_autorizzazione`),
  CONSTRAINT `fk_porto_autorizzazione` FOREIGN KEY (`id_autorizzazione`) REFERENCES `cfg_lavorazioni_spedizioni_autorizzazioni` (`id_autorizzazione`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_porti`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_porti` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_porti` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_spedizioni_porti` VALUES
(5,12,'MP-AR-AP','Ascoli Piceno',NULL,1,100,'2026-01-21 10:41:30','2026-01-21 10:41:30'),
(6,12,'MP-AR-PE','Pescara',NULL,1,100,'2026-01-21 10:41:30','2026-01-21 10:41:30'),
(7,11,'MP-PM-AP','Ascoli Piceno',NULL,1,100,'2026-01-21 10:42:27','2026-01-21 10:42:27'),
(8,11,'MP-PM-PE','Pescara',NULL,1,100,'2026-01-21 10:42:27','2026-01-21 10:42:27'),
(9,13,'MP-AG-AP','Ascoli Piceno',NULL,1,100,'2026-01-21 10:43:04','2026-01-21 10:43:04'),
(10,13,'MP-AG-PE','Pescara',NULL,1,100,'2026-01-21 10:43:04','2026-01-21 10:43:04');
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_porti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_lavorazioni_spedizioni_report_fields`
--

DROP TABLE IF EXISTS `cfg_lavorazioni_spedizioni_report_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_lavorazioni_spedizioni_report_fields` (
  `id_field` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_affrancatura` int(10) unsigned DEFAULT NULL,
  `field_code` varchar(64) NOT NULL,
  `label` varchar(128) NOT NULL,
  `description` text DEFAULT NULL,
  `ordering` smallint(5) unsigned NOT NULL DEFAULT 100,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_field`),
  UNIQUE KEY `uq_report_field` (`id_affrancatura`,`field_code`),
  KEY `idx_report_affrancatura` (`id_affrancatura`),
  CONSTRAINT `fk_report_affrancatura` FOREIGN KEY (`id_affrancatura`) REFERENCES `cfg_lavorazioni_spedizioni_affrancature` (`id_affrancatura`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_report_fields`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_report_fields` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_report_fields` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_spedizioni_report_fields` VALUES
(1,9,'AM','AM','Zona AM',100,1,'2026-01-21 15:40:40','2026-01-21 16:03:02'),
(2,9,'CP','CP','Zona CP',200,1,'2026-01-21 15:41:09','2026-01-21 16:03:10'),
(3,9,'EU','EU','Zona EU',300,1,'2026-01-21 15:41:09','2026-01-21 16:03:17'),
(5,11,'QUANTITA','Quantità',NULL,100,1,'2026-01-21 14:54:36','2026-01-21 16:50:58'),
(6,8,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 14:55:02','2026-01-21 14:55:39'),
(7,21,'QUANTITA','Quantità',NULL,100,1,'2026-01-21 14:56:42','2026-01-21 14:56:42'),
(8,22,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 14:56:52','2026-01-21 14:56:52'),
(9,18,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 14:56:58','2026-01-21 14:56:58'),
(10,20,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 14:57:03','2026-01-21 14:57:03'),
(11,19,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 14:57:07','2026-01-21 14:57:07'),
(17,15,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 14:58:19','2026-01-21 14:58:19'),
(18,14,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 14:58:34','2026-01-21 15:15:40'),
(19,7,'AM','AM','Zona AM',100,1,'2026-01-21 15:03:19','2026-01-21 16:28:58'),
(20,7,'CP','CP','Zona CP',100,1,'2026-01-21 15:03:30','2026-01-21 16:29:03'),
(21,7,'EU','EU','Zona EU',100,1,'2026-01-21 15:03:38','2026-01-21 16:29:07'),
(22,7,'EX','Estere','Estere',100,1,'2026-01-21 15:03:49','2026-01-21 16:29:14'),
(23,7,'NO','Indirizzo Errato/Assente','Indirizzo Errato/Assente',100,1,'2026-01-21 15:04:01','2026-01-21 16:29:18'),
(24,16,'QUANTITA','Quantità',NULL,100,1,'2026-01-21 15:04:31','2026-01-21 16:51:04'),
(25,12,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 15:04:53','2026-01-21 15:04:53'),
(26,13,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 15:05:01','2026-01-21 15:05:01'),
(27,17,'QUANTITA','Quantità Spedite',NULL,100,1,'2026-01-21 15:15:27','2026-01-21 15:15:27');
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_report_fields` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_lavorazioni_spedizioni_tariffe`
--

DROP TABLE IF EXISTS `cfg_lavorazioni_spedizioni_tariffe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_lavorazioni_spedizioni_tariffe` (
  `id_tariffa` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_affrancatura` int(10) unsigned NOT NULL,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `ordering` smallint(5) unsigned NOT NULL DEFAULT 100,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_tariffa`),
  UNIQUE KEY `uq_tariffa_code` (`code`),
  KEY `idx_tariffa_affrancatura` (`id_affrancatura`),
  CONSTRAINT `fk_tariffa_affrancatura` FOREIGN KEY (`id_affrancatura`) REFERENCES `cfg_lavorazioni_spedizioni_affrancature` (`id_affrancatura`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_tariffe`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_tariffe` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_tariffe` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_spedizioni_tariffe` VALUES
(4,7,'PT-AR-STD','Standard',NULL,1,100,'2026-01-21 10:09:31','2026-01-21 10:09:31'),
(5,7,'PT-AR-EVO','Evolution',NULL,1,100,'2026-01-21 10:09:31','2026-01-21 10:09:31'),
(6,7,'PT-AR-EX','A/R Estere',NULL,1,100,'2026-01-21 10:10:22','2026-01-21 10:10:22'),
(7,8,'PT-AG-STD','Standard',NULL,1,100,'2026-01-21 10:10:51','2026-01-21 10:10:51'),
(8,9,'PT-PM-STD','Standard',NULL,1,100,'2026-01-21 10:11:31','2026-01-21 10:11:31'),
(9,9,'PT-PM-EVO','Evolution',NULL,1,100,'2026-01-21 10:11:31','2026-01-21 10:11:31'),
(10,10,'PT-PT-B','Basic',NULL,1,100,'2026-01-21 10:12:36','2026-01-21 10:12:36'),
(11,10,'PT-PT-BEVO','Basic Evolution',NULL,1,100,'2026-01-21 10:12:36','2026-01-21 10:12:36'),
(12,10,'PT-PT-C','Creative',NULL,1,100,'2026-01-21 10:17:32','2026-01-21 10:17:32'),
(13,10,'PT-PT-CEVO','Creative Evolution',NULL,1,100,'2026-01-21 10:17:32','2026-01-21 10:17:32'),
(14,10,'PT-PT-CAT','Catalog',NULL,1,100,'2026-01-21 10:19:04','2026-01-21 10:19:04'),
(15,10,'PT-PT-M','Magazine',NULL,1,100,'2026-01-21 10:19:04','2026-01-21 10:19:04'),
(16,10,'PT-PT-GRES','GOLD Resi',NULL,1,100,'2026-01-21 10:19:04','2026-01-21 10:19:04'),
(17,10,'PT-PT-GREP','Gold Report',NULL,1,100,'2026-01-21 10:19:04','2026-01-21 10:19:04'),
(18,10,'PT-PT-CB','Customer Base',NULL,1,100,'2026-01-21 10:19:41','2026-01-21 10:19:41'),
(19,11,'PT-PL-S','Standard',NULL,1,100,'2026-01-21 10:20:00','2026-01-21 10:20:00'),
(20,12,'PT-PE-S','Standard',NULL,1,100,'2026-01-21 10:20:18','2026-01-21 10:20:18'),
(21,13,'PT-P4-S','Standard',NULL,1,100,'2026-01-21 10:20:45','2026-01-21 10:20:45');
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_tariffe` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Rimozione strutture report stampa (attività stampa)
--

DROP TABLE IF EXISTS `tb_lavorazioni_attivita_stampa_report_row_values`;
DROP TABLE IF EXISTS `tb_lavorazioni_attivita_stampa_report_rows`;
DROP TABLE IF EXISTS `tb_lavorazioni_attivita_stampa_report`;
DROP TABLE IF EXISTS `cfg_lavorazioni_stampa_report_fields`;

ALTER TABLE `tb_preventivi_righe`
    DROP COLUMN IF EXISTS `stampa_report_warning`;

ALTER TABLE `tb_preventivi_righe`
    ADD COLUMN IF NOT EXISTS `created_by_ced` TINYINT(1) NOT NULL DEFAULT 0;

--
-- Table structure for table `tb_lavorazioni_attivita_ced_quantita`
--

DROP TABLE IF EXISTS `tb_lavorazioni_attivita_ced_quantita`;
CREATE TABLE `tb_lavorazioni_attivita_ced_quantita` (
  `id_attivita` int(11) NOT NULL,
  `id_riga_preventivo` int(11) NOT NULL,
  `quantita_ced` decimal(12,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_attivita`,`id_riga_preventivo`),
  KEY `idx_ced_attivita` (`id_attivita`),
  KEY `idx_ced_riga` (`id_riga_preventivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `cfg_metodi_pagamento`
--

DROP TABLE IF EXISTS `cfg_metodi_pagamento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_metodi_pagamento` (
  `id_metodo` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_metodo`),
  UNIQUE KEY `uq_metpag_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_metodi_pagamento`
--

LOCK TABLES `cfg_metodi_pagamento` WRITE;
/*!40000 ALTER TABLE `cfg_metodi_pagamento` DISABLE KEYS */;
INSERT INTO `cfg_metodi_pagamento` VALUES
(1,'bonifico','Bonifico',1),
(2,'contanti','Contanti',0),
(3,'assegno','Assegno',0),
(4,'pos','POS',0),
(5,'paypal','PayPal',0),
(6,'altro','Altro',0),
(7,'rid','Ri.D.',1),
(8,'riba','Ri.Ba.',1);
/*!40000 ALTER TABLE `cfg_metodi_pagamento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_preventivi_oggetti`
--

DROP TABLE IF EXISTS `cfg_preventivi_oggetti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_preventivi_oggetti` (
  `id_oggetto` int(11) NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `code` varchar(64) DEFAULT NULL,
  `ordering` int(11) NOT NULL DEFAULT 0,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_oggetto`),
  UNIQUE KEY `label` (`label`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_preventivi_oggetti`
--

LOCK TABLES `cfg_preventivi_oggetti` WRITE;
/*!40000 ALTER TABLE `cfg_preventivi_oggetti` DISABLE KEYS */;
INSERT INTO `cfg_preventivi_oggetti` VALUES
(1,'Stampa','stampa',1,1),
(2,'Imbustamento','imbustamento',2,1),
(3,'Cellophanatura','cellophanatura',3,1),
(4,'Posta Digitale','posta_digitale',4,1),
(5,'Postalizzazione','postalizzazione',5,1),
(40,'Data Entry','data_entry',3,1);
/*!40000 ALTER TABLE `cfg_preventivi_oggetti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_reparti_produttivi`
--

DROP TABLE IF EXISTS `cfg_reparti_produttivi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_reparti_produttivi` (
  `id_reparto` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `ordering` smallint(5) unsigned NOT NULL DEFAULT 100,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_reparto`),
  UNIQUE KEY `uq_cfg_reparti_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_reparti_produttivi`
--

LOCK TABLES `cfg_reparti_produttivi` WRITE;
/*!40000 ALTER TABLE `cfg_reparti_produttivi` DISABLE KEYS */;
INSERT INTO `cfg_reparti_produttivi` VALUES
(1,'CED','Centro Elaborazione Dati',100,1),
(2,'Produzione','Produzione Posta Network',200,1),
(3,'UB','Unit Business',300,1),
(4,'UA','Unit Amministrazione',400,1);
/*!40000 ALTER TABLE `cfg_reparti_produttivi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sdi_canale`
--

DROP TABLE IF EXISTS `cfg_sdi_canale`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sdi_canale` (
  `id_canale` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(16) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_canale`),
  UNIQUE KEY `uq_sdi_canale_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sdi_canale`
--

LOCK TABLES `cfg_sdi_canale` WRITE;
/*!40000 ALTER TABLE `cfg_sdi_canale` DISABLE KEYS */;
INSERT INTO `cfg_sdi_canale` VALUES
(1,'PEC','Posta Elettronica Certificata',1),
(2,'SdICoop','Web Service HTTPS (SOAP/MTOM)',1),
(3,'SdIFtp','SFTP accreditato SdI',1),
(4,'Portale','Portale Fatture e Corrispettivi',1);
/*!40000 ALTER TABLE `cfg_sdi_canale` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sdi_esigibilita_iva`
--

DROP TABLE IF EXISTS `cfg_sdi_esigibilita_iva`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sdi_esigibilita_iva` (
  `id_esig` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` char(1) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_esig`),
  UNIQUE KEY `uq_sdi_esig_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sdi_esigibilita_iva`
--

LOCK TABLES `cfg_sdi_esigibilita_iva` WRITE;
/*!40000 ALTER TABLE `cfg_sdi_esigibilita_iva` DISABLE KEYS */;
INSERT INTO `cfg_sdi_esigibilita_iva` VALUES
(1,'I','IVA ad esigibilità immediata',1),
(2,'D','IVA ad esigibilità differita',1),
(3,'S','IVA per scissione dei pagamenti (split payment)',1);
/*!40000 ALTER TABLE `cfg_sdi_esigibilita_iva` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sdi_formato_trasmissione`
--

DROP TABLE IF EXISTS `cfg_sdi_formato_trasmissione`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sdi_formato_trasmissione` (
  `id_formato` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(8) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_formato`),
  UNIQUE KEY `uq_sdi_formato_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sdi_formato_trasmissione`
--

LOCK TABLES `cfg_sdi_formato_trasmissione` WRITE;
/*!40000 ALTER TABLE `cfg_sdi_formato_trasmissione` DISABLE KEYS */;
INSERT INTO `cfg_sdi_formato_trasmissione` VALUES
(1,'FPR12','Fattura PA/Ord (v1.2)',1);
/*!40000 ALTER TABLE `cfg_sdi_formato_trasmissione` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sdi_modalita_pagamento`
--

DROP TABLE IF EXISTS `cfg_sdi_modalita_pagamento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sdi_modalita_pagamento` (
  `id_modalita` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(8) NOT NULL,
  `label` varchar(160) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_modalita`),
  UNIQUE KEY `uq_sdi_mp_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sdi_modalita_pagamento`
--

LOCK TABLES `cfg_sdi_modalita_pagamento` WRITE;
/*!40000 ALTER TABLE `cfg_sdi_modalita_pagamento` DISABLE KEYS */;
INSERT INTO `cfg_sdi_modalita_pagamento` VALUES
(1,'MP01','Contanti',0),
(2,'MP02','Assegno',0),
(3,'MP05','Bonifico',1),
(4,'MP08','Carta di pagamento',0),
(5,'MP12','RIBA',1),
(6,'MP03','Assegno circolare',0),
(7,'MP04','Contanti presso Tesoreria',0),
(8,'MP06','Vaglia cambiario',0),
(9,'MP07','Bollettino bancario',0),
(10,'MP09','RID',1),
(11,'MP10','RID utenze',0),
(12,'MP11','RID veloce',0),
(13,'MP13','MAV',0),
(14,'MP14','Quietanza erario',0),
(15,'MP15','Giroconto su conti di contabilità speciale',0),
(16,'MP16','Domiciliazione bancaria',0),
(17,'MP17','Domiciliazione postale',0),
(18,'MP18','Bollettino postale',0),
(19,'MP19','SEPA Direct Debit',0),
(20,'MP20','SEPA Direct Debit CORE',0),
(21,'MP21','SEPA Direct Debit B2B',0),
(22,'MP22','Trattenuta su somme già riscosse',0),
(23,'MP23','PagoPA',0);
/*!40000 ALTER TABLE `cfg_sdi_modalita_pagamento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sdi_natura_iva`
--

DROP TABLE IF EXISTS `cfg_sdi_natura_iva`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sdi_natura_iva` (
  `id_natura` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(4) NOT NULL,
  `label` varchar(160) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_natura`),
  UNIQUE KEY `uq_sdi_nat_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sdi_natura_iva`
--

LOCK TABLES `cfg_sdi_natura_iva` WRITE;
/*!40000 ALTER TABLE `cfg_sdi_natura_iva` DISABLE KEYS */;
INSERT INTO `cfg_sdi_natura_iva` VALUES
(1,'N1','Escluse Art.15',1),
(2,'N2','Non soggette',1),
(3,'N3','Non imponibili',0),
(4,'N4','Esenti',1),
(5,'N5','Regime del margine/IVA non esposta',0),
(6,'N6','Inversione contabile',0),
(7,'N7','IVA assolta in altro Stato UE',0),
(8,'N2.1','Non soggette art. 7–7-septies DPR 633/72',0),
(9,'N2.2','Non soggette – altri casi',0),
(10,'N3.1','Non imponibili – esportazioni',0),
(11,'N3.2','Non imponibili – cessioni intracomunitarie',0),
(12,'N3.3','Non imponibili – cessioni verso San Marino',0),
(13,'N3.4','Non imponibili – operazioni assimilate alle cessioni all’esportazione',0),
(14,'N3.5','Non imponibili – a seguito di dichiarazioni d’intento',0),
(15,'N3.6','Non imponibili – altre',0),
(16,'N6.1','Inversione contabile – cessione rottami e altri materiali di recupero',0),
(17,'N6.2','Inversione contabile – cessione oro, argento puro',0),
(18,'N6.3','Inversione contabile – subappalto nel settore edile',0),
(19,'N6.4','Inversione contabile – cessione fabbricati',0),
(20,'N6.5','Inversione contabile – cessione telefoni cellulari',0),
(21,'N6.6','Inversione contabile – cessione prodotti elettronici',0),
(22,'N6.7','Inversione contabile – prestazioni comparto edile/settori connessi',0),
(23,'N6.8','Inversione contabile – operazioni settore energetico',0),
(24,'N6.9','Inversione contabile – altri casi',0);
/*!40000 ALTER TABLE `cfg_sdi_natura_iva` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sdi_regime_fiscale`
--

DROP TABLE IF EXISTS `cfg_sdi_regime_fiscale`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sdi_regime_fiscale` (
  `id_regime` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(8) NOT NULL,
  `label` varchar(160) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_regime`),
  UNIQUE KEY `uq_sdi_rf_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sdi_regime_fiscale`
--

LOCK TABLES `cfg_sdi_regime_fiscale` WRITE;
/*!40000 ALTER TABLE `cfg_sdi_regime_fiscale` DISABLE KEYS */;
INSERT INTO `cfg_sdi_regime_fiscale` VALUES
(1,'RF01','Ordinario',1),
(2,'RF19','Regime forfettario',1),
(3,'RF02','Contribuenti minimi',0),
(4,'RF04','Agricoltura e attività connesse e pesca',0),
(5,'RF05','Vendita sali e tabacchi',0),
(6,'RF06','Commercio fiammiferi',0),
(7,'RF07','Editoria',1),
(8,'RF08','Gestione servizi di telefonia pubblica',0),
(9,'RF09','Rivendita documenti di trasporto pubblico e di sosta',0),
(10,'RF10','Intrattenimenti, giochi e altre attività di cui al DPR 640/72',0),
(11,'RF11','Agenzie viaggi e turismo',0),
(12,'RF12','Vendita a domicilio',0),
(13,'RF13','Rivendita beni usati, oggetti d’arte, d’antiquariato o da collezione',0),
(14,'RF14','Agenzie di vendite all’asta di oggetti d’arte, antiquariato o da collezione',0),
(15,'RF15','IVA per cassa',0),
(16,'RF16','Agricoltura e attività connesse – regime speciale',0),
(17,'RF17','IVA per cassa (art. 32-bis, DL 83/2012)',0),
(18,'RF18','Altro',0),
(19,'RF20','Regime transfrontaliero di franchigia IVA (Direttiva UE 2020/285)',0);
/*!40000 ALTER TABLE `cfg_sdi_regime_fiscale` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sdi_tipo_documento`
--

DROP TABLE IF EXISTS `cfg_sdi_tipo_documento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sdi_tipo_documento` (
  `id_tipo` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(8) NOT NULL,
  `label` varchar(160) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tipo`),
  UNIQUE KEY `uq_sdi_td_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sdi_tipo_documento`
--

LOCK TABLES `cfg_sdi_tipo_documento` WRITE;
/*!40000 ALTER TABLE `cfg_sdi_tipo_documento` DISABLE KEYS */;
INSERT INTO `cfg_sdi_tipo_documento` VALUES
(1,'TD01','Fattura',1),
(2,'TD04','Nota di credito',1),
(3,'TD05','Nota di debito',1),
(4,'TD24','Fattura differita',1),
(5,'TD02','Acconto/Anticipo su fattura',1),
(6,'TD03','Acconto/Anticipo su parcella',1),
(7,'TD06','Parcella',1),
(8,'TD16','Integrazione/reverse charge interno',1),
(9,'TD17','Integrazione/autofattura per acquisto servizi dall’estero',1),
(10,'TD18','Integrazione/autofattura per acquisto beni intracomunitari',1),
(11,'TD19','Integrazione/autofattura per acquisto beni ex art.17 c.2 DPR 633/72',1),
(12,'TD20','Autofattura per regolarizzazione o per splafonamento',1),
(13,'TD21','Autofattura per splafonamento',1),
(14,'TD22','Estrazione beni da Deposito IVA',1),
(15,'TD23','Estrazione beni da Deposito IVA con versamento IVA',1),
(16,'TD25','Fattura conto terzi',1),
(17,'TD26','Cessione di beni ammortizzabili e passaggi interni',1),
(18,'TD27','Autoconsumo o cessioni gratuite senza rivalsa',1),
(19,'TD28','Acquisti da San Marino con IVA',1);
/*!40000 ALTER TABLE `cfg_sdi_tipo_documento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sedi_tipo`
--

DROP TABLE IF EXISTS `cfg_sedi_tipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sedi_tipo` (
  `id_tipo` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `codice` varchar(32) NOT NULL,
  `nome` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tipo`),
  UNIQUE KEY `codice` (`codice`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sedi_tipo`
--

LOCK TABLES `cfg_sedi_tipo` WRITE;
/*!40000 ALTER TABLE `cfg_sedi_tipo` DISABLE KEYS */;
INSERT INTO `cfg_sedi_tipo` VALUES
(1,'LEGALE','Sede legale',1),
(2,'OPERATIVA','Sede operativa',1),
(3,'MAGAZZINO','Magazzino',1);
/*!40000 ALTER TABLE `cfg_sedi_tipo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_serie_documenti`
--

DROP TABLE IF EXISTS `cfg_serie_documenti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_serie_documenti` (
  `id_serie` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tipo_documento` enum('preventivo','ddt','fattura') NOT NULL,
  `code` varchar(16) NOT NULL,
  `descrizione` varchar(128) DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_serie`),
  UNIQUE KEY `uq_serie` (`tipo_documento`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_serie_documenti`
--

LOCK TABLES `cfg_serie_documenti` WRITE;
/*!40000 ALTER TABLE `cfg_serie_documenti` DISABLE KEYS */;
/*!40000 ALTER TABLE `cfg_serie_documenti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_settings`
--

DROP TABLE IF EXISTS `cfg_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_settings` (
  `k` varchar(64) NOT NULL,
  `v` varchar(512) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_settings`
--

LOCK TABLES `cfg_settings` WRITE;
/*!40000 ALTER TABLE `cfg_settings` DISABLE KEYS */;
INSERT INTO `cfg_settings` VALUES
('azienda.valuta_default','EUR','Valuta predefinita',1,'2025-09-30 10:44:31'),
('documenti.numerazione.anno_reset','1','Reset numerazione ogni anno (1=si,0=no)',1,'2025-09-30 10:44:31');
/*!40000 ALTER TABLE `cfg_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sezionali`
--

DROP TABLE IF EXISTS `cfg_sezionali`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sezionali` (
  `id_sezionale` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ambito` enum('fattura','nota_credito','pa','reweicoli') NOT NULL,
  `code` varchar(16) NOT NULL,
  `descrizione` varchar(128) DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_sezionale`),
  UNIQUE KEY `uq_sez_ambito_code` (`ambito`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sezionali`
--

LOCK TABLES `cfg_sezionali` WRITE;
/*!40000 ALTER TABLE `cfg_sezionali` DISABLE KEYS */;
INSERT INTO `cfg_sezionali` VALUES
(1,'fattura','MP','Fatture Ordinarie',1),
(2,'pa','PA','Fatture PA 01',1),
(3,'reweicoli','REW','Reweicoli',1);
/*!40000 ALTER TABLE `cfg_sezionali` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sezionali_progress`
--

DROP TABLE IF EXISTS `cfg_sezionali_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sezionali_progress` (
  `id_sezionale` int(10) unsigned NOT NULL,
  `anno` smallint(5) unsigned NOT NULL,
  `next_num` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_sezionale`,`anno`),
  CONSTRAINT `fk_sez_prog_sez` FOREIGN KEY (`id_sezionale`) REFERENCES `cfg_sezionali` (`id_sezionale`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sezionali_progress`
--

LOCK TABLES `cfg_sezionali_progress` WRITE;
/*!40000 ALTER TABLE `cfg_sezionali_progress` DISABLE KEYS */;
INSERT INTO `cfg_sezionali_progress` VALUES
(1,2025,18),
(1,2026,7),
(2,2025,2);
/*!40000 ALTER TABLE `cfg_sezionali_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_sezionali_td_allow`
--

DROP TABLE IF EXISTS `cfg_sezionali_td_allow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_sezionali_td_allow` (
  `id_sezionale` int(10) unsigned NOT NULL,
  `id_tipo_sdi` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id_sezionale`,`id_tipo_sdi`),
  KEY `fk_seztd_td` (`id_tipo_sdi`),
  CONSTRAINT `fk_seztd_sez` FOREIGN KEY (`id_sezionale`) REFERENCES `cfg_sezionali` (`id_sezionale`) ON DELETE CASCADE,
  CONSTRAINT `fk_seztd_td` FOREIGN KEY (`id_tipo_sdi`) REFERENCES `cfg_sdi_tipo_documento` (`id_tipo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_sezionali_td_allow`
--

LOCK TABLES `cfg_sezionali_td_allow` WRITE;
/*!40000 ALTER TABLE `cfg_sezionali_td_allow` DISABLE KEYS */;
INSERT INTO `cfg_sezionali_td_allow` VALUES
(1,1),
(1,3),
(1,4),
(1,17),
(1,18),
(2,1),
(2,4);
/*!40000 ALTER TABLE `cfg_sezionali_td_allow` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_stati_contratto`
--

DROP TABLE IF EXISTS `cfg_stati_contratto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_stati_contratto` (
  `id_stato` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `ordering` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_stato`),
  UNIQUE KEY `uq_contr_stato_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_stati_contratto`
--

LOCK TABLES `cfg_stati_contratto` WRITE;
/*!40000 ALTER TABLE `cfg_stati_contratto` DISABLE KEYS */;
INSERT INTO `cfg_stati_contratto` VALUES
(1,'bozza','Bozza',10,1),
(2,'inviato','Inviato',20,1),
(3,'confermato','Confermato',30,1),
(4,'rifiutato','Rifiutato',40,1),
(5,'annullato','Annullato',50,1);
/*!40000 ALTER TABLE `cfg_stati_contratto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_stati_fattura`
--

DROP TABLE IF EXISTS `cfg_stati_fattura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_stati_fattura` (
  `id_stato` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `timeline_icon` varchar(32) DEFAULT NULL,
  `timeline_color` varchar(32) DEFAULT NULL,
  `ordering` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_stato`),
  UNIQUE KEY `uq_fattst_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_stati_fattura`
--

LOCK TABLES `cfg_stati_fattura` WRITE;
/*!40000 ALTER TABLE `cfg_stati_fattura` DISABLE KEYS */;
INSERT INTO `cfg_stati_fattura` VALUES
(1,'bozza','Bozza',NULL,'',10,1),
(2,'emessa','Emessa',NULL,'',20,1),
(3,'inviata','Inviata',NULL,'',30,1),
(4,'pagata','Pagata','€','green',40,1),
(5,'scaduta','Scaduta','-','red',50,1),
(6,'rifiutata','Rifiutata','X','red',60,1),
(7,'pagataparziale','Parzialmente Pagata','/','orange',41,1);
/*!40000 ALTER TABLE `cfg_stati_fattura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_stati_preventivo`
--

DROP TABLE IF EXISTS `cfg_stati_preventivo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_stati_preventivo` (
  `id_stato` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `ordering` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_stato`),
  UNIQUE KEY `uq_prevst_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_stati_preventivo`
--

LOCK TABLES `cfg_stati_preventivo` WRITE;
/*!40000 ALTER TABLE `cfg_stati_preventivo` DISABLE KEYS */;
INSERT INTO `cfg_stati_preventivo` VALUES
(1,'bozza','Bozza',10,1),
(2,'inviato','Inviato',20,1),
(6,'revisionato_ced','Revisionato dal CED',25,1),
(3,'confermato','Confermato',30,1),
(4,'rifiutato_cliente','Rifiutato dal cliente',40,1),
(5,'annullato','Annullato (operatore/cliente)',50,1);
/*!40000 ALTER TABLE `cfg_stati_preventivo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_termini_pagamento`
--

DROP TABLE IF EXISTS `cfg_termini_pagamento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_termini_pagamento` (
  `id_termine` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(128) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `giorni` smallint(5) unsigned DEFAULT NULL,
  `fine_mese` tinyint(1) NOT NULL DEFAULT 0,
  `rate` tinyint(3) unsigned DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_termine`),
  UNIQUE KEY `uq_term_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_termini_pagamento`
--

LOCK TABLES `cfg_termini_pagamento` WRITE;
/*!40000 ALTER TABLE `cfg_termini_pagamento` DISABLE KEYS */;
INSERT INTO `cfg_termini_pagamento` VALUES
(1,'BON_SCAD','Bonifico bancario a scadenza','Saldo unico alla data di emissione.','{\"schedule\":[{\"anchor\":\"invoice_date\",\"offset_days\":0,\"label\":\"Saldo\"}]}',0,0,1,1),
(2,'30_DF','Pagamento a 30 giorni data fattura','Unica rata 30 giorni dalla data fattura.','{\"schedule\":[{\"anchor\":\"invoice_date\",\"offset_days\":30,\"label\":\"Saldo 30 gg\"}]}',30,0,1,1),
(3,'60_DF','Pagamento a 60 giorni data fattura','Unica rata 60 giorni dalla data fattura.','{\"schedule\":[{\"anchor\":\"invoice_date\",\"offset_days\":60,\"label\":\"Saldo 60 gg\"}]}',60,0,1,1),
(4,'90_DF','Pagamento a 90 giorni data fattura','Unica rata 90 giorni dalla data fattura.','{\"schedule\":[{\"anchor\":\"invoice_date\",\"offset_days\":90,\"label\":\"Saldo 90 gg\"}]}',90,0,1,1),
(5,'FM','Pagamento a fine mese','Saldo al termine del mese di fatturazione.','{\"schedule\":[{\"anchor\":\"end_of_month\",\"offset_days\":0,\"label\":\"Saldo fine mese\"}]}',0,1,1,1),
(6,'30_FM','Pagamento 30 giorni fine mese','Saldo 30 giorni dopo la fine mese.','{\"schedule\":[{\"anchor\":\"end_of_month\",\"offset_days\":30,\"label\":\"Saldo 30 gg f.m.\"}]}',30,1,1,1),
(7,'60_DFFM','Pagamento 60 gg d.f.f.m.','Saldo 60 giorni dalla fine del mese di fatturazione.','{\"schedule\":[{\"anchor\":\"end_of_month\",\"offset_days\":60,\"label\":\"Saldo 60 gg f.m.\"}]}',60,1,1,1),
(8,'90_DFFM','Pagamento 90 gg d.f.f.m.','Saldo 90 giorni dalla fine del mese di fatturazione.','{\"schedule\":[{\"anchor\":\"end_of_month\",\"offset_days\":90,\"label\":\"Saldo 90 gg f.m.\"}]}',90,1,1,1),
(9,'30_60_DF','Pagamento 30-60 data fattura','Due rate a 30 e 60 giorni dalla data fattura.','{\"schedule\":[{\"anchor\":\"invoice_date\",\"offset_days\":30,\"label\":\"Rata 1 - 30 gg\"},{\"anchor\":\"invoice_date\",\"offset_days\":60,\"label\":\"Rata 2 - 60 gg\"}]}',30,0,2,1),
(10,'30_60_FM','Pagamento 30-60 fine mese','Due rate a 30 e 60 giorni dalla fine mese.','{\"schedule\":[{\"anchor\":\"end_of_month\",\"offset_days\":30,\"label\":\"Rata 1 - 30 gg fm\"},{\"anchor\":\"end_of_month\",\"offset_days\":60,\"label\":\"Rata 2 - 60 gg fm\"}]}',30,1,2,1),
(11,'30_60_90_DF','Pagamento 30-60-90 data fattura','Tre rate a 30, 60 e 90 giorni dalla data fattura.','{\"schedule\":[{\"anchor\":\"invoice_date\",\"offset_days\":30,\"label\":\"Rata 1 - 30 gg\"},{\"anchor\":\"invoice_date\",\"offset_days\":60,\"label\":\"Rata 2 - 60 gg\"},{\"anchor\":\"invoice_date\",\"offset_days\":90,\"label\":\"Rata 3 - 90 gg\"}]}',30,0,3,1),
(12,'30_60_90_FM','Pagamento 30-60-90 fine mese','Tre rate a 30, 60 e 90 giorni dalla fine mese di fatturazione.','{\"schedule\":[{\"anchor\":\"end_of_month\",\"offset_days\":30,\"label\":\"Rata 1 - 30 gg fm\"},{\"anchor\":\"end_of_month\",\"offset_days\":60,\"label\":\"Rata 2 - 60 gg fm\"},{\"anchor\":\"end_of_month\",\"offset_days\":90,\"label\":\"Rata 3 - 90 gg fm\"}]}',30,1,3,1);
/*!40000 ALTER TABLE `cfg_termini_pagamento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_tipi_fattura`
--

DROP TABLE IF EXISTS `cfg_tipi_fattura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_tipi_fattura` (
  `id_tipo` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tipo`),
  UNIQUE KEY `uq_tipfat_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_tipi_fattura`
--

LOCK TABLES `cfg_tipi_fattura` WRITE;
/*!40000 ALTER TABLE `cfg_tipi_fattura` DISABLE KEYS */;
INSERT INTO `cfg_tipi_fattura` VALUES
(1,'accompagnatoria','Accompagnatoria',1),
(2,'immediata','Immediata',1),
(3,'differita','Differita',1),
(4,'nota_credito','Nota di credito',1);
/*!40000 ALTER TABLE `cfg_tipi_fattura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_tipologia_anagrafica`
--

DROP TABLE IF EXISTS `cfg_tipologia_anagrafica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_tipologia_anagrafica` (
  `id_tipologia` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tipologia`),
  UNIQUE KEY `uq_tipanag_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_tipologia_anagrafica`
--

LOCK TABLES `cfg_tipologia_anagrafica` WRITE;
/*!40000 ALTER TABLE `cfg_tipologia_anagrafica` DISABLE KEYS */;
INSERT INTO `cfg_tipologia_anagrafica` VALUES
(1,'cliente','Cliente',1),
(2,'fornitore','Fornitore',1),
(3,'entrambi','Cliente/Fornitore',1),
(4,'dipendente','Dipendente',1);
/*!40000 ALTER TABLE `cfg_tipologia_anagrafica` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_unita_misura`
--

DROP TABLE IF EXISTS `cfg_unita_misura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_unita_misura` (
  `id_unita` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(16) NOT NULL,
  `label` varchar(64) NOT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_unita`),
  UNIQUE KEY `uq_um_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_unita_misura`
--

LOCK TABLES `cfg_unita_misura` WRITE;
/*!40000 ALTER TABLE `cfg_unita_misura` DISABLE KEYS */;
INSERT INTO `cfg_unita_misura` VALUES
(1,'PZ','Pezzi',1),
(2,'KG','Chilogrammi',1),
(3,'LT','Litri',1),
(4,'ML','Metri lineari',1),
(5,'MQ','Metri quadrati',1),
(6,'ORA','Ore',1);
/*!40000 ALTER TABLE `cfg_unita_misura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cfg_valute`
--

DROP TABLE IF EXISTS `cfg_valute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_valute` (
  `id_valuta` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(8) NOT NULL,
  `label` varchar(64) NOT NULL,
  `simbolo` varchar(8) DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_valuta`),
  UNIQUE KEY `uq_valuta_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_valute`
--

LOCK TABLES `cfg_valute` WRITE;
/*!40000 ALTER TABLE `cfg_valute` DISABLE KEYS */;
INSERT INTO `cfg_valute` VALUES
(1,'EUR','Euro','€',1),
(2,'USD','US Dollar','$',1);
/*!40000 ALTER TABLE `cfg_valute` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_messages`
--

DROP TABLE IF EXISTS `im_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_messages` (
  `id_message` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_thread` bigint(20) unsigned NOT NULL,
  `id_account` bigint(20) unsigned NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_message`),
  KEY `idx_im_messages_thread` (`id_thread`),
  KEY `idx_im_messages_sender` (`id_account`),
  CONSTRAINT `fk_im_message_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_im_message_thread` FOREIGN KEY (`id_thread`) REFERENCES `im_threads` (`id_thread`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_messages`
--

LOCK TABLES `im_messages` WRITE;
/*!40000 ALTER TABLE `im_messages` DISABLE KEYS */;
INSERT INTO `im_messages` VALUES
(1,1,1,'ciao','2025-12-29 14:48:07'),
(2,1,2,'CIAO','2025-12-29 14:48:37'),
(3,1,1,'ce ne andiamo a fanculo?','2025-12-29 14:48:56'),
(4,1,1,'mi sono rotto le palle','2025-12-29 14:49:02'),
(5,1,2,'Sapessi io','2025-12-29 14:49:26'),
(6,1,1,'vbbè funziona sicuro meglio di myplan','2025-12-29 14:49:42'),
(7,3,1,'ciao','2025-12-30 15:01:56'),
(8,3,7,'ciao caro','2025-12-30 15:02:55'),
(9,3,7,'come stai?=','2025-12-30 15:03:19'),
(10,3,1,'tutto ok','2025-12-30 15:03:30'),
(11,3,1,'andiamo a fumare?','2025-12-30 15:03:49'),
(12,3,1,'che dici?=','2025-12-30 15:04:04'),
(13,3,7,'andiamo','2025-12-30 15:04:21'),
(14,4,1,'ciao','2025-12-30 16:20:40'),
(15,4,8,'prova','2025-12-30 16:24:34'),
(16,4,1,'eccolo!','2025-12-30 16:26:14'),
(17,4,1,'come ti sembra?','2025-12-30 16:26:56'),
(18,4,8,'arrivato','2025-12-30 16:27:14'),
(19,4,1,'Ciao','2025-12-30 16:28:51'),
(20,4,8,'...','2025-12-30 16:29:08'),
(21,4,1,'Ggggh','2025-12-30 16:29:29'),
(22,4,1,'Gxhcjgkvkgk','2025-12-30 16:29:36');
/*!40000 ALTER TABLE `im_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_participants`
--

DROP TABLE IF EXISTS `im_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_participants` (
  `id_thread` bigint(20) unsigned NOT NULL,
  `id_account` bigint(20) unsigned NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_thread`,`id_account`),
  KEY `idx_im_participant_account` (`id_account`),
  CONSTRAINT `fk_im_participant_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_im_participant_thread` FOREIGN KEY (`id_thread`) REFERENCES `im_threads` (`id_thread`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_participants`
--

LOCK TABLES `im_participants` WRITE;
/*!40000 ALTER TABLE `im_participants` DISABLE KEYS */;
INSERT INTO `im_participants` VALUES
(1,1,'2025-12-29 14:47:47','2026-01-22 10:05:50'),
(1,2,'2025-12-29 14:47:47','2025-12-29 14:52:29'),
(2,1,'2025-12-29 14:49:29','2026-01-22 10:05:51'),
(3,1,'2025-12-30 15:01:51','2026-01-22 10:05:50'),
(3,7,'2025-12-30 15:01:51','2026-01-13 17:14:45'),
(4,1,'2025-12-30 16:20:36','2026-01-22 10:06:03'),
(4,8,'2025-12-30 16:20:36','2025-12-30 16:37:47');
/*!40000 ALTER TABLE `im_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `im_threads`
--

DROP TABLE IF EXISTS `im_threads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `im_threads` (
  `id_thread` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pair_key` varchar(64) NOT NULL,
  `created_by` bigint(20) unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_message_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_thread`),
  UNIQUE KEY `uq_im_pair` (`pair_key`),
  KEY `idx_im_created_by` (`created_by`),
  CONSTRAINT `fk_im_thread_creator` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `im_threads`
--

LOCK TABLES `im_threads` WRITE;
/*!40000 ALTER TABLE `im_threads` DISABLE KEYS */;
INSERT INTO `im_threads` VALUES
(1,'1-2',1,'2025-12-29 14:47:47','2025-12-29 14:49:42'),
(2,'1-5',1,'2025-12-29 14:49:29',NULL),
(3,'1-7',1,'2025-12-30 15:01:51','2025-12-30 15:04:21'),
(4,'1-8',1,'2025-12-30 16:20:36','2025-12-30 16:29:36');
/*!40000 ALTER TABLE `im_threads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_anagrafiche`
--

DROP TABLE IF EXISTS `tb_anagrafiche`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_anagrafiche` (
  `id_anagrafica` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `id_tipologia` tinyint(3) unsigned NOT NULL,
  `id_sdi_regime_fiscale` tinyint(3) unsigned DEFAULT NULL,
  `is_pa` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `stato` enum('attiva','disattiva') NOT NULL DEFAULT 'attiva',
  `ragione_sociale` varchar(160) NOT NULL,
  `piva` varchar(16) DEFAULT NULL,
  `codice_fiscale` varchar(16) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_anagrafica`),
  KEY `idx_anag_ragione` (`ragione_sociale`),
  KEY `idx_anag_piva` (`piva`),
  KEY `idx_anag_cf` (`codice_fiscale`),
  KEY `fk_anag_tipologia` (`id_tipologia`),
  KEY `fk_anag_sdi_rf` (`id_sdi_regime_fiscale`),
  CONSTRAINT `fk_anag_sdi_rf` FOREIGN KEY (`id_sdi_regime_fiscale`) REFERENCES `cfg_sdi_regime_fiscale` (`id_regime`) ON DELETE SET NULL,
  CONSTRAINT `fk_anag_tipologia` FOREIGN KEY (`id_tipologia`) REFERENCES `cfg_tipologia_anagrafica` (`id_tipologia`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_anagrafiche`
--

LOCK TABLES `tb_anagrafiche` WRITE;
/*!40000 ALTER TABLE `tb_anagrafiche` DISABLE KEYS */;
INSERT INTO `tb_anagrafiche` VALUES
(1,1,1,0,1,'attiva','MEDIAPRINT SRL','00865490676','00865490676','prova note update','2025-04-22 16:19:41','2025-12-23 15:54:11'),
(2,3,NULL,0,1,'attiva','POSTA NETWORK SRLS','01878120672','',NULL,'2025-04-22 16:23:37','2025-09-11 16:49:03'),
(3,1,NULL,0,1,'attiva','SUOLO E SALUTE SRL','01497070415','01497070415','SUOLO E SALUTE SRL\rVIA PAOLO BORSELLINO, 12/B\r61032 FANO(PU)\rPI 01497070415\rsoftware@suoloesalute.it\r\rCommerciale Renato  3487080911\r\rMarcello Tedesco348/5260863\rsoftware@pec.suoloesalute.it\ramministrazione@pec.suoloesalute.it\rsoftware@suoloesalute.it\rper anteprime invio pec: \ramministrazione@pec.suoloesalute.it\r','2025-04-22 16:47:37','2025-09-09 18:12:34'),
(4,1,NULL,0,1,'attiva','PROVINCIA E AMBIENTE S.R.L.','01639410685','01639410685','Provincia e Ambiente S.p.A. società in house providing – Via del Concilio, 6 – 65121 – Pescara – P.I. 01639410685\r\r\rRecapiti:\remail: giancarmine.diciccio@provinciambiente.eu \rcell. 380/7973511\r\r333/4100915 cavallari \r085/2058819 adele esposito interno 6','2025-04-22 16:50:56','2025-09-01 16:59:00'),
(5,1,NULL,0,1,'attiva','EDELTRIBUTI SOCIETA’ A RESPONS ABILITA’ LIMITATA SEMPLIFICATA','00929020949','00929020949','EDELTRIBUTI SOCIETA’ A RESPONSABILITA’ LIMITATA SEMPLIFICATA \rP. IVA 00929020949\rPIAZZA MUNICIPIO 19/A 86048 FORLI’ DEL SANNIO (IS)\redeltributi@virgilio.it \rReferente GIACINTO IARUSCI 3296955773\r\rAntonella La Gatta 3486631684\r\r\r\r\r','2025-04-22 16:52:59','2025-08-21 17:41:17'),
(6,1,NULL,0,1,'attiva','COMUNE DI POGGIO BUSTONE - UFF_EFATTURAPA','00108830571','00108830571',NULL,'2025-04-22 16:57:28','2025-04-22 16:58:05'),
(7,1,NULL,0,1,'attiva','COMUNE DI SAN BENEDETTO DEL TRONTO - UFF_EFATTURAPA','00360140446',NULL,'\rzazzettap@san-benedetto-del-tronto.gov.it\rMarco Tirabassi <tirabassim@san-benedetto-del-tronto.gov.it>\rtirabassim@san-benedetto-del-tronto.gov.it\rgelosib@comunesbt.it\rriscossionecoattiva@comunesbt.it\r\rIndirizzo: Viale Alcide de Gasperi, 124, 63074 San Benedetto del Tronto Ascoli Piceno \r\rTelefono:0735 7941 \r\rCappelletti Giovanni 3771614323 commerciale poste italiane\rbarbara pierantozzi 0735794546 amministrazione\r\r;isa.galbiati@entedigitaletributi.it  \r\rzazzettap@san-benedetto-del-tronto.gov.it\rTirabassi Marco : tirabassim@san-benedetto-del-tronto.gov.it\r\rPaola Zazzetta\rUfficio riscossione coattiva\rSettore Gestione Risorse\rComune di San Benedetto del Tronto\rTelefono 0735 794521-525\remail: zazzettap@san-benedetto-del-tronto.gov.it\r','2025-04-22 17:00:31','2025-04-22 17:01:01'),
(8,1,NULL,0,1,'attiva','COMUNE DI TORTORETO','00173630674',NULL,'FATTO SOLO PREVENTIVO\rmarchegiani 3351548803\rFORNITURE@COMUNE.TORTORETO.TE.IT\r\rSCARANARI  Maria Rosaria DIRETTO 0861 785339\rDott.ssa Federica D\'Antonio\rTel: 0861/785378\r\rIl reso cartaceo del data entry dovrà essere riconsegnato in via Carducci , 8 Tortoreto lido ','2025-04-22 17:08:43','2025-04-22 17:08:44'),
(9,2,NULL,0,1,'attiva','L.M.D. GLOBAL S.R.L.','02513050449','02513050449','POSTALIZZATORE PRIVATO ','2025-04-22 17:12:09','2025-04-22 17:12:10'),
(10,1,NULL,0,1,'attiva','AG.EN.A. SOCIETA’ A RESPONSABILITA’ LIMITATA','01522110673',NULL,'contratto fornitura bollettazione periodica\rcontabilità - Manola Pompilii - AGENA Teramo\rstampa ed imbustamento 0,18 +iva\roneri affrancatura 0,60 esente iva art 15\rgestione file euro 10,00\rAGENA SCRL E’ PIAZZA GARIBALDI 56, 64100 TERAMO\r\rcliente di chi cerca trova\r\r\r12 uscite 1/2  pagina  a € 55,00  c.u totale 660,00 + iva','2025-04-22 17:13:00','2025-07-28 12:04:24'),
(11,3,NULL,0,1,'attiva','SCELGO S.P.A.','01679850675','01679850675','cliente di riferimento\r\rDIRETTO GIORDANA 0861/8050228 cell 349/8421650\rDIRETTO ELITA  0861/8050238\r\rAntonini Davide -  amministratore\r\rx fatture     mgrazia.belleggia@multicash.it','2025-04-22 17:15:06','2025-04-22 17:15:50'),
(12,1,NULL,0,1,'attiva','ARTELITO S.P.A.','01413450436',NULL,NULL,'2025-04-22 17:16:41','2025-04-22 17:17:00'),
(13,1,NULL,0,1,'attiva','GISERVICE SRL','01632540678','01632540678','\rGiservice srl\rvia del Baluardo 10\r64100 Teramo\rP.Iva / Cod. Fiscale 01632540678\rCodice Destinatario KRRH6B9\r\rMobile 335 1313039\r\r','2025-04-22 17:19:50','2025-04-22 17:19:51'),
(14,1,NULL,0,1,'attiva','AGE SRL','09497361007','09497361007','ARTIGRAFICHE PICENE \r\rAGE SRL\r- Sede legale : Via di Donna Olimpia n. 20 -00152 – Roma\r- P.I. e C.F. 09497361007\r- Codice univoco: BA6ET11\r- pec: consorzioage@pec.it\r-IBAN: IT53I0344122000CC0160521837\r','2025-04-22 17:21:47','2025-04-22 17:23:16'),
(15,1,NULL,0,1,'attiva','COMUNE DI BELLANTE','00212050678',NULL,'Comune di Bellante (TE) - Piazza Mazzini, 1 - 64020 Bellante (TE) - Tel 0861.61701 - Fax 0861.6170330\rPEC protocollo@pec.comune.bellante.te.it - Mail protocollo@comune.bellante.te.it -  P.IVA 00212050678 - c/c postale n. 10750644\r\rDI GIUSEPPE diretto 08616170338 - 3393684818','2025-04-22 17:28:48','2025-12-19 18:11:36'),
(16,1,NULL,0,1,'attiva','COMUNE DI CITTÀ SANT’ANGELO',NULL,'00063640684','DIRETTO Dott.ssa VERRIGNI 085 9696275\r\rResponsabile affidamenti Dott.ssa De Berardinis diretto 0859696228 mail : stefania.deberardinis@comune.cittasantangelo.pe.it\r\r;elena.verrigni@comune.cittasantangelo.pe.it;verrigni.e@comune.cittasantangelo.pe.it\rvalerio.danteo@comune.cittasantangelo.pe.it\r0859696211\r 085.9696.270Franca Crocetta ','2025-04-22 17:32:14','2025-05-08 12:49:18'),
(17,1,NULL,0,1,'attiva','ARTIGRAFICHE DI GALVAN IVANO & C. - S.N.C.','00201290681','00201290681',NULL,'2025-04-22 17:41:43','2025-12-19 18:11:36'),
(18,1,NULL,0,1,'attiva','O.P.S. S.P.A.','01891040691',NULL,'\rroberta.gallo@opschieti.it -> anteprime per lavorazione CPS\r\rInviare anteprime anche a \rprogrammazione.vit@opschieti.it\r\rcontratto fornitura bollettazione periodica\rprogrammazione.vit@opschieti.it; opschieti@pec.aruba.it\r\rLuciano Consorti 0871/5857241-223-232\r\rBollo ed affrancatura posta prioritaria 0,85 + IVA\rstampa ed imbustamenti 0,13 +iva\rposta raccomandata  tipo 1 e tipo 2 prezzi affrancatura euro 3,8 +\r lav euro 0,39\rdal 1/06/12 \raffrancature euro 0,60 esente iva \rlavorazioni di posta prioritaria a euro 0,17\r\r PER CONTABILITà \rPAOLO DI SIPIO 0871/5857210  x fatture    email : info.ops@opschieti.it\rF. Stampone Responsabile tecnico 0871/5857232  349/4598820   331/2302492\r\rFERDINANDO    0871/5857232  349/4598820\rpaolo.disipio@opschieti.it\rGIOVANNI MAY 335/1823022\r0871 5857243 ROBERTA GALLO \rIdentificativo fiscale ai fini IVA: IT01891040691 \r\rDenominazione: OPS SPA  \r\rIndirizzo: VIA PADRE U. FRASCA \r\rComune: CENTRO DIR. DAMA - CHIETI SCALO \r\rProvincia: CH \r\rCAP: 66100 \r\rNazione: IT \r\rCodice Destinatario M5UXCR1\r \r\r','2025-04-22 17:50:10','2025-12-19 18:11:36'),
(19,1,NULL,0,1,'attiva','MAGIF SERVIZI S.R.L.','01257860567',NULL,'Magif Servizi Srl \rVia San Donato snc 01030 CARBOGNANO (VT) \rPI 01257860567\rAmministratore Magif Servizi è Mizzella Marisa\r0761/613199 \remail amministrazione@magifservizi.it   Amministratore Marco Nardocci +39 3357353702\r\r!!!!!!!!!!!!!!!!!per info tecniche inviare a : areatecnica@magifservizi.it\r\rNostro referente a cui inviare all’ATT off è Marco Mizzella (del quale ho cellulare personale)\rmarco@magifservizi.it\rper la parte webmaster metta Tiziana Tinnirello email webmaster@magifservizi.it telefono 3498654863,               nardocci3920132602\r\r\rReferenti webmaster \rLuigi Scorrano +39 3920132602 webmaster@magifservizi.it\rTiziana Tinnirello tiziana.tinnirello@gmail.com \rMarco Nardocci +39 3357353702  marco@magifservizi.it\r\r\r','2025-04-22 17:56:11','2025-04-22 17:56:51'),
(20,1,NULL,0,1,'attiva','COMUNE DI MONTELPARO',NULL,'81000670448',NULL,'2025-04-22 17:58:42','2025-04-22 17:58:43'),
(21,1,NULL,0,1,'attiva','SINERGIE MANAGEMENT TEAM DI CARLA GABRIELLI & C. S.A.S.','02113600429','02113600429','SINERGIE MANAGEMENT TEAM sas di C. GABRIELLI & C.\rCodice Fiscale:   02113600429\rSede legale:          VIA SALARIA, 34 – 63079 – COLLI DEL TRONTO (AP)\r\r\r\r','2025-04-22 18:02:00','2025-04-22 18:02:01'),
(22,3,NULL,0,1,'attiva','POLISERVICE S.P.A.','01404160671',NULL,'Daniela saccuti 320/3297417\rRusciano 320/3297421\r\r\rFATTURARE A (NO SPLIT PAYMENT)\rPOLISERVICE SPA\rPIAZZA G.MARCONI, 10\r64015 NERETO (TE)\rP.IVA 01404160671\rCODICE: DDJIYTO\r\r','2025-04-22 18:03:59','2025-04-22 18:04:21'),
(23,1,NULL,0,1,'attiva','COMUNE DI ROSETO DEGLI ABRUZZI','00176150670',NULL,'COMUNE DI ROSETO DEGLI ABRUZZI\rP.I. 00176150670                              http://www.comune.roseto.te.it/ \rSettore III  “Ragioneria-Programmazione  Economica–Finanze –Patrimonio–Farmacia”\r GABRIELLA INNAMORATI 085/89453615\rUfficio Acquisti-Economato\r-     Tel.:  085 89453 1 \r-     Fax:  085 89453 620\rE-mail: digianvittorio.roberto@comune.roseto.te.it  085-89453607\rdimarzio.ingrid@comune.roseto.te.it - 085-89453651\rgestione lampade votive La valle   085/89453562\rAlberto 3283327845\r\rMATRiCIANI ALBERTO - GESTIONE TESORERIA 08589453622\r\rPiazza della Repubblica \r64026 Roseto degli Abruzzi (TE) ','2025-04-22 18:08:19','2025-07-31 16:34:56'),
(24,1,NULL,0,1,'attiva','COMUNE DI MARTINSICURO','00505580670','82001180676','DIRETTO PIERO 0861/768255\rDIRETTO SANDRA 0861/768254\r\r','2025-04-22 18:14:18','2025-04-22 18:14:19'),
(25,1,NULL,0,1,'attiva','COMUNE DI GAETA - UFF_EFATTURAPA','00142300599',NULL,'Comune di Gaeta\rPiazza XIX Maggio 10\r04024 Gaeta LT\r\r0771 4691 \r\rCOSAP --> D.ssa Sciarra--> 0771469411\r\rserenella 347/1473441\rD.ssa Serenella Simeone - Funzionario tributi - Comune di Gaeta <serenella.simeone@comune.gaeta.lt.it>','2025-04-22 18:16:35','2025-04-22 18:16:54'),
(26,1,NULL,0,1,'attiva','COMUNE DI FONTE NUOVA','06905571003','97249250586','18577,50\r\rUFFICIO ISTRUZIONE vsbordone@fonte-nuova.it;\r\rNazzareno Rosari <nrosari@fonte-nuova.it>  06/905522355\r\rVeronica 3208160647\rgiorgio  06/905522357    3394660651\rlinda 06/905522356 347/1788155\rsbordone 320/8160647\rCODICE UFFICIO FATTURA:   L6CMCF - PUBBICA ISTRUZIONE','2025-04-22 18:33:15','2025-04-22 18:33:55'),
(27,1,NULL,0,1,'attiva','FC GRAFICA ALLESTIMENTI GRAFICI','02016240687',NULL,'ABI : 08473\rCAB: 77250\rMontesilvano 11/07/2016\rOggetto: variazione coordinate bancarie\rCon la presente si portano a conoscenza fornitori e clienti della variazione delle nostre\rcoordinate bancarie :\rNUOVO IBAN : IT 78 W 08473 77250 000000127977\rBCC di Castiglione Messeraimondo e Pianella\rFiliale di Città Sant’Angelo, via Tito De Cesaris, 4 (PE).\rVi invitiamo, pertanto, a prenderne nota e aggiornare le VS. anagrafiche sia per le emissioni di\rricevute bancarie che per la disposizione di bonifici.\rRingraziamo per la cortese collaborazione e porgiamo cordiali saluti.\rRina Ricci','2025-04-23 10:17:52','2025-04-23 10:22:12'),
(28,1,NULL,0,1,'attiva','S.I.E.L. S.R.L.','01565050448',NULL,'MAGGIOLI S.p.A. \rVia del Carpino, 8 - 47822 Santarcangelo di Romagna (RN) \rCapitale Sociale Euro 2.197.920,00 i.v. \rIscrizione Registro delle Imprese della Romagna Forlì-Cesena e Rimini e Codice Fiscale 06188330150 \rR.E.A. RN-219107 \rPartita IVA 02066400405 \rLa società incorporante Maggioli S.p.A. a far data dal 01/09/2024, subentra di diritto, ai sensi dell\'art. 2504 bis e.e., in tutti i rapporti giuridici di qualsiasi natura facenti capo alla suddetta società incorporata SIEL Sri.\rPertanto le fatture e ogni altro documento fiscale riportante la data dal 01/09/2024 dovranno essere intestati a MAGGIOLI S.p.A. \r\r\rcontatto generato ad agosto 2015 e seguito da Mariano con l\'amminstartore\r utilizzano Postel come unico fornitore pagano un prezzo di 0,80 iva incl per il servizio di invio 3 elementi, hanno accordi con poste per lo scambio di software, ma sono anche concorrenti, hanno circa 200 Comuni di cui circa 60 gestiscono invio tributi\r\rGianluca Giandomenico (S.I.E.L. srl) <luca@sielsrl.net>','2025-04-23 10:25:42','2025-04-23 10:25:43'),
(29,1,NULL,0,1,'attiva','PALITALSOFT S.R.L','00994810430',NULL,'BANCA POPOLARE ANCONA – Ag. Nr. 1 – JESI (AN)\rCodice IBAN: IT 42 V 05308 21285 00000000788\r\rcomune di tradate sig gianluca 348/5132024\r\ramministrazione roberta  0731 229108\r\rRosanna Rossi Brunori T. +39 0731 229197\rAPRA 0731 22911\r\rSIG.RA GAGGIA DI GESENU 0755743604','2025-04-23 10:28:40','2025-12-19 18:11:36'),
(30,1,NULL,0,1,'attiva','COMUNE DI SPINETOLI','00362890444',NULL,'Comune di Spinetoli\rPiazza Leopardi, 31 - 63078 Spinetoli (AP) - Tel.0736/890298 - Partita Iva: 00362890444 - PEC: protocollo@pec.comune.spinetoli.ap.it -\r\r15/12/22 Daniela Felicioni - Tributi Spinetoli <daniela.felicioni@comune.spinetoli.ap.it> \r0736899060\r\rgiuseppe d\'angelo 0736/899060','2025-04-23 10:31:22','2025-04-23 10:31:23'),
(31,1,NULL,0,1,'attiva','COMUNE DI BELMONTE PICENO','00433470440','81001490440','cliente di Mara sinergie \r\r','2025-04-23 10:32:42','2025-04-23 10:32:59'),
(32,1,NULL,0,1,'attiva','ENTE DIGITALE TRIBUTI SRL','08648600966','08648600966','BANCA POPOLARE DI MILANO\rC/C 0000798\rIBAN IT35S0558432430000000000798\r marialisagalbiati@alice.it \r\risa.galbiati@entedigitaletributi.it  \r\rfabio.giudetti@entedigitaletributi.it','2025-04-23 10:36:01','2025-04-23 10:36:02'),
(33,1,NULL,0,1,'attiva','COMUNITA’ DI S.EGIDIO - ACAP - APS','02132561008','80191770587','OLIVIERI X Sant\'egidio 0658566354\rStella Cervogni 06585661  mobile 3395071971\rPaola Federici  3388256177\rValeria Olivieri 3357470254\r\r\r','2025-04-23 10:41:36','2025-05-08 12:49:21'),
(34,1,NULL,0,1,'attiva','D’AURIA PRINTING S.P.A.','00954720678','01168680682','D’AURIA PRINTING SPA\rSede legale: Via dell’Aspo 1 – 63100 Ascoli Piceno - AP\rSede operativa e recapito: Zona industriale destra Tronto – 64016 Sant’Egidio alla Vibrata - TE\rCodice fiscale       01168680682\rPartita IVA           00954720678\rCodice SDI           SUBM70N    (sesto carattere pari a zero)\rdauriaprinting@pec.it\rIBAN IT86 H 03069 13506 1000 0000 2177\r\r\r','2025-04-23 10:52:26','2025-05-08 12:48:26'),
(35,1,NULL,0,1,'attiva','LITOEMME SRL','01846690442',NULL,'LITOEMME S.r.l. Unipersonale\r\rVia Archetti, scn\r63831 RAPAGNANO (Fermo)\rTel. 0734.518014 - 0734.515642\rFax 0734.514549\rwww.litoemme.it\rE-mail: info@litoemme.it\rPartita IVA 01846690442\rCap. Soc. 100.000,00 euro i.v.\rBanca della provincia di Macerata\rAgenzia di Porto San Giorgio (FM)\rAbi 03317 • Cab 69660\rIBAN IT97Y\r?03317?\r69660000310300241\r\r\r\r','2025-04-23 10:55:50','2025-04-23 10:56:51'),
(36,1,NULL,0,1,'attiva','COMUNE DI FORMIA','00087990594','81000270595','Codice Ufficio JIJWR5 - Ufficio Fatturazione \rPEC SERVIZIO FATTURAZIONE finanza@pec.cittadiformia.it \rCANALE DI TRASMISSIONE PEC \rPosta elettronica Dirigente del Settore Dr.ssa livornese : tlivornese@comune.formia.lt.it \r \rc/a livornese Tiziana \rmastantuono 3394025400\r\rresponsabile tributi Dr. Daniele Rossi 0771778850\rdrossi@comune.formia.lt.it\r \r\r','2025-04-23 10:59:02','2025-04-23 10:59:03'),
(37,1,NULL,0,1,'attiva','COMUNE DI ITRI','00279170591','81003170594','Piazza Umberto I, 1 - 04020 Itri (LT)\rTel. 0771.7321 - Fax 0771.721108\rP.IVA: 00279170591 \rC.F.: 81003170594\r\rgiorgio.colaguori@libero.it; tributi@comune.itri.lt.it\r','2025-04-23 11:00:23','2025-04-23 11:00:41'),
(38,1,NULL,0,1,'attiva','COMUNE DI SANTE MARIE','00191110667','00191110667',NULL,'2025-04-23 11:01:40','2025-12-19 18:11:36'),
(39,1,NULL,0,1,'attiva','COMUNE DI MACHERIO','00702660960','01039700156','     Il Responsabile Uffici  (Dott. Benedetto Cavallé)\r\r','2025-04-23 11:02:43','2025-12-19 18:11:36'),
(40,1,NULL,0,1,'attiva','COMUNE DI RICCIONE','00324360403','00324360403','ufficio pagamenti  kATIA  0541/608354\rTamara 3315222646 da chiamare solo x urgenze\r\rValeria 0541 608260\rGrossi Daniele 0541 608250\r\rMI5WX4 \r\r','2025-04-23 11:04:18','2025-04-23 11:04:19'),
(41,1,NULL,0,1,'attiva','COMUNE DI VIMODRONE','00858950967','07430220157',NULL,'2025-04-23 11:06:45','2025-12-19 18:11:36'),
(42,1,NULL,0,1,'attiva','COMUNE DI ACQUAVIVA PICENA','00376660445',NULL,NULL,'2025-04-23 11:09:30','2025-04-23 11:09:31'),
(43,2,NULL,0,1,'attiva','MAIL EXPRESS POSTE PRIVATE SRL','01436910671','01436910671','Via Pascoli, Zona Artigianale - C.da Ripoli\r64023 Mosciano S.Angelo (TE)\rCentralino: 085.90.40.350\rFax: 085.80.71.977\r\rReferente. Dott. Franco Gaspari \r\rFabio il Grande  3475562922','2025-04-23 11:11:10','2025-05-08 12:50:44'),
(44,1,NULL,0,1,'attiva','COMUNE DI CALLIANO','00410550222','00410550222','COMUNE DI CALLIANO - Via Roma, 117 - 14031 - Calliano  (AT)\r\rPer fatture Ornella','2025-04-23 11:12:08','2025-04-23 11:12:09'),
(45,1,NULL,0,1,'attiva','CVM - COMUNITÀ VOLONTARI PER IL MONDO','02130480425','00316140433','Dir. Comunicazione e Raccolta Fondi\rCVM - Comunità Volontari per il Mondo\rV.le delle Regioni,6\r63822 - Porto San Giorgio (FM)\r0734/674832\r6 uscite   a € 200,00+ iva\rcvm.comunicazione@gmaail.com\rcoord.italia@cvm.an.it\r\rAscani Attilio  3202492203','2025-04-23 11:13:49','2025-04-23 11:13:50'),
(46,1,NULL,0,1,'attiva','BANCA DI CREDITO COOPERATIVO DELL’ADRIATICO TERAMANO SOC CO','15240741007','01469670671','AGGIORNATA p.iva modificata il 19/8/2019\rofelio.liberati@fedam.bcc.it\rBernava Arturo 085/8071544 (int.207) \rcell 3388608575.\rcome da accordi telefonici, le comunico i miei riferimenti di segreteria generale:\rPaolo Ruffini\rpaolo.ruffini@fedam.bcc.it\rtel. 085.8077544.201\rPAOLO RUFFINI  085/8071544 (int.2 poi 1) - 3282921847 ','2025-04-23 11:16:18','2025-05-08 12:49:32'),
(47,1,NULL,0,1,'attiva','COMUNE DI PIZZOLI','80007080668','80007080668','329-4523278 Alessia Salvatori Pizzoli\r\r','2025-04-23 11:18:00','2025-04-23 11:18:01'),
(48,1,NULL,0,1,'attiva','COMUNE DI SAN VITO CHIETINO','00094240694',NULL,'Comune di San Vito Chietino\rLargo Altobelli, 1 - 66038 San Vito Chietino\rTel. 0872.61911 - Fax 0872.619150\re-mail: info@comunesanvitochietino.gov.it - pec: protocollosanvitochietino@pec.it\rP. I.V.A. 00094240694\r\rUFB9OX.\r\r','2025-04-23 11:19:25','2025-04-23 11:19:26'),
(49,1,NULL,0,1,'attiva','TIPOGRAFIA S. GIUSEPPE SRL','00082440439',NULL,'STEFANO 3470751321\r\rIBAN aggiornato il 27/2/2019','2025-04-23 11:20:26','2025-04-23 11:20:27'),
(50,1,NULL,0,1,'attiva','COMUNE DI OPI','00181620667','00181620667',NULL,'2025-04-23 11:21:07','2025-12-19 18:11:36'),
(51,1,NULL,0,1,'attiva','COMUNE DI PESCINA','00215570664',NULL,'COMUNE DI PESCINA (AQ) Piazza Mazzarino - 67057 Pescina ( AQ)  Tel  0863-84281 - Fax 0863-841067 ','2025-04-23 11:22:04','2025-04-23 11:22:16'),
(52,1,NULL,0,1,'attiva','COMUNE DI ACQUASANTA TERME','00356080440',NULL,'Serena 0736/80162 interno 416 3342203224','2025-04-23 11:24:24','2025-04-23 11:24:25'),
(53,1,NULL,0,1,'attiva','COMUNE DI CASTEL DEL MONTE','00114540669','80002030668','nanni','2025-04-23 11:25:29','2025-12-19 18:11:36'),
(54,1,NULL,0,1,'attiva','COMUNE DI MORRO D’ALBA','00184460426','00184460426','Comune di Morro d\'Alba\rPiazza Romagnoli, 6 - 60030\rPEC comune.morrodalba@legalmail.it\r\r\r0731/63000 int.6 mancinelli marta','2025-04-23 11:26:26','2025-12-19 18:11:36'),
(55,1,NULL,0,1,'attiva','COMUNE DI PALMIANO','00424620441','80001650441',NULL,'2025-04-23 11:27:15','2025-04-23 11:27:33'),
(56,1,NULL,0,1,'attiva','AVIS SPINETOLI/PAGLIARE','92015220442','92015220442','ASSOCIAZIONE DONATORI\r\rspinetolipagliare.comunale@avis.it\r','2025-04-23 11:28:32','2025-04-23 11:28:33'),
(57,1,NULL,0,1,'attiva','COMUNE DI GRANAROLO DELL’EMILIA','00701911208','80008270375','Dott.ssa Daniela Ballandi\rComune di Granarolo dell\'Emilia\rvia S. Donato, 199 - 40057 Granarolo dell\'Emilia  Bo\rtel. 051/6004319  fax 051/6004385 \r\rcristiana.garavina@comune.granarolo-dellemilia.bo.it\r','2025-04-23 11:30:10','2025-05-08 12:49:45'),
(58,1,NULL,0,1,'attiva','COMUNE DI CONTROGUERRA','00592770671',NULL,'mauro scarpatonio 320/2895494','2025-04-23 11:31:27','2025-04-23 11:31:45'),
(59,1,NULL,0,1,'attiva','COMUNE DI ORICOLA','00181950668','00181950668',' Simonetta D\'Ortenzio 333/1351770','2025-04-23 11:33:15','2025-04-23 11:33:16'),
(60,1,NULL,0,1,'attiva','COMUNE DI LABRO','00108300575','00108300575',NULL,'2025-04-23 11:34:12','2025-04-23 11:34:13'),
(61,1,NULL,0,1,'attiva','COMUNE DI LECCE NEI MARSI','81004960662','81004960662',NULL,'2025-04-23 11:35:32','2025-04-23 11:35:33'),
(62,1,NULL,0,1,'attiva','COMUNE DI COLLI SUL VELINO','00108930579','00108930579','Servizi Finanziari | Comune Colli sul Velino <servizifinanziaricsv@comunecollisulvelino.it>','2025-04-23 11:36:23','2025-04-23 11:36:24'),
(63,1,NULL,0,1,'attiva','TEKNOPOST SRL','02286920695','02286920695','Service e postalizzatore privato','2025-04-23 11:38:23','2025-04-23 11:38:24'),
(64,1,NULL,0,1,'attiva','A.F.G. S.R.L.','01918421007','07959250585','AFG Srl \rP.IVA 01918421007 C.F. 07959250585\rSede Operativa: Via Colli, 14/A – 67069 Tagliacozzo (AQ)\rTel: 0863698635 Fax: 0863688035\re-mail: info@afgsrl.com PEC: info@pec.fgsrl.eu\rCodice Univoco Fatturazione M5UXCR1\r\r','2025-04-23 11:41:20','2025-07-31 16:52:14'),
(65,1,NULL,0,1,'attiva','COMUNE DI ALFEDENA','00201210663','82000570661',NULL,'2025-04-23 11:54:46','2025-04-23 11:55:04'),
(66,1,NULL,0,1,'attiva','COMUNE DI MASSA D’ALBE','00187170667',NULL,NULL,'2025-04-23 11:55:43','2025-05-08 12:49:49'),
(67,1,NULL,0,1,'attiva','COMUNE DI CASTIGNANO','00358540441','00358540441','Comune di Castignano - SITO ISTITUZIONALE\rVia Margherita, 25 | 63072 Castignano (AP)\rtel: 0736 822128/821432| fax: 0736 822086 \rP.iva: 00358540441  |  Cod.fisc.: 00358540441\rUF21RT\r\r\rVecchia email:\rValloraghi.roberta@comune.castignano.ap.it','2025-04-23 11:56:57','2025-12-19 18:11:36'),
(68,1,NULL,0,1,'attiva','COMUNE DI ORTONA DEI MARSI','00224020669',NULL,NULL,'2025-04-23 11:57:33','2025-04-23 11:57:34'),
(69,1,NULL,0,1,'attiva','COMUNE DI SIROLO','00349870428','00268450426','RICHIESTA TELEFONICA  PREVENTIVO DEL 22/07/2016 \r\rroberta.draghelli@comune.sirolo.an.it\r\rla partita iva 00349870428\r\rcodice fiscale 00268450426','2025-04-23 11:58:30','2025-04-23 11:58:31'),
(70,1,NULL,0,1,'attiva','COMUNE DI BISEGNA','00213000664',NULL,'Via Vittorio Emanuele, 67050 Bisegna AQ\rTelefono: 0863 85283\r\r','2025-04-23 11:59:28','2025-04-23 11:59:29'),
(71,1,NULL,0,1,'attiva','COMUNE DI MORRO REATINO','00108310574',NULL,'email segretario matteocci.segretariocomunale@gmail.com','2025-04-23 12:00:35','2025-04-23 12:00:53'),
(72,1,NULL,0,1,'attiva','COMUNE DI MONTEGALLO','00357070440',NULL,'Comune di Montegallo - SITO ISTITUZIONALE\rFrazione Balzo Piazza Taliani, 5 | 63094 Montegallo (AP)\rTel: (+39) 0736-806122\r\rresponsabile tributi Petrocchi Romea 0736806122','2025-04-23 12:01:30','2025-04-23 12:01:48'),
(73,1,NULL,0,1,'attiva','COMUNE DI PIANELLA','00225910686',NULL,'Comune di Pianella \r Piazza G. Garibaldi, 13 \r 65019 Pianella (Pe) \r Posta elettronica certificata: protocollo@pec.comune.pianella.pe.it \r	Centralino: +39.085.97301 \r P. IVA 00225910686 \r\rLORENA GIANSANTE 3299813487','2025-04-23 12:02:10','2025-12-19 18:11:36'),
(74,1,NULL,0,1,'attiva','COMUNE DI OFENA','00630840668',NULL,NULL,'2025-04-23 12:03:06','2025-12-19 18:11:36'),
(75,1,NULL,0,1,'attiva','COMUNE DI CARASSAI','00730930443','82001930443','Cliente di sinergie Mara \r\r\r329/6217105 Giovanni SASSU ','2025-04-23 12:04:08','2025-12-19 18:11:36'),
(76,1,NULL,0,1,'attiva','COMUNE DI MONTEMONACO','00357080449',NULL,'Comune di Montemonaco\rPiazza Risorgimento 8\r63088 Montemonaco AP','2025-04-23 12:05:07','2025-04-23 12:05:08'),
(77,1,NULL,0,1,'attiva','COMUNE DI SANT’OMERO','00523850675','00523850675','Comune di Sant\'Omero\r(Provincia di Teramo)\rVia Vittorio Veneto - 64027 Sant\'Omero (Teramo)\rCentralino 0861/88.098\rFax 0861/88.555\rurp@comune.santomero.te.it\r\rSINDACO ANDREA LUZI 3204863431\r','2025-04-23 12:08:19','2025-05-08 12:49:55'),
(78,1,NULL,0,1,'attiva','AIRONE SERVIZI S.R.L.','02623230121','02623230121','Airone Servizi srl\rVia Groane 42/A\r20812 Limbiate\rC.F. e P.IVA 02623230121\rCodice destinatario KRRH6B9\r\rUnicredit IBAN: IT95G02008332610000027770101 -> errato 28 caratteri\r\r\r\r\r','2025-04-23 12:11:29','2025-04-23 12:11:47'),
(79,1,NULL,0,1,'attiva','COMUNE DI MONTEFIORE DELL’ASO','00291360444','00291360444',NULL,'2025-04-23 12:12:16','2025-05-08 12:50:00'),
(80,1,NULL,0,1,'attiva','COMUNE DI MONTEFORTINO','00400660445',NULL,'CLIENTE SINERGIE MANAGEMENT TEAM sas di C. GABRIELLI & C.','2025-04-23 12:13:19','2025-04-23 12:13:20'),
(81,1,NULL,0,1,'attiva','COMUNE DI SCOPPITO','00183860667',NULL,NULL,'2025-04-23 12:14:36','2025-12-19 18:11:36'),
(82,1,NULL,0,1,'attiva','COMUNE DI LAZZATE','00758650964','03611240155',NULL,'2025-04-23 12:15:12','2025-04-23 12:15:13'),
(83,1,NULL,0,1,'attiva','CISIA PROGETTI - SOCIETA’ A RESPONSABILITA’ LIMITATA','00566000675',NULL,'ROMANO MARINO CISIA 3492638177\rr.marini@cisiaprogetti.it\rAREA FTP CONSEGNA DATI DATA ENTRY:\r\rM\rusername: cisiaprogetti\rPw:            f6de6a776e0\r','2025-04-23 12:16:38','2025-07-31 18:25:54'),
(84,1,NULL,0,1,'attiva','COMUNE DI CAMPLI',NULL,'80005970670','Comune di Campli\rVia V. Emanuele II 9\r64012 Campli TE','2025-04-23 12:17:47','2025-04-23 12:17:48'),
(85,1,NULL,0,1,'attiva','COMUNE DI CAMPO DI GIOVE','00189320666','92018480669','Comune Campo di Giove\rPiazza Regina Margherita, 6 - 67030 CAMPO DI GIOVE (AQ) IT\rTel:+39 086440116 - Fax:+39 0864 408040 - C.F.92018480669 - P.IVA 00189320666\rPEC: comune.campodigiove.aq@pec.comn\r\r\rdott.ssa Maria Verna ufficio tributi 0864.40116 - Int. 6 - 7','2025-04-23 12:19:12','2025-04-23 12:19:13'),
(86,1,NULL,0,1,'attiva','COMUNE DI CASTELLALTO','00267060671','80004770675',NULL,'2025-04-23 12:20:12','2025-04-23 12:20:13'),
(87,1,NULL,0,1,'attiva','COMUNE DI CERIANO LAGHETTO','01617320153',NULL,NULL,'2025-04-23 12:21:04','2025-04-23 12:21:05'),
(88,1,NULL,0,1,'attiva','COMUNE DI CISTERNINO','02152680746',NULL,NULL,'2025-04-23 12:21:55','2025-12-19 18:11:36'),
(89,1,NULL,0,1,'attiva','COMUNE DI CIVITELLA DEL TRONTO','00467160677',NULL,'COMUNE DI CIVITELLA DEL TRONTO\rDott.ssa Marina Bozzelli\rArea Ragioneria e Tributi\rUfficio Tributi\rVia Mazzini,34\r64010 CIVITELLA DEL TRONTO (TE)\rTel 0861 918321 \r','2025-04-23 12:22:47','2025-04-23 12:22:48'),
(90,1,NULL,0,1,'attiva','COMUNE DI COPERTINO','02255920759','80008830756','Cod. Fiscale 80008830756 P.Iva 02255920759. Indirizzo Comune di Copertino – Area AA.GG. e Fin. Settore finanziario – Via Malta 10 – 73043 Copertino \rIL DIRIGENTE AREA AA.GG. E FIN.\rDR. ALESSANDRO CAGGIULA  \r','2025-04-23 12:24:28','2025-12-19 18:11:36'),
(91,1,NULL,0,1,'attiva','COMUNE DI COREGLIA ANTELMINELLI','00357880467',NULL,'Piazza Antelminelli, 8\r 55025 – Coreglia Antelminelli – LU\rTelefono:  +39 0583 78152\r Fax:  +39 0583 78419\r\rCellulare Reperibilità:  335 215573\rragioneria 058378344\r','2025-04-23 12:25:47','2025-04-23 12:26:05'),
(92,1,NULL,0,1,'attiva','COMUNE DI FALERONE','81001750447','81001750447','Comune di Falerone\rPiazza della Concordia 6\r63837 Falerone FM\r0734 719813','2025-04-23 12:26:24','2025-12-19 18:11:36'),
(93,1,NULL,0,1,'attiva','COMUNE DI FOLIGNANO',NULL,NULL,NULL,'2025-04-23 12:26:52','2025-04-23 12:26:53'),
(94,1,NULL,0,1,'attiva','COMUNE DI JESI','00135880425',NULL,'DOTTORESSA  PAOLA PICCIONE 0731/538441','2025-04-23 12:28:20','2025-04-23 12:28:38'),
(95,1,NULL,0,1,'attiva','COMUNE DI LORETO APRUTINO','00127900686','00127900686','Via Roma, 1\rLoreto Aprutino Pescara\r085 829401','2025-04-23 12:28:58','2025-04-23 12:28:59'),
(96,1,NULL,0,1,'attiva','COMUNE DI MONSAMPOLO DEL TRONTO','00395630445','82000530442','Rag. Stefano Giostra\rResponsabile del Procedimento\rTributi-Ced-Personale\rComune di Monsampolo del Tronto\rCorso Vittorio Emanuele III, 87 - 63077\rTel.: (+39) 0735-704116/704218 int. 6\rFax: (+39) 0735-706004\re-mail: tributi@comune.monsampolodeltronto.ap.it\r           ced@comune.monsampolodeltronto.ap.it\rPEC: comune.monsampolodeltronto@pec.it\r','2025-04-23 12:30:17','2025-04-23 12:30:18'),
(97,1,NULL,0,1,'attiva','COMUNE DI MONTESILVANO',NULL,'00193460680','Piazza Diaz, 1 - 65016 Montesilvano (PE) Telefono: +39.085.44811 - Fax: +39.085.834408 - Cod. Fisc 00193460680\r\rDi Adamo\r\r347 5200765\r\rSig. Lancianese','2025-04-23 12:31:46','2025-04-23 12:31:47'),
(98,1,NULL,0,1,'attiva','COMUNE DI MONTORIO AL VOMANO','00580460673',NULL,NULL,'2025-04-23 12:32:57','2025-04-23 12:32:58'),
(99,1,NULL,0,1,'attiva','COMUNE DI MORRO D’ORO','00516370673','81000370676',NULL,'2025-04-23 12:33:40','2025-05-08 12:50:35'),
(100,1,NULL,0,1,'attiva','COMUNE DI PORTO RECANATI','00255040438','00255040438','Comune di Porto Recanati\rpiazza Del Borgo, 12Porto\rRecanati - 62017 (62017) Marche\r\rCITTA’ DI PORTO  RECANATI\rProvincia di Macerata\rc.f. e IVA 00255040438  - UFFICIO ECONOMATO\rtel. 071/7599736-5 fax 071/7599739\rmail : economato@comune.porto-recanati.mc.it\rALLEGATO A –','2025-04-23 12:34:21','2025-04-23 12:34:22'),
(101,1,NULL,0,1,'attiva','COMUNE DI PORTO SAN GIORGIO','00358090447','81001530443','Comune di. Porto San Giorgio via Veneto, 5; cap:63822 tel: O734 6801, fax: O734 680234 C.F. 81001530443 - P.IVA 00358090447\r\rofferta MEPA aggiudicata il 04/09/2015 prezzo € 0,1745\rspese di spedizione a parte\rpeso entro i  20 gr.\rCONTATTI:\rDott. mercuri  (maurizio.mercuri@comune-psg.org)\rDott.ssa Bracalente Caterina (0734 680252) caterina.bracalente@comune-psg.org\r\rFABIO ANDRENACCI 0734/680210','2025-04-23 12:35:33','2025-12-19 18:11:36'),
(102,1,NULL,0,1,'attiva','COMUNE DI SAN SALVO','00247720691','00247720691','Dott.ssa Francesca Ciccotosto   Ufficio Tributi   tel. 0873/340227\r\r \r\r\r','2025-04-23 12:36:38','2025-12-19 18:11:36'),
(103,1,NULL,0,1,'attiva','COMUNE DI SANTI COSMA E DAMIANO','02186110595','81003550597',NULL,'2025-04-23 12:37:10','2025-04-23 12:37:11'),
(104,1,NULL,0,1,'attiva','COMUNE DI SCERNI','00236730693',NULL,'Comune di Scerni                                                                                                \rVia IV Novembre 18  66020 Scerni CH \rPIVA 00236730693  \r0873919125 pec protocollo@comunediscerni.legalmail.it\rCodice univoco UFMBAN\rReferente Tributi Raimondo Cianci tributi@comunediscerni.com\r\r  \r ','2025-04-23 12:38:00','2025-04-23 12:38:01'),
(105,1,NULL,0,1,'attiva','COMUNE DI SELLIA MARINA','00360710792','00360710792','COMUNE DI SELLIA MARINA\rP.IVA: 00360710792\rIndirizzo: Via Acqua Delle Mandrie SELLIA MARINA (CZ)','2025-04-23 12:39:12','2025-04-23 12:39:13'),
(106,1,NULL,0,1,'attiva','COMUNE DI TOSSICIA','00235690674','80000370678','Dott.ssa Gabriella Zuccarini\rResp. Ufficio Finanziario\r____________________________________\rCOMUNE DI TOSSICIA\rProvincia di Teramo\rServizio Finanziario\re-mail  P.E.C.: finanziario@comunetossicia.gov.it\rC. da Piana dell’Addolorata – 64049 Tossicia\rTel. 0861-698014 – fax 0861-698170\rC.F. 80000370678 – P.I. 00235690674\r\r','2025-04-23 12:39:48','2025-04-23 12:39:49'),
(107,1,NULL,0,1,'attiva','COMUNE DI COLLI DEL TRONTO - UFFICIO TECNICO COMUNALE','00355250440','00355250440',NULL,'2025-04-23 12:40:43','2025-04-23 12:40:44'),
(108,1,NULL,0,1,'attiva','COMUNE DI CORROPOLI','00425220670',NULL,' ass.llpp@comunedicorropoli.it\r\rALESSIA LUPI 3890631681\rRAGIONERIA 0861806526\rPIERLUIIGI 3403425204\r\r\rprotocollo@comunecorropoli.it\rAREATECNICA@COMUNECORROPOLI.IT; ASS.LLPP@COMUNECORROPOLI.IT','2025-04-23 12:42:16','2025-04-23 12:42:17'),
(109,1,NULL,0,1,'attiva','COMUNE DI SENIGALLIA','00332510429','00332510429',NULL,'2025-04-23 12:43:46','2025-12-19 18:11:36'),
(110,1,NULL,0,1,'attiva','COMUNE DI CROGNALETO','00164870677',NULL,NULL,'2025-04-23 12:44:42','2025-04-23 12:45:00'),
(111,1,NULL,0,1,'attiva','COMUNE DI CUPELLO','83000250692','83000250692','Comune di Cupello\rCorso Mazzini 1\r66051 Cupello CH\r\r','2025-04-23 12:45:09','2025-04-23 12:45:27'),
(112,1,NULL,0,1,'attiva','COMUNE DI LIVORNO FERRARIS','00403150022','84500230028',NULL,'2025-04-23 12:48:22','2025-04-23 12:48:23'),
(113,1,NULL,0,1,'attiva','COMUNE DI MINERBIO','00530291202',NULL,'Indirizzo: Via G. Garibaldi, 44, 40061 Minerbio BO\rOrari: Chiuso ora \rTelefono: 051 661 1711\rProvincia: Provincia di Bologna','2025-04-23 12:49:09','2025-04-23 12:49:10'),
(114,1,NULL,0,1,'attiva','COMUNE DI NERETO','00422080671',NULL,'Sindaco DANIELE LAURENZI   tel. 0861 806929 - 331 2469853 - 340 1569222\r\r\r\r347/4165423 Simona Di Francesco \r\r','2025-04-23 12:52:09','2025-04-23 12:52:10'),
(115,1,NULL,0,1,'attiva','COMUNE DI RIPATRANSONE','00370910440',NULL,'Giovanni 3296217105\r\r','2025-04-23 12:52:52','2025-12-19 18:11:36'),
(116,1,NULL,0,1,'attiva','COMUNE ROCCA DI BOTTE','00181800665','00181800665','Via delle Scuole, 2\rCAP	67066\rTelefono	0863-998131\rFax	0863-998017\rDati Amministrazione\rCodice Fiscale	00181800665','2025-04-23 12:53:30','2025-12-19 18:11:36'),
(117,1,NULL,0,1,'attiva','FARAONE S.R.L.','00321830671','00321830671','Federico\rVARIAZIONE IBAN\r\r	Vi informiamo che a partire dal giorno 16 maggio 2016 a seguito di integrazione di Banca Dell\'Adriatico in Intesa Sanpaolo il codice IBAN del nostro conto corrente bancario attuale sarà sostituito da nuovo IBAN come di seguito descritto:\r\r	BANCA INTESA SAN PAOLO SPA - F.LE DI ALBA ADRIATICA\r	IBAN: IT75 L030 6976 7210 2638 5060 157\r	BIC: BCITITMM\r\rInvitiamo di prendere buona nota di quanto sopra.\r\rDistinti saluti\r\r\r\rFARAONE SRL\r      (UFFICIO AMMINISTRATIVO)\r','2025-04-23 12:56:11','2025-12-19 18:11:36'),
(118,1,NULL,0,1,'attiva','GRAFICHE MARTINTYPE SRL','01630960670',NULL,'contab.for@martintype.it','2025-04-23 12:57:47','2025-04-23 12:58:05'),
(119,1,NULL,0,1,'attiva','GRAFICHE TACCONI SRL','01746580446',NULL,'GRAFICHE TACCONI SRL\rVIA 328/ma, 2-4\r63100 ASCOLI PICENO\rP.I. 01746580446\r','2025-04-23 12:58:33','2025-04-23 12:58:34'),
(120,1,NULL,0,1,'attiva','ITALRISCOSSIONI SOCIETA’ ITALI ANA DI FISCALITA’ LOCALE - SOC','06092371001','06092371001','347/6509828 DAVIDE ','2025-04-23 12:59:49','2025-05-08 12:50:15'),
(121,1,NULL,0,1,'attiva','UNIONE DI COMUNI CITTA’ DELLA FRENTANIA E COSTA DEI TRABOCCHI',NULL,'90019350694',NULL,'2025-04-23 13:01:45','2025-05-08 12:50:20'),
(122,1,NULL,0,1,'attiva','COMUNITA COLLINARE MONFERRATO VALLE VERSA','01329430050',NULL,'Dott.a daniela valfre\rUfficio Tributi\rComunità Collinare Monferrato Valle Versa\rPiazza Lanfranco, 1\r14039 Tonco (AT)\r\rwww.valleversa-monferrato.at.it\r\rEmail: tributi@valleversa-monferrato.at.it \rPEC: protocollo.valleversa@cert.ruparpiemonte.it\r\rtel: +39.0141.991510\rfax: +39.0141.991763\r','2025-04-23 13:02:32','2025-04-23 13:02:33'),
(123,1,NULL,0,1,'attiva','VAL VIBRATA COLLEGE FONDAZIONE','01593730672',NULL,'MAILING  x apertura nuovo anno solitamente in Ottobre/NOVEMBRE','2025-04-23 13:02:59','2025-04-23 13:03:00'),
(124,1,NULL,0,1,'attiva','VESTINA GAS E LUCE S.P.A','01671550687',NULL,'Cliente collegato alla Ditta Gargini Giuseppe Emmeci software\rAmministrazione Vestina <amministrazione@vestinagaseluce.it>\rinfo@vestinagaseluce.itCV\r\rBeatrice   Cesarano 349-2622836 \'beatrice.cesarano@augustaratio.it\'\rRenato Redentore 328 9157157\rrenato.redentore@augustaratio.it\rluigi panaioli ufficiogiulianova@vestinagaseluce.it\r\rMarco Allevi 085.8003554     3285625186 marco.allevi@augustaratio.it\r','2025-04-23 13:04:45','2025-04-23 13:04:46'),
(125,1,NULL,0,1,'attiva','NIBA DI BARRA ANTONIO & C. SAS','01206370445',NULL,NULL,'2025-04-23 13:06:02','2025-04-23 13:06:03'),
(126,1,NULL,0,1,'attiva','COMUNE DI GUARDIAGRELE','00239980691','00239980691','Tutte le stampe f/r b/n e dove necessario 3 F24, mentre devi prevedere la cartolina AR per le raccomandate.\rTari minimo 8000pz x 2 o 3 /y (prima uscita marzo 2016)\rIMU minimo 6000pz x 2/y (giu e nov 2016)\rTOSAP minimo 2000pz x 3/y (mar - giu e nov 2016)\rRaccomandate AR minimo 4000pz\rDimmi se hai bisogno d’altro e … mi raccomando\rcomune.guardiagrele@pec.it\r\rIntestala \rCOMUNE DI GUARDIAGRELE \rPiazza San Francesco 12 66016 Guardiagrele CH\rAlla C.A.\rGent.ma Assessore Dr.ssa Marilena Primavera\rEgr. Vice Sindaco Dr. Gianluca Primavera\r','2025-04-23 13:07:21','2025-04-23 13:07:22'),
(127,1,NULL,0,1,'attiva','COMUNE DI DIAMANTE','00362420788','00362420788',NULL,'2025-04-23 13:08:06','2025-12-19 18:11:36'),
(132,1,NULL,0,1,'attiva','6062 LAB SRL','02138900671',NULL,NULL,'2025-05-06 11:11:47','2025-05-06 11:11:48'),
(133,1,NULL,0,1,'attiva','COMUNE DI ALBA ADRIATICA','00285510673','00285510673','CIMINI 0861 719230','2025-05-07 09:15:01','2025-12-19 18:11:36'),
(134,1,NULL,0,1,'attiva','PROVA SRL','01234567890','01234567890',NULL,'2025-05-14 10:19:53','2025-05-14 10:19:54'),
(135,1,NULL,0,1,'attiva','DE LEONI INFORMATICA SRL','02153830597','02153830597',NULL,'2025-07-31 16:19:55','2025-07-31 16:19:56'),
(136,1,NULL,0,1,'attiva','SELDA SRL','00354060444',NULL,NULL,'2025-07-31 16:24:14','2025-07-31 16:24:15'),
(137,1,NULL,0,1,'attiva','Alex','01234567890','LVRLXA93H18I348M',NULL,'2025-10-09 15:04:21','2025-10-09 15:04:21'),
(138,1,NULL,0,1,'attiva','COMUNE DI COLONNELLA','82001560679','82001560679',NULL,'2025-11-26 17:13:26','2025-11-26 17:13:26');
/*!40000 ALTER TABLE `tb_anagrafiche` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER `trg_anagrafica_to_archive` AFTER UPDATE ON `tb_anagrafiche` FOR EACH ROW BEGIN
  IF OLD.is_active = 1 AND NEW.is_active = 0 THEN
    SET @__archiver := COALESCE(@archived_by, SUBSTRING_INDEX(CURRENT_USER(), '@', 1));
    SET @__batch := COALESCE(@archive_batch_id, UUID());

    INSERT INTO tb_anagrafiche_archive (
      id_anagrafica, id_tipologia, id_sdi_regime_fiscale, is_pa, ragione_sociale,
      piva, codice_fiscale, note, created_at, updated_at, archived_at, archived_by,
      archive_batch_id, inactive_since, last_document_date, archive_note
    ) VALUES (
      NEW.id_anagrafica, NEW.id_tipologia, NEW.id_sdi_regime_fiscale, NEW.is_pa, NEW.ragione_sociale,
      NEW.piva, NEW.codice_fiscale, NEW.note, NEW.created_at, NEW.updated_at, NOW(), @__archiver,
      @__batch, CURDATE(), NULL, 'Archiviata da trigger disattivazione (is_active=0)'
    );

    INSERT INTO tb_anagrafiche_fiscali_archive
    SELECT f.*, NOW(), @__archiver, @__batch, 'Archivio: anagrafica disattivata'
    FROM tb_anagrafiche_fiscali f
    WHERE f.id_anagrafica = NEW.id_anagrafica
      AND NOT EXISTS (
        SELECT 1 FROM tb_anagrafiche_fiscali_archive fa
        WHERE fa.id_anagrafica = f.id_anagrafica
      );

    INSERT INTO tb_sedi_archive
    SELECT s.*, NOW(), @__archiver, @__batch, 'Archivio: anagrafica disattivata'
    FROM tb_sedi s
    WHERE s.id_anagrafica = NEW.id_anagrafica
      AND NOT EXISTS (
        SELECT 1 FROM tb_sedi_archive sa
        WHERE sa.id_sede = s.id_sede
      );

    INSERT INTO tb_sedi_contatti_archive
    SELECT c.*, NOW(), @__archiver, @__batch, 'Archivio: anagrafica disattivata'
    FROM tb_sedi_contatti c
    WHERE c.id_sede IN (
      SELECT s.id_sede FROM tb_sedi s WHERE s.id_anagrafica = NEW.id_anagrafica
    )
      AND NOT EXISTS (
        SELECT 1 FROM tb_sedi_contatti_archive ca
        WHERE ca.id_contatto = c.id_contatto
      );

    DELETE FROM tb_anagrafiche WHERE id_anagrafica = NEW.id_anagrafica;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tb_anagrafiche_archive`
--

DROP TABLE IF EXISTS `tb_anagrafiche_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_anagrafiche_archive` (
  `id_anagrafica` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `id_tipologia` tinyint(3) unsigned NOT NULL,
  `id_sdi_regime_fiscale` tinyint(3) unsigned DEFAULT NULL,
  `is_pa` tinyint(1) NOT NULL DEFAULT 0,
  `ragione_sociale` varchar(160) NOT NULL,
  `piva` varchar(16) DEFAULT NULL,
  `codice_fiscale` varchar(16) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archived_at` datetime NOT NULL DEFAULT current_timestamp(),
  `archived_by` varchar(120) DEFAULT NULL,
  `archive_batch_id` char(36) DEFAULT NULL,
  `inactive_since` date DEFAULT NULL,
  `last_document_date` date DEFAULT NULL,
  `archive_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_anagrafica`),
  UNIQUE KEY `uq_anagrafica_archive` (`id_anagrafica`),
  KEY `idx_anag_ragione` (`ragione_sociale`),
  KEY `idx_anag_piva` (`piva`),
  KEY `idx_anag_cf` (`codice_fiscale`),
  KEY `fk_anag_tipologia` (`id_tipologia`),
  KEY `fk_anag_sdi_rf` (`id_sdi_regime_fiscale`),
  KEY `idx_anag_archived_at` (`archived_at`),
  KEY `idx_anag_archived_by` (`archived_by`),
  KEY `idx_anag_archive_batch` (`archive_batch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_anagrafiche_archive`
--

LOCK TABLES `tb_anagrafiche_archive` WRITE;
/*!40000 ALTER TABLE `tb_anagrafiche_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_anagrafiche_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_anagrafiche_fiscali`
--

DROP TABLE IF EXISTS `tb_anagrafiche_fiscali`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_anagrafiche_fiscali` (
  `id_anagrafica` int(11) unsigned NOT NULL,
  `pec` varchar(120) DEFAULT NULL,
  `codice_sdi` char(7) DEFAULT NULL,
  `iban` varchar(34) DEFAULT NULL,
  `banca` varchar(120) DEFAULT NULL,
  `id_cond_pagamento` int(11) unsigned DEFAULT NULL,
  `modalita_pagamento` varchar(10) DEFAULT NULL,
  `giorni_pagamento` smallint(6) DEFAULT NULL,
  `altri_dati` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`altri_dati`)),
  PRIMARY KEY (`id_anagrafica`),
  KEY `idx_sdi` (`codice_sdi`),
  KEY `idx_pec` (`pec`),
  CONSTRAINT `fk_fisc_anag` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_anagrafiche_fiscali`
--

LOCK TABLES `tb_anagrafiche_fiscali` WRITE;
/*!40000 ALTER TABLE `tb_anagrafiche_fiscali` DISABLE KEYS */;
INSERT INTO `tb_anagrafiche_fiscali` VALUES
(1,'mediaprint@pec.it','fads','IT08I0200824404000102986727','popolare',12,'Bonifico',30,NULL),
(138,'comune.colonnella@pec.it','UF4HOB',NULL,NULL,1,'Bonifico',NULL,NULL);
/*!40000 ALTER TABLE `tb_anagrafiche_fiscali` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_anagrafiche_fiscali_archive`
--

DROP TABLE IF EXISTS `tb_anagrafiche_fiscali_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_anagrafiche_fiscali_archive` (
  `id_anagrafica` int(11) unsigned NOT NULL,
  `pec` varchar(120) DEFAULT NULL,
  `codice_sdi` char(7) DEFAULT NULL,
  `iban` varchar(34) DEFAULT NULL,
  `banca` varchar(120) DEFAULT NULL,
  `id_cond_pagamento` int(11) unsigned DEFAULT NULL,
  `modalita_pagamento` varchar(10) DEFAULT NULL,
  `giorni_pagamento` smallint(6) DEFAULT NULL,
  `altri_dati` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`altri_dati`)),
  `archived_at` datetime NOT NULL DEFAULT current_timestamp(),
  `archived_by` varchar(120) DEFAULT NULL,
  `archive_batch_id` char(36) DEFAULT NULL,
  `archive_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_anagrafica`),
  KEY `idx_sdi` (`codice_sdi`),
  KEY `idx_pec` (`pec`),
  KEY `idx_fisc_archived_at` (`archived_at`),
  KEY `idx_fisc_archived_by` (`archived_by`),
  KEY `idx_fisc_archive_batch` (`archive_batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_anagrafiche_fiscali_archive`
--

LOCK TABLES `tb_anagrafiche_fiscali_archive` WRITE;
/*!40000 ALTER TABLE `tb_anagrafiche_fiscali_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_anagrafiche_fiscali_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_audit_log`
--

DROP TABLE IF EXISTS `tb_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_audit_log` (
  `id_audit` bigint(20) unsigned NOT NULL DEFAULT nextval(`mediaprint_erp_v2`.`seq_tb_audit_log`),
  `ts` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `table_name` varchar(64) NOT NULL,
  `op` enum('I','U','D') NOT NULL,
  `pk_json` longtext NOT NULL CHECK (json_valid(`pk_json`)),
  `pk_hash` binary(16) GENERATED ALWAYS AS (unhex(md5(cast(`pk_json` as char charset utf8mb4)))) VIRTUAL,
  `row_new` longtext DEFAULT NULL CHECK (json_valid(`row_new`)),
  `row_old` longtext DEFAULT NULL CHECK (json_valid(`row_old`)),
  `row_new_crc` binary(16) GENERATED ALWAYS AS (unhex(md5(cast(`row_new` as char charset utf8mb4)))) VIRTUAL,
  `row_old_crc` binary(16) GENERATED ALWAYS AS (unhex(md5(cast(`row_old` as char charset utf8mb4)))) VIRTUAL,
  `actor` varchar(128) DEFAULT NULL,
  `app` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`ts`,`id_audit`),
  KEY `idx_tbl_pk` (`table_name`,`pk_hash`,`ts`),
  KEY `idx_tbl_ts` (`table_name`,`ts`),
  KEY `idx_op_ts` (`op`,`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8
 PARTITION BY RANGE  COLUMNS(`ts`)
(PARTITION `p2025m09` VALUES LESS THAN ('2025-10-01') ENGINE = InnoDB,
 PARTITION `p2025m10` VALUES LESS THAN ('2025-11-01') ENGINE = InnoDB,
 PARTITION `pmax` VALUES LESS THAN (MAXVALUE) ENGINE = InnoDB);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_audit_log`
--

LOCK TABLES `tb_audit_log` WRITE;
/*!40000 ALTER TABLE `tb_audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_categorie`
--

DROP TABLE IF EXISTS `tb_categorie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_categorie` (
  `id_categoria` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descrizione` text DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `uq_categorie_nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_categorie`
--

LOCK TABLES `tb_categorie` WRITE;
/*!40000 ALTER TABLE `tb_categorie` DISABLE KEYS */;
INSERT INTO `tb_categorie` VALUES
(1,'Servizi Giano System',NULL),
(2,'Tariffe postali',NULL),
(3,'Posta Digitale',NULL),
(4,'Stampa & Imbustamento',NULL);
/*!40000 ALTER TABLE `tb_categorie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_contatti_anagrafiche`
--

DROP TABLE IF EXISTS `tb_contatti_anagrafiche`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_contatti_anagrafiche` (
  `id_contatto` bigint(20) unsigned NOT NULL,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `is_predefinita` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_contatto`,`id_anagrafica`),
  KEY `idx_ca_anag` (`id_anagrafica`),
  CONSTRAINT `fk_ca_anagrafica` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_contatto` FOREIGN KEY (`id_contatto`) REFERENCES `tb_sedi_contatti` (`id_contatto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_contatti_anagrafiche`
--

LOCK TABLES `tb_contatti_anagrafiche` WRITE;
/*!40000 ALTER TABLE `tb_contatti_anagrafiche` DISABLE KEYS */;
INSERT INTO `tb_contatti_anagrafiche` VALUES
(1613,1,0,'2025-10-03 16:01:54'),
(1618,137,1,'2026-01-13 17:16:52'),
(1619,1,1,'2025-12-29 17:19:00'),
(1619,2,0,'2025-12-29 17:19:00'),
(1620,138,0,'2025-11-26 17:16:05');
/*!40000 ALTER TABLE `tb_contatti_anagrafiche` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_contatti_anagrafiche_single_default
BEFORE INSERT ON tb_contatti_anagrafiche
FOR EACH ROW
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  IF NEW.is_predefinita = 1 THEN
    SELECT COUNT(*) INTO v_exists
    FROM tb_contatti_anagrafiche
    WHERE id_contatto = NEW.id_contatto
      AND is_predefinita = 1;
    IF v_exists > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Esiste gia una anagrafica predefinita per il contatto';
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_contatti_anagrafiche_single_default
BEFORE UPDATE ON tb_contatti_anagrafiche
FOR EACH ROW
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  IF NEW.is_predefinita = 1 AND OLD.is_predefinita = 0 THEN
    SELECT COUNT(*) INTO v_exists
    FROM tb_contatti_anagrafiche
    WHERE id_contatto = NEW.id_contatto
      AND id_anagrafica <> NEW.id_anagrafica
      AND is_predefinita = 1;
    IF v_exists > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Esiste gia una anagrafica predefinita per il contatto';
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tb_contratti`
--

DROP TABLE IF EXISTS `tb_contratti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_contratti` (
  `id_contratto` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `codice` varchar(64) DEFAULT NULL,
  `titolo` varchar(255) NOT NULL,
  `testo_legale` mediumtext DEFAULT NULL,
  `data_inizio` date NOT NULL,
  `data_fine` date DEFAULT NULL,
  `rinnovo_automatico` tinyint(1) NOT NULL DEFAULT 0,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `id_stato_contr` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_contratto`),
  KEY `idx_contratti_anagrafica` (`id_anagrafica`),
  KEY `idx_contratti_date` (`data_inizio`,`data_fine`),
  CONSTRAINT `fk_contratti_anagrafica` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_contratti`
--

LOCK TABLES `tb_contratti` WRITE;
/*!40000 ALTER TABLE `tb_contratti` DISABLE KEYS */;
INSERT INTO `tb_contratti` VALUES
(1,1,'cp-01','prova contratto 1','<p><i>*Per le ispezioni per le quali si rende necessario l’invio della seconda\nraccomandata il costo della verifica è aumentato di € 5,00, mentre se si rende\nnecessario anche l’invio della terza raccomandata il costo è aumentato di\nulteriori € 5,00 (tot. 10,00 euro). Quindi le spese postali sopra evidenziate\nsaranno a carico degli utenti e saranno sommate alla tariffa di ispezione.</i><i></i></p><p>Si informa altresì la S.V.\nche, laddove il pagamento non venga effettuato entro i termini indicati\nsull’avviso di pagamento allegato, l\'Amministrazione Provinciale attiverà la\nprocedura di riscossione coattiva delle somme dovute.</p><p>Qualora sia\nin possesso della documentazione attestante l’effettiva certificazione del Suo\nimpianto per il periodo indicato, potrà richiedere l’annullamento mediante il\nmodulo allegato alla presente.</p>\n\n<p>La\nsuddetta documentazione deve essere trasmessa a mezzo Raccomandata A/R\nindirizzata a: O.P.S. S.p.A. – Via Padre Ugo Frasca snc, 66100 Chieti, oppure a\nmezzo PEC all’indirizzo: <u>opschieti@pec.aruba.it</u>, oppure consegnata a mano presso gli uffici della Società\nall’indirizzo sopra riportato, dal lunedì al venerdì dalle ore 9.00 alle ore\n13.00.</p>\n<p>Per qualsiasi informazione e/o\nchiarimento in merito, la S.V. potrà rivolgersi presso gli uffici della O.P.S.\nS.p.A. cui la Provincia di Chieti ha affidato le attività di ispezione degli\nimpianti termici ai sensi della legislazione vigente.</p>\n<!--EndFragment-->','2025-12-21','2026-12-20',1,1,1,'2025-12-23 17:04:26','2026-01-19 14:10:31');
/*!40000 ALTER TABLE `tb_contratti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_contratti_files`
--

DROP TABLE IF EXISTS `tb_contratti_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_contratti_files` (
  `id_file` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_contratto` int(10) unsigned NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `size_bytes` int(10) unsigned NOT NULL DEFAULT 0,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_file`),
  KEY `idx_contratti_files_contratto` (`id_contratto`),
  KEY `fk_contratti_files_account` (`created_by`),
  CONSTRAINT `fk_contratti_files_account` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_contratti_files_contratto` FOREIGN KEY (`id_contratto`) REFERENCES `tb_contratti` (`id_contratto`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_contratti_files`
--

LOCK TABLES `tb_contratti_files` WRITE;
/*!40000 ALTER TABLE `tb_contratti_files` DISABLE KEYS */;
INSERT INTO `tb_contratti_files` VALUES
(4,1,'ctr_696e5310a4e1f1.80176334.pdf','WiFi-Tab.pdf','application/pdf',877912,1,'2026-01-19 15:51:44');
/*!40000 ALTER TABLE `tb_contratti_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_contratti_files_downloads`
--

DROP TABLE IF EXISTS `tb_contratti_files_downloads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_contratti_files_downloads` (
  `id_download` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_file` int(10) unsigned NOT NULL,
  `downloaded_by` bigint(20) unsigned DEFAULT NULL,
  `downloaded_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_download`),
  KEY `idx_contratti_files_downloads_file` (`id_file`),
  KEY `fk_contratti_files_downloads_account` (`downloaded_by`),
  CONSTRAINT `fk_contratti_files_downloads_account` FOREIGN KEY (`downloaded_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_contratti_files_downloads_file` FOREIGN KEY (`id_file`) REFERENCES `tb_contratti_files` (`id_file`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_contratti_files_downloads`
--

LOCK TABLES `tb_contratti_files_downloads` WRITE;
/*!40000 ALTER TABLE `tb_contratti_files_downloads` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_contratti_files_downloads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_contratti_revisioni`
--

DROP TABLE IF EXISTS `tb_contratti_revisioni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_contratti_revisioni` (
  `id_revisione` int(11) NOT NULL AUTO_INCREMENT,
  `id_contratto` int(10) unsigned NOT NULL,
  `numero_revision` int(11) NOT NULL,
  `label` varchar(32) NOT NULL,
  `note` text DEFAULT NULL,
  `operatore` varchar(255) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_revisione`),
  UNIQUE KEY `uniq_contr_revision` (`id_contratto`,`numero_revision`),
  CONSTRAINT `fk_contr_revision_contratto` FOREIGN KEY (`id_contratto`) REFERENCES `tb_contratti` (`id_contratto`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_contratti_revisioni`
--

LOCK TABLES `tb_contratti_revisioni` WRITE;
/*!40000 ALTER TABLE `tb_contratti_revisioni` DISABLE KEYS */;
INSERT INTO `tb_contratti_revisioni` VALUES
(1,1,1,'Rev.1','Invio manuale da timeline.','Alex Olivieri','{\"detail\":{\"contratto\":{\"id_contratto\":1,\"id_anagrafica\":1,\"codice\":\"cp-01\",\"titolo\":\"prova contratto 1\",\"testo_legale\":\"<p><i>*Per le ispezioni per le quali si rende necessario l’invio della seconda\\nraccomandata il costo della verifica è aumentato di € 5,00, mentre se si rende\\nnecessario anche l’invio della terza raccomandata il costo è aumentato di\\nulteriori € 5,00 (tot. 10,00 euro). Quindi le spese postali sopra evidenziate\\nsaranno a carico degli utenti e saranno sommate alla tariffa di ispezione.<\\/i><i><\\/i><\\/p><p>Si informa altresì la S.V.\\nche, laddove il pagamento non venga effettuato entro i termini indicati\\nsull’avviso di pagamento allegato, l\'Amministrazione Provinciale attiverà la\\nprocedura di riscossione coattiva delle somme dovute.<\\/p><p>Qualora sia\\nin possesso della documentazione attestante l’effettiva certificazione del Suo\\nimpianto per il periodo indicato, potrà richiedere l’annullamento mediante il\\nmodulo allegato alla presente.<\\/p>\\n\\n<p>La\\nsuddetta documentazione deve essere trasmessa a mezzo Raccomandata A\\/R\\nindirizzata a: O.P.S. S.p.A. – Via Padre Ugo Frasca snc, 66100 Chieti, oppure a\\nmezzo PEC all’indirizzo: <u>opschieti@pec.aruba.it<\\/u>, oppure consegnata a mano presso gli uffici della Società\\nall’indirizzo sopra riportato, dal lunedì al venerdì dalle ore 9.00 alle ore\\n13.00.<\\/p>\\n<p>Per qualsiasi informazione e\\/o\\nchiarimento in merito, la S.V. potrà rivolgersi presso gli uffici della O.P.S.\\nS.p.A. cui la Provincia di Chieti ha affidato le attività di ispezione degli\\nimpianti termici ai sensi della legislazione vigente.<\\/p>\\n<!--EndFragment-->\",\"data_inizio\":\"2025-12-21\",\"data_fine\":\"2026-12-20\",\"rinnovo_automatico\":1,\"attivo\":1,\"stato_code\":\"inviato\",\"stato_label\":\"Inviato\",\"created_at\":\"2025-12-23 17:04:26\",\"updated_at\":\"2025-12-23 17:27:51\",\"ragione_sociale\":\"MEDIAPRINT SRL\"},\"righe\":[{\"id_riga\":17,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":11,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM\",\"prezzo_unitario\":0.34,\"iva\":0,\"id_sdi_natura_iva\":1,\"sconto_base\":0,\"posizione\":1,\"sconti\":[]},{\"id_riga\":18,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":11,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP\",\"prezzo_unitario\":0.52,\"iva\":0,\"id_sdi_natura_iva\":1,\"sconto_base\":0,\"posizione\":2,\"sconti\":[]},{\"id_riga\":19,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":11,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU\",\"prezzo_unitario\":0.65,\"iva\":0,\"id_sdi_natura_iva\":1,\"sconto_base\":0,\"posizione\":3,\"sconti\":[]},{\"id_riga\":20,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":20,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 1\",\"prezzo_unitario\":1.35,\"iva\":0,\"id_sdi_natura_iva\":1,\"sconto_base\":0,\"posizione\":4,\"sconti\":[]},{\"id_riga\":21,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":20,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 2\",\"prezzo_unitario\":2.55,\"iva\":0,\"id_sdi_natura_iva\":1,\"sconto_base\":0,\"posizione\":5,\"sconti\":[]},{\"id_riga\":22,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":20,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 3\",\"prezzo_unitario\":3.35,\"iva\":0,\"id_sdi_natura_iva\":1,\"sconto_base\":0,\"posizione\":6,\"sconti\":[]},{\"id_riga\":23,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":6,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Centro Elaborazione Dati - File Dati: PDF-Omologato\",\"prezzo_unitario\":0,\"iva\":22,\"id_sdi_natura_iva\":null,\"sconto_base\":0,\"posizione\":7,\"sconti\":[]},{\"id_riga\":24,\"id_contratto\":1,\"tipo_item\":\"prodotto\",\"id_prodotto\":6,\"id_pacchetto\":null,\"combo_key\":null,\"descrizione\":\"Centro Elaborazione Dati - File Dati: Dati grezzi da elaborare\",\"prezzo_unitario\":50,\"iva\":22,\"id_sdi_natura_iva\":null,\"sconto_base\":0,\"posizione\":8,\"sconti\":[]}],\"meta\":{\"editable\":false,\"statuses\":[{\"id_stato\":1,\"code\":\"bozza\",\"label\":\"Bozza\",\"ordering\":10},{\"id_stato\":2,\"code\":\"inviato\",\"label\":\"Inviato\",\"ordering\":20},{\"id_stato\":3,\"code\":\"confermato\",\"label\":\"Confermato\",\"ordering\":30},{\"id_stato\":4,\"code\":\"rifiutato\",\"label\":\"Rifiutato\",\"ordering\":40},{\"id_stato\":5,\"code\":\"annullato\",\"label\":\"Annullato\",\"ordering\":50}],\"current_status\":{\"code\":\"inviato\",\"label\":\"Inviato\"},\"revisions\":[]}}}','2025-12-23 17:27:51');
/*!40000 ALTER TABLE `tb_contratti_revisioni` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_contratti_righe`
--

DROP TABLE IF EXISTS `tb_contratti_righe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_contratti_righe` (
  `id_riga` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_contratto` int(10) unsigned NOT NULL,
  `tipo_item` enum('prodotto','pacchetto') NOT NULL DEFAULT 'prodotto',
  `id_prodotto` int(10) unsigned DEFAULT NULL,
  `id_pacchetto` int(11) DEFAULT NULL,
  `combo_key` varchar(255) DEFAULT NULL,
  `descrizione` varchar(255) DEFAULT NULL,
  `prezzo_unitario` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `iva` decimal(6,2) DEFAULT NULL,
  `id_sdi_natura_iva` int(11) DEFAULT NULL,
  `sconto_base` decimal(6,2) NOT NULL DEFAULT 0.00,
  `posizione` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_riga`),
  KEY `idx_contratti_righe_contratto` (`id_contratto`),
  KEY `idx_contratti_righe_prodotto` (`id_prodotto`),
  KEY `idx_contratti_righe_pacchetto` (`id_pacchetto`),
  CONSTRAINT `fk_contratti_righe_contratto` FOREIGN KEY (`id_contratto`) REFERENCES `tb_contratti` (`id_contratto`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_contratti_righe`
--

LOCK TABLES `tb_contratti_righe` WRITE;
/*!40000 ALTER TABLE `tb_contratti_righe` DISABLE KEYS */;
INSERT INTO `tb_contratti_righe` VALUES
(49,1,'prodotto',11,NULL,NULL,'Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM',0.3400,0.00,1,0.00,1,'2026-01-19 14:10:31','2026-01-19 14:10:31'),
(50,1,'prodotto',11,NULL,NULL,'Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP',0.5200,0.00,1,0.00,2,'2026-01-19 14:10:31','2026-01-19 14:10:31'),
(51,1,'prodotto',11,NULL,NULL,'Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU',0.6500,0.00,1,0.00,3,'2026-01-19 14:10:31','2026-01-19 14:10:31'),
(52,1,'prodotto',20,NULL,NULL,'Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 1',1.3500,0.00,1,0.00,4,'2026-01-19 14:10:31','2026-01-19 14:10:31'),
(53,1,'prodotto',20,NULL,NULL,'Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 2',2.5500,0.00,1,0.00,5,'2026-01-19 14:10:31','2026-01-19 14:10:31'),
(54,1,'prodotto',20,NULL,NULL,'Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 3',3.3500,0.00,1,0.00,6,'2026-01-19 14:10:31','2026-01-19 14:10:31'),
(55,1,'prodotto',6,NULL,NULL,'Centro Elaborazione Dati - File Dati: PDF-Omologato',0.0000,22.00,NULL,0.00,7,'2026-01-19 14:10:31','2026-01-19 14:10:31'),
(56,1,'prodotto',6,NULL,NULL,'Centro Elaborazione Dati - File Dati: Dati grezzi da elaborare',50.0000,22.00,NULL,0.00,8,'2026-01-19 14:10:31','2026-01-19 14:10:31');
/*!40000 ALTER TABLE `tb_contratti_righe` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_contratti_sconti`
--

DROP TABLE IF EXISTS `tb_contratti_sconti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_contratti_sconti` (
  `id_sconto` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_riga` int(10) unsigned NOT NULL,
  `quantita_min` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `quantita_max` decimal(12,4) DEFAULT NULL,
  `sconto_percent` decimal(6,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_sconto`),
  KEY `idx_contratti_sconti_riga` (`id_riga`),
  CONSTRAINT `fk_contratti_sconti_riga` FOREIGN KEY (`id_riga`) REFERENCES `tb_contratti_righe` (`id_riga`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_contratti_sconti`
--

LOCK TABLES `tb_contratti_sconti` WRITE;
/*!40000 ALTER TABLE `tb_contratti_sconti` DISABLE KEYS */;
INSERT INTO `tb_contratti_sconti` VALUES
(4,49,0.0000,10000.0000,1.00,'2026-01-19 14:10:31');
/*!40000 ALTER TABLE `tb_contratti_sconti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_ddt`
--

DROP TABLE IF EXISTS `tb_ddt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_ddt` (
  `id_ddt` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_serie` int(10) unsigned DEFAULT NULL,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `anno` smallint(5) unsigned NOT NULL,
  `numero_documento` int(10) unsigned NOT NULL,
  `data_ddt` date DEFAULT NULL,
  `id_causale` smallint(5) unsigned DEFAULT NULL,
  `id_sede_destinazione` int(10) unsigned DEFAULT NULL,
  `id_destinazione_predefinita` int(10) unsigned DEFAULT NULL,
  `stato_documento` tinyint(1) unsigned NOT NULL DEFAULT 1,
  `totale_pezzi` int(10) unsigned DEFAULT NULL,
  `totale_peso_kg` decimal(12,3) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `destinazione_merce` varchar(255) DEFAULT NULL,
  `aspetto` varchar(255) DEFAULT NULL,
  `numero_colli` int(10) unsigned DEFAULT NULL,
  `cura_trasporto` varchar(255) DEFAULT NULL,
  `data_trasporto` date DEFAULT NULL,
  `vettore` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_ddt`),
  UNIQUE KEY `uq_ddt_numero` (`anno`,`numero_documento`),
  KEY `idx_ddt_anag` (`id_anagrafica`),
  KEY `idx_ddt_data` (`data_ddt`),
  KEY `fk_ddt_causale` (`id_causale`),
  KEY `fk_ddt_serie` (`id_serie`),
  CONSTRAINT `fk_ddt_anag` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`),
  CONSTRAINT `fk_ddt_causale` FOREIGN KEY (`id_causale`) REFERENCES `cfg_causali_ddt` (`id_causale`) ON DELETE SET NULL,
  CONSTRAINT `fk_ddt_serie` FOREIGN KEY (`id_serie`) REFERENCES `cfg_serie_documenti` (`id_serie`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_ddt`
--

LOCK TABLES `tb_ddt` WRITE;
/*!40000 ALTER TABLE `tb_ddt` DISABLE KEYS */;
INSERT INTO `tb_ddt` VALUES
(1,NULL,137,2026,1,'2026-01-13',NULL,NULL,NULL,1,3,0.000,'Documento generato dal preventivo 1/2026.',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-13 15:18:21','2026-01-13 15:18:21'),
(2,NULL,137,2026,2,'2026-01-13',NULL,2208,NULL,1,3,0.000,'Documento generato dal preventivo 1/2026.',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-13 16:26:08','2026-01-13 16:26:08'),
(3,NULL,137,2026,3,'2026-01-22',1,2208,NULL,1,4,0.000,'Documento generato dal preventivo 2/2026.',NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-22 10:28:41','2026-01-22 10:28:41');
/*!40000 ALTER TABLE `tb_ddt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_ddt_archive`
--

DROP TABLE IF EXISTS `tb_ddt_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_ddt_archive` (
  `id_ddt` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `anno` smallint(5) unsigned NOT NULL,
  `numero_documento` int(10) unsigned NOT NULL,
  `data_ddt` date DEFAULT NULL,
  `causale` varchar(160) DEFAULT NULL,
  `totale_pezzi` int(10) unsigned DEFAULT NULL,
  `note` text DEFAULT NULL,
  `destinazione_merce` varchar(255) DEFAULT NULL,
  `aspetto` varchar(255) DEFAULT NULL,
  `numero_colli` int(10) unsigned DEFAULT NULL,
  `cura_trasporto` varchar(255) DEFAULT NULL,
  `data_trasporto` date DEFAULT NULL,
  `vettore` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_ddt`),
  UNIQUE KEY `uq_ddt_numero` (`anno`,`numero_documento`),
  KEY `idx_ddt_anag` (`id_anagrafica`),
  KEY `idx_ddt_data` (`data_ddt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_ddt_archive`
--

LOCK TABLES `tb_ddt_archive` WRITE;
/*!40000 ALTER TABLE `tb_ddt_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_ddt_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_ddt_righe`
--

DROP TABLE IF EXISTS `tb_ddt_righe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_ddt_righe` (
  `id_riga` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_ddt` int(10) unsigned NOT NULL,
  `id_prodotto` int(10) unsigned DEFAULT NULL,
  `combo_key` varchar(255) DEFAULT NULL,
  `descrizione` varchar(255) NOT NULL,
  `quantita` decimal(12,3) NOT NULL DEFAULT 1.000,
  `peso_unitario_kg` decimal(12,3) DEFAULT NULL,
  `peso_totale_kg` decimal(12,3) DEFAULT NULL,
  `unita_misura` varchar(16) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `posizione` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_riga`),
  KEY `idx_righeddt_ddt` (`id_ddt`),
  KEY `idx_righeddt_prod` (`id_prodotto`),
  CONSTRAINT `fk_righeddt_ddt` FOREIGN KEY (`id_ddt`) REFERENCES `tb_ddt` (`id_ddt`) ON DELETE CASCADE,
  CONSTRAINT `fk_righeddt_prod` FOREIGN KEY (`id_prodotto`) REFERENCES `tb_prodotti` (`id_prodotto`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_ddt_righe`
--

LOCK TABLES `tb_ddt_righe` WRITE;
/*!40000 ALTER TABLE `tb_ddt_righe` DISABLE KEYS */;
INSERT INTO `tb_ddt_righe` VALUES
(1,1,11,'1+3+5','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM',1.000,NULL,0.000,NULL,NULL,1),
(2,1,11,'1+3+6','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP',1.000,NULL,0.000,NULL,NULL,2),
(3,1,11,'1+3+7','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU',1.000,NULL,0.000,NULL,NULL,3),
(4,2,11,'1+3+5','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM',1.000,NULL,0.000,NULL,NULL,1),
(5,2,11,'1+3+6','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP',1.000,NULL,0.000,NULL,NULL,2),
(6,2,11,'1+3+7','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU',1.000,NULL,0.000,NULL,NULL,3),
(7,3,11,'1+3+5','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM',1.000,NULL,0.000,NULL,NULL,1),
(8,3,11,'1+3+6','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP',1.000,NULL,0.000,NULL,NULL,2),
(9,3,11,'1+3+7','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU',1.000,NULL,0.000,NULL,NULL,3),
(10,3,19,'11+14+33','Posta Massiva - Colore Stampa: B&N ; Tipo Stampa: Fronte/Retro ; Peso Carta: Carta 80 gr',1.000,NULL,0.000,NULL,NULL,4);
/*!40000 ALTER TABLE `tb_ddt_righe` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_ddt_righe_weight
BEFORE INSERT ON tb_ddt_righe
FOR EACH ROW
BEGIN
  SET NEW.peso_totale_kg = ROUND(COALESCE(NEW.quantita,0) * COALESCE(NEW.peso_unitario_kg,0), 3);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ai_ddt_righe_recalc
AFTER INSERT ON tb_ddt_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_ddt(NEW.id_ddt);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_ddt_righe_weight
BEFORE UPDATE ON tb_ddt_righe
FOR EACH ROW
BEGIN
  SET NEW.peso_totale_kg = ROUND(COALESCE(NEW.quantita,0) * COALESCE(NEW.peso_unitario_kg,0), 3);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER au_ddt_righe_recalc
AFTER UPDATE ON tb_ddt_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_ddt(NEW.id_ddt);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ad_ddt_righe_recalc
AFTER DELETE ON tb_ddt_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_ddt(OLD.id_ddt);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tb_fatture`
--

DROP TABLE IF EXISTS `tb_fatture`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_fatture` (
  `id_fattura` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_sezionale` int(10) unsigned DEFAULT NULL,
  `id_serie` int(10) unsigned DEFAULT NULL,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `anno` smallint(5) unsigned NOT NULL,
  `numero_documento` int(10) unsigned NOT NULL,
  `data_fattura` date DEFAULT NULL,
  `id_tipo_fatt` tinyint(3) unsigned NOT NULL,
  `totale_imponibile` decimal(12,2) DEFAULT NULL,
  `totale_sconto` decimal(12,2) DEFAULT NULL,
  `totale_iva` decimal(12,2) DEFAULT NULL,
  `totale` decimal(12,2) DEFAULT NULL,
  `saldo` decimal(12,2) DEFAULT NULL,
  `id_stato_fatt` tinyint(3) unsigned NOT NULL,
  `id_sdi_tipo_documento` tinyint(3) unsigned DEFAULT NULL,
  `id_sdi_esigibilita` tinyint(3) unsigned DEFAULT NULL,
  `id_sdi_modalita` tinyint(3) unsigned DEFAULT NULL,
  `cliente_pec` varchar(120) DEFAULT NULL,
  `cliente_codice_sdi` char(7) DEFAULT NULL,
  `cliente_iban` varchar(34) DEFAULT NULL,
  `cliente_banca` varchar(120) DEFAULT NULL,
  `cliente_id_cond_pagamento` int(11) unsigned DEFAULT NULL,
  `cliente_modalita_pagamento` varchar(10) DEFAULT NULL,
  `cliente_giorni_pagamento` smallint(6) DEFAULT NULL,
  `cliente_altri_dati` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cliente_altri_dati`)),
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_fattura`),
  UNIQUE KEY `uq_fatt_numero_sezionale` (`anno`,`id_sezionale`,`numero_documento`),
  KEY `idx_fatt_anag` (`id_anagrafica`),
  KEY `idx_fatt_data` (`data_fattura`),
  KEY `fk_fatt_tipo` (`id_tipo_fatt`),
  KEY `fk_fatt_stato` (`id_stato_fatt`),
  KEY `fk_fatt_serie` (`id_serie`),
  KEY `fk_fatt_sdi_td` (`id_sdi_tipo_documento`),
  KEY `fk_fatt_sdi_esig` (`id_sdi_esigibilita`),
  KEY `fk_fatt_sdi_mp` (`id_sdi_modalita`),
  KEY `fk_fatt_sezionale` (`id_sezionale`),
  CONSTRAINT `fk_fatt_anag` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`),
  CONSTRAINT `fk_fatt_sdi_esig` FOREIGN KEY (`id_sdi_esigibilita`) REFERENCES `cfg_sdi_esigibilita_iva` (`id_esig`) ON DELETE SET NULL,
  CONSTRAINT `fk_fatt_sdi_mp` FOREIGN KEY (`id_sdi_modalita`) REFERENCES `cfg_sdi_modalita_pagamento` (`id_modalita`) ON DELETE SET NULL,
  CONSTRAINT `fk_fatt_sdi_td` FOREIGN KEY (`id_sdi_tipo_documento`) REFERENCES `cfg_sdi_tipo_documento` (`id_tipo`) ON DELETE SET NULL,
  CONSTRAINT `fk_fatt_serie` FOREIGN KEY (`id_serie`) REFERENCES `cfg_serie_documenti` (`id_serie`) ON DELETE SET NULL,
  CONSTRAINT `fk_fatt_sezionale` FOREIGN KEY (`id_sezionale`) REFERENCES `cfg_sezionali` (`id_sezionale`) ON DELETE SET NULL,
  CONSTRAINT `fk_fatt_stato` FOREIGN KEY (`id_stato_fatt`) REFERENCES `cfg_stati_fattura` (`id_stato`),
  CONSTRAINT `fk_fatt_tipo` FOREIGN KEY (`id_tipo_fatt`) REFERENCES `cfg_tipi_fattura` (`id_tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture`
--

LOCK TABLES `tb_fatture` WRITE;
/*!40000 ALTER TABLE `tb_fatture` DISABLE KEYS */;
INSERT INTO `tb_fatture` VALUES
(2,1,NULL,137,2026,5,'2026-01-13',2,1.51,0.00,0.00,1.51,0.00,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Fattura generata dal preventivo 1/2026.','2026-01-13 14:49:21','2026-01-13 16:47:53'),
(3,1,NULL,137,2026,6,'2026-01-13',2,1.51,0.00,0.00,1.51,0.00,4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Fattura generata dal preventivo 1/2026.','2026-01-13 16:26:13','2026-01-13 16:47:23');
/*!40000 ALTER TABLE `tb_fatture` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_fatture_archive`
--

DROP TABLE IF EXISTS `tb_fatture_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_fatture_archive` (
  `id_fattura` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `anno` smallint(5) unsigned NOT NULL,
  `numero_documento` int(10) unsigned DEFAULT NULL,
  `data_fattura` date DEFAULT NULL,
  `tipo` enum('accompagnatoria','immediata','differita','nota_credito') NOT NULL DEFAULT 'immediata',
  `totale_imponibile` decimal(12,2) DEFAULT NULL,
  `totale_sconto` decimal(12,2) DEFAULT NULL,
  `totale_iva` decimal(12,2) DEFAULT NULL,
  `totale` decimal(12,2) DEFAULT NULL,
  `saldo` decimal(12,2) DEFAULT NULL,
  `stato` enum('bozza','emessa','inviata','pagata','scaduta','stornata') NOT NULL DEFAULT 'bozza',
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_fattura`),
  UNIQUE KEY `uq_fatt_numero` (`anno`,`numero_documento`),
  KEY `idx_fatt_anag` (`id_anagrafica`),
  KEY `idx_fatt_data` (`data_fattura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture_archive`
--

LOCK TABLES `tb_fatture_archive` WRITE;
/*!40000 ALTER TABLE `tb_fatture_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_fatture_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_fatture_righe`
--

DROP TABLE IF EXISTS `tb_fatture_righe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_fatture_righe` (
  `id_riga` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_fattura` int(10) unsigned NOT NULL,
  `id_prodotto` int(10) unsigned DEFAULT NULL,
  `combo_key` varchar(255) DEFAULT NULL,
  `descrizione` varchar(255) NOT NULL,
  `quantita` decimal(12,3) NOT NULL DEFAULT 1.000,
  `aliquota_iva` decimal(5,2) NOT NULL DEFAULT 22.00,
  `prezzo_unitario` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `sconto` decimal(12,2) DEFAULT NULL,
  `importo_scontato` decimal(12,2) DEFAULT NULL,
  `iva` decimal(12,2) DEFAULT NULL,
  `id_sdi_natura_iva` tinyint(3) unsigned DEFAULT NULL,
  `totale` decimal(12,2) DEFAULT NULL,
  `posizione` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_riga`),
  KEY `idx_righefatt_fatt` (`id_fattura`),
  KEY `idx_righefatt_prod` (`id_prodotto`),
  KEY `fk_righe_sdi_natura` (`id_sdi_natura_iva`),
  CONSTRAINT `fk_righe_sdi_natura` FOREIGN KEY (`id_sdi_natura_iva`) REFERENCES `cfg_sdi_natura_iva` (`id_natura`) ON DELETE SET NULL,
  CONSTRAINT `fk_righefatt_fatt` FOREIGN KEY (`id_fattura`) REFERENCES `tb_fatture` (`id_fattura`) ON DELETE CASCADE,
  CONSTRAINT `fk_righefatt_prod` FOREIGN KEY (`id_prodotto`) REFERENCES `tb_prodotti` (`id_prodotto`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture_righe`
--

LOCK TABLES `tb_fatture_righe` WRITE;
/*!40000 ALTER TABLE `tb_fatture_righe` DISABLE KEYS */;
INSERT INTO `tb_fatture_righe` VALUES
(4,2,11,'1+3+5','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM',1.000,0.00,0.3400,0.00,0.34,0.00,1,0.34,1),
(5,2,11,'1+3+6','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP',1.000,0.00,0.5200,0.00,0.52,0.00,1,0.52,2),
(6,2,11,'1+3+7','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU',1.000,0.00,0.6500,0.00,0.65,0.00,1,0.65,3),
(7,3,11,'1+3+5','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM',1.000,0.00,0.3400,0.00,0.34,0.00,1,0.34,1),
(8,3,11,'1+3+6','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP',1.000,0.00,0.5200,0.00,0.52,0.00,1,0.52,2),
(9,3,11,'1+3+7','Posta Massiva - Peso Plico: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU',1.000,0.00,0.6500,0.00,0.65,0.00,1,0.65,3);
/*!40000 ALTER TABLE `tb_fatture_righe` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_fatture_righe_sdi_guard
BEFORE INSERT ON tb_fatture_righe
FOR EACH ROW
BEGIN
  
  IF NEW.aliquota_iva < 0 OR NEW.aliquota_iva > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'aliquota_iva deve essere compresa tra 0 e 100';
  END IF;

  
  IF NEW.aliquota_iva = 0 THEN
    IF NEW.id_sdi_natura_iva IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Natura IVA (SdI) obbligatoria quando aliquota_iva=0';
    END IF;
  ELSE
    SET NEW.id_sdi_natura_iva = NULL;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ai_fatture_righe_recalc
AFTER INSERT ON tb_fatture_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_fattura(NEW.id_fattura);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_fatture_righe_sdi_guard
BEFORE UPDATE ON tb_fatture_righe
FOR EACH ROW
BEGIN
  IF NEW.aliquota_iva < 0 OR NEW.aliquota_iva > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'aliquota_iva deve essere compresa tra 0 e 100';
  END IF;

  IF NEW.aliquota_iva = 0 THEN
    IF NEW.id_sdi_natura_iva IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Natura IVA (SdI) obbligatoria quando aliquota_iva=0';
    END IF;
  ELSE
    SET NEW.id_sdi_natura_iva = NULL;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER au_fatture_righe_recalc
AFTER UPDATE ON tb_fatture_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_fattura(NEW.id_fattura);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ad_fatture_righe_recalc
AFTER DELETE ON tb_fatture_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_fattura(OLD.id_fattura);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tb_fatture_status_log`
--

DROP TABLE IF EXISTS `tb_fatture_status_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_fatture_status_log` (
  `id_log` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_fattura` int(11) NOT NULL,
  `from_status_id` int(11) DEFAULT NULL,
  `to_status_id` int(11) DEFAULT NULL,
  `from_status_label` varchar(191) DEFAULT NULL,
  `to_status_label` varchar(191) DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `actor` varchar(191) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_log`),
  KEY `idx_fsl_fattura` (`id_fattura`),
  KEY `idx_fsl_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture_status_log`
--

LOCK TABLES `tb_fatture_status_log` WRITE;
/*!40000 ALTER TABLE `tb_fatture_status_log` DISABLE KEYS */;
INSERT INTO `tb_fatture_status_log` VALUES
(1,2,1,2,'Bozza','Emessa',NULL,'mediaprint.it','2026-01-13 14:49:33'),
(2,2,2,4,'Emessa','Pagata',NULL,'Sistema pagamenti','2026-01-13 16:46:50'),
(3,3,1,4,'Bozza','Pagata',NULL,'Sistema pagamenti','2026-01-13 16:47:23'),
(4,2,4,3,'Pagata','Inviata',NULL,'Sistema pagamenti','2026-01-13 16:47:27'),
(5,2,3,7,'Inviata','Parzialmente Pagata',NULL,'Sistema pagamenti','2026-01-13 16:47:43'),
(6,2,7,4,'Parzialmente Pagata','Pagata',NULL,'Sistema pagamenti','2026-01-13 16:47:53');
/*!40000 ALTER TABLE `tb_fatture_status_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni`
--

DROP TABLE IF EXISTS `tb_lavorazioni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni` (
  `id_lavorazione` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `codice` varchar(64) DEFAULT NULL,
  `titolo` varchar(255) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `stato` enum('aperta','pianificata','in_produzione','completata','annullata','sospesa') NOT NULL DEFAULT 'aperta',
  `priorita` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `id_reparto` smallint(5) unsigned DEFAULT NULL,
  `data_inizio_prevista` date DEFAULT NULL,
  `data_fine_prevista` date DEFAULT NULL,
  `data_avvio_reale` datetime DEFAULT NULL,
  `data_chiusura` datetime DEFAULT NULL,
  `quantita_totale_prevista` decimal(12,2) DEFAULT NULL,
  `quantita_totale_effettiva` decimal(12,2) DEFAULT NULL,
  `percentuale_avanzamento` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_lavorazione`),
  UNIQUE KEY `uq_lavorazioni_codice` (`codice`),
  KEY `idx_lavorazioni_stato` (`stato`),
  KEY `idx_lavorazioni_reparto` (`id_reparto`),
  KEY `idx_lavorazioni_anagrafica` (`id_anagrafica`),
  KEY `fk_lavorazioni_created_by` (`created_by`),
  KEY `fk_lavorazioni_updated_by` (`updated_by`),
  CONSTRAINT `fk_lavorazioni_anagrafica` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`),
  CONSTRAINT `fk_lavorazioni_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_lavorazioni_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE,
  CONSTRAINT `fk_lavorazioni_reparto` FOREIGN KEY (`id_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL,
  CONSTRAINT `fk_lavorazioni_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni`
--

LOCK TABLES `tb_lavorazioni` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni` DISABLE KEYS */;
INSERT INTO `tb_lavorazioni` VALUES
(1,2,137,'JOB-2026-0002','Stampa - Imbustamento - Data Entry - Posta Digitale - Postalizzazione','Stampa - Imbustamento - Data Entry - Posta Digitale - Postalizzazione','aperta','medium',1,'2026-01-13',NULL,NULL,NULL,NULL,NULL,0,'',NULL,NULL,'2026-01-20 16:15:15','2026-01-21 15:11:13'),
(2,3,137,'JOB-2026-0003','Stampa - Imbustamento - Data Entry - Postalizzazione','Stampa - Imbustamento - Data Entry - Postalizzazione','aperta','medium',NULL,'2026-01-22',NULL,NULL,NULL,NULL,NULL,0,'',NULL,NULL,'2026-01-22 09:34:32','2026-01-22 09:34:32'),
(3,4,137,'JOB-2026-0004','Stampa - Imbustamento - Data Entry - Postalizzazione','Stampa - Imbustamento - Data Entry - Postalizzazione','aperta','medium',NULL,'2026-01-22',NULL,NULL,NULL,NULL,NULL,0,'',NULL,NULL,'2026-01-22 09:56:19','2026-01-22 09:56:19'),
(4,5,137,'JOB-2026-0005','Stampa - Imbustamento - Data Entry - Postalizzazione','Stampa - Imbustamento - Data Entry - Postalizzazione','aperta','medium',NULL,'2026-01-22',NULL,NULL,NULL,NULL,NULL,0,'',NULL,NULL,'2026-01-22 10:45:43','2026-01-22 10:45:43');
/*!40000 ALTER TABLE `tb_lavorazioni` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_attivita`
--

DROP TABLE IF EXISTS `tb_lavorazioni_attivita`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_attivita` (
  `id_attivita` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_lavorazione` int(10) unsigned NOT NULL,
  `titolo` varchar(255) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `stato` enum('todo','in_progress','done','cancelled','sospesa') NOT NULL DEFAULT 'todo',
  `priorita` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `id_reparto` smallint(5) unsigned DEFAULT NULL,
  `ordine` smallint(5) unsigned NOT NULL DEFAULT 0,
  `data_creazione` datetime NOT NULL DEFAULT current_timestamp(),
  `data_scadenza` datetime DEFAULT NULL,
  `data_completamento` datetime DEFAULT NULL,
  `quantita_prevista` decimal(12,2) DEFAULT NULL,
  `quantita_effettiva` decimal(12,2) DEFAULT NULL,
  `percentuale` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `completed_by` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_attivita`),
  KEY `idx_attivita_lavorazione` (`id_lavorazione`),
  KEY `idx_attivita_stato` (`stato`),
  KEY `idx_attivita_scadenza` (`data_scadenza`),
  KEY `fk_attivita_reparto` (`id_reparto`),
  KEY `fk_attivita_created_by` (`created_by`),
  KEY `fk_attivita_updated_by` (`updated_by`),
  KEY `fk_attivita_completed_by` (`completed_by`),
  CONSTRAINT `fk_attivita_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_attivita_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_attivita_lavorazione` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE,
  CONSTRAINT `fk_attivita_reparto` FOREIGN KEY (`id_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL,
  CONSTRAINT `fk_attivita_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_attivita`
--

LOCK TABLES `tb_lavorazioni_attivita` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita` DISABLE KEYS */;
INSERT INTO `tb_lavorazioni_attivita` VALUES
(1,1,'Elaborazione','Predisposizione file grafici per la commessa','todo','medium',1,1,'2026-01-21 11:44:41',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL),
(2,1,'Stampa','Produzione in reparto stampa','todo','medium',2,2,'2026-01-21 16:55:27',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL),
(3,3,'Elaborazione','Predisposizione file grafici per la commessa','todo','medium',1,1,'2026-01-22 10:04:36',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL),
(4,3,'Stampa','Produzione in reparto stampa','todo','medium',2,2,'2026-01-22 10:04:40',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL),
(5,4,'Stampa',NULL,'todo','medium',1,1,'2026-01-22 10:45:44',NULL,NULL,NULL,NULL,0,'Oggetto preventivo: Stampa',NULL,NULL,NULL),
(6,4,'Imbustamento',NULL,'todo','medium',2,2,'2026-01-22 10:45:44',NULL,NULL,NULL,NULL,0,'Oggetto preventivo: Imbustamento',NULL,NULL,NULL),
(7,4,'Data Entry',NULL,'todo','medium',2,3,'2026-01-22 10:45:44',NULL,NULL,NULL,NULL,0,'Oggetto preventivo: Data Entry',NULL,NULL,NULL),
(8,4,'Postalizzazione',NULL,'todo','medium',2,4,'2026-01-22 10:45:44',NULL,NULL,NULL,NULL,0,'Oggetto preventivo: Postalizzazione',NULL,NULL,NULL);
/*!40000 ALTER TABLE `tb_lavorazioni_attivita` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Routine structure for procedure `sp_delete_preventivo_chain`
--

DROP PROCEDURE IF EXISTS `sp_delete_preventivo_chain`;
DELIMITER ;;
CREATE DEFINER=`laravel_mediaprint`@`%` PROCEDURE `sp_delete_preventivo_chain`(IN `p_id_preventivo` INT, IN `p_force` TINYINT)
NOT DETERMINISTIC
CONTAINS SQL
SQL SECURITY DEFINER
BEGIN
    DECLARE v_force TINYINT DEFAULT IFNULL(p_force, 0);

    START TRANSACTION;

    CREATE TEMPORARY TABLE tmp_ddt (
        id_ddt INT PRIMARY KEY
    );

    CREATE TEMPORARY TABLE tmp_fatture (
        id_fattura INT PRIMARY KEY
    );

    INSERT INTO tmp_ddt (id_ddt)
    SELECT apd.id_ddt
    FROM appoggio_preventivo_ddt apd
    WHERE apd.id_preventivo = p_id_preventivo
      AND (
            v_force = 1
            OR NOT EXISTS (
                SELECT 1
                FROM appoggio_preventivo_ddt apd2
                WHERE apd2.id_ddt = apd.id_ddt
                  AND apd2.id_preventivo <> p_id_preventivo
            )
      );

    INSERT INTO tmp_fatture (id_fattura)
    SELECT apf.id_fattura
    FROM appoggio_preventivo_fattura apf
    WHERE apf.id_preventivo = p_id_preventivo
      AND (
            v_force = 1
            OR NOT EXISTS (
                SELECT 1
                FROM appoggio_preventivo_fattura apf2
                WHERE apf2.id_fattura = apf.id_fattura
                  AND apf2.id_preventivo <> p_id_preventivo
            )
      );

    DELETE FROM appoggio_preventivo_ddt
    WHERE id_preventivo = p_id_preventivo;

    DELETE FROM appoggio_preventivo_fattura
    WHERE id_preventivo = p_id_preventivo;

    DELETE FROM tb_ddt
    WHERE id_ddt IN (SELECT id_ddt FROM tmp_ddt);

    DELETE FROM tb_fatture
    WHERE id_fattura IN (SELECT id_fattura FROM tmp_fatture);

    DELETE FROM tb_preventivi
    WHERE id_preventivo = p_id_preventivo;

    COMMIT;

    SET @next_preventivi := (SELECT IFNULL(MAX(id_preventivo), 0) + 1 FROM tb_preventivi);
    SET @next_ddt := (SELECT IFNULL(MAX(id_ddt), 0) + 1 FROM tb_ddt);
    SET @next_fatture := (SELECT IFNULL(MAX(id_fattura), 0) + 1 FROM tb_fatture);

    SET @sql := CONCAT('ALTER TABLE tb_preventivi AUTO_INCREMENT = ', @next_preventivi);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @sql := CONCAT('ALTER TABLE tb_ddt AUTO_INCREMENT = ', @next_ddt);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @sql := CONCAT('ALTER TABLE tb_fatture AUTO_INCREMENT = ', @next_fatture);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END;;
DELIMITER ;

--
-- Dumping routines for database 'prova'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22 12:18:48
