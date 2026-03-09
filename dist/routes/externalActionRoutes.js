"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const externalActionController_1 = require("../controllers/externalActionController");
const router = express_1.default.Router();
router.post("/voucher/redeem", externalActionController_1.redeemVoucherFromShopping);
exports.default = router;
//# sourceMappingURL=externalActionRoutes.js.map