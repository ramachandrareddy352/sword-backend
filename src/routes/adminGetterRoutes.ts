import express from "express";
import adminAuth from "../middleware/adminAuth.ts";

import {
  getAllUsers,
  getUserFullDetails,
  getUserBasicInfo,
  getUserSwords,
  getUserMaterials,
  getUserShields,
  getUserGifts,
  getUserVouchers,
  getUserCustomerSupports,
  getUserMarketplacePurchases,
  getAllUsersMaterials,
  getAllUsersSwords,
  getAllUsersShields,
  getAllUsersGifts,
  getAllMarketplacePurchases,
  getAllCustomerSupports,
  getAllUsersVouchers,
} from "../controllers/adminGetterController.ts";

const router = express.Router();

// 1) Get all users with sorting + pagination
router.get("/allusers", adminAuth, getAllUsers);

// 2) Get full details of a single user (ALL relations)
router.get("/user/full-details", adminAuth, getUserFullDetails);

// 3) Get only basic user table info
router.get("/user/basic-info", adminAuth, getUserBasicInfo);

// 4) User swords
router.get("/user/swords", adminAuth, getUserSwords);

// 5) User materials
router.get("/user/materials", adminAuth, getUserMaterials);

// 6) User shields
router.get("/user/shields", adminAuth, getUserShields);

// 7) User gifts
router.get("/user/gifts", adminAuth, getUserGifts);

// 8) User vouchers
router.get("/user/vouchers", adminAuth, getUserVouchers);

// 9) User customer support complaints
router.get("/user/complaints", adminAuth, getUserCustomerSupports);

// 10) User marketplace purchases
router.get(
  "/user/marketplace-purchases",
  adminAuth,
  getUserMarketplacePurchases,
);

// 11) All users materials (sorting + pagination)
router.get("/all-materials", adminAuth, getAllUsersMaterials);

// 12) All users swords (sorting + pagination)
router.get("/all-swords", adminAuth, getAllUsersSwords);

// 13) All users shields (sorting + pagination)
router.get("/all-shields", adminAuth, getAllUsersShields);

// 14) All users gifts (sorting + filters + pagination)
router.get("/all-gifts", adminAuth, getAllUsersGifts);

// 15) All marketplace purchases
router.get("/all-marketplace-purchases", adminAuth, getAllMarketplacePurchases);

// 16) All customer support tickets
router.get("/all-customer-supports", adminAuth, getAllCustomerSupports);

// 17) All users vouchers
router.get("/all-vouchers", adminAuth, getAllUsersVouchers);

export default router;
