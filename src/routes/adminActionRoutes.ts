import express from "express";
import adminAuth from "../middleware/adminAuth";
import { upload } from "../middleware/upload";

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
} from "../controllers/adminActionController";

const router = express.Router();

router.put("/update/config", adminAuth, updateAdminConfig);

router.put(
  "/create/sword",
  adminAuth,
  upload.single("image"),
  createSwordLevel,
);
router.put(
  "/create/material",
  adminAuth,
  upload.single("image"),
  createMaterial,
);
router.put("/create/shield", adminAuth, upload.single("image"), createShield);

router.put(
  "/update/sword",
  adminAuth,
  upload.single("image"),
  updateSwordLevel,
);
router.put(
  "/update/material",
  adminAuth,
  upload.single("image"),
  updateMaterial,
);
router.put("/update/shield", adminAuth, upload.single("image"), updateShield);

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
