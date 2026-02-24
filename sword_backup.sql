-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: sword_game
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `AdRewardSession`
--

DROP TABLE IF EXISTS `AdRewardSession`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdRewardSession` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `nonce` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rewardType` enum('GOLD','OLD_SWORD','SHIELD') COLLATE utf8mb4_unicode_ci NOT NULL,
  `rewarded` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `rewardedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `AdRewardSession_nonce_key` (`nonce`),
  KEY `AdRewardSession_userId_idx` (`userId`),
  KEY `AdRewardSession_nonce_idx` (`nonce`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdRewardSession`
--

LOCK TABLES `AdRewardSession` WRITE;
/*!40000 ALTER TABLE `AdRewardSession` DISABLE KEYS */;
INSERT INTO `AdRewardSession` VALUES (87,1,'b71fabc212f11dba7447e64c985dc2a3eb34efd47c339059110479f79fd96fda','GOLD',0,'2026-02-12 11:17:57.742',NULL),(88,1,'642a31b81810d8e9622434b82c1419708b901bd1feb4c9654b01676767f8ca05','GOLD',0,'2026-02-12 11:18:04.450',NULL),(89,1,'4c88bcc5d5ff51b04ffa7f30c888d5d1dbe3a8de19d2898b952b6f3eeb27bdae','GOLD',0,'2026-02-12 11:18:46.000',NULL),(90,1,'8eafff31e27d93635c00dda4dc9fd85e199f10ddecc8fec080f34e4defc62153','GOLD',0,'2026-02-12 11:18:49.665',NULL),(91,1,'cf2d2d51a27433d9424c2ea6070fd1a8ce26b3f7429c4c7d3aa4a6378c94a13f','GOLD',0,'2026-02-12 11:19:26.868',NULL),(92,1,'1f0f1fe1298bd290a97ba49323242b4c1f3d8fe618d4981e2eb02aca32b2f14b','GOLD',0,'2026-02-12 11:19:30.458',NULL),(93,1,'e0454c80e0dcdcbc0157c2137c4af37ac8f6499ae2e6ebf594fac91a1d86dec4','GOLD',0,'2026-02-12 11:20:18.269',NULL),(94,1,'5db94a5a87b8bf39f2ca0c1e47b14b4a702c205e3fd64c5d9e9b53d2b845e4cf','GOLD',0,'2026-02-12 11:20:34.426',NULL),(95,1,'e014f280f733dc446ffe4813e225fd8e9386ffcef6b3b1ff2f6295e7256dc931','OLD_SWORD',0,'2026-02-12 11:20:38.309',NULL),(97,1,'79821990562d057459b817278457a145e624eedce07e7ecf384d17084554085b','OLD_SWORD',0,'2026-02-12 11:21:01.079',NULL),(98,1,'3d1f0eaa8e829e2792037bc2a672df8e4085bddfb5b00b02e656a5ed0555e38b','OLD_SWORD',0,'2026-02-12 11:21:03.500',NULL),(99,1,'7272c4b6bb72cbc913e4e36a9c19256aa823ef7797fc9a6be3c29ce035d16186','OLD_SWORD',0,'2026-02-12 11:21:06.799',NULL),(100,1,'5b6c6c62043b7ed4f8b150ebfafe57b5f6c60933016d5ab177471b1040b60c35','OLD_SWORD',0,'2026-02-12 11:21:09.049',NULL),(102,1,'4d75d82a4bad752bd2c5b22cf19e50423a9483c3d1a9fb02778a0dc52d436689','GOLD',0,'2026-02-12 11:55:54.653',NULL),(103,1,'8bef9cd11121e6bedbaec8ae1300a6985a96173e054d2f4333cbfb997e8a3451','GOLD',0,'2026-02-12 11:56:00.967',NULL),(104,1,'64275779a59b186d5e46b46512219845abf769780ac088e0bfa78364a2bdd48e','GOLD',0,'2026-02-12 11:56:03.837',NULL),(105,1,'7fa92de063e938ee6e4839265c02cf4608c2d93f5b5055798c6c28544b58c3bd','GOLD',0,'2026-02-12 11:56:07.647',NULL),(106,1,'134a98a697430af2f28867de180938dd14980b1d966a04c5c69cd274fcca5105','GOLD',0,'2026-02-12 11:56:11.645',NULL),(107,1,'8604893ba16d1330dd35824a815139da9d01176558fc03ef4b65e0e66e4f2c1b','SHIELD',0,'2026-02-12 11:56:17.807',NULL),(108,1,'6d4068936850ca2078a93bb9a36ac5bd48454af89d548554e856020293d77f23','GOLD',0,'2026-02-12 12:02:45.024',NULL),(109,1,'6d9d627b604016bd8234b07427b7730ab238f8fdf394d1a596fb2c7850ab7406','GOLD',0,'2026-02-12 12:02:47.384',NULL),(110,1,'454761e8c6d26ff91d93c00cde48eb140350cfe8d1089393f962193ac6d0cb92','GOLD',0,'2026-02-12 12:02:49.163',NULL),(111,1,'c211a7aec045ba59455bb3c21206b37c6d027b2e0530bf89921a4daf271d1bec','GOLD',0,'2026-02-12 12:04:26.649',NULL),(112,1,'c3916cbad3aa96e96ae8f5b9d50e163f4575963a6d5c91b15b60c9925e2e2007','SHIELD',0,'2026-02-12 12:04:30.703',NULL),(113,1,'a4307f7a52bbb23fcfbac72a22c888070718bae9be2100e13a14155edfadc872','SHIELD',0,'2026-02-12 12:04:33.564',NULL),(114,1,'31cb807b83ab52428ac4342bbce7e7dc8cd09a356dbec10174e7be784bf3ccc1','GOLD',0,'2026-02-12 12:05:18.503',NULL),(115,1,'8db6e808e1c7c65928fc6314bd9527f4ebcd6eab0f45e234bc11a6051feecaa7','SHIELD',0,'2026-02-12 12:09:42.707',NULL),(116,1,'eea56e8447cedcd86b4eaeafaef3634bff5ad0698c557deb912793db14ba73f9','SHIELD',0,'2026-02-12 12:09:45.967',NULL),(117,1,'6ab64acb4bc5c11429878c625e230f673c6a2eb9a3eb950bdb42b7951ae51bcc','GOLD',0,'2026-02-12 12:09:49.004',NULL),(118,1,'8fa92764061067f79afd63dc4cb446f9204f6334540def1974d78ec63d3bf122','GOLD',0,'2026-02-12 13:14:23.479',NULL),(119,1,'1f843fecc80ae09bb5a28e13af28eb2a2fc142fc0e5c44e07c891ffecc4e77b5','GOLD',0,'2026-02-12 13:14:26.837',NULL),(120,1,'256058adb2903872e95b57c300a8135a509b93f29933400bd5e6ff0dd138afbb','GOLD',0,'2026-02-12 17:59:10.002',NULL),(121,1,'59596180be04d466323cb1220991f9f3fc8d37a33408b696634d5f2b29787bec','GOLD',0,'2026-02-12 17:59:18.369',NULL);
/*!40000 ALTER TABLE `AdRewardSession` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AdminConfig`
--

DROP TABLE IF EXISTS `AdminConfig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminConfig` (
  `id` bigint unsigned NOT NULL DEFAULT '1',
  `shieldGoldPrice` int unsigned NOT NULL DEFAULT '1',
  `maxDailyShieldAds` int unsigned NOT NULL DEFAULT '1',
  `maxShieldHold` int unsigned NOT NULL DEFAULT '1',
  `shieldActiveOnMarketplace` tinyint(1) NOT NULL DEFAULT '1',
  `maxDailySwordAds` int unsigned NOT NULL DEFAULT '10',
  `swordLevelReward` int unsigned NOT NULL DEFAULT '1',
  `maxDailyAds` int unsigned NOT NULL DEFAULT '10',
  `maxDailyMissions` int unsigned NOT NULL DEFAULT '20',
  `defaultTrustPoints` int unsigned NOT NULL DEFAULT '100',
  `defaultGold` int unsigned NOT NULL DEFAULT '5000',
  `goldReward` int unsigned NOT NULL DEFAULT '10',
  `minVoucherGold` int unsigned NOT NULL DEFAULT '10',
  `maxVoucherGold` int unsigned NOT NULL DEFAULT '1000',
  `voucherExpiryDays` int unsigned NOT NULL DEFAULT '7',
  `expiryAllow` tinyint(1) NOT NULL DEFAULT '0',
  `adminEmailId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `AdminConfig_adminEmailId_idx` (`adminEmailId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminConfig`
--

LOCK TABLES `AdminConfig` WRITE;
/*!40000 ALTER TABLE `AdminConfig` DISABLE KEYS */;
INSERT INTO `AdminConfig` VALUES (1,1,5,10,1,5,1,10,20,100,5000,10,10,1000,7,0,'rcrtavanam@gmail.com','2026-02-12 11:07:47.970');
/*!40000 ALTER TABLE `AdminConfig` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CustomerSupport`
--

DROP TABLE IF EXISTS `CustomerSupport`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CustomerSupport` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `category` enum('GAME_BUG','PAYMENT','ACCOUNT','BAN_APPEAL','SUGGESTION','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('LOW','NORMAL','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adminReply` text COLLATE utf8mb4_unicode_ci,
  `isReviewed` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) DEFAULT NULL,
  `reviewedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `CustomerSupport_userId_idx` (`userId`),
  CONSTRAINT `CustomerSupport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CustomerSupport`
--

LOCK TABLES `CustomerSupport` WRITE;
/*!40000 ALTER TABLE `CustomerSupport` DISABLE KEYS */;
/*!40000 ALTER TABLE `CustomerSupport` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Material`
--

DROP TABLE IF EXISTS `Material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Material` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rarity` enum('COMMON','RARE','EPIC','LEGENDARY','MYTHIC') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COMMON',
  `sellingCost` int unsigned NOT NULL,
  `buyingCost` int unsigned NOT NULL,
  `isBuyingAllow` tinyint(1) NOT NULL DEFAULT '1',
  `isSellingAllow` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Material_code_key` (`code`),
  UNIQUE KEY `Material_name_key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Material`
--

LOCK TABLES `Material` WRITE;
/*!40000 ALTER TABLE `Material` DISABLE KEYS */;
INSERT INTO `Material` VALUES (1,'ZKBOoy^m#DNE','material-1','','https://res.cloudinary.com/drng2zvp0/image/upload/v1770800214/sword-game/materials/bdh8tvkn3k2vwrqbtom6.png','COMMON',10,10,1,1,'2026-02-11 08:56:56.124','2026-02-11 08:56:56.124'),(2,'!638ReeVj8e2','piece of coal','piece of coal','https://res.cloudinary.com/drng2zvp0/image/upload/v1770874525/sword-game/materials/fxd0lkg8b6vop8rj2caq.png','COMMON',3,3,1,1,'2026-02-12 05:35:26.312','2026-02-12 05:35:26.312'),(3,'OdK%MVwvsvoV','piece of steel','piece of steel','https://res.cloudinary.com/drng2zvp0/image/upload/v1770874841/sword-game/materials/ysswc4tvhkbfmzprztvc.jpg','COMMON',2,2,1,1,'2026-02-12 05:40:41.716','2026-02-12 05:40:41.716'),(4,'Z1EC5vYHlHT0','piece of old cloth','piece of old cloth','https://res.cloudinary.com/drng2zvp0/image/upload/v1770874941/sword-game/materials/kankb776rypti01yw2jo.jpg','COMMON',3,2,1,1,'2026-02-12 05:42:21.685','2026-02-12 05:42:21.685'),(5,'rU%uSQ@GHubN','piece of glass','piece of glass','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875012/sword-game/materials/vxs93gkoxwcq21puf9lk.jpg','COMMON',4,4,1,1,'2026-02-12 05:43:32.889','2026-02-12 05:43:32.889'),(6,'VHm6hl7iXMX0','fragment of an old sword','fragment of an old sword','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875139/sword-game/materials/uxdlu5kkjb5vpnvowr6p.jpg','COMMON',4,4,1,1,'2026-02-12 05:45:40.218','2026-02-12 05:45:40.218'),(7,'jHROLnHB8B57','dragon orb','dragon orb','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875208/sword-game/materials/avd4fnvtrusehne22m2i.jpg','RARE',11,10,1,1,'2026-02-12 05:46:48.780','2026-02-12 05:46:48.780'),(8,'Js5x3yzfgo9W','dragon scales','dragon scales','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875289/sword-game/materials/g90gz3nuoo3wxbbcq8gu.jpg','RARE',12,11,1,1,'2026-02-12 05:48:10.334','2026-02-12 05:48:10.334'),(9,'wFAFAoVgaW8C','dragon fire','dragon fire','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875364/sword-game/materials/cmctskxp9hupf6q7kd3w.jpg','LEGENDARY',2200,2100,1,1,'2026-02-12 05:49:25.062','2026-02-12 05:49:25.062'),(10,'c%IP%bQB9fxR','stone carving','stone carving','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875406/sword-game/materials/zftll5qu4tqdqmmqrehi.jpg','COMMON',2,2,1,1,'2026-02-12 05:50:07.093','2026-02-12 05:50:07.093'),(11,'vp8vrZUwXGtp','bone fragment','bone fragment','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875512/sword-game/materials/ccr3jui4rzz6xmblfonm.jpg','COMMON',11,10,1,1,'2026-02-12 05:51:52.894','2026-02-12 05:51:52.894'),(12,'4aedvCRHf1Vw','iron filings','iron filings','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875591/sword-game/materials/plymypx1pba7jhc7dgki.jpg','COMMON',5,5,1,1,'2026-02-12 05:53:11.721','2026-02-12 05:53:11.721'),(13,'9fX11schZBJb','transparent beads','transparent beads','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875707/sword-game/materials/yqvdv8qase8wpjeoeh1z.jpg','EPIC',20,20,1,1,'2026-02-12 05:55:11.124','2026-02-12 05:55:11.124'),(14,'3dIV$*LNbRwP','rainbow beads','rainbow beads','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875792/sword-game/materials/vzgjvpgyp2tgqisqsqwb.jpg','LEGENDARY',5000,5000,1,1,'2026-02-12 05:56:33.691','2026-02-12 05:56:33.691'),(15,'DWG8io%85qSP','dragon head','dragon head','https://res.cloudinary.com/drng2zvp0/image/upload/v1770875924/sword-game/materials/zarptes5qvaxdiqjxozr.jpg','MYTHIC',1000000,1000000,1,1,'2026-02-12 05:58:45.825','2026-02-12 05:58:45.825'),(16,'yV!kVa1AcWbA','dragon\'s tail','dragon\'s tail','https://res.cloudinary.com/drng2zvp0/image/upload/v1770876016/sword-game/materials/jff4qqbzbwy9r7ts8jig.jpg','LEGENDARY',500000,500000,1,1,'2026-02-12 06:00:16.499','2026-02-12 06:00:16.499'),(17,'lPEkbgfByKgP','devil\'s wings','devil\'s wings','https://res.cloudinary.com/drng2zvp0/image/upload/v1770876106/sword-game/materials/wuydt5cfkywj6alkl73m.png','LEGENDARY',500000,500000,1,1,'2026-02-12 06:01:47.243','2026-02-12 06:01:47.243'),(18,'O2g^Elu3R&KV','angel wings','angel wings','https://res.cloudinary.com/drng2zvp0/image/upload/v1770876156/sword-game/materials/up68emeli9ydcj82pdds.jpg','LEGENDARY',500000,500000,1,1,'2026-02-12 06:02:36.810','2026-02-12 06:02:36.810'),(19,'WS&4WPq2ZvvK','angel\'s tears','angel\'s tears','https://res.cloudinary.com/drng2zvp0/image/upload/v1770876261/sword-game/materials/xglv362tphiale4nyt8v.jpg','LEGENDARY',20000,20000,1,1,'2026-02-12 06:04:22.142','2026-02-12 06:04:22.142'),(20,'CVcNxFGgUTd#','devil\'s tears','devil\'s tears','https://res.cloudinary.com/drng2zvp0/image/upload/v1770876312/sword-game/materials/urcghvvyslnarudpiy6u.png','LEGENDARY',15000,15000,1,1,'2026-02-12 06:05:13.396','2026-02-12 06:05:13.396');
/*!40000 ALTER TABLE `Material` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MaterialMarketplacePurchase`
--

DROP TABLE IF EXISTS `MaterialMarketplacePurchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MaterialMarketplacePurchase` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `materialId` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL,
  `priceGold` int unsigned NOT NULL,
  `purchasedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `MaterialMarketplacePurchase_userId_idx` (`userId`),
  KEY `MaterialMarketplacePurchase_materialId_fkey` (`materialId`),
  CONSTRAINT `MaterialMarketplacePurchase_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `MaterialMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MaterialMarketplacePurchase`
--

LOCK TABLES `MaterialMarketplacePurchase` WRITE;
/*!40000 ALTER TABLE `MaterialMarketplacePurchase` DISABLE KEYS */;
INSERT INTO `MaterialMarketplacePurchase` VALUES (1,1,13,10,200,'2026-02-12 13:17:25.668'),(2,1,12,10,50,'2026-02-12 13:17:36.522'),(3,1,11,10,100,'2026-02-12 13:17:41.802'),(4,1,10,10,20,'2026-02-12 13:17:47.936'),(5,1,8,10,110,'2026-02-12 13:18:03.064'),(6,1,6,10,40,'2026-02-12 13:18:08.260'),(7,1,5,10,40,'2026-02-12 13:18:12.821'),(8,1,7,10,100,'2026-02-12 13:18:17.939'),(9,1,1,10,100,'2026-02-12 13:18:29.962'),(10,1,2,10,30,'2026-02-12 13:18:34.544'),(11,1,3,10,20,'2026-02-12 13:18:39.541'),(12,1,4,10,20,'2026-02-12 13:18:44.300');
/*!40000 ALTER TABLE `MaterialMarketplacePurchase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ShieldMarketplacePurchase`
--

DROP TABLE IF EXISTS `ShieldMarketplacePurchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ShieldMarketplacePurchase` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `quantity` int unsigned NOT NULL,
  `priceGold` int unsigned NOT NULL,
  `purchasedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ShieldMarketplacePurchase_userId_idx` (`userId`),
  CONSTRAINT `ShieldMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ShieldMarketplacePurchase`
--

LOCK TABLES `ShieldMarketplacePurchase` WRITE;
/*!40000 ALTER TABLE `ShieldMarketplacePurchase` DISABLE KEYS */;
/*!40000 ALTER TABLE `ShieldMarketplacePurchase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SwordLevelDefinition`
--

DROP TABLE IF EXISTS `SwordLevelDefinition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwordLevelDefinition` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `level` int unsigned NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `synthesizeName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `upgradeCost` int unsigned NOT NULL,
  `buyingCost` int unsigned NOT NULL,
  `sellingCost` int unsigned NOT NULL,
  `synthesizeCost` int unsigned NOT NULL,
  `successRate` double NOT NULL,
  `isBuyingAllow` tinyint(1) NOT NULL DEFAULT '1',
  `isSellingAllow` tinyint(1) NOT NULL DEFAULT '1',
  `isSynthesizeAllow` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SwordLevelDefinition_level_key` (`level`),
  UNIQUE KEY `SwordLevelDefinition_name_key` (`name`),
  UNIQUE KEY `SwordLevelDefinition_synthesizeName_key` (`synthesizeName`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SwordLevelDefinition`
--

LOCK TABLES `SwordLevelDefinition` WRITE;
/*!40000 ALTER TABLE `SwordLevelDefinition` DISABLE KEYS */;
INSERT INTO `SwordLevelDefinition` VALUES (1,1,'basic','https://res.cloudinary.com/drng2zvp0/image/upload/v1770800286/sword-game/swords/pcexfjdl8paud52m2cgk.png',NULL,'SWORD OF DARKNESS',10,10,10,10,90,1,1,1,'2026-02-11 08:58:07.391','2026-02-11 08:58:07.391'),(4,2,'hard','https://res.cloudinary.com/drng2zvp0/image/upload/v1770800404/sword-game/swords/c3zki6d3spkkh5yap5jd.png',NULL,'Extra hard process',4,5,55,5,86,1,1,1,'2026-02-11 09:00:04.975','2026-02-11 09:00:04.975'),(5,3,'Adventurer\'s Sword','https://res.cloudinary.com/drng2zvp0/image/upload/v1770876593/sword-game/swords/egyu1zyg38g1sqlqldck.jpg','Adventurer\'s Sword','Adventurer\'s',5,15,15,5,75,1,1,1,'2026-02-12 06:09:53.922','2026-02-12 06:11:35.006'),(6,4,'Intermediate one-handed sword','https://res.cloudinary.com/drng2zvp0/image/upload/v1770876915/sword-game/swords/udnhzl7pesimnidell5b.png','Intermediate one-handed sword','Intermediate one-handed sword',10,20,20,10,70,1,1,1,'2026-02-12 06:15:16.207','2026-02-12 06:15:16.207'),(7,5,'dragon wing sword','https://res.cloudinary.com/drng2zvp0/image/upload/v1770877057/sword-game/swords/th8culhowlwwgf5aoj1b.jpg','dragon wing sword','dragon wing sword',20,100,100,20,60,1,1,1,'2026-02-12 06:17:38.649','2026-02-12 06:17:38.649'),(8,6,'devil\'s sword','https://res.cloudinary.com/drng2zvp0/image/upload/v1770877173/sword-game/swords/eja0z0cknlk8wyw9gn5y.jpg','devil\'s sword','devil\'s sword',100,200,200,100,65,1,1,1,'2026-02-12 06:19:33.546','2026-02-12 06:19:33.546'),(9,7,'dragon sword','https://res.cloudinary.com/drng2zvp0/image/upload/v1770877287/sword-game/swords/fxxem9m5mamsstmxa17q.jpg','dragon sword','dragon sword',100,300,300,100,50,1,1,1,'2026-02-12 06:21:28.131','2026-02-12 06:21:28.131'),(10,8,'Angel\'s Sword','https://res.cloudinary.com/drng2zvp0/image/upload/v1770877483/sword-game/swords/qkjgrma58njyimrdyzpq.jpg','Angel\'s Sword','Angel\'s Sword',150,400,400,150,45,1,1,1,'2026-02-12 06:24:44.286','2026-02-12 06:24:44.286');
/*!40000 ALTER TABLE `SwordLevelDefinition` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SwordMarketplacePurchase`
--

DROP TABLE IF EXISTS `SwordMarketplacePurchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwordMarketplacePurchase` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `swordId` bigint unsigned NOT NULL,
  `swordLevelDefinitionId` bigint unsigned NOT NULL,
  `priceGold` int unsigned NOT NULL,
  `purchasedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `SwordMarketplacePurchase_userId_idx` (`userId`),
  KEY `SwordMarketplacePurchase_swordId_idx` (`swordId`),
  KEY `SwordMarketplacePurchase_swordLevelDefinitionId_idx` (`swordLevelDefinitionId`),
  CONSTRAINT `SwordMarketplacePurchase_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `UserSword` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SwordMarketplacePurchase_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SwordMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SwordMarketplacePurchase`
--

LOCK TABLES `SwordMarketplacePurchase` WRITE;
/*!40000 ALTER TABLE `SwordMarketplacePurchase` DISABLE KEYS */;
/*!40000 ALTER TABLE `SwordMarketplacePurchase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SwordSynthesisHistory`
--

DROP TABLE IF EXISTS `SwordSynthesisHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwordSynthesisHistory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `swordLevelDefinitionId` bigint unsigned NOT NULL,
  `createdSwordId` bigint unsigned DEFAULT NULL,
  `goldSpent` int unsigned NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `SwordSynthesisHistory_userId_fkey` (`userId`),
  KEY `SwordSynthesisHistory_swordLevelDefinitionId_fkey` (`swordLevelDefinitionId`),
  KEY `SwordSynthesisHistory_createdSwordId_fkey` (`createdSwordId`),
  CONSTRAINT `SwordSynthesisHistory_createdSwordId_fkey` FOREIGN KEY (`createdSwordId`) REFERENCES `UserSword` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `SwordSynthesisHistory_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SwordSynthesisHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SwordSynthesisHistory`
--

LOCK TABLES `SwordSynthesisHistory` WRITE;
/*!40000 ALTER TABLE `SwordSynthesisHistory` DISABLE KEYS */;
INSERT INTO `SwordSynthesisHistory` VALUES (1,1,1,10,10,'2026-02-12 13:20:49.842');
/*!40000 ALTER TABLE `SwordSynthesisHistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SwordSynthesisRequirement`
--

DROP TABLE IF EXISTS `SwordSynthesisRequirement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwordSynthesisRequirement` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `swordLevelDefinitionId` bigint unsigned NOT NULL,
  `materialId` bigint unsigned NOT NULL,
  `requiredQuantity` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SwordSynthesisRequirement_swordLevelDefinitionId_materialId_key` (`swordLevelDefinitionId`,`materialId`),
  KEY `SwordSynthesisRequirement_materialId_idx` (`materialId`),
  CONSTRAINT `SwordSynthesisRequirement_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SwordSynthesisRequirement_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SwordSynthesisRequirement`
--

LOCK TABLES `SwordSynthesisRequirement` WRITE;
/*!40000 ALTER TABLE `SwordSynthesisRequirement` DISABLE KEYS */;
INSERT INTO `SwordSynthesisRequirement` VALUES (1,1,1,1),(2,4,1,2),(3,5,6,5),(4,5,3,5),(5,6,10,10),(6,6,12,10),(7,6,6,10),(8,7,8,10),(9,7,11,10),(10,7,7,10),(11,8,20,10),(12,8,17,10),(13,8,11,10),(14,9,7,10),(15,9,8,10),(16,9,9,10),(17,9,11,10),(18,10,19,10),(19,10,18,10),(20,10,13,10);
/*!40000 ALTER TABLE `SwordSynthesisRequirement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SwordUpgradeDrop`
--

DROP TABLE IF EXISTS `SwordUpgradeDrop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwordUpgradeDrop` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `swordLevelDefinitionId` bigint unsigned NOT NULL,
  `materialId` bigint unsigned NOT NULL,
  `dropPercentage` int unsigned NOT NULL,
  `minQuantity` int unsigned NOT NULL,
  `maxQuantity` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SwordUpgradeDrop_swordLevelDefinitionId_materialId_key` (`swordLevelDefinitionId`,`materialId`),
  KEY `SwordUpgradeDrop_materialId_fkey` (`materialId`),
  CONSTRAINT `SwordUpgradeDrop_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SwordUpgradeDrop_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SwordUpgradeDrop`
--

LOCK TABLES `SwordUpgradeDrop` WRITE;
/*!40000 ALTER TABLE `SwordUpgradeDrop` DISABLE KEYS */;
INSERT INTO `SwordUpgradeDrop` VALUES (1,1,1,100,1,5),(2,4,1,100,1,5),(3,5,6,50,1,5),(4,5,3,50,1,5),(5,6,10,50,1,5),(6,6,12,40,1,5),(7,6,6,10,1,1),(8,7,8,30,1,3),(9,7,11,40,1,4),(10,7,7,30,1,3),(11,8,20,20,1,1),(12,8,17,20,1,2),(13,8,11,60,1,5),(14,9,7,30,1,2),(15,9,8,20,1,3),(16,9,9,20,1,1),(17,9,11,30,1,3),(18,10,19,25,1,3),(19,10,18,25,1,3),(20,10,13,50,1,4);
/*!40000 ALTER TABLE `SwordUpgradeDrop` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SwordUpgradeHistory`
--

DROP TABLE IF EXISTS `SwordUpgradeHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SwordUpgradeHistory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `swordId` bigint unsigned NOT NULL,
  `fromSwordLevelId` bigint unsigned NOT NULL,
  `toSwordLevelId` bigint unsigned DEFAULT NULL,
  `success` tinyint(1) NOT NULL,
  `goldSpent` int unsigned NOT NULL,
  `droppedMaterialId` bigint unsigned DEFAULT NULL,
  `droppedQuantity` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `SwordUpgradeHistory_userId_fkey` (`userId`),
  KEY `SwordUpgradeHistory_swordId_fkey` (`swordId`),
  CONSTRAINT `SwordUpgradeHistory_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `UserSword` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `SwordUpgradeHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SwordUpgradeHistory`
--

LOCK TABLES `SwordUpgradeHistory` WRITE;
/*!40000 ALTER TABLE `SwordUpgradeHistory` DISABLE KEYS */;
INSERT INTO `SwordUpgradeHistory` VALUES (1,2,3,1,4,1,10,NULL,NULL,'2026-02-12 06:45:53.807'),(2,2,3,4,5,1,4,NULL,NULL,'2026-02-12 06:49:49.093'),(3,2,3,5,6,1,5,NULL,NULL,'2026-02-12 06:50:03.580'),(4,2,3,6,7,1,10,NULL,NULL,'2026-02-12 06:51:01.993'),(5,2,3,7,8,1,20,NULL,NULL,'2026-02-12 07:01:18.616'),(6,2,3,8,NULL,0,100,11,1,'2026-02-12 07:01:24.296'),(7,1,2,1,4,1,10,NULL,NULL,'2026-02-12 13:14:48.898'),(8,1,2,4,5,1,4,NULL,NULL,'2026-02-12 13:15:10.585'),(9,1,2,5,6,1,5,NULL,NULL,'2026-02-12 13:15:28.840'),(10,1,2,6,7,1,10,NULL,NULL,'2026-02-12 13:15:58.102'),(11,1,2,7,NULL,0,20,8,3,'2026-02-12 13:16:04.635');
/*!40000 ALTER TABLE `SwordUpgradeHistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `profileLogo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gold` int unsigned NOT NULL DEFAULT '0',
  `trustPoints` int unsigned NOT NULL DEFAULT '100',
  `totalShields` int unsigned NOT NULL DEFAULT '0',
  `anvilSwordId` bigint unsigned DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastReviewed` datetime(3) NOT NULL,
  `lastLoginAt` datetime(3) DEFAULT NULL,
  `oneDayAdsViewed` int unsigned NOT NULL DEFAULT '0',
  `totalAdsViewed` int unsigned NOT NULL DEFAULT '0',
  `oneDayShieldAdsViewed` int unsigned NOT NULL DEFAULT '0',
  `oneDaySwordAdsViewed` int unsigned NOT NULL DEFAULT '0',
  `todayMissionsDone` int unsigned NOT NULL DEFAULT '0',
  `totalMissionsDone` int unsigned NOT NULL DEFAULT '0',
  `isShieldOn` tinyint(1) NOT NULL DEFAULT '0',
  `isBanned` tinyint(1) NOT NULL DEFAULT '0',
  `soundOn` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  UNIQUE KEY `User_anvilSwordId_key` (`anvilSwordId`),
  CONSTRAINT `User_anvilSwordId_fkey` FOREIGN KEY (`anvilSwordId`) REFERENCES `UserSword` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User`
--

LOCK TABLES `User` WRITE;
/*!40000 ALTER TABLE `User` DISABLE KEYS */;
INSERT INTO `User` VALUES (1,'rcrtavanam@gmail.com','rama',NULL,'$2b$10$va36WwFOjzZSTpeWcECiwua/xpmYTy7OqmFvuXspTF7Vsm.GTLUk.',4203,100,0,5,'2026-02-11 09:01:33.257','2026-02-12 10:47:41.872','2026-02-12 12:09:36.158',4,16,1,5,0,0,0,0,1),(2,'mcret2022@gmail.com','test',NULL,'$2b$10$Yx.EZp.PnyVsAt401IOfWuIfDvRKlHHh7NDp12tTC.mFvDoMI1BLW',4851,100,0,NULL,'2026-02-12 06:44:28.186','2026-02-13 04:27:15.233','2026-02-13 04:27:47.823',0,0,0,0,0,0,0,0,1),(3,'ramaaschandu@gmail.com','ramaaschandu',NULL,'',5000,100,0,4,'2026-02-12 10:47:15.498','2026-02-12 10:47:15.497','2026-02-12 10:47:15.497',0,0,0,0,0,0,0,0,1);
/*!40000 ALTER TABLE `User` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserGift`
--

DROP TABLE IF EXISTS `UserGift`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserGift` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receiverId` bigint unsigned NOT NULL,
  `status` enum('PENDING','CLAIMED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `note` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `cancelledAt` datetime(3) DEFAULT NULL,
  `claimedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `UserGift_receiverId_idx` (`receiverId`),
  KEY `UserGift_status_idx` (`status`),
  CONSTRAINT `UserGift_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserGift`
--

LOCK TABLES `UserGift` WRITE;
/*!40000 ALTER TABLE `UserGift` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserGift` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserGiftItem`
--

DROP TABLE IF EXISTS `UserGiftItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserGiftItem` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `giftId` bigint unsigned NOT NULL,
  `type` enum('GOLD','TRUST_POINTS','MATERIAL','SWORD','SHIELD') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int unsigned DEFAULT NULL,
  `materialId` bigint unsigned DEFAULT NULL,
  `materialQunatity` int unsigned DEFAULT NULL,
  `swordLevel` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `UserGiftItem_giftId_idx` (`giftId`),
  KEY `UserGiftItem_materialId_idx` (`materialId`),
  KEY `UserGiftItem_swordLevel_idx` (`swordLevel`),
  CONSTRAINT `UserGiftItem_giftId_fkey` FOREIGN KEY (`giftId`) REFERENCES `UserGift` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserGiftItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `UserGiftItem_swordLevel_fkey` FOREIGN KEY (`swordLevel`) REFERENCES `SwordLevelDefinition` (`level`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserGiftItem`
--

LOCK TABLES `UserGiftItem` WRITE;
/*!40000 ALTER TABLE `UserGiftItem` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserGiftItem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserMaterial`
--

DROP TABLE IF EXISTS `UserMaterial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserMaterial` (
  `userId` bigint unsigned NOT NULL,
  `materialId` bigint unsigned NOT NULL,
  `unsoldQuantity` int unsigned NOT NULL DEFAULT '0',
  `soldedQuantity` int unsigned NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`userId`,`materialId`),
  KEY `UserMaterial_materialId_idx` (`materialId`),
  CONSTRAINT `UserMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `UserMaterial_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserMaterial`
--

LOCK TABLES `UserMaterial` WRITE;
/*!40000 ALTER TABLE `UserMaterial` DISABLE KEYS */;
INSERT INTO `UserMaterial` VALUES (1,1,9,0,'2026-02-12 13:18:29.961','2026-02-12 13:20:49.837'),(1,2,10,0,'2026-02-12 13:18:34.542','2026-02-12 13:18:34.542'),(1,3,10,0,'2026-02-12 13:18:39.539','2026-02-12 13:18:39.539'),(1,4,10,0,'2026-02-12 13:18:44.299','2026-02-12 13:18:44.299'),(1,5,10,0,'2026-02-12 13:18:12.819','2026-02-12 13:18:12.819'),(1,6,10,0,'2026-02-12 13:18:08.258','2026-02-12 13:18:08.258'),(1,7,10,0,'2026-02-12 13:18:17.938','2026-02-12 13:18:17.938'),(1,8,12,1,'2026-02-12 13:16:04.629','2026-02-12 13:18:03.062'),(1,10,10,0,'2026-02-12 13:17:47.935','2026-02-12 13:17:47.935'),(1,11,10,0,'2026-02-12 13:17:41.801','2026-02-12 13:17:41.801'),(1,12,10,0,'2026-02-12 13:17:36.520','2026-02-12 13:17:36.520'),(1,13,10,0,'2026-02-12 13:17:25.664','2026-02-12 13:17:25.664'),(2,11,1,0,'2026-02-12 07:01:24.288','2026-02-12 07:01:24.288');
/*!40000 ALTER TABLE `UserMaterial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserSword`
--

DROP TABLE IF EXISTS `UserSword`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserSword` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` bigint unsigned NOT NULL,
  `level` int unsigned NOT NULL,
  `isOnAnvil` tinyint(1) NOT NULL,
  `swordLevelDefinitionId` bigint unsigned NOT NULL,
  `isSolded` tinyint(1) NOT NULL DEFAULT '0',
  `isBroken` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserSword_code_key` (`code`),
  KEY `UserSword_userId_idx` (`userId`),
  KEY `UserSword_swordLevelDefinitionId_fkey` (`swordLevelDefinitionId`),
  CONSTRAINT `UserSword_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `UserSword_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserSword`
--

LOCK TABLES `UserSword` WRITE;
/*!40000 ALTER TABLE `UserSword` DISABLE KEYS */;
INSERT INTO `UserSword` VALUES (1,'Ele$x%5A3LDI',1,1,0,1,0,0,'2026-02-11 09:01:33.262','2026-02-12 11:08:02.981'),(2,'q^mjLM6oLZdM',1,5,0,7,0,1,'2026-02-11 11:37:19.928','2026-02-12 13:16:04.620'),(3,'BEPDOQ^Jyeps',2,6,0,8,0,1,'2026-02-12 06:44:28.195','2026-02-12 07:01:24.280'),(4,'CgeKwO!a*PyT',3,1,1,1,0,0,'2026-02-12 10:47:15.508','2026-02-12 10:47:15.508'),(5,'tH4NqLnbO5Eb',1,1,1,1,0,0,'2026-02-12 10:49:44.932','2026-02-12 13:16:24.621'),(6,'29GRy*CyB5sQ',1,1,0,1,0,0,'2026-02-12 10:51:11.554','2026-02-12 10:51:11.554'),(7,'nTtZS4IXjPtN',1,1,0,1,0,0,'2026-02-12 10:54:49.982','2026-02-12 10:54:49.982'),(8,'YjHnxDAXs#eP',1,1,0,1,0,0,'2026-02-12 11:20:56.614','2026-02-12 11:20:56.614'),(9,'rhNm&JFXND9a',1,1,0,1,0,0,'2026-02-12 11:21:22.305','2026-02-12 11:21:22.305'),(10,'g9Hv*VMEAu7e',1,1,0,1,0,0,'2026-02-12 13:20:49.839','2026-02-12 13:20:49.839');
/*!40000 ALTER TABLE `UserSword` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserVoucher`
--

DROP TABLE IF EXISTS `UserVoucher`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserVoucher` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` bigint unsigned NOT NULL,
  `goldAmount` int unsigned NOT NULL,
  `status` enum('PENDING','REDEEMED','CANCELLED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `redeemedAt` datetime(3) DEFAULT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `expiresAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserVoucher_code_key` (`code`),
  KEY `UserVoucher_userId_idx` (`userId`),
  KEY `UserVoucher_status_idx` (`status`),
  CONSTRAINT `UserVoucher_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserVoucher`
--

LOCK TABLES `UserVoucher` WRITE;
/*!40000 ALTER TABLE `UserVoucher` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserVoucher` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('088bb7d4-ebb2-453b-871d-9a67bece146e','b1c5d7f25919e24d00186449c08d4403a58bdce0283539719a1f681ec07ff17a',NULL,'20260213054214_add_cascade_deletes_for_user_relations','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260213054214_add_cascade_deletes_for_user_relations\n\nDatabase error code: 1146\n\nDatabase error:\nTable \'sword_game.materialmarketplacepurchase\' doesn\'t exist\n\nPlease check the query number 2 from the migration file.\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name=\"20260213054214_add_cascade_deletes_for_user_relations\"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name=\"20260213054214_add_cascade_deletes_for_user_relations\"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260','2026-02-13 09:46:06.000','2026-02-13 09:43:19.868',0),('a741dad3-5e91-44e4-8aa0-324bb87cb39e','ae4efe4b27b473e439e3130905d35ec5ddbb9e891d34faf9a01bf23a304f0c07',NULL,'20260213054214_add_cascade_deletes_for_user_relations','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260213054214_add_cascade_deletes_for_user_relations\n\nDatabase error code: 1146\n\nDatabase error:\nTable \'sword_game.adrewardsession\' doesn\'t exist\n\nPlease check the query number 1 from the migration file.\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name=\"20260213054214_add_cascade_deletes_for_user_relations\"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name=\"20260213054214_add_cascade_deletes_for_user_relations\"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260','2026-02-13 09:38:52.550','2026-02-13 09:33:31.976',0),('c2870a88-860f-4019-a5ce-7c127677d1c2','7f1111c169f8668ff5ea900ef9f0c4e6aef20495ca658428763b1add063178b6','2026-02-11 08:42:43.406','20260211084242_init',NULL,NULL,'2026-02-11 08:42:42.208',1),('f57dfce3-573c-4e89-9d2c-1e5d4b169ea5','bde5a2dff5a49cfe4769649a7b7a611aba1b18575021eb6148c750887eaa0d98',NULL,'20260213054214_add_cascade_deletes_for_user_relations','A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260213054214_add_cascade_deletes_for_user_relations\n\nDatabase error code: 1091\n\nDatabase error:\nCan\'t DROP \'AdRewardSession_userId_fkey\'; check that column/key exists\n\nPlease check the query number 1 from the migration file.\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name=\"20260213054214_add_cascade_deletes_for_user_relations\"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name=\"20260213054214_add_cascade_deletes_for_user_relations\"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260',NULL,'2026-02-13 09:46:25.541',0);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-13  9:49:30
