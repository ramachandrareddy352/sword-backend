import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  sendAdminOtp,
  verifyAdminOtp,
  adminLogout,
} from "../controllers/adminAuthController.js";

const router = express.Router();

// Send OTP to admin email
router.post("/send-otp", sendAdminOtp);

// Verify OTP & login
router.post("/verify-otp", verifyAdminOtp);

// Logout admin (requires valid admin session)
router.post("/logout", adminAuth, adminLogout);

export default router;
