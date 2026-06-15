import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { getAllUsers, checkUserByEmail, getUserFullDetails, getAllUsersSwords, getAllUsersMaterials, getAdminConfig, getAllUsersGifts, getAllCustomerSupports, getAllUsersVouchers, getAllUsersUpgradeHistory, getAllUsersSynthesisHistory, getAllDailyMissions, getAllOneTimeMissions, getAllUsersDailyMissionProgress, getAllUsersOneTimeMissionProgress, getUserMissionsByUserId, getTotalUsersGold, checkUserByTelegramUserName, } from "../controllers/adminGetterController.js";
import { getAllNotifications } from "../controllers/commonGetterController.js";
const router = express.Router();
// All getters only need authentication; both VIEWER and EDITOR can read
router.use(adminAuth);
router.get("/notifications/all", getAllNotifications);
router.get("/users/total-gold", getTotalUsersGold);
/* ───────────────────── USER ───────────────────── */
router.get("/users/check-email", checkUserByEmail);
router.get("/users/check-telegram", checkUserByTelegramUserName);
router.get("/users/all", getAllUsers);
router.get("/user/full-details", getUserFullDetails);
/* ───────────────────── USERS ASSETS ───────────────────────── */
router.get("/all/users/swords", getAllUsersSwords);
router.get("/all/users/materials", getAllUsersMaterials);
/* ───────────────────── USERS GIFTS & VOUCHERS ──────────────── */
router.get("/all/users/gifts", getAllUsersGifts);
router.get("/all/users/vouchers", getAllUsersVouchers);
/* ───────────────────── SUPPORT SYSTEM ─────────────────────── */
router.get("/all/users/customer-supports", getAllCustomerSupports);
/* ───────────────────── HISTORY & LOGS ─────────────────────── */
router.get("/all/users/upgrade-history", getAllUsersUpgradeHistory);
router.get("/all/users/synthesis-history", getAllUsersSynthesisHistory);
/* ───────────────────── ADMIN CONFIG ───────────────────────── */
router.get("/config", getAdminConfig);
/* ───────────────────── MISSIONS ───────────────────────── */
router.get("/missions/daily/all", getAllDailyMissions);
router.get("/missions/one-time/all", getAllOneTimeMissions);
router.get("/missions/daily/users-progress", getAllUsersDailyMissionProgress);
router.get("/missions/one-time/users-progress", getAllUsersOneTimeMissionProgress);
router.get("/missions/user", getUserMissionsByUserId);
export default router;
//# sourceMappingURL=adminGetterRoutes.js.map