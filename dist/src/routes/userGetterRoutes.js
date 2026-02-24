"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_ts_1 = __importDefault(require("../middleware/userAuth.ts"));
const commonGetterController_ts_1 = require("../controllers/commonGetterController.ts");
const userGetterController_ts_1 = require("../controllers/userGetterController.ts");
const router = express_1.default.Router();
// 1) Get full details of a single user (ALL relations)
router.get("/user/full-details", userAuth_ts_1.default, commonGetterController_ts_1.getUserFullDetails);
// 2) Get only basic user table info
router.get("/user/basic-info", userAuth_ts_1.default, commonGetterController_ts_1.getUserBasicInfo);
// 3) User swords
router.get("/user/swords", userAuth_ts_1.default, commonGetterController_ts_1.getUserSwords);
// 4) User materials
router.get("/user/materials", userAuth_ts_1.default, commonGetterController_ts_1.getUserMaterials);
// 5) User shields
router.get("/user/shields", userAuth_ts_1.default, commonGetterController_ts_1.getUserShields);
// 6) User gifts
router.get("/user/gifts", userAuth_ts_1.default, commonGetterController_ts_1.getUserGifts);
// 7) User vouchers
router.get("/user/vouchers", userAuth_ts_1.default, commonGetterController_ts_1.getUserVouchers);
// 8) User customer support complaints
router.get("/user/complaints", userAuth_ts_1.default, commonGetterController_ts_1.getUserCustomerSupports);
// 9) User marketplace purchases
router.get("/user/marketplace-purchases", userAuth_ts_1.default, commonGetterController_ts_1.getUserMarketplacePurchases);
router.get("/user/rank", userAuth_ts_1.default, userGetterController_ts_1.getUserRank);
exports.default = router;
//# sourceMappingURL=userGetterRoutes.js.map