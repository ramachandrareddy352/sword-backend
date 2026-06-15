import express from "express";
import adminAuth, { requireEditor } from "../middleware/adminAuth.js";
import { upload } from "../middleware/upload.js";

import {
  updateAdminConfig,
  createSwordLevel,
  updateSwordLevel,
  updateSynthesizeRequirements,
  updateUpgradeDrops,
  updateSwordMaterials,
  createMaterial,
  updateMaterial,
  createGift,
  cancelGift,
  deleteGift,
  toggleUserBan,
  replyToSupportTicket,
  createDailyMission,
  toggleDailyMission,
  deleteDailyMission,
  createOneTimeMission,
  toggleOneTimeMission,
  deleteOneTimeMission,
  createNotification,
  deleteNotification,
} from "../controllers/adminActionController.js";

const router = express.Router();

// Every route in this file is a write action → authenticate, then require EDITOR (super passes too)
router.use(adminAuth, requireEditor);

router.post("/notifications/create", createNotification);
router.post("/notifications/delete", deleteNotification);

/* ───────────────────── ADMIN CONFIG ───────────────────── */
router.put("/config/update", updateAdminConfig);

/* ───────────────────────── SWORDS ─────────────────────── */
// Create new sword level (with image + synth + upgrade rules)
router.put("/sword/create", upload.single("image"), createSwordLevel);

// Update sword metadata / prices / flags / image
router.put("/sword/update/metadata", upload.single("image"), updateSwordLevel);

// Update ONLY synthesize required quantities (no add/remove)
router.patch("/sword/update/synthesize", updateSynthesizeRequirements);

// Update ONLY upgrade drops (percent + min/max) (no add/remove)
router.patch("/sword/update/upgrades", updateUpgradeDrops);

// FULL replace synthesize + upgrade materials (can add/remove)
router.patch("/sword/update/materials", updateSwordMaterials);

/* ─────────────────────── MATERIALS ────────────────────── */
router.put("/material/create", upload.single("image"), createMaterial);
router.put("/material/update", upload.single("image"), updateMaterial);

/* ───────────────────────── GIFTS ──────────────────────── */
router.post("/gift/create", createGift);
router.post("/gift/cancel", cancelGift);
router.delete("/gift/delete", deleteGift);

/* ───────────────────── USER MODERATION ────────────────── */
router.patch("/user/ban-toggle", toggleUserBan);

/* ───────────────────── SUPPORT SYSTEM ─────────────────── */
router.post("/support/reply", replyToSupportTicket);

/* ───────────────────── DAILY MISSIONS ───────────────────── */
router.post("/mission/daily/create", createDailyMission);
router.patch("/mission/daily/toggle", toggleDailyMission);
router.delete("/mission/daily/delete", deleteDailyMission);

/* ─────────────────── ONE-TIME MISSIONS ─────────────────── */
router.post("/mission/one-time/create", createOneTimeMission);
router.patch("/mission/one-time/toggle", toggleOneTimeMission);
router.delete("/mission/one-time/delete", deleteOneTimeMission);

export default router;
