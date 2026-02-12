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

export default router;
