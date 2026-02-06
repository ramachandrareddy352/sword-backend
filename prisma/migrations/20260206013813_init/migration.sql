/*
  Warnings:

  - A unique constraint covering the columns `[synthesizeName]` on the table `SwordLevelDefinition` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `synthesizeName` to the `SwordLevelDefinition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `swordleveldefinition` ADD COLUMN `synthesizeName` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SwordLevelDefinition_synthesizeName_key` ON `SwordLevelDefinition`(`synthesizeName`);
