/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: mediaprint_erp_v2
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
  `id_fattura` int(10) unsigned NOT NULL,
  `id_metodo` smallint(5) unsigned DEFAULT NULL,
  `data_pagamento` date DEFAULT NULL,
  `importo` decimal(12,2) DEFAULT NULL,
  `id_mp` smallint(5) unsigned DEFAULT NULL,
  `note` text DEFAULT NULL,
  PRIMARY KEY (`id_pag_fattura`),
  KEY `idx_app_pf_fatt` (`id_fattura`),
  KEY `fk_apf_metodo` (`id_metodo`),
  CONSTRAINT `fk_apf_fatt` FOREIGN KEY (`id_fattura`) REFERENCES `tb_fatture` (`id_fattura`) ON DELETE CASCADE,
  CONSTRAINT `fk_apf_metodo` FOREIGN KEY (`id_metodo`) REFERENCES `cfg_metodi_pagamento` (`id_metodo`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appoggio_pagamenti_fattura`
--

LOCK TABLES `appoggio_pagamenti_fattura` WRITE;
/*!40000 ALTER TABLE `appoggio_pagamenti_fattura` DISABLE KEYS */;
/*!40000 ALTER TABLE `appoggio_pagamenti_fattura` ENABLE KEYS */;
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_apf_mp_guard
BEFORE INSERT ON appoggio_pagamenti_fattura
FOR EACH ROW
BEGIN
  IF COALESCE(NEW.importo,0) > 0 THEN
    IF NEW.id_mp IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Modalità di pagamento SdI (MPxx) obbligatoria quando importo > 0';
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ai_apf_recalc_fattura
AFTER INSERT ON appoggio_pagamenti_fattura
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_apf_mp_guard
BEFORE UPDATE ON appoggio_pagamenti_fattura
FOR EACH ROW
BEGIN
  IF COALESCE(NEW.importo,0) > 0 THEN
    IF NEW.id_mp IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Modalità di pagamento SdI (MPxx) obbligatoria quando importo > 0';
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER au_apf_recalc_fattura
AFTER UPDATE ON appoggio_pagamenti_fattura
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ad_apf_recalc_fattura
AFTER DELETE ON appoggio_pagamenti_fattura
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
/*!40000 ALTER TABLE `appoggio_preventivo_fattura` ENABLE KEYS */;
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
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_account`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_auth_ruolo` (`id_ruolo`),
  KEY `fk_auth_contatto` (`id_contatto`),
  CONSTRAINT `fk_auth_contatto` FOREIGN KEY (`id_contatto`) REFERENCES `tb_sedi_contatti` (`id_contatto`) ON DELETE SET NULL,
  CONSTRAINT `fk_auth_ruolo` FOREIGN KEY (`id_ruolo`) REFERENCES `cfg_auth_ruoli` (`id_ruolo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_accounts`
--

LOCK TABLES `auth_accounts` WRITE;
/*!40000 ALTER TABLE `auth_accounts` DISABLE KEYS */;
INSERT INTO `auth_accounts` VALUES
(1,'operatore','admin','alex.o@mediaprint.it','$2y$10$JkB3w1sOK6qwNJ2MJRSJeubmFPXJ5p7swDshAcocO/.jTQ0XtTNDW',1,NULL,1,0,0,NULL,'2025-10-01 14:19:56','2025-10-01 10:41:38','2025-10-01 14:19:56');
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
  IF NEW.account_type='cliente' AND NEW.id_contatto IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Per account cliente è obbligatorio id_contatto';
  END IF;
  IF NEW.account_type='operatore' THEN
    SET NEW.id_contatto = NULL; -- niente legami per operatori
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
  IF NEW.account_type='cliente' AND NEW.id_contatto IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Per account cliente è obbligatorio id_contatto';
  END IF;
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
(1,10),
(1,11),
(1,20),
(1,21),
(1,22),
(1,30),
(1,31),
(1,32),
(1,33),
(1,40),
(1,41),
(1,50),
(1,51),
(1,60),
(1,61),
(2,1),
(2,2),
(2,10),
(2,11),
(2,20),
(2,21),
(2,22),
(2,30),
(2,31),
(2,32),
(2,33),
(2,40),
(2,41),
(2,50),
(2,51),
(2,60),
(3,1),
(3,10),
(3,20),
(3,30),
(3,50);
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
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_auth_permessi`
--

LOCK TABLES `cfg_auth_permessi` WRITE;
/*!40000 ALTER TABLE `cfg_auth_permessi` DISABLE KEYS */;
INSERT INTO `cfg_auth_permessi` VALUES
(1,'auth.login','Accesso al sistema',1),
(2,'auth.mfa','Autenticazione a più fattori',1),
(10,'anag.view','Visualizzare anagrafiche',1),
(11,'anag.edit','Creare/Modificare anagrafiche',1),
(20,'prev.view','Visualizzare preventivi',1),
(21,'prev.edit','Creare/Modificare preventivi',1),
(22,'prev.approve','Approvare preventivi',1),
(30,'fatt.view','Visualizzare fatture',1),
(31,'fatt.edit','Creare/Modificare fatture',1),
(32,'fatt.send_sdi','Inviare fatture al SdI',1),
(33,'fatt.storno','Emettere note di credito',1),
(40,'ddt.view','Visualizzare DDT',1),
(41,'ddt.edit','Creare/Modificare DDT',1),
(50,'pay.view','Visualizzare pagamenti',1),
(51,'pay.edit','Registrare pagamenti',1),
(60,'cfg.view','Visualizzare configurazioni',1),
(61,'cfg.edit','Gestire configurazioni',1);
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
(1,'MP01','Contanti',1),
(2,'MP02','Assegno',1),
(3,'MP05','Bonifico',1),
(4,'MP08','Carta di pagamento',1),
(5,'MP12','RIBA',1),
(6,'MP03','Assegno circolare',1),
(7,'MP04','Contanti presso Tesoreria',1),
(8,'MP06','Vaglia cambiario',1),
(9,'MP07','Bollettino bancario',1),
(10,'MP09','RID',1),
(11,'MP10','RID utenze',1),
(12,'MP11','RID veloce',1),
(13,'MP13','MAV',1),
(14,'MP14','Quietanza erario',1),
(15,'MP15','Giroconto su conti di contabilità speciale',1),
(16,'MP16','Domiciliazione bancaria',1),
(17,'MP17','Domiciliazione postale',1),
(18,'MP18','Bollettino postale',1),
(19,'MP19','SEPA Direct Debit',1),
(20,'MP20','SEPA Direct Debit CORE',1),
(21,'MP21','SEPA Direct Debit B2B',1),
(22,'MP22','Trattenuta su somme già riscosse',1),
(23,'MP23','PagoPA',1);
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
(1,'N1','Escluse ex art. 15 DPR 633/72',1),
(2,'N2','Non soggette',1),
(3,'N3','Non imponibili',1),
(4,'N4','Esenti',1),
(5,'N5','Regime del margine/IVA non esposta',1),
(6,'N6','Inversione contabile',1),
(7,'N7','IVA assolta in altro Stato UE',1),
(8,'N2.1','Non soggette art. 7–7-septies DPR 633/72',1),
(9,'N2.2','Non soggette – altri casi',1),
(10,'N3.1','Non imponibili – esportazioni',1),
(11,'N3.2','Non imponibili – cessioni intracomunitarie',1),
(12,'N3.3','Non imponibili – cessioni verso San Marino',1),
(13,'N3.4','Non imponibili – operazioni assimilate alle cessioni all’esportazione',1),
(14,'N3.5','Non imponibili – a seguito di dichiarazioni d’intento',1),
(15,'N3.6','Non imponibili – altre',1),
(16,'N6.1','Inversione contabile – cessione rottami e altri materiali di recupero',1),
(17,'N6.2','Inversione contabile – cessione oro, argento puro',1),
(18,'N6.3','Inversione contabile – subappalto nel settore edile',1),
(19,'N6.4','Inversione contabile – cessione fabbricati',1),
(20,'N6.5','Inversione contabile – cessione telefoni cellulari',1),
(21,'N6.6','Inversione contabile – cessione prodotti elettronici',1),
(22,'N6.7','Inversione contabile – prestazioni comparto edile/settori connessi',1),
(23,'N6.8','Inversione contabile – operazioni settore energetico',1),
(24,'N6.9','Inversione contabile – altri casi',1);
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
(3,'RF02','Contribuenti minimi',1),
(4,'RF04','Agricoltura e attività connesse e pesca',1),
(5,'RF05','Vendita sali e tabacchi',1),
(6,'RF06','Commercio fiammiferi',1),
(7,'RF07','Editoria',1),
(8,'RF08','Gestione servizi di telefonia pubblica',1),
(9,'RF09','Rivendita documenti di trasporto pubblico e di sosta',1),
(10,'RF10','Intrattenimenti, giochi e altre attività di cui al DPR 640/72',1),
(11,'RF11','Agenzie viaggi e turismo',1),
(12,'RF12','Vendita a domicilio',1),
(13,'RF13','Rivendita beni usati, oggetti d’arte, d’antiquariato o da collezione',1),
(14,'RF14','Agenzie di vendite all’asta di oggetti d’arte, antiquariato o da collezione',1),
(15,'RF15','IVA per cassa',1),
(16,'RF16','Agricoltura e attività connesse – regime speciale',1),
(17,'RF17','IVA per cassa (art. 32-bis, DL 83/2012)',1),
(18,'RF18','Altro',1),
(19,'RF20','Regime transfrontaliero di franchigia IVA (Direttiva UE 2020/285)',1);
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
(1,'fattura','MP','Sezionale Fatture Ordinarie A',1),
(2,'pa','PA','Sezionale Fatture PA 01',1),
(3,'nota_credito','NC','Sezionale Note di Credito',1),
(4,'reweicoli','REW','Sezionale reweicoli',1);
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
(2,4),
(3,2);
/*!40000 ALTER TABLE `cfg_sezionali_td_allow` ENABLE KEYS */;
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
  `ordering` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_stato`),
  UNIQUE KEY `uq_fattst_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_stati_fattura`
--

LOCK TABLES `cfg_stati_fattura` WRITE;
/*!40000 ALTER TABLE `cfg_stati_fattura` DISABLE KEYS */;
INSERT INTO `cfg_stati_fattura` VALUES
(1,'bozza','Bozza',10,1),
(2,'emessa','Emessa',20,1),
(3,'inviata','Inviata',30,1),
(4,'pagata','Pagata',40,1),
(5,'scaduta','Scaduta',50,1),
(6,'stornata','Stornata',60,1);
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
(3,'accettato','Accettato',30,1),
(4,'rifiutato','Rifiutato',40,1),
(5,'scaduto','Scaduto',50,1);
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
  `giorni` smallint(5) unsigned DEFAULT NULL,
  `fine_mese` tinyint(1) NOT NULL DEFAULT 0,
  `rate` tinyint(3) unsigned DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_termine`),
  UNIQUE KEY `uq_term_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_termini_pagamento`
--

