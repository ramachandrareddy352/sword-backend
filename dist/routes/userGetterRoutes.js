"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = __importDefault(require("../middleware/userAuth"));
const userGetterController_1 = require("../controllers/userGetterController");
const router = express_1.default.Router();
/* ───────────────────── USER CORE ───────────────────── */
router.get("/user/basic-info", userAuth_1.default, userGetterController_1.getUserBasicInfo);
router.get("/user/rank", userAuth_1.default, userGetterController_1.getUserRank);
/* ───────────────────── INVENTORY ───────────────────── */
router.get("/user/swords", userAuth_1.default, userGetterController_1.getUserSwords);
router.get("/user/materials", userAuth_1.default, userGetterController_1.getUserMaterials);
/* ───────────────────── GIFTS & VOUCHERS ────────────── */
router.get("/user/gifts", userAuth_1.default, userGetterController_1.getUserGifts);
router.get("/user/vouchers", userAuth_1.default, userGetterController_1.getUserVouchers);
/* ───────────────────── SUPPORT ─────────────────────── */
router.get("/user/complaints", userAuth_1.default, userGetterController_1.getUserCustomerSupports);
/* ───────────────────── MARKETPLACE HISTORY ─────────── */
router.get("/user/purchases/swords", userAuth_1.default, userGetterController_1.getUserPurchasedSwords);
router.get("/user/purchases/materials", userAuth_1.default, userGetterController_1.getUserPurchasedMaterials);
router.get("/user/purchases/shields", userAuth_1.default, userGetterController_1.getUserPurchasedShields);
/* ───────────────────── HISTORY ─────────────────────── */
router.get("/user/history/upgrades", userAuth_1.default, userGetterController_1.getUserUpgradeHistory);
router.get("/user/history/synthesis", userAuth_1.default, userGetterController_1.getUserSynthesisHistory);
/* ───────────────────── MISSIONS ─────────────────────── */
router.get("/user/missions/daily", userAuth_1.default, userGetterController_1.getUserDailyMissions);
router.get("/user/missions/one-time", userAuth_1.default, userGetterController_1.getUserOneTimeMissions);
exports.default = router;
//# sourceMappingURL=userGetterRoutes.js.map