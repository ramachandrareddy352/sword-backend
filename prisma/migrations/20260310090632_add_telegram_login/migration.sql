/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `isTelegramLogin` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `telegramId` BIGINT NULL,
    ADD COLUMN `telegramUser` VARCHAR(191) NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `password` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_telegramId_key` ON `User`(`telegramId`);
