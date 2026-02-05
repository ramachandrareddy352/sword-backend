/*
  Warnings:

  - You are about to alter the column `dropPercentage` on the `swordupgradedrop` table. The data in that column could be lost. The data in that column will be cast from `UnsignedInt` to `Float`.

*/
-- AlterTable
ALTER TABLE `swordupgradedrop` MODIFY `dropPercentage` FLOAT NOT NULL;
