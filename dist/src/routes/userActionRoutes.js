"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_ts_1 = __importDefault(require("../middleware/userAuth.ts"));
const userActionController_ts_1 = require("../controllers/userActionController.ts");
const router = express_1.default.Router();
router.patch("/sound/toggle", userAuth_ts_1.default, userActionController_ts_1.toggleSound);
router.post("/vouchers/create", userAuth_ts_1.default, userActionController_ts_1.createVoucher);
router.post("/vouchers/cancel", userAuth_ts_1.default, userActionController_ts_1.cancelVoucher);
// No ban check required for complaints (as per your rule)
router.post("/complaints/create", userAuth_ts_1.default, userActionController_ts_1.createComplaint);
router.put("/complaints/update", userAuth_ts_1.default, userActionController_ts_1.updateComplaint);
router.delete("/complaints/delete", userAuth_ts_1.default, userActionController_ts_1.deleteComplaint);
router.post("/marketplace/buy", userAuth_ts_1.default, userActionController_ts_1.buyMarketplaceItem);
// Sell items (swords, materials, shields)
router.post("/sell/sword", userAuth_ts_1.default, userActionController_ts_1.sellSword);
router.post("/sell/material", userAuth_ts_1.default, userActionController_ts_1.sellMaterial);
router.post("/sell/shield", userAuth_ts_1.default, userActionController_ts_1.sellShield);
// Anvil management (sword & shield)
router.post("/anvil/set-sword", userAuth_ts_1.default, userActionController_ts_1.setSwordOnAnvil);
router.post("/anvil/remove-sword", userAuth_ts_1.default, userActionController_ts_1.removeSwordFromAnvil);
router.post("/anvil/set-shield", userAuth_ts_1.default, userActionController_ts_1.setShieldOnAnvil);
router.post("/anvil/remove-shield", userAuth_ts_1.default, userActionController_ts_1.removeShieldFromAnvil);
// Sword upgrade (must be on anvil)
router.post("/sword/upgrade", userAuth_ts_1.default, userActionController_ts_1.upgradeSword);
// Sword synthesis (consume materials/shields to create new sword)
router.post("/sword/synthesize", userAuth_ts_1.default, userActionController_ts_1.synthesizeSword);
exports.default = router;
//# sourceMappingURL=userActionRoutes.js.map