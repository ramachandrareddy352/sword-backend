-- AlterTable
ALTER TABLE `AdminConfig` ADD COLUMN `isGameStopped` BOOLEAN NULL DEFAULT false;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `lastNotificationReadTime` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `webLink` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
