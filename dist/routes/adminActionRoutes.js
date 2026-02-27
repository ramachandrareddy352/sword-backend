"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminAuth_1 = __importDefault(require("../middleware/adminAuth"));
const upload_1 = require("../middleware/upload");
const adminActionController_1 = require("../controllers/adminActionController");
const router = express_1.default.Router();
router.post("/notifications/create", adminAuth_1.default, adminActionController_1.createNotification);
router.post("/notifications/delete", adminAuth_1.default, adminActionController_1.deleteNotification);
/* ───────────────────── ADMIN CONFIG ───────────────────── */
router.put("/config/update", adminAuth_1.default, adminActionController_1.updateAdminConfig);
/* ───────────────────────── SWORDS ─────────────────────── */
// Create new sword level (with image + synth + upgrade rules)
router.put("/sword/create", adminAuth_1.default, upload_1.upload.single("image"), adminActionController_1.createSwordLevel);
// Update sword metadata / prices / flags / image
router.put("/sword/update/metadata", adminAuth_1.default, upload_1.upload.single("image"), adminActionController_1.updateSwordLevel);
// Update ONLY synthesize required quantities (no add/remove)
router.patch("/sword/update/synthesize", adminAuth_1.default, adminActionController_1.updateSynthesizeRequirements);
// Update ONLY upgrade drops (percent + min/max) (no add/remove)
router.patch("/sword/update/upgrades", adminAuth_1.default, adminActionController_1.updateUpgradeDrops);
// FULL replace synthesize + upgrade materials (can add/remove)
router.patch("/sword/update/materials", adminAuth_1.default, adminActionController_1.updateSwordMaterials);
/* ─────────────────────── MATERIALS ────────────────────── */
router.put("/material/create", adminAuth_1.default, upload_1.upload.single("image"), adminActionController_1.createMaterial);
router.put("/material/update", adminAuth_1.default, upload_1.upload.single("image"), adminActionController_1.updateMaterial);
/* ───────────────────────── GIFTS ──────────────────────── */
router.post("/gift/create", adminAuth_1.default, adminActionController_1.createGift);
router.post("/gift/cancel", adminAuth_1.default, adminActionController_1.cancelGift);
router.delete("/gift/delete", adminAuth_1.default, adminActionController_1.deleteGift);
/* ───────────────────── USER MODERATION ────────────────── */
router.patch("/user/ban-toggle", adminAuth_1.default, adminActionController_1.toggleUserBan);
/* ───────────────────── SUPPORT SYSTEM ─────────────────── */
router.post("/support/reply", adminAuth_1.default, adminActionController_1.replyToSupportTicket);
/* ───────────────────── DAILY MISSIONS ───────────────────── */
router.post("/mission/daily/create", adminAuth_1.default, adminActionController_1.createDailyMission);
router.patch("/mission/daily/toggle", adminAuth_1.default, adminActionController_1.toggleDailyMission);
router.delete("/mission/daily/delete", adminAuth_1.default, adminActionController_1.deleteDailyMission);
/* ─────────────────── ONE-TIME MISSIONS ─────────────────── */
router.post("/mission/one-time/create", adminAuth_1.default, adminActionController_1.createOneTimeMission);
router.patch("/mission/one-time/toggle", adminAuth_1.default, adminActionController_1.toggleOneTimeMission);
router.delete("/mission/one-time/delete", adminAuth_1.default, adminActionController_1.deleteOneTimeMission);
exports.default = router;
//# sourceMappingURL=adminActionRoutes.js.map