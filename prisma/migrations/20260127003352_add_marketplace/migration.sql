/*
  Warnings:

  - You are about to drop the column `allowMarketplace` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `allowMaterialTrade` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `allowSwordTrade` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `allowVoucherCancel` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `cooldownSeconds` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `marketplaceFeePercent` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `maxClaimAttempts` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `xAdminId` on the `adminconfig` table. All the data in the column will be lost.
  - You are about to drop the column `xUserId` on the `customersupport` table. All the data in the column will be lost.
  - You are about to drop the column `shieldLevel` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `xUserId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `receiverXId` on the `usergift` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `usergift` table. All the data in the column will be lost.
  - You are about to drop the column `rarity` on the `usergiftitem` table. All the data in the column will be lost.
  - You are about to drop the column `isInMarket` on the `usermaterial` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `usersword` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `MaterialType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `SwordLevelDefinition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[verificationToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `adminEmailId` to the `AdminConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `CustomerSupport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `power` to the `SwordLevelDefinition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingCost` to the `SwordLevelDefinition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverId` to the `UserGift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isOnAnvil` to the `UserSword` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `customersupport` DROP FOREIGN KEY `CustomerSupport_xUserId_fkey`;

-- DropForeignKey
ALTER TABLE `usergift` DROP FOREIGN KEY `UserGift_userId_fkey`;

-- DropForeignKey
ALTER TABLE `usermaterial` DROP FOREIGN KEY `UserMaterial_materialId_fkey`;

-- DropIndex
DROP INDEX `CustomerSupport_createdAt_idx` ON `customersupport`;

-- DropIndex
DROP INDEX `CustomerSupport_xUserId_idx` ON `customersupport`;

-- DropIndex
DROP INDEX `User_xUserId_key` ON `user`;

-- DropIndex
DROP INDEX `UserGift_receiverXId_idx` ON `usergift`;

-- DropIndex
DROP INDEX `UserGift_userId_fkey` ON `usergift`;

-- DropIndex
DROP INDEX `UserSword_state_idx` ON `usersword`;

-- AlterTable
ALTER TABLE `adminconfig` DROP COLUMN `allowMarketplace`,
    DROP COLUMN `allowMaterialTrade`,
    DROP COLUMN `allowSwordTrade`,
    DROP COLUMN `allowVoucherCancel`,
    DROP COLUMN `cooldownSeconds`,
    DROP COLUMN `marketplaceFeePercent`,
    DROP COLUMN `maxClaimAttempts`,
    DROP COLUMN `xAdminId`,
    ADD COLUMN `adminEmailId` VARCHAR(191) NOT NULL,
    ADD COLUMN `expiryallowVoucherCancel` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `defaultTrustPoints` INTEGER NOT NULL DEFAULT 100,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `customersupport` DROP COLUMN `xUserId`,
    ADD COLUMN `userId` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `swordleveldefinition` ADD COLUMN `power` INTEGER NOT NULL,
    ADD COLUMN `sellingCost` BIGINT NOT NULL,
    MODIFY `description` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `shieldLevel`,
    DROP COLUMN `xUserId`,
    ADD COLUMN `anvilShieldId` BIGINT NULL,
    ADD COLUMN `email` VARCHAR(191) NOT NULL,
    ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `password` VARCHAR(191) NOT NULL,
    ADD COLUMN `resetToken` VARCHAR(191) NULL,
    ADD COLUMN `resetTokenExpiry` DATETIME(3) NULL,
    ADD COLUMN `verificationToken` VARCHAR(191) NULL,
    MODIFY `anvilSwordId` BIGINT NULL;

-- AlterTable
ALTER TABLE `usergift` DROP COLUMN `receiverXId`,
    DROP COLUMN `userId`,
    ADD COLUMN `receiverId` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `usergiftitem` DROP COLUMN `rarity`,
    ADD COLUMN `materialRarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NULL,
    ADD COLUMN `shieldId` BIGINT NULL,
    ADD COLUMN `shieldRarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NULL,
    MODIFY `type` ENUM('GOLD', 'TRUST_POINTS', 'MATERIAL', 'SWORD', 'SHIELD') NOT NULL;

-- AlterTable
ALTER TABLE `usermaterial` DROP COLUMN `isInMarket`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `usersword` DROP COLUMN `state`,
    ADD COLUMN `isOnAnvil` BOOLEAN NOT NULL;

-- CreateTable
CREATE TABLE `ShieldType` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `image` VARCHAR(191) NOT NULL,
    `cost` BIGINT NOT NULL,
    `power` INTEGER NOT NULL,
    `rarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NOT NULL DEFAULT 'COMMON',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShieldType_code_key`(`code`),
    UNIQUE INDEX `ShieldType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserShield` (
    `userId` BIGINT NOT NULL,
    `shieldId` BIGINT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserShield_shieldId_idx`(`shieldId`),
    PRIMARY KEY (`userId`, `shieldId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplaceItem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `itemType` ENUM('SWORD', 'MATERIAL', 'SHIELD') NOT NULL,
    `swordLevelDefinitionId` BIGINT NULL,
    `shieldTypeId` BIGINT NULL,
    `shieldRarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NULL,
    `materialId` BIGINT NULL,
    `rarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NULL,
    `priceGold` BIGINT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPurchased` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketplaceItem_itemType_idx`(`itemType`),
    INDEX `MarketplaceItem_swordLevelDefinitionId_idx`(`swordLevelDefinitionId`),
    INDEX `MarketplaceItem_materialId_idx`(`materialId`),
    INDEX `MarketplaceItem_shieldTypeId_idx`(`shieldTypeId`),
    INDEX `MarketplaceItem_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketplacePurchase` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `marketplaceItemId` BIGINT NOT NULL,
    `priceGold` BIGINT NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketplacePurchase_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AdminConfig_adminEmailId_idx` ON `AdminConfig`(`adminEmailId`);

-- CreateIndex
CREATE INDEX `CustomerSupport_userId_idx` ON `CustomerSupport`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `MaterialType_name_key` ON `MaterialType`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `SwordLevelDefinition_name_key` ON `SwordLevelDefinition`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `User_verificationToken_key` ON `User`(`verificationToken`);

-- CreateIndex
CREATE UNIQUE INDEX `User_resetToken_key` ON `User`(`resetToken`);

-- CreateIndex
CREATE INDEX `UserGift_receiverId_idx` ON `UserGift`(`receiverId`);

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `MaterialType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserShield` ADD CONSTRAINT `UserShield_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserShield` ADD CONSTRAINT `UserShield_shieldId_fkey` FOREIGN KEY (`shieldId`) REFERENCES `ShieldType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGift` ADD CONSTRAINT `UserGift_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceItem` ADD CONSTRAINT `MarketplaceItem_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceItem` ADD CONSTRAINT `MarketplaceItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `MaterialType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplaceItem` ADD CONSTRAINT `MarketplaceItem_shieldTypeId_fkey` FOREIGN KEY (`shieldTypeId`) REFERENCES `ShieldType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplacePurchase` ADD CONSTRAINT `MarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketplacePurchase` ADD CONSTRAINT `MarketplacePurchase_marketplaceItemId_fkey` FOREIGN KEY (`marketplaceItemId`) REFERENCES `MarketplaceItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerSupport` ADD CONSTRAINT `CustomerSupport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
