import express from "express";
import userAuth from "../middleware/userAuth";

import {
  toggleSound,
  createVoucher,
  cancelVoucher,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  buyMarketplaceItem,
  sellSword,
  sellMaterial,
  sellShield,
  setSwordOnAnvil,
  removeSwordFromAnvil,
  upgradeSword,
  synthesizeSword,
  setShieldOnAnvil,
  removeShieldFromAnvil,
} from "../controllers/userActionController";

const router = express.Router();

router.patch("/sound/toggle", userAuth, toggleSound);

router.post("/vouchers/create", userAuth, createVoucher);
router.post("/vouchers/cancel", userAuth, cancelVoucher);

// No ban check required for complaints (as per your rule)
router.post("/complaints/create", userAuth, createComplaint);
router.put("/complaints/update", userAuth, updateComplaint);
router.delete("/complaints/delete", userAuth, deleteComplaint);

router.post("/marketplace/buy", userAuth, buyMarketplaceItem);

// Sell items (swords, materials, shields)
router.post("/sell/sword", userAuth, sellSword);
router.post("/sell/material", userAuth, sellMaterial);
router.post("/sell/shield", userAuth, sellShield);

// Anvil management (sword & shield)
router.post("/anvil/set-sword", userAuth, setSwordOnAnvil);
router.post("/anvil/remove-sword", userAuth, removeSwordFromAnvil);
router.post("/anvil/set-shield", userAuth, setShieldOnAnvil);
router.post("/anvil/remove-shield", userAuth, removeShieldFromAnvil);

// Sword upgrade (must be on anvil)
router.post("/sword/upgrade", userAuth, upgradeSword);

// Sword synthesis (consume materials/shields to create new sword)
router.post("/sword/synthesize", userAuth, synthesizeSword);

export default router;
