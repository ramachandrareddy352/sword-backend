"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminAuth_ts_1 = __importDefault(require("../middleware/adminAuth.ts"));
const adminGetterController_ts_1 = require("../controllers/adminGetterController.ts");
const commonGetterController_ts_1 = require("../controllers/commonGetterController.ts");
const router = express_1.default.Router();
// 3) Get only basic user table info
router.get("/users/check-email", adminAuth_ts_1.default, adminGetterController_ts_1.checkUserByEmail);
// 1) Get all users with sorting + pagination
router.get("/data/allusers", adminAuth_ts_1.default, adminGetterController_ts_1.getAllUsers);
// 2) Get full details of a single user (ALL relations)
router.get("/user/full-details", adminAuth_ts_1.default, commonGetterController_ts_1.getUserFullDetails);
// 3) Get only basic user table info
router.get("/user/basic-info", adminAuth_ts_1.default, commonGetterController_ts_1.getUserBasicInfo);
// 4) User swords
router.get("/user/swords", adminAuth_ts_1.default, commonGetterController_ts_1.getUserSwords);
// 5) User materials
router.get("/user/materials", adminAuth_ts_1.default, commonGetterController_ts_1.getUserMaterials);
// 6) User shields
router.get("/user/shields", adminAuth_ts_1.default, commonGetterController_ts_1.getUserShields);
// 7) User gifts
router.get("/user/gifts", adminAuth_ts_1.default, commonGetterController_ts_1.getUserGifts);
// 8) User vouchers
router.get("/user/vouchers", adminAuth_ts_1.default, commonGetterController_ts_1.getUserVouchers);
// 9) User customer support complaints
router.get("/user/complaints", adminAuth_ts_1.default, commonGetterController_ts_1.getUserCustomerSupports);
// 10) User marketplace purchases
router.get("/user/marketplace-purchases", adminAuth_ts_1.default, commonGetterController_ts_1.getUserMarketplacePurchases);
// 11) All users materials (sorting + pagination)
router.get("/all/users/materials", adminAuth_ts_1.default, adminGetterController_ts_1.getAllUsersMaterials);
// 12) All users swords (sorting + pagination)
router.get("/all/users/swords", adminAuth_ts_1.default, adminGetterController_ts_1.getAllUsersSwords);
// 13) All users shields (sorting + pagination)
router.get("/all/users/shields", adminAuth_ts_1.default, adminGetterController_ts_1.getAllUsersShields);
// 14) All users gifts (sorting + filters + pagination)
router.get("/all/users/gifts", adminAuth_ts_1.default, adminGetterController_ts_1.getAllUsersGifts);
// 16) All customer support tickets
router.get("/all/users/customer-supports", adminAuth_ts_1.default, adminGetterController_ts_1.getAllCustomerSupports);
// 17) All users vouchers
router.get("/all/users/vouchers", adminAuth_ts_1.default, adminGetterController_ts_1.getAllUsersVouchers);
// 18) return the amdin config data
router.get("/data/adminConfig", adminAuth_ts_1.default, adminGetterController_ts_1.getAdminConfig);
exports.default = router;
//# sourceMappingURL=adminGetterRoutes.js.map