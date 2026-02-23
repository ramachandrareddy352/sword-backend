-- AlterTable
ALTER TABLE `adminconfig` ADD COLUMN `appStoreLink` VARCHAR(191) NULL,
    ADD COLUMN `latestVersion` VARCHAR(191) NULL,
    ADD COLUMN `mandatoryUpdateMessage` VARCHAR(191) NULL,
    ADD COLUMN `minRequiredVersion` VARCHAR(191) NULL,
    ADD COLUMN `notificationUpdateMessage` VARCHAR(191) NULL,
    ADD COLUMN `playStoreLink` VARCHAR(191) NULL;
