import express from "express";
import adminAuth from "../middleware/adminAuth";

import {
  getAllUsers,
  checkUserByEmail,
  getUserFullDetails,
  getAllUsersSwords,
  getAllUsersMaterials,
  getAdminConfig,
  getAllUsersGifts,
  getAllCustomerSupports,
  getAllUsersVouchers,
  getAllUsersUpgradeHistory,
  getAllUsersSynthesisHistory,
  getAllDailyMissions,
  getAllOneTimeMissions,
  getAllUsersDailyMissionProgress,
  getAllUsersOneTimeMissionProgress,
  getUserMissionsByUserId,
} from "../controllers/adminGetterController";

const router = express.Router();

/* ───────────────────── USER ───────────────────── */
router.get("/users/check-email", adminAuth, checkUserByEmail);
router.get("/users/all", adminAuth, getAllUsers);
router.get("/user/full-details", adminAuth, getUserFullDetails);

/* ───────────────────── USERS ASSETS ───────────────────────── */
router.get("/all/users/swords", adminAuth, getAllUsersSwords);
router.get("/all/users/materials", adminAuth, getAllUsersMaterials);

/* ───────────────────── USERS GIFTS & VOUCHERS ──────────────── */
router.get("/all/users/gifts", adminAuth, getAllUsersGifts);
router.get("/all/users/vouchers", adminAuth, getAllUsersVouchers);

/* ───────────────────── SUPPORT SYSTEM ─────────────────────── */
router.get("/all/users/customer-supports", adminAuth, getAllCustomerSupports);

/* ───────────────────── HISTORY & LOGS ─────────────────────── */
router.get("/all/users/upgrade-history", adminAuth, getAllUsersUpgradeHistory);
router.get(
  "/all/users/synthesis-history",
  adminAuth,
  getAllUsersSynthesisHistory,
);

/* ───────────────────── ADMIN CONFIG ───────────────────────── */
router.get("/config", adminAuth, getAdminConfig);

/* ───────────────────── MISSIONS ───────────────────────── */
router.get("/missions/daily/all", adminAuth, getAllDailyMissions);
router.get("/missions/one-time/all", adminAuth, getAllOneTimeMissions);
router.get(
  "/missions/daily/users-progress",
  adminAuth,
  getAllUsersDailyMissionProgress,
);
router.get(
  "/missions/one-time/users-progress",
  adminAuth,
  getAllUsersOneTimeMissionProgress,
);
router.get("/missions/user", adminAuth, getUserMissionsByUserId);

export default router;
