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
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appoggio_pagamenti_fattura`
--

LOCK TABLES `appoggio_pagamenti_fattura` WRITE;
/*!40000 ALTER TABLE `appoggio_pagamenti_fattura` DISABLE KEYS */;
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
(33,14);
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
(33,12);
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_account_contatti`
--

LOCK TABLES `auth_account_contatti` WRITE;
/*!40000 ALTER TABLE `auth_account_contatti` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_account_contatti` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_accounts`
--

LOCK TABLES `auth_accounts` WRITE;
/*!40000 ALTER TABLE `auth_accounts` DISABLE KEYS */;
INSERT INTO `auth_accounts` VALUES
(1,'operatore','Alex Olivieri','alex.o@mediaprint.it','$2y$10$JkB3w1sOK6qwNJ2MJRSJeubmFPXJ5p7swDshAcocO/.jTQ0XtTNDW',1,NULL,1,0,0,NULL,'2025-11-21 16:12:49','2025-10-01 10:41:38','2025-11-21 16:12:49'),
(2,'operatore','Simona Cappelletti','simona.c@mediaprint.it','$2y$10$z14y/3dYOkBrwAI0AQmIYevXrCN4vyELFDDIt7KyDm2spPmory6l2',2,NULL,1,0,0,NULL,NULL,'2025-10-15 16:18:53','2025-10-15 16:18:53');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
(1,68),
(1,69),
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
(1,62),
(1,63),
(1,64),
(1,65),
(1,66),
(1,67),
(2,1),
(2,2),
(2,10),
(2,11),
(2,68),
(2,69),
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
(2,62),
(2,63),
(2,64),
(2,65),
(2,66),
(3,1),
(3,10),
(3,68),
(3,20),
(3,30),
(3,50),
(4,10),
(4,68),
(4,69),
(4,20),
(4,21),
(4,22),
(4,62),
(4,63);
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
(61,'cfg.edit','Gestire configurazioni',1),
(62,'job.view','Visualizzare lavorazioni e attivita',1),
(63,'job.manage','Creare e aggiornare lavorazioni e attivita',1),
(64,'job.assign','Assegnare attivita agli operatori',1),
(65,'job.report','Generare ed esportare report di produzione',1),
(66,'job.analytics','Visualizzare dashboard e analytics produzione',1),
(67,'job.admin','Gestire configurazioni e SLA lavorazioni',1),
(68,'contratti.view','Visualizzare contratti',1),
(69,'contratti.edit','Creare/Modificare contratti',1);
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
(3,'cliente','Cliente',1),
(4,'commerciale','Commerciale',1);
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cfg_lavorazioni_attivita_template`
--

LOCK TABLES `cfg_lavorazioni_attivita_template` WRITE;
/*!40000 ALTER TABLE `cfg_lavorazioni_attivita_template` DISABLE KEYS */;
INSERT INTO `cfg_lavorazioni_attivita_template` VALUES
(1,'Impaginazione','Predisposizione file grafici per la commessa','medium',NULL,NULL,1,10,'2025-11-26 12:22:35','2025-11-26 12:22:35'),
(2,'Stampa','Produzione in reparto stampa','high',NULL,NULL,1,20,'2025-11-26 12:22:35','2025-11-26 12:22:35'),
(3,'Imbustamento','Preparazione e imbustamento del materiale','medium',NULL,NULL,1,30,'2025-11-26 12:22:35','2025-11-26 12:22:35');
/*!40000 ALTER TABLE `cfg_lavorazioni_attivita_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_files`
--

DROP TABLE IF EXISTS `tb_lavorazioni_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_files` (
  `id_file` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_lavorazione` int(10) unsigned NOT NULL,
  `titolo` varchar(191) NOT NULL,
  `categoria` enum('cliente','anteprima','altro') NOT NULL DEFAULT 'cliente',
  `original_name` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(128) DEFAULT NULL,
  `size_bytes` bigint(20) unsigned NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_file`),
  KEY `idx_lavfiles_lavorazione` (`id_lavorazione`),
  KEY `idx_lavfiles_created_by` (`created_by`),
  CONSTRAINT `fk_lavfiles_lavorazione` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE,
  CONSTRAINT `fk_lavfiles_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tb_lavorazioni_files_downloads`
--

DROP TABLE IF EXISTS `tb_lavorazioni_files_downloads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_files_downloads` (
  `id_download` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_file` bigint(20) unsigned NOT NULL,
  `downloaded_by` bigint(20) unsigned DEFAULT NULL,
  `downloaded_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_download`),
  KEY `idx_lavfiles_dl_file` (`id_file`),
  KEY `idx_lavfiles_dl_by` (`downloaded_by`),
  CONSTRAINT `fk_lavfiles_dl_file` FOREIGN KEY (`id_file`) REFERENCES `tb_lavorazioni_files` (`id_file`) ON DELETE CASCADE,
  CONSTRAINT `fk_lavfiles_dl_by` FOREIGN KEY (`downloaded_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
(4,'Posta Digitale','posta_digitale',4,1);
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
(1,'N1','Escluse Art.15',1),
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
(1,2025,12);
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
-- Table structure for table `cfg_stati_fattura`
--

DROP TABLE IF EXISTS `cfg_stati_fattura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cfg_stati_fattura` (
  `id_stato` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `label` varchar(64) NOT NULL,
  `timeline_color` varchar(32) DEFAULT NULL,
  `timeline_icon` varchar(32) DEFAULT NULL,
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
(1,'bozza','Bozza',NULL,NULL,10,1),
(2,'emessa','Emessa',NULL,NULL,20,1),
(3,'inviata','Inviata',NULL,NULL,30,1),
(4,'pagata','Pagata','#198754','✔',40,1),
(5,'scaduta','Scaduta','#dc3545','⚠',50,1),
(6,'rifiutata','Rifiutata','#6c757d','✖',60,1),
(7,'pagataparziale','Parzialmente Pagata','#f0ad4e','◒',41,1);
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
(1,1,1,0,1,'attiva','MEDIAPRINT SRL','00865490676','00865490676','prova note update','2025-04-22 16:19:41','2025-10-03 14:38:02'),
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
(15,1,NULL,0,1,'attiva','COMUNE DI BELLANTE ','00212050678',NULL,'Comune di Bellante (TE) - Piazza Mazzini, 1 - 64020 Bellante (TE) - Tel 0861.61701 - Fax 0861.6170330\rPEC protocollo@pec.comune.bellante.te.it - Mail protocollo@comune.bellante.te.it -  P.IVA 00212050678 - c/c postale n. 10750644\r\rDI GIUSEPPE diretto 08616170338 - 3393684818','2025-04-22 17:28:48','2025-04-22 17:28:49'),
(16,1,NULL,0,1,'attiva','COMUNE DI CITTÀ SANT’ANGELO',NULL,'00063640684','DIRETTO Dott.ssa VERRIGNI 085 9696275\r\rResponsabile affidamenti Dott.ssa De Berardinis diretto 0859696228 mail : stefania.deberardinis@comune.cittasantangelo.pe.it\r\r;elena.verrigni@comune.cittasantangelo.pe.it;verrigni.e@comune.cittasantangelo.pe.it\rvalerio.danteo@comune.cittasantangelo.pe.it\r0859696211\r 085.9696.270Franca Crocetta ','2025-04-22 17:32:14','2025-05-08 12:49:18'),
(17,1,NULL,0,1,'attiva','ARTIGRAFICHE DI GALVAN IVANO & C. - S.N.C.\r','00201290681','00201290681',NULL,'2025-04-22 17:41:43','2025-04-22 17:41:44'),
(18,1,NULL,0,1,'attiva','O.P.S.  S.P.A.','01891040691',NULL,'\rroberta.gallo@opschieti.it -> anteprime per lavorazione CPS\r\rInviare anteprime anche a \rprogrammazione.vit@opschieti.it\r\rcontratto fornitura bollettazione periodica\rprogrammazione.vit@opschieti.it; opschieti@pec.aruba.it\r\rLuciano Consorti 0871/5857241-223-232\r\rBollo ed affrancatura posta prioritaria 0,85 + IVA\rstampa ed imbustamenti 0,13 +iva\rposta raccomandata  tipo 1 e tipo 2 prezzi affrancatura euro 3,8 +\r lav euro 0,39\rdal 1/06/12 \raffrancature euro 0,60 esente iva \rlavorazioni di posta prioritaria a euro 0,17\r\r PER CONTABILITà \rPAOLO DI SIPIO 0871/5857210  x fatture    email : info.ops@opschieti.it\rF. Stampone Responsabile tecnico 0871/5857232  349/4598820   331/2302492\r\rFERDINANDO    0871/5857232  349/4598820\rpaolo.disipio@opschieti.it\rGIOVANNI MAY 335/1823022\r0871 5857243 ROBERTA GALLO \rIdentificativo fiscale ai fini IVA: IT01891040691 \r\rDenominazione: OPS SPA  \r\rIndirizzo: VIA PADRE U. FRASCA \r\rComune: CENTRO DIR. DAMA - CHIETI SCALO \r\rProvincia: CH \r\rCAP: 66100 \r\rNazione: IT \r\rCodice Destinatario M5UXCR1\r \r\r','2025-04-22 17:50:10','2025-08-21 17:42:03'),
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
(29,1,NULL,0,1,'attiva','PALITALSOFT  S.R.L','00994810430',NULL,'BANCA POPOLARE ANCONA – Ag. Nr. 1 – JESI (AN)\rCodice IBAN: IT 42 V 05308 21285 00000000788\r\rcomune di tradate sig gianluca 348/5132024\r\ramministrazione roberta  0731 229108\r\rRosanna Rossi Brunori T. +39 0731 229197\rAPRA 0731 22911\r\rSIG.RA GAGGIA DI GESENU 0755743604','2025-04-23 10:28:40','2025-09-01 17:20:54'),
(30,1,NULL,0,1,'attiva','COMUNE DI SPINETOLI','00362890444',NULL,'Comune di Spinetoli\rPiazza Leopardi, 31 - 63078 Spinetoli (AP) - Tel.0736/890298 - Partita Iva: 00362890444 - PEC: protocollo@pec.comune.spinetoli.ap.it -\r\r15/12/22 Daniela Felicioni - Tributi Spinetoli <daniela.felicioni@comune.spinetoli.ap.it> \r0736899060\r\rgiuseppe d\'angelo 0736/899060','2025-04-23 10:31:22','2025-04-23 10:31:23'),
(31,1,NULL,0,1,'attiva','COMUNE DI BELMONTE PICENO','00433470440','81001490440','cliente di Mara sinergie \r\r','2025-04-23 10:32:42','2025-04-23 10:32:59'),
(32,1,NULL,0,1,'attiva','ENTE DIGITALE TRIBUTI SRL','08648600966','08648600966','BANCA POPOLARE DI MILANO\rC/C 0000798\rIBAN IT35S0558432430000000000798\r marialisagalbiati@alice.it \r\risa.galbiati@entedigitaletributi.it  \r\rfabio.giudetti@entedigitaletributi.it','2025-04-23 10:36:01','2025-04-23 10:36:02'),
(33,1,NULL,0,1,'attiva','COMUNITA’ DI S.EGIDIO - ACAP - APS','02132561008','80191770587','OLIVIERI X Sant\'egidio 0658566354\rStella Cervogni 06585661  mobile 3395071971\rPaola Federici  3388256177\rValeria Olivieri 3357470254\r\r\r','2025-04-23 10:41:36','2025-05-08 12:49:21'),
(34,1,NULL,0,1,'attiva','D’AURIA PRINTING S.P.A.','00954720678','01168680682','D’AURIA PRINTING SPA\rSede legale: Via dell’Aspo 1 – 63100 Ascoli Piceno - AP\rSede operativa e recapito: Zona industriale destra Tronto – 64016 Sant’Egidio alla Vibrata - TE\rCodice fiscale       01168680682\rPartita IVA           00954720678\rCodice SDI           SUBM70N    (sesto carattere pari a zero)\rdauriaprinting@pec.it\rIBAN IT86 H 03069 13506 1000 0000 2177\r\r\r','2025-04-23 10:52:26','2025-05-08 12:48:26'),
(35,1,NULL,0,1,'attiva','LITOEMME SRL','01846690442',NULL,'LITOEMME S.r.l. Unipersonale\r\rVia Archetti, scn\r63831 RAPAGNANO (Fermo)\rTel. 0734.518014 - 0734.515642\rFax 0734.514549\rwww.litoemme.it\rE-mail: info@litoemme.it\rPartita IVA 01846690442\rCap. Soc. 100.000,00 euro i.v.\rBanca della provincia di Macerata\rAgenzia di Porto San Giorgio (FM)\rAbi 03317 • Cab 69660\rIBAN IT97Y\r?03317?\r69660000310300241\r\r\r\r','2025-04-23 10:55:50','2025-04-23 10:56:51'),
(36,1,NULL,0,1,'attiva','COMUNE DI FORMIA','00087990594','81000270595','Codice Ufficio JIJWR5 - Ufficio Fatturazione \rPEC SERVIZIO FATTURAZIONE finanza@pec.cittadiformia.it \rCANALE DI TRASMISSIONE PEC \rPosta elettronica Dirigente del Settore Dr.ssa livornese : tlivornese@comune.formia.lt.it \r \rc/a livornese Tiziana \rmastantuono 3394025400\r\rresponsabile tributi Dr. Daniele Rossi 0771778850\rdrossi@comune.formia.lt.it\r \r\r','2025-04-23 10:59:02','2025-04-23 10:59:03'),
(37,1,NULL,0,1,'attiva','COMUNE DI ITRI','00279170591','81003170594','Piazza Umberto I, 1 - 04020 Itri (LT)\rTel. 0771.7321 - Fax 0771.721108\rP.IVA: 00279170591 \rC.F.: 81003170594\r\rgiorgio.colaguori@libero.it; tributi@comune.itri.lt.it\r','2025-04-23 11:00:23','2025-04-23 11:00:41'),
(38,1,NULL,0,1,'attiva','COMUNE DI SANTE MARIE\r','00191110667','00191110667',NULL,'2025-04-23 11:01:40','2025-04-23 11:01:41'),
(39,1,NULL,0,1,'attiva','COMUNE DI MACHERIO\r','00702660960','01039700156','     Il Responsabile Uffici  (Dott. Benedetto Cavallé)\r\r','2025-04-23 11:02:43','2025-04-23 11:03:01'),
(40,1,NULL,0,1,'attiva','COMUNE DI RICCIONE','00324360403','00324360403','ufficio pagamenti  kATIA  0541/608354\rTamara 3315222646 da chiamare solo x urgenze\r\rValeria 0541 608260\rGrossi Daniele 0541 608250\r\rMI5WX4 \r\r','2025-04-23 11:04:18','2025-04-23 11:04:19'),
(41,1,NULL,0,1,'attiva','COMUNE DI VIMODRONE ','00858950967','07430220157',NULL,'2025-04-23 11:06:45','2025-04-23 11:07:03'),
(42,1,NULL,0,1,'attiva','COMUNE DI ACQUAVIVA PICENA','00376660445',NULL,NULL,'2025-04-23 11:09:30','2025-04-23 11:09:31'),
(43,2,NULL,0,1,'attiva','MAIL EXPRESS POSTE PRIVATE SRL','01436910671','01436910671','Via Pascoli, Zona Artigianale - C.da Ripoli\r64023 Mosciano S.Angelo (TE)\rCentralino: 085.90.40.350\rFax: 085.80.71.977\r\rReferente. Dott. Franco Gaspari \r\rFabio il Grande  3475562922','2025-04-23 11:11:10','2025-05-08 12:50:44'),
(44,1,NULL,0,1,'attiva','COMUNE DI CALLIANO','00410550222','00410550222','COMUNE DI CALLIANO - Via Roma, 117 - 14031 - Calliano  (AT)\r\rPer fatture Ornella','2025-04-23 11:12:08','2025-04-23 11:12:09'),
(45,1,NULL,0,1,'attiva','CVM - COMUNITÀ VOLONTARI PER IL MONDO','02130480425','00316140433','Dir. Comunicazione e Raccolta Fondi\rCVM - Comunità Volontari per il Mondo\rV.le delle Regioni,6\r63822 - Porto San Giorgio (FM)\r0734/674832\r6 uscite   a € 200,00+ iva\rcvm.comunicazione@gmaail.com\rcoord.italia@cvm.an.it\r\rAscani Attilio  3202492203','2025-04-23 11:13:49','2025-04-23 11:13:50'),
(46,1,NULL,0,1,'attiva','BANCA DI CREDITO COOPERATIVO DELL’ADRIATICO TERAMANO SOC CO','15240741007','01469670671','AGGIORNATA p.iva modificata il 19/8/2019\rofelio.liberati@fedam.bcc.it\rBernava Arturo 085/8071544 (int.207) \rcell 3388608575.\rcome da accordi telefonici, le comunico i miei riferimenti di segreteria generale:\rPaolo Ruffini\rpaolo.ruffini@fedam.bcc.it\rtel. 085.8077544.201\rPAOLO RUFFINI  085/8071544 (int.2 poi 1) - 3282921847 ','2025-04-23 11:16:18','2025-05-08 12:49:32'),
(47,1,NULL,0,1,'attiva','COMUNE DI PIZZOLI','80007080668','80007080668','329-4523278 Alessia Salvatori Pizzoli\r\r','2025-04-23 11:18:00','2025-04-23 11:18:01'),
(48,1,NULL,0,1,'attiva','COMUNE DI SAN VITO CHIETINO','00094240694',NULL,'Comune di San Vito Chietino\rLargo Altobelli, 1 - 66038 San Vito Chietino\rTel. 0872.61911 - Fax 0872.619150\re-mail: info@comunesanvitochietino.gov.it - pec: protocollosanvitochietino@pec.it\rP. I.V.A. 00094240694\r\rUFB9OX.\r\r','2025-04-23 11:19:25','2025-04-23 11:19:26'),
(49,1,NULL,0,1,'attiva','TIPOGRAFIA S. GIUSEPPE SRL','00082440439',NULL,'STEFANO 3470751321\r\rIBAN aggiornato il 27/2/2019','2025-04-23 11:20:26','2025-04-23 11:20:27'),
(50,1,NULL,0,1,'attiva','COMUNE DI OPI ','00181620667','00181620667',NULL,'2025-04-23 11:21:07','2025-04-23 11:21:08'),
(51,1,NULL,0,1,'attiva','COMUNE DI PESCINA','00215570664',NULL,'COMUNE DI PESCINA (AQ) Piazza Mazzarino - 67057 Pescina ( AQ)  Tel  0863-84281 - Fax 0863-841067 ','2025-04-23 11:22:04','2025-04-23 11:22:16'),
(52,1,NULL,0,1,'attiva','COMUNE DI ACQUASANTA TERME','00356080440',NULL,'Serena 0736/80162 interno 416 3342203224','2025-04-23 11:24:24','2025-04-23 11:24:25'),
(53,1,NULL,0,1,'attiva','COMUNE DI CASTEL DEL MONTE\r','00114540669','80002030668','nanni','2025-04-23 11:25:29','2025-04-23 11:25:30'),
(54,1,NULL,0,1,'attiva','COMUNE DI MORRO D’ALBA \r\r','00184460426','00184460426','Comune di Morro d\'Alba\rPiazza Romagnoli, 6 - 60030\rPEC comune.morrodalba@legalmail.it\r\r\r0731/63000 int.6 mancinelli marta','2025-04-23 11:26:26','2025-05-08 12:49:38'),
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
(67,1,NULL,0,1,'attiva','COMUNE DI CASTIGNANO ','00358540441','00358540441','Comune di Castignano - SITO ISTITUZIONALE\rVia Margherita, 25 | 63072 Castignano (AP)\rtel: 0736 822128/821432| fax: 0736 822086 \rP.iva: 00358540441  |  Cod.fisc.: 00358540441\rUF21RT\r\r\rVecchia email:\rValloraghi.roberta@comune.castignano.ap.it','2025-04-23 11:56:57','2025-04-23 11:56:58'),
(68,1,NULL,0,1,'attiva','COMUNE DI ORTONA DEI MARSI','00224020669',NULL,NULL,'2025-04-23 11:57:33','2025-04-23 11:57:34'),
(69,1,NULL,0,1,'attiva','COMUNE DI SIROLO','00349870428','00268450426','RICHIESTA TELEFONICA  PREVENTIVO DEL 22/07/2016 \r\rroberta.draghelli@comune.sirolo.an.it\r\rla partita iva 00349870428\r\rcodice fiscale 00268450426','2025-04-23 11:58:30','2025-04-23 11:58:31'),
(70,1,NULL,0,1,'attiva','COMUNE DI BISEGNA','00213000664',NULL,'Via Vittorio Emanuele, 67050 Bisegna AQ\rTelefono: 0863 85283\r\r','2025-04-23 11:59:28','2025-04-23 11:59:29'),
(71,1,NULL,0,1,'attiva','COMUNE DI MORRO REATINO','00108310574',NULL,'email segretario matteocci.segretariocomunale@gmail.com','2025-04-23 12:00:35','2025-04-23 12:00:53'),
(72,1,NULL,0,1,'attiva','COMUNE DI MONTEGALLO','00357070440',NULL,'Comune di Montegallo - SITO ISTITUZIONALE\rFrazione Balzo Piazza Taliani, 5 | 63094 Montegallo (AP)\rTel: (+39) 0736-806122\r\rresponsabile tributi Petrocchi Romea 0736806122','2025-04-23 12:01:30','2025-04-23 12:01:48'),
(73,1,NULL,0,1,'attiva','COMUNE DI PIANELLA ','00225910686',NULL,'Comune di Pianella \r Piazza G. Garibaldi, 13 \r 65019 Pianella (Pe) \r Posta elettronica certificata: protocollo@pec.comune.pianella.pe.it \r	Centralino: +39.085.97301 \r P. IVA 00225910686 \r\rLORENA GIANSANTE 3299813487','2025-04-23 12:02:10','2025-04-23 12:02:11'),
(74,1,NULL,0,1,'attiva','COMUNE DI OFENA ','00630840668',NULL,NULL,'2025-04-23 12:03:06','2025-04-23 12:03:07'),
(75,1,NULL,0,1,'attiva','COMUNE DI CARASSAI ','00730930443','82001930443','Cliente di sinergie Mara \r\r\r329/6217105 Giovanni SASSU ','2025-04-23 12:04:08','2025-04-23 12:04:09'),
(76,1,NULL,0,1,'attiva','COMUNE DI MONTEMONACO','00357080449',NULL,'Comune di Montemonaco\rPiazza Risorgimento 8\r63088 Montemonaco AP','2025-04-23 12:05:07','2025-04-23 12:05:08'),
(77,1,NULL,0,1,'attiva','COMUNE DI SANT’OMERO','00523850675','00523850675','Comune di Sant\'Omero\r(Provincia di Teramo)\rVia Vittorio Veneto - 64027 Sant\'Omero (Teramo)\rCentralino 0861/88.098\rFax 0861/88.555\rurp@comune.santomero.te.it\r\rSINDACO ANDREA LUZI 3204863431\r','2025-04-23 12:08:19','2025-05-08 12:49:55'),
(78,1,NULL,0,1,'attiva','AIRONE SERVIZI S.R.L.','02623230121','02623230121','Airone Servizi srl\rVia Groane 42/A\r20812 Limbiate\rC.F. e P.IVA 02623230121\rCodice destinatario KRRH6B9\r\rUnicredit IBAN: IT95G02008332610000027770101 -> errato 28 caratteri\r\r\r\r\r','2025-04-23 12:11:29','2025-04-23 12:11:47'),
(79,1,NULL,0,1,'attiva','COMUNE DI MONTEFIORE DELL’ASO','00291360444','00291360444',NULL,'2025-04-23 12:12:16','2025-05-08 12:50:00'),
(80,1,NULL,0,1,'attiva','COMUNE DI MONTEFORTINO','00400660445',NULL,'CLIENTE SINERGIE MANAGEMENT TEAM sas di C. GABRIELLI & C.','2025-04-23 12:13:19','2025-04-23 12:13:20'),
(81,1,NULL,0,1,'attiva','COMUNE DI SCOPPITO\r','00183860667',NULL,NULL,'2025-04-23 12:14:36','2025-04-23 12:14:37'),
(82,1,NULL,0,1,'attiva','COMUNE DI LAZZATE','00758650964','03611240155',NULL,'2025-04-23 12:15:12','2025-04-23 12:15:13'),
(83,1,NULL,0,1,'attiva','CISIA PROGETTI - SOCIETA’ A RESPONSABILITA’ LIMITATA','00566000675',NULL,'ROMANO MARINO CISIA 3492638177\rr.marini@cisiaprogetti.it\rAREA FTP CONSEGNA DATI DATA ENTRY:\r\rM\rusername: cisiaprogetti\rPw:            f6de6a776e0\r','2025-04-23 12:16:38','2025-07-31 18:25:54'),
(84,1,NULL,0,1,'attiva','COMUNE DI CAMPLI',NULL,'80005970670','Comune di Campli\rVia V. Emanuele II 9\r64012 Campli TE','2025-04-23 12:17:47','2025-04-23 12:17:48'),
(85,1,NULL,0,1,'attiva','COMUNE DI CAMPO DI GIOVE','00189320666','92018480669','Comune Campo di Giove\rPiazza Regina Margherita, 6 - 67030 CAMPO DI GIOVE (AQ) IT\rTel:+39 086440116 - Fax:+39 0864 408040 - C.F.92018480669 - P.IVA 00189320666\rPEC: comune.campodigiove.aq@pec.comn\r\r\rdott.ssa Maria Verna ufficio tributi 0864.40116 - Int. 6 - 7','2025-04-23 12:19:12','2025-04-23 12:19:13'),
(86,1,NULL,0,1,'attiva','COMUNE DI CASTELLALTO','00267060671','80004770675',NULL,'2025-04-23 12:20:12','2025-04-23 12:20:13'),
(87,1,NULL,0,1,'attiva','COMUNE DI CERIANO LAGHETTO','01617320153',NULL,NULL,'2025-04-23 12:21:04','2025-04-23 12:21:05'),
(88,1,NULL,0,1,'attiva','COMUNE DI CISTERNINO ','02152680746',NULL,NULL,'2025-04-23 12:21:55','2025-04-23 12:21:56'),
(89,1,NULL,0,1,'attiva','COMUNE DI CIVITELLA DEL TRONTO','00467160677',NULL,'COMUNE DI CIVITELLA DEL TRONTO\rDott.ssa Marina Bozzelli\rArea Ragioneria e Tributi\rUfficio Tributi\rVia Mazzini,34\r64010 CIVITELLA DEL TRONTO (TE)\rTel 0861 918321 \r','2025-04-23 12:22:47','2025-04-23 12:22:48'),
(90,1,NULL,0,1,'attiva',' COMUNE DI COPERTINO ','02255920759','80008830756','Cod. Fiscale 80008830756 P.Iva 02255920759. Indirizzo Comune di Copertino – Area AA.GG. e Fin. Settore finanziario – Via Malta 10 – 73043 Copertino \rIL DIRIGENTE AREA AA.GG. E FIN.\rDR. ALESSANDRO CAGGIULA  \r','2025-04-23 12:24:28','2025-04-23 12:24:29'),
(91,1,NULL,0,1,'attiva','COMUNE DI COREGLIA ANTELMINELLI','00357880467',NULL,'Piazza Antelminelli, 8\r 55025 – Coreglia Antelminelli – LU\rTelefono:  +39 0583 78152\r Fax:  +39 0583 78419\r\rCellulare Reperibilità:  335 215573\rragioneria 058378344\r','2025-04-23 12:25:47','2025-04-23 12:26:05'),
(92,1,NULL,0,1,'attiva','COMUNE DI FALERONE ','81001750447','81001750447','Comune di Falerone\rPiazza della Concordia 6\r63837 Falerone FM\r0734 719813','2025-04-23 12:26:24','2025-04-23 12:26:41'),
(93,1,NULL,0,1,'attiva','COMUNE DI FOLIGNANO',NULL,NULL,NULL,'2025-04-23 12:26:52','2025-04-23 12:26:53'),
(94,1,NULL,0,1,'attiva','COMUNE DI JESI','00135880425',NULL,'DOTTORESSA  PAOLA PICCIONE 0731/538441','2025-04-23 12:28:20','2025-04-23 12:28:38'),
(95,1,NULL,0,1,'attiva','COMUNE DI LORETO APRUTINO','00127900686','00127900686','Via Roma, 1\rLoreto Aprutino Pescara\r085 829401','2025-04-23 12:28:58','2025-04-23 12:28:59'),
(96,1,NULL,0,1,'attiva','COMUNE DI MONSAMPOLO DEL TRONTO','00395630445','82000530442','Rag. Stefano Giostra\rResponsabile del Procedimento\rTributi-Ced-Personale\rComune di Monsampolo del Tronto\rCorso Vittorio Emanuele III, 87 - 63077\rTel.: (+39) 0735-704116/704218 int. 6\rFax: (+39) 0735-706004\re-mail: tributi@comune.monsampolodeltronto.ap.it\r           ced@comune.monsampolodeltronto.ap.it\rPEC: comune.monsampolodeltronto@pec.it\r','2025-04-23 12:30:17','2025-04-23 12:30:18'),
(97,1,NULL,0,1,'attiva','COMUNE DI MONTESILVANO',NULL,'00193460680','Piazza Diaz, 1 - 65016 Montesilvano (PE) Telefono: +39.085.44811 - Fax: +39.085.834408 - Cod. Fisc 00193460680\r\rDi Adamo\r\r347 5200765\r\rSig. Lancianese','2025-04-23 12:31:46','2025-04-23 12:31:47'),
(98,1,NULL,0,1,'attiva','COMUNE DI MONTORIO AL VOMANO','00580460673',NULL,NULL,'2025-04-23 12:32:57','2025-04-23 12:32:58'),
(99,1,NULL,0,1,'attiva','COMUNE DI MORRO D’ORO','00516370673','81000370676',NULL,'2025-04-23 12:33:40','2025-05-08 12:50:35'),
(100,1,NULL,0,1,'attiva','COMUNE DI PORTO RECANATI','00255040438','00255040438','Comune di Porto Recanati\rpiazza Del Borgo, 12Porto\rRecanati - 62017 (62017) Marche\r\rCITTA’ DI PORTO  RECANATI\rProvincia di Macerata\rc.f. e IVA 00255040438  - UFFICIO ECONOMATO\rtel. 071/7599736-5 fax 071/7599739\rmail : economato@comune.porto-recanati.mc.it\rALLEGATO A –','2025-04-23 12:34:21','2025-04-23 12:34:22'),
(101,1,NULL,0,1,'attiva','COMUNE DI  PORTO SAN GIORGIO','00358090447','81001530443','Comune di. Porto San Giorgio via Veneto, 5; cap:63822 tel: O734 6801, fax: O734 680234 C.F. 81001530443 - P.IVA 00358090447\r\rofferta MEPA aggiudicata il 04/09/2015 prezzo € 0,1745\rspese di spedizione a parte\rpeso entro i  20 gr.\rCONTATTI:\rDott. mercuri  (maurizio.mercuri@comune-psg.org)\rDott.ssa Bracalente Caterina (0734 680252) caterina.bracalente@comune-psg.org\r\rFABIO ANDRENACCI 0734/680210','2025-04-23 12:35:33','2025-04-23 12:35:34'),
(102,1,NULL,0,1,'attiva','COMUNE DI SAN SALVO ','00247720691','00247720691','Dott.ssa Francesca Ciccotosto   Ufficio Tributi   tel. 0873/340227\r\r \r\r\r','2025-04-23 12:36:38','2025-04-23 12:36:56'),
(103,1,NULL,0,1,'attiva','COMUNE DI SANTI COSMA E DAMIANO','02186110595','81003550597',NULL,'2025-04-23 12:37:10','2025-04-23 12:37:11'),
(104,1,NULL,0,1,'attiva','COMUNE DI SCERNI','00236730693',NULL,'Comune di Scerni                                                                                                \rVia IV Novembre 18  66020 Scerni CH \rPIVA 00236730693  \r0873919125 pec protocollo@comunediscerni.legalmail.it\rCodice univoco UFMBAN\rReferente Tributi Raimondo Cianci tributi@comunediscerni.com\r\r  \r ','2025-04-23 12:38:00','2025-04-23 12:38:01'),
(105,1,NULL,0,1,'attiva','COMUNE DI SELLIA MARINA','00360710792','00360710792','COMUNE DI SELLIA MARINA\rP.IVA: 00360710792\rIndirizzo: Via Acqua Delle Mandrie SELLIA MARINA (CZ)','2025-04-23 12:39:12','2025-04-23 12:39:13'),
(106,1,NULL,0,1,'attiva','COMUNE DI TOSSICIA','00235690674','80000370678','Dott.ssa Gabriella Zuccarini\rResp. Ufficio Finanziario\r____________________________________\rCOMUNE DI TOSSICIA\rProvincia di Teramo\rServizio Finanziario\re-mail  P.E.C.: finanziario@comunetossicia.gov.it\rC. da Piana dell’Addolorata – 64049 Tossicia\rTel. 0861-698014 – fax 0861-698170\rC.F. 80000370678 – P.I. 00235690674\r\r','2025-04-23 12:39:48','2025-04-23 12:39:49'),
(107,1,NULL,0,1,'attiva','COMUNE DI COLLI DEL TRONTO - UFFICIO TECNICO COMUNALE','00355250440','00355250440',NULL,'2025-04-23 12:40:43','2025-04-23 12:40:44'),
(108,1,NULL,0,1,'attiva','COMUNE DI CORROPOLI','00425220670',NULL,' ass.llpp@comunedicorropoli.it\r\rALESSIA LUPI 3890631681\rRAGIONERIA 0861806526\rPIERLUIIGI 3403425204\r\r\rprotocollo@comunecorropoli.it\rAREATECNICA@COMUNECORROPOLI.IT; ASS.LLPP@COMUNECORROPOLI.IT','2025-04-23 12:42:16','2025-04-23 12:42:17'),
(109,1,NULL,0,1,'attiva','COMUNE DI SENIGALLIA ','00332510429','00332510429',NULL,'2025-04-23 12:43:46','2025-04-23 12:44:04'),
(110,1,NULL,0,1,'attiva','COMUNE DI CROGNALETO','00164870677',NULL,NULL,'2025-04-23 12:44:42','2025-04-23 12:45:00'),
(111,1,NULL,0,1,'attiva','COMUNE DI CUPELLO','83000250692','83000250692','Comune di Cupello\rCorso Mazzini 1\r66051 Cupello CH\r\r','2025-04-23 12:45:09','2025-04-23 12:45:27'),
(112,1,NULL,0,1,'attiva','COMUNE DI LIVORNO FERRARIS','00403150022','84500230028',NULL,'2025-04-23 12:48:22','2025-04-23 12:48:23'),
(113,1,NULL,0,1,'attiva','COMUNE DI MINERBIO','00530291202',NULL,'Indirizzo: Via G. Garibaldi, 44, 40061 Minerbio BO\rOrari: Chiuso ora \rTelefono: 051 661 1711\rProvincia: Provincia di Bologna','2025-04-23 12:49:09','2025-04-23 12:49:10'),
(114,1,NULL,0,1,'attiva','COMUNE DI NERETO','00422080671',NULL,'Sindaco DANIELE LAURENZI   tel. 0861 806929 - 331 2469853 - 340 1569222\r\r\r\r347/4165423 Simona Di Francesco \r\r','2025-04-23 12:52:09','2025-04-23 12:52:10'),
(115,1,NULL,0,1,'attiva','COMUNE DI RIPATRANSONE ','00370910440',NULL,'Giovanni 3296217105\r\r','2025-04-23 12:52:52','2025-04-23 12:52:53'),
(116,1,NULL,0,1,'attiva','COMUNE ROCCA DI BOTTE ','00181800665','00181800665','Via delle Scuole, 2\rCAP	67066\rTelefono	0863-998131\rFax	0863-998017\rDati Amministrazione\rCodice Fiscale	00181800665','2025-04-23 12:53:30','2025-04-23 12:53:31'),
(117,1,NULL,0,1,'attiva','FARAONE S.R.L.\r','00321830671','00321830671','Federico\rVARIAZIONE IBAN\r\r	Vi informiamo che a partire dal giorno 16 maggio 2016 a seguito di integrazione di Banca Dell\'Adriatico in Intesa Sanpaolo il codice IBAN del nostro conto corrente bancario attuale sarà sostituito da nuovo IBAN come di seguito descritto:\r\r	BANCA INTESA SAN PAOLO SPA - F.LE DI ALBA ADRIATICA\r	IBAN: IT75 L030 6976 7210 2638 5060 157\r	BIC: BCITITMM\r\rInvitiamo di prendere buona nota di quanto sopra.\r\rDistinti saluti\r\r\r\rFARAONE SRL\r      (UFFICIO AMMINISTRATIVO)\r','2025-04-23 12:56:11','2025-04-23 12:56:12'),
(118,1,NULL,0,1,'attiva','GRAFICHE MARTINTYPE SRL','01630960670',NULL,'contab.for@martintype.it','2025-04-23 12:57:47','2025-04-23 12:58:05'),
(119,1,NULL,0,1,'attiva','GRAFICHE TACCONI SRL','01746580446',NULL,'GRAFICHE TACCONI SRL\rVIA 328/ma, 2-4\r63100 ASCOLI PICENO\rP.I. 01746580446\r','2025-04-23 12:58:33','2025-04-23 12:58:34'),
(120,1,NULL,0,1,'attiva','ITALRISCOSSIONI SOCIETA’ ITALI ANA DI FISCALITA’ LOCALE - SOC','06092371001','06092371001','347/6509828 DAVIDE ','2025-04-23 12:59:49','2025-05-08 12:50:15'),
(121,1,NULL,0,1,'attiva','UNIONE DI COMUNI CITTA’ DELLA FRENTANIA E COSTA DEI TRABOCCHI',NULL,'90019350694',NULL,'2025-04-23 13:01:45','2025-05-08 12:50:20'),
(122,1,NULL,0,1,'attiva','COMUNITA COLLINARE MONFERRATO VALLE VERSA','01329430050',NULL,'Dott.a daniela valfre\rUfficio Tributi\rComunità Collinare Monferrato Valle Versa\rPiazza Lanfranco, 1\r14039 Tonco (AT)\r\rwww.valleversa-monferrato.at.it\r\rEmail: tributi@valleversa-monferrato.at.it \rPEC: protocollo.valleversa@cert.ruparpiemonte.it\r\rtel: +39.0141.991510\rfax: +39.0141.991763\r','2025-04-23 13:02:32','2025-04-23 13:02:33'),
(123,1,NULL,0,1,'attiva','VAL VIBRATA COLLEGE FONDAZIONE','01593730672',NULL,'MAILING  x apertura nuovo anno solitamente in Ottobre/NOVEMBRE','2025-04-23 13:02:59','2025-04-23 13:03:00'),
(124,1,NULL,0,1,'attiva','VESTINA GAS E LUCE S.P.A','01671550687',NULL,'Cliente collegato alla Ditta Gargini Giuseppe Emmeci software\rAmministrazione Vestina <amministrazione@vestinagaseluce.it>\rinfo@vestinagaseluce.itCV\r\rBeatrice   Cesarano 349-2622836 \'beatrice.cesarano@augustaratio.it\'\rRenato Redentore 328 9157157\rrenato.redentore@augustaratio.it\rluigi panaioli ufficiogiulianova@vestinagaseluce.it\r\rMarco Allevi 085.8003554     3285625186 marco.allevi@augustaratio.it\r','2025-04-23 13:04:45','2025-04-23 13:04:46'),
(125,1,NULL,0,1,'attiva','NIBA DI BARRA ANTONIO & C. SAS','01206370445',NULL,NULL,'2025-04-23 13:06:02','2025-04-23 13:06:03'),
(126,1,NULL,0,1,'attiva','COMUNE DI GUARDIAGRELE','00239980691','00239980691','Tutte le stampe f/r b/n e dove necessario 3 F24, mentre devi prevedere la cartolina AR per le raccomandate.\rTari minimo 8000pz x 2 o 3 /y (prima uscita marzo 2016)\rIMU minimo 6000pz x 2/y (giu e nov 2016)\rTOSAP minimo 2000pz x 3/y (mar - giu e nov 2016)\rRaccomandate AR minimo 4000pz\rDimmi se hai bisogno d’altro e … mi raccomando\rcomune.guardiagrele@pec.it\r\rIntestala \rCOMUNE DI GUARDIAGRELE \rPiazza San Francesco 12 66016 Guardiagrele CH\rAlla C.A.\rGent.ma Assessore Dr.ssa Marilena Primavera\rEgr. Vice Sindaco Dr. Gianluca Primavera\r','2025-04-23 13:07:21','2025-04-23 13:07:22'),
(127,1,NULL,0,1,'attiva','COMUNE DI DIAMANTE ','00362420788','00362420788',NULL,'2025-04-23 13:08:06','2025-04-23 13:08:07'),
(132,1,NULL,0,1,'attiva','6062 LAB SRL','02138900671',NULL,NULL,'2025-05-06 11:11:47','2025-05-06 11:11:48'),
(133,1,NULL,0,1,'attiva','COMUNE DI ALBA ADRIATICA ','00285510673','00285510673','CIMINI 0861 719230','2025-05-07 09:15:01','2025-05-07 09:15:02'),
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
(1618,1,0,'2025-10-08 14:27:24'),
(1619,1,0,'2025-10-08 14:31:53'),
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_ddt`
--

LOCK TABLES `tb_ddt` WRITE;
/*!40000 ALTER TABLE `tb_ddt` DISABLE KEYS */;
INSERT INTO `tb_ddt` VALUES
(14,NULL,137,2025,1,'2025-11-27',1,NULL,1,2,1,10.000,'Documento generato dal preventivo 1/2025.',NULL,'pacchi',1,'mittente',NULL,NULL,'2025-11-27 10:34:39','2025-11-27 10:35:40');
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
) ENGINE=InnoDB AUTO_INCREMENT=189 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_ddt_righe`
--

LOCK TABLES `tb_ddt_righe` WRITE;
/*!40000 ALTER TABLE `tb_ddt_righe` DISABLE KEYS */;
INSERT INTO `tb_ddt_righe` VALUES
(188,14,NULL,'prova ddt',1.000,10.000,10.000,'1',NULL,1);
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture`
--

