-- CreateTable
CREATE TABLE `AdminConfig` (
    `id` BIGINT NOT NULL DEFAULT 1,
    `maxDailyAds` INTEGER NOT NULL DEFAULT 10,
    `maxDailyMissions` INTEGER NOT NULL DEFAULT 20,
    `defaultTrustPoints` INTEGER NOT NULL DEFAULT 0,
    `allowSwordTrade` BOOLEAN NOT NULL DEFAULT true,
    `allowMaterialTrade` BOOLEAN NOT NULL DEFAULT true,
    `minVoucherGold` BIGINT NOT NULL DEFAULT 1000,
    `maxVoucherGold` BIGINT NOT NULL DEFAULT 100000,
    `voucherExpiryDays` INTEGER NOT NULL DEFAULT 7,
    `allowVoucherCancel` BOOLEAN NOT NULL DEFAULT true,
    `marketplaceFeePercent` INTEGER NOT NULL DEFAULT 500,
    `allowMarketplace` BOOLEAN NOT NULL DEFAULT true,
    `maxClaimAttempts` INTEGER NOT NULL DEFAULT 3,
    `cooldownSeconds` INTEGER NOT NULL DEFAULT 5,
    `xAdminId` BIGINT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `xUserId` BIGINT NOT NULL,
    `gold` BIGINT NOT NULL DEFAULT 0,
    `trustPoints` INTEGER NOT NULL DEFAULT 100,
    `shieldLevel` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReviewed` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `oneDayAdsViewed` BIGINT NOT NULL DEFAULT 0,
    `totalAdsViewed` BIGINT NOT NULL DEFAULT 0,
    `totalMissionsDone` BIGINT NOT NULL DEFAULT 0,
    `isBanned` BOOLEAN NOT NULL DEFAULT false,
    `anvilSwordId` INTEGER NULL,
    `soundOn` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `User_xUserId_key`(`xUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserVoucher` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `userId` BIGINT NOT NULL,
    `goldAmount` BIGINT NOT NULL,
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
CREATE TABLE `SwordLevelDefinition` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `level` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `upgradeCost` BIGINT NOT NULL,
    `successRate` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SwordLevelDefinition_level_key`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSword` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `userId` BIGINT NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 0,
    `state` ENUM('BAG', 'ANVIL', 'MARKETPLACE') NOT NULL DEFAULT 'BAG',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `swordLevelDefinitionId` BIGINT NULL,

    UNIQUE INDEX `UserSword_code_key`(`code`),
    INDEX `UserSword_userId_idx`(`userId`),
    INDEX `UserSword_state_idx`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaterialType` (
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

    UNIQUE INDEX `MaterialType_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMaterial` (
    `userId` BIGINT NOT NULL,
    `materialId` BIGINT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `isInMarket` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserMaterial_materialId_idx`(`materialId`),
    PRIMARY KEY (`userId`, `materialId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserGift` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `receiverXId` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'CLAIMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(191) NULL,
    `claimedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` BIGINT NULL,

    INDEX `UserGift_receiverXId_idx`(`receiverXId`),
    INDEX `UserGift_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserGiftItem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `giftId` BIGINT NOT NULL,
    `type` ENUM('GOLD', 'TRUST_POINTS', 'MATERIAL', 'SWORD') NOT NULL,
    `amount` BIGINT NULL,
    `materialId` BIGINT NULL,
    `rarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC') NULL,
    `swordLevel` INTEGER NULL,

    INDEX `UserGiftItem_giftId_idx`(`giftId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerSupport` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `xUserId` BIGINT NOT NULL,
    `category` ENUM('GAME_BUG', 'PAYMENT', 'ACCOUNT', 'BAN_APPEAL', 'SUGGESTION', 'OTHER') NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `adminReply` VARCHAR(191) NULL,
    `isReviewed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `CustomerSupport_xUserId_idx`(`xUserId`),
    INDEX `CustomerSupport_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMaterial` ADD CONSTRAINT `UserMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `MaterialType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGift` ADD CONSTRAINT `UserGift_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_giftId_fkey` FOREIGN KEY (`giftId`) REFERENCES `UserGift`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerSupport` ADD CONSTRAINT `CustomerSupport_xUserId_fkey` FOREIGN KEY (`xUserId`) REFERENCES `User`(`xUserId`) ON DELETE CASCADE ON UPDATE CASCADE;
