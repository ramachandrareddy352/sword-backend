/*
  Warnings:

  - Made the column `swordLevelDefinitionId` on table `usersword` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `usersword` DROP FOREIGN KEY `UserSword_swordLevelDefinitionId_fkey`;

-- DropIndex
DROP INDEX `UserSword_swordLevelDefinitionId_fkey` ON `usersword`;

-- AlterTable
ALTER TABLE `usersword` MODIFY `swordLevelDefinitionId` BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE `UserSword` ADD CONSTRAINT `UserSword_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