LOCK TABLES `tb_fatture` WRITE;
/*!40000 ALTER TABLE `tb_fatture` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture_righe`
--

LOCK TABLES `tb_fatture_righe` WRITE;
/*!40000 ALTER TABLE `tb_fatture_righe` DISABLE KEYS */;
INSERT INTO `tb_fatture_righe` VALUES
(143,12,37,'Attivazione Servizio Giano',1.000,22.00,150.0000,0.00,150.00,33.00,NULL,183.00,1),
(144,12,8,'Rendicontazione - Rendicontazione Postale: Posta Certificata',1.000,22.00,0.6000,0.00,0.60,0.13,NULL,0.73,2);
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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_fatture_status_log`
--

LOCK TABLES `tb_fatture_status_log` WRITE;
/*!40000 ALTER TABLE `tb_fatture_status_log` DISABLE KEYS */;
INSERT INTO `tb_fatture_status_log` VALUES
(1,9,7,1,'Parzialmente Pagata','Bozza',NULL,'ip:84.33.111.245','2025-11-25 15:12:00'),
(2,9,1,2,'Bozza','Emessa',NULL,'ip:84.33.111.245','2025-11-25 15:12:17'),
(3,9,2,3,'Emessa','Inviata',NULL,'ip:84.33.111.245','2025-11-25 15:12:21'),
(4,9,4,3,'Pagata','Inviata',NULL,'mediaprint.it','2025-11-25 16:19:34'),
(5,9,3,4,'Inviata','Pagata',NULL,'Sistema pagamenti','2025-11-25 16:25:55'),
(6,9,4,7,'Pagata','Parzialmente Pagata',NULL,'Sistema pagamenti','2025-11-25 16:48:20'),
(7,9,7,3,'Parzialmente Pagata','Inviata',NULL,'mediaprint.it','2025-11-25 16:48:53'),
(8,10,2,4,'Emessa','Pagata',NULL,'Sistema pagamenti','2025-11-26 17:05:25'),
(9,12,1,4,'Bozza','Pagata',NULL,'Sistema pagamenti','2025-11-27 10:50:07'),
(10,12,4,7,'Pagata','Parzialmente Pagata',NULL,'mediaprint.it','2025-11-27 10:55:54'),
(11,12,7,5,'Parzialmente Pagata','Scaduta',NULL,'mediaprint.it','2025-11-27 10:55:58'),
(12,12,5,6,'Scaduta','Stornata',NULL,'mediaprint.it','2025-11-27 10:56:02'),
(13,12,6,2,'Rifiutata','Emessa',NULL,'mediaprint.it','2025-11-27 10:58:22'),
(14,12,2,3,'Emessa','Inviata',NULL,'mediaprint.it','2025-11-27 10:58:32');
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
  UNIQUE KEY `uq_lavorazioni_prev` (`id_preventivo`),
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni`
--

LOCK TABLES `tb_lavorazioni` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_attivita`
--

LOCK TABLES `tb_lavorazioni_attivita` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_attivita_report`
--

DROP TABLE IF EXISTS `tb_lavorazioni_attivita_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_attivita_report` (
  `id_report` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_attivita` bigint(20) unsigned NOT NULL,
  `data_avvio` datetime DEFAULT NULL,
  `data_fine` datetime DEFAULT NULL,
  `id_operatore` bigint(20) unsigned DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_report`),
  UNIQUE KEY `uq_attivita_report` (`id_attivita`),
  KEY `idx_report_operatore` (`id_operatore`),
  CONSTRAINT `fk_report_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE CASCADE,
  CONSTRAINT `fk_report_operatore` FOREIGN KEY (`id_operatore`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_attivita_report`
--

