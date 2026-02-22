-- DropIndex
DROP INDEX `User_anvilSwordLevel_key` ON `user`;

-- CreateIndex
CREATE INDEX `User_anvilSwordLevel_idx` ON `User`(`anvilSwordLevel`);
