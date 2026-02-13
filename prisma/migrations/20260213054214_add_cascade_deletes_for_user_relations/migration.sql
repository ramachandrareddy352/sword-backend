-- DropForeignKey
ALTER TABLE `adrewardsession` DROP FOREIGN KEY `AdRewardSession_userId_fkey`;

-- DropForeignKey
ALTER TABLE `materialmarketplacepurchase` DROP FOREIGN KEY `MaterialMarketplacePurchase_materialId_fkey`;

-- DropForeignKey
ALTER TABLE `materialmarketplacepurchase` DROP FOREIGN KEY `MaterialMarketplacePurchase_userId_fkey`;

-- DropForeignKey
ALTER TABLE `shieldmarketplacepurchase` DROP FOREIGN KEY `ShieldMarketplacePurchase_userId_fkey`;

-- DropForeignKey
ALTER TABLE `swordmarketplacepurchase` DROP FOREIGN KEY `SwordMarketplacePurchase_swordId_fkey`;

-- DropForeignKey
ALTER TABLE `swordmarketplacepurchase` DROP FOREIGN KEY `SwordMarketplacePurchase_swordLevelDefinitionId_fkey`;

-- DropForeignKey
ALTER TABLE `swordmarketplacepurchase` DROP FOREIGN KEY `SwordMarketplacePurchase_userId_fkey`;

-- DropForeignKey
ALTER TABLE `swordsynthesishistory` DROP FOREIGN KEY `SwordSynthesisHistory_createdSwordId_fkey`;

-- DropForeignKey
ALTER TABLE `swordsynthesishistory` DROP FOREIGN KEY `SwordSynthesisHistory_swordLevelDefinitionId_fkey`;

-- DropForeignKey
ALTER TABLE `swordsynthesishistory` DROP FOREIGN KEY `SwordSynthesisHistory_userId_fkey`;

-- DropForeignKey
ALTER TABLE `swordupgradehistory` DROP FOREIGN KEY `SwordUpgradeHistory_swordId_fkey`;

-- DropForeignKey
ALTER TABLE `swordupgradehistory` DROP FOREIGN KEY `SwordUpgradeHistory_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_anvilSwordId_fkey`;

-- DropForeignKey
ALTER TABLE `usergift` DROP FOREIGN KEY `UserGift_receiverId_fkey`;

-- DropForeignKey
ALTER TABLE `usergiftitem` DROP FOREIGN KEY `UserGiftItem_materialId_fkey`;

-- DropForeignKey
ALTER TABLE `usergiftitem` DROP FOREIGN KEY `UserGiftItem_swordLevel_fkey`;

-- DropForeignKey
ALTER TABLE `usermaterial` DROP FOREIGN KEY `UserMaterial_materialId_fkey`;

-- DropForeignKey
ALTER TABLE `usersword` DROP FOREIGN KEY `UserSword_swordLevelDefinitionId_fkey`;

-- DropIndex
DROP INDEX `MaterialMarketplacePurchase_materialId_fkey` ON `materialmarketplacepurchase`;

-- DropIndex
DROP INDEX `SwordSynthesisHistory_createdSwordId_fkey` ON `swordsynthesishistory`;

-- DropIndex
DROP INDEX `SwordSynthesisHistory_swordLevelDefinitionId_fkey` ON `swordsynthesishistory`;

-- DropIndex
DROP INDEX `SwordSynthesisHistory_userId_fkey` ON `swordsynthesishistory`;

-- DropIndex
DROP INDEX `SwordUpgradeHistory_swordId_fkey` ON `swordupgradehistory`;

-- DropIndex
DROP INDEX `SwordUpgradeHistory_userId_fkey` ON `swordupgradehistory`;

-- DropIndex
DROP INDEX `UserSword_swordLevelDefinitionId_fkey` ON `usersword`;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_anvilSwordId_fkey` FOREIGN KEY (`anvilSwordId`) REFERENCES `UserSword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdRewardSession` ADD CONSTRAINT `AdRewardSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_createdSwordId_fkey` FOREIGN KEY (`createdSwordId`) REFERENCES `UserSword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeHistory` ADD CONSTRAINT `SwordUpgradeHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeHistory` ADD CONSTRAINT `SwordUpgradeHistory_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `UserSword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGift` ADD CONSTRAINT `UserGift_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_swordLevel_fkey` FOREIGN KEY (`swordLevel`) REFERENCES `SwordLevelDefinition`(`level`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `UserSword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialMarketplacePurchase` ADD CONSTRAINT `MaterialMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialMarketplacePurchase` ADD CONSTRAINT `MaterialMarketplacePurchase_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShieldMarketplacePurchase` ADD CONSTRAINT `ShieldMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
