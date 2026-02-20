import express from "express";
import adminAuth from "../middleware/adminAuth";
import { upload } from "../middleware/upload";

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
} from "../controllers/adminActionController";

const router = express.Router();

/* ───────────────────── ADMIN CONFIG ───────────────────── */
router.put("/config/update", adminAuth, updateAdminConfig);

/* ───────────────────────── SWORDS ─────────────────────── */
// Create new sword level (with image + synth + upgrade rules)
router.put(
  "/sword/create",
  adminAuth,
  upload.single("image"),
  createSwordLevel,
);

// Update sword metadata / prices / flags / image
router.put(
  "/sword/update/metadata",
  adminAuth,
  upload.single("image"),
  updateSwordLevel,
);

// Update ONLY synthesize required quantities (no add/remove)
router.patch(
  "/sword/update/synthesize",
  adminAuth,
  updateSynthesizeRequirements,
);

// Update ONLY upgrade drops (percent + min/max) (no add/remove)
router.patch("/sword/update/upgrades", adminAuth, updateUpgradeDrops);

// FULL replace synthesize + upgrade materials (can add/remove)
router.patch("/sword/update/materials", adminAuth, updateSwordMaterials);

/* ─────────────────────── MATERIALS ────────────────────── */
router.put(
  "/material/create",
  adminAuth,
  upload.single("image"),
  createMaterial,
);

router.put(
  "/material/update",
  adminAuth,
  upload.single("image"),
  updateMaterial,
);

/* ───────────────────────── GIFTS ──────────────────────── */
router.post("/gift/create", adminAuth, createGift);
router.post("/gift/cancel", adminAuth, cancelGift);
router.delete("/gift/delete", adminAuth, deleteGift);

/* ───────────────────── USER MODERATION ────────────────── */
router.patch("/user/ban-toggle", adminAuth, toggleUserBan);

/* ───────────────────── SUPPORT SYSTEM ─────────────────── */
router.post("/support/reply", adminAuth, replyToSupportTicket);

/* ───────────────────── DAILY MISSIONS ───────────────────── */
router.post("/mission/daily/create", adminAuth, createDailyMission);
router.patch("/mission/daily/toggle", adminAuth, toggleDailyMission);
router.delete("/mission/daily/delete", adminAuth, deleteDailyMission);

/* ─────────────────── ONE-TIME MISSIONS ─────────────────── */
router.post("/mission/one-time/create", adminAuth, createOneTimeMission);
router.patch("/mission/one-time/toggle", adminAuth, toggleOneTimeMission);
router.delete("/mission/one-time/delete", adminAuth, deleteOneTimeMission);

export default router;
