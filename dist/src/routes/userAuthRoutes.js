"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_ts_1 = __importDefault(require("../middleware/userAuth.ts"));
const userAuthController_ts_1 = require("../controllers/userAuthController.ts");
const router = express_1.default.Router();
router.get("/me", userAuth_ts_1.default, (_req, res) => {
    res.json({ success: true });
});
router.post("/register/send-code", userAuthController_ts_1.sendVerification);
router.post("/register/verify", userAuthController_ts_1.verifyRegistration);
router.post("/login", userAuthController_ts_1.login);
router.post("/forgot/send-code", userAuthController_ts_1.forgotPassword);
router.post("/forgot/verify", userAuthController_ts_1.resetPassword);
router.post("/logout", userAuth_ts_1.default, userAuthController_ts_1.logout);
exports.default = router;
//# sourceMappingURL=userAuthRoutes.js.map