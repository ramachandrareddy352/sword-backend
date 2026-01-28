import express from "express";
import userAuth from "../middleware/userAuth.ts";

import {
  getUserFullDetails,
  getUserBasicInfo,
  getUserSwords,
  getUserMaterials,
  getUserShields,
  getUserGifts,
  getUserVouchers,
  getUserCustomerSupports,
  getUserMarketplacePurchases,
  getAllMarketplaceItems,
} from "../controllers/commonGetterController.ts";

const router = express.Router();

// 1) Get full details of a single user (ALL relations)
router.get("/user/full-details", userAuth, getUserFullDetails);

// 2) Get only basic user table info
router.get("/user/basic-info", userAuth, getUserBasicInfo);

// 3) User swords
router.get("/user/swords", userAuth, getUserSwords);

// 4) User materials
router.get("/user/materials", userAuth, getUserMaterials);

// 5) User shields
router.get("/user/shields", userAuth, getUserShields);

// 6) User gifts
router.get("/user/gifts", userAuth, getUserGifts);

// 7) User vouchers
router.get("/user/vouchers", userAuth, getUserVouchers);

// 8) User customer support complaints
router.get("/user/complaints", userAuth, getUserCustomerSupports);

// 9) User marketplace purchases
router.get(
  "/user/marketplace-purchases",
  userAuth,
  getUserMarketplacePurchases,
);

// 9) all marketplace purchases
router.get("/all/marketplace-items", userAuth, getAllMarketplaceItems);

export default router;
