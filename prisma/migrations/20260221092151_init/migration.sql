-- AddForeignKey
ALTER TABLE `SwordSynthesisHistory` ADD CONSTRAINT `SwordSynthesisHistory_swordLevelDefinitionId_fkey` FOREIGN KEY (`swordLevelDefinitionId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwordUpgradeHistory` ADD CONSTRAINT `SwordUpgradeHistory_fromSwordLevelId_fkey` FOREIGN KEY (`fromSwordLevelId`) REFERENCES `SwordLevelDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
