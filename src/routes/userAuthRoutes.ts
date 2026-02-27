import express from "express";
import userAuth from "../middleware/userAuth";
import {
  sendVerification,
  verifyRegistration,
  login,
  forgotPassword,
  resetPassword,
  logout,
  googleLogin,
  requestCancelMembership,
  confirmCancelMembership,
  googleWebLogin,
} from "../controllers/userAuthController";

const router = express.Router();

router.get("/me", userAuth, (_req, res) => {
  res.json({ success: true });
});

router.post("/register/send-code", sendVerification);
router.post("/register/verify", verifyRegistration);
router.post("/login", login);
router.post("/forgot/send-code", forgotPassword);
router.post("/forgot/verify", resetPassword);
router.post("/logout", userAuth, logout);
router.post("/google-login", googleLogin);
router.post("/google-web-login", googleWebLogin);
router.post("/cancel-membership/request", userAuth, requestCancelMembership);
router.post("/cancel-membership/confirm", userAuth, confirmCancelMembership);

export default router;
