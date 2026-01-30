-- CreateIndex
CREATE INDEX `UserGiftItem_materialId_idx` ON `UserGiftItem`(`materialId`);

-- CreateIndex
CREATE INDEX `UserGiftItem_swordLevel_idx` ON `UserGiftItem`(`swordLevel`);

-- CreateIndex
CREATE INDEX `UserGiftItem_shieldId_idx` ON `UserGiftItem`(`shieldId`);

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `MaterialType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_swordLevel_fkey` FOREIGN KEY (`swordLevel`) REFERENCES `SwordLevelDefinition`(`level`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGiftItem` ADD CONSTRAINT `UserGiftItem_shieldId_fkey` FOREIGN KEY (`shieldId`) REFERENCES `ShieldType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
