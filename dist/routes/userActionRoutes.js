"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = __importDefault(require("../middleware/userAuth"));
const userActionController_1 = require("../controllers/userActionController");
const router = express_1.default.Router();
/* ───────────────────── VOUCHERS ───────────────────────── */
router.post("/vouchers/create", userAuth_1.default, userActionController_1.createVoucher);
router.post("/vouchers/assign-user", userAuth_1.default, userActionController_1.assignAllowedUserToVoucher);
router.post("/vouchers/remove-assigned-user", userAuth_1.default, userActionController_1.removeAllowedUserFromVoucher);
router.post("/vouchers/cancel", userAuth_1.default, userActionController_1.cancelVoucher);
/* ───────────────────── COMPLAINTS ─────────────────────── */
router.post("/complaints/create", userAuth_1.default, userActionController_1.createComplaint);
router.put("/complaints/update", userAuth_1.default, userActionController_1.updateComplaint);
router.delete("/complaints/delete", userAuth_1.default, userActionController_1.deleteComplaint);
/* ───────────────────── MARKETPLACE (BUY) ──────────────── */
router.post("/marketplace/buy/sword", userAuth_1.default, userActionController_1.buySword);
router.post("/marketplace/buy/material", userAuth_1.default, userActionController_1.buyMaterial);
router.post("/marketplace/buy/shields", userAuth_1.default, userActionController_1.buyShields);
/* ───────────────────── MARKETPLACE (SELL) ─────────────── */
router.post("/marketplace/sell/sword", userAuth_1.default, userActionController_1.sellSword);
router.post("/marketplace/sell/material", userAuth_1.default, userActionController_1.sellMaterial);
/* ───────────────────── ANVIL ──────────────────────────── */
router.post("/anvil/set-sword", userAuth_1.default, userActionController_1.setSwordOnAnvil);
router.post("/anvil/remove-sword", userAuth_1.default, userActionController_1.removeSwordFromAnvil);
/* ───────────────────── SWORD CORE ACTIONS ─────────────── */
router.post("/sword/upgrade", userAuth_1.default, userActionController_1.upgradeSword);
router.post("/sword/synthesize", userAuth_1.default, userActionController_1.synthesizeSword);
router.post("/gifts/claim", userAuth_1.default, userActionController_1.claimGift);
router.patch("/shield/toggle", userAuth_1.default, userActionController_1.toggleShieldProtection);
/* ───────────────────── ADS ────────────────────────────── */
router.post("/ad/start-session", userAuth_1.default, userActionController_1.createAdSession);
router.post("/ad/claim-reward", userAuth_1.default, userActionController_1.verifyAdSession);
/* ───────────────────── MISSIONS ───────────────────── */
router.post("/mission/daily/claim", userAuth_1.default, userActionController_1.claimDailyMission);
router.post("/mission/one-time/claim", userAuth_1.default, userActionController_1.claimOneTimeMission);
exports.default = router;
//# sourceMappingURL=userActionRoutes.js.map