LOCK TABLES `tb_lavorazioni_attivita_report` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita_report` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita_report` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_attivita_allegati`
--

DROP TABLE IF EXISTS `tb_lavorazioni_attivita_allegati`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_attivita_allegati` (
  `id_allegato` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_attivita` bigint(20) unsigned NOT NULL,
  `nome_file` varchar(255) NOT NULL,
  `path_file` varchar(512) NOT NULL,
  `mime_type` varchar(128) DEFAULT NULL,
  `size_bytes` bigint(20) unsigned DEFAULT NULL,
  `uploaded_by` bigint(20) unsigned DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_allegato`),
  KEY `idx_attivita_allegati_attivita` (`id_attivita`),
  KEY `fk_attivita_allegati_account` (`uploaded_by`),
  CONSTRAINT `fk_attivita_allegati_account` FOREIGN KEY (`uploaded_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_attivita_allegati_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_attivita_allegati`
--

LOCK TABLES `tb_lavorazioni_attivita_allegati` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita_allegati` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita_allegati` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_attivita_operatori`
--

DROP TABLE IF EXISTS `tb_lavorazioni_attivita_operatori`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_attivita_operatori` (
  `id_associazione` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_attivita` bigint(20) unsigned NOT NULL,
  `id_account` bigint(20) unsigned NOT NULL,
  `ruolo` enum('owner','collaboratore') NOT NULL DEFAULT 'owner',
  `assegnata_il` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_associazione`),
  UNIQUE KEY `uq_attivita_operatore` (`id_attivita`,`id_account`),
  KEY `idx_attivita_operatore_account` (`id_account`),
  CONSTRAINT `fk_attivita_operatore_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_attivita_operatore_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_attivita_operatori`
--

LOCK TABLES `tb_lavorazioni_attivita_operatori` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita_operatori` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_attivita_operatori` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_eventi`
--

DROP TABLE IF EXISTS `tb_lavorazioni_eventi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_eventi` (
  `id_evento` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_lavorazione` int(10) unsigned NOT NULL,
  `id_attivita` bigint(20) unsigned DEFAULT NULL,
  `evento` varchar(128) NOT NULL,
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_evento`),
  KEY `idx_eventi_lavorazione` (`id_lavorazione`),
  KEY `idx_eventi_attivita` (`id_attivita`),
  KEY `fk_eventi_account` (`created_by`),
  CONSTRAINT `fk_eventi_account` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_eventi_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE SET NULL,
  CONSTRAINT `fk_eventi_lavorazione` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_eventi`
--

LOCK TABLES `tb_lavorazioni_eventi` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_eventi` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_eventi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_notifiche`
--

DROP TABLE IF EXISTS `tb_lavorazioni_notifiche`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_notifiche` (
  `id_notifica` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_lavorazione` int(10) unsigned DEFAULT NULL,
  `id_attivita` bigint(20) unsigned DEFAULT NULL,
  `id_account` bigint(20) unsigned NOT NULL,
  `tipo` enum('email','dashboard') NOT NULL DEFAULT 'dashboard',
  `titolo` varchar(191) DEFAULT NULL,
  `messaggio` text DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `stato` enum('pending','queued','sent','failed','read') NOT NULL DEFAULT 'pending',
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id_notifica`),
  KEY `idx_notifiche_account` (`id_account`),
  KEY `idx_notifiche_stato` (`stato`),
  KEY `fk_notifiche_lavorazione` (`id_lavorazione`),
  KEY `fk_notifiche_attivita` (`id_attivita`),
  KEY `fk_notifiche_created_by` (`created_by`),
  CONSTRAINT `fk_notifiche_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifiche_attivita` FOREIGN KEY (`id_attivita`) REFERENCES `tb_lavorazioni_attivita` (`id_attivita`) ON DELETE SET NULL,
  CONSTRAINT `fk_notifiche_lavorazione` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifiche_created_by` FOREIGN KEY (`created_by`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_notifiche`
--

LOCK TABLES `tb_lavorazioni_notifiche` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_notifiche` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_notifiche` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_operatori`
--

DROP TABLE IF EXISTS `tb_lavorazioni_operatori`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_operatori` (
  `id_associazione` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_lavorazione` int(10) unsigned NOT NULL,
  `id_account` bigint(20) unsigned NOT NULL,
  `ruolo` enum('owner','collaboratore') NOT NULL DEFAULT 'owner',
  `assegnata_il` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_associazione`),
  UNIQUE KEY `uq_lavorazione_operatore` (`id_lavorazione`,`id_account`),
  KEY `idx_lavorazione_operatore_account` (`id_account`),
  CONSTRAINT `fk_lavorazione_operatore_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE CASCADE,
  CONSTRAINT `fk_lavorazione_operatore_job` FOREIGN KEY (`id_lavorazione`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_operatori`
--

LOCK TABLES `tb_lavorazioni_operatori` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_operatori` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_operatori` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_lavorazioni_report_export`
--

DROP TABLE IF EXISTS `tb_lavorazioni_report_export`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_lavorazioni_report_export` (
  `id_export` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `formato` enum('pdf','xlsx') NOT NULL,
  `filtro_periodo_da` date DEFAULT NULL,
  `filtro_periodo_a` date DEFAULT NULL,
  `filtro_id_anagrafica` int(10) unsigned DEFAULT NULL,
  `filtro_stato_lavorazione` varchar(32) DEFAULT NULL,
  `filtro_reparto` smallint(5) unsigned DEFAULT NULL,
  `rows_count` int(10) unsigned NOT NULL DEFAULT 0,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(512) DEFAULT NULL,
  `id_account` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_export`),
  KEY `idx_report_account` (`id_account`),
  KEY `fk_report_reparto` (`filtro_reparto`),
  CONSTRAINT `fk_report_account` FOREIGN KEY (`id_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_report_reparto` FOREIGN KEY (`filtro_reparto`) REFERENCES `cfg_reparti_produttivi` (`id_reparto`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_lavorazioni_report_export`
--

LOCK TABLES `tb_lavorazioni_report_export` WRITE;
/*!40000 ALTER TABLE `tb_lavorazioni_report_export` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_lavorazioni_report_export` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Table structure for table `tb_pacchetti`
--

DROP TABLE IF EXISTS `tb_pacchetti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_pacchetti` (
  `id_pacchetto` int(11) NOT NULL AUTO_INCREMENT,
  `codice` varchar(64) DEFAULT NULL,
  `nome` varchar(255) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `attivo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_pacchetto`),
  UNIQUE KEY `uq_tb_pacchetti_codice` (`codice`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_pacchetti`
--

LOCK TABLES `tb_pacchetti` WRITE;
/*!40000 ALTER TABLE `tb_pacchetti` DISABLE KEYS */;
INSERT INTO `tb_pacchetti` VALUES
(2,'PM<20 C-80','Posta Massiva fino a 20gr Carta 80gr',NULL,1,'2025-10-13 14:41:12','2025-11-26 16:15:26'),
(3,'COM-01','TARI',NULL,1,'2025-10-13 15:48:23','2025-10-13 15:54:10'),
(4,'AR<20','Raccomandate sotto i 20gr',NULL,1,'2025-11-25 14:29:02','2025-11-26 16:04:54'),
(5,'RP-01','Rendicontazione','Servizio giano di rendicontazione della corrispondenza',1,'2025-11-27 10:22:53','2025-11-27 10:22:53');
/*!40000 ALTER TABLE `tb_pacchetti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_pacchetti_righe`
--

DROP TABLE IF EXISTS `tb_pacchetti_righe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_pacchetti_righe` (
  `id_riga` int(11) NOT NULL AUTO_INCREMENT,
  `id_pacchetto` int(11) NOT NULL,
  `id_prodotto` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `categoria_nome` varchar(191) DEFAULT NULL,
  `descrizione` varchar(255) NOT NULL,
  `quantita` decimal(10,2) NOT NULL DEFAULT 1.00,
  `prezzo_unitario` decimal(12,4) NOT NULL DEFAULT 0.0000,
  `sconto` decimal(5,2) DEFAULT NULL,
  `iva` decimal(5,2) DEFAULT NULL,
  `id_sdi_natura_iva` int(11) DEFAULT NULL,
  `posizione` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_riga`),
  KEY `idx_pacchetti_righe_pacchetto` (`id_pacchetto`),
  KEY `idx_pacchetti_righe_posizione` (`posizione`),
  KEY `idx_pacchetti_righe_id_categoria` (`id_categoria`),
  CONSTRAINT `fk_pacchetti_righe_pacchetto` FOREIGN KEY (`id_pacchetto`) REFERENCES `tb_pacchetti` (`id_pacchetto`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_pacchetti_righe`
--

LOCK TABLES `tb_pacchetti_righe` WRITE;
/*!40000 ALTER TABLE `tb_pacchetti_righe` DISABLE KEYS */;
INSERT INTO `tb_pacchetti_righe` VALUES
(86,3,11,2,'Tariffe postali','Posta Massiva - Peso: Fino a 20 gr ; Altro: 3 ; Destinazione: AM',1.00,0.3400,0.00,0.00,1,1),
(87,3,11,2,'Tariffe postali','Posta Massiva - Peso: Fino a 20 gr ; Altro: 3 ; Destinazione: CP',1.00,0.5200,0.00,0.00,1,2),
(88,3,11,2,'Tariffe postali','Posta Massiva - Peso: Fino a 20 gr ; Altro: 3 ; Destinazione: EU',1.00,0.6500,0.00,0.00,1,3),
(89,3,11,2,'Tariffe postali','Posta Massiva - Peso: Oltre 20g fino a 50gr ; Tipo Spedizione: Omologato ; Destinazione: AM',1.00,0.6200,0.00,0.00,1,4),
(90,3,11,2,'Tariffe postali','Posta Massiva - Peso: Oltre 20g fino a 50gr ; Tipo Spedizione: Omologato ; Destinazione: CP',1.00,0.9200,0.00,0.00,1,5),
(91,3,11,2,'Tariffe postali','Posta Massiva - Peso: Oltre 20g fino a 50gr ; Tipo Spedizione: Omologato ; Destinazione: EU',1.00,1.2200,0.00,0.00,1,6),
(92,3,20,2,'Tariffe postali','Posta Mail Internationale - Peso: Fino a 20 gr ; Destinazione: EX Zona 1',1.00,1.3500,0.00,22.00,NULL,7),
(93,3,20,2,'Tariffe postali','Posta Mail Internationale - Peso: Fino a 20 gr ; Destinazione: EX Zona 2',1.00,2.5500,0.00,22.00,NULL,8),
(94,3,20,2,'Tariffe postali','Posta Mail Internationale - Peso: Fino a 20 gr ; Destinazione: EX Zona 3',1.00,3.3500,0.00,22.00,NULL,9),
(95,3,19,4,'Posta Ordinaria Cartacea','Posta Massiva',1.00,0.0000,0.00,22.00,NULL,10),
(115,4,12,2,'Tariffe postali','Raccomandata AR Smart - Peso: Fino a 20 gr ; Destinazione: AM',1.00,2.8100,0.00,22.00,NULL,1),
(116,4,12,2,'Tariffe postali','Raccomandata AR Smart - Peso: Fino a 20 gr ; Destinazione: CP',1.00,3.1800,0.00,22.00,NULL,2),
(117,4,12,2,'Tariffe postali','Raccomandata AR Smart - Peso: Fino a 20 gr ; Destinazione: EU',1.00,4.0300,0.00,22.00,NULL,3),
(118,4,14,2,'Tariffe postali','Raccomandata AR Internazionale - Peso: Fino a 20 gr ; Destinazione: EX Zona 1',1.00,7.6500,0.00,22.00,NULL,4),
(119,4,14,2,'Tariffe postali','Raccomandata AR Internazionale - Peso: Fino a 20 gr ; Destinazione: EX Zona 2',1.00,9.0500,0.00,22.00,NULL,5),
(120,4,14,2,'Tariffe postali','Raccomandata AR Internazionale - Peso: Fino a 20 gr ; Destinazione: EX Zona 3',1.00,9.7000,0.00,22.00,NULL,6),
(136,2,11,2,'Tariffe postali','Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: AM',1.00,0.3400,0.00,0.00,1,1),
(137,2,11,2,'Tariffe postali','Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: CP',1.00,0.5200,0.00,0.00,1,2),
(138,2,11,2,'Tariffe postali','Posta Massiva - Peso: Fino a 20 gr ; Tipo Spedizione: Omologato ; Destinazione: EU',1.00,0.6500,0.00,0.00,1,3),
(139,2,20,2,'Tariffe postali','Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 1',1.00,1.3500,0.00,0.00,1,4),
(140,2,20,2,'Tariffe postali','Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 2',1.00,2.5500,0.00,0.00,1,5),
(141,2,20,2,'Tariffe postali','Posta 4 (internazionale) - Peso: Fino a 20 gr ; Destinazione: EX Zona 3',1.00,3.3500,0.00,0.00,1,6),
(142,2,6,1,'GianoSystem.eu','Centro Elaborazione Dati - File Dati: PDF-Omologato',1.00,50.0000,0.00,22.00,NULL,7),
(143,2,6,1,'GianoSystem.eu','Centro Elaborazione Dati - File Dati: PDF-Non Omologato',1.00,150.0000,0.00,22.00,NULL,8),
(144,2,6,1,'GianoSystem.eu','Centro Elaborazione Dati - File Dati: Dati grezzi da elaborare',1.00,150.0000,0.00,22.00,NULL,9),
(145,5,37,1,'Servizi Giano System','Attivazione Servizio Giano',1.00,150.0000,0.00,22.00,NULL,1),
(146,5,8,1,'Servizi Giano System','Rendicontazione - Rendicontazione Postale: Posta Ordinaria',1.00,0.4500,0.00,22.00,NULL,2),
(147,5,8,1,'Servizi Giano System','Rendicontazione - Rendicontazione Postale: Posta Certificata',1.00,0.6000,0.00,22.00,NULL,3),
(148,5,8,1,'Servizi Giano System','Rendicontazione - Rendicontazione Postale: Posta Digitale',1.00,0.4000,0.00,22.00,NULL,4);
/*!40000 ALTER TABLE `tb_pacchetti_righe` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_pagamenti`
--

DROP TABLE IF EXISTS `tb_pagamenti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_pagamenti` (
  `id_pagamento` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `import_uid` varchar(64) NOT NULL,
  `reference` varchar(191) DEFAULT NULL,
  `data_pagamento` date NOT NULL,
  `importo_totale` decimal(12,2) NOT NULL,
  `importo_allocato` decimal(12,2) NOT NULL DEFAULT 0.00,
  `id_metodo` smallint(5) unsigned DEFAULT NULL,
  `id_mp` tinyint(3) unsigned NOT NULL,
  `note` text DEFAULT NULL,
  `id_anagrafica_hint` int(10) unsigned DEFAULT NULL,
  `cliente_nome_hint` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_pagamento`),
  UNIQUE KEY `uniq_tb_pagamenti_import_uid` (`import_uid`),
  KEY `idx_tb_pagamenti_id_mp` (`id_mp`),
  KEY `idx_tb_pagamenti_id_metodo` (`id_metodo`),
  KEY `idx_tb_pagamenti_cliente_hint` (`id_anagrafica_hint`),
  CONSTRAINT `fk_tb_pagamenti_cliente_hint` FOREIGN KEY (`id_anagrafica_hint`) REFERENCES `tb_anagrafiche` (`id_anagrafica`) ON DELETE SET NULL,
  CONSTRAINT `fk_tb_pagamenti_metodo` FOREIGN KEY (`id_metodo`) REFERENCES `cfg_metodi_pagamento` (`id_metodo`) ON DELETE SET NULL,
  CONSTRAINT `fk_tb_pagamenti_modalita` FOREIGN KEY (`id_mp`) REFERENCES `cfg_sdi_modalita_pagamento` (`id_modalita`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_pagamenti`
--

LOCK TABLES `tb_pagamenti` WRITE;
/*!40000 ALTER TABLE `tb_pagamenti` DISABLE KEYS */;
INSERT INTO `tb_pagamenti` VALUES
(3,'4a81d26f8b370bd9','BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA  SUOLO E SALUTE SRL PER  PAG. FT. N. 243 DEL 20 05 2025 COMM              0,00 SPESE              0,00 TRN 1001251564002485','2025-05-06',377.06,377.06,NULL,3,'Rif: BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA  SUOLO E SALUTE SRL PER  PAG. FT. N. 243 DEL 20 05 2025 COMM              0,00 SPESE              0,00 TRN 1001251564002485',NULL,NULL,'2025-11-25 13:58:59','2025-11-25 13:59:26'),
(4,'4f3069cb0000d796','BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA  COMUNE DI MACHERIO PER  CUP CIGB701B826E9 CODICE INTERNO 11 3575 TRN 1001251564037722','2025-05-06',2363.29,1848.51,NULL,3,'Rif: BONIFICO A VOSTRO FAVORE BONIFICO SEPA DA  COMUNE DI MACHERIO PER  CUP CIGB701B826E9 CODICE INTERNO 11 3575 TRN 1001251564037722',NULL,NULL,'2025-11-25 14:04:43','2025-11-27 10:52:56');
/*!40000 ALTER TABLE `tb_pagamenti` ENABLE KEYS */;
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
  `oggetto` varchar(255) DEFAULT NULL,
  `riferimento_cliente` varchar(255) DEFAULT NULL,
  `id_stato_prev` tinyint(3) unsigned NOT NULL,
  `totale_imponibile` decimal(12,2) DEFAULT NULL,
  `totale_sconto` decimal(12,2) DEFAULT NULL,
  `totale_iva` decimal(12,2) DEFAULT NULL,
  `totale` decimal(12,2) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `confermato_il` datetime DEFAULT NULL,
  `confermato_da_account` bigint(20) unsigned DEFAULT NULL,
  `id_lavorazione_corrente` int(10) unsigned DEFAULT NULL,
  `lavorazione_creata_il` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_preventivo`),
  UNIQUE KEY `uq_prev_numero` (`anno_preventivo`,`numero_documento`),
  KEY `idx_prev_anag` (`id_anagrafica`),
  KEY `idx_prev_data` (`data_preventivo`),
  KEY `fk_prev_stato` (`id_stato_prev`),
  KEY `fk_prev_serie` (`id_serie`),
  KEY `idx_prev_confermato_il` (`confermato_il`),
  KEY `idx_prev_lavorazione_corrente` (`id_lavorazione_corrente`),
  KEY `fk_prev_confermato_da` (`confermato_da_account`),
  CONSTRAINT `fk_prev_anag` FOREIGN KEY (`id_anagrafica`) REFERENCES `tb_anagrafiche` (`id_anagrafica`),
  CONSTRAINT `fk_prev_confermato_da` FOREIGN KEY (`confermato_da_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_prev_lavorazione_corrente` FOREIGN KEY (`id_lavorazione_corrente`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE SET NULL,
  CONSTRAINT `fk_prev_serie` FOREIGN KEY (`id_serie`) REFERENCES `cfg_serie_documenti` (`id_serie`) ON DELETE SET NULL,
  CONSTRAINT `fk_prev_stato` FOREIGN KEY (`id_stato_prev`) REFERENCES `cfg_stati_preventivo` (`id_stato`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi`
--

LOCK TABLES `tb_preventivi` WRITE;
/*!40000 ALTER TABLE `tb_preventivi` DISABLE KEYS */;
INSERT INTO `tb_preventivi` VALUES
(33,NULL,137,2025,1,'2025-11-27',NULL,'',3,150.60,0.00,44.00,183.73,'',NULL,NULL,NULL,NULL,'2025-11-27 10:10:25','2025-11-27 10:31:52');
/*!40000 ALTER TABLE `tb_preventivi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_revisioni`
--

DROP TABLE IF EXISTS `tb_preventivi_revisioni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_revisioni` (
  `id_revisione` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `numero_revision` int(10) unsigned NOT NULL,
  `label` varchar(32) NOT NULL,
  `note` text DEFAULT NULL,
  `operatore` varchar(255) DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_revisione`),
  KEY `idx_rev_preventivo` (`id_preventivo`),
  UNIQUE KEY `uniq_rev_prev_numero` (`id_preventivo`,`numero_revision`),
  CONSTRAINT `fk_rev_prev_preventivo` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `oggetto` varchar(255) DEFAULT NULL,
  `riferimento_cliente` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `confermato_il` datetime DEFAULT NULL,
  `confermato_da_account` bigint(20) unsigned DEFAULT NULL,
  `id_lavorazione_corrente` int(10) unsigned DEFAULT NULL,
  `lavorazione_creata_il` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_preventivo`),
  UNIQUE KEY `uq_prev_numero` (`anno_preventivo`,`numero_documento`),
  KEY `idx_prev_anag` (`id_anagrafica`),
  KEY `idx_prev_data` (`data_preventivo`),
  KEY `idx_prev_arch_confermato_il` (`confermato_il`),
  KEY `idx_prev_arch_lavorazione` (`id_lavorazione_corrente`),
  KEY `fk_prev_arch_confermato_da` (`confermato_da_account`),
  CONSTRAINT `fk_prev_arch_confermato_da` FOREIGN KEY (`confermato_da_account`) REFERENCES `auth_accounts` (`id_account`) ON DELETE SET NULL,
  CONSTRAINT `fk_prev_arch_lavorazione` FOREIGN KEY (`id_lavorazione_corrente`) REFERENCES `tb_lavorazioni` (`id_lavorazione`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_archive`
--

LOCK TABLES `tb_preventivi_archive` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_cig`
--

DROP TABLE IF EXISTS `tb_preventivi_cig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_cig` (
  `id_cig` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `cig` varchar(50) NOT NULL,
  `data_cig` date DEFAULT NULL,
  `motivazione` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_cig`),
  KEY `idx_prev_cig_prev` (`id_preventivo`),
  KEY `idx_prev_cig_code` (`cig`),
  CONSTRAINT `fk_prev_cig_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_cig`
--

LOCK TABLES `tb_preventivi_cig` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_cig` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi_cig` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_contatti`
--

DROP TABLE IF EXISTS `tb_preventivi_contatti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_contatti` (
  `id_preventivo_contatto` int(11) NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(11) NOT NULL,
  `id_contatto` int(11) DEFAULT NULL,
  `nome` varchar(255) NOT NULL,
  `ruolo` varchar(255) DEFAULT NULL,
  `telefono` varchar(64) DEFAULT NULL,
  `cellulare` varchar(64) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `origine` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_preventivo_contatto`),
  KEY `idx_preventivi_contatti_prev` (`id_preventivo`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_contatti`
--

LOCK TABLES `tb_preventivi_contatti` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_contatti` DISABLE KEYS */;
INSERT INTO `tb_preventivi_contatti` VALUES
(17,3,NULL,'alex','Tecnico','3487426325',NULL,'nexus.olivieri@gmail.com',NULL,'anagrafica','2025-11-19 16:30:27','2025-11-19 16:30:27'),
(20,10,NULL,'alex','Tecnico',NULL,NULL,'alex.o@mediaprint.it',NULL,'anagrafica','2025-11-20 15:52:08','2025-11-20 15:52:08'),
(21,10,NULL,'daria',NULL,NULL,NULL,'colli.d@mediaprint.it',NULL,'manuale','2025-11-20 15:52:08','2025-11-20 15:52:08'),
(23,11,NULL,'Alex Olivieri',NULL,'3487426325',NULL,'sistemi@mediaprint.it',NULL,'manuale','2025-11-21 16:28:41','2025-11-21 16:28:41'),
(24,13,NULL,'alex','Tecnico',NULL,NULL,'alex.o@mediaprint.it',NULL,'anagrafica','2025-11-26 10:37:04','2025-11-26 10:37:04'),
(26,32,NULL,'alex','Tecnico',NULL,NULL,'alex.o@mediaprint.it',NULL,'anagrafica','2025-11-27 09:55:35','2025-11-27 09:55:35'),
(27,33,NULL,'alex olivieri',NULL,'3487426325',NULL,'nexus.olivieri@gmail.com',NULL,'manuale','2025-11-27 10:24:09','2025-11-27 10:24:09');
/*!40000 ALTER TABLE `tb_preventivi_contatti` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_contatti_archive`
--

DROP TABLE IF EXISTS `tb_preventivi_contatti_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_contatti_archive` (
  `id_record` int(11) NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(11) NOT NULL,
  `id_contatto` int(11) DEFAULT NULL,
  `nome` varchar(255) NOT NULL,
  `ruolo` varchar(255) DEFAULT NULL,
  `telefono` varchar(64) DEFAULT NULL,
  `cellulare` varchar(64) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `origine` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_record`),
  KEY `idx_prev_contatti_arch_prev` (`id_preventivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_contatti_archive`
--

LOCK TABLES `tb_preventivi_contatti_archive` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_contatti_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi_contatti_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_determina`
--

DROP TABLE IF EXISTS `tb_preventivi_determina`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_determina` (
  `id_determina` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_preventivo` int(10) unsigned NOT NULL,
  `determina` varchar(100) NOT NULL,
  `data_determina` date DEFAULT NULL,
  `motivazione` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_determina`),
  KEY `idx_prev_det_prev` (`id_preventivo`),
  KEY `idx_prev_det_code` (`determina`),
  CONSTRAINT `fk_prev_det_prev` FOREIGN KEY (`id_preventivo`) REFERENCES `tb_preventivi` (`id_preventivo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_determina`
--

LOCK TABLES `tb_preventivi_determina` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_determina` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi_determina` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_preventivi_oggetti_map`
--

DROP TABLE IF EXISTS `tb_preventivi_oggetti_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_oggetti_map` (
  `id_preventivo` int(11) NOT NULL,
  `id_oggetto` int(11) NOT NULL,
  PRIMARY KEY (`id_preventivo`,`id_oggetto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_oggetti_map`
--

LOCK TABLES `tb_preventivi_oggetti_map` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_oggetti_map` DISABLE KEYS */;
INSERT INTO `tb_preventivi_oggetti_map` VALUES
(1,1),
(3,1),
(6,1),
(6,2),
(8,1),
(9,1),
(9,2),
(10,1),
(11,1),
(12,1),
(12,2),
(13,1),
(14,1),
(14,2),
(15,1),
(15,2),
(16,1),
(17,1),
(17,2),
(18,1),
(18,2),
(22,1),
(31,1),
(31,2),
(32,1),
(32,2);
/*!40000 ALTER TABLE `tb_preventivi_oggetti_map` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=1060 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_righe`
--

LOCK TABLES `tb_preventivi_righe` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_righe` DISABLE KEYS */;
INSERT INTO `tb_preventivi_righe` VALUES
(1058,33,37,'Attivazione Servizio Giano',1.000,150.0000,0.00,150.00,22.00,NULL,183.00,1),
(1059,33,8,'Rendicontazione - Rendicontazione Postale: Posta Certificata',1.000,0.6000,0.00,0.60,22.00,NULL,0.73,2);
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
-- Table structure for table `tb_preventivi_righe_archive`
--

DROP TABLE IF EXISTS `tb_preventivi_righe_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_preventivi_righe_archive` (
  `id_riga` int(11) NOT NULL,
  `id_preventivo` int(11) NOT NULL,
  `id_prodotto` int(11) DEFAULT NULL,
  `descrizione` varchar(1024) NOT NULL,
  `quantita` decimal(18,6) NOT NULL DEFAULT 1.000000,
  `prezzo_unitario` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `sconto` decimal(18,6) DEFAULT NULL,
  `importo_scontato` decimal(18,6) DEFAULT NULL,
  `iva` decimal(5,2) DEFAULT NULL,
  `id_sdi_natura_iva` int(11) DEFAULT NULL,
  `totale` decimal(18,6) DEFAULT NULL,
  `posizione` int(11) DEFAULT NULL,
  `archived_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_riga`),
  KEY `idx_prev_arch_righe_idprev` (`id_preventivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_preventivi_righe_archive`
--

LOCK TABLES `tb_preventivi_righe_archive` WRITE;
/*!40000 ALTER TABLE `tb_preventivi_righe_archive` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_preventivi_righe_archive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_prezzi_variazioni`
--

DROP TABLE IF EXISTS `tb_prezzi_variazioni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_prezzi_variazioni` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_prodotto` int(10) unsigned NOT NULL,
  `combo_key` varchar(255) NOT NULL,
  `prezzo` decimal(12,4) NOT NULL DEFAULT 0.0000,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_prod_combo` (`id_prodotto`,`combo_key`),
  CONSTRAINT `fk_prezzi_var_prod` FOREIGN KEY (`id_prodotto`) REFERENCES `tb_prodotti` (`id_prodotto`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_prezzi_variazioni`
--

LOCK TABLES `tb_prezzi_variazioni` WRITE;
/*!40000 ALTER TABLE `tb_prezzi_variazioni` DISABLE KEYS */;
INSERT INTO `tb_prezzi_variazioni` VALUES
(1,11,'1+4+5',0.3700),
(2,11,'1+4+6',0.5500),
(3,11,'1+4+7',0.6700),
(4,11,'2+4+5',0.6400),
(5,11,'2+4+6',0.9400),
(6,11,'2+4+7',1.2400),
(7,11,'1+3+5',0.3400),
(9,11,'1+3+7',0.6500),
(11,11,'1+3+6',0.5200),
(12,11,'2+3+5',0.6200),
(13,11,'2+3+7',1.2200),
(15,11,'2+3+6',0.9200),
(16,11,'4+5+20',1.4700),
(17,11,'4+6+20',1.5200),
(18,11,'4+7+20',1.5900),
(19,11,'4+5+21',2.8100),
(20,11,'4+6+21',2.8800),
(21,11,'4+7+21',2.9300),
(22,11,'4+5+22',2.9900),
(23,11,'4+6+22',3.0600),
(24,11,'4+7+22',3.1100),
(25,11,'4+5+23',4.3400),
(26,11,'4+6+23',4.4000),
(27,11,'4+7+23',4.4600),
(28,11,'4+5+24',5.5600),
(29,11,'4+6+24',5.6200),
(30,11,'4+7+24',5.6800),
(31,11,'3+5+20',1.4100),
(32,11,'3+6+20',1.4700),
(33,11,'3+7+20',1.5200),
(34,11,'3+5+21',2.6900),
(35,11,'3+6+21',2.9300),
(36,11,'3+7+21',2.8100),
(37,11,'3+5+22',2.8800),
(39,11,'3+7+22',2.9900),
(40,11,'3+5+23',4.1000),
(41,11,'3+6+22',2.9300),
(42,11,'3+6+23',4.1500),
(43,11,'3+7+23',4.2200),
(44,11,'3+5+24',5.3200),
(45,11,'3+6+24',5.3700),
(46,11,'3+7+24',5.4400),
(47,12,'1+5',2.8100),
(48,12,'1+6',3.1800),
(49,12,'1+7',4.0300),
(50,12,'2+5',3.3100),
(51,12,'2+6',3.6700),
(52,12,'2+7',4.7700),
(53,12,'5+20',3.8000),
(54,12,'6+20',4.1500),
(55,12,'7+20',5.2600),
(56,12,'5+21',4.3400),
(57,12,'6+21',4.7000),
(58,12,'7+21',5.8100),
(59,12,'5+22',4.7700),
(60,12,'6+22',5.1900),
(61,12,'7+22',6.2400),
(62,12,'5+23',5.7500),
(63,12,'6+23',6.1100),
(64,12,'7+23',7.2100),
(65,12,'5+24',6.9000),
(66,12,'6+24',7.2800),
(67,12,'7+24',8.3700),
(68,14,'1+8',7.6500),
(69,14,'1+9',9.0500),
(70,14,'1+10',9.7000),
(71,14,'2+8',10.2000),
(72,14,'2+9',11.6500),
(73,14,'2+10',12.8000),
(74,14,'8+20',11.3500),
(75,14,'9+20',12.9000),
(76,14,'10+20',14.5500),
(77,14,'8+21',13.7000),
(78,14,'9+21',17.7500),
(79,14,'10+21',19.3000),
(80,14,'8+22',15.3500),
(81,14,'9+22',20.0500),
(82,14,'10+22',25.7000),
(83,14,'8+23',20.8000),
(84,14,'9+23',28.9000),
(85,14,'10+23',38.6000),
(86,14,'8+24',30.6000),
(87,14,'9+24',43.3000),
(88,14,'10+24',54.7500),
(89,20,'1+8',1.3500),
(93,20,'2+8',3.3000),
(94,20,'1+9',2.5500),
(95,20,'2+9',4.1500),
(96,20,'1+10',3.3500),
(97,20,'2+10',5.1500),
(98,15,'1',12.4000),
(99,15,'2',13.7500),
(100,15,'20',13.7500),
(101,15,'21',14.9000),
(102,15,'22',14.9000),
(103,15,'24',16.4000),
(104,15,'23',16.4000),
(109,19,'11+13+31',0.0000),
(110,19,'11+14+31',0.0000),
(111,19,'12+13+31',0.0000),
(112,19,'12+14+31',0.0000),
(113,19,'11+13+33',0.0000),
(114,19,'11+14+33',0.0000),
(115,19,'12+13+33',0.0000),
(116,19,'12+14+33',0.0000),
(117,36,'11+13+31',0.0000),
(118,36,'11+14+31',0.0000),
(119,36,'12+13+31',0.0000),
(120,36,'12+14+31',0.0000),
(121,36,'11+13+33',0.0000),
(122,36,'11+14+33',0.0000),
(123,36,'12+13+33',0.0000),
(124,36,'12+14+33',0.0000),
(125,6,'40',50.0000),
(126,6,'41',150.0000),
(127,6,'42',150.0000),
(129,8,'48',0.6000),
(130,8,'47',0.4500),
(132,8,'49',0.4000);
/*!40000 ALTER TABLE `tb_prezzi_variazioni` ENABLE KEYS */;
UNLOCK TABLES;

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
  `id_sdi_natura_iva` tinyint(4) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_prodotti`
--

LOCK TABLES `tb_prodotti` WRITE;
/*!40000 ALTER TABLE `tb_prodotti` DISABLE KEYS */;
INSERT INTO `tb_prodotti` VALUES
(5,1,'GS-3','Rendicontazione Posta Ordinaria','Area web all time, copie conformi all’originale, servizi reportistica',NULL,0.5000,1,NULL,0,'2025-10-03 16:53:17','2025-11-27 10:15:31'),
(6,1,'GS-1','Centro Elaborazione Dati','Elaborazioni, controlli, modifiche eseguite da personale informatico',NULL,0.0000,1,NULL,1,'2025-10-03 16:53:17','2025-11-26 16:12:01'),
(7,3,'PD-1','Elaborazione',NULL,NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 08:32:10'),
(8,1,'GS-2','Rendicontazione','Include: Casella postale per accettazione posta di ritorno, area web all time, real time, immagine di tutti documenti inviati (copia conforme) immagini dei documenti di ritorno, cartolina corredata della firma e data di ritiro*,  busta inesitata corredata di data e motivazione dell’inesito*,  servizio archiviazione fisica e digitale (accessorio).\r\n* informazioni disponibili solo su lavorazioni eseguite e se presenti sui documenti forniti dall’operatore postale.',NULL,0.0000,1,NULL,1,'2025-10-03 16:53:17','2025-11-27 10:21:08'),
(9,2,'TP-06','Posta Light',NULL,NULL,0.5900,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 09:05:52'),
(10,1,'GS-4','Utilizzo di terzi','utilizzo di documenti di terze parti su app GianoSystem',NULL,0.0200,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 08:37:39'),
(11,2,'TP-01','Posta Massiva',NULL,NULL,0.0000,4,1,1,'2025-10-03 16:53:17','2025-10-13 15:51:05'),
(12,2,'TP-02-01','Raccomandata AR Smart',NULL,NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 09:01:01'),
(13,4,'SI-02','Raccomandata AR','Fornitura Busta 3 Finestre • Cartolina • Stampa F/R • Imbustamento',NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 08:39:32'),
(14,2,'TP-02-02','Raccomandata AR Internazionale',NULL,NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 09:01:13'),
(15,2,'TP-07','Atti Giudiziari',NULL,NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 09:22:40'),
(16,4,'SI-03','Raccomandata AG','Fornitura Busta Verde 3 Finestre • Cartolina • Stampa F/R • Imbustamento',NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 08:40:37'),
(17,2,'TP-04-02','Target invito alla prova',NULL,NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 09:00:46'),
(18,2,'TP-04-01','Target',NULL,NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 09:00:39'),
(19,4,'SI-01','Posta Massiva','Fornitura Busta 2 Finestre • Stampa F/R • Imbustamento',NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 08:38:33'),
(20,2,'TP-05','Posta Mail Internationale',NULL,NULL,0.0000,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 09:01:50'),
(21,2,'TP-99','Servizio InfoDelivery',NULL,NULL,0.0200,NULL,NULL,1,'2025-10-03 16:53:17','2025-10-09 08:53:27'),
(36,4,'SI-99','Foglio Aggiuntivo',NULL,NULL,0.0500,NULL,NULL,1,'2025-10-09 08:24:28','2025-10-09 08:42:20'),
(37,1,'GS-5','Attivazione Servizio Giano',NULL,NULL,150.0000,1,NULL,1,'2025-11-27 10:02:25','2025-11-27 10:20:00');
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
) ENGINE=InnoDB AUTO_INCREMENT=2208 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
(2128,134,1,NULL,'via certosa 1',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,134,134,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2135,2,1,NULL,'G.D’ANNUNZIO 7',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,2,2,'2025-09-30 15:43:39','2025-09-30 15:43:39'),
(2192,1,1,'SEDE NERETO','ZONA INDUSTRIALE VIA CERTOSA',NULL,'64015','NERETO','TE','IT',NULL,NULL,NULL,1,1,1,1,'2025-09-30 15:43:39','2025-10-08 15:17:49'),
(2199,1,2,'SEDE MARTINSICURO','VIA LEOPARDI 44',NULL,'64014','MARTINSICURO','TE','IT',NULL,NULL,NULL,0,0,NULL,NULL,'2025-09-30 15:43:39','2025-10-08 15:17:49'),
(2207,138,1,NULL,'Via Roma','2','64010','COLONNELLA','TE','IT',NULL,NULL,NULL,1,0,138,NULL,'2025-11-26 17:14:19','2025-11-26 17:14:19');
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
  `ruolo` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `cellulare` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `stato` enum('Attivo','Disattivato') DEFAULT 'Attivo',
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
) ENGINE=InnoDB AUTO_INCREMENT=1621 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_sedi_contatti`
--

LOCK TABLES `tb_sedi_contatti` WRITE;
/*!40000 ALTER TABLE `tb_sedi_contatti` DISABLE KEYS */;
INSERT INTO `tb_sedi_contatti` VALUES
(2,0,'CINI',NULL,'0861212630',NULL,'armando@lapubblicitta.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(3,0,'MENAGER',NULL,'0861410111',NULL,'manager@agenateramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(4,0,'SCATENA',NULL,NULL,NULL,'scatena@agenateramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(5,0,'BONADUCE',NULL,NULL,NULL,'bonaduce@agenateramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(6,0,'DI RUGGERO',NULL,NULL,NULL,'diruggiero@agenateramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(7,0,'GRAZIANO D\'EUSTACCHIO',NULL,NULL,'3285680451','grazianodeustachio@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(8,0,'SIMONELLA',NULL,NULL,NULL,'simonella@agenateramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(9,0,NULL,NULL,NULL,NULL,'valtercubalibre@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(10,0,'GIUSEPPE QUAGLIATA',NULL,NULL,NULL,'amministrazione@acufon.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(11,0,'CARRANO DOTT CARRANO',NULL,'07154465',NULL,'acusticamarche@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(12,0,'FABIO SABBATINI',NULL,'0712861022',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(13,0,'RINO',NULL,'0735753085',NULL,'info@adplan.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(14,0,'PIERGIORGIO',NULL,'0735753085',NULL,'piergiorgio@adplan.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(15,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(16,0,'COMPAGNONI SILVIO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(17,0,'MIRKO MAIORANO',NULL,'0854298960','3803183690','mirko@mimai.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(18,0,'FLORIANO',NULL,'0861752825',NULL,'info@albatour.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(19,0,'MAURO',NULL,'086182275','3293065168','info@ziomamo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(20,0,'FABIO MAZZA',NULL,NULL,'3209074018','info@geometrimacerata.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(21,0,'ALESSIA',NULL,'0861750291','3482205521','upe4205dir@posteitaliane.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(24,0,'FILIACI CAMILLO',NULL,'08611850489',NULL,'info@artedelpassato.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(25,0,'DANILO CRISTINA ANTONELLI',NULL,'0737642795',NULL,'produzione1@artelito.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(26,0,'ENRICO FARICELLI',NULL,'0854465009',NULL,'lineablusrl3@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(27,0,'FILIPPO NERI',NULL,'0736402957','3484081234','preventivi@artigp.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(28,0,'VALENTINO GALVAN',NULL,'0871561179',NULL,'valentino@aggalvan.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(29,0,'ALESSANDRO',NULL,'0871561179',NULL,'alessandro@aggalvan.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(30,0,NULL,NULL,NULL,'3495722848',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(31,0,'DANILA',NULL,'0735582500',NULL,'info@opisrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(32,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(33,0,'DIANA TAVANI',NULL,'0859463098',NULL,'centrostudi@ibambini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(34,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(35,0,'ATTILIO ORTENZI',NULL,'0862401407','3355901425',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(36,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(37,0,'CARLO',NULL,'0736899060','3387082047','spinetolipagliare.comunale@avis.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(38,0,'OSVALDO',NULL,NULL,'3281321674',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(39,0,'DAVID FAVÌA',NULL,'0715228052302',NULL,'studio.favia@fastnet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(40,0,'GIORGI',NULL,NULL,'3388565405',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(41,0,'ILARIA',NULL,'0547311811','3479938793',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(42,0,'Paolo Ruffini',NULL,'0858071544i201','3282921847','paolo.ruffini@bccadriaticoteramano.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(43,0,'GIANFRANCO DEL LUCA',NULL,NULL,NULL,'info@barbarellacreazioni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(44,0,'BASILI GIANLUCA',NULL,'0734992009',NULL,'basiliautoservice@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(45,0,'IMPASTARO BRUNO',NULL,'087166801',NULL,'grafica@blufactory.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(46,0,'JOANNA DI GIOSIAFATTE',NULL,'0858369842',NULL,'marketing@bluserena.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(47,0,'BONTEMPI LUIGI',NULL,'0733972405',NULL,'luigi@brigitteitalia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(48,0,'BELEGGIA MURIZIO',NULL,'0734967325',NULL,'maurizio@brosmanifatture.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(49,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(50,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(51,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(52,0,'TARASCHI CESARE',NULL,'0861335226',NULL,'cesare.taraschi@te.camcom.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(53,0,'STEFANO MINORA',NULL,NULL,'3401569222','sminora@tiscalinet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(54,0,'UFF. ACQUISTI',NULL,'0852015595',NULL,'info@carttecnicaroberto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(55,0,'FABIO CORREALE',NULL,'098433011','3337969905','ccrenergia@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(56,0,'BALDINI BRUNO',NULL,NULL,'3471511852',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(57,0,'MORGANTI/COLLINA',NULL,'0736345350',NULL,'ascolipiceno.lega.spi@marche.cgl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(58,0,'PAOLO TRIBUIANI',NULL,'0861752300','3464975959','paolo@c-house.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(59,0,'ALESSANDRA DEL SORDO',NULL,NULL,NULL,'alessandra.delsordo@istruzione.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(60,0,'DI MARZIO',NULL,'071286081',NULL,'info@an.cna.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(61,0,'CINQUINO L.',NULL,'0871341468','3482342263','lorenzo.cinquino@comune.chieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(62,0,'Federica D\'Antonio','Amministrativo','0861809901',NULL,'amministrativo@comune.controguerra.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(63,0,'ORLANDO DI LUCA',NULL,'08618065127','3482637983','ragioneria@comunecorropoli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(64,0,'MARIA MASSETTI',NULL,'0735739214',NULL,'m.massetti@comune.grottammare.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(65,0,'MARIA MASSETTI',NULL,'0735739211',NULL,'m.massetti@comune.grottammare.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(66,0,'Polidoro Giuseppe',NULL,'0861806923','3389509777','ragioneria@comune.nereto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(67,0,'Antonietta Crisucci','Amministrativo','08589453615',NULL,'crisucci.antonietta@comune.roseto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(68,0,'Innamorati Gabriella\rRagioneria - Programmazione  Economica - Finanze - Patrimon','','08589453615',NULL,'innamorati.gabriella@comune.roseto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(69,0,'MARCHEGIANI',NULL,'0861785316','3351548803','tributi@comune.tortoreto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(70,0,'SABRINA DI FRANCESCO',NULL,'0861243833',NULL,'segreteria@cnateramo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(71,0,NULL,NULL,'08614419240',NULL,'occagna@consorform.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(72,0,'NICODEMOCOCCAGNA',NULL,'08614419240',NULL,'nicodemococcagna@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(73,0,'CARLA MARTORELLA',NULL,'08728606400',NULL,'info@vptabruzzo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(74,0,'MATRANGA GIOVANNI',NULL,NULL,NULL,'info@contatnewsolution.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(75,0,'MOIRA MOIRA',NULL,'0861855573',NULL,'moira.iozzi@cosevservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(76,0,'LIA RENZI',NULL,'073585365','335388021','cosi.srl@gmail.com cosi.srl@postcert.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(77,0,'Paolo De Santis',NULL,'08618040623',NULL,'paolo.desantis@dauriagroup.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(78,0,'FRANCESCA',NULL,'0736306450',NULL,'info@tipografiadasa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(79,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(80,0,NULL,NULL,NULL,NULL,'ellecistudio@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(81,0,'CINI LUIGI',NULL,'0861855690','3298636056','luigicini@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(82,0,NULL,NULL,NULL,NULL,'tarci81@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(83,0,'CINI FABIO',NULL,NULL,'3408145051','fabio.studiocini@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(84,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(85,0,'BRUNA',NULL,'0854312220',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(86,0,'SINDACO EMILIANO DI MATTEO',NULL,'0861870913',NULL,'mail emilianodimatteo@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(87,0,'MAURIZIO MAURIZIO',NULL,'0861787704',NULL,'digitaliasrl@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(88,0,'MIRA',NULL,'0861250336',NULL,'primapagina.te@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(89,0,NULL,NULL,'0858932059',NULL,'ederacoop@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(90,0,'ELIO D\'ARCANGELO',NULL,'0854163968','3886523228','edesign3d@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(91,0,'DI LIBERATORE SANDRO',NULL,'0861230092',NULL,'s.editpress@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(92,0,NULL,NULL,NULL,NULL,'editpress@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(93,0,NULL,NULL,NULL,NULL,'sandro.editpress@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(94,0,'VITO DI GIOVANNI',NULL,'0873366366',NULL,'vitodigiovanni@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(95,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(96,0,'GIANCARLO SILVIA',NULL,'071918400',NULL,'silvia@graficheripesi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(97,0,'TIZIANA',NULL,NULL,'3387282391','tiziana.ma@graficheripesi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(98,0,'MARIA CONCETTA',NULL,'0854680971','3383742274','info@esasrlpe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(99,0,NULL,NULL,NULL,NULL,'v.dippolito@esasrlpe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(100,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(101,0,NULL,NULL,'086182276',NULL,'estraenergie@estraenergie.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(102,0,NULL,NULL,NULL,NULL,'info@enetgeia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(103,0,NULL,NULL,NULL,NULL,'acardelli@estraspa.it;','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(104,0,'GEN.MA ILARIA',NULL,NULL,NULL,'estra@estraspa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(105,0,'ANTONIO DI GIULIO',NULL,'0861772230',NULL,'m.faraone@faraone.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(106,0,NULL,NULL,'0861784222',NULL,'vallese@faraone.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(107,0,'Sabatino Faraone',NULL,'0861784201',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(108,0,NULL,NULL,'0735765035',NULL,'info@fastedit.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(109,0,'Paolo Spinozzi',NULL,NULL,'3288944845','p.spinozzi@fastedit.digital','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(110,0,'STEFANO',NULL,'0852056965',NULL,'stefano.innamorati@euroconsultingsrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(111,0,'FABIO CORRIDONI',NULL,'0734600377',NULL,'segreteria@fermonetwork.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(112,0,'MATTEO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(113,0,'ELISA MASETTI',NULL,'0735751025',NULL,'elisa.massetti@tonicnet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(114,0,'TITOLARE',NULL,'073584003',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(115,0,'FRANCO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(116,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(117,0,'GALASSI GIANLUCA',NULL,'0861855063','3939815725','infogalassigroup@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(118,0,'DI COLA',NULL,'0871330880','3397669476','edicolach@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(119,0,NULL,NULL,'0733233004',NULL,'amministrazione@girotti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(120,0,'BERNARDO',NULL,'0861817147',NULL,'gm.cash@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(121,0,'ALESSANDRO ALESSANDRO',NULL,'0854216135','3356745380','alessandro@grafica80.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(122,0,'JOSELITO IEZZONI',NULL,'0859461491',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(123,0,'VITELLI LUCA',NULL,'0736256632','3299426275','graficagv@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(124,0,'COSTANTINO MAURIZIO',NULL,'0854685665',NULL,'info@sivaitalia.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(125,0,'FABRIZIO COSTANTINO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(126,0,'ENZO',NULL,'0734861126',NULL,'agostino@grafichefioroni.191.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(127,0,'FRANCHELLUCCI MANUELA',NULL,'0734992339',NULL,'manuelaf@grafichefranchellucci.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(128,0,'Katia Di Domenico',NULL,'0861748980',NULL,'pianificazione@martintype.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(129,0,NULL,NULL,NULL,NULL,'contab.for@martintype.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(130,0,'CLAUDIO MAGHERINI',NULL,'073160343',NULL,'claudio.magherini@grafichericciarelli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(131,0,'STEFANO SCARPONI',NULL,'0717230788',NULL,'cecilia@grafichescarponi.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(132,0,'ANDREA',NULL,'0734968764',NULL,'grafiche.zizzini@tiscalinet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(133,0,'DANILO VENTURA',NULL,NULL,NULL,'grafichedv@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(134,0,'GUERCIONI RICCARDO',NULL,'0861712182','3474171914','info@guercioni.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(135,0,NULL,NULL,'0861786446',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(136,0,'CHIARA',NULL,'0737787225',NULL,'chiara@halleyeditrice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(137,0,'OMBRETTA',NULL,'0861711128','3396383421','info@hoteladriatico.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(138,0,'BELIGNI',NULL,NULL,'3483012403','info@hotelastor.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(139,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(140,0,'Rossana',NULL,'0736811425',NULL,'rossanatacconi@grafichetacconi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(141,0,'ANDREA TAFÀ',NULL,'0858025323',NULL,'andreatafa@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(142,0,'CICCARELLI',NULL,'0853613642',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(143,0,'ALFREDO GIORGI',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(144,0,'NICOLA FERNANDO ROMANO',NULL,NULL,NULL,'nf.romano@ice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(145,0,'UFF ACQUISTI',NULL,'0721891655',NULL,'paolo@ideostampa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(146,0,'ROBERTO FALO\'',NULL,'0861810146','3382602384','redazione@ilpopolodabruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(147,0,'AMERIGO MARIO',NULL,'0861760926',NULL,'ilpontecoop@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(148,0,NULL,NULL,NULL,NULL,'info@coopilsolco.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(149,0,'FABRIZIO FABRIZIO',NULL,'0861248099','3491952250','info@imagocomunicazione.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(150,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(151,0,NULL,NULL,'067236456','3394147991','imiimballaggi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(152,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(153,0,'SERENA',NULL,NULL,NULL,'serena.tundo@insigno.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(155,0,NULL,NULL,NULL,NULL,'info@tasuantincendio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(156,0,'DANILA STRACCIA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(157,0,'MANUELA DI FULVIO',NULL,'0859055202',NULL,'manuela.difulvio@iper.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(158,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(159,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(160,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(161,0,'LUDOVICA TEODORI',NULL,'0736358406',NULL,'iom@asl13.marche.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(162,0,'MAURILIO MIGLIORATI',NULL,NULL,'3477187037','info@italico.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(163,0,'DAVIDE BALLONE',NULL,'085432050','3483710607','amministrazione@hotelmara.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(164,0,NULL,NULL,'0854315285',NULL,'michela@sinergia-adv.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(165,0,'LORENZO',NULL,'0859463184','3486098215','lorenzo@lacassandra.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(166,0,'DUCA MIRELLA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(167,0,'MARCO DONVITO',NULL,'0736880001',NULL,'grafica@lanuovastampa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(168,0,NULL,NULL,'0735751239',NULL,'info@lanuovastampa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(169,0,NULL,NULL,NULL,NULL,'marcodon71@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(170,0,'BELLOMO ANTONIO',NULL,'0712861711','3939951883','antonio@poligraficabellomo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(171,0,NULL,NULL,NULL,'3404123362','alessandro.perugini@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(172,0,NULL,NULL,'0863497045',NULL,'amministrazione@lclindustriagrafica.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(173,0,'NADIA SILVESTRINI',NULL,NULL,NULL,'nadia@lclindustriagrafica.it;','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(174,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(175,0,'MARSEGLIA',NULL,'0289073057','3381130440','lineasnellamilano@fastweb.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(176,0,'MARSEGLIA',NULL,NULL,'3484963811',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(177,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(178,0,'SILVANA SILVANA',NULL,'0735702910',NULL,'info@lineagrafica.info','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(179,0,'TATIANA',NULL,'0734518014',NULL,'amministrazione@litoemme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(180,0,'TATIANA',NULL,'0734515642',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(181,0,'NICOLA BOTOLINI',NULL,'0872714641',NULL,'nico@botolini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(182,0,'MICHELE MICOLUCCI',NULL,NULL,NULL,'riv@botolini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(183,0,NULL,NULL,NULL,NULL,'ced@botolini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(184,0,'IVANA',NULL,'08544624200',NULL,'ivana@brandolini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(185,0,NULL,NULL,NULL,NULL,'preventivi@brandolini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(186,0,'CARLO TARQUINI',NULL,'0734672503',NULL,'carlo@litograficacom.191.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(187,0,'MICHELE CANONICI',NULL,'073160003',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(188,0,'LUISELLA CHIARINI',NULL,'086182465',NULL,'luisellachiarini@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(189,0,'MARCO',NULL,'085690467',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(190,0,'DE SIMONE MARCO',NULL,'07216991','3283633014',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(191,0,'LUISA',NULL,'0733771277',NULL,'amministrazione@marveladv.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(192,0,'MALATESTA',NULL,NULL,'3494036225',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(193,0,'ILARIA',NULL,'0735757623',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(194,0,'CACCIAGRANO LUCIO',NULL,NULL,'3396071535','lucio.cacciagrano@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(195,0,NULL,NULL,NULL,'3383967608',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(196,0,'MARCO CECILIA',NULL,'063312002',NULL,'commerciale@mcgraphis.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(197,0,'RENO',NULL,'0735735624','3357215678','mp2000@insinet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(198,0,'DI LIBERATORE',NULL,'0858071422','3498704164',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(199,0,'BETTINSOLA FRANCESCA',NULL,'0256814813',NULL,'redazione@mediamed.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(200,0,'BIONDI',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(201,0,'ILARIA',NULL,'0735757623',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(202,0,'MARCO ZAVATTA',NULL,'0854325050',NULL,'marco@meditour.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(203,0,'ANTONELLO IEMMOLO',NULL,'08621960600',NULL,'a.iemmolo@mercurioservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(204,0,'PIERO MANONI',NULL,'085291129',NULL,'p.menoni@mirus.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(205,0,'SERENA TUNDO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(206,0,'BORGHETTI',NULL,'0717824739',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(207,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(208,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(209,0,'TONI VAGNONI',NULL,NULL,'3483824206','info@mitograf.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(210,0,'ANGELO',NULL,'086181201',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(211,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(212,0,'BARCHESI GIACOMO',NULL,'0712865058',NULL,'info@modulconero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(213,0,'CAMPANELLA LUCIO',NULL,'0854913236',NULL,'lucio@modularlito.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(214,0,'PIO PEDICONI',NULL,'085297393',NULL,'pediconip@monelli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(215,0,NULL,NULL,'0734900178',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(216,0,'IOSELITO',NULL,NULL,'3476630657','iose72@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(217,0,'GIULIANO',NULL,'0735758175',NULL,'info@mpserv.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(218,0,'ALDO SABATELLI',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(219,0,'MAURO MAURO',NULL,'0858072110',NULL,'mauro@multiprogress.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(220,0,'DOTT NANDO ROSATI',NULL,NULL,'3389417376',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(221,0,'PANTOLI LEONARDO',NULL,NULL,'3803043962',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(222,0,NULL,NULL,NULL,NULL,'guy@nanni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(223,0,'ROBERTO D\'ATTANASIO',NULL,'0861212581',NULL,'roberto@ng1.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(224,0,'ILARIA',NULL,'0735757623','3479940000',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(225,0,'ELISA MASETTI',NULL,'0735751025',NULL,'elisa.massetti@tonicnet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(226,0,'LUCIANA',NULL,'0861611028',NULL,'niba.fd@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(227,0,'NICODEMO C.',NULL,'08614419',NULL,'nicodemococcagna@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(228,0,'FILIPPO NERI',NULL,'0736307162',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(229,0,'RISPOLI STEFANO',NULL,'08715857241',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(230,0,NULL,'','08715857232',NULL,'programmazione.vit@opschieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(231,0,'PAOLO DI SIPIO','Amministrativo','08715857210',NULL,'info.ops@opschieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(232,0,'BORDONI',NULL,'0712142107','3351306222',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(233,0,'CECILIA D\'ADDEZIO',NULL,'0863910606',NULL,'info@opisrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(234,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(235,0,'PALAZZESE',NULL,'0858942635',NULL,'info@espander.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(236,0,'LUCA DI PIETRO',NULL,'0861610525','3286740484','l.dipietro@paperworld.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(237,0,'LUCA DI PIETRO',NULL,'0861207339',NULL,'info@papersword.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(238,0,NULL,NULL,NULL,NULL,'tecnico@edigrafital.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(239,0,'ERNESTO',NULL,'0854963588','3294262498',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(240,0,'ANTONIO LINARI',NULL,'08565518',NULL,'info@pdiabruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(241,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(242,0,'PETACCIA FABIO',NULL,'0859351266',NULL,'litotipografia@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(243,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(244,0,'CECI',NULL,'086182809',NULL,'amministrazione@poliservice.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(245,0,'DOTT.SSA MOIRA IOZZI',NULL,NULL,NULL,'info@poliservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(246,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(247,0,NULL,NULL,'0861713553',NULL,'studiorenatoracci@libero.itsi','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(248,0,'BRUNO SABATINI',NULL,'0858006600',NULL,'brunosabatini@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(249,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(250,0,'GALLUCCI CARLO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(251,0,'LUCIANO MENONI',NULL,NULL,'3934685837','luc.menoni@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(252,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(253,0,'F.DICRESCENZO',NULL,'08714082220',NULL,'f.dicrescenzo@provincia.chieti.it.','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(254,0,'PINA MANENTE',NULL,NULL,NULL,'ufficio.stampa@provincia.teramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(255,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(256,0,'FERRARA',NULL,'0854460030','3356169110',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(257,0,'ILARIA ROCCASECCA',NULL,'0735757623',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(258,0,NULL,NULL,NULL,NULL,'alberto direzione@biotronic.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(259,0,'ODDI',NULL,'073599241','3339404212',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(260,0,'ANDREA TAFÀ',NULL,'0858025323',NULL,'andreatafa@gmail.com;info@seaparkresort.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(261,0,'RICCHIONI SANDRO',NULL,'086182354',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(262,0,'ABRAMO RICCHIONI',NULL,'0861855430','3488705012','abramo@ricorcasa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(263,0,NULL,NULL,'0861753226','3384263820','ristorantefilu@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(264,0,'MARIO RANZI',NULL,'0854465906',NULL,'ranzi@rotolitho.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(265,0,'AMMINISTRAZIONE DIREZIONE',NULL,'0861310364',NULL,'ufficio.protocollo@ruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(266,0,'M DIPAOLO',NULL,NULL,NULL,'m.dipaolo@ruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(267,0,'A FASULO',NULL,NULL,NULL,'a.fasulo@ruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(268,0,'MARIA CONCETTA',NULL,'0854680971',NULL,'mariaconcettadiluca@esasrlpe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(269,0,'MOLINARO FERNANDO',NULL,NULL,NULL,'fernando.molinaro@solaresrl.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(270,0,NULL,NULL,NULL,NULL,'maryc@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(271,0,NULL,NULL,NULL,'3200712041','babyvillage2010@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(272,0,'FABIO GALIZIA',NULL,'0861221460',NULL,'galizia_@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(273,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(274,0,'GIULIANO',NULL,'0735656629',NULL,'info@studiokompass.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(275,0,'ORLANDO',NULL,'08617725563','3483540672','giuseppe.orlando@seltatel.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(276,0,'DI NICOLA',NULL,'0854463401',NULL,'serilitostampa@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(277,0,'MARIO CAMELI',NULL,'0735757435','3481506750','direzione@serviziepartners.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(278,0,'ELENA',NULL,'0552478436',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(279,0,'MAURO MAURO',NULL,'0734892408',NULL,'info@silversrl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(280,0,'CALCAGNI',NULL,'073644828',NULL,'simbiosi@simbiosimarketing','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(281,0,'SONIA ROSATI',NULL,NULL,NULL,'soniarosati@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(282,0,'CARLO MARZOVILLA',NULL,'0854315285',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(283,0,'MICHELA RUGGIERO',NULL,NULL,NULL,'michela@sinergia-adv.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(284,0,'MANTINI MICHELA',NULL,NULL,NULL,'mantini@sinergia-adv.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(285,0,'MARCO SPINSANTI',NULL,'0735735473',NULL,'m.spinsanti@spinsantigroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(286,0,'PASQUALE PIROZZI',NULL,'0858072272',NULL,'stampa.comunicazione@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(287,0,'GIACOMO',NULL,'0564935192',NULL,'info@stamperiariemma.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(288,0,'SCHIAVI LINO',NULL,'0861870066',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(289,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(290,0,'ALFREDO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(291,0,'GAETANO',NULL,'0733433730',NULL,'gaetano@tafgrafica.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(292,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(293,0,'DELLE FOGLIE SERGIO',NULL,'0854462018',NULL,'sergio@teknopost.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(294,0,'CACCIATORE',NULL,'086143961',NULL,'m.cacciatore@teramoambiente.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(295,0,'ALFREDO ARAMONDI',NULL,'0861243102','3397380891','aramondi@terfiditeramo.it o info','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(296,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(297,0,'CRISTIAN',NULL,'0735634499',NULL,'info@timbroexpress.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(298,0,'CRISTIAN',NULL,'0735634499',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(299,0,'CLAUDIO MAGHERINI',NULL,'0859461491',NULL,'magherini.claudio@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(300,0,'TERESA',NULL,'0858072247','3474173521','tipografia.2000@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(301,0,'MARTINA',NULL,'0858004909',NULL,'info@tipografiabraga.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(302,0,'EMIDIO VELLEI',NULL,'0736306450',NULL,'info@tipografiadasa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(303,0,'PAOLO COLASANTE',NULL,'071202247',NULL,'tipografia.dorica@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(304,0,'PINO',NULL,'0861252599',NULL,'europrint@email.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(305,0,'SIMONA',NULL,'0736253009','3284406381','simonafalleroni@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(306,0,'FRASCAROLO ARNALDO',NULL,'014365474',NULL,'frascarolo@mediacomm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(307,0,'D\'OTTAVIO BRUNO',NULL,'0861242225',NULL,'t.interamnia@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(308,0,'MAURIZIO',NULL,'0734622616',NULL,'tip.lanuovarapida@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(309,0,'ESPOSITO',NULL,'0858008394',NULL,'info@tipografialarapida.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(310,0,'MAX MANCINI',NULL,'0734518014',NULL,'info@litoemme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(311,0,'TATIANA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(312,0,'VANESSA',NULL,'0717174017',NULL,'info@tipoluce.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(313,0,'STEFANO DOMIZI',NULL,'0733201244','3470751321','info@tipografiasangiuseppe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(314,0,'Sonia',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(315,0,'CAPPELLI NADIA',NULL,'0736342565',NULL,'seros.ap@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(316,0,'CAPPELLI NADIA',NULL,'0736342565',NULL,'info@seros.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(317,0,'GAETANO ANGELETTI',NULL,'0733433730',NULL,'gaetano@tafgrafica.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(318,0,'MARCO',NULL,'0731204141',NULL,'grafica@tipografiatj.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(319,0,'VALLORANI GIUSEPPE',NULL,'0736257297',NULL,'tipografiavallorani@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(320,0,'CINZIA PATRIZIO',NULL,'0858993113',NULL,'info@tipolitorosetana.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(321,0,'MARTINI AMEDEO',NULL,'0712801144',NULL,'amedeo@mpsgrafica.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(322,0,'MAURIZIA RAFFAELLI',NULL,'071804157',NULL,'commerciale@tip-kennedi.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(323,0,'SIMONA SIMONA',NULL,'0854980076',NULL,'sigraf2@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(324,0,'SONIA ROCCHI',NULL,'0245493482',NULL,'rocchi@titamilano.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(325,0,'CASALENA OSVALDO',NULL,'0861810109','3334776699',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(326,0,'GIOVANNI PALMIERI',NULL,'0858089017',NULL,'direzione@tourexpress.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(327,0,'GIULIO',NULL,'0858072030',NULL,'info@ufersrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(328,0,'ANTONIO DI STEFANO',NULL,NULL,'3454452067','antonio.di.stefano@uniposta.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(329,0,'Nando',NULL,'0861856120',NULL,'info@valvibratacollege.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(330,0,'GIUSEPPE VALLESE',NULL,'0861765259',NULL,'esellav@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(331,0,'GAETANO CAPANNA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(332,0,NULL,NULL,'086170860',NULL,'info@vinilepore.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(333,0,'PAOLO MUZI',NULL,'0863992401','3498301832','direzione@webcolorprint.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(334,0,'GAETANO',NULL,'0861887751','3333163902','wordagenzy@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(335,0,'CICHETTI PAOLO',NULL,'0861711088',NULL,'gioielleriacichetti@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(336,0,'PELLANERA CESARE',NULL,'0861410359',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(337,0,'DI PIETRO DARIO',NULL,NULL,'3283269802',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(338,0,'GRAZIAPLENA MARINO',NULL,'086182523','3473646170',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(339,0,'POMANTE',NULL,NULL,'3356855721',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(340,0,'SPINELLI PAOLA',NULL,'0861759498','3483975416',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(341,0,'ANDREA',NULL,'0861710688','3475379863',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(342,0,NULL,NULL,'073556814','3289665105','amministrazione@internationalservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(343,0,'FLAMMINI MASSIMO',NULL,'0861789381','3356306030',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(344,0,'COCCIA LUIGI',NULL,'08618205','3489011392',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(345,0,'MEZIO GIUSEPPE',NULL,'0861713056','3478902127','info@albanovatre.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(346,0,'MEZZIO',NULL,'0861713096','3478902127',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(347,0,'BONPADRE GIOVANNI',NULL,'0861752158','396469246','info@prestitistarfin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(348,0,NULL,NULL,NULL,'3381611620',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(349,0,'NEPA FABIO',NULL,'0861850421',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(350,0,'DI FELICE LOREDANA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(351,0,'STEFANO',NULL,NULL,'3271412740',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(352,0,'MARCO',NULL,NULL,'3476636077',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(353,0,'FABRIZIO',NULL,'0735705330',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(354,0,'CAPPONI LUCA',NULL,'0735704577',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(355,0,'EDO',NULL,'0735757144',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(356,0,'LA SORDA NICO',NULL,'0854315092',NULL,'niko@policartasrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(357,0,NULL,NULL,'0854315092',NULL,'ordini@policartasrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(358,0,'SPURIO VALENTINO',NULL,'0734632963','3476435023','amministrazione@formulabk.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(359,0,'ANGELINI PIERGIACOMO',NULL,'0736402354',NULL,'carloangelini@katamail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(360,0,'DI PIETRO MARCO',NULL,'0861856277',NULL,'info@valmotors.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(361,0,'TONELLI',NULL,NULL,'3498512194',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(362,0,'ANDREA BASSI',NULL,'0658334391','3343766251','a.bassi@blunet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(363,0,'ALESSANDRO',NULL,'0861796349',NULL,'dcsrevisionionline@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(364,0,'DANIELE',NULL,'0861796349',NULL,'dambrosiodaniele@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(365,0,'PINA',NULL,'07331838081',NULL,'macerata@llaposte.biz','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(366,0,'FORMICA',NULL,'0735707404',NULL,'marina.formica@conadadriatico.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(367,0,'DE SANTIS PAOLO',NULL,'08618040',NULL,'paolo.desantis@dauriagroup.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(368,0,NULL,NULL,'0861761947',NULL,'info@noleggioauto.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(369,0,'PASQUALINO DI DIODORO',NULL,'0861839022','3292634334','info@gimar-italia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(370,0,'CRUCIANI ROLANDO',NULL,'0861241555','337721114','info@centrufficiote.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(371,0,NULL,NULL,'0859771702',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(372,0,'PERSIANI ALFONSO',NULL,'0858005191','3473538486','a.persiani@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(373,0,'PERSIANI ALFONSO',NULL,'0858005191','3473538486','studio.apersiani@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(374,0,'CINI GIACOMO',NULL,'0861855690','3298636056','ellecistudio@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(375,0,NULL,NULL,'0858071525',NULL,'info@utensilservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(376,0,'MORO CLAUDIO',NULL,'0861810333',NULL,'moroclaudio@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(377,0,'SERINI MARCELLO',NULL,NULL,NULL,'serini.marcello@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(378,0,'CIMOROSI MARCO',NULL,NULL,'3356539148','hotel@bellavistahotel.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(379,0,'BOZZELLI GABRIELE',NULL,'08552070','3397629410','gbplast.pescara@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(380,0,'DE AMICIS',NULL,NULL,'3423739541','isolanticocchierisrl@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(381,0,'FRANCESCA PETRUCCI',NULL,'0736223215',NULL,'renzo.martuscelli@posteitaliane.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(382,0,'DI BIAGIO PIERO',NULL,'0736259201',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(383,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(384,0,'ORLANDI ALESSANDRO',NULL,'05572931','3466861200','alessandroorlandi_003@fastwebnet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(385,0,'ANDRENELLI WALTER',NULL,'0733270530',NULL,'info.artgraf@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(386,0,NULL,NULL,'0858089006',NULL,'info@tecnolinea.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(387,0,'GIULIO SOTTANELLI',NULL,NULL,'3470046499','giuliosottanelli@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(388,0,NULL,NULL,NULL,NULL,'gabridisi@katamail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(389,0,'GERMANO',NULL,'0858071981','3339314951','info@matissegraphics.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(390,0,'PIGNOTTI FRANCO',NULL,NULL,'3470603932','aloe@aloemission.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(391,0,NULL,NULL,NULL,NULL,'c.cordoni@mastergrafica.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(392,0,'CLAUDIA ALESSIO',NULL,'0861558003','3284164298','info@mastergrafica.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(393,0,NULL,NULL,NULL,NULL,'delmarrolu.0580@allianzlloydadriatico.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(394,0,'GIANMARIO FARINELLI',NULL,'0861808145',NULL,'gmfarinelli@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(395,0,NULL,NULL,NULL,'3398542121',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(396,0,'DI PIETRO MARCO',NULL,'0861808243',NULL,'acinereto@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(397,0,NULL,NULL,'0861753226','3384263820','ristorantefilu@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(398,0,'SAVI SIMONE',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(399,0,NULL,NULL,'0861710225',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(400,0,'CONINTELLI ELENA',NULL,'0861917171',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(401,0,'CIALINI CINZIA',NULL,'086170205','3334423371',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(402,0,'TIZIANA',NULL,'0861856293',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(403,0,'VAGNOZZI MAURIZIO',NULL,NULL,'3476443621',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(404,0,'TRIBUZI MAURO',NULL,'0861710770',NULL,'coge@tribuzi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(405,0,NULL,NULL,NULL,'3290523337',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(406,0,'STEFANO',NULL,'072133323',NULL,'stamperia@artigrafichepesaresi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(407,0,NULL,NULL,NULL,NULL,'amministrazione@artigrafichepesaresi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(408,0,'CARLO',NULL,'0858007575',NULL,'costav@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(409,0,NULL,NULL,NULL,'3408936540',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(410,0,'GIOVANNINI ARMANDO',NULL,NULL,'3468451319','giovanniniarmando@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(411,0,'DE ASCENTIS ROBERTO',NULL,NULL,'3480173257','robertodeascentiis@hotmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(412,0,'DI GIULIO ANTONIO',NULL,'086177221',NULL,'a.digiulio@faraone.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(413,0,'CIAPANNA SANDRO',NULL,'0861761335',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(414,0,'TRAINI CLAUDIO',NULL,'0861856459','3484076521','amministrazione@fratellitraini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(415,0,'RASTELLI SETTIMIO',NULL,'0861712752',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(416,0,NULL,NULL,'0861840470',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(417,0,'ZENOBI MARCELLO',NULL,'086170581',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(418,0,'MASETTI LORENA',NULL,'0861760575','3663542992',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(419,0,'ANTONIO',NULL,'0861714913',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(420,0,'BIAGI LUCA DI PIETRO',NULL,'0861714066','3473650133','info@aziendaagricolabiagi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(421,0,'MARCO',NULL,'0858004300',NULL,'diberardini.didomenico@boshcarservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(422,0,'VINCENZO',NULL,'0854162364',NULL,'spadavincenzo@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(423,0,'MARCONI FRANCESCO',NULL,'0861331402','3666802711','f.marconi@provincia.teramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(424,0,'ALFONSO PACETTI',NULL,'0736338502',NULL,'morganti.annamaria@picenogasvendita.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(425,0,'ROBERTA',NULL,'0861840162',NULL,'lamboni@bigmat.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(426,0,'NARDINOCCHI',NULL,'0736-344946',NULL,'info@consav.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(427,0,NULL,NULL,NULL,NULL,'info@mediaprint.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(428,0,'CARLETTI MAURO',NULL,'07172478224','3346002567',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(429,0,'STEFANO',NULL,'0734902325',NULL,'smaranesi@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(430,0,NULL,NULL,'0734902325',NULL,'info@revisioniconael.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(431,0,'DANIELE DANIELE',NULL,'0734840918',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(432,0,'CASTELLI FRANCESCO',NULL,'0861810454','3404158080','castelli.francesco@tim.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(433,0,'PIOVAN GIANFRANCO',NULL,'0549962511','368915161','gianfrancopiovan@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(434,0,NULL,NULL,'0861553014',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(435,0,NULL,NULL,NULL,NULL,'aaubert@lineaufficio-srl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(436,0,'BALLONI NICOLA',NULL,'0735762025',NULL,'info@lineaufficio-srl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(437,0,NULL,NULL,'0918668785',NULL,'info@medigrafsrl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(438,0,'OTTAVIANI',NULL,'0735656428',NULL,'info@elettropneumatica.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(439,0,NULL,NULL,'0861-818195',NULL,'info@starservice.name','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(440,0,'SIMONA',NULL,'0861786435',NULL,'gius.dalessandro@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(441,0,'SERGIO / ANTONIO',NULL,'086182325',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(442,0,NULL,NULL,NULL,NULL,'telecomitalia@pec.telecomitalia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(443,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(444,0,NULL,NULL,'0861840105',NULL,'info@rimteramo.biz','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(445,0,NULL,NULL,NULL,NULL,'info@rimteramo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(446,0,'FELCI NERINA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(447,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(448,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(449,0,'RUPILLI MARIO',NULL,'0861850166','3392920833',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(450,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(451,0,'DI DI FERDINANDO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(452,0,NULL,NULL,'073576171',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(453,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(454,0,'GIORGETTI ABRAMO',NULL,'0861839501',NULL,'agiorgetti@gruppoedif.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(455,0,NULL,NULL,NULL,NULL,'contabilitaclienti@posteitaliane.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(456,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(457,0,NULL,NULL,'0296482111',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(458,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(459,0,'DI DOMENICO',NULL,'08611855680','3803882848','info@solarpowertech.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(460,0,'FANTOZZI FABIO',NULL,'0861917421','3356374766','amministrazione@orthofan.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(461,0,NULL,NULL,'086170212',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(462,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(463,0,'CAPPELLETTI IVANO',NULL,NULL,'3403856031','bioelettra@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(464,0,NULL,NULL,'067847599',NULL,'fdzuparm@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(465,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(466,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(467,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(468,0,'ROBERTO ZARRI',NULL,'049625730',NULL,'roberto.zarri@abacospa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(469,0,'BAGLIONI ANDREA',NULL,'0733864251',NULL,'andrea.baglioni@bluranton.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(470,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(471,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(472,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(473,0,'CAPIAGHI',NULL,'0392027768',NULL,'info@automationaddress.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(474,0,'FABIANI GABRIELE',NULL,NULL,'3473504702',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(475,0,'D\'ANGELO BIAGIO',NULL,'086188387',NULL,'biagio@barzotti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(476,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(477,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(478,0,'NESPECA MAURIZIO',NULL,'07362721',NULL,'info@ciip.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(479,0,'DANIELE DANIELE',NULL,NULL,NULL,'info@postanetwork.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(480,0,'ELEONORA',NULL,'08594641',NULL,'info@ponziosud.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(481,0,'CICHETTI PEPPE',NULL,'0861810010',NULL,'info@hotelristorantelagoverde.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(482,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(483,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(484,0,NULL,NULL,'0871561812',NULL,'info@afisnc.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(485,0,NULL,NULL,'086182668','3485296302','info@autocarrozzeriarapali.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(486,0,NULL,NULL,'0293158611',NULL,'info@neopost.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(487,0,NULL,NULL,NULL,'3493610141',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(488,0,NULL,NULL,'0861587454',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(489,0,NULL,NULL,'0861752773',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(490,0,NULL,NULL,'0861750972',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(491,0,NULL,NULL,'08617991',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(492,0,'PAGLIARULO GIUSEPPE',NULL,NULL,NULL,'pagliarulogiuseppe@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(493,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(494,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(495,0,NULL,NULL,'0858942643',NULL,'info@villaggiolidodabruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(496,0,'ALDERISIO STEFANO',NULL,'06910981','3392312367','alderisio.stefano@burgo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(497,0,NULL,NULL,'086188444',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(498,0,NULL,NULL,'0861855234',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(499,0,NULL,NULL,'0861927089','3486021566',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(500,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(501,0,NULL,NULL,'0861711899',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(502,0,NULL,NULL,'0858003058',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(503,0,NULL,NULL,'0858007546',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(504,0,NULL,NULL,'0861850401',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(505,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(506,0,'GIRARDI PAOLO',NULL,'0227400090','3482618629',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(507,0,'BUSCEMA FERDINANDO',NULL,'0736898152',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(508,0,'CLAUDIO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(509,0,'DE BERARDINIS SARA',NULL,NULL,'3387692520',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(510,0,'MICAELA ALESSANDRO',NULL,'07197475320',NULL,'a.maccaroni@tecnostampa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(511,0,NULL,NULL,NULL,NULL,'m.lucchetti@tecnostampa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(512,0,'MAURO MAURO',NULL,'0734228849','3452212276','tipolito.fermana@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(513,0,NULL,NULL,'035520316',NULL,'info@globaltelephone.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(514,0,'DI SIMONE GIANNI',NULL,NULL,'3476519039','giannidisimone@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(515,0,'LUCCHETTI MICAELA',NULL,'071730031',NULL,'ufficiotecnico@conerograficaprinting.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(516,0,'FEDERICA',NULL,NULL,'3299527004','testi@fondazionepantarei.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(517,0,'PROVVEDUTO GAETANO',NULL,'0861996517','3283643570','info@worandk.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(518,0,NULL,NULL,'0858006305',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(519,0,'D\'ANDREA LORENZO',NULL,'0858279718','3290397016',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(520,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(521,0,'FOGLIA NEVIA',NULL,'0861714477','3470811313','info@joli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(522,0,'ANDREA/NEVIO',NULL,'0861714240','3477103596','nevadahotel@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(523,0,'SPINOZZI PAOLO',NULL,NULL,NULL,'n.celani@fifasecurity.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(524,0,'AMMINISTRAZIONE',NULL,'0861714744',NULL,'info@hotelmeripol.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(525,0,NULL,NULL,'0861714690',NULL,'info@hotelmeripol.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(526,0,NULL,NULL,'0861710423',NULL,'info@gdostudio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(527,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(528,0,'CALVARESE FABIO',NULL,NULL,'3286970779','calvarese.fabio@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(529,0,NULL,NULL,'02929271',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(530,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(531,0,'IL GRANDE FABIO',NULL,'0859040350',NULL,'fabio.ilgrande@mailexpress.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(532,0,NULL,NULL,'0861712143',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(533,0,'LOCCI LEONARDO',NULL,'0758518006',NULL,'ricambi@cmcmachinery.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(534,0,'MASSIMILIANO',NULL,'0717823969',NULL,'info@graphos.biz','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(535,0,'DI VINCENZO LUCA',NULL,NULL,'3895606001','abruzzo@sceltacivica.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(536,0,'SILVIA SILVIA',NULL,'0861252109',NULL,'info@neocomunicazione.it cesarinis@katameil.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(537,0,NULL,NULL,'0247921110',NULL,'info@datapromotiongroup.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(538,0,'LUCA LUCA',NULL,'0734632338',NULL,'grafichecm@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(539,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(540,0,NULL,NULL,'0861789040',NULL,'postvendita@auto4srl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(541,0,'Cacciagrano Lucio',NULL,'0858427921',NULL,'lucio.fcgrafica@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(542,0,'GIOVANNI',NULL,'0861713515',NULL,'nfo@capponiviaggi.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(543,0,NULL,NULL,'086182881','3282890725',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(544,0,'HOTEL EUROPA BEST WESTERN',NULL,NULL,'3482388010','direzione@htleuropa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(545,0,NULL,NULL,'0399899511','3466861200','assistenza.it@azolver.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(546,0,NULL,NULL,NULL,NULL,'daloia.claudia@pb.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(547,0,'MARCO',NULL,'0736898414',NULL,'capriotti.vannicola@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(548,0,'DANIELE',NULL,'06-41211411',NULL,'segreteria@luxurymedia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(549,0,'CESARINI FRANCESCO',NULL,'0733433730','3288533483','gaetano@tafgrafica.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(550,0,NULL,NULL,'086183111',NULL,'info@elettrabat.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(551,0,'VINCENZO MASSI',NULL,'073586420','3420417795','vincenzo.massi@lafenicesrl.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(552,0,'DOMENICO',NULL,'085930060',NULL,'d.perini@officineperini.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(553,0,NULL,NULL,'085930556',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(554,0,NULL,NULL,'0854917158',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(555,0,'MATTIA',NULL,'086183063','3284173817',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(556,0,NULL,NULL,'0859500752',NULL,'dvrmotors@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(557,0,'SIG.RA MORELLI',NULL,'0861243863',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(558,0,'CAPPELLETTI',NULL,'0861711745','3398335446','alba.revisioni@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(559,0,'LUCA',NULL,'0861211914',NULL,'lucaandrenacci@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(560,0,NULL,NULL,'0861211914',NULL,'oremrevisioni@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(561,0,'FRANCESCO BARLAAM',NULL,'0861781265',NULL,'officina.barlaam@jtmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(562,0,'ALBERT - STEFANO',NULL,'0854917967',NULL,'info@gruppocaldarone.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(563,0,'MARIELLA FARES',NULL,'0734937054',NULL,'aso@marchettigomme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(564,0,'UFF VENDITE MATTEO',NULL,'0861761940',NULL,'matteo@noleggioauto.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(565,0,'GIANNI',NULL,'0861781177','3398554220','info@autoservices.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(566,0,'MARCO DI MARTINO',NULL,NULL,'3490500559',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(567,0,NULL,NULL,'0861887126',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(568,0,'IOLANDA',NULL,'073642535','3385621700','info@autocenterap.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(569,0,'GIANNI',NULL,'0861855815','3391592690',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(570,0,NULL,NULL,'0649982736',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(571,0,'STRAMAGLIA CARLO',NULL,'0805796676','3382089269','carlo.stramaglia@postandservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(572,0,'DI PALO FRANCO',NULL,NULL,'3807549701',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(573,0,'Sandra Di Cuia',NULL,'08617681',NULL,'tributi@comune.martinsicuro.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(574,0,'PITTONI DARIO',NULL,'0119112090',NULL,'dariopittoni@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(575,0,'CARTENI VINCENZO',NULL,NULL,'3473465988',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(576,0,NULL,NULL,'0733892427',NULL,'autogattafoni@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(577,0,'CROCI MORENO',NULL,'073582272',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(578,0,'LEONE PAOLO',NULL,'0862404140',NULL,'info@arkhe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(579,0,NULL,NULL,'0735656285',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(580,0,NULL,NULL,'073641879',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(581,0,'ELVEZIO',NULL,NULL,'336/804860',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(582,0,'SIMONE SIMONE',NULL,'0734842564',NULL,'info@officinapiattoni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(583,0,NULL,NULL,'0733815450',NULL,'revisioni@delta-group.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(584,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(585,0,'DI SABATINO ORNELLA',NULL,NULL,NULL,'info@rnproduzioni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(586,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(587,0,'RIGONI STEFANO',NULL,NULL,'3388334415','rigoni.assicurazione@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(588,0,'PITTONI DARIO',NULL,'0119112090',NULL,'dariopittoni@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(589,0,'MOBILI L',NULL,'0733564794',NULL,'amministrazione@ellecommerciale.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(590,0,'CIAFRÈ MANRICO',NULL,'0861752311',NULL,'avv.manrico.ciafre@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(591,0,'IPPOLITI ADRIANO',NULL,'0861887405','3701106847','info@diamondgroup.it;sales@diamondgroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(592,0,'SIMONA',NULL,'0858041672',NULL,'opel.moscianese@moscianese.191.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(593,0,NULL,NULL,'085898784','3397081847','claudiodiremigio.fiat@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(594,0,NULL,NULL,'0861851849',NULL,'teramonord.operativo@gls-italy.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(595,0,NULL,NULL,'0909240474',NULL,'info@esseshop.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(596,0,'CERONI LUCA',NULL,NULL,'3383859975','acquisti@cartedigitali.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(597,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(598,0,NULL,NULL,NULL,NULL,'info@hotellasirenetta.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(599,0,NULL,NULL,'086182595',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(600,0,'MARTINA',NULL,'0861918321','3687886796','tributi@comunecivitelladeltronto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(601,0,NULL,NULL,'0861710423',NULL,'info@gdostudio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(602,0,NULL,NULL,NULL,'3294245402','lrecchioni@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(603,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(604,0,'SERAFINO PERPETUINI',NULL,'0861598694',NULL,'newcarsnc@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(605,0,NULL,NULL,NULL,'3287540598',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(606,0,'LUCA CERONI',NULL,'0734632963',NULL,'magazzino@formulabk.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(607,0,'CHIESA GIANNI',NULL,'0861712320','3487866324','info@hotel-principe.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(608,0,'Capriotti Marinella',NULL,'073639971','3476660472','tributi@comune.folignano.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(609,0,'PIERGIORGIO',NULL,'0861840260',NULL,'officinadigianvito@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(610,0,'FABIO URBINATI',NULL,'0735595051','3774718290','sbtconsas@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(611,0,NULL,NULL,'0733814049',NULL,'bbrevisioni@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(612,0,'BRUNO PRIMOMO',NULL,'087240074',NULL,'info@primomoezincarelli.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(613,0,NULL,NULL,NULL,NULL,'gommadiretto@delti.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(614,0,'SANTORO NICOLA',NULL,'0863332848','3315923423','info@agriè','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(615,0,'DAVIDE',NULL,'0858003045',NULL,'info@valentiniservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(616,0,'GIUSEPPE',NULL,'0861840853',NULL,'officinapugliaemilio@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(617,0,'ANNALISA',NULL,'0859064414',NULL,'dottavioantonio@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(618,0,'SIMONA DI MAIO',NULL,'0859064640',NULL,'carpointsnc@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(619,0,NULL,NULL,NULL,NULL,'registrazione@gse.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(620,0,'ROSINI ALDO',NULL,'0859772681','3356163291','grafica@igrgrafiche.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(621,0,NULL,NULL,'085 9772841',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(622,0,'Pietro Fiscaletti',NULL,'0736801262','3392240961','ragioneria@comune.acquasantaterme.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(624,0,'Pietro Fiscaletti',NULL,'0736856141','3392240961','ufficioragioneria@comunemontemonaco.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(625,0,'DEL TORO FRANCESCO',NULL,'0735782205',NULL,'info@logosys.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(626,0,'PAOLO',NULL,NULL,'3465158703','ecorigenerati@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(627,0,'FRANCA MARIANI',NULL,'0861855983',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(628,0,'TALEVI STEFANO',NULL,'07175070456',NULL,'talevi@rotoin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(629,0,'ADELE MELONI',NULL,'0736298264',NULL,'isabellap@comune.ascolipiceno.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(630,0,'MATTEO',NULL,'0717231588',NULL,'matteo@colasnc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(631,0,'SONIA',NULL,'0731-57943',NULL,'jar@marchenet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(632,0,'MARCO',NULL,'0733829061',NULL,'info@paoluccigomme.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(633,0,'CANDELA VINCENZO',NULL,'0918940111',NULL,'tributimontelepre@virgilio.it;comune.montelepre.pa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(634,0,NULL,NULL,NULL,NULL,'pianurareggiana@cert.provincia.re.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(635,0,'MAURO MORBIDONI',NULL,'0718046345',NULL,'amministrazione@bimo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(636,0,NULL,NULL,NULL,'35534222394',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(637,0,NULL,NULL,NULL,'35548300190','info@hotel-airportirana.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(638,0,NULL,NULL,'0861777126',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(639,0,'MIRKO',NULL,'0759696835','3288279876','commerciale@blustring.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(640,0,'TESTA',NULL,'0861031581','3492701670','p.testa@systeminnova.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(641,0,'M. MINICHILLI',NULL,'0861031581',NULL,'m.minichilli@systeminnova.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(642,0,'ENRICO MAZZARELLI',NULL,NULL,NULL,'enrico.mazzarelli@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(643,0,NULL,NULL,'08580000096',NULL,'gaglioti.ricambi@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(644,0,'SCARDECCHIA FEDERICO',NULL,'0861243083','3296349801','direzione@edilcassaabruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(645,0,'GUERCI RAFFAELA',NULL,'0732251703',NULL,'raffaela@inkarta.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(646,0,NULL,NULL,'0967486494',NULL,'segreteria@anutel.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(647,0,'VITALE EMILIANO',NULL,NULL,'3477654640','emilianovitale71@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(648,0,'GUIDO GUIDO',NULL,NULL,'3393577586','g.campana@comune.teramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(649,0,'Alessio Tosti',NULL,'0731719855','3351762776','a.tosti@palitalsoft.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(650,0,'A Marilungo','',NULL,NULL,'a.marilungo@palitalsoft.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(651,0,'CLAUDIO',NULL,'0734676234',NULL,'officina@montigomme.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(652,0,'LUCA',NULL,'073370493',NULL,'citroenparigi@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(653,0,'MAURO',NULL,'07147231855',NULL,'ma.pizzichini@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(654,0,'MAURIZIO IEZZI',NULL,NULL,NULL,'foresi@sangiorgioenergie.it;l.rusciano@ponyservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(655,0,'ALESSANDRO',NULL,NULL,'3391717288','alexcipo73@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(656,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(657,0,NULL,NULL,'0733203205',NULL,'info@rematarlazzi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(658,0,NULL,NULL,'0861806521',NULL,'u.dannuntiis@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(659,0,NULL,NULL,NULL,'3476996816','c.morrice@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(660,0,'Barbato Mario',NULL,'06905522324','3480172971','tributi@fonte-nuova.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(661,0,'Palumbo Linda',NULL,'06905522356','3471788155','lpalumbo@fonte-nuova.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(662,0,'DI GIUSEPPE MICHELE',NULL,'08616170337',NULL,'responsabile.tributi@comune.bellante.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(663,0,NULL,NULL,'0854154660',NULL,'gilber27@tatonettigilberto.191.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(664,0,NULL,NULL,NULL,'34839574678',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(665,0,'MARCHESANI TONINO',NULL,'0875959201',NULL,'toninomarchesani@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(666,0,'MARCO TIRABASSI','Amministrativo','07357941',NULL,'tirabassim@comunesbt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(667,0,'Anna Di Giovannantonio',NULL,'0861444211',NULL,'servizifinanziari@comune.castellalto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(668,0,'MORETTI MARA',NULL,'07175871',NULL,'mara.moretti@comune.recanati.mc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(669,0,'ANNIBALI',NULL,'07342841',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(670,0,'JESSICA',NULL,'0854322063',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(671,0,NULL,NULL,'0854710291',NULL,'tdaassistenza@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(672,0,NULL,NULL,'0861808010',NULL,'lamecferro11@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(673,0,NULL,NULL,NULL,NULL,'arcangelo.cotelessa@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(674,0,NULL,NULL,NULL,NULL,'info@hotelconteluna.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(675,0,'LUIGI',NULL,'0815540860',NULL,'rusciano_pm@progettomarketing.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(676,0,'SACCHI ANNAMARIA',NULL,'07191772826',NULL,'sacchian@comune.falconara-marittima.an.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(677,0,NULL,NULL,'0575720640',NULL,'imegagroup@unicapec.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(678,0,'RICCARDO',NULL,'0774381269','3477024918','sabinisrl@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(679,0,'FRANCESCA',NULL,'0516415151',NULL,'info@indecorevisioni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(680,0,NULL,NULL,'051403542',NULL,'info@elettrautodalla.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(681,0,'Vitelli Maria',NULL,'0872485132',NULL,'maria.vitelli@unionecomunifrentani.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(682,0,NULL,NULL,'086187911',NULL,'tributi@comune.atri.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(683,0,'ALBERTI CLAUDIA',NULL,'0365558611',NULL,'c.alberti@comune.sanfelicedelbenaco.bs.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(684,0,NULL,NULL,'0831590190',NULL,'marisped@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(685,0,'CAMPLESE FRANCESCO',NULL,'086182284',NULL,'camplese_francesco@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(686,0,'PASQUALE DE ANGELIS',NULL,'0736256586',NULL,'info@dselda.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(687,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(688,0,'Tamara Angelini',NULL,'0541608288','3315222646','tangelini@comune.riccione.rn.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(689,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(690,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(691,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(692,0,'Nadia Donatelli',NULL,'085829401',NULL,'entrate@comune.loretoaprutino.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(693,0,'ELISA MORETTI',NULL,'07336411',NULL,'enzo.ciciliani@comune.sanseverinomarche.mc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(694,0,NULL,NULL,'0733850127','3331074410','autofficina.zacconi@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(695,0,NULL,NULL,'0645477837',NULL,'russarco@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(696,0,'TARABORRELLI GIUSEPPE',NULL,'0871801054',NULL,'info@regiesrl.it; nico.taraborrelli@regiesrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(697,0,'NEPA CABIRIA',NULL,'0861612701',NULL,'commerciale@nepa.it; info@nepa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(698,0,NULL,NULL,NULL,'3347391818','c.m.m.mariani@legalmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(699,0,'Angela Bua',NULL,'0296661340',NULL,'angela.bua@ceriano-laghetto.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(700,0,'LAURA D’ANGELO',NULL,'065050571',NULL,'laura.dangelo@brizzi-italia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(701,0,'Angela Budan',NULL,'087331681',NULL,'ufficiotributi@comunedicupello.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(702,0,'Marika Zacchilli',NULL,'0716629431',NULL,'m.zacchilli@comune.senigallia.an.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(703,0,'GIOVENZANA ENZO',NULL,'0392261139',NULL,'enzo.giovenzana@entedigitaletributi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(704,0,NULL,NULL,'0854453664',NULL,'f.buzzelli@stesnc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(705,0,NULL,NULL,'051767902',NULL,'amministrazionegpz@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(706,0,NULL,NULL,'0717108856',NULL,'mengoniservicesrl@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(707,0,'UFFICIO TRIBUTI',NULL,'08748281',NULL,'comune.larinocb@legalmail.it;larino.cb@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(708,0,'BERNARDA BERNARDA',NULL,'0734710750',NULL,'personale@comunefalerone.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(709,0,'MONICA REUCCI',NULL,'0865449299',NULL,'entrate@comune.isernia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(710,0,'BERARDINELLI CINZIA',NULL,'0854962934','3471949834','cinzia.berardinelli@spoltoreservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(711,0,'RIVA PAOLA',NULL,'039698541',NULL,'segreteria@camunecomparada.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(712,0,NULL,NULL,'0863789139',NULL,'ragioneria@comunediaielli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(713,0,'Valeria Felli',NULL,'0863-84281',NULL,'serviziotecnico@comune.pescina.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(715,0,'AFFATATO GIUSEPPE',NULL,NULL,'3939154626',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(716,0,'IANNARELLI KRISTIAN',NULL,'0865414347',NULL,'kristian@graficaisernina.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(717,0,'MARCO',NULL,'071-6608333',NULL,'marcofrulla@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(718,0,'Maurizio Mercuri',NULL,'07346801',NULL,'maurizio.mercuri@comune-psg.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(719,0,'Bracalente Caterina',NULL,'0734680252',NULL,'caterina.bracalente@comune-psg.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(720,0,'Francesca Ciccotosto',NULL,'0873340227',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(721,0,'Daniela Felicioni',NULL,'0736892271','3473479783','ufficio.tributi@comune.collideltronto.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(722,0,'MARIOTTI',NULL,'07349081',NULL,'psetributi@elpinet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(723,0,'GUANDALINI NADIA',NULL,'059649661',NULL,'nadia.guandalini@comune.carpi.mo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(724,0,'FEDERICA CESTARI',NULL,NULL,NULL,'federica.cestari@comune.carpi.mo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(725,0,'POMPEI MAURILIO',NULL,'0734631443',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(726,0,'MARINI ANASTASIA',NULL,'073484871',NULL,'tributi@comune.monteurano.fm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(727,0,'ELISA GALLI',NULL,'0516059240',NULL,'daniela.bianchi@comune.castenaso.bo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(728,0,'PAOLONI FEDERICA',NULL,'0733509112',NULL,'ufficiotributi@loropiceno.sinp.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(729,0,'ANTONIO',NULL,'08551580',NULL,'cetrullo@autofficinacetrullo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(730,0,'BENIAMINO',NULL,'0733299070',NULL,'matteuccifotino@avant.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(731,0,'MAURO',NULL,'0721279327',NULL,'mauro.lazzarini@gabellini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(732,0,'MARIA',NULL,NULL,NULL,'maria.scoccimarro@gabellini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(733,0,'CARNEVALI SABRINA',NULL,'0731229117','3357298314','s.carnevali@apra.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(734,0,'CARUCCI ERMANNO',NULL,NULL,NULL,'ermanno.carucci@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(735,0,'Melissa Galli',NULL,'086156011',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(736,0,'IRENA MARCONE',NULL,'086164112',NULL,'ragioneria@comunedicortino.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(737,0,'MARIO NASUTI',NULL,'0872712479',NULL,'revicarsrl@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(738,0,'VIRARDI GIANFRANCO',NULL,NULL,'3282747640',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(739,0,'CHEMERI PAOLO',NULL,NULL,'3287819540','gaetano@tafgrafica.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(740,0,'VOLTA MANUELA',NULL,'0516161681',NULL,'mvolta@comune.zolapredosa.bo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(741,0,'DONVITO MARCO',NULL,NULL,'3394165103','marcodon71@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(742,0,'TAPPANI MARCELLO',NULL,'0523578461',NULL,'revisionitappani@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(743,0,'RASICCI EMANUELE',NULL,'0861856630',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(744,0,'MARINI',NULL,'0858002926','3357387653','flavio.marini@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(745,0,'MAURIZIO',NULL,'0761250595',NULL,'fratelli.cencioni@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(746,0,'MASSIMO',NULL,'0854459921','3355966522','massimo.toscano.adserv@concessionaria.renault.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(747,0,'CORRADO',NULL,'0863411851','3475191367','gmmauto@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(748,0,'CATERINA',NULL,'0861-848210',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(749,0,'DAVIDE',NULL,'051729433','3200134776','davide@centrorevisioniborgo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(750,0,NULL,NULL,'051465297',NULL,'revisionisanlazzaro@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(751,0,'CRISTIAN',NULL,'0522957063',NULL,'crb_crb@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(752,0,'TIZIANA ALAURA',NULL,'055352921',NULL,'info@cef-firenze.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(753,0,NULL,NULL,'0521492277',NULL,'ccautoservice@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(754,0,NULL,NULL,NULL,NULL,'fornitori@terredargine.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(755,0,NULL,NULL,NULL,NULL,'recuperocrediti@unione.terredargine.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(756,0,'FRANCO',NULL,'0697652016',NULL,'mattiapneumatici@fastwebnet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(757,0,'MAURIZIO',NULL,'059620211',NULL,'valentina.napolitano@lacarpi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(758,0,NULL,NULL,NULL,NULL,'info@lacarpi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(759,0,NULL,NULL,NULL,NULL,'mattia.villani@autoeauto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(760,0,'GIUSEPPE',NULL,'0521290421',NULL,'michela.santi@autoeauto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(761,0,'LORENZO',NULL,'0574658511',NULL,'autofficinall@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(762,0,'TERESA',NULL,'062313524',NULL,'autogas.turchetta@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(763,0,'LIA',NULL,'0522621300','3336025174','dueeffesnc@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(764,0,NULL,NULL,'059526466',NULL,'autobenetti@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(765,0,'LUCIANO',NULL,'0131249831',NULL,'revisioni.cristo@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(766,0,NULL,NULL,'0766540579',NULL,'civitagomme1@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(767,0,'GINO',NULL,'0689681024','3341086969','bianchigomme@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(768,0,NULL,NULL,NULL,NULL,'boocciaaa@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(769,0,NULL,NULL,'0690531937',NULL,'autofficinagalantini@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(770,0,'LUIGI',NULL,'0521813808',NULL,'elettric.cars@boschcarservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(771,0,'LEONARDO BAGNOLO',NULL,'0685568210',NULL,'l.bagnol@ismea.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(772,0,'LORENZO',NULL,'0859461413',NULL,'gruppostampaadriatico@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(773,0,'CERRONI MARIO',NULL,'087257542',NULL,'revisioni@topservicecerronemario.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(774,0,'ARMANDO',NULL,'0690015534',NULL,'armando_stocchi@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(775,0,'ANNA LENTISCO',NULL,'069004460',NULL,'lentisco.a@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(776,0,NULL,NULL,NULL,NULL,'lentiscogomme@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(777,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(778,0,'GIACOMO',NULL,'0141271257',NULL,'info@carrozzeriadante.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(779,0,'MARCELLO',NULL,'0375201455',NULL,'bandirinimarcello@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(780,0,NULL,NULL,'0558050233',NULL,'info@revisauto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(781,0,'LUIGIA',NULL,NULL,'3290928231',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(782,0,'DANILO',NULL,'0152493731',NULL,'biellarevisioni@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(783,0,'GIOACCHINO/SANDRA',NULL,'0113473438',NULL,'info.autocagnazzi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(784,0,'SABRINA',NULL,'0141216305',NULL,'autoindue@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(785,0,'SOFIA',NULL,'0514126904',NULL,'revisioni@carindy.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(786,0,NULL,NULL,'0522641944',NULL,'revisionipegaso@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(787,0,'LUIGI',NULL,'067918142',NULL,'pulsoniluigi@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(788,0,'CLAUDIO',NULL,'0672901284','3493314330','claudio@giuliangeli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(789,0,'DI BATTISTA IDA',NULL,'0735657715','3355755071','creativetime@chosentime.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(790,0,NULL,NULL,'059280112',NULL,'info@car-service.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(791,0,'ARMANDO',NULL,'0119530331',NULL,'mp.car@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(792,0,'ANGELITA',NULL,'0113583074',NULL,'info@donetto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(793,0,'LUCIANO',NULL,'0119040297',NULL,'carservice.revisioni@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(794,0,'ELISA',NULL,'0116289526',NULL,'info@ora.to.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(795,0,'LUONGO NICOLINA',NULL,'0974370716',NULL,'tributi@comune.centola.sa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(796,0,'ROCCOLINO',NULL,'08659061',NULL,'protocollo@pec.comune.venafro.is.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(797,0,NULL,NULL,'08597401',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(798,0,NULL,NULL,'08635061',NULL,'comune.lucodeimarsi.aq@pec.comnet-ra.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(799,0,'CLAUDIO ZECHINI ',NULL,'086393121',NULL,'tributi@comune.trasacco.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(800,0,'VERRIGNI ELENA',NULL,'0859357262',NULL,'elena.verrigni@comune.silvi.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(801,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(802,0,NULL,NULL,'0735585790',NULL,'info@idroclean.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(803,0,'ANDREA',NULL,'051943751',NULL,'andrea.b@dalfiume.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(804,0,'MILENA',NULL,'0119539809',NULL,'infonatale@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(805,0,'TIBERI CRISTIAN',NULL,'0735587129','3293384767','hertz@sanbenedetto@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(806,0,NULL,NULL,'0761598148',NULL,'civitarevisioni@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(807,0,NULL,NULL,'0542643186',NULL,'bfthesi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(808,0,'SERENA',NULL,'0112074898',NULL,'info.csa_borgaro@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(809,0,'FRANCESCA',NULL,'0761507327',NULL,'cugusiautosnc@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(810,0,'NUNZIO',NULL,'0119845788',NULL,'autoriparazionipunto@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(811,0,'FRANCESCA',NULL,'068181294',NULL,'petriccafiat@valentinicargroup.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(812,0,'LUCA',NULL,'0571956080',NULL,'info@autofficinaurora.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(813,0,'MARCO',NULL,'0119071151',NULL,'coriautoriparazioni@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(814,0,'FABIO',NULL,NULL,'3487428248',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(815,0,'ROBERTO',NULL,'0119625754',NULL,'boscolo14@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(816,0,'SERGIO',NULL,'0119114466',NULL,'sergiodragotta@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(817,0,'MARCELLO',NULL,'057366166',NULL,'info@fratellicorilli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(818,0,'FABIO',NULL,'0522833180',NULL,'fabio.mb3@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(819,0,'MAURO',NULL,'0522801211',NULL,'bonicelli.m@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(820,0,'GIACOMO',NULL,'055752241',NULL,'autofficina.nucci@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(821,0,'GIANCARLO',NULL,'0571652405',NULL,'autofficinamorelli@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(822,0,'MAURIZIO',NULL,'0571667575',NULL,'maurizio@maestriniauto.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(823,0,NULL,NULL,'058387452',NULL,'info@comune.coreglia.lu.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(824,0,'GIUSEPPE',NULL,'0116069317',NULL,'autosangone@tiscalinet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(825,0,'NADIA',NULL,'0142453345',NULL,'amministrazione@grignoliofiat.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(826,0,'MANUELA MORRESI',NULL,'07332561',NULL,'tributi@comune.macerata.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(827,0,'NADIA',NULL,'012249691',NULL,'revisioni.garda@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(828,0,'MASSIMILIANO',NULL,'065895653',NULL,'lanarim@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(829,0,'ORSI',NULL,'058472186',NULL,'offorsi@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(830,0,'RICCIONI',NULL,'063039208','3317013759','damric@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(831,0,'TEST',NULL,'0187493265',NULL,'ivagale@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(832,0,'DEBORA',NULL,'052599152',NULL,'leonardi20@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(833,0,'ELISABETTA',NULL,'0522844931',NULL,'rivercarsrl@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(834,0,'DARIO',NULL,'0376535395',NULL,'pradelladario@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(835,0,'GIOVANNONI',NULL,'0571667731',NULL,'officina.giovannoni@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(836,0,NULL,NULL,'0161852262',NULL,'massazza@pegasusgroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(837,0,'RICCARDO',NULL,NULL,NULL,'riccardo.mantovani@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(838,0,'CARMINE',NULL,'012248846',NULL,'centrorevisioni@centrorevisioni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(839,0,'SALIERNO',NULL,'0421592235','3478685413','alberto.salierno@comune.musile.ve.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(840,0,'ELENA',NULL,'0532866259',NULL,'elenaantonioli@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(841,0,'VALENTINA',NULL,'069397518',NULL,'lombi_auto@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(842,0,'LUCIA',NULL,'0577938803',NULL,'lucia.pampaloni@concessionariarenault.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(843,0,'BRASCA ANNA',NULL,'0733601952',NULL,'tributi@cingoli.sinp.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(844,0,'ALESSANDRO',NULL,'0532893113',NULL,'info@gattiauto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(845,0,'MICHAEL',NULL,'053668842',NULL,'nuovafanauto@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(846,0,'FABIO',NULL,'0633610639','3393315131','revisioni@tuttauto87.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(847,0,'GLAUCO',NULL,'0522856368','343015585','amministrazione@tecnoautore.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(848,0,NULL,NULL,NULL,NULL,'revisioni@tecnoautore.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(849,0,'RAFFAELE',NULL,'08551860',NULL,'litoaterno@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(850,0,'GABRIELLA ZUCCARINI',NULL,'0861698014',NULL,'finanziario@comunetossicia.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(851,0,'ANIO',NULL,'0533993762',NULL,'servizi@autoscuola2000.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(852,0,'DANILO',NULL,'0521686488',NULL,'ceresiniauto@ceresiniautosnc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(853,0,'Lorena Giansante',NULL,'0859730208','3299813487\r','finanziario@comune.pianella.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(854,0,'STEFANIA DI EGIDIO',NULL,'0717134102',NULL,'acquisti@asso-osimo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(855,0,'BARBARA',NULL,'0571930209',NULL,'barbara@elettrodieselcampani.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(856,0,'GIUSEPPE',NULL,'0744813690',NULL,'giuseppe.massoli@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(857,0,'ROBERTA',NULL,'06416143',NULL,'roberta.petrosino@polimar.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(858,0,'GIUSEPPE',NULL,NULL,NULL,'giuseppe.costantino@polimar.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(859,0,'MASSIMO',NULL,'066276396',NULL,'m.scalini@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(860,0,'ANNALISA',NULL,'0119536348',NULL,'annalisa.g@igline.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(861,0,'SILVANO',NULL,'053496206','3385909013','info@vanninisas.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(862,0,'Giorgio Colaguori',NULL,'0771732229',NULL,'giorgio.colaguori@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(863,0,NULL,NULL,NULL,NULL,'tributi@comune.itri.lt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(864,0,'FABIO',NULL,'0119348699','3338780400','europa3csa@live.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(865,0,'SILVANO',NULL,'053496206',NULL,'info@vanninisas.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(866,0,'MARCO ALESSANDRINI',NULL,'0744800707',NULL,'info@revisioniterni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(867,0,'MARCO',NULL,NULL,'3355610379','marco.robba@nuova-autofrance.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(868,0,'FERNANDO GATTA',NULL,'0864740134',NULL,'villalagotributi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(869,0,'ROBERTA PERUGINA',NULL,'0733560711',NULL,'roberta.perugini@comune.montecosaro.mc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(870,0,NULL,NULL,'0571464710',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(871,0,'ALESSIO',NULL,'055721214',NULL,'info@officinaelettrodiesel.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(872,0,'CHIARA',NULL,'0558416359',NULL,'autofficinamario@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(873,0,'SIG.RA MONIA',NULL,'035693213',NULL,'officinaponti@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(874,0,'Attilio Macellari',NULL,'0717599736',NULL,'economato@comune.porto-recanati.mc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(875,0,NULL,NULL,'0717599735',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(876,0,'SARA MALFATTI',NULL,NULL,NULL,'sara_pisana@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(877,0,'VALENTINA BIAGETTI',NULL,NULL,NULL,'amministrazione@toscanamotorisrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(878,0,'MASSIMO NIZZI',NULL,NULL,NULL,'massimonizzi@fratellinizzi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(879,0,'VINCENZO',NULL,NULL,NULL,'futur_car@boschcarservice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(880,0,'FLAVIO FEDERICI',NULL,NULL,NULL,'flaviofederici@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(881,0,'GABRIELLA',NULL,NULL,'3351985769','lgmotorssrl@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(882,0,'MARCELLO|',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(883,0,'Draghelli Roberta',NULL,'0719330572','3208121033','roberta.draghelli@comune.sirolo.an.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(884,0,'WANDA E RENATO',NULL,'035571079','3402344217','renato.moto@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(885,0,'SIMONI',NULL,'0736-304122',NULL,'ufficiotributi@comune.maltignano.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(886,0,NULL,NULL,'0734466285',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(887,0,'GIOVANNI',NULL,'035928180','3404698767','officinafenaroli@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(888,0,'WILMA',NULL,'0861502215',NULL,'finanziaria@comune.montorio.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(889,0,'SERGIO PETRI',NULL,'050985461',NULL,'servicarpisa@tin.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(890,0,'Impera Palmiro',NULL,'0961964125','3288105713','tributi.selliamarina@asmepec.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(891,0,'SCIORILLI ANTONIO',NULL,NULL,NULL,'commerciale@finiirrigazione.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(892,0,'SIGHIERI SILVIA',NULL,'050830105','3495664354','revisioni@sighieri.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(893,0,'DE ANGELIS',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(894,0,'DANIELA VALFRE',NULL,'0141991510',NULL,'info@valleversa-monferrato.at.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(895,0,NULL,NULL,'0861-975926',NULL,'bilancio@isoladelgransasso.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(896,0,'SILVANA MARANO',NULL,NULL,'3333084315','s..marano@comune.isola.te.it ','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(897,0,'MICHELE BERARDI',NULL,'0872850421',NULL,'michele.berardi@comunediatessa.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(898,0,'MARIA CRISTINA SARGENTI',NULL,NULL,NULL,'info@12punto3.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(899,0,'PETRUCCI CARLO',NULL,NULL,'3381856685','petruccicarlo@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(900,0,'CORRADO',NULL,'0544502419',NULL,'info@corradogomme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(901,0,'CACCIATORE GUIDO',NULL,'08611886383','3802666223','gcacciatore@m4l.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(902,0,'SABINA FORNARI',NULL,'0536953814',NULL,'sabinafornari@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(903,0,'LELLI DEBORA',NULL,NULL,'3203807697','delex8992@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(904,0,'FABIO',NULL,'0522865582',NULL,'info.autostop@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(905,0,'SANDRO',NULL,'0113490974',NULL,'crbisrl@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(906,0,'GIUSEPPE',NULL,'034520033',NULL,'tcr@trainisanto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(907,0,'L. AMORELLO',NULL,'06909691',NULL,'tributi@cittadimentana.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(908,0,NULL,NULL,'051956218','3277333704','eco.carsrls@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(909,0,'CATENARO FLORINDO FABRIZIO',NULL,'0872711772','3476928146',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(910,0,'TOMMASO FASANO',NULL,'0832359321',NULL,'amministrazione@fratellifasano.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(911,0,'BRUNO MURDOCCO',NULL,NULL,NULL,'info@autofficinabruno.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(912,0,'SIG. MARIANO MARIANO',NULL,'0735584167',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(913,0,'VOLTERRA ANDREA',NULL,NULL,NULL,'ag5900@saraagenzie.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(914,0,'STEFANELLI ROBERTO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(915,0,'STEFANELLI ROBERTO',NULL,NULL,NULL,'roberto.stefanelli@zavoli.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(916,0,NULL,NULL,'0832969597',NULL,'comune.veglie@clio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(917,0,'COLOMBO ANDREA',NULL,NULL,'3382448324','andreacolombo70@msn.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(918,0,'DOTT.SSA VALENTINA RACCIATTI',NULL,'0854406010',NULL,'v.racciatti@sgtmultiservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(919,0,'Raimondo Cianci',NULL,'0873919125',NULL,'tributi@comunediscerni.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(920,0,'ENRICO',NULL,'0690819626',NULL,'carrozzeriantonelli@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(921,0,'SIG.LILIANA',NULL,'035217321',NULL,'alberti.snc@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(922,0,'LUCA',NULL,'0110437048',NULL,'info@crvservice.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(923,0,'MARCO',NULL,'0119961841',NULL,'tassoautoriparazioni@interfree.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(924,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(925,0,'GIOVENZANA ENZO',NULL,NULL,'3427113672','enzo.giovenzana@ideafinanza.com;','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(926,0,'MARIALISA GALBIATI',NULL,NULL,NULL,'marialisagalbiati@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(927,0,'MASSIMO',NULL,'0119624145',NULL,'chisolautosnc@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(928,0,'LUCCHESI CRISTIAN',NULL,NULL,'3473781970',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(929,0,'ORSETTI MARIO',NULL,'0583710227','3386531272','taracchi1976@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(930,0,'MELINO PASQUALE',NULL,'0854503233',NULL,'relaximmobiliare@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(931,0,'FAUSTO SERVADIO',NULL,'0693789258',NULL,'fausto.servadio@comune.lanuvio.rm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(932,0,'DE RITIS MASSIMILIANO',NULL,NULL,'3355653997','deritis@katamail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(933,0,'MILENA',NULL,'035639050',NULL,'info@brunomoto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(934,0,'FORNERIS GIOVANNI',NULL,'0110563661','3939012726','info@effegomme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(935,0,'STEFANO BELTRAMI',NULL,'059-463393',NULL,'carrozzeriabeltrami@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(936,0,'Gianpaolo Giampaolo',NULL,'0734600758','3487707805','info@sielsrl.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(937,0,'MARCO MARCO',NULL,'08613232',NULL,'info@pec.ruggierigroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(938,0,'CAPRIOTTI PATRIZIA',NULL,'0858003108',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(939,0,'Annarita Zulli',NULL,'08718086243',NULL,'tributi@guardiagrele.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(940,0,'SERENA',NULL,'067481070',NULL,'autocentri_cinecitta.rac@citroen.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(941,0,'RAPARI MASSIMO',NULL,'0734858584',NULL,'info@croceazzurrasem.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(942,0,NULL,NULL,'086378126',NULL,'ufficiotecnico@sigiservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(943,0,NULL,NULL,'07178291',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(944,0,'BALDUCCI MICHELE',NULL,'085-53742',NULL,'info@gisicart.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(945,0,'LORENZO BRUSCIATI',NULL,'0721828795',NULL,'revisioni@fordeusebi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(946,0,'DARIO GIOVANNINI',NULL,'0861887527',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(947,0,NULL,NULL,'0641404646',NULL,'info@lgautomotivecenter.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(948,0,NULL,NULL,'0854481503',NULL,'pventrella@comune.montesilvano.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(949,0,'Ventrella',NULL,NULL,NULL,'ragioneria@comune.montesilvano.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(950,0,'Giorgia Branciaroli',NULL,'086188098','3405084407','tributi@comune.santomero.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(951,0,'GIUSEPE TOTORIZZO',NULL,'0803389383','3299032998','commerciale@totorizzo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(952,0,'MARCO D\'OTTAVIO',NULL,'08613232',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(953,0,'SIGNORELLI PIETRO E MICHELA',NULL,'035314479',NULL,'signorellipietro@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(954,0,'ANDREA DELL’ORSO',NULL,'0857993522','3477065181','andrea@inwebadriatico.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(955,0,NULL,NULL,'0859432510',NULL,'info@staexpress.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(956,0,NULL,NULL,'800978434',NULL,'info@explorasrl.net;assistenza@explorasrl.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(957,0,'LAZZARINI RAFFAELE',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(958,0,'CALGARO MARINA',NULL,'0163840982','3201710826','m.calgaro@comune.ghemme.novara.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(959,0,'ARMILLEI ALVARO',NULL,NULL,'3384290011','info@ap-posta.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(960,0,'SAVINI MAURO',NULL,'0861786115','3473661512',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(961,0,'SICHETTI LORENZO',NULL,'0859117496',NULL,'info@epigrafia.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(962,0,'CAPPELLI FURIO',NULL,NULL,'3497731002','furiocap72@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(963,0,'VITELLI',NULL,'087280821',NULL,'tributi@comune.paglieta.ch.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(964,0,'Giorgini Leda',NULL,'085895145',NULL,'leda.giorgini@comunemorrodoro.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(965,0,'Mauro Savini',NULL,'0861950110',NULL,'economato@comunedicrognaleto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(966,0,'F. Scipione',NULL,NULL,NULL,'fscipione@comune.formia.lt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(967,0,'T. Livornese',NULL,'0771778368',NULL,'tlivornese@comune.formia.lt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(968,0,'Daniele Rossi',NULL,'0771778410',NULL,'drossi@comune.formia.lt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(969,0,'FAGOTTI DIVO',NULL,NULL,'3299431804','info@creadivo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(970,0,'Del Giudice Antonio',NULL,'0771-607832','3476084601','antonino.delgiudice@comune.santicosmaedamiano.lt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(971,0,'MARCHEGGIANI ALESSIO',NULL,'0859463151','3470625449','commerciale@rotopac.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(972,0,'FONZO GIOIA',NULL,'0871869378',NULL,'amministrazione@briopack.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(973,0,'DENTALCOOP FRANCESCA',NULL,'0861711647',NULL,'amministrazione.martinsicuro@dentalcoop.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(974,0,'CIRILLO MARIO',NULL,'0899848611','3939462275','info@innotechitalia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(975,0,'PINO CASCIOLI',NULL,'073578411',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(976,0,'DELLA PATRIA GIUSEPPE DELLA PATRIA',NULL,'0832-360861',NULL,'ufficiotributi@comune.surbo.le.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(977,0,'Giostra Stefano',NULL,'0735-704218',NULL,'tributi@comune.monsampolodeltronto.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(978,0,'GIUSTI SAMANTA ',NULL,'0566843211',NULL,'s.giusti@comune.gavorrano.gr.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(979,0,'D\'Addezio Cecilia',NULL,'0863851391',NULL,'bisegnacomune@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(980,0,'Vita Mariella',NULL,'0804445204','3298872379','ragioneria@comune.cisternino.br.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(981,0,'CIAMPELLA ROBERTO',NULL,NULL,'3489440316','ciampella@almasolutions.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(982,0,'LUCIANA',NULL,'0861-611028',NULL,'amministrazione@nibafd.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(983,0,'AUTOMOBIL CLUB ITALIA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(984,0,'MORETTI MONICA',NULL,'0734623314','3934385990','fermo@nialmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(985,0,'DI GAETANO ALBERTO',NULL,NULL,'3276919174','aldig77@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(986,0,'RAG. MARINO TOMEO',NULL,'0865960131',NULL,'tributi@comune.montaquila.is.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(987,0,'Fabio Il Grande',NULL,'0859040350','3493048813','fabio.ilgrande@mailexpress.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(988,0,NULL,NULL,NULL,'3462875147',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(989,0,'TRANQUILLO DEBORA',NULL,'0736-43300',NULL,'colorain@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(990,0,'LISET NYLAND',NULL,'0859771404','3932774057','nyland@icaro-srl.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(991,0,'Giuseppe D\'Angelo',NULL,'0736899060',NULL,'giuseppe.dangelo@comune.spinetoli.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(993,0,NULL,NULL,'0269682636',NULL,'supportit@lexmark.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(994,0,'FRANCESCA /WALTER',NULL,NULL,NULL,'amministrazione.martinsicuro@dentalcoop.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(995,0,'Emilio Famiglini',NULL,'0731538441',NULL,'protocollo.comune.jesi@legalmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(996,0,'ANTONELLA DELLAMANDOLA',NULL,'0185680210',NULL,'antonella.dellamandola@comune.rapallo.ge.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(997,0,NULL,NULL,NULL,NULL,'tributi@comune.rapallo.ge.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(998,0,NULL,NULL,NULL,NULL,'info@staminafitness.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(999,0,'BROCCOLETTI',NULL,NULL,'3284192081',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1000,0,'SERRONE LUISA',NULL,'0734-673307',NULL,'societaoperaiapsg@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1001,0,NULL,NULL,'086183346',NULL,'service@nctec.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1002,0,'GIUSEPPE ROSSI',NULL,'0854967242',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1003,0,NULL,NULL,NULL,'3472884398','custservice@databshop.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1004,0,NULL,NULL,NULL,'3473922362','elva.cordivani@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1005,0,'Caggiula Alessandro',NULL,NULL,NULL,'dirigenteag@comune.copertino.le.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1006,0,'FERRETTI FABIO',NULL,'0736256521',NULL,'amministrazione@postalab.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1007,0,'DI STEFANO LINDA',NULL,'085835008',NULL,'linda@grafcolor.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1008,0,'MAURIZIO',NULL,NULL,'3487093148','direzione@ddspromotion.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1009,0,'MARCELLINI MARCO',NULL,NULL,NULL,'ordini@farmicol.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1010,0,NULL,NULL,NULL,NULL,'ascoli@postapower.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1011,0,NULL,NULL,'0237904021',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1012,0,'PAGLIACCI ANDREA',NULL,'075-075075',NULL,'a.pagliacci@gesenu.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1013,0,'DI MARCO IVAN',NULL,NULL,'3494742729','info@dimensionemarketing.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1014,0,NULL,NULL,'0375820611',NULL,'dac.info@dacsrl.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1015,0,'CHIARA',NULL,'041990215',NULL,'teamracing.amm@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1016,0,NULL,NULL,'0119868117',NULL,'contatti@hardware-planet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1017,0,'PIERO ERAMO',NULL,'0854313620',NULL,'info@confcommerciopescara.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1018,0,'PATRIZIA',NULL,'0424470772',NULL,'patrizia.bertollo@appalti.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1019,0,'SORGENTONE ROBERTO',NULL,'0735659885',NULL,'ams@sbt.it;sorgentone@sbt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1020,0,'MARIA',NULL,NULL,'3338677657',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1021,0,'DALL’OCCO MAURO',NULL,'02924361',NULL,'mauro.dallocco@pli-petronas.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1022,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1023,0,NULL,NULL,'0861887527',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1024,0,'DE ANGELIS MARIA',NULL,'08639081',NULL,'ufficiotributi@comune.carsoli.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1025,0,'LUCIA GIOIA',NULL,'0831732222',NULL,'tributi@comune.mesagne.br.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1026,0,'FRANCESCO',NULL,'0415319071',NULL,'revisioni@topcarautofficina.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1027,0,NULL,NULL,NULL,NULL,'reweicoli@reweicoli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1028,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1029,0,'IVAN',NULL,NULL,NULL,'info@dimensionemarketing.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1030,0,'LUIGI RUSCIANO',NULL,NULL,'3934486376','rusciano_pm@progettomarketing.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1031,0,'LAURATO UMBERTO',NULL,NULL,'3393942427','aut.laurato@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1032,0,'Iale Monia',NULL,'0863998131',NULL,'ragioneria@comune.roccadibotte.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1033,0,'Serenella Simeone',NULL,'07714691','3471473441','serenella.simeone@comune.gaeta.lt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1034,0,'Serenella Simeone',NULL,'0771469230',NULL,'funzionario.tributi@comune.gaeta.lt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1035,0,'Lorena Galli',NULL,'0296720202',NULL,'tributi@lazzate.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1036,0,'ELISA VISSANI',NULL,NULL,'3394475256','elisa@professionepiscina.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1037,0,'RAGAZZINI PATRIZIA',NULL,'0516928300',NULL,'tributi@terredipianura.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1038,0,'SCIARRETTA ERNESTO',NULL,'800642853','3273953700','amministrazione@upgrade1.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1039,0,NULL,NULL,'0432676335',NULL,'info@autodel fratwe.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1040,0,'DR. CARLO DEL BELLO',NULL,NULL,'3383121021','info@protesyca.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1041,0,'CECCHINI CLAUDIO',NULL,'0861797392','3339084392','ce.cla63@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1042,0,'CONTI GIACOMO','Amministrativo','0721860543','3482510433','amministrazione@suoloesalute.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 18:06:25'),
(1043,0,'BINI GUSEPPE',NULL,NULL,'3356365985','bini@autosystem.srl','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1044,0,NULL,NULL,'0550516134',NULL,'commerciale@autosystem.srl','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1045,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1046,0,'SCATAGLIA MIRCO',NULL,'0861855296','3891589873',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1047,0,NULL,NULL,'0861887290',NULL,'kovalgroupit@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1048,0,'SIMONETTI ELISA',NULL,'0736814580',NULL,'commerciale@gruppobattage.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1049,0,'ELEONORA DI GIUSEPPE',NULL,'0861758121',NULL,'info@novatools.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1050,0,'LUCA LELII',NULL,NULL,'3807579969',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1051,0,'CLAUDIA',NULL,'0862755096',NULL,'posta@artigraficheaquilane.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1052,0,'MARINO',NULL,NULL,'3337828591',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1053,0,'DOTT. FERRAIOLI GIAMPIERO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1054,0,NULL,NULL,'0516611711',NULL,'paola.donati@terredipianura.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1055,0,NULL,NULL,'0516622411',NULL,'carla.bellabarba@terredipianura.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1056,0,NULL,NULL,'0852190140',NULL,'comm@dieffematic.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1057,0,'DI SILVESTRO GIOVANNI',NULL,NULL,'3294613911','gdsautomazioni2001@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1058,0,NULL,NULL,'0236522990 ',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1059,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1060,0,'ANTONELLO BATTUELLO',NULL,'800911470',NULL,'info@francolabs.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1061,0,'DGSTORE',NULL,'0194503952',NULL,'info@dgstore.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1062,0,'DI MATTEO E PARIS',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1063,0,NULL,NULL,'0269496949',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1064,0,NULL,NULL,'086440116',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1065,0,'CIARBONETTI NADIA',NULL,'0861241838',NULL,'info@ipasviteramo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1066,0,'TOSORONI FRANCESCO',NULL,'0733492153',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1067,0,NULL,NULL,'0773666099',NULL,'winteltelefonia@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1068,0,NULL,NULL,'0861856584','337666328','info@carrozzeriamaster.it |','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1069,0,'MONICA MONICA',NULL,'0776466094',NULL,'tiseo2.rac@citroen.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1070,0,NULL,NULL,'07731875812',NULL,'info@prokoo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1071,0,'GORACCI GIANFRANCO',NULL,'0671584320',NULL,'info@goraccisergio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1072,0,'ANTONIO TUCCI',NULL,NULL,'3383359096','antonio.tucci@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1073,0,'NICOLA NICOLA',NULL,NULL,NULL,'nicola_devita@yahoo.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1074,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1075,0,'LAURENZI DANIELE',NULL,NULL,'3711154242','laurenzi.d@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1076,0,'SURACE MIMMO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1077,0,'BALLESI LUCA ',NULL,'0733493070','3404826072','info@lbcomunicazione.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1078,0,NULL,NULL,NULL,NULL,'princi.rocco@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1079,0,NULL,NULL,'0498597636',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1080,0,'ALIBERTI MARCO',NULL,NULL,NULL,'albieri.marco@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1082,0,'DI VALERIO CARINA',NULL,'0295080950','3425710072','carina.divalerio@lyreco.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1083,0,'DI TELLA CRISTIAN',NULL,NULL,'3774263460','cris.ditella@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1084,0,'SOTTANELLI GIULIO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1085,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1086,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1087,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1088,0,NULL,NULL,NULL,'3282747640',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1089,0,'ERIKA',NULL,'0735753306',NULL,'marketing@eurofit.biz','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1090,0,NULL,NULL,'0899365107',NULL,'info@atecgroupsnc.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1091,0,'RAFFAELE IAQUINTA',NULL,NULL,'3929513606',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1092,0,'LUIGI ERRICHIELLO',NULL,NULL,'3332454066','info@ermasrl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1093,0,'PATRIZIA',NULL,NULL,NULL,'info@meregalligomme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1094,0,NULL,NULL,'0824602544',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1095,0,NULL,NULL,NULL,'3356083357','p.ricciardi@enova-srl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1096,0,'VACCARO CRISTINA',NULL,'0141928150',NULL,'ragioneriacalliano@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1097,0,NULL,NULL,'01119838989',NULL,'info@bpm-power.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1098,0,'BURATORE  CRISTINA VACCARO',NULL,'0141991044',NULL,'tributi@valleversa-monferrato.at.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1099,0,'CLAUDIO',NULL,'059672331',NULL,'claudio@artpressprint.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1100,0,NULL,NULL,NULL,'3281612318','aricci12@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1101,0,'Giovanni',NULL,'07359171','3296217105','ragioneria@comune.ripatransone.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1102,0,NULL,NULL,'0872619130',NULL,'tributi@comunesanvitochietino.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1103,0,'Ileana Carlucci',NULL,NULL,NULL,'ileana.carlucci@comunesanvitochietino.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1104,0,'Antonio Pasquini',NULL,NULL,NULL,'antonio.pasquini@comunesanvitochietino.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1105,0,'MARCO TOTTA ',NULL,'0881312529','3939154626',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1106,0,NULL,NULL,'0861796392',NULL,'info@bosica.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1107,0,'Cristiana Garavina',NULL,'0516004319',NULL,'cristiana.garavina@comune.granarolo-dellemilia.bo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1109,0,'MARA','','0736817397',NULL,'mara.gabrielli@sinerteam.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1110,0,'DI SALVATORE DIANA',NULL,'0736-374122',NULL,'ragioneria@comunerotella.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1111,0,'UMBERTO LIMONCELLI',NULL,'0735-98130',NULL,'ragioneria@comune.cossignano.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1112,0,NULL,NULL,NULL,NULL,'sindaco@comune.cossigano.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1113,0,'Tozzi Maria Assunta',NULL,'0736822128',NULL,'ragioneria@comune.castignano.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1114,0,'Romea Petrocchi',NULL,'0736-806122',NULL,'ragioneria@comune.montegallo.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1115,0,'MARA',NULL,'0736809122',NULL,'ragioneria@comune.arquatadeltronto.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1116,0,NULL,NULL,'0415951580',NULL,'info@tecnautogroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1117,0,'CRISTINA DI MONTE',NULL,'086182357',NULL,'marteo@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1118,0,'CANOVA ALBERTO ALBERTO',NULL,'0415380644',NULL,'acquisti@rigomma.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1119,0,'Luca Vagnoni',NULL,'0734674832',NULL,'comunicazione@cvm.an.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1120,0,NULL,NULL,NULL,NULL,'cvm.comunicazione@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1121,0,'MICHELE BONFANTI',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1122,0,NULL,NULL,'0573718146',NULL,'antoniogomme@live.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1123,0,NULL,NULL,'0736898903',NULL,'mara.gabrielli@sinerteam.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1124,0,NULL,NULL,NULL,'3388272829','fano@postapower.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1125,0,'ANDREA MOSCARDI',NULL,NULL,NULL,'andrea.moscardi@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1126,0,'PICCIONI WALTER',NULL,'0858942762','3349583382','wp@healthprogressitalia.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1127,0,'DENISE',NULL,'0721781426',NULL,'commerciale@rockolors.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1128,0,'Cinesi Eros',NULL,'0736362142',NULL,'ufficio.segreteria@comune.palmiano.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1129,0,NULL,NULL,'0735592476','3297237139','info@ecorigeneratisrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1130,0,'ILARIA BRUNETTI',NULL,'0854491589',NULL,'microimprese@09communications.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1131,0,NULL,NULL,'051-9841611',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1132,0,'ALESSANDRO',NULL,NULL,'3289310745','alfa.recapiti@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1133,0,'PALERMO GIANDOMENICO',NULL,'0964345111',NULL,'tributi@comune.siderno.rc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1134,0,'TORA MICHELE',NULL,'0773466435',NULL,'sistemi.catasto@bonifica.latina.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1135,0,'SINIGALLIA',NULL,'0649982736',NULL,'s.sinigaglia@aci.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1136,0,NULL,NULL,NULL,NULL,'aci-fdautomotive@aci.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1137,0,NULL,NULL,'0240326383',NULL,'info@lampadadiretta.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1138,0,NULL,NULL,'0110437759',NULL,'assistenza@euroimportpneumatici.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1139,0,'PIERO ERAMO',NULL,'0854313620',NULL,'sportellimprese@confcommerciopescara.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1140,0,NULL,NULL,'0735655475',NULL,'nibaingro@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1141,0,NULL,NULL,'0823839358','3333304334','vendita@rmelectric.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1142,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1143,0,'PEROTTI NAZZARENO',NULL,NULL,'3886595011',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1144,0,'ORLANDONI FABRIZIO',NULL,NULL,'3295713142','fabrizioorlandoni@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1145,0,NULL,NULL,NULL,'3406831257','francescodigiuseppe89@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1146,0,'R.BALBO',NULL,'0141202128',NULL,'ragioneria@comune.portacomaro.at.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1147,0,'MARIA TERESA',NULL,'0861847127',NULL,'mariateresa@efacile.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1148,0,'ALESSSANDRA DE LEONARDIS',NULL,'085817436',NULL,'gaia.baldassarre@riscosrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1149,0,NULL,NULL,NULL,NULL,'g.cargini@emmecisoftware.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1150,0,NULL,NULL,NULL,NULL,'lucia.biuso@riscosrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1151,0,'R. Marini',NULL,'0858072112',NULL,'r.marini@cisiaprogetti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1152,0,'FRANCESCO GALIFFA',NULL,NULL,'3357121612','ufficiotecnico@capriotti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1153,0,'MARIELLA FARES',NULL,'0734937054','3335923706','aso@marchettigomme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1154,0,'MARCO FABIANI',NULL,'0734773521',NULL,'avvocatomarcofabiani @gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1155,0,'MODENESE FABIANO',NULL,'0458290289',NULL,'fabiano.modenese@comune.sangiovannilupatoto.vr.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1156,0,'GOMME-AUTO',NULL,'0294754019',NULL,'help@gomme-auto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1157,0,NULL,NULL,'0445605772',NULL,'sales@ifppackaging.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1158,0,'DOTT. LUCA MAGITTI',NULL,'0858950231',NULL,'servizio.finanziario@comune.notaresco.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1159,0,'LIBERATORE ROBERTO',NULL,'0859491432','3464064666','direzione@amconsorzio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1160,0,'PIERA ALBERTINI',NULL,'0736888731',NULL,'tributi@comune.offida.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1161,0,'D\'ALESSIO LICIO',NULL,'0861910115','360993510','intrasport@intrasport.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1162,0,'DE SIMONE CASTRESE',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1163,0,NULL,NULL,'800129091',NULL,'clienti@numeroverdeitalia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1164,0,'SINDACO MIRELLA PONTUTI',NULL,'0861743433',NULL,'tributi@comune.colonnella.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1165,0,'LUIGI TORRIERI',NULL,'0872709663',NULL,'amministrazione@newenergyitaly.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1166,0,NULL,NULL,NULL,NULL,'lucegas@newenergyitaly.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1167,0,'SILVIA BRIZZI',NULL,'0522301994','3711262759','silvia.rmfsrl@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1168,0,NULL,NULL,'0522 30 83 59',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1169,0,'ROSELLI UMBERTA',NULL,'0736373132',NULL,'ragioneria@comune.force.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1170,0,'TEDESCHI FRANCO',NULL,NULL,'3403935332','franco@centroecologicosrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1171,0,'DOTT.SSA ALESSANDRA CAPUTO',NULL,'08642506452',NULL,'a.caputo@comune.sulmona.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1172,0,'GABRIELLA',NULL,'0295241431',NULL,'tributi@comune.cavenagobrianza.mb.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1173,0,'NICOLA ORFANELLI',NULL,'0864271938','3381155376','infoarch@arc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1174,0,'NICOLA ORFANELLI',NULL,NULL,'3381155376','introdacquatributi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1175,0,NULL,NULL,'0736342693',NULL,'info@cromojet.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1176,0,'DOTT. PERETTI PARIDE PERETTI PARIDE',NULL,'0858279922',NULL,'tecnoservicepenne@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1177,0,'JESSICA',NULL,'0858621823',NULL,'amministrazione.etlservizi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1178,0,'DOTT.SSA ALESSANDRA IANNUCCI DOTT.SSA ALESSANDRA IANNUCCI',NULL,'0131236476',NULL,'a.iannucci@consorziorsu.al.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1179,0,'DOTT. GIUSEPPE MARONE',NULL,'086474545','3381155376',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1180,0,'MESSONUOVO.IT',NULL,NULL,NULL,'info@messoanuovo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1181,0,NULL,NULL,'0513763017',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1182,0,'BERARDINELLI CINZIA',NULL,'0854962934','3471949834','cinzia.berardinelli@spoltoreservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1183,0,'CECCHETTI LORI',NULL,'0296425234',NULL,'tributi@comune.turate.co.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1184,0,'RAPONE GIUSEPPE',NULL,NULL,'3286934272','info@globconsulting.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1185,0,'Fumagalli Chiara',NULL,'03920756211',NULL,'tributi@comune.macherio.mb.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1186,0,'FRANCESCO RUSCIO',NULL,'0736252222','3358329697','info@icerec.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1187,0,'ARGENTI EMANUELE',NULL,'0433-483911','3495694275','argentie@pignaenvelopes.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1188,0,'ZALLOCCO ANTONELLA NAZZARI',NULL,NULL,'3358057188',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1189,0,NULL,NULL,NULL,NULL,'rossana.cavallari@provinciambiente.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1190,0,'GIANCARMINE DICICCIO',NULL,NULL,NULL,'giancarmine.diciccio@provinciambiente.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1191,0,'MARTINI GRAZIANO',NULL,NULL,'3883229689','mgrentsrl@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1192,0,NULL,NULL,'0735594926',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1193,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1194,0,'ILARIA PARADISO',NULL,'015-3353310',NULL,'fullstrap@fullstrap.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1195,0,'GUSEPPE CARGINI',NULL,NULL,'3392224837','g.cargini@emmecisoftware.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1196,0,'Amministrazione Vestina',NULL,'0858278735','3397369766','amministrazione@vestinagaseluce.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1197,0,NULL,NULL,NULL,NULL,'ufficiogiulianova@vestinagaseluce.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1198,0,'FALO\' ROBERTO',NULL,'0861246063','3382602384','roberto.falo@lacittaquotidiano.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1199,0,'DONNA LUCA',NULL,NULL,'3386601821','lucadonna2008@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1200,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1201,0,'GIANFRANCO GIANFRANCO ',NULL,NULL,'3294207004','tipolito95@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1202,0,'VITULLI NICOLA',NULL,'0873343127','3385475401','n.vitulli@kaaral.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1203,0,'CIMINI FRANCO',NULL,'0861808165','3491466889','info@ciminilongobardiimmobiliare.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1204,0,'BIANCHINI MATTEO',NULL,'0861710792',NULL,'direzione@emmebiconsulting.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1205,0,'SIMONETTA D\'ORTENZIO',NULL,'0863996529','3331351770','ragioneria.oricola@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1206,0,'GAGLIANO ENRICO',NULL,'0861839230','3386673410','commerciale@servicetec.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1207,0,'GIAMPAOLI ANDREA',NULL,NULL,NULL,'ragioneria@comune.monterinaldo.fm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1208,0,'ANGELA FERRARI',NULL,'0871951129',NULL,'angela.ferrari@miglianico.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1209,0,NULL,NULL,'086354142',NULL,'tributi@comune.castellafiume.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1210,0,'D’Addezio Cecilia',NULL,'0863910606',NULL,'comuneopi.contab@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1211,0,'STEFANIA MARTELLUCCI',NULL,'0746689903',NULL,'poggiobustonetributi@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1212,0,'Montani',NULL,NULL,NULL,'info@comune.labro.ri.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1213,0,'LAURINI',NULL,'0863978133',NULL,'ragioneria@coune.morino.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1214,0,'GIULIA MONDINI',NULL,'0516053065',NULL,'giulia.mondini@veloceindustry.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1215,0,'TERRANOVA GIUSEPPE',NULL,NULL,NULL,'giuseppe.terranova@veloceindustry.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1216,0,'BUONOCORE',NULL,'081913801',NULL,'tributi.corbara@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1217,0,'RENO',NULL,NULL,'3357215678','info@mediaprintduepuntozero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1218,0,'CARGINI GIUSEPPE',NULL,NULL,'3392224837','g.cargini@integrazionidigitali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1220,0,NULL,NULL,NULL,NULL,'e.morganti@integrazionidigitali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1221,0,NULL,NULL,'0735582390',NULL,'amministrazione@postalab.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1222,0,'ANTONIO',NULL,NULL,'3891176172','antoniogentile47@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1223,0,'Ramadori Marta',NULL,'0734771100',NULL,'anagrafe@comunebelmontepiceno.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1224,0,'Locci Elettra',NULL,'0746636101',NULL,'servizifinanziaricsv@comunecollisulvelino.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1225,0,'GIORDANA D\'ISIDORO',NULL,'086180501',NULL,'scelgo@scelgospa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1226,0,'FEDERICO',NULL,'0863698635',NULL,'info@afgsrl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1227,0,'SIMONA',NULL,'085413198',NULL,'simona@dethomasis.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1228,0,'Rosetta Maggiore',NULL,'0735764005',NULL,'ragioneria@comuneacquavivapicena.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1229,0,'DOTT. MASSIMO GIGLIO',NULL,'0736817722',NULL,'comuneappignanoap@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1230,0,NULL,NULL,NULL,NULL,'comuneappignanoap@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1231,0,'MERLITTI LORELLA',NULL,'0861999113',NULL,'l.merlitti@comune.castilenti.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1232,0,'FRANCESCO IPPOLITI',NULL,'0734780141',NULL,'ragioneria@comune.montelparo.fm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1233,0,'TAMARA BASILI',NULL,'0734919002',NULL,'ragioneria@comune.carassai.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1234,0,NULL,NULL,NULL,NULL,'sindaco@comune.carassai.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1235,0,NULL,NULL,'0874789131',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1236,0,NULL,NULL,'0307722423',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1237,0,NULL,NULL,'035910203',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1238,0,NULL,NULL,'01411766315',NULL,'assistenza@vincoasti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1239,0,'C.A. DOTT.SSA MATTIOLI',NULL,'0736859101',NULL,'tributi.com.montefortino@provincia.fm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1240,0,'DOTT.SSA MORESCHINI',NULL,'086184651',NULL,'sociale@comune.santegidioallavibrata.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1241,0,NULL,NULL,NULL,NULL,'bilancio@comune.alba-adriatica.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1242,0,NULL,NULL,NULL,NULL,'protocollo@comune.alba-adriatica.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1243,0,'DI SIMONE GIANNI',NULL,NULL,'3476519039','giannidisimone@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1244,0,'Stella Cervogni',NULL,'06585661','3395071971','segreteria.amministrazione@admsantegidio.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1245,0,'BUSCEMA FERDINANDO',NULL,'0735568450','337633672','f.buscema@route66srl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1246,0,'RABUFFETTI ANDREA',NULL,'0692599235','3387004535','andrea@playoffice.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1247,0,NULL,NULL,'0635498066',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1248,0,'PICCHIARELLI WALTER',NULL,'0861711647',NULL,'amministrazione.martinsicuro@centroavanguardia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1249,0,'CORINTO PIROCCHI',NULL,'08580211',NULL,'protocollogenerale@comune.giulianova.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1250,0,NULL,NULL,NULL,NULL,'a.giampaolo@comune.giulianova.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1251,0,NULL,NULL,NULL,NULL,'p.dilorenzo@comune.giulianova.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1252,0,'ELISABETTA',NULL,NULL,NULL,'commerciale2@elenchitelefonici.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1253,0,'RAFFAELLA BERGONZI',NULL,'0131515139',NULL,'raffaella.bergonzi@comune.alessandria.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1254,0,'FRANCA CROCETTA',NULL,'0859696270',NULL,'franca.crocetta@comune.cittasantangelo.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1255,0,'MONICA PORCU',NULL,'0709272042',NULL,'protocollo@comune.teulada.ca.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1256,0,NULL,NULL,NULL,NULL,'ragioneriatributi@comune.teulada.ca.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1257,0,NULL,NULL,NULL,NULL,'giuseppina.digiovanni@comune.teulada.ca.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1258,0,NULL,NULL,'0736336244','3401657271','info@gabrielliassistenza.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1259,0,NULL,NULL,NULL,'3925708071',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1260,0,'SASSU GIAMPIERO',NULL,'0458760514',NULL,'giampiero.sassu@cienneffe.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1261,0,'TEDESCO MARCELLO',NULL,'0721860543','3482510433','amministrazione@suoloesalute.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1262,0,'GIACOMO',NULL,NULL,NULL,'software@suoloesalute.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1263,0,NULL,NULL,'0735433074',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1264,0,'DI MARTINO MARCO',NULL,NULL,NULL,'info@associazioneautomobilistiitaliani.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1265,0,'PEDICONE LORELLA',NULL,'0861783500',NULL,'info@steelbox.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1266,0,'SILVESTRINI ALESSANDRO',NULL,'0861712581','335376581','info@alessandrosilvestrini.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1267,0,NULL,NULL,NULL,'3464982052','info@delpianoelettrico.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1268,0,'PREZIOSO FEDERICO FLAVIO',NULL,'0861232394','3392816778',' federico.prezioso@pieffeauto.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1269,0,NULL,NULL,'0295080806',NULL,'tributi1@comune.vignate.mi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1270,0,'SIMONE',NULL,'0721829288',NULL,'info@autoriparatoriacm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1271,0,'Matteo',NULL,'0645479430',NULL,'matteo.bolletta@italriscossioni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1272,0,'Silvia',NULL,NULL,NULL,'silvia.petraroia@italriscossioni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1273,0,'Volpes',NULL,NULL,NULL,'r.dominici@lawfinance.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1274,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1275,0,'PATRIZIA',NULL,'0861287199',NULL,'info@italconfidi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1276,0,'NICOLELLA UMBERTO',NULL,'087135931','3495385952','umberto.nicolella@teateservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1277,0,NULL,NULL,'0854155134',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1278,0,'ORIETTA COLLELUORI',NULL,'08594971-210','08594210','orietta.colleluori@comune.pineto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1279,0,'PIERANTOZZI  CATERINA ',NULL,'0735751346',NULL,'gruppi@maeviaggi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1280,0,'Paris',NULL,NULL,'3458721171','ragioneria2@comune.ortona.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1281,0,'Cellini Roberta',NULL,'0746638031',NULL,'comunemorroreatino@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1282,0,'VALLESE GIUSEPPE',NULL,NULL,'3383955081','vallesegiuseppe2@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1283,0,'DOTT. DAMIANO COLAICOMO  ',NULL,'0746-287360',NULL,'entrate@comune.rieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1284,0,'DOTT. VIVIANI MARCO',NULL,'08611862377',NULL,'m.viviani@comune.basciano.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1285,0,'DOTT. MARCO TIRABASSI',NULL,'0735794559',NULL,'villam@san-benedetto-del-tronto.gov.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1286,0,'Ceridono Elena',NULL,'0161477295',NULL,'tributi@comune.livornoferraris.vc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1287,0,'ROBERTA GALLO',NULL,'08715857241','08715857232','roberta.gallo@opschieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1288,0,NULL,NULL,'0862441361','335389118','cesare.fischione@graficheaquilane.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1289,0,'FISCHIONE CESARE',NULL,NULL,NULL,'ca.fischione@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1290,0,'FERREIRA JESSICA',NULL,NULL,'3249045524','jhessikaferreira@msn.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1291,0,NULL,NULL,'0804425695','3319569765','info@shopstampa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1292,0,NULL,NULL,'072142661',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1293,0,NULL,NULL,'0861714565',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1294,0,'Martellucci Stefania',NULL,'0746689903','3281690004 ','poggiobustonetributi@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1295,0,NULL,NULL,'0861714565','3351359777',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1296,0,NULL,NULL,NULL,NULL,'fabio@bmark.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1297,0,'MAURO FORTE',NULL,'0852121216','3284836796','grafica@aironeservizi.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1298,0,'ROMAGNUOLO KATIA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1299,0,NULL,NULL,'0861-856655','3407172895',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1300,0,'FEDERICO D\'ONOFRIO',NULL,'0871511141',NULL,'revisioniauto@giansanteauto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1301,0,'FABIANO',NULL,'051943751',NULL,'bg6team@bolognagomme.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1302,0,NULL,NULL,NULL,NULL,'fabiano.giannellini@bolognagomme.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1303,0,NULL,NULL,'0735705269','3280650161','info@scrittepronte.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1304,0,'STEFANO GIANNETTI',NULL,NULL,NULL,'stefano@scrittepronte.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1305,0,'FOSCHI ANGELO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1306,0,NULL,NULL,'043344180',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1307,0,'MARCO MIZZELLA',NULL,'0761613199',NULL,'marco@magifservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1308,0,'FABIO CAPECCI',NULL,'0717927000',NULL,'info@bmark.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1309,0,'MADRESANI NATALINO',NULL,'085975016',NULL,'moduloblu@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1310,0,'VIOLA ALFREDO',NULL,'086182922','3471192501','cvsrlmanufatti@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1311,0,NULL,NULL,'0773756101','3341131396','info@officina terenzi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1312,0,NULL,NULL,'0458510482','3668960402','info@autofficinaguerra.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1313,0,'VITTORIO',NULL,'062417810','3334370927','donofrionino@yahoo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1314,0,NULL,NULL,NULL,'3476759246','revisioni.sabaudia@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1315,0,NULL,NULL,NULL,'3318768084',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1316,0,'MASSIMO',NULL,'0399206279',NULL,'frpirotta@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1317,0,'MARIO',NULL,'0872712479','3286243913','revicarsrl@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1318,0,'SIG. MAURO',NULL,'0464672392','3497199530','revisionideimichei@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1319,0,'FILIPPO PROIETTI',NULL,'0362932441',NULL,'segreteria@comune.albiate.mb.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1320,0,NULL,NULL,NULL,'3295891711','info@andreamatoffi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1321,0,'DANIELA',NULL,'041913452','3334929235','depieriofficina@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1322,0,'LORENZO',NULL,'086326555',NULL,'antonelligomme@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1323,0,'CRISTIAN',NULL,'0442629161','3332026827','pepgomme@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1324,0,'GALUPPI',NULL,'0773610157',NULL,'desantisgomme@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1325,0,'LEONARDO /TERESA',NULL,'0803114041','3276916997','carrozzerianatrella@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1326,0,'ALESSANDRO',NULL,NULL,'3467252316','aleprinz@hotmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1327,0,'PAOLO',NULL,'0457635101',NULL,'castellan.snc@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1328,0,'GIACINTO IARUSSI',NULL,NULL,'3296955773','edeltributi@virgilio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1329,0,NULL,NULL,'0287188517','3403202336',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1330,0,'EMILIANO TASSI',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1331,0,'ROBERTO',NULL,NULL,'3384187265','gianba.99@live.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1332,0,NULL,NULL,'0863706100',NULL,'tributi.ovindoli@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1333,0,'LUIGI',NULL,'0854308364',NULL,'info@tipografialastampa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1334,0,NULL,NULL,'0854310356',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1335,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1336,0,NULL,NULL,'0984402422','3396352096',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1337,0,'NANDO',NULL,'0815262059',NULL,'de.man@inwind.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1338,0,'STEFANO GAGLIARDI',NULL,'0863679132i1',NULL,'elettorale@comune.santemarie.aq.it  ','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1339,0,'FABRIZIO DE LEONI',NULL,'0773629097','3479843744','fabrizio@deleoni.it;postel@deleoni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1340,0,'CARLO MARZIALI',NULL,'0734217040',NULL,'info@micropresssrl.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1341,0,NULL,NULL,'0971921081','3209080648','omniamotorscal@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1342,0,'ROBERTO',NULL,'0818181002','3488046932','laeurobuste@katamail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1343,0,'ROMOLI MARCO',NULL,'07330250220','3663717090','macerata@sailpost.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1344,0,'DOTT.SSA VALENTINA SANGUIGNI',NULL,'071918469',NULL,'segreteria@dentalcampus.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1345,0,'DOTT.SSA MARTINA CERASANI',NULL,'086388168',NULL,'ragioneria@comune.gioiadeimarsi.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1346,0,'RITA SCANO',NULL,'065914598',NULL,'segreteria@confarca.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1347,0,'SURRICCHIO LUIGI',NULL,'0854310356','32513640000','amministrazione@tipografialastampa.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1348,0,'ANGELA SAVINA',NULL,'086354142',NULL,'tributi@comune.castellafiume.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1349,0,NULL,NULL,'086354353',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1350,0,'CAZANAVE LIBERTINO',NULL,'0362591572','3462241731','promotech.cl@icloud.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1351,0,'LUCIO DE TONI',NULL,'0498078411',NULL,'lucio.detoni@gmail.com ','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1352,0,'MARINO TORMENTI',NULL,'0852015595','3421357849','preventivi@novacartotecnicaroberto.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1353,0,'GUCCIARDI MARCO',NULL,NULL,'3519555034',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1354,0,'GIOVANNI ATTANASIO',NULL,'0861839166',NULL,'giovanni@dfpinternational.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1355,0,'Pasqualina Angela Pezza',NULL,'863519144','3803203803','ragioneria@comune.massadalbe.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1356,0,'GEORGE MADALIN',NULL,'053654050','3335950696','info@frentest.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1357,0,'Nanni',NULL,'0863-698635',NULL,'comune.casteldelmonte@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1358,0,'LUISA DI ROCCO',NULL,'0863950742',NULL,'ragioneria@comune.balsorano.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1359,0,'FILIPPO NERI','Amministrativo','0736402957',NULL,'preventivi@artigp.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1360,0,'FJORENO',NULL,'04711816165','3489085923','fjorel.gjolena@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1361,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1362,0,'CIAMPINI MARIO',NULL,'0861843097',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1363,0,'EMIDIO BRUNI',NULL,NULL,'337656663',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1364,0,'Laurenzi Fabio',NULL,'0862975533','3470180395','fa.laurenzi@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1365,0,NULL,NULL,'0862975591i4',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1366,0,'MARTINA',NULL,'0734939019',NULL,'demografici@comune.montefioredellaso.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1367,0,'PAOLO BARONE',NULL,'09221808490','3332321167','info@hyagroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1368,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1369,0,'SONIA LEONE',NULL,'085694645',NULL,'climaservicepescara@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1370,0,'MUGGITTU ANTONIO',NULL,'0721372415',NULL,'l.ricci@aspes.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1371,0,NULL,NULL,NULL,NULL,'a.muggittu@aspes.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1372,0,'ANDREA PAVONI',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1373,0,'MARCO TORZOLINI',NULL,NULL,'3294505137','marco@sistemadiallerta.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1374,0,NULL,NULL,NULL,NULL,'mtconsulting.info@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1375,0,'LUCIO',NULL,NULL,'3331861367','info@caparevisioni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1376,0,'RAPONI',NULL,'0861294118','3804545171','raponisrl@tiscali.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1377,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1378,0,'BIAGIO',NULL,'08553790',NULL,'tuttografica.diluigi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1379,0,NULL,NULL,'073687132',NULL,'ufficio.tributi@comune.castorano.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1380,0,'Carlo','','085380134','3384951157','produzione@teknopost.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1381,0,NULL,NULL,'0853724306',NULL,'gestione.finanziaria@provincia.pescara.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1382,0,NULL,NULL,NULL,NULL,'valentina.longo@provincia.pescara.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1383,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1384,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1385,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1386,0,'SCIAMANNA GIUSEPPE',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1387,0,'OLIVIERI ALEX',NULL,NULL,'3487426325',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1388,0,'SCIARRETTA DANIELE',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1389,0,'PALESTRO ALICE',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1390,0,'DI PAOLO KATIA',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1391,0,'CASALENA RENATO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1392,0,'SCIARRETTA ERNESTO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1393,0,'SCIARRETTA DAVIDE',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1394,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1395,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1396,0,'ANDREA CARRELLI',NULL,'0861250299','3351313039','andrea@giservice.pro','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1397,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1398,0,'SARGENTI SIMONETTA',NULL,'0732709372',NULL,'s.sargenti@comune.fabriano.an.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1399,0,NULL,NULL,'0736652013',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1400,0,'TRIBUIANI FRANCESCO',NULL,NULL,'3298408637','info@zonaufficio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1401,0,NULL,NULL,NULL,'3384805222',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1402,0,'FRANCESCO RIZZA',NULL,'0962433246','3295374800',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1403,0,'ROBERTO ALESIANI',NULL,NULL,'3204439950','info@gruppoyuma.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1404,0,'VALENTINA',NULL,NULL,'3450009408','amministrazione@techsolutionsrl.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1405,0,'NADA MALATESTA',NULL,NULL,'3314890976','studiolegalemvb@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1406,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1407,0,'PASQUALE DE ANGELIS',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1408,0,'PATRIZIA PIRRI',NULL,NULL,'3485910064','patriziapubblicolor@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1409,0,'MATTEO SETTEPANELLA',NULL,NULL,NULL,'insiemepernereto@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1410,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1411,0,'DE BLASIS MARCO',NULL,'086388186',NULL,'tributi@comunelecceneimarsi.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1412,0,'AMEDEO PASCULLI',NULL,'0858062350',NULL,'info151@brt.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1413,0,'MATTEO DI CARLO',NULL,'0872622236',NULL,'m.dicarlo@fossacesia.org','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1414,0,'BENCIVENNI GABRIELE BENCIVENNI',NULL,'0559544858',NULL,'bencivenni@irideitalia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1415,0,'MIRIAM CERIOLI',NULL,NULL,NULL,'economato@comune.palazzopignano.cr.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1416,0,'MAX PELAGATTI ',NULL,NULL,'3393363027','info@maxpelagatti.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1417,0,'Mirco Iannini',NULL,'08621910000','3289298954','ufficiotributiscoppito@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1418,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1419,0,'ROMINA STINELLIS',NULL,'086345841',NULL,'ragioneria@comune.capistrello.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1420,0,'CRISTIANA CRIVELLONE',NULL,'0865955200','3294711283','cristiana.crivellone@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1421,0,'Valeria D\'Angelo',NULL,'086487114',NULL,'ragioneria@comune.alfedena.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1422,0,'FRANCESCA VERALDI',NULL,'0961957805','3498819450 ','francescaveraldi@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1423,0,NULL,NULL,'0282954774',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1424,0,'Nicola Orfanelli',NULL,NULL,'3381155376','nicola.orfanelli@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1425,0,'ELISA DE SANCTIS',NULL,'0862-80142',NULL,'protocollo.poggiopicenze@legalmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1426,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1427,0,'FRANCESCO PAPARINI',NULL,NULL,'3884994442','francesco@paparinieditore.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1428,0,'MARIANNA',NULL,'08582167213',NULL,'ufficiotributi@comune.penne.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1429,0,NULL,NULL,NULL,'3492839009',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1430,0,'CAPRIOTTI',NULL,'0735714251',NULL,'capriotti@lmdgroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1431,0,'CAPRIOTTI',NULL,'0735714251',NULL,'capriotti@lmdgroup.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1432,0,'ROBERTO GIUDICI',NULL,NULL,'3337713702',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1433,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1434,0,'MARIELLA',NULL,'0859062001','3939799230','amministrazione@dabruzzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1435,0,'MAURO ISOTTON',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1436,0,NULL,NULL,'082845475','082845475',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1437,0,'BARONE MARIANNA',NULL,'0872918112',NULL,'tributi@unionemova.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1438,0,'EMILIO RACCIATTI',NULL,'0872869146',NULL,'unione.sinello@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1439,0,NULL,NULL,'0872900178',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1440,0,'STRACCIALINI MARCO',NULL,'0861753353','3351266995','info@strasoft.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1441,0,'GIUSEPPE D\'AMICO',NULL,NULL,'3406192732','giuseppedamico56@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1442,0,'DOTT.SSA MARTA DI MUZIO ',NULL,'0871382511',NULL,'tributi@comune.bucchianico.ch.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1443,0,NULL,NULL,'0861553201',NULL,'calabresemarco1@legalmail.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1444,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1445,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1446,0,'ANTONELLA DI LULLO',NULL,'87260121',NULL,'protocollo@comuneroccasangiovanni.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1447,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1448,0,NULL,NULL,'0249471447',NULL,'clienti@aosom.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1449,0,NULL,NULL,NULL,NULL,'info@olivierilorenzo.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1450,0,'MARIA RENZULLI',NULL,'0225077226',NULL,'m.renzulli@comune.vimodrone.milano.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1451,0,'GIANLUCA VIVIANI',NULL,NULL,'3482366056','ecoimpianti.viviani@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1452,0,'ANDREA DEL GRECO',NULL,'087158571',NULL,'ape@opschieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1453,0,'ALESSIA ROSATI',NULL,'08637954214',NULL,'alessia.rosati@comune.celano.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1454,0,'Margherita Rubino',NULL,'073163000','3204526720','m.rubino@morrodalba.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1455,0,NULL,NULL,'0871895131',NULL,'finanza@comune.palombaro.ch.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1456,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1457,0,'VOLPI FEDERICA',NULL,'0774300808',NULL,'tributi@comune.santangeloromano.rm.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1458,0,NULL,NULL,NULL,NULL,'info@ferramentasartore.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1459,0,'LUCIANO PIERFELICE',NULL,'0854211802',NULL,'info@lpgrafiche.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1460,0,NULL,NULL,'0289735077','327201206',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1461,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1462,0,NULL,NULL,NULL,NULL,'info@it-planet.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1463,0,NULL,NULL,'0233402817',NULL,'e-shop@generalmarketing.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1464,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1465,0,'QUINTO ASSENTI',NULL,'0735656134','3337324920','info@regenerapoint.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1466,0,'FOGLIA ROBERTO',NULL,'0733281739',NULL,'info@eurocarta.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1467,0,'QUINTO ASSENTI',NULL,'0735656134','3337324945','info@regenerapoint.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1468,0,'STEFANO RIPANI',NULL,'0733659920',NULL,'ufficio.economato@comune.sarnano.mc.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1469,0,'SANDRO',NULL,'0854554558',NULL,'sandro@liquorisantospirito.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1470,0,NULL,NULL,NULL,'3294230472','lab6062srl@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1471,0,'Gamba Giovanni',NULL,'098581398','3283347678','gamba.giovanni@comune-diamante.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1472,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1473,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1474,0,NULL,NULL,NULL,'3282747640','invio@avvisopatente.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1475,0,'MARIA EMANUELA GORLANDI',NULL,NULL,'3397249017','mariaemanuela.gorlandi@labconsulenze.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1476,0,'GALVAN VALENTINO',NULL,NULL,NULL,'fornitori@pack.ly','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1477,0,NULL,NULL,'065914598',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1478,0,'CONOCCHIOLI TIZIANA',NULL,NULL,'3284920961',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1479,0,'ANGELINI PIETRO',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1480,0,'TEGA CELESTINO',NULL,'0736093535','3348750503','celestino.tega@picchiogas.eu','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1481,0,'SILVIA MAMBELLI',NULL,NULL,'3703156977','studiomambelli@libero.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1482,0,NULL,NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1483,0,'GENNARINO DI STEFANO',NULL,'08621720031',NULL,'ragioneria@comune.roccadicambio.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1484,0,'Marcello Tedesco','','','3485260863','software@pec.suoloesalute.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 18:06:25'),
(1485,0,'Elisa De Sanctis',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1488,0,'Scaranari  Maria Rosaria',NULL,'0861785339',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1489,0,'Federica D\'Antonio',NULL,'0861785378',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1490,0,'Dott.ssa Verrigni',NULL,'0859696275',NULL,'elena.verrigni@comune.cittasantangelo.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1491,0,'Valerio Danteo',NULL,'0859696211',NULL,'valerio.danteo@comune.cittasantangelo.pe.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1492,0,'Stefania',NULL,'0859696228',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1493,0,'Roberta Gallo',NULL,NULL,NULL,'roberta.gallo@opschieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1494,0,'Manuela',NULL,'08715857243',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1495,0,NULL,NULL,'08715857248',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1496,0,NULL,NULL,'087158571i7',NULL,'ape@opschieti.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1497,0,'F. Stampone','','08715857232','3494598820',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1498,0,'Marco Nardocci','Amministrativo',NULL,'3357353702','amministrazione@magifservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1499,0,'Tiziana Tinnirello','',NULL,'3498654863','tiziana.tinnirello@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1500,0,'Luigi Scorrano','',NULL,'3920132602','webmaster@magifservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1501,0,'Marco Nardocci','',NULL,NULL,'marco@magifservizi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1502,0,'Di Gianvittorio Roberto',NULL,'08589453607',NULL,'digianvittorio.roberto@comune.roseto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1503,0,'Di Marzio Ingrid',NULL,'08589453651',NULL,'dimarzio.ingrid@comune.roseto.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1504,0,'La Valle - Lampade Votive','','08589453562',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1505,0,'Alberto','',NULL,'3283327845',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1506,0,'Matriciani Alberto - Tesoreria','Amministrativo','08589453622',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1507,0,'Piero',NULL,'0861768255',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1508,0,'Sandra Di Cuia',NULL,'0861768254',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1512,0,'Nazzareno Rosari',NULL,'06905522355',NULL,'nrosari@fonte-nuova.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1513,0,'Veronica',NULL,NULL,'3208160647',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1514,0,'Giorgio',NULL,'06905522357','3394660651',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1515,0,'Rina Ricci ',NULL,NULL,NULL,'rina.fcgrafica@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1516,0,'Luca',NULL,NULL,NULL,'luca@sielsrl.net','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1517,0,'Roberta','Amministrativo','0731229108',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1521,0,'Monica Moretti',NULL,'0736899039',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1522,0,'Daniela Felicioni',NULL,'0736899060',NULL,'daniela.felicioni@comune.spinetoli.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1523,0,'Teresa Testa',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1524,0,'Marialisa Galbiati',NULL,NULL,NULL,'marialisagalbiati@alice.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1525,0,'Isa Galbiati',NULL,NULL,NULL,'isa.galbiati@entedigitaletributi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1526,0,'Fabio Giudetti',NULL,NULL,NULL,'fabio.giudetti@entedigitaletributi.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1527,0,'Danilo Petrini',NULL,'0733292088i4',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1528,0,'Laura Ricci',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1529,0,NULL,'Amministrativo',NULL,NULL,'fatture@andreanitributi.legalmail.it \r','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1530,0,'Valeria Olivieri',NULL,'0658566354','3357470254',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1531,0,'Paola Federici',NULL,NULL,'3388256177',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1532,0,NULL,NULL,'08618040622',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1533,0,NULL,NULL,'08618040304',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1534,0,NULL,'Amministrativo',NULL,NULL,'amministrazione@litoemme.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1535,0,NULL,NULL,NULL,NULL,'protocollo@pec.cittadiformia.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1536,0,'Mastantuono',NULL,NULL,'3394025400',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1537,0,'Benedetto Cavallé',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1540,0,'Elisa',NULL,'0541608222',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1541,0,'Katia',NULL,'0541608354',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1542,0,'Franco Gaspari',NULL,NULL,'3475562922',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1543,0,'Ornella','Amministrativo',NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1544,0,'Ascani Attilio',NULL,NULL,'3202492203',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1545,0,'Bernava Arturo',NULL,'0858071544i207',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1546,0,'Ofelio Liberati',NULL,NULL,NULL,'ofelio.liberati@fedam.bcc.it\r','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1547,0,'Alessia Salvatori',NULL,NULL,'3294523278',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1548,0,NULL,NULL,NULL,NULL,'tributi@comune.pescina.aq.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1549,0,'Antonio Fallucchi',NULL,NULL,'3274096554',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1550,0,'Serena',NULL,'073680162i416','3342203224',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1551,0,'Mancinelli Marta',NULL,'073163000i6',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1552,0,'Daniela Ballandi',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1553,0,'Mauro Scarpatonio',NULL,NULL,'3202895494',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1554,0,NULL,'Amministrativo',NULL,NULL,'amministrazione@teknopost.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1555,0,NULL,NULL,'0736821432',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1556,0,NULL,NULL,'086385283',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1557,0,'Matteo',NULL,NULL,NULL,'matteocci.segretariocomunale@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1558,0,'Giovanni Sassu',NULL,'3296217105',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1559,0,NULL,NULL,NULL,NULL,'urp@comune.santomero.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1560,0,'Andrea Luzi',NULL,NULL,'3204863431',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1562,0,NULL,'Amministrativo',NULL,NULL,'contabilita@aironeservizi.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1563,0,NULL,'Amministrativo',NULL,NULL,'uff.clienti@aironeservizi.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1564,0,'Claudio Boffa',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1565,0,'P. Sciamanna',NULL,NULL,NULL,'p.sciamanna@comune.campli.te.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1566,0,'Maria Verna',NULL,'086440116',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1567,0,NULL,NULL,'08614441',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1568,0,'Celestino',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1569,0,'Semeraro',NULL,'0804445213',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1570,0,'Marina Bozzelli',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1571,0,NULL,NULL,'058378152',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1572,0,'Cellulare Reperibilità',NULL,NULL,'335215573',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1573,0,'Ragioneria',NULL,NULL,'058378344',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1574,0,NULL,NULL,'0734719813',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1575,0,'Paola Piccione',NULL,'0731538441',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1576,0,'Leonardo Collina',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1577,0,'Ced',NULL,NULL,NULL,'ced@comune.monsampolodeltronto.ap.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1578,0,NULL,NULL,'085.44811',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1579,0,'Lancianese',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1580,0,'Di Adamo',NULL,NULL,'3475200765',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1581,0,'Fabio Andrenacci',NULL,'0734680210',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1582,0,'Colameo',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1583,0,NULL,NULL,NULL,NULL,'sagapiti@comune.sansalvo.ch.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1584,0,'Alessia Lupi',NULL,NULL,'3890631681',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1585,0,'Ragioneria',NULL,'0861806526',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1586,0,'Pierluigi',NULL,NULL,'3403425204',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1587,0,NULL,NULL,NULL,NULL,'protocollo@comunecorropoli.it\r','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1588,0,NULL,NULL,NULL,NULL,'areatecnica@comunecorropoli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1589,0,NULL,NULL,NULL,NULL,'ass.llpp@comunecorropoli.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1590,0,'Simona Di Francesco',NULL,NULL,'3474165423',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1591,0,'Daniele Laurenzi',NULL,'0861806929','3401569222','laurenzi.d@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1593,0,'Loretta Marrone',NULL,'0861806925',NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1594,0,'Marino Damiani',NULL,NULL,NULL,'m.damiani@martintype.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1595,0,'Davide',NULL,NULL,'3476509828',NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1596,0,NULL,NULL,NULL,NULL,'tributi@valleversa-monferrato.at.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1597,0,'Beatrice Cesarano',NULL,NULL,NULL,'beatrice.cesarano@augustaratio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1598,0,'Renato Redentore',NULL,NULL,'3289157157','renato.redentore@augustaratio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1599,0,'Luigi Panaioli',NULL,NULL,NULL,'ufficiogiulianova@vestinagaseluce.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1600,0,'Marco Allevi',NULL,'085.8003554','3285625186','marco.allevi@augustaratio.it','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1601,0,'Marisa Taraborrelli',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1602,0,'Gianluca Primavera',NULL,NULL,NULL,NULL,'Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1606,0,'Alex','Amministrativo',NULL,'3487426325','nexus.olivieri@gmail.com','Attivo',0,NULL,'2025-09-09 10:52:13','2025-09-09 10:52:13'),
(1613,2192,'Alessio','Tecnico','+39','+39',NULL,'Attivo',1,2192,'2025-09-19 11:59:32','2025-10-08 15:24:30'),
(1618,2199,'alex','Tecnico',NULL,NULL,'alex.o@mediaprint.it','Attivo',1,2199,'2025-10-08 14:27:24','2025-10-08 15:46:21'),
(1619,2192,'Ernesto','CEO',NULL,NULL,NULL,'Attivo',0,NULL,'2025-10-08 14:31:53','2025-10-08 15:45:59'),
(1620,2207,'Loredana Alfonsi','Uff. Tributi','0861743433',NULL,'tributi@comune.colonnella.te.it','Attivo',1,2207,'2025-11-26 17:16:05','2025-11-26 17:16:10');
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
-- Table structure for table `tb_variazioni`
--

DROP TABLE IF EXISTS `tb_variazioni`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_variazioni` (
  `id_variazione` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(160) NOT NULL,
  `codice` varchar(64) DEFAULT NULL,
  `categoria` varchar(80) DEFAULT NULL,
  `prezzo` decimal(12,4) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_variazione`),
  UNIQUE KEY `uq_variazioni_nome` (`nome`),
  UNIQUE KEY `uq_variazioni_codice` (`codice`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_variazioni`
--

LOCK TABLES `tb_variazioni` WRITE;
/*!40000 ALTER TABLE `tb_variazioni` DISABLE KEYS */;
INSERT INTO `tb_variazioni` VALUES
(1,'Fino a 20 gr','P-01','Peso Plico',0.0000,'2025-10-09 08:18:07','2025-11-26 15:56:50'),
(2,'Oltre 20g fino a 50gr','P-02','Peso Plico',0.0000,'2025-10-09 08:18:32','2025-11-26 15:56:40'),
(3,'Omologato','SP-01','Tipo Spedizione',0.0000,'2025-10-09 08:19:24','2025-10-09 09:31:55'),
(4,'Non Omologato','SP-02','Tipo Spedizione',0.0000,'2025-10-09 08:19:33','2025-10-09 09:31:49'),
(5,'AM','D-01','Destinazione',0.0000,'2025-10-09 08:19:51','2025-10-09 09:29:22'),
(6,'CP','D-02','Destinazione',0.0000,'2025-10-09 08:19:54','2025-10-09 09:29:30'),
(7,'EU','D-03','Destinazione',0.0000,'2025-10-09 08:19:59','2025-10-09 09:29:35'),
(8,'EX Zona 1','D-10','Destinazione',0.0000,'2025-10-09 08:20:10','2025-10-09 09:29:52'),
(9,'EX Zona 2','D-11','Destinazione',0.0000,'2025-10-09 08:20:17','2025-10-09 09:30:01'),
(10,'EX Zona 3','D-12','Destinazione',0.0000,'2025-10-09 08:20:24','2025-10-09 09:30:09'),
(11,'B&N','CS-01','Colore Stampa',0.0000,'2025-10-09 08:20:37','2025-10-09 09:29:07'),
(12,'Colore','CS-02','Colore Stampa',0.0000,'2025-10-09 08:20:45','2025-10-09 09:29:13'),
(13,'Fronte','TS-01','Tipo Stampa',0.0000,'2025-10-09 08:21:03','2025-10-09 09:32:06'),
(14,'Fronte/Retro','TS-02','Tipo Stampa',0.0000,'2025-10-09 08:21:11','2025-10-09 09:32:11'),
(20,'Oltre 50g fino a 100gr','P-03','Peso Plico',0.0000,'2025-10-09 09:10:40','2025-11-26 15:56:57'),
(21,'Oltre 100gr fino a 250gr','P-04','Peso Plico',0.0000,'2025-10-09 09:10:53','2025-11-26 15:57:01'),
(22,'Oltre 250g fino a 350g','P-05','Peso Plico',0.0000,'2025-10-09 09:20:20','2025-11-26 15:57:05'),
(23,'Oltre 350g fino a 1000g','P-06','Peso Plico',0.0000,'2025-10-09 09:20:37','2025-11-26 15:57:12'),
(24,'Oltre 1000g fino a 2000g','P-07','Peso Plico',0.0000,'2025-10-09 09:20:54','2025-11-26 15:57:08'),
(25,'Card','PT-01','Posta Target',NULL,'2025-10-09 09:37:27','2025-10-09 09:37:27'),
(26,'Basic','PT-02','Posta Target',NULL,'2025-10-09 09:37:39','2025-10-09 09:37:39'),
(27,'Creative','PT-03','Posta Target',NULL,'2025-10-09 09:37:56','2025-10-09 09:37:56'),
(28,'Catalog','PT-04','Posta Target',NULL,'2025-10-09 09:38:20','2025-10-09 09:38:20'),
(29,'Magazine','PT-05','Posta Target',NULL,'2025-10-09 09:38:35','2025-10-09 09:38:35'),
(30,'Gold','PT-06','Posta Target',NULL,'2025-10-09 09:38:49','2025-10-09 09:38:49'),
(31,'Carta 60 gr','C-60','Peso Carta',0.0000,'2025-11-26 15:54:51','2025-11-26 15:55:00'),
(32,'Carta 70 gr','C-70','Peso Carta',NULL,'2025-11-26 15:55:30','2025-11-26 15:55:30'),
(33,'Carta 80 gr','C-80','Peso Carta',NULL,'2025-11-26 15:55:53','2025-11-26 15:55:53'),
(34,'Carta 100 gr','C-100','Peso Carta',NULL,'2025-11-26 15:57:37','2025-11-26 15:57:37'),
(35,'Carta 120 gr','C-120','Peso Carta',NULL,'2025-11-26 15:57:48','2025-11-26 15:57:48'),
(36,'Carta 180 gr','C-180','Peso Carta',NULL,'2025-11-26 15:58:05','2025-11-26 15:58:05'),
(37,'Carta 200 gr','C-200','Peso Carta',NULL,'2025-11-26 15:58:19','2025-11-26 15:58:19'),
(38,'Carta 250 gr','C-250','Peso Carta',NULL,'2025-11-26 15:58:31','2025-11-26 15:58:31'),
(39,'Carta 300 gr','C-300','Peso Carta',NULL,'2025-11-26 15:58:42','2025-11-26 15:58:42'),
(40,'PDF-Omologato','FD-01','File Dati',50.0000,'2025-11-26 16:08:55','2025-11-26 16:08:55'),
(41,'PDF-Non Omologato','FD-02','File Dati',150.0000,'2025-11-26 16:09:49','2025-11-26 16:09:49'),
(42,'Dati grezzi da elaborare','FD-03','File Dati',150.0000,'2025-11-26 16:10:14','2025-11-26 16:11:08'),
(43,'1 Elemento','EP-01','Elementi Plico',NULL,'2025-11-26 16:16:46','2025-11-26 16:16:46'),
(44,'2 Elementi','EP-02','Elementi Plico',NULL,'2025-11-26 16:16:59','2025-11-26 16:16:59'),
(45,'3 Elementi','EP-03','Elementi Plico',NULL,'2025-11-26 16:17:09','2025-11-26 16:17:09'),
(46,'4 Elementi','EP-04','Elementi Plico',NULL,'2025-11-26 16:17:24','2025-11-26 16:17:24'),
(47,'Posta Ordinaria','RP-02','Rendicontazione Postale',0.4000,'2025-11-27 10:07:53','2025-11-27 10:08:38'),
(48,'Posta Certificata','RP-01','Rendicontazione Postale',0.5000,'2025-11-27 10:08:17','2025-11-27 10:08:17'),
(49,'Posta Digitale','RP-03','Rendicontazione Postale',NULL,'2025-11-27 10:20:54','2025-11-27 10:20:54');
/*!40000 ALTER TABLE `tb_variazioni` ENABLE KEYS */;
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
-- Temporary table structure for view `v_anagrafiche_sede_legale`
--

DROP TABLE IF EXISTS `v_anagrafiche_sede_legale`;
/*!50001 DROP VIEW IF EXISTS `v_anagrafiche_sede_legale`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_anagrafiche_sede_legale` AS SELECT
 1 AS `id_anagrafica`,
  1 AS `ragione_sociale`,
  1 AS `piva`,
  1 AS `stato`,
  1 AS `indirizzo`,
  1 AS `civico`,
  1 AS `cap`,
  1 AS `citta`,
  1 AS `provincia` */;
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
-- Dumping routines for database 'prova'
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


  SELECT next_num INTO v_from_prog
  FROM cfg_sezionali_progress
  WHERE id_sezionale = p_id_sezionale AND anno = v_anno;


  SELECT COALESCE(MAX(numero_documento), 0) + 1 INTO v_from_docs
  FROM tb_fatture
  WHERE id_sezionale = p_id_sezionale AND anno = v_anno;


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


    SELECT COALESCE(MAX(numero_documento),0)+1
    INTO v_maxnum
    FROM tb_fatture
    WHERE id_sezionale = v_cur_id AND anno = v_cur_anno;


    INSERT IGNORE INTO cfg_sezionali_progress(id_sezionale, anno, next_num)
    VALUES (v_cur_id, v_cur_anno, v_maxnum);


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

    SELECT i.*, i.inactive_since, i.last_document_date
    FROM v_anagrafiche_inattive_2y i
    WHERE NOT EXISTS (
      SELECT 1 FROM tb_anagrafiche_archive ar WHERE ar.id_anagrafica = i.id_anagrafica
    )
    ORDER BY COALESCE(i.last_document_date, i.inactive_since) ASC;
  ELSE

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
  IN p_dry_run TINYINT(1),
  IN p_overwrite_if_exists TINYINT(1),
  IN p_delete_from_archive TINYINT(1)
)
BEGIN
  DECLARE v_restored_anag INT DEFAULT 0;
  DECLARE v_restored_fisc INT DEFAULT 0;
  DECLARE v_restored_sedi INT DEFAULT 0;
  DECLARE v_restored_cont INT DEFAULT 0;

  IF p_batch_id IS NULL OR p_batch_id = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'archive_batch_id obbligatorio';
  END IF;


  IF p_dry_run = 1 THEN

    SELECT 'ANAGRAFICHE' AS entity, COUNT(*) AS to_restore
    FROM tb_anagrafiche_archive WHERE archive_batch_id = p_batch_id
    UNION ALL
    SELECT 'FISCALI', COUNT(*) FROM tb_anagrafiche_fiscali_archive WHERE archive_batch_id = p_batch_id
    UNION ALL
    SELECT 'SEDI', COUNT(*) FROM tb_sedi_archive WHERE archive_batch_id = p_batch_id
    UNION ALL
    SELECT 'CONTATTI_SEDE', COUNT(*) FROM tb_sedi_contatti_archive WHERE archive_batch_id = p_batch_id;


    SELECT * FROM tb_anagrafiche_archive WHERE archive_batch_id = p_batch_id LIMIT 20;
    SELECT * FROM tb_anagrafiche_fiscali_archive WHERE archive_batch_id = p_batch_id LIMIT 20;
    SELECT * FROM tb_sedi_archive           WHERE archive_batch_id = p_batch_id LIMIT 20;
    SELECT * FROM tb_sedi_contatti_archive  WHERE archive_batch_id = p_batch_id LIMIT 20;

  ELSE

    START TRANSACTION;


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
  END IF;
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
  SET d    = DATE_FORMAT(CURDATE(), '%Y-%m-01');
  SET stop = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL p_months_ahead MONTH), '%Y-%m-01');

  WHILE d <= stop DO
    SET @pname = CONCAT('p', DATE_FORMAT(d, '%Y%m'));

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

  DECLARE cutoff DATE;
  SET cutoff = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL p_keep_months MONTH), '%Y-%m-01');

  LOOP_DROP:
  LOOP
    SELECT PARTITION_NAME INTO @p_to_drop
    FROM INFORMATION_SCHEMA.PARTITIONS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'tb_audit_log'
      AND PARTITION_NAME REGEXP '^p[0-9]{6}$'
      AND PARTITION_DESCRIPTION < QUOTE(cutoff)
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


  SELECT COUNT(*) INTO v_exists
  FROM tb_sedi_contatti c
  WHERE c.id_contatto = p_id_contatto;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Contatto inesistente';
  END IF;


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
  IN p_pk_columns VARCHAR(255),
  IN p_app VARCHAR(64)
)
BEGIN
  DECLARE cols LONGTEXT;
  DECLARE pk_json LONGTEXT;
  DECLARE q TEXT;


  SELECT GROUP_CONCAT(CONCAT("'",COLUMN_NAME,"'",', NEW.',COLUMN_NAME) ORDER BY ORDINAL_POSITION SEPARATOR ', ')
  INTO cols
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = p_table;


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


  SET @drop_ai = CONCAT('DROP TRIGGER IF EXISTS ai_', p_table, '_audit');
  SET @drop_au = CONCAT('DROP TRIGGER IF EXISTS au_', p_table, '_audit');
  SET @drop_ad = CONCAT('DROP TRIGGER IF EXISTS ad_', p_table, '_audit');
  PREPARE s FROM @drop_ai; EXECUTE s; DEALLOCATE PREPARE s;
  PREPARE s FROM @drop_au; EXECUTE s; DEALLOCATE PREPARE s;
  PREPARE s FROM @drop_ad; EXECUTE s; DEALLOCATE PREPARE s;


  SET q = CONCAT(
    'CREATE TRIGGER ai_', p_table, '_audit AFTER INSERT ON ', p_table, ' FOR EACH ROW ',
    'BEGIN ',
    '  INSERT INTO tb_audit_log(table_name, op, pk_json, row_new, actor, app) ',
    '  VALUES (''', p_table, ''',''I'', JSON_OBJECT(', @pk_new, '), JSON_OBJECT(', cols, '), CURRENT_USER(), ''', p_app, '''); ',
    'END'
  );
  PREPARE s FROM q; EXECUTE s; DEALLOCATE PREPARE s;


  SET q = CONCAT(
    'CREATE TRIGGER au_', p_table, '_audit AFTER UPDATE ON ', p_table, ' FOR EACH ROW ',
    'BEGIN ',
    '  INSERT INTO tb_audit_log(table_name, op, pk_json, row_old, row_new, actor, app) ',
    '  VALUES (''', p_table, ''',''U'', JSON_OBJECT(', @pk_new, '), JSON_OBJECT(', cols, '), JSON_OBJECT(', cols, '), CURRENT_USER(), ''', p_app, '''); ',
    'END'
  );
  PREPARE s FROM q; EXECUTE s; DEALLOCATE PREPARE s;


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


  SELECT id_sdi_tipo_documento INTO v_current_td
  FROM tb_fatture WHERE id_fattura = p_id_fattura;

  IF v_current_td IS NULL AND v_td24 IS NOT NULL THEN
    UPDATE tb_fatture
    SET id_sdi_tipo_documento = v_td24
    WHERE id_fattura = p_id_fattura;
  END IF;


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

--
-- Final view structure for view `v_account_cliente_anagrafica_predefinita`
--

/*!50001 DROP VIEW IF EXISTS `v_account_cliente_anagrafica_predefinita`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_account_cliente_anagrafica_predefinita` AS select 1 AS `id_account`,1 AS `username`,1 AS `id_contatto`,1 AS `id_anagrafica_predefinita` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_account_cliente_anagrafiche` AS select 1 AS `id_account`,1 AS `username`,1 AS `id_contatto`,1 AS `id_anagrafica` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_anagrafiche_inattive_2y` AS select 1 AS `id_anagrafica`,1 AS `id_tipologia`,1 AS `id_sdi_regime_fiscale`,1 AS `is_pa`,1 AS `ragione_sociale`,1 AS `piva`,1 AS `codice_fiscale`,1 AS `note`,1 AS `created_at`,1 AS `updated_at`,1 AS `last_document_date`,1 AS `inactive_since` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_anagrafiche_lastdoc` AS select 1 AS `id_anagrafica`,1 AS `last_document_date` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_anagrafiche_sede_legale`
--

/*!50001 DROP VIEW IF EXISTS `v_anagrafiche_sede_legale`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_anagrafiche_sede_legale` AS select 1 AS `id_anagrafica`,1 AS `ragione_sociale`,1 AS `piva`,1 AS `stato`,1 AS `indirizzo`,1 AS `civico`,1 AS `cap`,1 AS `citta`,1 AS `provincia` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_archive_batches` AS select 1 AS `archive_batch_id`,1 AS `started_at`,1 AS `finished_at`,1 AS `records_total`,1 AS `by_users` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ddt_all` AS select 1 AS `id_ddt`,1 AS `id_anagrafica`,1 AS `anno`,1 AS `numero_documento`,1 AS `data_ddt`,1 AS `totale_pezzi`,1 AS `totale_peso_kg`,1 AS `note`,1 AS `id_causale`,1 AS `causale_label`,1 AS `id_serie`,1 AS `serie_code`,1 AS `created_at`,1 AS `updated_at`,1 AS `source_table` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ddt_slim` AS select 1 AS `id_ddt`,1 AS `id_anagrafica`,1 AS `anno`,1 AS `numero_documento`,1 AS `data_ddt`,1 AS `totale_pezzi`,1 AS `note`,1 AS `created_at`,1 AS `updated_at` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_fatture_all` AS select 1 AS `id_fattura`,1 AS `id_anagrafica`,1 AS `anno`,1 AS `numero_documento`,1 AS `data_fattura`,1 AS `totale_imponibile`,1 AS `totale_sconto`,1 AS `totale_iva`,1 AS `totale`,1 AS `saldo`,1 AS `note`,1 AS `id_stato`,1 AS `stato_label`,1 AS `id_tipo`,1 AS `tipo_label`,1 AS `id_sezionale`,1 AS `sezionale_code`,1 AS `id_serie`,1 AS `serie_code`,1 AS `id_sdi_tipo_documento`,1 AS `sdi_td_code`,1 AS `id_sdi_esigibilita`,1 AS `sdi_esig_code`,1 AS `id_sdi_modalita`,1 AS `sdi_mp_code`,1 AS `created_at`,1 AS `updated_at`,1 AS `source_table` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_fatture_slim` AS select 1 AS `id_fattura`,1 AS `id_anagrafica`,1 AS `anno`,1 AS `numero_documento`,1 AS `data_fattura`,1 AS `totale_imponibile`,1 AS `totale_sconto`,1 AS `totale_iva`,1 AS `totale`,1 AS `saldo`,1 AS `note`,1 AS `created_at`,1 AS `updated_at` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_preventivi_all` AS select 1 AS `id_preventivo`,1 AS `id_anagrafica`,1 AS `anno_preventivo`,1 AS `numero_documento`,1 AS `data_preventivo`,1 AS `totale_imponibile`,1 AS `totale_sconto`,1 AS `totale_iva`,1 AS `totale`,1 AS `note`,1 AS `id_stato`,1 AS `stato_label`,1 AS `id_serie`,1 AS `serie_code`,1 AS `created_at`,1 AS `updated_at`,1 AS `source_table` */;
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
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/* 50013 DEFINER=`laravel_mediaprint`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_preventivi_slim` AS select 1 AS `id_preventivo`,1 AS `id_anagrafica`,1 AS `anno_preventivo`,1 AS `numero_documento`,1 AS `data_preventivo`,1 AS `totale_imponibile`,1 AS `totale_sconto`,1 AS `totale_iva`,1 AS `totale`,1 AS `note`,1 AS `created_at`,1 AS `updated_at` */;
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

-- Dump completed on 2025-11-27 12:17:44
