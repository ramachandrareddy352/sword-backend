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
    INDEX `AdRewardSession_nonce_idx`(`nonce`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdRewardSession` ADD CONSTRAINT `AdRewardSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
