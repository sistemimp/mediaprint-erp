/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: test
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
CREATE SEQUENCE `seq_tb_audit_log` start with 1 minvalue 1 maxvalue 9223372036854775806 increment by 1 cache 1000 nocycle ENGINE=InnoDB;
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
(1,2);
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
  `delta_prezzo` decimal(12,4) NOT NULL DEFAULT 0.0000,
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
(6,40,0.0000),
(6,41,0.0000),
(6,42,0.0000),
(8,47,0.0000),
(8,48,0.0000),
(8,49,0.0000),
(11,1,0.0000),
(11,2,0.0000),
(11,3,0.0000),
(11,4,0.0000),
(11,5,0.0000),
(11,6,0.0000),
(11,7,0.0000),
(11,20,0.0000),
(11,21,0.0000),
(11,22,0.0000),
(11,23,0.0000),
(11,24,0.0000),
(12,1,0.0000),
(12,2,0.0000),
(12,5,0.0000),
(12,6,0.0000),
(12,7,0.0000),
(12,20,0.0000),
(12,21,0.0000),
(12,22,0.0000),
(12,23,0.0000),
(12,24,0.0000),
(13,11,0.0000),
(13,12,0.0000),
(13,13,0.0000),
(13,14,0.0000),
(14,1,0.0000),
(14,2,0.0000),
(14,8,0.0000),
(14,9,0.0000),
(14,10,0.0000),
(14,20,0.0000),
(14,21,0.0000),
(14,22,0.0000),
(14,23,0.0000),
(14,24,0.0000),
(15,1,0.0000),
(15,2,0.0000),
(15,3,0.0000),
(15,4,0.0000),
(15,20,0.0000),
(15,21,0.0000),
(15,22,0.0000),
(15,23,0.0000),
(15,24,0.0000),
(16,11,0.0000),
(16,12,0.0000),
(16,13,0.0000),
(16,14,0.0000),
(17,1,0.0000),
(17,2,0.0000),
(18,1,0.0000),
(18,2,0.0000),
(19,11,0.0000),
(19,12,0.0000),
(19,13,0.0000),
(19,14,0.0000),
(19,31,0.0000),
(19,32,0.0000),
(19,33,0.0000),
(19,43,0.0000),
(19,44,0.0000),
(19,45,0.0000),
(19,46,0.0000),
(20,1,0.0000),
(20,2,0.0000),
(20,8,0.0000),
(20,9,0.0000),
(20,10,0.0000),
(21,1,0.0000),
(21,2,0.0000),
(21,20,0.0000),
(21,21,0.0000),
(21,22,0.0000),
(21,23,0.0000),
(21,24,0.0000),
(36,11,0.0000),
(36,12,0.0000),
(36,13,0.0500),
(36,14,0.0500),
(36,31,0.0000),
(36,32,0.0000),
(36,33,0.0000);
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
(1,'operatore','Alex Olivieri','alex.o@mediaprint.it','$2y$10$JkB3w1sOK6qwNJ2MJRSJeubmFPXJ5p7swDshAcocO/.jTQ0XtTNDW',1,NULL,1,0,0,NULL,'avatars/1/avatar_6952b140b4272122542101.jpg','2026-01-20 15:18:53','2025-10-01 10:41:38','2026-01-20 15:18:53'),
(2,'operatore','Simona Cappelletti','simona.c@mediaprint.it','$2y$10$GGynM5njfCwd7S6oCjP3geZr.ipXkLAOKvDBuhOzUPBuinxtIEASi',2,NULL,1,0,0,NULL,NULL,'2025-12-29 14:47:55','2025-10-15 16:18:53','2025-12-29 14:47:55'),
(7,'cliente','ClienteMediaprint','nexus.olivieri@gmail.com','$2y$10$tDJ/Nl2nDqbHrhifKB/ZRuvVKKSK9PfvyD40evWzfMesqS0lJkZDa',3,1618,1,0,0,NULL,'avatars/7/avatar_6953bd9be26df9.60398937.jpg','2026-01-13 17:17:08','2025-12-29 17:19:00','2026-01-13 17:17:08'),
(8,'operatore','Giampiero Zippilli','giampiero.z@postanetwork.it','$2y$10$eXt5TT2oKZp/HddpROAHOud2YbazRdngnkSJGfeKFYa2FIkGfYy/S',1,NULL,1,1,0,NULL,NULL,'2025-12-30 16:24:01','2025-12-30 15:31:41','2025-12-30 16:24:01'),
(9,'operatore','Daniele Sciarretta','daniele@mediaprint.it','$2y$10$TT6YOxKZcJTVQSFwcqzvAeXFMgr54p2HIRULil28DefMFslps2jDK',1,NULL,1,1,0,NULL,NULL,NULL,'2026-01-13 17:04:21','2026-01-13 17:04:21');
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_affrancature`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_affrancature` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_affrancature` DISABLE KEYS */;
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
  `id_tariffa` int(10) unsigned NOT NULL,
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
  KEY `idx_autorizzazione_tariffa` (`id_tariffa`),
  CONSTRAINT `fk_autorizzazione_affrancatura_cfg` FOREIGN KEY (`id_affrancatura`) REFERENCES `cfg_lavorazioni_spedizioni_affrancature` (`id_affrancatura`) ON DELETE CASCADE,
  CONSTRAINT `fk_autorizzazione_tariffa_cfg` FOREIGN KEY (`id_tariffa`) REFERENCES `cfg_lavorazioni_spedizioni_tariffe` (`id_tariffa`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_autorizzazioni`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_autorizzazioni` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_autorizzazioni` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_operatori_postali`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_operatori_postali` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_operatori_postali` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_porti`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_porti` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_porti` DISABLE KEYS */;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_porti` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_spedizioni_tariffe`
--

LOCK TABLES `cfg_lavorazioni_spedizioni_tariffe` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_tariffe` DISABLE KEYS */;
/*!40000 ALTER TABLE `cfg_lavorazioni_spedizioni_tariffe` ENABLE KEYS */;
UNLOCK TABLES;

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
(1,1,'2025-12-29 14:47:47','2026-01-20 13:27:04'),
(1,2,'2025-12-29 14:47:47','2025-12-29 14:52:29'),
(2,1,'2025-12-29 14:49:29','2026-01-20 13:27:04'),
(3,1,'2025-12-30 15:01:51','2026-01-20 13:27:05'),
(3,7,'2025-12-30 15:01:51','2026-01-13 17:14:45'),
(4,1,'2025-12-30 16:20:36','2026-01-20 13:27:05'),
(4,8,'2025-12-30 16:20:36','2025-12-30 16:37:47');
/*!40000 ALTER TABLE `im_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'test'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-20 17:19:05
