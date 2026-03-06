-- AlterTable
ALTER TABLE `AdminConfig` ADD COLUMN `exchangeRate` INTEGER UNSIGNED NULL DEFAULT 1000,
    ADD COLUMN `exchangeRateUpdatedAt` DATETIME(3) NULL;
