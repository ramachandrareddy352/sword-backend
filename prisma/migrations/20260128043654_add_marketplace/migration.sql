/*
  Warnings:

  - Added the required column `isOnAnvil` to the `UserShield` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usershield` ADD COLUMN `isOnAnvil` BOOLEAN NOT NULL;
