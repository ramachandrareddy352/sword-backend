-- CreateTable
CREATE TABLE `AdminConfig` (
    `id` BIGINT UNSIGNED NOT NULL DEFAULT 1,
    `shieldGoldPrice` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `maxDailyShieldAds` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `maxShieldHold` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `shieldActiveOnMarketplace` BOOLEAN NOT NULL DEFAULT true,
    `defaultTrustPoints` INTEGER UNSIGNED NOT NULL DEFAULT 100,
    `defaultGold` INTEGER UNSIGNED NOT NULL DEFAULT 5000,
    `maxDailySwordAds` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `swordLevelReward` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `maxDailyGoldAds` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `goldReward` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `minVoucherGold` INTEGER UNSIGNED NOT NULL DEFAULT 10,
    `maxVoucherGold` INTEGER UNSIGNED NOT NULL DEFAULT 1000,
    `voucherExpiryDays` INTEGER UNSIGNED NOT NULL DEFAULT 7,
    `expiryAllow` BOOLEAN NOT NULL DEFAULT false,
    `isShoppingAllowed` BOOLEAN NOT NULL DEFAULT true,
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
    `anvilSwordLevel` BIGINT UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReviewed` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `oneDayGoldAdsViewed` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `oneDayShieldAdsViewed` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `oneDaySwordAdsViewed` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `totalAdsViewed` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `totalMissionsDone` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `isShieldOn` BOOLEAN NOT NULL DEFAULT false,
    `isBanned` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_anvilSwordLevel_key`(`anvilSwordLevel`),
    INDEX `User_anvilSwordLevel_idx`(`anvilSwordLevel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserVoucher` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `createdById` BIGINT UNSIGNED NOT NULL,
    `allowedUserId` BIGINT UNSIGNED NULL,
    `goldAmount` INTEGER UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'REDEEMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `redeemedById` BIGINT UNSIGNED NULL,
    `updatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserVoucher_code_key`(`code`),
    INDEX `UserVoucher_createdById_idx`(`createdById`),
    INDEX `UserVoucher_allowedUserId_idx`(`allowedUserId`),
    INDEX `UserVoucher_redeemedById_idx`(`redeemedById`),
    INDEX `UserVoucher_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyMissionDefinition` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `conditions` JSON NOT NULL,
    `targetValue` INTEGER UNSIGNED NOT NULL,
    `reward` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserDailyMissionProgress` (
    `userId` BIGINT UNSIGNED NOT NULL,
    `missionId` BIGINT UNSIGNED NOT NULL,
    `claimedTimes` INTEGER UNSIGNED NOT NULL,
    `lastClaimedAt` DATETIME(3) NULL,

    INDEX `UserDailyMissionProgress_userId_idx`(`userId`),
    INDEX `UserDailyMissionProgress_missionId_idx`(`missionId`),
    PRIMARY KEY (`userId`, `missionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OneTimeMissionDefinition` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `conditions` JSON NOT NULL,
    `targetValue` INTEGER UNSIGNED NOT NULL,
    `reward` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserOneTimeMissionProgress` (
    `userId` BIGINT UNSIGNED NOT NULL,
    `missionId` BIGINT UNSIGNED NOT NULL,
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserOneTimeMissionProgress_userId_idx`(`userId`),
    INDEX `UserOneTimeMissionProgress_missionId_idx`(`missionId`),
    PRIMARY KEY (`userId`, `missionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdRewardSession` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `nonce` VARCHAR(191) NOT NULL,
    `rewardType` ENUM('GOLD', 'OLD_SWORD', 'SHIELD') NOT NULL,
    `rewarded` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rewardedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AdRewardSession_nonce_key`(`nonce`),
    INDEX `AdRewardSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordLevelDefinition` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `level` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `synthesizeName` VARCHAR(191) NOT NULL,
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
    UNIQUE INDEX `SwordLevelDefinition_synthesizeName_key`(`synthesizeName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordSynthesisRequirement` (
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `materialId` BIGINT UNSIGNED NOT NULL,
    `requiredQuantity` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `SwordSynthesisRequirement_swordLevelDefinitionId_materialId_key`(`swordLevelDefinitionId`, `materialId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordUpgradeDrop` (
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `materialId` BIGINT UNSIGNED NOT NULL,
    `dropPercentage` INTEGER UNSIGNED NOT NULL,
    `minQuantity` INTEGER UNSIGNED NOT NULL,
    `maxQuantity` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `SwordUpgradeDrop_swordLevelDefinitionId_materialId_key`(`swordLevelDefinitionId`, `materialId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordSynthesisHistory` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `goldSpent` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SwordSynthesisHistory_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordUpgradeHistory` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `fromSwordLevelId` BIGINT UNSIGNED NOT NULL,
    `toSwordLevelId` BIGINT UNSIGNED NULL,
    `success` BOOLEAN NOT NULL,
    `goldSpent` INTEGER UNSIGNED NOT NULL,
    `droppedMaterialId` BIGINT UNSIGNED NULL,
    `droppedQuantity` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SwordUpgradeHistory_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordSellHistory` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL,
    `priceGold` INTEGER UNSIGNED NOT NULL,
    `soldAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SwordSellHistory_userId_soldAt_idx`(`userId`, `soldAt` DESC),
    INDEX `SwordSellHistory_swordLevelDefinitionId_soldAt_idx`(`swordLevelDefinitionId`, `soldAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSword` (
    `userId` BIGINT UNSIGNED NOT NULL,
    `swordId` BIGINT UNSIGNED NOT NULL,
    `isOnAnvil` BOOLEAN NOT NULL DEFAULT false,
    `unsoldQuantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `soldedQuantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `brokenQuantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserSword_swordId_idx`(`swordId`),
    INDEX `UserSword_userId_idx`(`userId`),
    PRIMARY KEY (`userId`, `swordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Material` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image` VARCHAR(191) NOT NULL,
    `rarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NOT NULL DEFAULT 'COMMON',
    `sellingCost` INTEGER UNSIGNED NOT NULL,
    `buyingCost` INTEGER UNSIGNED NOT NULL,
    `isBuyingAllow` BOOLEAN NOT NULL DEFAULT true,
    `isSellingAllow` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Material_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaterialSellHistory` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `materialId` BIGINT UNSIGNED NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL,
    `priceGold` INTEGER UNSIGNED NOT NULL,
    `soldAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MaterialSellHistory_userId_soldAt_idx`(`userId`, `soldAt` DESC),
    INDEX `MaterialSellHistory_materialId_idx`(`materialId`),
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

    INDEX `UserMaterial_userId_idx`(`userId`),
    INDEX `UserMaterial_materialId_idx`(`materialId`),
    PRIMARY KEY (`userId`, `materialId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserGift` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `receiverId` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'CLAIMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(191) NULL,
    `type` ENUM('GOLD', 'TRUST_POINTS', 'MATERIAL', 'SWORD', 'SHIELD') NOT NULL,
    `amount` INTEGER UNSIGNED NULL,
    `materialId` BIGINT UNSIGNED NULL,
    `materialQuantity` INTEGER UNSIGNED NULL,
    `swordId` BIGINT UNSIGNED NULL,
    `swordQuantity` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelledAt` DATETIME(3) NULL,
    `claimedAt` DATETIME(3) NULL,

    INDEX `UserGift_receiverId_status_idx`(`receiverId`, `status`),
    INDEX `UserGift_type_createdAt_idx`(`type`, `createdAt` DESC),
    INDEX `UserGift_status_createdAt_idx`(`status`, `createdAt` DESC),
    INDEX `UserGift_receiverId_claimedAt_idx`(`receiverId`, `claimedAt`),
    INDEX `UserGift_createdAt_idx`(`createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwordMarketplacePurchase` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` BIGINT UNSIGNED NOT NULL,
    `swordLevelDefinitionId` BIGINT UNSIGNED NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `priceGold` INTEGER UNSIGNED NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SwordMarketplacePurchase_userId_idx`(`userId`),
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
    INDEX `MaterialMarketplacePurchase_materialId_idx`(`materialId`),
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
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_allowedUserId_fkey` FOREIGN KEY (`allowedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_redeemedById_fkey` FOREIGN KEY (`redeemedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDailyMissionProgress` ADD CONSTRAINT `UserDailyMissionProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDailyMissionProgress` ADD CONSTRAINT `UserDailyMissionProgress_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `DailyMissionDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOneTimeMissionProgress` ADD CONSTRAINT `UserOneTimeMissionProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOneTimeMissionProgress` ADD CONSTRAINT `UserOneTimeMissionProgress_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `OneTimeMissionDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdRewardSession` ADD CONSTRAINT `AdRewardSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisRequirement` ADD CONSTRAINT `SwordSynthesisRequirement_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisRequirement` ADD CONSTRAINT `SwordSynthesisRequirement_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeDrop` ADD CONSTRAINT `SwordUpgradeDrop_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeDrop` ADD CONSTRAINT `SwordUpgradeDrop_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeHistory` ADD CONSTRAINT `SwordUpgradeHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSellHistory` ADD CONSTRAINT `SwordSellHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordSellHistory` ADD CONSTRAINT `SwordSellHistory_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialSellHistory` ADD CONSTRAINT `MaterialSellHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialSellHistory` ADD CONSTRAINT `MaterialSellHistory_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGift` ADD CONSTRAINT `UserGift_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGift` ADD CONSTRAINT `UserGift_swordId_fkey` FOREIGN KEY (`swordId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGift` ADD CONSTRAINT `UserGift_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordMarketplacePurchase` ADD CONSTRAINT `SwordMarketplacePurchase_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialMarketplacePurchase` ADD CONSTRAINT `MaterialMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialMarketplacePurchase` ADD CONSTRAINT `MaterialMarketplacePurchase_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShieldMarketplacePurchase` ADD CONSTRAINT `ShieldMarketplacePurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerSupport` ADD CONSTRAINT `CustomerSupport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
