-- CreateTable
CREATE TABLE `AdminConfig` (
    `id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
    `shieldGoldPrice` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `maxDailyShieldAds` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `maxShieldHold` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `shieldActiveOnMarketplace` BOOLEAN NOT NULL DEFAULT true,
    `maxDailyAds` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `maxDailyMissions` INTEGER UNSIGNED NOT NULL DEFAULT 20,
    `defaultTrustPoints` INTEGER UNSIGNED NOT NULL DEFAULT 100,
    `defaultGold` INTEGER UNSIGNED NOT NULL DEFAULT 5000,
    `minVoucherGold` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `maxVoucherGold` INTEGER UNSIGNED NOT NULL DEFAULT 1000,
    `voucherExpiryDays` INTEGER UNSIGNED NOT NULL DEFAULT 7,
    `expiryAllow` BOOLEAN NOT NULL DEFAULT false,
    `adminEmailId` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdminConfig_adminEmailId_idx`(`adminEmailId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `profileLogo` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `gold` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `trustPoints` INTEGER UNSIGNED NOT NULL DEFAULT 100,
    `totalShields` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `anvilSwordId` BIGINT UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReviewed` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `oneDayAdsViewed` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `totalAdsViewed` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `oneDayShieldAdsViewed` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `todayMissionsDone` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `totalMissionsDone` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `isBanned` BOOLEAN NOT NULL DEFAULT false,
    `soundOn` BOOLEAN NOT NULL DEFAULT true,
    `userBadgelevel` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_anvilSwordId_key`(`anvilSwordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordLevelDefinition` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `level` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `upgradeCost` INTEGER UNSIGNED NOT NULL,
    `buyingCost` INTEGER UNSIGNED NOT NULL,
    `sellingCost` INTEGER UNSIGNED NOT NULL,
    `synthesizeCost` INTEGER UNSIGNED NOT NULL,
    `successRate` DOUBLE NOT NULL,
    `isBuyingAllow` BOOLEAN NOT NULL DEFAULT true,
    `isSellingAllow` BOOLEAN NOT NULL DEFAULT true,
    `isSynthesizeAllow` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SwordLevelDefinition_level_key`(`level`),
    UNIQUE INDEX `SwordLevelDefinition_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordSynthesisRequirement` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `materialId` BIGINT UNSIGNED NOT NULL,
    `requiredQuantity` INTEGER UNSIGNED NOT NULL,

    INDEX `SwordSynthesisRequirement_materialId_idx`(`materialId`),
    UNIQUE INDEX `SwordSynthesisRequirement_swordLevelDefinitionId_materialId_key`(`swordLevelDefinitionId`, `materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordUpgradeDrop` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `materialId` BIGINT UNSIGNED NOT NULL,
    `dropPercentage` INTEGER UNSIGNED NOT NULL,
    `minQuantity` INTEGER UNSIGNED NOT NULL,
    `maxQuantity` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `SwordUpgradeDrop_swordLevelDefinitionId_materialId_key`(`swordLevelDefinitionId`, `materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordSynthesisHistory` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `createdSwordId` BIGINT UNSIGNED NULL,
    `goldSpent` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordUpgradeHistory` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `swordId` BIGINT UNSIGNED NOT NULL,
    `fromSwordLevelId` BIGINT UNSIGNED NOT NULL,
    `toSwordLevelId` BIGINT UNSIGNED NULL,
    `success` BOOLEAN NOT NULL,
    `goldSpent` INTEGER UNSIGNED NOT NULL,
    `droppedMaterialId` BIGINT UNSIGNED NULL,
    `droppedQuantity` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSword` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `userId` BIGINT UNSIGNED NOT NULL,
    `level` INTEGER UNSIGNED NOT NULL,
    `isOnAnvil` BOOLEAN NOT NULL,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `isSolded` BOOLEAN NOT NULL DEFAULT false,
    `isBroken` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserSword_code_key`(`code`),
    INDEX `UserSword_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserVoucher` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `userId` BIGINT UNSIGNED NOT NULL,
    `goldAmount` INTEGER UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'REDEEMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `redeemedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserVoucher_code_key`(`code`),
    INDEX `UserVoucher_userId_idx`(`userId`),
    INDEX `UserVoucher_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Material` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `image` VARCHAR(191) NOT NULL,
    `rarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NOT NULL DEFAULT 'COMMON',
    `sellingCost` INTEGER UNSIGNED NOT NULL,
    `buyingCost` INTEGER UNSIGNED NOT NULL,
    `isBuyingAllow` BOOLEAN NOT NULL DEFAULT true,
    `isSellingAllow` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Material_code_key`(`code`),
    UNIQUE INDEX `Material_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMaterial` (
    `userId` BIGINT UNSIGNED NOT NULL,
    `materialId` BIGINT UNSIGNED NOT NULL,
    `unsoldQuantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `soldedQuantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserMaterial_materialId_idx`(`materialId`),
    PRIMARY KEY (`userId`, `materialId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserGift` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `receiverId` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'CLAIMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelledAt` DATETIME(3) NULL,
    `claimedAt` DATETIME(3) NULL,

    INDEX `UserGift_receiverId_idx`(`receiverId`),
    INDEX `UserGift_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserGiftItem` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `giftId` BIGINT UNSIGNED NOT NULL,
    `type` ENUM('GOLD', 'TRUST_POINTS', 'MATERIAL', 'SWORD', 'SHIELD') NOT NULL,
    `amount` INTEGER UNSIGNED NULL,
    `materialId` BIGINT UNSIGNED NULL,
    `swordLevel` INTEGER UNSIGNED NULL,

    INDEX `UserGiftItem_giftId_idx`(`giftId`),
    INDEX `UserGiftItem_materialId_idx`(`materialId`),
    INDEX `UserGiftItem_swordLevel_idx`(`swordLevel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordMarketplacePurchase` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `swordId` BIGINT UNSIGNED NOT NULL,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `priceGold` INTEGER UNSIGNED NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SwordMarketplacePurchase_userId_idx`(`userId`),
    INDEX `SwordMarketplacePurchase_swordId_idx`(`swordId`),
    INDEX `SwordMarketplacePurchase_swordLevelDefinitionId_idx`(`swordLevelDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaterialMarketplacePurchase` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `materialId` BIGINT UNSIGNED NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL,
    `priceGold` INTEGER UNSIGNED NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MaterialMarketplacePurchase_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShieldMarketplacePurchase` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL,
    `priceGold` INTEGER UNSIGNED NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ShieldMarketplacePurchase_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerSupport` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `category` ENUM('GAME_BUG', 'PAYMENT', 'ACCOUNT', 'BAN_APPEAL', 'SUGGESTION', 'OTHER') NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `adminReply` TEXT NULL,
    `isReviewed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `CustomerSupport_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_anvilSwordId_fkey` FOREIGN KEY (`anvilSwordId`) REFERENCES `UserSword`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisRequirement` ADD CONSTRAINT `SwordSynthesisRequirement_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisRequirement` ADD CONSTRAINT `SwordSynthesisRequirement_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeDrop` ADD CONSTRAINT `SwordUpgradeDrop_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeDrop` ADD CONSTRAINT `SwordUpgradeDrop_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_createdSwordId_fkey` FOREIGN KEY (`createdSwordId`) REFERENCES `UserSword`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeHistory` ADD CONSTRAINT `SwordUpgradeHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeHistory` ADD CONSTRAINT `SwordUpgradeHistory_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `UserSword`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGift` ADD CONSTRAINT `UserGift_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_swordLevel_fkey` FOREIGN KEY (`swordLevel`) REFERENCES `SwordLevelDefinition`(`level`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_giftId_fkey` FOREIGN KEY (`giftId`) REFERENCES `UserGift`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `UserSword`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialMarketplacePurchase` ADD CONSTRAINT `MaterialMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialMarketplacePurchase` ADD CONSTRAINT `MaterialMarketplacePurchase_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShieldMarketplacePurchase` ADD CONSTRAINT `ShieldMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerSupport` ADD CONSTRAINT `CustomerSupport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
