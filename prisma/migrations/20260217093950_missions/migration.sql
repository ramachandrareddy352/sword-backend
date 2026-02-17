/*
  Warnings:

  - You are about to drop the column `progress` on the `userdailymissionprogress` table. All the data in the column will be lost.
  - You are about to drop the column `isClaimed` on the `useronetimemissionprogress` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `useronetimemissionprogress` table. All the data in the column will be lost.
  - Added the required column `claimedTimes` to the `UserDailyMissionProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `userdailymissionprogress` DROP COLUMN `progress`,
    ADD COLUMN `claimedTimes` INTEGER UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `useronetimemissionprogress` DROP COLUMN `isClaimed`,
    DROP COLUMN `progress`,
    ADD COLUMN `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
