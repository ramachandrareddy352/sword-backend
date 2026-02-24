"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = __importDefault(require("../middleware/userAuth"));
const userAuthController_1 = require("../controllers/userAuthController");
const router = express_1.default.Router();
router.get("/me", userAuth_1.default, (_req, res) => {
    res.json({ success: true });
});
router.post("/register/send-code", userAuthController_1.sendVerification);
router.post("/register/verify", userAuthController_1.verifyRegistration);
router.post("/login", userAuthController_1.login);
router.post("/forgot/send-code", userAuthController_1.forgotPassword);
router.post("/forgot/verify", userAuthController_1.resetPassword);
router.post("/logout", userAuth_1.default, userAuthController_1.logout);
router.post("/google-login", userAuthController_1.googleLogin);
router.post("/cancel-membership/request", userAuth_1.default, userAuthController_1.requestCancelMembership);
router.post("/cancel-membership/confirm", userAuth_1.default, userAuthController_1.confirmCancelMembership);
exports.default = router;
//# sourceMappingURL=userAuthRoutes.js.map