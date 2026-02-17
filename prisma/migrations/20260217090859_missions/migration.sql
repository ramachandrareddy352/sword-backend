/*
  Warnings:

  - You are about to drop the column `backgroundMusicOn` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `backgroundMusicOn`;

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
CREATE TABLE `UserDailyMissionProgress` (
    `userId` BIGINT UNSIGNED NOT NULL,
    `missionId` BIGINT UNSIGNED NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `lastClaimedAt` DATETIME(3) NULL,

    PRIMARY KEY (`userId`, `missionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserOneTimeMissionProgress` (
    `userId` BIGINT UNSIGNED NOT NULL,
    `missionId` BIGINT UNSIGNED NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `isClaimed` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`userId`, `missionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserDailyMissionProgress` ADD CONSTRAINT `UserDailyMissionProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDailyMissionProgress` ADD CONSTRAINT `UserDailyMissionProgress_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `DailyMissionDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOneTimeMissionProgress` ADD CONSTRAINT `UserOneTimeMissionProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOneTimeMissionProgress` ADD CONSTRAINT `UserOneTimeMissionProgress_missionId_fkey` FOREIGN KEY (`missionId`) REFERENCES `OneTimeMissionDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
