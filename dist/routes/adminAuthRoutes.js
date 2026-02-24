"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminAuth_1 = __importDefault(require("../middleware/adminAuth"));
const adminAuthController_1 = require("../controllers/adminAuthController");
const router = express_1.default.Router();
// Send OTP to admin email
router.post("/send-otp", adminAuthController_1.sendAdminOtp);
// Verify OTP & login
router.post("/verify-otp", adminAuthController_1.verifyAdminOtp);
// Logout admin (requires valid admin session)
router.post("/logout", adminAuth_1.default, adminAuthController_1.adminLogout);
exports.default = router;
//# sourceMappingURL=adminAuthRoutes.js.map