LOCK TABLES `cfg_termini_pagamento` WRITE;
/*!40000 ALTER TABLE `cfg_termini_pagamento` DISABLE KEYS */;
INSERT INTO `cfg_termini_pagamento` VALUES
(1,'immediato','Pagamento immediato',0,0,NULL,1),
(2,'30gg','30 giorni',30,0,NULL,1),
(3,'60gg','60 giorni',60,0,NULL,1),
(4,'fm','Fine mese',0,1,NULL,1);
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
  `indirizzo` varchar(160) DEFAULT NULL,
  `cap` varchar(10) DEFAULT NULL,
  `citta` varchar(100) DEFAULT NULL,
  `provincia` varchar(10) DEFAULT NULL,
  `nazione` varchar(2) DEFAULT NULL,
  `email` varchar(160) DEFAULT NULL,
  `telefono` varchar(40) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_anagrafiche`
--

LOCK TABLES `tb_anagrafiche` WRITE;
/*!40000 ALTER TABLE `tb_anagrafiche` DISABLE KEYS */;
INSERT INTO `tb_anagrafiche` VALUES
(1,1,NULL,0,1,'attiva','MEDIAPRINT SRL','00865490676','00865490676',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'prova note','2025-04-22 16:19:41','2025-09-23 12:51:40'),
(2,3,NULL,0,1,'attiva','POSTA NETWORK SRLS','01878120672','',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-22 16:23:37','2025-09-11 16:49:03'),
(3,1,NULL,0,1,'attiva','SUOLO E SALUTE SRL','01497070415','01497070415',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'SUOLO E SALUTE SRL\rVIA PAOLO BORSELLINO, 12/B\r61032 FANO(PU)\rPI 01497070415\rsoftware@suoloesalute.it\r\rCommerciale Renato  3487080911\r\rMarcello Tedesco348/5260863\rsoftware@pec.suoloesalute.it\ramministrazione@pec.suoloesalute.it\rsoftware@suoloesalute.it\rper anteprime invio pec: \ramministrazione@pec.suoloesalute.it\r','2025-04-22 16:47:37','2025-09-09 18:12:34'),
(4,1,NULL,0,1,'attiva','PROVINCIA E AMBIENTE S.R.L.','01639410685','01639410685',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Provincia e Ambiente S.p.A. società in house providing – Via del Concilio, 6 – 65121 – Pescara – P.I. 01639410685\r\r\rRecapiti:\remail: giancarmine.diciccio@provinciambiente.eu \rcell. 380/7973511\r\r333/4100915 cavallari \r085/2058819 adele esposito interno 6','2025-04-22 16:50:56','2025-09-01 16:59:00'),
(5,1,NULL,0,1,'attiva','EDELTRIBUTI SOCIETA’ A RESPONS ABILITA’ LIMITATA SEMPLIFICATA','00929020949','00929020949',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'EDELTRIBUTI SOCIETA’ A RESPONSABILITA’ LIMITATA SEMPLIFICATA \rP. IVA 00929020949\rPIAZZA MUNICIPIO 19/A 86048 FORLI’ DEL SANNIO (IS)\redeltributi@virgilio.it \rReferente GIACINTO IARUSCI 3296955773\r\rAntonella La Gatta 3486631684\r\r\r\r\r','2025-04-22 16:52:59','2025-08-21 17:41:17'),
(6,1,NULL,0,1,'attiva','COMUNE DI POGGIO BUSTONE - UFF_EFATTURAPA','00108830571','00108830571',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-22 16:57:28','2025-04-22 16:58:05'),
(7,1,NULL,0,1,'attiva','COMUNE DI SAN BENEDETTO DEL TRONTO - UFF_EFATTURAPA','00360140446',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'\rzazzettap@san-benedetto-del-tronto.gov.it\rMarco Tirabassi <tirabassim@san-benedetto-del-tronto.gov.it>\rtirabassim@san-benedetto-del-tronto.gov.it\rgelosib@comunesbt.it\rriscossionecoattiva@comunesbt.it\r\rIndirizzo: Viale Alcide de Gasperi, 124, 63074 San Benedetto del Tronto Ascoli Piceno \r\rTelefono:0735 7941 \r\rCappelletti Giovanni 3771614323 commerciale poste italiane\rbarbara pierantozzi 0735794546 amministrazione\r\r;isa.galbiati@entedigitaletributi.it  \r\rzazzettap@san-benedetto-del-tronto.gov.it\rTirabassi Marco : tirabassim@san-benedetto-del-tronto.gov.it\r\rPaola Zazzetta\rUfficio riscossione coattiva\rSettore Gestione Risorse\rComune di San Benedetto del Tronto\rTelefono 0735 794521-525\remail: zazzettap@san-benedetto-del-tronto.gov.it\r','2025-04-22 17:00:31','2025-04-22 17:01:01'),
(8,1,NULL,0,1,'attiva','COMUNE DI TORTORETO','00173630674',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'FATTO SOLO PREVENTIVO\rmarchegiani 3351548803\rFORNITURE@COMUNE.TORTORETO.TE.IT\r\rSCARANARI  Maria Rosaria DIRETTO 0861 785339\rDott.ssa Federica D\'Antonio\rTel: 0861/785378\r\rIl reso cartaceo del data entry dovrà essere riconsegnato in via Carducci , 8 Tortoreto lido ','2025-04-22 17:08:43','2025-04-22 17:08:44'),
(9,2,NULL,0,1,'attiva','L.M.D. GLOBAL S.R.L.','02513050449','02513050449',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'POSTALIZZATORE PRIVATO ','2025-04-22 17:12:09','2025-04-22 17:12:10'),
(10,1,NULL,0,1,'attiva','AG.EN.A. SOCIETA’ A RESPONSABILITA’ LIMITATA','01522110673',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'contratto fornitura bollettazione periodica\rcontabilità - Manola Pompilii - AGENA Teramo\rstampa ed imbustamento 0,18 +iva\roneri affrancatura 0,60 esente iva art 15\rgestione file euro 10,00\rAGENA SCRL E’ PIAZZA GARIBALDI 56, 64100 TERAMO\r\rcliente di chi cerca trova\r\r\r12 uscite 1/2  pagina  a € 55,00  c.u totale 660,00 + iva','2025-04-22 17:13:00','2025-07-28 12:04:24'),
(11,3,NULL,0,1,'attiva','SCELGO S.P.A.','01679850675','01679850675',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'cliente di riferimento\r\rDIRETTO GIORDANA 0861/8050228 cell 349/8421650\rDIRETTO ELITA  0861/8050238\r\rAntonini Davide -  amministratore\r\rx fatture     mgrazia.belleggia@multicash.it','2025-04-22 17:15:06','2025-04-22 17:15:50'),
(12,1,NULL,0,1,'attiva','ARTELITO S.P.A.','01413450436',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-22 17:16:41','2025-04-22 17:17:00'),
(13,1,NULL,0,1,'attiva','GISERVICE SRL','01632540678','01632540678',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'\rGiservice srl\rvia del Baluardo 10\r64100 Teramo\rP.Iva / Cod. Fiscale 01632540678\rCodice Destinatario KRRH6B9\r\rMobile 335 1313039\r\r','2025-04-22 17:19:50','2025-04-22 17:19:51'),
(14,1,NULL,0,1,'attiva','AGE SRL','09497361007','09497361007',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'ARTIGRAFICHE PICENE \r\rAGE SRL\r- Sede legale : Via di Donna Olimpia n. 20 -00152 – Roma\r- P.I. e C.F. 09497361007\r- Codice univoco: BA6ET11\r- pec: consorzioage@pec.it\r-IBAN: IT53I0344122000CC0160521837\r','2025-04-22 17:21:47','2025-04-22 17:23:16'),
(15,1,NULL,0,1,'attiva','COMUNE DI BELLANTE ','00212050678',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Bellante (TE) - Piazza Mazzini, 1 - 64020 Bellante (TE) - Tel 0861.61701 - Fax 0861.6170330\rPEC protocollo@pec.comune.bellante.te.it - Mail protocollo@comune.bellante.te.it -  P.IVA 00212050678 - c/c postale n. 10750644\r\rDI GIUSEPPE diretto 08616170338 - 3393684818','2025-04-22 17:28:48','2025-04-22 17:28:49'),
(16,1,NULL,0,1,'attiva','COMUNE DI CITTÀ SANT’ANGELO',NULL,'00063640684',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'DIRETTO Dott.ssa VERRIGNI 085 9696275\r\rResponsabile affidamenti Dott.ssa De Berardinis diretto 0859696228 mail : stefania.deberardinis@comune.cittasantangelo.pe.it\r\r;elena.verrigni@comune.cittasantangelo.pe.it;verrigni.e@comune.cittasantangelo.pe.it\rvalerio.danteo@comune.cittasantangelo.pe.it\r0859696211\r 085.9696.270Franca Crocetta ','2025-04-22 17:32:14','2025-05-08 12:49:18'),
(17,1,NULL,0,1,'attiva','ARTIGRAFICHE DI GALVAN IVANO & C. - S.N.C.\r','00201290681','00201290681',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-22 17:41:43','2025-04-22 17:41:44'),
(18,1,NULL,0,1,'attiva','O.P.S.  S.P.A.','01891040691',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'\rroberta.gallo@opschieti.it -> anteprime per lavorazione CPS\r\rInviare anteprime anche a \rprogrammazione.vit@opschieti.it\r\rcontratto fornitura bollettazione periodica\rprogrammazione.vit@opschieti.it; opschieti@pec.aruba.it\r\rLuciano Consorti 0871/5857241-223-232\r\rBollo ed affrancatura posta prioritaria 0,85 + IVA\rstampa ed imbustamenti 0,13 +iva\rposta raccomandata  tipo 1 e tipo 2 prezzi affrancatura euro 3,8 +\r lav euro 0,39\rdal 1/06/12 \raffrancature euro 0,60 esente iva \rlavorazioni di posta prioritaria a euro 0,17\r\r PER CONTABILITà \rPAOLO DI SIPIO 0871/5857210  x fatture    email : info.ops@opschieti.it\rF. Stampone Responsabile tecnico 0871/5857232  349/4598820   331/2302492\r\rFERDINANDO    0871/5857232  349/4598820\rpaolo.disipio@opschieti.it\rGIOVANNI MAY 335/1823022\r0871 5857243 ROBERTA GALLO \rIdentificativo fiscale ai fini IVA: IT01891040691 \r\rDenominazione: OPS SPA  \r\rIndirizzo: VIA PADRE U. FRASCA \r\rComune: CENTRO DIR. DAMA - CHIETI SCALO \r\rProvincia: CH \r\rCAP: 66100 \r\rNazione: IT \r\rCodice Destinatario M5UXCR1\r \r\r','2025-04-22 17:50:10','2025-08-21 17:42:03'),
(19,1,NULL,0,1,'attiva','MAGIF SERVIZI S.R.L.','01257860567',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Magif Servizi Srl \rVia San Donato snc 01030 CARBOGNANO (VT) \rPI 01257860567\rAmministratore Magif Servizi è Mizzella Marisa\r0761/613199 \remail amministrazione@magifservizi.it   Amministratore Marco Nardocci +39 3357353702\r\r!!!!!!!!!!!!!!!!!per info tecniche inviare a : areatecnica@magifservizi.it\r\rNostro referente a cui inviare all’ATT off è Marco Mizzella (del quale ho cellulare personale)\rmarco@magifservizi.it\rper la parte webmaster metta Tiziana Tinnirello email webmaster@magifservizi.it telefono 3498654863,               nardocci3920132602\r\r\rReferenti webmaster \rLuigi Scorrano +39 3920132602 webmaster@magifservizi.it\rTiziana Tinnirello tiziana.tinnirello@gmail.com \rMarco Nardocci +39 3357353702  marco@magifservizi.it\r\r\r','2025-04-22 17:56:11','2025-04-22 17:56:51'),
(20,1,NULL,0,1,'attiva','COMUNE DI MONTELPARO',NULL,'81000670448',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-22 17:58:42','2025-04-22 17:58:43'),
(21,1,NULL,0,1,'attiva','SINERGIE MANAGEMENT TEAM DI CARLA GABRIELLI & C. S.A.S.','02113600429','02113600429',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'SINERGIE MANAGEMENT TEAM sas di C. GABRIELLI & C.\rCodice Fiscale:   02113600429\rSede legale:          VIA SALARIA, 34 – 63079 – COLLI DEL TRONTO (AP)\r\r\r\r','2025-04-22 18:02:00','2025-04-22 18:02:01'),
(22,3,NULL,0,1,'attiva','POLISERVICE S.P.A.','01404160671',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Daniela saccuti 320/3297417\rRusciano 320/3297421\r\r\rFATTURARE A (NO SPLIT PAYMENT)\rPOLISERVICE SPA\rPIAZZA G.MARCONI, 10\r64015 NERETO (TE)\rP.IVA 01404160671\rCODICE: DDJIYTO\r\r','2025-04-22 18:03:59','2025-04-22 18:04:21'),
(23,1,NULL,0,1,'attiva','COMUNE DI ROSETO DEGLI ABRUZZI','00176150670',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'COMUNE DI ROSETO DEGLI ABRUZZI\rP.I. 00176150670                              http://www.comune.roseto.te.it/ \rSettore III  “Ragioneria-Programmazione  Economica–Finanze –Patrimonio–Farmacia”\r GABRIELLA INNAMORATI 085/89453615\rUfficio Acquisti-Economato\r-     Tel.:  085 89453 1 \r-     Fax:  085 89453 620\rE-mail: digianvittorio.roberto@comune.roseto.te.it  085-89453607\rdimarzio.ingrid@comune.roseto.te.it - 085-89453651\rgestione lampade votive La valle   085/89453562\rAlberto 3283327845\r\rMATRiCIANI ALBERTO - GESTIONE TESORERIA 08589453622\r\rPiazza della Repubblica \r64026 Roseto degli Abruzzi (TE) ','2025-04-22 18:08:19','2025-07-31 16:34:56'),
(24,1,NULL,0,1,'attiva','COMUNE DI MARTINSICURO','00505580670','82001180676',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'DIRETTO PIERO 0861/768255\rDIRETTO SANDRA 0861/768254\r\r','2025-04-22 18:14:18','2025-04-22 18:14:19'),
(25,1,NULL,0,1,'attiva','COMUNE DI GAETA - UFF_EFATTURAPA','00142300599',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Gaeta\rPiazza XIX Maggio 10\r04024 Gaeta LT\r\r0771 4691 \r\rCOSAP --> D.ssa Sciarra--> 0771469411\r\rserenella 347/1473441\rD.ssa Serenella Simeone - Funzionario tributi - Comune di Gaeta <serenella.simeone@comune.gaeta.lt.it>','2025-04-22 18:16:35','2025-04-22 18:16:54'),
(26,1,NULL,0,1,'attiva','COMUNE DI FONTE NUOVA','06905571003','97249250586',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'18577,50\r\rUFFICIO ISTRUZIONE vsbordone@fonte-nuova.it;\r\rNazzareno Rosari <nrosari@fonte-nuova.it>  06/905522355\r\rVeronica 3208160647\rgiorgio  06/905522357    3394660651\rlinda 06/905522356 347/1788155\rsbordone 320/8160647\rCODICE UFFICIO FATTURA:   L6CMCF - PUBBICA ISTRUZIONE','2025-04-22 18:33:15','2025-04-22 18:33:55'),
(27,1,NULL,0,1,'attiva','FC GRAFICA ALLESTIMENTI GRAFICI','02016240687',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'ABI : 08473\rCAB: 77250\rMontesilvano 11/07/2016\rOggetto: variazione coordinate bancarie\rCon la presente si portano a conoscenza fornitori e clienti della variazione delle nostre\rcoordinate bancarie :\rNUOVO IBAN : IT 78 W 08473 77250 000000127977\rBCC di Castiglione Messeraimondo e Pianella\rFiliale di Città Sant’Angelo, via Tito De Cesaris, 4 (PE).\rVi invitiamo, pertanto, a prenderne nota e aggiornare le VS. anagrafiche sia per le emissioni di\rricevute bancarie che per la disposizione di bonifici.\rRingraziamo per la cortese collaborazione e porgiamo cordiali saluti.\rRina Ricci','2025-04-23 10:17:52','2025-04-23 10:22:12'),
(28,1,NULL,0,1,'attiva','S.I.E.L. S.R.L.','01565050448',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'MAGGIOLI S.p.A. \rVia del Carpino, 8 - 47822 Santarcangelo di Romagna (RN) \rCapitale Sociale Euro 2.197.920,00 i.v. \rIscrizione Registro delle Imprese della Romagna Forlì-Cesena e Rimini e Codice Fiscale 06188330150 \rR.E.A. RN-219107 \rPartita IVA 02066400405 \rLa società incorporante Maggioli S.p.A. a far data dal 01/09/2024, subentra di diritto, ai sensi dell\'art. 2504 bis e.e., in tutti i rapporti giuridici di qualsiasi natura facenti capo alla suddetta società incorporata SIEL Sri.\rPertanto le fatture e ogni altro documento fiscale riportante la data dal 01/09/2024 dovranno essere intestati a MAGGIOLI S.p.A. \r\r\rcontatto generato ad agosto 2015 e seguito da Mariano con l\'amminstartore\r utilizzano Postel come unico fornitore pagano un prezzo di 0,80 iva incl per il servizio di invio 3 elementi, hanno accordi con poste per lo scambio di software, ma sono anche concorrenti, hanno circa 200 Comuni di cui circa 60 gestiscono invio tributi\r\rGianluca Giandomenico (S.I.E.L. srl) <luca@sielsrl.net>','2025-04-23 10:25:42','2025-04-23 10:25:43'),
(29,1,NULL,0,1,'attiva','PALITALSOFT  S.R.L','00994810430',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'BANCA POPOLARE ANCONA – Ag. Nr. 1 – JESI (AN)\rCodice IBAN: IT 42 V 05308 21285 00000000788\r\rcomune di tradate sig gianluca 348/5132024\r\ramministrazione roberta  0731 229108\r\rRosanna Rossi Brunori T. +39 0731 229197\rAPRA 0731 22911\r\rSIG.RA GAGGIA DI GESENU 0755743604','2025-04-23 10:28:40','2025-09-01 17:20:54'),
(30,1,NULL,0,1,'attiva','COMUNE DI SPINETOLI','00362890444',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Spinetoli\rPiazza Leopardi, 31 - 63078 Spinetoli (AP) - Tel.0736/890298 - Partita Iva: 00362890444 - PEC: protocollo@pec.comune.spinetoli.ap.it -\r\r15/12/22 Daniela Felicioni - Tributi Spinetoli <daniela.felicioni@comune.spinetoli.ap.it> \r0736899060\r\rgiuseppe d\'angelo 0736/899060','2025-04-23 10:31:22','2025-04-23 10:31:23'),
(31,1,NULL,0,1,'attiva','COMUNE DI BELMONTE PICENO','00433470440','81001490440',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'cliente di Mara sinergie \r\r','2025-04-23 10:32:42','2025-04-23 10:32:59'),
(32,1,NULL,0,1,'attiva','ENTE DIGITALE TRIBUTI SRL','08648600966','08648600966',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'BANCA POPOLARE DI MILANO\rC/C 0000798\rIBAN IT35S0558432430000000000798\r marialisagalbiati@alice.it \r\risa.galbiati@entedigitaletributi.it  \r\rfabio.giudetti@entedigitaletributi.it','2025-04-23 10:36:01','2025-04-23 10:36:02'),
(33,1,NULL,0,1,'attiva','COMUNITA’ DI S.EGIDIO - ACAP - APS','02132561008','80191770587',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'OLIVIERI X Sant\'egidio 0658566354\rStella Cervogni 06585661  mobile 3395071971\rPaola Federici  3388256177\rValeria Olivieri 3357470254\r\r\r','2025-04-23 10:41:36','2025-05-08 12:49:21'),
(34,1,NULL,0,1,'attiva','D’AURIA PRINTING S.P.A.','00954720678','01168680682',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'D’AURIA PRINTING SPA\rSede legale: Via dell’Aspo 1 – 63100 Ascoli Piceno - AP\rSede operativa e recapito: Zona industriale destra Tronto – 64016 Sant’Egidio alla Vibrata - TE\rCodice fiscale       01168680682\rPartita IVA           00954720678\rCodice SDI           SUBM70N    (sesto carattere pari a zero)\rdauriaprinting@pec.it\rIBAN IT86 H 03069 13506 1000 0000 2177\r\r\r','2025-04-23 10:52:26','2025-05-08 12:48:26'),
(35,1,NULL,0,1,'attiva','LITOEMME SRL','01846690442',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'LITOEMME S.r.l. Unipersonale\r\rVia Archetti, scn\r63831 RAPAGNANO (Fermo)\rTel. 0734.518014 - 0734.515642\rFax 0734.514549\rwww.litoemme.it\rE-mail: info@litoemme.it\rPartita IVA 01846690442\rCap. Soc. 100.000,00 euro i.v.\rBanca della provincia di Macerata\rAgenzia di Porto San Giorgio (FM)\rAbi 03317 • Cab 69660\rIBAN IT97Y\r?03317?\r69660000310300241\r\r\r\r','2025-04-23 10:55:50','2025-04-23 10:56:51'),
(36,1,NULL,0,1,'attiva','COMUNE DI FORMIA','00087990594','81000270595',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Codice Ufficio JIJWR5 - Ufficio Fatturazione \rPEC SERVIZIO FATTURAZIONE finanza@pec.cittadiformia.it \rCANALE DI TRASMISSIONE PEC \rPosta elettronica Dirigente del Settore Dr.ssa livornese : tlivornese@comune.formia.lt.it \r \rc/a livornese Tiziana \rmastantuono 3394025400\r\rresponsabile tributi Dr. Daniele Rossi 0771778850\rdrossi@comune.formia.lt.it\r \r\r','2025-04-23 10:59:02','2025-04-23 10:59:03'),
(37,1,NULL,0,1,'attiva','COMUNE DI ITRI','00279170591','81003170594',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Piazza Umberto I, 1 - 04020 Itri (LT)\rTel. 0771.7321 - Fax 0771.721108\rP.IVA: 00279170591 \rC.F.: 81003170594\r\rgiorgio.colaguori@libero.it; tributi@comune.itri.lt.it\r','2025-04-23 11:00:23','2025-04-23 11:00:41'),
(38,1,NULL,0,1,'attiva','COMUNE DI SANTE MARIE\r','00191110667','00191110667',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:01:40','2025-04-23 11:01:41'),
(39,1,NULL,0,1,'attiva','COMUNE DI MACHERIO\r','00702660960','01039700156',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'     Il Responsabile Uffici  (Dott. Benedetto Cavallé)\r\r','2025-04-23 11:02:43','2025-04-23 11:03:01'),
(40,1,NULL,0,1,'attiva','COMUNE DI RICCIONE','00324360403','00324360403',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'ufficio pagamenti  kATIA  0541/608354\rTamara 3315222646 da chiamare solo x urgenze\r\rValeria 0541 608260\rGrossi Daniele 0541 608250\r\rMI5WX4 \r\r','2025-04-23 11:04:18','2025-04-23 11:04:19'),
(41,1,NULL,0,1,'attiva','COMUNE DI VIMODRONE ','00858950967','07430220157',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:06:45','2025-04-23 11:07:03'),
(42,1,NULL,0,1,'attiva','COMUNE DI ACQUAVIVA PICENA','00376660445',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:09:30','2025-04-23 11:09:31'),
(43,2,NULL,0,1,'attiva','MAIL EXPRESS POSTE PRIVATE SRL','01436910671','01436910671',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Via Pascoli, Zona Artigianale - C.da Ripoli\r64023 Mosciano S.Angelo (TE)\rCentralino: 085.90.40.350\rFax: 085.80.71.977\r\rReferente. Dott. Franco Gaspari \r\rFabio il Grande  3475562922','2025-04-23 11:11:10','2025-05-08 12:50:44'),
(44,1,NULL,0,1,'attiva','COMUNE DI CALLIANO','00410550222','00410550222',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'COMUNE DI CALLIANO - Via Roma, 117 - 14031 - Calliano  (AT)\r\rPer fatture Ornella','2025-04-23 11:12:08','2025-04-23 11:12:09'),
(45,1,NULL,0,1,'attiva','CVM - COMUNITÀ VOLONTARI PER IL MONDO','02130480425','00316140433',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Dir. Comunicazione e Raccolta Fondi\rCVM - Comunità Volontari per il Mondo\rV.le delle Regioni,6\r63822 - Porto San Giorgio (FM)\r0734/674832\r6 uscite   a € 200,00+ iva\rcvm.comunicazione@gmaail.com\rcoord.italia@cvm.an.it\r\rAscani Attilio  3202492203','2025-04-23 11:13:49','2025-04-23 11:13:50'),
(46,1,NULL,0,1,'attiva','BANCA DI CREDITO COOPERATIVO DELL’ADRIATICO TERAMANO SOC CO','15240741007','01469670671',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'AGGIORNATA p.iva modificata il 19/8/2019\rofelio.liberati@fedam.bcc.it\rBernava Arturo 085/8071544 (int.207) \rcell 3388608575.\rcome da accordi telefonici, le comunico i miei riferimenti di segreteria generale:\rPaolo Ruffini\rpaolo.ruffini@fedam.bcc.it\rtel. 085.8077544.201\rPAOLO RUFFINI  085/8071544 (int.2 poi 1) - 3282921847 ','2025-04-23 11:16:18','2025-05-08 12:49:32'),
(47,1,NULL,0,1,'attiva','COMUNE DI PIZZOLI','80007080668','80007080668',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'329-4523278 Alessia Salvatori Pizzoli\r\r','2025-04-23 11:18:00','2025-04-23 11:18:01'),
(48,1,NULL,0,1,'attiva','COMUNE DI SAN VITO CHIETINO','00094240694',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di San Vito Chietino\rLargo Altobelli, 1 - 66038 San Vito Chietino\rTel. 0872.61911 - Fax 0872.619150\re-mail: info@comunesanvitochietino.gov.it - pec: protocollosanvitochietino@pec.it\rP. I.V.A. 00094240694\r\rUFB9OX.\r\r','2025-04-23 11:19:25','2025-04-23 11:19:26'),
(49,1,NULL,0,1,'attiva','TIPOGRAFIA S. GIUSEPPE SRL','00082440439',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'STEFANO 3470751321\r\rIBAN aggiornato il 27/2/2019','2025-04-23 11:20:26','2025-04-23 11:20:27'),
(50,1,NULL,0,1,'attiva','COMUNE DI OPI ','00181620667','00181620667',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:21:07','2025-04-23 11:21:08'),
(51,1,NULL,0,1,'attiva','COMUNE DI PESCINA','00215570664',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'COMUNE DI PESCINA (AQ) Piazza Mazzarino - 67057 Pescina ( AQ)  Tel  0863-84281 - Fax 0863-841067 ','2025-04-23 11:22:04','2025-04-23 11:22:16'),
(52,1,NULL,0,1,'attiva','COMUNE DI ACQUASANTA TERME','00356080440',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Serena 0736/80162 interno 416 3342203224','2025-04-23 11:24:24','2025-04-23 11:24:25'),
(53,1,NULL,0,1,'attiva','COMUNE DI CASTEL DEL MONTE\r','00114540669','80002030668',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'nanni','2025-04-23 11:25:29','2025-04-23 11:25:30'),
(54,1,NULL,0,1,'attiva','COMUNE DI MORRO D’ALBA \r\r','00184460426','00184460426',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Morro d\'Alba\rPiazza Romagnoli, 6 - 60030\rPEC comune.morrodalba@legalmail.it\r\r\r0731/63000 int.6 mancinelli marta','2025-04-23 11:26:26','2025-05-08 12:49:38'),
(55,1,NULL,0,1,'attiva','COMUNE DI PALMIANO','00424620441','80001650441',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:27:15','2025-04-23 11:27:33'),
(56,1,NULL,0,1,'attiva','AVIS SPINETOLI/PAGLIARE','92015220442','92015220442',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'ASSOCIAZIONE DONATORI\r\rspinetolipagliare.comunale@avis.it\r','2025-04-23 11:28:32','2025-04-23 11:28:33'),
(57,1,NULL,0,1,'attiva','COMUNE DI GRANAROLO DELL’EMILIA','00701911208','80008270375',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Dott.ssa Daniela Ballandi\rComune di Granarolo dell\'Emilia\rvia S. Donato, 199 - 40057 Granarolo dell\'Emilia  Bo\rtel. 051/6004319  fax 051/6004385 \r\rcristiana.garavina@comune.granarolo-dellemilia.bo.it\r','2025-04-23 11:30:10','2025-05-08 12:49:45'),
(58,1,NULL,0,1,'attiva','COMUNE DI CONTROGUERRA','00592770671',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'mauro scarpatonio 320/2895494','2025-04-23 11:31:27','2025-04-23 11:31:45'),
(59,1,NULL,0,1,'attiva','COMUNE DI ORICOLA','00181950668','00181950668',NULL,NULL,NULL,NULL,'IT',NULL,NULL,' Simonetta D\'Ortenzio 333/1351770','2025-04-23 11:33:15','2025-04-23 11:33:16'),
(60,1,NULL,0,1,'attiva','COMUNE DI LABRO','00108300575','00108300575',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:34:12','2025-04-23 11:34:13'),
(61,1,NULL,0,1,'attiva','COMUNE DI LECCE NEI MARSI','81004960662','81004960662',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:35:32','2025-04-23 11:35:33'),
(62,1,NULL,0,1,'attiva','COMUNE DI COLLI SUL VELINO','00108930579','00108930579',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Servizi Finanziari | Comune Colli sul Velino <servizifinanziaricsv@comunecollisulvelino.it>','2025-04-23 11:36:23','2025-04-23 11:36:24'),
(63,1,NULL,0,1,'attiva','TEKNOPOST SRL','02286920695','02286920695',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Service e postalizzatore privato','2025-04-23 11:38:23','2025-04-23 11:38:24'),
(64,1,NULL,0,1,'attiva','A.F.G. S.R.L.','01918421007','07959250585',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'AFG Srl \rP.IVA 01918421007 C.F. 07959250585\rSede Operativa: Via Colli, 14/A – 67069 Tagliacozzo (AQ)\rTel: 0863698635 Fax: 0863688035\re-mail: info@afgsrl.com PEC: info@pec.fgsrl.eu\rCodice Univoco Fatturazione M5UXCR1\r\r','2025-04-23 11:41:20','2025-07-31 16:52:14'),
(65,1,NULL,0,1,'attiva','COMUNE DI ALFEDENA','00201210663','82000570661',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:54:46','2025-04-23 11:55:04'),
(66,1,NULL,0,1,'attiva','COMUNE DI MASSA D’ALBE','00187170667',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:55:43','2025-05-08 12:49:49'),
(67,1,NULL,0,1,'attiva','COMUNE DI CASTIGNANO ','00358540441','00358540441',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Castignano - SITO ISTITUZIONALE\rVia Margherita, 25 | 63072 Castignano (AP)\rtel: 0736 822128/821432| fax: 0736 822086 \rP.iva: 00358540441  |  Cod.fisc.: 00358540441\rUF21RT\r\r\rVecchia email:\rValloraghi.roberta@comune.castignano.ap.it','2025-04-23 11:56:57','2025-04-23 11:56:58'),
(68,1,NULL,0,1,'attiva','COMUNE DI ORTONA DEI MARSI','00224020669',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 11:57:33','2025-04-23 11:57:34'),
(69,1,NULL,0,1,'attiva','COMUNE DI SIROLO','00349870428','00268450426',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'RICHIESTA TELEFONICA  PREVENTIVO DEL 22/07/2016 \r\rroberta.draghelli@comune.sirolo.an.it\r\rla partita iva 00349870428\r\rcodice fiscale 00268450426','2025-04-23 11:58:30','2025-04-23 11:58:31'),
(70,1,NULL,0,1,'attiva','COMUNE DI BISEGNA','00213000664',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Via Vittorio Emanuele, 67050 Bisegna AQ\rTelefono: 0863 85283\r\r','2025-04-23 11:59:28','2025-04-23 11:59:29'),
(71,1,NULL,0,1,'attiva','COMUNE DI MORRO REATINO','00108310574',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'email segretario matteocci.segretariocomunale@gmail.com','2025-04-23 12:00:35','2025-04-23 12:00:53'),
(72,1,NULL,0,1,'attiva','COMUNE DI MONTEGALLO','00357070440',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Montegallo - SITO ISTITUZIONALE\rFrazione Balzo Piazza Taliani, 5 | 63094 Montegallo (AP)\rTel: (+39) 0736-806122\r\rresponsabile tributi Petrocchi Romea 0736806122','2025-04-23 12:01:30','2025-04-23 12:01:48'),
(73,1,NULL,0,1,'attiva','COMUNE DI PIANELLA ','00225910686',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Pianella \r Piazza G. Garibaldi, 13 \r 65019 Pianella (Pe) \r Posta elettronica certificata: protocollo@pec.comune.pianella.pe.it \r	Centralino: +39.085.97301 \r P. IVA 00225910686 \r\rLORENA GIANSANTE 3299813487','2025-04-23 12:02:10','2025-04-23 12:02:11'),
(74,1,NULL,0,1,'attiva','COMUNE DI OFENA ','00630840668',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:03:06','2025-04-23 12:03:07'),
(75,1,NULL,0,1,'attiva','COMUNE DI CARASSAI ','00730930443','82001930443',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Cliente di sinergie Mara \r\r\r329/6217105 Giovanni SASSU ','2025-04-23 12:04:08','2025-04-23 12:04:09'),
(76,1,NULL,0,1,'attiva','COMUNE DI MONTEMONACO','00357080449',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Montemonaco\rPiazza Risorgimento 8\r63088 Montemonaco AP','2025-04-23 12:05:07','2025-04-23 12:05:08'),
(77,1,NULL,0,1,'attiva','COMUNE DI SANT’OMERO','00523850675','00523850675',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Sant\'Omero\r(Provincia di Teramo)\rVia Vittorio Veneto - 64027 Sant\'Omero (Teramo)\rCentralino 0861/88.098\rFax 0861/88.555\rurp@comune.santomero.te.it\r\rSINDACO ANDREA LUZI 3204863431\r','2025-04-23 12:08:19','2025-05-08 12:49:55'),
(78,1,NULL,0,1,'attiva','AIRONE SERVIZI S.R.L.','02623230121','02623230121',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Airone Servizi srl\rVia Groane 42/A\r20812 Limbiate\rC.F. e P.IVA 02623230121\rCodice destinatario KRRH6B9\r\rUnicredit IBAN: IT95G02008332610000027770101 -> errato 28 caratteri\r\r\r\r\r','2025-04-23 12:11:29','2025-04-23 12:11:47'),
(79,1,NULL,0,1,'attiva','COMUNE DI MONTEFIORE DELL’ASO','00291360444','00291360444',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:12:16','2025-05-08 12:50:00'),
(80,1,NULL,0,1,'attiva','COMUNE DI MONTEFORTINO','00400660445',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'CLIENTE SINERGIE MANAGEMENT TEAM sas di C. GABRIELLI & C.','2025-04-23 12:13:19','2025-04-23 12:13:20'),
(81,1,NULL,0,1,'attiva','COMUNE DI SCOPPITO\r','00183860667',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:14:36','2025-04-23 12:14:37'),
(82,1,NULL,0,1,'attiva','COMUNE DI LAZZATE','00758650964','03611240155',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:15:12','2025-04-23 12:15:13'),
(83,1,NULL,0,1,'attiva','CISIA PROGETTI - SOCIETA’ A RESPONSABILITA’ LIMITATA','00566000675',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'ROMANO MARINO CISIA 3492638177\rr.marini@cisiaprogetti.it\rAREA FTP CONSEGNA DATI DATA ENTRY:\r\rM\rusername: cisiaprogetti\rPw:            f6de6a776e0\r','2025-04-23 12:16:38','2025-07-31 18:25:54'),
(84,1,NULL,0,1,'attiva','COMUNE DI CAMPLI',NULL,'80005970670',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Campli\rVia V. Emanuele II 9\r64012 Campli TE','2025-04-23 12:17:47','2025-04-23 12:17:48'),
(85,1,NULL,0,1,'attiva','COMUNE DI CAMPO DI GIOVE','00189320666','92018480669',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune Campo di Giove\rPiazza Regina Margherita, 6 - 67030 CAMPO DI GIOVE (AQ) IT\rTel:+39 086440116 - Fax:+39 0864 408040 - C.F.92018480669 - P.IVA 00189320666\rPEC: comune.campodigiove.aq@pec.comn\r\r\rdott.ssa Maria Verna ufficio tributi 0864.40116 - Int. 6 - 7','2025-04-23 12:19:12','2025-04-23 12:19:13'),
(86,1,NULL,0,1,'attiva','COMUNE DI CASTELLALTO','00267060671','80004770675',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:20:12','2025-04-23 12:20:13'),
(87,1,NULL,0,1,'attiva','COMUNE DI CERIANO LAGHETTO','01617320153',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:21:04','2025-04-23 12:21:05'),
(88,1,NULL,0,1,'attiva','COMUNE DI CISTERNINO ','02152680746',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:21:55','2025-04-23 12:21:56'),
(89,1,NULL,0,1,'attiva','COMUNE DI CIVITELLA DEL TRONTO','00467160677',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'COMUNE DI CIVITELLA DEL TRONTO\rDott.ssa Marina Bozzelli\rArea Ragioneria e Tributi\rUfficio Tributi\rVia Mazzini,34\r64010 CIVITELLA DEL TRONTO (TE)\rTel 0861 918321 \r','2025-04-23 12:22:47','2025-04-23 12:22:48'),
(90,1,NULL,0,1,'attiva',' COMUNE DI COPERTINO ','02255920759','80008830756',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Cod. Fiscale 80008830756 P.Iva 02255920759. Indirizzo Comune di Copertino – Area AA.GG. e Fin. Settore finanziario – Via Malta 10 – 73043 Copertino \rIL DIRIGENTE AREA AA.GG. E FIN.\rDR. ALESSANDRO CAGGIULA  \r','2025-04-23 12:24:28','2025-04-23 12:24:29'),
(91,1,NULL,0,1,'attiva','COMUNE DI COREGLIA ANTELMINELLI','00357880467',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Piazza Antelminelli, 8\r 55025 – Coreglia Antelminelli – LU\rTelefono:  +39 0583 78152\r Fax:  +39 0583 78419\r\rCellulare Reperibilità:  335 215573\rragioneria 058378344\r','2025-04-23 12:25:47','2025-04-23 12:26:05'),
(92,1,NULL,0,1,'attiva','COMUNE DI FALERONE ','81001750447','81001750447',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Falerone\rPiazza della Concordia 6\r63837 Falerone FM\r0734 719813','2025-04-23 12:26:24','2025-04-23 12:26:41'),
(93,1,NULL,0,1,'attiva','COMUNE DI FOLIGNANO',NULL,NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:26:52','2025-04-23 12:26:53'),
(94,1,NULL,0,1,'attiva','COMUNE DI JESI','00135880425',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'DOTTORESSA  PAOLA PICCIONE 0731/538441','2025-04-23 12:28:20','2025-04-23 12:28:38'),
(95,1,NULL,0,1,'attiva','COMUNE DI LORETO APRUTINO','00127900686','00127900686',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Via Roma, 1\rLoreto Aprutino Pescara\r085 829401','2025-04-23 12:28:58','2025-04-23 12:28:59'),
(96,1,NULL,0,1,'attiva','COMUNE DI MONSAMPOLO DEL TRONTO','00395630445','82000530442',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Rag. Stefano Giostra\rResponsabile del Procedimento\rTributi-Ced-Personale\rComune di Monsampolo del Tronto\rCorso Vittorio Emanuele III, 87 - 63077\rTel.: (+39) 0735-704116/704218 int. 6\rFax: (+39) 0735-706004\re-mail: tributi@comune.monsampolodeltronto.ap.it\r           ced@comune.monsampolodeltronto.ap.it\rPEC: comune.monsampolodeltronto@pec.it\r','2025-04-23 12:30:17','2025-04-23 12:30:18'),
(97,1,NULL,0,1,'attiva','COMUNE DI MONTESILVANO',NULL,'00193460680',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Piazza Diaz, 1 - 65016 Montesilvano (PE) Telefono: +39.085.44811 - Fax: +39.085.834408 - Cod. Fisc 00193460680\r\rDi Adamo\r\r347 5200765\r\rSig. Lancianese','2025-04-23 12:31:46','2025-04-23 12:31:47'),
(98,1,NULL,0,1,'attiva','COMUNE DI MONTORIO AL VOMANO','00580460673',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:32:57','2025-04-23 12:32:58'),
(99,1,NULL,0,1,'attiva','COMUNE DI MORRO D’ORO','00516370673','81000370676',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:33:40','2025-05-08 12:50:35'),
(100,1,NULL,0,1,'attiva','COMUNE DI PORTO RECANATI','00255040438','00255040438',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Porto Recanati\rpiazza Del Borgo, 12Porto\rRecanati - 62017 (62017) Marche\r\rCITTA’ DI PORTO  RECANATI\rProvincia di Macerata\rc.f. e IVA 00255040438  - UFFICIO ECONOMATO\rtel. 071/7599736-5 fax 071/7599739\rmail : economato@comune.porto-recanati.mc.it\rALLEGATO A –','2025-04-23 12:34:21','2025-04-23 12:34:22'),
(101,1,NULL,0,1,'attiva','COMUNE DI  PORTO SAN GIORGIO','00358090447','81001530443',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di. Porto San Giorgio via Veneto, 5; cap:63822 tel: O734 6801, fax: O734 680234 C.F. 81001530443 - P.IVA 00358090447\r\rofferta MEPA aggiudicata il 04/09/2015 prezzo € 0,1745\rspese di spedizione a parte\rpeso entro i  20 gr.\rCONTATTI:\rDott. mercuri  (maurizio.mercuri@comune-psg.org)\rDott.ssa Bracalente Caterina (0734 680252) caterina.bracalente@comune-psg.org\r\rFABIO ANDRENACCI 0734/680210','2025-04-23 12:35:33','2025-04-23 12:35:34'),
(102,1,NULL,0,1,'attiva','COMUNE DI SAN SALVO ','00247720691','00247720691',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Dott.ssa Francesca Ciccotosto   Ufficio Tributi   tel. 0873/340227\r\r \r\r\r','2025-04-23 12:36:38','2025-04-23 12:36:56'),
(103,1,NULL,0,1,'attiva','COMUNE DI SANTI COSMA E DAMIANO','02186110595','81003550597',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:37:10','2025-04-23 12:37:11'),
(104,1,NULL,0,1,'attiva','COMUNE DI SCERNI','00236730693',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Scerni                                                                                                \rVia IV Novembre 18  66020 Scerni CH \rPIVA 00236730693  \r0873919125 pec protocollo@comunediscerni.legalmail.it\rCodice univoco UFMBAN\rReferente Tributi Raimondo Cianci tributi@comunediscerni.com\r\r  \r ','2025-04-23 12:38:00','2025-04-23 12:38:01'),
(105,1,NULL,0,1,'attiva','COMUNE DI SELLIA MARINA','00360710792','00360710792',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'COMUNE DI SELLIA MARINA\rP.IVA: 00360710792\rIndirizzo: Via Acqua Delle Mandrie SELLIA MARINA (CZ)','2025-04-23 12:39:12','2025-04-23 12:39:13'),
(106,1,NULL,0,1,'attiva','COMUNE DI TOSSICIA','00235690674','80000370678',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Dott.ssa Gabriella Zuccarini\rResp. Ufficio Finanziario\r____________________________________\rCOMUNE DI TOSSICIA\rProvincia di Teramo\rServizio Finanziario\re-mail  P.E.C.: finanziario@comunetossicia.gov.it\rC. da Piana dell’Addolorata – 64049 Tossicia\rTel. 0861-698014 – fax 0861-698170\rC.F. 80000370678 – P.I. 00235690674\r\r','2025-04-23 12:39:48','2025-04-23 12:39:49'),
(107,1,NULL,0,1,'attiva','COMUNE DI COLLI DEL TRONTO - UFFICIO TECNICO COMUNALE','00355250440','00355250440',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:40:43','2025-04-23 12:40:44'),
(108,1,NULL,0,1,'attiva','COMUNE DI CORROPOLI','00425220670',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,' ass.llpp@comunedicorropoli.it\r\rALESSIA LUPI 3890631681\rRAGIONERIA 0861806526\rPIERLUIIGI 3403425204\r\r\rprotocollo@comunecorropoli.it\rAREATECNICA@COMUNECORROPOLI.IT; ASS.LLPP@COMUNECORROPOLI.IT','2025-04-23 12:42:16','2025-04-23 12:42:17'),
(109,1,NULL,0,1,'attiva','COMUNE DI SENIGALLIA ','00332510429','00332510429',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:43:46','2025-04-23 12:44:04'),
(110,1,NULL,0,1,'attiva','COMUNE DI CROGNALETO','00164870677',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:44:42','2025-04-23 12:45:00'),
(111,1,NULL,0,1,'attiva','COMUNE DI CUPELLO','83000250692','83000250692',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Comune di Cupello\rCorso Mazzini 1\r66051 Cupello CH\r\r','2025-04-23 12:45:09','2025-04-23 12:45:27'),
(112,1,NULL,0,1,'attiva','COMUNE DI LIVORNO FERRARIS','00403150022','84500230028',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 12:48:22','2025-04-23 12:48:23'),
(113,1,NULL,0,1,'attiva','COMUNE DI MINERBIO','00530291202',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Indirizzo: Via G. Garibaldi, 44, 40061 Minerbio BO\rOrari: Chiuso ora \rTelefono: 051 661 1711\rProvincia: Provincia di Bologna','2025-04-23 12:49:09','2025-04-23 12:49:10'),
(114,1,NULL,0,1,'attiva','COMUNE DI NERETO','00422080671',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Sindaco DANIELE LAURENZI   tel. 0861 806929 - 331 2469853 - 340 1569222\r\r\r\r347/4165423 Simona Di Francesco \r\r','2025-04-23 12:52:09','2025-04-23 12:52:10'),
(115,1,NULL,0,1,'attiva','COMUNE DI RIPATRANSONE ','00370910440',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Giovanni 3296217105\r\r','2025-04-23 12:52:52','2025-04-23 12:52:53'),
(116,1,NULL,0,1,'attiva','COMUNE ROCCA DI BOTTE ','00181800665','00181800665',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Via delle Scuole, 2\rCAP	67066\rTelefono	0863-998131\rFax	0863-998017\rDati Amministrazione\rCodice Fiscale	00181800665','2025-04-23 12:53:30','2025-04-23 12:53:31'),
(117,1,NULL,0,1,'attiva','FARAONE S.R.L.\r','00321830671','00321830671',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Federico\rVARIAZIONE IBAN\r\r	Vi informiamo che a partire dal giorno 16 maggio 2016 a seguito di integrazione di Banca Dell\'Adriatico in Intesa Sanpaolo il codice IBAN del nostro conto corrente bancario attuale sarà sostituito da nuovo IBAN come di seguito descritto:\r\r	BANCA INTESA SAN PAOLO SPA - F.LE DI ALBA ADRIATICA\r	IBAN: IT75 L030 6976 7210 2638 5060 157\r	BIC: BCITITMM\r\rInvitiamo di prendere buona nota di quanto sopra.\r\rDistinti saluti\r\r\r\rFARAONE SRL\r      (UFFICIO AMMINISTRATIVO)\r','2025-04-23 12:56:11','2025-04-23 12:56:12'),
(118,1,NULL,0,1,'attiva','GRAFICHE MARTINTYPE SRL','01630960670',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'contab.for@martintype.it','2025-04-23 12:57:47','2025-04-23 12:58:05'),
(119,1,NULL,0,1,'attiva','GRAFICHE TACCONI SRL','01746580446',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'GRAFICHE TACCONI SRL\rVIA 328/ma, 2-4\r63100 ASCOLI PICENO\rP.I. 01746580446\r','2025-04-23 12:58:33','2025-04-23 12:58:34'),
(120,1,NULL,0,1,'attiva','ITALRISCOSSIONI SOCIETA’ ITALI ANA DI FISCALITA’ LOCALE - SOC','06092371001','06092371001',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'347/6509828 DAVIDE ','2025-04-23 12:59:49','2025-05-08 12:50:15'),
(121,1,NULL,0,1,'attiva','UNIONE DI COMUNI CITTA’ DELLA FRENTANIA E COSTA DEI TRABOCCHI',NULL,'90019350694',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 13:01:45','2025-05-08 12:50:20'),
(122,1,NULL,0,1,'attiva','COMUNITA COLLINARE MONFERRATO VALLE VERSA','01329430050',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Dott.a daniela valfre\rUfficio Tributi\rComunità Collinare Monferrato Valle Versa\rPiazza Lanfranco, 1\r14039 Tonco (AT)\r\rwww.valleversa-monferrato.at.it\r\rEmail: tributi@valleversa-monferrato.at.it \rPEC: protocollo.valleversa@cert.ruparpiemonte.it\r\rtel: +39.0141.991510\rfax: +39.0141.991763\r','2025-04-23 13:02:32','2025-04-23 13:02:33'),
(123,1,NULL,0,1,'attiva','VAL VIBRATA COLLEGE FONDAZIONE','01593730672',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'MAILING  x apertura nuovo anno solitamente in Ottobre/NOVEMBRE','2025-04-23 13:02:59','2025-04-23 13:03:00'),
(124,1,NULL,0,1,'attiva','VESTINA GAS E LUCE S.P.A','01671550687',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Cliente collegato alla Ditta Gargini Giuseppe Emmeci software\rAmministrazione Vestina <amministrazione@vestinagaseluce.it>\rinfo@vestinagaseluce.itCV\r\rBeatrice   Cesarano 349-2622836 \'beatrice.cesarano@augustaratio.it\'\rRenato Redentore 328 9157157\rrenato.redentore@augustaratio.it\rluigi panaioli ufficiogiulianova@vestinagaseluce.it\r\rMarco Allevi 085.8003554     3285625186 marco.allevi@augustaratio.it\r','2025-04-23 13:04:45','2025-04-23 13:04:46'),
(125,1,NULL,0,1,'attiva','NIBA DI BARRA ANTONIO & C. SAS','01206370445',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 13:06:02','2025-04-23 13:06:03'),
(126,1,NULL,0,1,'attiva','COMUNE DI GUARDIAGRELE','00239980691','00239980691',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'Tutte le stampe f/r b/n e dove necessario 3 F24, mentre devi prevedere la cartolina AR per le raccomandate.\rTari minimo 8000pz x 2 o 3 /y (prima uscita marzo 2016)\rIMU minimo 6000pz x 2/y (giu e nov 2016)\rTOSAP minimo 2000pz x 3/y (mar - giu e nov 2016)\rRaccomandate AR minimo 4000pz\rDimmi se hai bisogno d’altro e … mi raccomando\rcomune.guardiagrele@pec.it\r\rIntestala \rCOMUNE DI GUARDIAGRELE \rPiazza San Francesco 12 66016 Guardiagrele CH\rAlla C.A.\rGent.ma Assessore Dr.ssa Marilena Primavera\rEgr. Vice Sindaco Dr. Gianluca Primavera\r','2025-04-23 13:07:21','2025-04-23 13:07:22'),
(127,1,NULL,0,1,'attiva','COMUNE DI DIAMANTE ','00362420788','00362420788',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-04-23 13:08:06','2025-04-23 13:08:07'),
(129,1,NULL,0,0,'disattiva','ANAGRAFICA MANCANTE #129',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(132,1,NULL,0,1,'attiva','6062 LAB SRL','02138900671',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-05-06 11:11:47','2025-05-06 11:11:48'),
(133,1,NULL,0,1,'attiva','COMUNE DI ALBA ADRIATICA ','00285510673','00285510673',NULL,NULL,NULL,NULL,'IT',NULL,NULL,'CIMINI 0861 719230','2025-05-07 09:15:01','2025-05-07 09:15:02'),
(134,1,NULL,0,1,'attiva','PROVA SRL','01234567890','01234567890',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-05-14 10:19:53','2025-05-14 10:19:54'),
(135,1,NULL,0,1,'attiva','DE LEONI INFORMATICA SRL','02153830597','02153830597',NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-07-31 16:19:55','2025-07-31 16:19:56'),
(136,1,NULL,0,1,'attiva','SELDA SRL','00354060444',NULL,NULL,NULL,NULL,NULL,'IT',NULL,NULL,NULL,'2025-07-31 16:24:14','2025-07-31 16:24:15');
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER trg_anagrafica_to_archive
AFTER UPDATE ON tb_anagrafiche
FOR EACH ROW
BEGIN
  IF OLD.is_active = 1 AND NEW.is_active = 0 THEN
    -- Chi esegue l’archiviazione (se non impostato usa l’utente DB)
    SET @__archiver := COALESCE(@archived_by, SUBSTRING_INDEX(CURRENT_USER(), '@', 1));
    -- Id di batch (se non impostato dall’esterno, generane uno nuovo)
    SET @__batch := COALESCE(@archive_batch_id, UUID());

    /* A) ANAGRAFICA → _archive
       Ordine extra: archived_at, archived_by, archive_batch_id, inactive_since, last_document_date, archive_note
    */
    INSERT INTO tb_anagrafiche_archive
    SELECT
      NEW.*,
      NOW()                                   AS archived_at,
      @__archiver                             AS archived_by,
      @__batch                                AS archive_batch_id,
      CURDATE()                               AS inactive_since,
      NULL                                    AS last_document_date,
      'Archiviata da trigger disattivazione (is_active=0)' AS archive_note;

    /* B) FISCALI → _archive */
    INSERT INTO tb_anagrafiche_fiscali_archive
    SELECT
      f.*,
      NOW()                                   AS archived_at,
      @__archiver                             AS archived_by,
      @__batch                                AS archive_batch_id,
      'Archivio: anagrafica disattivata'      AS archive_note
    FROM tb_anagrafiche_fiscali f
    WHERE f.id_anagrafica = NEW.id_anagrafica
      AND NOT EXISTS (
        SELECT 1 FROM tb_anagrafiche_fiscali_archive fa
        WHERE fa.id_anagrafica = f.id_anagrafica
      );

    /* C) SEDI → _archive */
    INSERT INTO tb_sedi_archive
    SELECT
      s.*,
      NOW()                                   AS archived_at,
      @__archiver                             AS archived_by,
      @__batch                                AS archive_batch_id,
      'Archivio: anagrafica disattivata'      AS archive_note
    FROM tb_sedi s
    WHERE s.id_anagrafica = NEW.id_anagrafica
      AND NOT EXISTS (
        SELECT 1 FROM tb_sedi_archive sa
        WHERE sa.id_sede = s.id_sede
      );

    /* D) CONTATTI SEDE → _archive */
    INSERT INTO tb_sedi_contatti_archive
    SELECT
      c.*,
      NOW()                                   AS archived_at,
      @__archiver                             AS archived_by,
      @__batch                                AS archive_batch_id,
      'Archivio: anagrafica disattivata'      AS archive_note
    FROM tb_sedi_contatti c
    WHERE c.id_sede IN (
      SELECT s.id_sede FROM tb_sedi s WHERE s.id_anagrafica = NEW.id_anagrafica
    )
      AND NOT EXISTS (
        SELECT 1 FROM tb_sedi_contatti_archive ca
        WHERE ca.id_contatto = c.id_contatto
      );

    /* E) Cancella l’anagrafica dalla live */
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
  `indirizzo` varchar(160) DEFAULT NULL,
  `cap` varchar(10) DEFAULT NULL,
  `citta` varchar(100) DEFAULT NULL,
  `provincia` varchar(10) DEFAULT NULL,
  `nazione` varchar(2) DEFAULT NULL,
  `email` varchar(160) DEFAULT NULL,
  `telefono` varchar(40) DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_categorie`
