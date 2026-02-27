import express from "express";
import userAuth from "../middleware/userAuth";

import {
  getUserRank,
  getUserBasicInfo,
  getUserSwords,
  getUserMaterials,
  getUserGifts,
  getUserVouchers,
  getUserCustomerSupports,
  getUserPurchasedSwords,
  getUserPurchasedMaterials,
  getUserPurchasedShields,
  getUserUpgradeHistory,
  getUserSynthesisHistory,
  getUserDailyMissions,
  getUserOneTimeMissions,
  getUserAnvilSwordDetails,
} from "../controllers/userGetterController";

const router = express.Router();

/* ───────────────────── USER CORE ───────────────────── */
router.get("/user/basic-info", userAuth, getUserBasicInfo);
router.get("/user/rank", userAuth, getUserRank);
router.get("/user/anvil-sword-details", userAuth, getUserAnvilSwordDetails);

/* ───────────────────── INVENTORY ───────────────────── */
router.get("/user/swords", userAuth, getUserSwords);
router.get("/user/materials", userAuth, getUserMaterials);

/* ───────────────────── GIFTS & VOUCHERS ────────────── */
router.get("/user/gifts", userAuth, getUserGifts);
router.get("/user/vouchers", userAuth, getUserVouchers);

/* ───────────────────── SUPPORT ─────────────────────── */
router.get("/user/complaints", userAuth, getUserCustomerSupports);

/* ───────────────────── MARKETPLACE HISTORY ─────────── */
router.get("/user/purchases/swords", userAuth, getUserPurchasedSwords);
router.get("/user/purchases/materials", userAuth, getUserPurchasedMaterials);
router.get("/user/purchases/shields", userAuth, getUserPurchasedShields);

/* ───────────────────── HISTORY ─────────────────────── */
router.get("/user/history/upgrades", userAuth, getUserUpgradeHistory);
router.get("/user/history/synthesis", userAuth, getUserSynthesisHistory);

/* ───────────────────── MISSIONS ─────────────────────── */
router.get("/user/missions/daily", userAuth, getUserDailyMissions);
router.get("/user/missions/one-time", userAuth, getUserOneTimeMissions);

export default router;
