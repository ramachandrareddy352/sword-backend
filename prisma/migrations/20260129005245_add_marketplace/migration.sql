-- AlterTable
ALTER TABLE `usermaterial` ADD COLUMN `soldedQuantity` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `usershield` ADD COLUMN `soldedQuantity` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `usersword` ADD COLUMN `isSolded` BOOLEAN NOT NULL DEFAULT false;