--

LOCK TABLES `tb_categorie` WRITE;
/*!40000 ALTER TABLE `tb_categorie` DISABLE KEYS */;
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_contatti_anagrafiche_single_default
BEFORE UPDATE ON tb_contatti_anagrafiche
FOR EACH ROW
BEGIN
  IF NEW.is_predefinita = 1 AND OLD.is_predefinita = 0 THEN
    UPDATE tb_contatti_anagrafiche
    SET is_predefinita = 0
    WHERE id_contatto = NEW.id_contatto
      AND id_anagrafica <> NEW.id_anagrafica;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
  `totale_pezzi` int(10) unsigned DEFAULT NULL,
  `totale_peso_kg` decimal(12,3) DEFAULT NULL,
  `note` text DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_ddt`
--

LOCK TABLES `tb_ddt` WRITE;
/*!40000 ALTER TABLE `tb_ddt` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_ddt_righe`
--

LOCK TABLES `tb_ddt_righe` WRITE;
/*!40000 ALTER TABLE `tb_ddt_righe` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture`
--

LOCK TABLES `tb_fatture` WRITE;
/*!40000 ALTER TABLE `tb_fatture` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_fatture` ENABLE KEYS */;
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_fatture_split_guard
BEFORE INSERT ON tb_fatture
FOR EACH ROW
BEGIN
  DECLARE v_split_id TINYINT;
  DECLARE v_is_pa TINYINT;

  -- id esigibilità per split payment
  SELECT id_esig INTO v_split_id
  FROM cfg_sdi_esigibilita_iva
  WHERE code='S' LIMIT 1;

  -- flag PA dall'anagrafica
  SELECT is_pa INTO v_is_pa
  FROM tb_anagrafiche
  WHERE id_anagrafica = NEW.id_anagrafica;

  IF NEW.id_sdi_esigibilita = v_split_id AND v_is_pa <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Split payment (S) consentito solo per clienti Pubblica Amministrazione';
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_fatture_sezionale_numbering
BEFORE INSERT ON tb_fatture
FOR EACH ROW
BEGIN
  DECLARE v_anno SMALLINT;
  DECLARE v_next INT;
  DECLARE v_cnt  INT;
  DECLARE v_allowed INT;

  -- Richiede il sezionale: lo scegli dall'app
  IF NEW.id_sezionale IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'id_sezionale obbligatorio per la numerazione';
  END IF;

  -- Se il tipo SdI è valorizzato, verifica compatibilità col sezionale (se mappature esistono)
  IF NEW.id_sdi_tipo_documento IS NOT NULL THEN
    SELECT COUNT(*) INTO v_allowed
    FROM cfg_sezionali_td_allow
    WHERE id_sezionale = NEW.id_sezionale
      AND id_tipo_sdi  = NEW.id_sdi_tipo_documento;
    IF v_allowed = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo Documento SdI non consentito per il sezionale scelto';
    END IF;
  END IF;

  -- Anno da data_fattura o anno corrente
  SET v_anno = COALESCE(YEAR(NEW.data_fattura), YEAR(CURDATE()));
  SET NEW.anno = v_anno;

  -- Se numero già passato dall’app, solo valida univocità all’interno del sezionale
  IF NEW.numero_documento IS NOT NULL THEN
    SELECT COUNT(*) INTO v_cnt
    FROM tb_fatture
    WHERE anno = v_anno
      AND id_sezionale = NEW.id_sezionale
      AND numero_documento = NEW.numero_documento;
    IF v_cnt > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Numero già esistente per anno e sezionale';
    END IF;
  ELSE
    -- Numerazione automatica thread-safe su cfg_sezionali_progress
    INSERT IGNORE INTO cfg_sezionali_progress(id_sezionale, anno, next_num)
    VALUES (NEW.id_sezionale, v_anno, 1);

    SELECT next_num INTO v_next
    FROM cfg_sezionali_progress
    WHERE id_sezionale = NEW.id_sezionale AND anno = v_anno
    FOR UPDATE;

    SET NEW.numero_documento = v_next;

    UPDATE cfg_sezionali_progress
    SET next_num = v_next + 1
    WHERE id_sezionale = NEW.id_sezionale AND anno = v_anno;
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_fatture_split_guard
BEFORE UPDATE ON tb_fatture
FOR EACH ROW
BEGIN
  DECLARE v_split_id TINYINT;
  DECLARE v_is_pa TINYINT;

  SELECT id_esig INTO v_split_id
  FROM cfg_sdi_esigibilita_iva
  WHERE code='S' LIMIT 1;

  SELECT is_pa INTO v_is_pa
  FROM tb_anagrafiche
  WHERE id_anagrafica = NEW.id_anagrafica;

  IF NEW.id_sdi_esigibilita = v_split_id AND v_is_pa <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Split payment (S) consentito solo per clienti Pubblica Amministrazione';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
  `numero_documento` int(10) unsigned NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture_righe`
--

LOCK TABLES `tb_fatture_righe` WRITE;
/*!40000 ALTER TABLE `tb_fatture_righe` DISABLE KEYS */;
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
  -- BOUNDS: aliquota_iva 0..100
  IF NEW.aliquota_iva < 0 OR NEW.aliquota_iva > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'aliquota_iva deve essere compresa tra 0 e 100';
  END IF;

  -- Natura obbligatoria se aliquota=0, altrimenti deve essere NULL
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
-- Table structure for table `tb_movimenti`
--

DROP TABLE IF EXISTS `tb_movimenti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_movimenti` (
  `id_movimento` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `data_registrazione` datetime NOT NULL,
  `descrizione` varchar(255) DEFAULT NULL,
  `importo_dare` decimal(12,2) DEFAULT NULL,
  `importo_avere` decimal(12,2) DEFAULT NULL,
  `riferimento_tipo` enum('preventivo','ddt','fattura','altro') DEFAULT NULL,
  `riferimento_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_movimento`,`data_registrazione`),
  KEY `idx_mov_data` (`data_registrazione`),
  KEY `idx_mov_ref` (`riferimento_tipo`,`riferimento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
 PARTITION BY RANGE  COLUMNS(`data_registrazione`)
