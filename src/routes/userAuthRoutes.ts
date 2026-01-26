import express from "express";
import userAuth from "../middleware/userAuth.ts";
import {
  sendVerification,
  verifyRegistration,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from "../controllers/userAuthController.ts";

const router = express.Router();

router.post("/register/send-code", sendVerification);
router.post("/register/verify", verifyRegistration);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", userAuth, logout);

export default router;
