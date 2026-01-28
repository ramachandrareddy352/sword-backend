import express from "express";
import adminAuth from "../middleware/adminAuth.ts";

import {
  updateAdminConfig,
  createSwordLevel,
  createMaterial,
  createShield,
  updateSwordLevel,
  updateMaterial,
  updateShield,
  createGift,
  cancelGift,
  deleteGift,
  createMarketplaceItem,
  toggleMarketplaceItemActive,
  deleteMarketplaceItem,
  updateMarketplaceItemPrice,
  toggleUserBan,
  replyToSupportTicket,
} from "../controllers/adminActionController.ts";

const router = express.Router();

router.put("/update/config", adminAuth, updateAdminConfig);

router.put("/create/sword", adminAuth, createSwordLevel);
router.put("/create/material", adminAuth, createMaterial);
router.put("/create/shield", adminAuth, createShield);

router.put("/update/sword", adminAuth, updateSwordLevel);
router.put("/update/material", adminAuth, updateMaterial);
router.put("/update/shield", adminAuth, updateShield);

router.post("/create/gift", adminAuth, createGift);
router.post("/cancel/gift", adminAuth, cancelGift);
router.delete("/delete/gift", adminAuth, deleteGift);

router.post("/create/marketplace-item", adminAuth, createMarketplaceItem);
router.patch(
  "/update/marketplace-activate",
  adminAuth,
  toggleMarketplaceItemActive,
);
router.patch(
  "/update/marketplace-price",
  adminAuth,
  updateMarketplaceItemPrice,
);
router.delete("/delete/marketplace-item", adminAuth, deleteMarketplaceItem);

router.patch("/update/users-ban", adminAuth, toggleUserBan);
router.post("/reply/support", adminAuth, replyToSupportTicket);

export default router;