(PARTITION `p2023` VALUES LESS THAN ('2024-01-01') ENGINE = InnoDB,
 PARTITION `p2024` VALUES LESS THAN ('2025-01-01') ENGINE = InnoDB,
 PARTITION `p2025` VALUES LESS THAN ('2026-01-01') ENGINE = InnoDB,
 PARTITION `pmax` VALUES LESS THAN (MAXVALUE) ENGINE = InnoDB);
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_movimenti`
--

LOCK TABLES `tb_movimenti` WRITE;
/*!40000 ALTER TABLE `tb_movimenti` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_movimenti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi`
--

DROP TABLE IF EXISTS `tb_preventivi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi` (
  `id_preventivo` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_serie` int(10) unsigned DEFAULT NULL,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `anno_preventivo` smallint(5) unsigned NOT NULL,
  `numero_documento` int(10) unsigned NOT NULL,
  `data_preventivo` date DEFAULT NULL,
  `id_stato_prev` tinyint(3) unsigned NOT NULL,
  `totale_imponibile` decimal(12,2) DEFAULT NULL,
  `totale_sconto` decimal(12,2) DEFAULT NULL,
  `totale_iva` decimal(12,2) DEFAULT NULL,
  `totale` decimal(12,2) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_preventivo`),
  UNIQUE KEY `uq_prev_numero` (`anno_preventivo`,`numero_documento`),
  KEY `idx_prev_anag` (`id_anagrafica`),
  KEY `idx_prev_data` (`data_preventivo`),
  KEY `fk_prev_stato` (`id_stato_prev`),
  KEY `fk_prev_serie` (`id_serie`),
  CONSTRAINT `fk_prev_anag` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`),
  CONSTRAINT `fk_prev_serie` FOREIGN KEY (`id_serie`) REFERENCES `cfg_serie_documenti` (`id_serie`) ON DELETE SET NULL,
  CONSTRAINT `fk_prev_stato` FOREIGN KEY (`id_stato_prev`) REFERENCES `cfg_stati_preventivo` (`id_stato`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi`
--

