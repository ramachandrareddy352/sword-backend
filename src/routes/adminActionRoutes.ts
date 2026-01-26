import express from "express";
import adminAuth from "../middleware/adminAuth.ts";

import {
  updateAdminConfig,
  upsertSwordLevel,
  upsertMaterial,
  upsertShield,
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

router.put("/update-config", adminAuth, updateAdminConfig);

router.put("/upsert-swords", adminAuth, upsertSwordLevel);
router.put("/upsert-materials", adminAuth, upsertMaterial);
router.put("/upsert-shields", adminAuth, upsertShield);

router.post("/create-gift", adminAuth, createGift);
router.post("/cancel-gift", adminAuth, cancelGift);
router.delete("/delete-gift", adminAuth, deleteGift);

router.post("/marketplace/create-item", adminAuth, createMarketplaceItem);
router.patch(
  "/marketplace/activate-item",
  adminAuth,
  toggleMarketplaceItemActive,
);
router.patch(
  "/marketplace/update-item-price",
  adminAuth,
  updateMarketplaceItemPrice,
);
router.delete("/marketplace/delete-item", adminAuth, deleteMarketplaceItem);

router.patch("/users/ban", adminAuth, toggleUserBan);
router.post("/support/reply", adminAuth, replyToSupportTicket);

export default router;
