import express from "express";
import userAuth from "../middleware/userAuth";

import {
  createVoucher,
  cancelVoucher,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  buySword,
  buyMaterial,
  buyShields,
  sellSword,
  sellMaterial,
  setSwordOnAnvil,
  removeSwordFromAnvil,
  upgradeSword,
  synthesizeSword,
  claimGift,
  toggleShieldProtection,
  createAdSession,
  verifyAdSession,
  claimOneTimeMission,
  claimDailyMission,
  assignAllowedUserToVoucher,
  removeAllowedUserFromVoucher,
  markNotificationsAsRead,
} from "../controllers/userActionController";

const router = express.Router();

router.post("/notifications/mark-read", userAuth, markNotificationsAsRead);

/* ───────────────────── VOUCHERS ───────────────────────── */

router.post("/vouchers/create", userAuth, createVoucher);
router.post("/vouchers/assign-user", userAuth, assignAllowedUserToVoucher);
router.post(
  "/vouchers/remove-assigned-user",
  userAuth,
  removeAllowedUserFromVoucher,
);
router.post("/vouchers/cancel", userAuth, cancelVoucher);

/* ───────────────────── COMPLAINTS ─────────────────────── */
router.post("/complaints/create", userAuth, createComplaint);
router.put("/complaints/update", userAuth, updateComplaint);
router.delete("/complaints/delete", userAuth, deleteComplaint);

/* ───────────────────── MARKETPLACE (BUY) ──────────────── */
router.post("/marketplace/buy/sword", userAuth, buySword);
router.post("/marketplace/buy/material", userAuth, buyMaterial);
router.post("/marketplace/buy/shields", userAuth, buyShields);

/* ───────────────────── MARKETPLACE (SELL) ─────────────── */
router.post("/marketplace/sell/sword", userAuth, sellSword);
router.post("/marketplace/sell/material", userAuth, sellMaterial);

/* ───────────────────── ANVIL ──────────────────────────── */
router.post("/anvil/set-sword", userAuth, setSwordOnAnvil);
router.post("/anvil/remove-sword", userAuth, removeSwordFromAnvil);

/* ───────────────────── SWORD CORE ACTIONS ─────────────── */
router.post("/sword/upgrade", userAuth, upgradeSword);
router.post("/sword/synthesize", userAuth, synthesizeSword);

router.post("/gifts/claim", userAuth, claimGift);
router.patch("/shield/toggle", userAuth, toggleShieldProtection);

/* ───────────────────── ADS ────────────────────────────── */
router.post("/ad/start-session", userAuth, createAdSession);
router.post("/ad/claim-reward", userAuth, verifyAdSession);

/* ───────────────────── MISSIONS ───────────────────── */
router.post("/mission/daily/claim", userAuth, claimDailyMission);
router.post("/mission/one-time/claim", userAuth, claimOneTimeMission);

export default router;
