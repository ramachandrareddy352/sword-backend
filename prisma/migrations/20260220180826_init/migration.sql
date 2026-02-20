-- DropForeignKey
ALTER TABLE `materialsellhistory` DROP FOREIGN KEY `MaterialSellHistory_materialId_fkey`;

-- DropForeignKey
ALTER TABLE `swordsellhistory` DROP FOREIGN KEY `SwordSellHistory_swordLevelDefinitionId_fkey`;

-- AddForeignKey
ALTER TABLE `SwordSellHistory` ADD CONSTRAINT `SwordSellHistory_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialSellHistory` ADD CONSTRAINT `MaterialSellHistory_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
