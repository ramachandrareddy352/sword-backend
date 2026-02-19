/*
  Warnings:

  - You are about to drop the column `userId` on the `uservoucher` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `UserVoucher` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `uservoucher` DROP FOREIGN KEY `UserVoucher_userId_fkey`;

-- DropIndex
DROP INDEX `UserVoucher_userId_idx` ON `uservoucher`;

-- AlterTable
ALTER TABLE `uservoucher` DROP COLUMN `userId`,
    ADD COLUMN `allowedUserId` BIGINT UNSIGNED NULL,
    ADD COLUMN `createdById` BIGINT UNSIGNED NOT NULL,
    ADD COLUMN `redeemedById` BIGINT UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `UserVoucher_createdById_idx` ON `UserVoucher`(`createdById`);

-- CreateIndex
CREATE INDEX `UserVoucher_allowedUserId_idx` ON `UserVoucher`(`allowedUserId`);

-- AddForeignKey
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_allowedUserId_fkey` FOREIGN KEY (`allowedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVoucher` ADD CONSTRAINT `UserVoucher_redeemedById_fkey` FOREIGN KEY (`redeemedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
