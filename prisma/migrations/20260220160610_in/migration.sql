-- CreateIndex
CREATE INDEX `SwordSynthesisRequirement_swordLevelDefinitionId_idx` ON `SwordSynthesisRequirement`(`swordLevelDefinitionId`);

-- CreateIndex
CREATE INDEX `SwordUpgradeDrop_swordLevelDefinitionId_idx` ON `SwordUpgradeDrop`(`swordLevelDefinitionId`);

-- RenameIndex
ALTER TABLE `swordsynthesisrequirement` RENAME INDEX `SwordSynthesisRequirement_materialId_fkey` TO `SwordSynthesisRequirement_materialId_idx`;

-- RenameIndex
ALTER TABLE `swordupgradedrop` RENAME INDEX `SwordUpgradeDrop_materialId_fkey` TO `SwordUpgradeDrop_materialId_idx`;
