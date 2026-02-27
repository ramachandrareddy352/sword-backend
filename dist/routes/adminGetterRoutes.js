"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminAuth_1 = __importDefault(require("../middleware/adminAuth"));
const adminGetterController_1 = require("../controllers/adminGetterController");
const commonGetterController_1 = require("../controllers/commonGetterController");
const router = express_1.default.Router();
router.get("/notifications/all", adminAuth_1.default, commonGetterController_1.getAllNotifications);
/* ───────────────────── USER ───────────────────── */
router.get("/users/check-email", adminAuth_1.default, adminGetterController_1.checkUserByEmail);
router.get("/users/all", adminAuth_1.default, adminGetterController_1.getAllUsers);
router.get("/user/full-details", adminAuth_1.default, adminGetterController_1.getUserFullDetails);
/* ───────────────────── USERS ASSETS ───────────────────────── */
router.get("/all/users/swords", adminAuth_1.default, adminGetterController_1.getAllUsersSwords);
router.get("/all/users/materials", adminAuth_1.default, adminGetterController_1.getAllUsersMaterials);
/* ───────────────────── USERS GIFTS & VOUCHERS ──────────────── */
router.get("/all/users/gifts", adminAuth_1.default, adminGetterController_1.getAllUsersGifts);
router.get("/all/users/vouchers", adminAuth_1.default, adminGetterController_1.getAllUsersVouchers);
/* ───────────────────── SUPPORT SYSTEM ─────────────────────── */
router.get("/all/users/customer-supports", adminAuth_1.default, adminGetterController_1.getAllCustomerSupports);
/* ───────────────────── HISTORY & LOGS ─────────────────────── */
router.get("/all/users/upgrade-history", adminAuth_1.default, adminGetterController_1.getAllUsersUpgradeHistory);
router.get("/all/users/synthesis-history", adminAuth_1.default, adminGetterController_1.getAllUsersSynthesisHistory);
/* ───────────────────── ADMIN CONFIG ───────────────────────── */
router.get("/config", adminAuth_1.default, adminGetterController_1.getAdminConfig);
/* ───────────────────── MISSIONS ───────────────────────── */
router.get("/missions/daily/all", adminAuth_1.default, adminGetterController_1.getAllDailyMissions);
router.get("/missions/one-time/all", adminAuth_1.default, adminGetterController_1.getAllOneTimeMissions);
router.get("/missions/daily/users-progress", adminAuth_1.default, adminGetterController_1.getAllUsersDailyMissionProgress);
router.get("/missions/one-time/users-progress", adminAuth_1.default, adminGetterController_1.getAllUsersOneTimeMissionProgress);
router.get("/missions/user", adminAuth_1.default, adminGetterController_1.getUserMissionsByUserId);
exports.default = router;
//# sourceMappingURL=adminGetterRoutes.js.map