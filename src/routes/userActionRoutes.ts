import express from "express";
import userAuth from "../middleware/userAuth";

import {
  toggleSound,
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
} from "../controllers/userActionController";

const router = express.Router();

/* ───────────────────── USER SETTINGS ───────────────────── */
router.patch("/sound/toggle", userAuth, toggleSound);

/* ───────────────────── VOUCHERS ───────────────────────── */
router.post("/vouchers/create", userAuth, createVoucher);
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

export default router;