LOCK TABLES `tb_preventivi` WRITE;
/*!40000 ALTER TABLE `tb_preventivi` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_archive`
--

DROP TABLE IF EXISTS `tb_preventivi_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_archive` (
  `id_preventivo` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_anagrafica` int(10) unsigned NOT NULL,
  `anno_preventivo` smallint(5) unsigned NOT NULL,
  `numero_documento` int(10) unsigned NOT NULL,
  `data_preventivo` date DEFAULT NULL,
  `stato` enum('bozza','inviato','accettato','rifiutato','scaduto') NOT NULL DEFAULT 'bozza',
  `totale_imponibile` decimal(12,2) DEFAULT NULL,
  `totale_sconto` decimal(12,2) DEFAULT NULL,
  `totale_iva` decimal(12,2) DEFAULT NULL,
  `totale` decimal(12,2) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_preventivo`),
  UNIQUE KEY `uq_prev_numero` (`anno_preventivo`,`numero_documento`),
  KEY `idx_prev_anag` (`id_anagrafica`),
  KEY `idx_prev_data` (`data_preventivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_archive`
--

LOCK TABLES `tb_preventivi_archive` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_righe`
--

DROP TABLE IF EXISTS `tb_preventivi_righe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_righe` (
  `id_riga` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `id_prodotto` int(10) unsigned DEFAULT NULL,
  `descrizione` varchar(255) NOT NULL,
  `quantita` decimal(12,3) NOT NULL DEFAULT 1.000,
  `prezzo_unitario` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `sconto` decimal(12,2) DEFAULT NULL,
  `importo_scontato` decimal(12,2) DEFAULT NULL,
  `iva` decimal(12,2) DEFAULT NULL,
  `id_sdi_natura_iva` tinyint(3) unsigned DEFAULT NULL,
  `totale` decimal(12,2) DEFAULT NULL,
  `posizione` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_riga`),
  KEY `idx_righeprev_prev` (`id_preventivo`),
  KEY `idx_righeprev_prod` (`id_prodotto`),
  KEY `fk_prev_righe_sdi_natura` (`id_sdi_natura_iva`),
  CONSTRAINT `fk_prev_righe_sdi_natura` FOREIGN KEY (`id_sdi_natura_iva`) REFERENCES `cfg_sdi_natura_iva` (`id_natura`) ON DELETE SET NULL,
  CONSTRAINT `fk_righeprev_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE,
  CONSTRAINT `fk_righeprev_prod` FOREIGN KEY (`id_prodotto`) REFERENCES `tb_prodotti` (`id_prodotto`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_righe`
--

LOCK TABLES `tb_preventivi_righe` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_righe` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi_righe` ENABLE KEYS */;
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bi_prev_righe_sdi_guard
BEFORE INSERT ON tb_preventivi_righe
FOR EACH ROW
BEGIN
  IF COALESCE(NEW.iva,0) = 0 THEN
    IF NEW.id_sdi_natura_iva IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Natura IVA (SdI) obbligatoria quando IVA=0';
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
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER trg_prev_righe_recalc_ai
AFTER INSERT ON tb_preventivi_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_preventivo(NEW.id_preventivo);
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER bu_prev_righe_sdi_guard
BEFORE UPDATE ON tb_preventivi_righe
FOR EACH ROW
BEGIN
  IF COALESCE(NEW.iva,0) = 0 THEN
    IF NEW.id_sdi_natura_iva IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Natura IVA (SdI) obbligatoria quando IVA=0';
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
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER trg_prev_righe_recalc_au
AFTER UPDATE ON tb_preventivi_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_preventivo(NEW.id_preventivo);
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
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER trg_prev_righe_recalc_ad
AFTER DELETE ON tb_preventivi_righe
FOR EACH ROW
BEGIN
  CALL sp_recalc_preventivo(OLD.id_preventivo);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tb_prodotti`
--

DROP TABLE IF EXISTS `tb_prodotti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_prodotti` (
  `id_prodotto` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_categoria` int(10) unsigned DEFAULT NULL,
  `codice` varchar(64) DEFAULT NULL,
  `nome` varchar(160) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `id_unita` smallint(5) unsigned DEFAULT NULL,
  `prezzo_listino` decimal(12,4) DEFAULT NULL,
  `id_iva` smallint(5) unsigned DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_prodotto`),
  UNIQUE KEY `uq_prodotti_codice` (`codice`),
  KEY `idx_prodotti_nome` (`nome`),
  KEY `idx_prodotti_categoria` (`id_categoria`),
  KEY `fk_prod_um` (`id_unita`),
  KEY `fk_prod_iva` (`id_iva`),
  CONSTRAINT `fk_prod_iva` FOREIGN KEY (`id_iva`) REFERENCES `cfg_iva` (`id_iva`) ON DELETE SET NULL,
  CONSTRAINT `fk_prod_um` FOREIGN KEY (`id_unita`) REFERENCES `cfg_unita_misura` (`id_unita`) ON DELETE SET NULL,
  CONSTRAINT `fk_prodotti_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `tb_categorie` (`id_categoria`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_prodotti`
--

LOCK TABLES `tb_prodotti` WRITE;
/*!40000 ALTER TABLE `tb_prodotti` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_prodotti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_sedi`
--

DROP TABLE IF EXISTS `tb_sedi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_sedi` (
  `id_sede` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_anagrafica` int(11) unsigned NOT NULL,
  `id_tipo` smallint(5) unsigned NOT NULL,
  `denominazione` varchar(150) DEFAULT NULL,
  `indirizzo` varchar(200) NOT NULL,
  `civico` varchar(20) DEFAULT NULL,
  `cap` varchar(10) DEFAULT NULL,
  `comune` varchar(120) NOT NULL,
  `provincia` varchar(10) DEFAULT NULL,
  `nazione_iso2` char(2) NOT NULL DEFAULT 'IT',
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `is_legale` tinyint(1) NOT NULL DEFAULT 0,
  `is_predefinita` tinyint(1) NOT NULL DEFAULT 0,
  `legale_uniq` int(11) GENERATED ALWAYS AS (case when `is_legale` = 1 then `id_anagrafica` else NULL end) VIRTUAL,
  `predef_uniq` int(11) GENERATED ALWAYS AS (case when `is_predefinita` = 1 then `id_anagrafica` else NULL end) VIRTUAL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_sede`),
  UNIQUE KEY `uq_sede_legale` (`legale_uniq`),
  UNIQUE KEY `uq_sede_predef` (`predef_uniq`),
  KEY `idx_sedi_anagrafica` (`id_anagrafica`),
  KEY `idx_sedi_tipo` (`id_tipo`),
  KEY `idx_cap` (`cap`),
  KEY `idx_comune` (`comune`),
  KEY `idx_provincia` (`provincia`),
  KEY `idx_nazione` (`nazione_iso2`),
  CONSTRAINT `fk_sedi_anagrafica` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`) ON DELETE CASCADE,
  CONSTRAINT `fk_sedi_tipo` FOREIGN KEY (`id_tipo`) REFERENCES `cfg_sedi_tipo` (`id_tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=2204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_sedi`
--

LOCK TABLES `tb_sedi` WRITE;
/*!40000 ALTER TABLE `tb_sedi` DISABLE KEYS */;
INSERT INTO `tb_sedi` VALUES
(106,54,1,NULL,'PIAZZA ROMAGNOLI, 6',NULL,'60030','MORRO D’ALBA','AN','IT',NULL,NULL,NULL,1,1,54,54,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(116,41,1,NULL,'VIA CESARE BATTISTI, 56',NULL,'20055','VIMODRONE','MI','IT',NULL,NULL,NULL,1,1,41,41,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(119,52,1,NULL,'VIA SALARIA, 4 4',NULL,'63041','ACQUASANTA TERME','AP','IT',NULL,NULL,NULL,1,1,52,52,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(122,42,1,NULL,'VIA S. ROCCO, 9',NULL,'63075','ACQUAVIVA PICENA','AP','IT',NULL,NULL,NULL,1,1,42,42,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(156,133,1,NULL,'VIA C. BATTISTI 24',NULL,'64011','ALBA ADRIATICA','TE','IT',NULL,NULL,NULL,1,1,133,133,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(170,65,1,NULL,'VIA LUIGI DE AMICIS, 5',NULL,'67030','ALFEDENA','AQ','IT',NULL,NULL,NULL,1,1,65,65,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(172,11,1,NULL,'STRADA PROVINCIALE BONIFICA SNC',NULL,'64010','ANCARANO','TE','IT',NULL,NULL,NULL,1,1,11,11,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(181,45,1,NULL,'PIAZZA S. MARIA 4',NULL,'60121','ANCONA','AN','IT',NULL,NULL,NULL,1,1,45,45,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(188,34,1,NULL,'VIA DELL’ ASPO, 1',NULL,'63100','ASCOLI PICENO','AP','IT',NULL,NULL,NULL,1,1,34,34,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(189,119,1,NULL,'VIA 328/MA, 2-4 119',NULL,'63100','ASCOLI PICENO','AP','IT',NULL,NULL,NULL,1,1,119,119,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(201,136,1,NULL,'PORTA TORRICELLA 7',NULL,'63100','ASCOLI PICENO','AP','IT',NULL,NULL,NULL,1,1,136,136,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(227,15,1,NULL,'PIAZZA MAZZINI, 1',NULL,'64020','BELLANTE','TE','IT',NULL,NULL,NULL,1,1,15,15,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(231,31,1,NULL,'PIAZZA GIACOMO LEOPARDI, 6',NULL,'63838','BELMONTE PICENO','FM','IT',NULL,NULL,NULL,1,1,31,31,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(235,70,1,NULL,'VIA VITTORIO EMANUELE',NULL,'67050','BISEGNA','AQ','IT',NULL,NULL,NULL,1,1,70,70,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(247,78,1,NULL,'VIA GUGLIELMO FORTUZZI, 17/19\r',NULL,'20813','BOVISIO MASCIAGO \r','MB','IT',NULL,NULL,NULL,1,1,78,78,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(256,44,1,NULL,'VIA ROMA, 117',NULL,'14031','CALLIANO','AT','IT',NULL,NULL,NULL,1,1,44,44,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(259,12,1,NULL,'VIA ZONA IND.LE TORRE DEL PARCO',NULL,'62032','CAMERINO','MC','IT',NULL,NULL,NULL,1,1,12,12,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(261,32,1,NULL,'V.LE MILANO 23/B \r\r',NULL,'20855','CAMPARADA','MB','IT',NULL,NULL,NULL,1,1,32,32,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(263,84,1,NULL,'VIA V. EMANUELE II, 9',NULL,'64012','CAMPLI','TE','IT',NULL,NULL,NULL,1,1,84,84,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(264,85,1,NULL,'PIAZZA REGINA MARGHERITA, 6',NULL,'67030','CAMPO DI GIOVE','AQ','IT',NULL,NULL,NULL,1,1,85,85,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(277,19,2,NULL,'VIA SAN DONATO SNC',NULL,'01030','CARBOGNANO','VT','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(281,75,1,NULL,'PIAZZA GIACOMO MATTEOTTI, 8',NULL,'63063','CARRASSAI','AP','IT',NULL,NULL,NULL,1,1,75,75,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(290,53,1,NULL,'VIA DEL MUNICIPIO , 5',NULL,'67023','CASTEL DEL MONTE \r','AQ','IT',NULL,NULL,NULL,1,1,53,53,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(291,121,1,NULL,'CORSO ROMA 25',NULL,'66032','CASTEL FRENTANO','CH','IT',NULL,NULL,NULL,1,1,121,121,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(299,86,1,NULL,'VIA MADONNA DEGLI ANGELI, 21',NULL,NULL,'CASTELLALTO','TE','IT',NULL,NULL,NULL,1,1,86,86,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(304,67,1,NULL,'VIA MARGHERITA, 25',NULL,'63072','CASTIGNANO','AP','IT',NULL,NULL,NULL,1,1,67,67,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(317,87,1,NULL,'VIA ROMA ,18',NULL,'20816','CERIANO LAGHETTO','MB','IT',NULL,NULL,NULL,1,1,87,87,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(325,18,1,NULL,'VIA PADRE UGOLINO FRASCA, SNC',NULL,'66100','CHIETI','CH','IT',NULL,NULL,NULL,1,1,18,18,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(338,88,1,NULL,'VIA PRINCIPE AMEDEO, 72',NULL,'72014','CISTERNINO','BR','IT',NULL,NULL,NULL,1,1,88,88,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(341,16,1,NULL,'P.ZZA IV NOVEMBRE, 1',NULL,'65013','CITTÀ SANT’ANGELO','PE','IT',NULL,NULL,NULL,1,1,16,16,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(351,89,1,NULL,'VIA MAZZINI,34\r',NULL,'64010','CIVITELLA DEL TRONTO','TE','IT',NULL,NULL,NULL,1,1,89,89,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(356,107,1,NULL,'PIAZZA GARIBALDI ,1',NULL,'63079','COLLI DEL TRONTO','AP','IT',NULL,NULL,NULL,1,1,107,107,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(357,21,1,NULL,'VIA SALARIA, 34',NULL,'63079','COLLI DEL TRONTO','AP','IT',NULL,NULL,NULL,1,1,21,21,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(358,62,1,NULL,'VIA CESARE BATTISTI , 36',NULL,'02010','COLLI SUL VELINO','RI','IT',NULL,NULL,NULL,1,1,62,62,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(360,118,1,NULL,'CONTRADA S. GIOVANNI DI COLONNELLA, 3C',NULL,'64010','COLONNELLA','TE','IT',NULL,NULL,NULL,1,1,118,118,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(371,58,1,NULL,'G.AMADIO, 2',NULL,'64010','CONTROGUERRA','TE','IT',NULL,NULL,NULL,1,1,58,58,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(376,91,1,NULL,'PIAZZA ANTELMINELLI, 8',NULL,'55025','COREGLIA ANTELMINELLI','LU','IT',NULL,NULL,NULL,1,1,91,91,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(384,123,1,NULL,'VIA DEI CELESTINI, 38',NULL,'64013','CORROPOLI','TE','IT',NULL,NULL,NULL,1,1,123,123,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(405,108,1,NULL,'PIAZZA PIEDICORTE, 5',NULL,'64013','CORROPOLI','TE','IT',NULL,NULL,NULL,1,1,108,108,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(412,110,1,NULL,'VIA CESARE BATTISTI,',NULL,'64043','CROGNALETO','TE','IT',NULL,NULL,NULL,1,1,110,110,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(415,111,1,NULL,'CORSO MAZZINI, 1',NULL,'66051','CUPELLO','CH','IT',NULL,NULL,NULL,1,1,111,111,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(418,127,1,NULL,'PIAZZA P. MANCINI, 10',NULL,'87023','DIAMANTE','CS','IT',NULL,NULL,NULL,1,1,127,127,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(424,92,1,NULL,'PIAZZA DELLA CONCORDIA, 6',NULL,NULL,'FALERONE','FM','IT',NULL,NULL,NULL,1,1,92,92,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(429,3,1,NULL,'VIA PAOLO BORSELLINO, 12/B',NULL,'61032','FANO','PU','IT',NULL,NULL,NULL,1,1,3,3,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(437,28,2,NULL,'VIA ZEPPILLI, 30',NULL,'63900','FERMO','FM','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(446,93,1,NULL,'PIAZZA DELLA REPUBBLICA, 10',NULL,'63040','FOLIGNANO','AP','IT',NULL,NULL,NULL,1,1,93,93,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(447,26,1,NULL,'VIA LUDOVICO ARIOSTO, 7',NULL,'00013','FONTE NUOVA','RM','IT',NULL,NULL,NULL,1,1,26,26,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(450,5,1,NULL,'PIAZZA MUNICIPIO 19/A',NULL,'86048','FORLI’ DEL SANNIO','IS','IT',NULL,NULL,NULL,1,1,5,5,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(451,36,1,NULL,'VIA VITRUVIO, 190,',NULL,'04023','FORMIA','LT','IT',NULL,NULL,NULL,1,1,36,36,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(457,25,1,NULL,'PIAZZA XIX MAGGIO 10\r',NULL,'04024','GAETA','LT','IT',NULL,NULL,NULL,1,1,25,25,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(485,57,1,NULL,'VIA S. DONATO, 199',NULL,'40057','GRANAROLO DELL’EMILIA','BO','IT',NULL,NULL,NULL,1,1,57,57,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(498,126,1,NULL,'PIAZZA SAN FRANCESCO 12',NULL,'66016','GUARDIAGRELE','CH','IT',NULL,NULL,NULL,1,1,126,126,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(503,37,1,NULL,'PIAZZA UMBERTO I, 1',NULL,'04020','ITRI','LT','IT',NULL,NULL,NULL,1,1,37,37,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(505,29,1,NULL,'VIA BRODOLINI 12',NULL,'60035','JESI','AN','IT',NULL,NULL,NULL,1,1,29,29,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(507,94,1,NULL,'PIAZZA INDIPENDENZA 1',NULL,'60035','JESI','AN','IT',NULL,NULL,NULL,1,1,94,94,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(508,60,1,NULL,'VIA GIUSEPPE GARIBALDI, 11',NULL,'02010','LABRO','RI','IT',NULL,NULL,NULL,1,1,60,60,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(525,135,1,NULL,'VIALE J. F. KENNEDY 241-243 \r',NULL,'04100','LATINA\r','LT','IT',NULL,NULL,NULL,1,1,135,135,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(526,82,1,NULL,'PIAZZETTA DON ALESSANDRO PARENTI 1',NULL,'20824','LAZZATE','MB','IT',NULL,NULL,NULL,1,1,82,82,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(530,112,1,NULL,'VIA MARTIRI DELLA LIBERTÀ 100',NULL,'13046','LIVORNO FERRARIS','VC','IT',NULL,NULL,NULL,1,1,112,112,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(534,95,1,NULL,'VIA ROMA 1',NULL,'65014','LORETO APRUTINO','PE','IT',NULL,NULL,NULL,1,1,95,95,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(547,39,1,NULL,'VIA VISCONTI, 39',NULL,'20846','MACHERIO','MB','IT',NULL,NULL,NULL,1,1,39,39,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(562,24,1,NULL,'VIA ALDO MORO, 32/A',NULL,'64014','MARTINSICURO','TE','IT',NULL,NULL,NULL,1,1,24,24,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(568,66,1,NULL,'PIAZZA DEL MUNICIPIO, 6',NULL,'67050','MASSA D’ALBE','AQ','IT',NULL,NULL,NULL,1,1,66,66,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(587,113,1,NULL,'VIA G. GARIBALDI, 44',NULL,'40061','MINERBIO','BO','IT',NULL,NULL,NULL,1,1,113,113,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(592,96,1,NULL,'CORSO VITTORIO EMANUELE III, 87',NULL,'63077','MONSAMPOLO DEL TRONTO','AP','IT',NULL,NULL,NULL,1,1,96,96,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(605,80,1,NULL,'VIA ROMA, 21',NULL,'63858','MONTEFORTINO','FM','IT',NULL,NULL,NULL,1,1,80,80,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(606,72,1,NULL,'FRAZIONE BALZO PIAZZA TALIANI, 5',NULL,'63094','MONTEGALLO','AP','IT',NULL,NULL,NULL,1,1,72,72,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(609,20,1,NULL,'VIA ROMA, 51',NULL,NULL,'MONTELPARO','FE','IT',NULL,NULL,NULL,1,1,20,20,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(610,76,1,NULL,'PIAZZA RISORGIMENTO, 5',NULL,'63088','MONTEMONACO','AP','IT',NULL,NULL,NULL,1,1,76,76,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(615,9,1,NULL,'VIA DELLA BARCA 22/A',NULL,'63076','MONTEPRANDONE','AP','IT',NULL,NULL,NULL,1,1,9,9,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(621,27,1,NULL,'FOSSO FORESTE 32',NULL,'65015','MONTESILVANO','PE','IT',NULL,NULL,NULL,1,1,27,27,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(626,97,1,NULL,'PIAZZA DIAZ, 1',NULL,'65016','MONTESILVANO','PE','IT',NULL,NULL,NULL,1,1,97,97,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(630,98,1,NULL,'VIA POLISEO DE ANGELIS 24',NULL,'64046','MONTORIO AL VOMANO','TE','IT',NULL,NULL,NULL,1,1,98,98,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(634,99,1,NULL,'PIAZZA DUCA DEGLI ABRUZZI 1',NULL,'64020','MORRO D’ORO','TE','IT',NULL,NULL,NULL,1,1,99,99,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(635,71,1,NULL,'VIA ROMA, 18',NULL,'02010','MORRO REATINO','RI','IT',NULL,NULL,NULL,1,1,71,71,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(638,46,1,NULL,'VIA NAZIONALE PER TERAMO, 14',NULL,'64023','MOSCIANO SANT’ANGELO','TE','IT',NULL,NULL,NULL,1,1,46,46,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(643,43,1,NULL,'VIA PASCOLI, ZONA ARTIGIANALE C.DA RIPOLI\r',NULL,'64023','MOSCIANO SANT’ANGELO','TE','IT',NULL,NULL,NULL,1,1,43,43,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(644,83,1,NULL,'VIA DEL PROGRESSO ,SNC',NULL,'64023','MOSCIANO SANT’ANGELO','TE','IT',NULL,NULL,NULL,1,1,83,83,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(661,22,1,NULL,'PIAZZA MARCONI, 10',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,22,22,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(696,74,1,NULL,'VIA ROMA, 84',NULL,'67025','OFENA','AQ','IT',NULL,NULL,NULL,1,1,74,74,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(700,50,1,NULL,'VIA S. GIOVANNI, 50',NULL,'67030','OPI','AQ','IT',NULL,NULL,NULL,1,1,50,50,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(703,59,1,NULL,'VIA CASTELLO, 8',NULL,'67063','ORICOLA','AQ','IT',NULL,NULL,NULL,1,1,59,59,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(710,68,1,NULL,'P. MARCONI, 3',NULL,'67050','ORTONA DEI MARSI','AQ','IT',NULL,NULL,NULL,1,1,68,68,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(732,55,1,NULL,'PIAZZA UMBERTO I, 5',NULL,'63092','PALMIANO','AP','IT',NULL,NULL,NULL,1,1,55,55,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(743,124,1,NULL,'ALESSANDRO CASELLI, 29',NULL,'65017','PENNE','PE','IT',NULL,NULL,NULL,1,1,124,124,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(752,17,1,NULL,'VIA MAZZARINO, 8',NULL,'65126','PESCARA','PE','IT',NULL,NULL,NULL,1,1,17,17,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(771,63,1,NULL,'VIA DEI PELIGNI, 97',NULL,'65127','PESCARA','PE','IT',NULL,NULL,NULL,1,1,63,63,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(775,4,1,NULL,'PIAZZA ITALIA, 30 - 65121 PESCARA',NULL,'65121','PESCARA','PE','IT',NULL,NULL,NULL,1,1,4,4,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(779,51,1,NULL,'PIAZZA MAZZARINO, 27',NULL,'67057','PESCINA','AQ','IT',NULL,NULL,NULL,1,1,51,51,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(782,73,1,NULL,'PIAZZA G. GARIBALDI, 13',NULL,'65019','PIANELLA','PE','IT',NULL,NULL,NULL,1,1,73,73,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(793,47,1,NULL,'PIAZZA DEL MUNICIPIO, 13',NULL,'67017','PIZZOLI','AQ','IT',NULL,NULL,NULL,1,1,47,47,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(796,6,1,NULL,'VIA FRANCESCANA 9',NULL,'02018','POGGIO BUSTONE','RI','IT',NULL,NULL,NULL,1,1,6,6,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(798,49,1,NULL,'VIA NAZIONALE,59',NULL,'62010','POLLENZA','MC','IT',NULL,NULL,NULL,1,1,49,49,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(804,100,1,NULL,'CORSO MATTEOTTI, 230',NULL,'62017','PORTO RECANATI','MC','IT',NULL,NULL,NULL,1,1,100,100,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(810,101,1,NULL,'VIA VENETO, 5',NULL,'63822','PORTO SAN GIORGIO','FM','IT',NULL,NULL,NULL,1,1,101,101,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(821,35,1,NULL,'VIA ARCHETTI, SNC',NULL,'63831','RAPAGNANO','FE','IT',NULL,NULL,NULL,1,1,35,35,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(828,40,1,NULL,'VIALE VITTORIO EMANUELE II, 2',NULL,'47838','RICCIONE','RN','IT',NULL,NULL,NULL,1,1,40,40,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(832,115,1,NULL,'PIAZZA XX SETTEMBRE, 4',NULL,'63065','RIPATRANSONE','AP','IT',NULL,NULL,NULL,1,1,115,115,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(837,116,1,NULL,'VIA DELLE SCUOLE, 2',NULL,'67066','ROCCA DI BOTTE','AQ','IT',NULL,NULL,NULL,1,1,116,116,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(867,33,1,NULL,'PIAZZA S.EGIDIO, 3A',NULL,'00153','ROMA','RM','IT',NULL,NULL,NULL,1,1,33,33,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(872,14,1,NULL,'VIA DI DONNA OLIMPIA N. 20',NULL,'00152','ROMA','RM','IT',NULL,NULL,NULL,1,1,14,14,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(875,120,1,NULL,'VIA TIBURTINA 1166',NULL,'00156','ROMA','RM','IT',NULL,NULL,NULL,1,1,120,120,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(878,23,1,NULL,'PIAZZA DELLA REPUBBLICA N. 1\r',NULL,'64026','ROSETO DEGLI ABRUZZI','TE','IT',NULL,NULL,NULL,1,1,23,23,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(909,7,1,NULL,'VIALE ALCIDE DE GASPERI, 124',NULL,'63074','SAN BENEDETTO DEL TRONTO','AP','IT',NULL,NULL,NULL,1,1,7,7,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(914,125,1,NULL,'VIA FIORAVANTI ,13',NULL,'63074','SAN BENEDETTO DEL TRONTO','AP','IT',NULL,NULL,NULL,1,1,125,125,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(933,102,1,NULL,'PIAZZA PAPA GIOVANNI XXIII, 7',NULL,'66050','SAN SALVO','CH','IT',NULL,NULL,NULL,1,1,102,102,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(935,48,1,NULL,'LARGO ALTOBELLI, 1',NULL,'66038','SAN VITO CHIETINO','CH','IT',NULL,NULL,NULL,1,1,48,48,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(947,38,1,NULL,'PIAZZA ALDO MORO 1 \r',NULL,'67067','SANTE MARIE\r','AQ','IT',NULL,NULL,NULL,1,1,38,38,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(950,103,1,NULL,'VIA ENRICO DE NICOLA, 5',NULL,'04020','SANTI COSMA E DAMIANO','LT','IT',NULL,NULL,NULL,1,1,103,103,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(956,77,1,NULL,'VIA VITTORIO VENETO',NULL,'64027','SANT’OMERO','TE','IT',NULL,NULL,NULL,1,1,77,77,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(965,104,1,NULL,'VIA IV NOVEMBRE 18',NULL,'66020','SCERNI','CH','IT',NULL,NULL,NULL,1,1,104,104,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(967,81,1,NULL,'VIA AMITERNUM, 35',NULL,'67019','SCOPPITO','AQ','IT',NULL,NULL,NULL,1,1,81,81,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(969,109,1,NULL,'VIALE G. LEOPARDI N. 8\r',NULL,'60019','SENIGALLIA','AN','IT',NULL,NULL,NULL,1,1,109,109,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(976,69,1,NULL,'PIAZZA GIOVANNI DA SIROLO 1',NULL,'60020','SIROLO','AN','IT',NULL,NULL,NULL,1,1,69,69,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(978,56,1,NULL,'PIAZZA MARINI, 1',NULL,'63036','SPINETOLI','AP','IT',NULL,NULL,NULL,1,1,56,56,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(979,30,1,NULL,'PIAZZA LEOPARDI, 31',NULL,'63078','SPINETOLI','AP','IT',NULL,NULL,NULL,1,1,30,30,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(991,64,1,NULL,'VIA DEI COLLI, 14/A',NULL,'67069','TAGLIACOZZO','AQ','IT',NULL,NULL,NULL,1,1,64,64,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(995,10,1,NULL,'PIAZZA GARIBALDI 56',NULL,'64100','TERAMO','TE','IT',NULL,NULL,NULL,1,1,10,10,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1019,13,1,NULL,'VIA DEL BALUARDO 10',NULL,'64100','TERAMO','TE','IT',NULL,NULL,NULL,1,1,13,13,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1030,122,1,NULL,'PIAZZA LANFRANCO, 1',NULL,'14039','TONCO','AT','IT',NULL,NULL,NULL,1,1,122,122,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1041,8,1,NULL,'PIAZZA DELLA LIBERTÀ,12',NULL,'64019','TORTORETO','TE','IT',NULL,NULL,NULL,1,1,8,8,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1060,106,1,NULL,'C. DA PIANA DELL’ADDOLORATA',NULL,'64049','TOSSICIA','TE','IT',NULL,NULL,NULL,1,1,106,106,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1357,90,1,NULL,'VIA MALTA 10',NULL,'73043','COPERTINO','LE','IT',NULL,NULL,NULL,1,1,90,90,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1391,79,1,NULL,'PIAZZA DELLA REPUBBLICA',NULL,'63062','MONTEFIORE DELL’ASO','AP','IT',NULL,NULL,NULL,1,1,79,79,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1411,61,1,NULL,'CORSO ITALIA, 1',NULL,'67050','LECCE NEI MARSI','AQ','IT',NULL,NULL,NULL,1,1,61,61,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1785,17,2,NULL,'VIA MARINO TURCHI 5',NULL,'66013','CHIETI SCALO','CH','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1808,58,2,NULL,'G.AMADIO 2',NULL,'64010','CONTROGUERRA','TE','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1809,114,1,NULL,'PIAZZA DELLA REPUBBLICA 1',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,114,114,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1814,34,2,NULL,'ZONA INDUSTRIALE DESTRA TRONTO',NULL,'64016','SANT’EGIDIO ALLA V.TA','TE','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1830,117,1,NULL,'VIA PO 12',NULL,'64018','TORTORETO','TE','IT',NULL,NULL,NULL,1,1,117,117,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(1901,11,2,NULL,'STRADA PROVINCIALE BONIFICA SNC',NULL,'64010','ANCARANO','TE','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2022,52,2,NULL,'VIA SALARIA, 14 A 14A',NULL,'63041','ACQUASANTA TERME','AP','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2038,32,2,NULL,'VIA BOCCACCIO , 13/B',NULL,'20855','LESMO\r','MB','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2097,105,1,NULL,'VIA ACQUA DELLE MANDRIE',NULL,'88050','SELLIA MARINA','CZ','IT',NULL,NULL,NULL,1,1,105,105,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2100,28,1,NULL,'VIA MEDAGLIE D’ORO 12',NULL,'63900','FERMO','FM','IT',NULL,NULL,NULL,1,1,28,28,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2108,45,2,NULL,'V.LE DELLE REGIONI,6',NULL,'63822','PORTO SAN GIORGIO','FM','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2117,19,1,NULL,'VIA FIORAVANTE MARTINELLI 10 \r',NULL,'01030','CARBOGNANO','VT','IT',NULL,NULL,NULL,1,1,19,19,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2122,132,1,NULL,'VIA CERTOSA SNC',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,132,132,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2123,129,1,NULL,'via certosa snc',NULL,'64014','nereto','te','IT',NULL,NULL,NULL,1,1,129,129,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2128,134,1,NULL,'via certosa 1',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,134,134,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2135,2,1,NULL,'G.D’ANNUNZIO 7',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,2,2,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2192,1,1,'SEDE NERETO','ZONA INDUSTRIALE VIA CERTOSA, SNC',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,1,1,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2199,1,2,'SEDE MARTINSICURO','VIA LEOPARDI 44',NULL,'64014','MARTINSICURO','TE','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2202,1,3,'Posta Network','Via D\'annunzio 7',NULL,'64013','Corropoli','TE','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2203,1,2,'Postino','Via Certosa',NULL,'89843','CONTROGUERRA (TE)','TE','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-09-30 15:43:39');
/*!40000 ALTER TABLE `tb_sedi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_sedi_archive`
--

DROP TABLE IF EXISTS `tb_sedi_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_sedi_archive` (
  `id_sede` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_anagrafica` int(11) unsigned NOT NULL,
  `id_tipo` smallint(5) unsigned NOT NULL,
  `denominazione` varchar(150) DEFAULT NULL,
  `indirizzo` varchar(200) NOT NULL,
  `civico` varchar(20) DEFAULT NULL,
  `cap` varchar(10) DEFAULT NULL,
  `comune` varchar(120) NOT NULL,
  `provincia` varchar(10) DEFAULT NULL,
  `nazione_iso2` char(2) NOT NULL DEFAULT 'IT',
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `is_legale` tinyint(1) NOT NULL DEFAULT 0,
  `is_predefinita` tinyint(1) NOT NULL DEFAULT 0,
  `legale_uniq` int(11) GENERATED ALWAYS AS (case when `is_legale` = 1 then `id_anagrafica` else NULL end) VIRTUAL,
  `predef_uniq` int(11) GENERATED ALWAYS AS (case when `is_predefinita` = 1 then `id_anagrafica` else NULL end) VIRTUAL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archived_at` datetime NOT NULL DEFAULT current_timestamp(),
  `archived_by` varchar(120) DEFAULT NULL,
  `archive_batch_id` char(36) DEFAULT NULL,
  `archive_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_sede`),
  UNIQUE KEY `uq_sede_legale` (`legale_uniq`),
  UNIQUE KEY `uq_sede_predef` (`predef_uniq`),
  KEY `idx_sedi_anagrafica` (`id_anagrafica`),
  KEY `idx_sedi_tipo` (`id_tipo`),
  KEY `idx_cap` (`cap`),
  KEY `idx_comune` (`comune`),
  KEY `idx_provincia` (`provincia`),
  KEY `idx_nazione` (`nazione_iso2`),
  KEY `idx_sedi_archived_at` (`archived_at`),
  KEY `idx_sedi_archived_by` (`archived_by`),
  KEY `idx_sedi_archive_batch` (`archive_batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_sedi_archive`
--

LOCK TABLES `tb_sedi_archive` WRITE;
/*!40000 ALTER TABLE `tb_sedi_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_sedi_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_sedi_contatti`
--

DROP TABLE IF EXISTS `tb_sedi_contatti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_sedi_contatti` (
  `id_contatto` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_sede` bigint(20) unsigned NOT NULL,
  `nome` varchar(80) DEFAULT NULL,
  `cognome` varchar(80) DEFAULT NULL,
  `ruolo` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `cellulare` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `is_referente` tinyint(1) NOT NULL DEFAULT 0,
  `is_predefinito` tinyint(1) NOT NULL DEFAULT 0,
  `predef_uniq` bigint(20) unsigned GENERATED ALWAYS AS (case when `is_predefinito` = 1 then `id_sede` else NULL end) VIRTUAL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_contatto`),
  UNIQUE KEY `uq_contatto_predef` (`predef_uniq`),
  KEY `idx_contatti_sede` (`id_sede`),
  KEY `idx_contatti_email` (`email`),
  KEY `idx_contatti_telefono` (`telefono`),
  CONSTRAINT `fk_contatti_sede` FOREIGN KEY (`id_sede`) REFERENCES `tb_sedi` (`id_sede`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_sedi_contatti`
--

LOCK TABLES `tb_sedi_contatti` WRITE;
/*!40000 ALTER TABLE `tb_sedi_contatti` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_sedi_contatti` ENABLE KEYS */;
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
/*!50003 CREATE*/ /* 50017 DEFINER=`laravel_mediaprint`@`%`*/ /*!50003 TRIGGER ai_contatti_seed_bridge
AFTER INSERT ON tb_sedi_contatti
FOR EACH ROW
BEGIN
  DECLARE v_anag INT UNSIGNED;
  -- ricava l'anagrafica dalla sede
  SELECT s.id_anagrafica INTO v_anag
  FROM tb_sedi AS s
  WHERE s.id_sede = NEW.id_sede;

  IF v_anag IS NOT NULL THEN
    INSERT IGNORE INTO tb_contatti_anagrafiche (id_contatto, id_anagrafica, is_predefinita)
    VALUES (NEW.id_contatto, v_anag, 1);
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tb_sedi_contatti_archive`
--

DROP TABLE IF EXISTS `tb_sedi_contatti_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_sedi_contatti_archive` (
  `id_contatto` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_sede` bigint(20) unsigned NOT NULL,
  `nome` varchar(80) DEFAULT NULL,
  `cognome` varchar(80) DEFAULT NULL,
  `ruolo` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `cellulare` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `is_referente` tinyint(1) NOT NULL DEFAULT 0,
  `is_predefinito` tinyint(1) NOT NULL DEFAULT 0,
  `predef_uniq` bigint(20) unsigned GENERATED ALWAYS AS (case when `is_predefinito` = 1 then `id_sede` else NULL end) VIRTUAL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archived_at` datetime NOT NULL DEFAULT current_timestamp(),
  `archived_by` varchar(120) DEFAULT NULL,
  `archive_batch_id` char(36) DEFAULT NULL,
  `archive_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_contatto`),
  UNIQUE KEY `uq_contatto_predef` (`predef_uniq`),
  KEY `idx_contatti_sede` (`id_sede`),
  KEY `idx_contatti_email` (`email`),
  KEY `idx_contatti_telefono` (`telefono`),
  KEY `idx_cont_archived_at` (`archived_at`),
  KEY `idx_cont_archived_by` (`archived_by`),
  KEY `idx_cont_archive_batch` (`archive_batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_sedi_contatti_archive`
--

LOCK TABLES `tb_sedi_contatti_archive` WRITE;
/*!40000 ALTER TABLE `tb_sedi_contatti_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_sedi_contatti_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_termini_preventivo`
--

DROP TABLE IF EXISTS `tb_termini_preventivo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_termini_preventivo` (
  `id_termine` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `data_termine_validita` date DEFAULT NULL,
  `termini` text DEFAULT NULL,
  PRIMARY KEY (`id_termine`),
  KEY `idx_term_prev` (`id_preventivo`),
  CONSTRAINT `fk_termini_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_termini_preventivo`
--

LOCK TABLES `tb_termini_preventivo` WRITE;
/*!40000 ALTER TABLE `tb_termini_preventivo` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_termini_preventivo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `v_account_cliente_anagrafica_predefinita`
--

DROP TABLE IF EXISTS `v_account_cliente_anagrafica_predefinita`;
/*!50001 DROP VIEW IF EXISTS `v_account_cliente_anagrafica_predefinita`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_account_cliente_anagrafica_predefinita` AS SELECT
 1 AS `id_account`,
  1 AS `username`,
  1 AS `id_contatto`,
  1 AS `id_anagrafica_predefinita` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_account_cliente_anagrafiche`
--

DROP TABLE IF EXISTS `v_account_cliente_anagrafiche`;
/*!50001 DROP VIEW IF EXISTS `v_account_cliente_anagrafiche`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_account_cliente_anagrafiche` AS SELECT
 1 AS `id_account`,
  1 AS `username`,
  1 AS `id_contatto`,
  1 AS `id_anagrafica` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_anagrafiche_inattive_2y`
--

DROP TABLE IF EXISTS `v_anagrafiche_inattive_2y`;
/*!50001 DROP VIEW IF EXISTS `v_anagrafiche_inattive_2y`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_anagrafiche_inattive_2y` AS SELECT
 1 AS `id_anagrafica`,
  1 AS `id_tipologia`,
  1 AS `id_sdi_regime_fiscale`,
  1 AS `is_pa`,
  1 AS `ragione_sociale`,
  1 AS `piva`,
  1 AS `codice_fiscale`,
  1 AS `indirizzo`,
  1 AS `cap`,
  1 AS `citta`,
  1 AS `provincia`,
  1 AS `nazione`,
  1 AS `email`,
  1 AS `telefono`,
  1 AS `note`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `last_document_date`,
  1 AS `inactive_since` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_anagrafiche_lastdoc`
--

DROP TABLE IF EXISTS `v_anagrafiche_lastdoc`;
/*!50001 DROP VIEW IF EXISTS `v_anagrafiche_lastdoc`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_anagrafiche_lastdoc` AS SELECT
 1 AS `id_anagrafica`,
  1 AS `last_document_date` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_archive_batches`
--

DROP TABLE IF EXISTS `v_archive_batches`;
/*!50001 DROP VIEW IF EXISTS `v_archive_batches`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_archive_batches` AS SELECT
 1 AS `archive_batch_id`,
  1 AS `started_at`,
  1 AS `finished_at`,
  1 AS `records_total`,
  1 AS `by_users` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_ddt_all`
--

DROP TABLE IF EXISTS `v_ddt_all`;
/*!50001 DROP VIEW IF EXISTS `v_ddt_all`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_ddt_all` AS SELECT
 1 AS `id_ddt`,
  1 AS `id_anagrafica`,
  1 AS `anno`,
  1 AS `numero_documento`,
  1 AS `data_ddt`,
  1 AS `totale_pezzi`,
  1 AS `totale_peso_kg`,
  1 AS `note`,
  1 AS `id_causale`,
  1 AS `causale_label`,
  1 AS `id_serie`,
  1 AS `serie_code`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `source_table` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_ddt_slim`
--

DROP TABLE IF EXISTS `v_ddt_slim`;
/*!50001 DROP VIEW IF EXISTS `v_ddt_slim`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_ddt_slim` AS SELECT
 1 AS `id_ddt`,
  1 AS `id_anagrafica`,
  1 AS `anno`,
  1 AS `numero_documento`,
  1 AS `data_ddt`,
  1 AS `totale_pezzi`,
  1 AS `note`,
  1 AS `created_at`,
  1 AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_fatture_all`
--

DROP TABLE IF EXISTS `v_fatture_all`;
/*!50001 DROP VIEW IF EXISTS `v_fatture_all`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_fatture_all` AS SELECT
 1 AS `id_fattura`,
  1 AS `id_anagrafica`,
  1 AS `anno`,
  1 AS `numero_documento`,
  1 AS `data_fattura`,
  1 AS `totale_imponibile`,
  1 AS `totale_sconto`,
  1 AS `totale_iva`,
  1 AS `totale`,
  1 AS `saldo`,
  1 AS `note`,
  1 AS `id_stato`,
  1 AS `stato_label`,
  1 AS `id_tipo`,
  1 AS `tipo_label`,
  1 AS `id_sezionale`,
  1 AS `sezionale_code`,
  1 AS `id_serie`,
  1 AS `serie_code`,
  1 AS `id_sdi_tipo_documento`,
  1 AS `sdi_td_code`,
  1 AS `id_sdi_esigibilita`,
  1 AS `sdi_esig_code`,
  1 AS `id_sdi_modalita`,
  1 AS `sdi_mp_code`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `source_table` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_fatture_slim`
--

DROP TABLE IF EXISTS `v_fatture_slim`;
/*!50001 DROP VIEW IF EXISTS `v_fatture_slim`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_fatture_slim` AS SELECT
 1 AS `id_fattura`,
  1 AS `id_anagrafica`,
  1 AS `anno`,
  1 AS `numero_documento`,
  1 AS `data_fattura`,
  1 AS `totale_imponibile`,
  1 AS `totale_sconto`,
  1 AS `totale_iva`,
  1 AS `totale`,
  1 AS `saldo`,
  1 AS `note`,
  1 AS `created_at`,
  1 AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_preventivi_all`
--

DROP TABLE IF EXISTS `v_preventivi_all`;
/*!50001 DROP VIEW IF EXISTS `v_preventivi_all`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_preventivi_all` AS SELECT
 1 AS `id_preventivo`,
  1 AS `id_anagrafica`,
  1 AS `anno_preventivo`,
  1 AS `numero_documento`,
  1 AS `data_preventivo`,
  1 AS `totale_imponibile`,
  1 AS `totale_sconto`,
  1 AS `totale_iva`,
  1 AS `totale`,
  1 AS `note`,
  1 AS `id_stato`,
  1 AS `stato_label`,
  1 AS `id_serie`,
  1 AS `serie_code`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `source_table` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_preventivi_slim`
--

DROP TABLE IF EXISTS `v_preventivi_slim`;
/*!50001 DROP VIEW IF EXISTS `v_preventivi_slim`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_preventivi_slim` AS SELECT
 1 AS `id_preventivo`,
  1 AS `id_anagrafica`,
  1 AS `anno_preventivo`,
  1 AS `numero_documento`,
  1 AS `data_preventivo`,
  1 AS `totale_imponibile`,
  1 AS `totale_sconto`,
  1 AS `totale_iva`,
  1 AS `totale`,
  1 AS `note`,
  1 AS `created_at`,
  1 AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'mediaprint_erp_v2'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP FUNCTION IF EXISTS `fn_preview_next_fattura_number` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ FUNCTION `fn_preview_next_fattura_number`(p_id_sezionale INT, p_anno SMALLINT) RETURNS int(11)
    READS SQL DATA
BEGIN
  DECLARE v_anno SMALLINT;
  DECLARE v_next INT;
  DECLARE v_from_prog INT;
  DECLARE v_from_docs INT;

  SET v_anno = COALESCE(p_anno, YEAR(CURDATE()));

  -- reading from progress table (authoritative for numbering trigger)
  SELECT next_num INTO v_from_prog
  FROM cfg_sezionali_progress
  WHERE id_sezionale = p_id_sezionale AND anno = v_anno;

  -- fallback from existing docs, +1
  SELECT COALESCE(MAX(numero_documento), 0) + 1 INTO v_from_docs
  FROM tb_fatture
  WHERE id_sezionale = p_id_sezionale AND anno = v_anno;

  -- Choose progress if exists, else fallback to docs (at least 1)
  SET v_next = COALESCE(v_from_prog, v_from_docs);
  IF v_next < 1 THEN
    SET v_next = 1;
  END IF;

  RETURN v_next;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP FUNCTION IF EXISTS `fn_td24_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ FUNCTION `fn_td24_id`() RETURNS tinyint(4)
    READS SQL DATA
BEGIN
  DECLARE v_id TINYINT DEFAULT NULL;
  SELECT id_tipo INTO v_id FROM cfg_sdi_tipo_documento WHERE code='TD24' LIMIT 1;
  RETURN v_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_account_set_active` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_account_set_active`(
  IN p_id_account BIGINT UNSIGNED,
  IN p_is_active  TINYINT
)
BEGIN
  UPDATE auth_accounts
  SET is_active = IF(p_is_active IS NULL, is_active, p_is_active)
  WHERE id_account = p_id_account;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account inesistente';
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_align_sezionali_progress` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_align_sezionali_progress`(IN p_id_sezionale INT, IN p_anno SMALLINT)
BEGIN
  DECLARE v_sql VARCHAR(2000);
  DECLARE v_cur_id INT;
  DECLARE v_cur_anno SMALLINT;
  DECLARE v_maxnum INT;

  -- Cursor over target rows
  DECLARE cur CURSOR FOR
    SELECT s.id_sezionale, y.anno
    FROM cfg_sezionali s
    JOIN (
      SELECT DISTINCT anno FROM tb_fatture
      UNION SELECT DISTINCT anno FROM cfg_sezionali_progress
    ) y
    WHERE (p_id_sezionale IS NULL OR s.id_sezionale = p_id_sezionale)
      AND (p_anno IS NULL OR y.anno = p_anno);

  DECLARE CONTINUE HANDLER FOR NOT FOUND CLOSE cur;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_cur_id, v_cur_anno;
    IF ROW_COUNT() = 0 THEN
      LEAVE read_loop;
    END IF;

    -- Get MAX numero_documento +1
    SELECT COALESCE(MAX(numero_documento),0)+1
    INTO v_maxnum
    FROM tb_fatture
    WHERE id_sezionale = v_cur_id AND anno = v_cur_anno;

    -- Ensure row exists in progress
    INSERT IGNORE INTO cfg_sezionali_progress(id_sezionale, anno, next_num)
    VALUES (v_cur_id, v_cur_anno, v_maxnum);

    -- Update to aligned value
    UPDATE cfg_sezionali_progress
    SET next_num = v_maxnum
    WHERE id_sezionale = v_cur_id AND anno = v_cur_anno;
  END LOOP;
  CLOSE cur;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_archive_anagrafiche_inattive_2y` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_archive_anagrafiche_inattive_2y`(IN dry_run TINYINT(1))
BEGIN
  IF dry_run = 1 THEN
    -- Solo anteprima
    SELECT i.*, i.inactive_since, i.last_document_date
    FROM v_anagrafiche_inattive_2y i
    WHERE NOT EXISTS (
      SELECT 1 FROM tb_anagrafiche_archive ar WHERE ar.id_anagrafica = i.id_anagrafica
    )
    ORDER BY COALESCE(i.last_document_date, i.inactive_since) ASC;
  ELSE
    -- Archiviazione: inserisce solo quelle non ancora archiviate
    INSERT INTO tb_anagrafiche_archive
      SELECT
        i.*,
        NOW()         AS archived_at,
        i.inactive_since,
        i.last_document_date,
        'Archiviate automaticamente per inattività > 24 mesi' AS archive_note
      FROM v_anagrafiche_inattive_2y i
      WHERE NOT EXISTS (
        SELECT 1 FROM tb_anagrafiche_archive ar WHERE ar.id_anagrafica = i.id_anagrafica
      );
    -- Facoltativo: disattiva nella tabella live (se esiste un flag)
    -- UPDATE tb_anagrafiche a
    -- JOIN v_anagrafiche_inattive_2y i USING (id_anagrafica)
    -- SET a.is_active = 0
    -- WHERE a.is_active <> 0;
    
    -- Output riepilogo
    SELECT 'OK' AS esito, ROW_COUNT() AS righe_archiviate;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_archive_rollback_batch` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_archive_rollback_batch`(
  IN p_batch_id CHAR(36),
  IN p_dry_run TINYINT(1),             -- 1 = anteprima, 0 = esegui
  IN p_overwrite_if_exists TINYINT(1), -- 1 = UPDATE se già esiste
  IN p_delete_from_archive TINYINT(1)  -- 1 = DELETE dagli archive dopo ripristino (se non dry_run)
)
BEGIN
  DECLARE v_restored_anag INT DEFAULT 0;
  DECLARE v_restored_fisc INT DEFAULT 0;
  DECLARE v_restored_sedi INT DEFAULT 0;
  DECLARE v_restored_cont INT DEFAULT 0;

  IF p_batch_id IS NULL OR p_batch_id = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'archive_batch_id obbligatorio';
  END IF;

  /* ========== DRY RUN ========== */
  IF p_dry_run = 1 THEN
    -- Conteggi
    SELECT 'ANAGRAFICHE' AS entity, COUNT(*) AS to_restore
    FROM tb_anagrafiche_archive WHERE archive_batch_id = p_batch_id
    UNION ALL
    SELECT 'FISCALI', COUNT(*) FROM tb_anagrafiche_fiscali_archive WHERE archive_batch_id = p_batch_id
    UNION ALL
    SELECT 'SEDI', COUNT(*) FROM tb_sedi_archive WHERE archive_batch_id = p_batch_id
    UNION ALL
    SELECT 'CONTATTI_SEDE', COUNT(*) FROM tb_sedi_contatti_archive WHERE archive_batch_id = p_batch_id;

    -- Sample (prime 20 righe)
    SELECT * FROM tb_anagrafiche_archive WHERE archive_batch_id = p_batch_id LIMIT 20;
    SELECT * FROM tb_anagrafiche_fiscali_archive WHERE archive_batch_id = p_batch_id LIMIT 20;
    SELECT * FROM tb_sedi_archive           WHERE archive_batch_id = p_batch_id LIMIT 20;
    SELECT * FROM tb_sedi_contatti_archive  WHERE archive_batch_id = p_batch_id LIMIT 20;

  ELSE
  /* ========== ESECUZIONE ========== */
    START TRANSACTION;

    /* 1) ANAGRAFICHE */
    INSERT INTO tb_anagrafiche
    SELECT
      a.id_anagrafica, a.ragione_sociale, a.nome, a.cognome, a.piva, a.cf,
      a.id_tipologia, a.is_pa,
      a.indirizzo, a.cap, a.comune, a.provincia, a.nazione_iso2,
      a.telefono, a.email, a.note,
      a.created_at, a.updated_at
    FROM tb_anagrafiche_archive a
    LEFT JOIN tb_anagrafiche l USING (id_anagrafica)
    WHERE a.archive_batch_id = p_batch_id
      AND l.id_anagrafica IS NULL;
    SET v_restored_anag = ROW_COUNT();

    IF p_overwrite_if_exists = 1 THEN
      UPDATE tb_anagrafiche l
      JOIN tb_anagrafiche_archive a ON a.id_anagrafica = l.id_anagrafica
      SET l.ragione_sociale = a.ragione_sociale,
          l.nome            = a.nome,
          l.cognome         = a.cognome,
          l.piva            = a.piva,
          l.cf              = a.cf,
          l.id_tipologia    = a.id_tipologia,
          l.is_pa           = a.is_pa,
          l.indirizzo       = a.indirizzo,
          l.cap             = a.cap,
          l.comune          = a.comune,
          l.provincia       = a.provincia,
          l.nazione_iso2    = a.nazione_iso2,
          l.telefono        = a.telefono,
          l.email           = a.email,
          l.note            = a.note,
          l.updated_at      = NOW()
      WHERE a.archive_batch_id = p_batch_id;
      SET v_restored_anag = v_restored_anag + ROW_COUNT();
    END IF;

    UPDATE tb_anagrafiche l
    JOIN tb_anagrafiche_archive a ON a.id_anagrafica = l.id_anagrafica
    SET l.is_active = 1
    WHERE a.archive_batch_id = p_batch_id;

    /* 2) FISCALI */
    INSERT INTO tb_anagrafiche_fiscali
    SELECT
      f.id_anagrafica, f.pec, f.codice_sdi, f.iban, f.banca,
      f.id_cond_pagamento, f.modalita_pagamento, f.giorni_pagamento,
      f.altri_dati, f.created_at, f.updated_at
    FROM tb_anagrafiche_fiscali_archive f
    LEFT JOIN tb_anagrafiche_fiscali lf USING (id_anagrafica)
    WHERE f.archive_batch_id = p_batch_id
      AND lf.id_anagrafica IS NULL;
    SET v_restored_fisc = ROW_COUNT();

    IF p_overwrite_if_exists = 1 THEN
      UPDATE tb_anagrafiche_fiscali lf
      JOIN tb_anagrafiche_fiscali_archive f ON f.id_anagrafica = lf.id_anagrafica
      SET lf.pec               = f.pec,
          lf.codice_sdi        = f.codice_sdi,
          lf.iban              = f.iban,
          lf.banca             = f.banca,
          lf.id_cond_pagamento = f.id_cond_pagamento,
          lf.modalita_pagamento= f.modalita_pagamento,
          lf.giorni_pagamento  = f.giorni_pagamento,
          lf.altri_dati        = f.altri_dati,
          lf.updated_at        = NOW()
      WHERE f.archive_batch_id = p_batch_id;
      SET v_restored_fisc = v_restored_fisc + ROW_COUNT();
    END IF;

    /* 3) SEDI */
    INSERT INTO tb_sedi
    SELECT
      s.id_sede, s.id_anagrafica, s.id_tipo, s.denominazione,
      s.indirizzo, s.civico, s.cap, s.comune, s.provincia, s.nazione_iso2,
      s.telefono, s.email, s.pec, s.note, s.is_legale, s.is_predefinita,
      s.created_at, s.updated_at
    FROM tb_sedi_archive s
    LEFT JOIN tb_sedi ls USING (id_sede)
    WHERE s.archive_batch_id = p_batch_id
      AND ls.id_sede IS NULL;
    SET v_restored_sedi = ROW_COUNT();

    IF p_overwrite_if_exists = 1 THEN
      UPDATE tb_sedi ls
      JOIN tb_sedi_archive s ON s.id_sede = ls.id_sede
      SET ls.id_anagrafica  = s.id_anagrafica,
          ls.id_tipo        = s.id_tipo,
          ls.denominazione  = s.denominazione,
          ls.indirizzo      = s.indirizzo,
          ls.civico         = s.civico,
          ls.cap            = s.cap,
          ls.comune         = s.comune,
          ls.provincia      = s.provincia,
          ls.nazione_iso2   = s.nazione_iso2,
          ls.telefono       = s.telefono,
          ls.email          = s.email,
          ls.pec            = s.pec,
          ls.note           = s.note,
          ls.is_legale      = s.is_legale,
          ls.is_predefinita = s.is_predefinita,
          ls.updated_at     = NOW()
      WHERE s.archive_batch_id = p_batch_id;
      SET v_restored_sedi = v_restored_sedi + ROW_COUNT();
    END IF;

    /* 4) CONTATTI SEDE */
    INSERT INTO tb_sedi_contatti
    SELECT
      c.id_contatto, c.id_sede, c.nome, c.cognome, c.ruolo,
      c.telefono, c.email, c.note, c.created_at, c.updated_at
    FROM tb_sedi_contatti_archive c
    LEFT JOIN tb_sedi_contatti lc USING (id_contatto)
    WHERE c.archive_batch_id = p_batch_id
      AND lc.id_contatto IS NULL;
    SET v_restored_cont = ROW_COUNT();

    IF p_overwrite_if_exists = 1 THEN
      UPDATE tb_sedi_contatti lc
      JOIN tb_sedi_contatti_archive c ON c.id_contatto = lc.id_contatto
      SET lc.id_sede   = c.id_sede,
          lc.nome      = c.nome,
          lc.cognome   = c.cognome,
          lc.ruolo     = c.ruolo,
          lc.telefono  = c.telefono,
          lc.email     = c.email,
          lc.note      = c.note,
          lc.updated_at= NOW()
      WHERE c.archive_batch_id = p_batch_id;
      SET v_restored_cont = v_restored_cont + ROW_COUNT();
    END IF;

    /* 5) Pulizia archive (opzionale) */
    IF p_delete_from_archive = 1 THEN
      DELETE FROM tb_sedi_contatti_archive WHERE archive_batch_id = p_batch_id;
      DELETE FROM tb_sedi_archive           WHERE archive_batch_id = p_batch_id;
      DELETE FROM tb_anagrafiche_fiscali_archive WHERE archive_batch_id = p_batch_id;
      DELETE FROM tb_anagrafiche_archive    WHERE archive_batch_id = p_batch_id;
    END IF;

    COMMIT;

    SELECT 'OK' AS esito,
           p_batch_id AS archive_batch_id,
           v_restored_anag AS anagrafiche_ripristinate_o_aggiornate,
           v_restored_fisc AS fiscali_ripristinate_o_aggiornate,
           v_restored_sedi AS sedi_ripristinate_o_aggiornate,
           v_restored_cont AS contatti_ripristinati_o_aggiornati;
  END IF; -- fine ramo esecuzione
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_audit_partitions_ensure` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_audit_partitions_ensure`(IN p_months_ahead INT)
BEGIN
  DECLARE d DATE;
  DECLARE stop DATE;
  SET d    = DATE_FORMAT(CURDATE(), '%Y-%m-01');                         -- mese corrente
  SET stop = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL p_months_ahead MONTH), '%Y-%m-01');

  WHILE d <= stop DO
    SET @pname = CONCAT('p', DATE_FORMAT(d, '%Y%m'));
    -- esiste già?
    SELECT COUNT(*) INTO @exists
    FROM INFORMATION_SCHEMA.PARTITIONS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'tb_audit_log'
      AND PARTITION_NAME = @pname;

    IF IFNULL(@exists,0) = 0 THEN
      SET @sql = CONCAT(
        'ALTER TABLE tb_audit_log ADD PARTITION (',
        'PARTITION ', @pname, ' VALUES LESS THAN (''',
        DATE_FORMAT(DATE_ADD(d, INTERVAL 1 MONTH), '%Y-%m-01'),
        '''))'
      );
      PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
    END IF;

    SET d = DATE_ADD(d, INTERVAL 1 MONTH);
  END WHILE;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_audit_prune_older_than` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_audit_prune_older_than`(IN p_keep_months INT)
BEGIN
  -- elimina partizioni intere più vecchie del bordo inferiore di retention
  DECLARE cutoff DATE;
  SET cutoff = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL p_keep_months MONTH), '%Y-%m-01');

  LOOP_DROP:
  LOOP
    SELECT PARTITION_NAME INTO @p_to_drop
    FROM INFORMATION_SCHEMA.PARTITIONS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'tb_audit_log'
      AND PARTITION_NAME REGEXP '^p[0-9]{6}$'
      AND PARTITION_DESCRIPTION < QUOTE(cutoff)    -- upper bound < cutoff
    ORDER BY PARTITION_DESCRIPTION
    LIMIT 1;

    IF @p_to_drop IS NULL THEN
      LEAVE LOOP_DROP;
    END IF;

    SET @sql = CONCAT('ALTER TABLE tb_audit_log DROP PARTITION ', @p_to_drop);
    PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
  END LOOP;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_cliente_set_accesso_anagrafica` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_cliente_set_accesso_anagrafica`(
  IN p_id_account     BIGINT UNSIGNED,
  IN p_id_anagrafica  INT UNSIGNED,
  IN p_enable         TINYINT,
  IN p_predefinita    TINYINT
)
BEGIN
  DECLARE v_id_contatto BIGINT UNSIGNED;
  DECLARE v_is_cliente  INT DEFAULT 0;

  /* verifica account cliente + recupera contatto */
  SELECT (a.account_type='cliente') AS is_cli, a.id_contatto
    INTO v_is_cliente, v_id_contatto
  FROM auth_accounts a
  WHERE a.id_account = p_id_account;

  IF v_id_contatto IS NULL OR v_is_cliente = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account non cliente o inesistente';
  END IF;

  IF p_enable = 1 THEN
    INSERT IGNORE INTO tb_contatti_anagrafiche (id_contatto, id_anagrafica, is_predefinita)
    VALUES (v_id_contatto, p_id_anagrafica, IFNULL(p_predefinita,0));

    /* Se richiesta come predefinita, azzera le altre del contatto */
    IF IFNULL(p_predefinita,0) = 1 THEN
      UPDATE tb_contatti_anagrafiche
      SET is_predefinita = 0
      WHERE id_contatto = v_id_contatto
        AND id_anagrafica <> p_id_anagrafica;
      UPDATE tb_contatti_anagrafiche
      SET is_predefinita = 1
      WHERE id_contatto = v_id_contatto
        AND id_anagrafica = p_id_anagrafica;
    END IF;

  ELSE
    /* revoca accesso */
    DELETE FROM tb_contatti_anagrafiche
    WHERE id_contatto = v_id_contatto
      AND id_anagrafica = p_id_anagrafica;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_crea_account_cliente` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_crea_account_cliente`(
  IN  p_id_contatto   BIGINT UNSIGNED,
  IN  p_username      VARCHAR(80),
  IN  p_email         VARCHAR(160),
  IN  p_password_hash VARCHAR(100),
  IN  p_is_active     TINYINT,
  OUT p_id_account    BIGINT
)
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_id_ruolo TINYINT UNSIGNED DEFAULT 3;
  DECLARE v_id_anag INT UNSIGNED;

  /* 1) Controllo contatto */
  SELECT COUNT(*) INTO v_exists
  FROM tb_sedi_contatti c
  WHERE c.id_contatto = p_id_contatto;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Contatto inesistente';
  END IF;

  /* 2) Se non ha legami su tb_contatti_anagrafiche, prova a seed-are da sede */
  SELECT COUNT(*) INTO v_exists
  FROM tb_contatti_anagrafiche ca
  WHERE ca.id_contatto = p_id_contatto;

  IF v_exists = 0 THEN
    SELECT s.id_anagrafica
      INTO v_id_anag
    FROM tb_sedi_contatti c
    JOIN tb_sedi s ON s.id_sede = c.id_sede
    WHERE c.id_contatto = p_id_contatto
    LIMIT 1;

    IF v_id_anag IS NOT NULL THEN
      INSERT IGNORE INTO tb_contatti_anagrafiche (id_contatto, id_anagrafica, is_predefinita)
      VALUES (p_id_contatto, v_id_anag, 1);
    END IF;
  END IF;

  /* 3) Crea account */
  INSERT INTO auth_accounts (
    account_type, username, email, password_hash, id_ruolo,
    id_contatto, is_active, must_change_pwd
  ) VALUES (
    'cliente', p_username, p_email, p_password_hash, v_id_ruolo,
    p_id_contatto, IFNULL(p_is_active,1), 0
  );

  SET p_id_account = LAST_INSERT_ID();
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_sezionale_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_get_sezionale_status`(IN p_id_sezionale INT)
BEGIN
  IF p_id_sezionale IS NULL THEN
    SELECT * FROM v_sezionali_progress ORDER BY ambito, sezionale_code, anno;
  ELSE
    SELECT * FROM v_sezionali_progress
    WHERE id_sezionale = p_id_sezionale
    ORDER BY ambito, sezionale_code, anno;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_install_audit_triggers` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_install_audit_triggers`(
  IN p_table VARCHAR(64),
  IN p_pk_columns VARCHAR(255),        -- es: 'id_fattura' o 'id_ddt' ecc.
  IN p_app VARCHAR(64)                 -- es: 'ERP-Backend'
)
BEGIN
  DECLARE cols LONGTEXT;
  DECLARE pk_json LONGTEXT;
  DECLARE q TEXT;

  -- Costruisce JSON_OBJECT('col1', NEW.col1, 'col2', NEW.col2, ...)
  SELECT GROUP_CONCAT(CONCAT("'",COLUMN_NAME,"'",', NEW.',COLUMN_NAME) ORDER BY ORDINAL_POSITION SEPARATOR ', ')
  INTO cols
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = p_table;

  -- Costruisce JSON PK per NEW/OLD
  SELECT GROUP_CONCAT(CONCAT("'",TRIM(c),"'",', NEW.',TRIM(c)) SEPARATOR ', ')
  INTO @pk_new
  FROM (SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_pk_columns, ',', n.n), ',', -1)) c
        FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
              UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) n
        WHERE n.n <= 10) t
  WHERE c <> '';

  SELECT GROUP_CONCAT(CONCAT("'",TRIM(c),"'",', OLD.',TRIM(c)) SEPARATOR ', ')
  INTO @pk_old
  FROM (SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p_pk_columns, ',', n.n), ',', -1)) c
        FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
              UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) n
        WHERE n.n <= 10) t
  WHERE c <> '';

  -- DROP safety
  SET @drop_ai = CONCAT('DROP TRIGGER IF EXISTS ai_', p_table, '_audit');
  SET @drop_au = CONCAT('DROP TRIGGER IF EXISTS au_', p_table, '_audit');
  SET @drop_ad = CONCAT('DROP TRIGGER IF EXISTS ad_', p_table, '_audit');
  PREPARE s FROM @drop_ai; EXECUTE s; DEALLOCATE PREPARE s;
  PREPARE s FROM @drop_au; EXECUTE s; DEALLOCATE PREPARE s;
  PREPARE s FROM @drop_ad; EXECUTE s; DEALLOCATE PREPARE s;

  -- AFTER INSERT
  SET q = CONCAT(
    'CREATE TRIGGER ai_', p_table, '_audit AFTER INSERT ON ', p_table, ' FOR EACH ROW ',
    'BEGIN ',
    '  INSERT INTO tb_audit_log(table_name, op, pk_json, row_new, actor, app) ',
    '  VALUES (''', p_table, ''',''I'', JSON_OBJECT(', @pk_new, '), JSON_OBJECT(', cols, '), CURRENT_USER(), ''', p_app, '''); ',
    'END'
  );
  PREPARE s FROM q; EXECUTE s; DEALLOCATE PREPARE s;

  -- AFTER UPDATE
  SET q = CONCAT(
    'CREATE TRIGGER au_', p_table, '_audit AFTER UPDATE ON ', p_table, ' FOR EACH ROW ',
    'BEGIN ',
    '  INSERT INTO tb_audit_log(table_name, op, pk_json, row_old, row_new, actor, app) ',
    '  VALUES (''', p_table, ''',''U'', JSON_OBJECT(', @pk_new, '), JSON_OBJECT(', cols, '), JSON_OBJECT(', cols, '), CURRENT_USER(), ''', p_app, '''); ',
    'END'
  );
  PREPARE s FROM q; EXECUTE s; DEALLOCATE PREPARE s;

  -- AFTER DELETE
  SET q = CONCAT(
    'CREATE TRIGGER ad_', p_table, '_audit AFTER DELETE ON ', p_table, ' FOR EACH ROW ',
    'BEGIN ',
    '  INSERT INTO tb_audit_log(table_name, op, pk_json, row_old, actor, app) ',
    '  VALUES (''', p_table, ''',''D'', JSON_OBJECT(', @pk_old, '), JSON_OBJECT(', cols, '), CURRENT_USER(), ''', p_app, '''); ',
    'END'
  );
  PREPARE s FROM q; EXECUTE s; DEALLOCATE PREPARE s;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_on_ddt_fattura_link_changed` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_on_ddt_fattura_link_changed`(p_id_fattura INT)
BEGIN
  DECLARE v_td24 TINYINT;
  DECLARE v_current_td TINYINT;

  SET v_td24 = fn_td24_id();

  -- if fattura hasn't SdI tipo yet, set to TD24 (best-effort)
  SELECT id_sdi_tipo_documento INTO v_current_td
  FROM tb_fatture WHERE id_fattura = p_id_fattura;

  IF v_current_td IS NULL AND v_td24 IS NOT NULL THEN
    UPDATE tb_fatture
    SET id_sdi_tipo_documento = v_td24
    WHERE id_fattura = p_id_fattura;
  END IF;

  -- Recalc monetary totals/saldo
  CALL sp_recalc_fattura(p_id_fattura);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_recalc_ddt` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_recalc_ddt`(p_id INT)
BEGIN
  DECLARE v_pezzi BIGINT DEFAULT 0;
  DECLARE v_peso  DECIMAL(18,3) DEFAULT 0.000;

  SELECT
    COALESCE(SUM(quantita),0),
    COALESCE(SUM(peso_totale_kg),0)
  INTO v_pezzi, v_peso
  FROM tb_ddt_righe
  WHERE id_ddt = p_id;

  UPDATE tb_ddt
  SET totale_pezzi = v_pezzi,
      totale_peso_kg = v_peso
  WHERE id_ddt = p_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_recalc_preventivo` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
DELIMITER ;;
CREATE  /* DEFINER=`laravel_mediaprint`@`%` */ PROCEDURE `sp_recalc_preventivo`(p_id INT)
BEGIN
  DECLARE v_imponibile DECIMAL(12,2) DEFAULT 0;
  DECLARE v_sconto     DECIMAL(12,2) DEFAULT 0;
  DECLARE v_iva        DECIMAL(12,2) DEFAULT 0;
  DECLARE v_totale     DECIMAL(12,2) DEFAULT 0;

  SELECT
    COALESCE(SUM(importo_scontato),0),
    COALESCE(SUM(sconto),0),
    COALESCE(SUM(iva),0),
    COALESCE(SUM(totale),0)
  INTO v_imponibile, v_sconto, v_iva, v_totale
  FROM tb_preventivi_righe
  WHERE id_preventivo = p_id;

  UPDATE tb_preventivi
  SET totale_imponibile = v_imponibile,
      totale_sconto     = v_sconto,
      totale_iva        = v_iva,
      totale            = v_totale
  WHERE id_preventivo = p_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_account_cliente_anagrafica_predefinita`
--

/*!50001 DROP VIEW IF EXISTS `v_account_cliente_anagrafica_predefinita`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_account_cliente_anagrafica_predefinita` AS select `a`.`id_account` AS `id_account`,`a`.`username` AS `username`,`a`.`id_contatto` AS `id_contatto`,(select `ca1`.`id_anagrafica` from `tb_contatti_anagrafiche` `ca1` where `ca1`.`id_contatto` = `a`.`id_contatto` order by `ca1`.`is_predefinita` desc,`ca1`.`created_at` desc,`ca1`.`id_anagrafica` limit 1) AS `id_anagrafica_predefinita` from `auth_accounts` `a` where `a`.`account_type` = 'cliente' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_account_cliente_anagrafiche`
--

/*!50001 DROP VIEW IF EXISTS `v_account_cliente_anagrafiche`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_account_cliente_anagrafiche` AS select `a`.`id_account` AS `id_account`,`a`.`username` AS `username`,`a`.`id_contatto` AS `id_contatto`,`ca`.`id_anagrafica` AS `id_anagrafica` from (`auth_accounts` `a` join `tb_contatti_anagrafiche` `ca` on(`ca`.`id_contatto` = `a`.`id_contatto`)) where `a`.`account_type` = 'cliente' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_anagrafiche_inattive_2y`
--

/*!50001 DROP VIEW IF EXISTS `v_anagrafiche_inattive_2y`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_anagrafiche_inattive_2y` AS select `a`.`id_anagrafica` AS `id_anagrafica`,`a`.`id_tipologia` AS `id_tipologia`,`a`.`id_sdi_regime_fiscale` AS `id_sdi_regime_fiscale`,`a`.`is_pa` AS `is_pa`,`a`.`ragione_sociale` AS `ragione_sociale`,`a`.`piva` AS `piva`,`a`.`codice_fiscale` AS `codice_fiscale`,`a`.`indirizzo` AS `indirizzo`,`a`.`cap` AS `cap`,`a`.`citta` AS `citta`,`a`.`provincia` AS `provincia`,`a`.`nazione` AS `nazione`,`a`.`email` AS `email`,`a`.`telefono` AS `telefono`,`a`.`note` AS `note`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at`,nullif(`ld`.`last_document_date`,'1000-01-01') AS `last_document_date`,case when `ld`.`last_document_date` = '1000-01-01' then curdate() - interval 24 month else `ld`.`last_document_date` end AS `inactive_since` from (`tb_anagrafiche` `a` join `v_anagrafiche_lastdoc` `ld` on(`ld`.`id_anagrafica` = `a`.`id_anagrafica`)) where `ld`.`last_document_date` = '1000-01-01' or `ld`.`last_document_date` < curdate() - interval 24 month */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_anagrafiche_lastdoc`
--

/*!50001 DROP VIEW IF EXISTS `v_anagrafiche_lastdoc`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_anagrafiche_lastdoc` AS select `a`.`id_anagrafica` AS `id_anagrafica`,greatest(coalesce(`p`.`max_data_preventivo`,'1000-01-01'),coalesce(`d`.`max_data_ddt`,'1000-01-01'),coalesce(`f`.`max_data_fattura`,'1000-01-01')) AS `last_document_date` from (((`tb_anagrafiche` `a` left join (select `tb_preventivi`.`id_anagrafica` AS `id_anagrafica`,max(`tb_preventivi`.`data_preventivo`) AS `max_data_preventivo` from `tb_preventivi` group by `tb_preventivi`.`id_anagrafica`) `p` on(`p`.`id_anagrafica` = `a`.`id_anagrafica`)) left join (select `tb_ddt`.`id_anagrafica` AS `id_anagrafica`,max(`tb_ddt`.`data_ddt`) AS `max_data_ddt` from `tb_ddt` group by `tb_ddt`.`id_anagrafica`) `d` on(`d`.`id_anagrafica` = `a`.`id_anagrafica`)) left join (select `tb_fatture`.`id_anagrafica` AS `id_anagrafica`,max(`tb_fatture`.`data_fattura`) AS `max_data_fattura` from `tb_fatture` group by `tb_fatture`.`id_anagrafica`) `f` on(`f`.`id_anagrafica` = `a`.`id_anagrafica`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_archive_batches`
--

/*!50001 DROP VIEW IF EXISTS `v_archive_batches`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_archive_batches` AS select `x`.`archive_batch_id` AS `archive_batch_id`,min(`x`.`archived_at`) AS `started_at`,max(`x`.`archived_at`) AS `finished_at`,count(0) AS `records_total`,group_concat(distinct `x`.`archived_by` order by `x`.`archived_by` ASC separator ',') AS `by_users` from (select `tb_anagrafiche_archive`.`archive_batch_id` AS `archive_batch_id`,`tb_anagrafiche_archive`.`archived_at` AS `archived_at`,`tb_anagrafiche_archive`.`archived_by` AS `archived_by` from `tb_anagrafiche_archive` union all select `tb_anagrafiche_fiscali_archive`.`archive_batch_id` AS `archive_batch_id`,`tb_anagrafiche_fiscali_archive`.`archived_at` AS `archived_at`,`tb_anagrafiche_fiscali_archive`.`archived_by` AS `archived_by` from `tb_anagrafiche_fiscali_archive` union all select `tb_sedi_archive`.`archive_batch_id` AS `archive_batch_id`,`tb_sedi_archive`.`archived_at` AS `archived_at`,`tb_sedi_archive`.`archived_by` AS `archived_by` from `tb_sedi_archive` union all select `tb_sedi_contatti_archive`.`archive_batch_id` AS `archive_batch_id`,`tb_sedi_contatti_archive`.`archived_at` AS `archived_at`,`tb_sedi_contatti_archive`.`archived_by` AS `archived_by` from `tb_sedi_contatti_archive`) `x` group by `x`.`archive_batch_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_ddt_all`
--

/*!50001 DROP VIEW IF EXISTS `v_ddt_all`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ddt_all` AS select `d`.`id_ddt` AS `id_ddt`,`d`.`id_anagrafica` AS `id_anagrafica`,`d`.`anno` AS `anno`,`d`.`numero_documento` AS `numero_documento`,`d`.`data_ddt` AS `data_ddt`,`d`.`totale_pezzi` AS `totale_pezzi`,`d`.`totale_peso_kg` AS `totale_peso_kg`,`d`.`note` AS `note`,`d`.`id_causale` AS `id_causale`,`c`.`label` AS `causale_label`,`d`.`id_serie` AS `id_serie`,`s`.`code` AS `serie_code`,`d`.`created_at` AS `created_at`,`d`.`updated_at` AS `updated_at`,'tb_ddt' AS `source_table` from ((`tb_ddt` `d` left join `cfg_causali_ddt` `c` on(`c`.`id_causale` = `d`.`id_causale`)) left join `cfg_serie_documenti` `s` on(`s`.`id_serie` = `d`.`id_serie`)) union all select `a`.`id_ddt` AS `id_ddt`,`a`.`id_anagrafica` AS `id_anagrafica`,`a`.`anno` AS `anno`,`a`.`numero_documento` AS `numero_documento`,`a`.`data_ddt` AS `data_ddt`,`a`.`totale_pezzi` AS `totale_pezzi`,NULL AS `totale_peso_kg`,`a`.`note` AS `note`,NULL AS `id_causale`,`a`.`causale` AS `causale_label`,NULL AS `id_serie`,NULL AS `serie_code`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at`,'tb_ddt_archive' AS `source_table` from `tb_ddt_archive` `a` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_ddt_slim`
--

/*!50001 DROP VIEW IF EXISTS `v_ddt_slim`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ddt_slim` AS select `d`.`id_ddt` AS `id_ddt`,`d`.`id_anagrafica` AS `id_anagrafica`,`d`.`anno` AS `anno`,`d`.`numero_documento` AS `numero_documento`,`d`.`data_ddt` AS `data_ddt`,`d`.`totale_pezzi` AS `totale_pezzi`,`d`.`note` AS `note`,`d`.`created_at` AS `created_at`,`d`.`updated_at` AS `updated_at` from `tb_ddt` `d` union all select `a`.`id_ddt` AS `id_ddt`,`a`.`id_anagrafica` AS `id_anagrafica`,`a`.`anno` AS `anno`,`a`.`numero_documento` AS `numero_documento`,`a`.`data_ddt` AS `data_ddt`,`a`.`totale_pezzi` AS `totale_pezzi`,`a`.`note` AS `note`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at` from `tb_ddt_archive` `a` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_fatture_all`
--

/*!50001 DROP VIEW IF EXISTS `v_fatture_all`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_fatture_all` AS select `f`.`id_fattura` AS `id_fattura`,`f`.`id_anagrafica` AS `id_anagrafica`,`f`.`anno` AS `anno`,`f`.`numero_documento` AS `numero_documento`,`f`.`data_fattura` AS `data_fattura`,`f`.`totale_imponibile` AS `totale_imponibile`,`f`.`totale_sconto` AS `totale_sconto`,`f`.`totale_iva` AS `totale_iva`,`f`.`totale` AS `totale`,`f`.`saldo` AS `saldo`,`f`.`note` AS `note`,`f`.`id_stato_fatt` AS `id_stato`,`sf`.`label` AS `stato_label`,`f`.`id_tipo_fatt` AS `id_tipo`,`tf`.`label` AS `tipo_label`,`f`.`id_sezionale` AS `id_sezionale`,`sz`.`code` AS `sezionale_code`,`f`.`id_serie` AS `id_serie`,`sd`.`code` AS `serie_code`,`f`.`id_sdi_tipo_documento` AS `id_sdi_tipo_documento`,`td`.`code` AS `sdi_td_code`,`f`.`id_sdi_esigibilita` AS `id_sdi_esigibilita`,`es`.`code` AS `sdi_esig_code`,`f`.`id_sdi_modalita` AS `id_sdi_modalita`,`mp`.`code` AS `sdi_mp_code`,`f`.`created_at` AS `created_at`,`f`.`updated_at` AS `updated_at`,'tb_fatture' AS `source_table` from (((((((`tb_fatture` `f` left join `cfg_stati_fattura` `sf` on(`sf`.`id_stato` = `f`.`id_stato_fatt`)) left join `cfg_tipi_fattura` `tf` on(`tf`.`id_tipo` = `f`.`id_tipo_fatt`)) left join `cfg_serie_documenti` `sd` on(`sd`.`id_serie` = `f`.`id_serie`)) left join `cfg_sezionali` `sz` on(`sz`.`id_sezionale` = `f`.`id_sezionale`)) left join `cfg_sdi_tipo_documento` `td` on(`td`.`id_tipo` = `f`.`id_sdi_tipo_documento`)) left join `cfg_sdi_esigibilita_iva` `es` on(`es`.`id_esig` = `f`.`id_sdi_esigibilita`)) left join `cfg_sdi_modalita_pagamento` `mp` on(`mp`.`id_modalita` = `f`.`id_sdi_modalita`)) union all select `a`.`id_fattura` AS `id_fattura`,`a`.`id_anagrafica` AS `id_anagrafica`,`a`.`anno` AS `anno`,`a`.`numero_documento` AS `numero_documento`,`a`.`data_fattura` AS `data_fattura`,`a`.`totale_imponibile` AS `totale_imponibile`,`a`.`totale_sconto` AS `totale_sconto`,`a`.`totale_iva` AS `totale_iva`,`a`.`totale` AS `totale`,`a`.`saldo` AS `saldo`,`a`.`note` AS `note`,NULL AS `id_stato`,`a`.`stato` AS `stato_label`,NULL AS `id_tipo`,`a`.`tipo` AS `tipo_label`,NULL AS `id_sezionale`,NULL AS `sezionale_code`,NULL AS `id_serie`,NULL AS `serie_code`,NULL AS `id_sdi_tipo_documento`,NULL AS `sdi_td_code`,NULL AS `id_sdi_esigibilita`,NULL AS `sdi_esig_code`,NULL AS `id_sdi_modalita`,NULL AS `sdi_mp_code`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at`,'tb_fatture_archive' AS `source_table` from `tb_fatture_archive` `a` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_fatture_slim`
--

/*!50001 DROP VIEW IF EXISTS `v_fatture_slim`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY INVOKER */
/*!50001 VIEW `v_fatture_slim` AS select `f`.`id_fattura` AS `id_fattura`,`f`.`id_anagrafica` AS `id_anagrafica`,`f`.`anno` AS `anno`,`f`.`numero_documento` AS `numero_documento`,`f`.`data_fattura` AS `data_fattura`,`f`.`totale_imponibile` AS `totale_imponibile`,`f`.`totale_sconto` AS `totale_sconto`,`f`.`totale_iva` AS `totale_iva`,`f`.`totale` AS `totale`,`f`.`saldo` AS `saldo`,`f`.`note` AS `note`,`f`.`created_at` AS `created_at`,`f`.`updated_at` AS `updated_at` from `tb_fatture` `f` union all select `a`.`id_fattura` AS `id_fattura`,`a`.`id_anagrafica` AS `id_anagrafica`,`a`.`anno` AS `anno`,`a`.`numero_documento` AS `numero_documento`,`a`.`data_fattura` AS `data_fattura`,`a`.`totale_imponibile` AS `totale_imponibile`,`a`.`totale_sconto` AS `totale_sconto`,`a`.`totale_iva` AS `totale_iva`,`a`.`totale` AS `totale`,`a`.`saldo` AS `saldo`,`a`.`note` AS `note`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at` from `tb_fatture_archive` `a` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_preventivi_all`
--

/*!50001 DROP VIEW IF EXISTS `v_preventivi_all`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_preventivi_all` AS select `p`.`id_preventivo` AS `id_preventivo`,`p`.`id_anagrafica` AS `id_anagrafica`,`p`.`anno_preventivo` AS `anno_preventivo`,`p`.`numero_documento` AS `numero_documento`,`p`.`data_preventivo` AS `data_preventivo`,`p`.`totale_imponibile` AS `totale_imponibile`,`p`.`totale_sconto` AS `totale_sconto`,`p`.`totale_iva` AS `totale_iva`,`p`.`totale` AS `totale`,`p`.`note` AS `note`,`p`.`id_stato_prev` AS `id_stato`,`sp`.`label` AS `stato_label`,`p`.`id_serie` AS `id_serie`,`sd`.`code` AS `serie_code`,`p`.`created_at` AS `created_at`,`p`.`updated_at` AS `updated_at`,'tb_preventivi' AS `source_table` from ((`tb_preventivi` `p` left join `cfg_stati_preventivo` `sp` on(`sp`.`id_stato` = `p`.`id_stato_prev`)) left join `cfg_serie_documenti` `sd` on(`sd`.`id_serie` = `p`.`id_serie`)) union all select `a`.`id_preventivo` AS `id_preventivo`,`a`.`id_anagrafica` AS `id_anagrafica`,`a`.`anno_preventivo` AS `anno_preventivo`,`a`.`numero_documento` AS `numero_documento`,`a`.`data_preventivo` AS `data_preventivo`,`a`.`totale_imponibile` AS `totale_imponibile`,`a`.`totale_sconto` AS `totale_sconto`,`a`.`totale_iva` AS `totale_iva`,`a`.`totale` AS `totale`,`a`.`note` AS `note`,NULL AS `id_stato`,`a`.`stato` AS `stato_label`,NULL AS `id_serie`,NULL AS `serie_code`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at`,'tb_preventivi_archive' AS `source_table` from `tb_preventivi_archive` `a` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_preventivi_slim`
--

/*!50001 DROP VIEW IF EXISTS `v_preventivi_slim`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_preventivi_slim` AS select `p`.`id_preventivo` AS `id_preventivo`,`p`.`id_anagrafica` AS `id_anagrafica`,`p`.`anno_preventivo` AS `anno_preventivo`,`p`.`numero_documento` AS `numero_documento`,`p`.`data_preventivo` AS `data_preventivo`,`p`.`totale_imponibile` AS `totale_imponibile`,`p`.`totale_sconto` AS `totale_sconto`,`p`.`totale_iva` AS `totale_iva`,`p`.`totale` AS `totale`,`p`.`note` AS `note`,`p`.`created_at` AS `created_at`,`p`.`updated_at` AS `updated_at` from `tb_preventivi` `p` union all select `a`.`id_preventivo` AS `id_preventivo`,`a`.`id_anagrafica` AS `id_anagrafica`,`a`.`anno_preventivo` AS `anno_preventivo`,`a`.`numero_documento` AS `numero_documento`,`a`.`data_preventivo` AS `data_preventivo`,`a`.`totale_imponibile` AS `totale_imponibile`,`a`.`totale_sconto` AS `totale_sconto`,`a`.`totale_iva` AS `totale_iva`,`a`.`totale` AS `totale`,`a`.`note` AS `note`,`a`.`created_at` AS `created_at`,`a`.`updated_at` AS `updated_at` from `tb_preventivi_archive` `a` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-01 16:55:11
