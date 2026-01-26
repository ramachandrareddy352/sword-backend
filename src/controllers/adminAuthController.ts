import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import { v4 as uuidv4 } from "uuid";
import prisma from "../database/client.ts";
import redis from "../config/redis.ts";
import type { AdminAuthRequest } from "../middleware/adminAuth.ts";
import { sendEmail } from "../services/generateOTP.ts";

// 1.1) Admin login, send otp to admin mail id
export async function sendAdminOtp(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email required" });
    }

    const adminConfig = await prisma.adminConfig.findUnique({
      where: { id: 1 },
    });

    if (!adminConfig || adminConfig.adminEmailId !== email) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized as admin" });
    }

    const otp = randomInt(100000, 999999).toString();

    await sendEmail(
      email,
      "Password Reset Code",
      `Admin login OTP code is: ${otp}. It expires in 15 minutes. Please make it confidential.`,
    );

    // Save OTP (15 min)
    await redis.set(`admin:otp:${email}`, otp, { EX: 900 });

    // Reset attempts for new OTP
    await redis.set(`admin:otp:attempts:${email}`, "0", { EX: 900 });

    res.json({
      success: true,
      message: "OTP sent to admin Email",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

// 1.2) Admin verify login with OTP, and receive JWT token to frontend e
export async function verifyAdminOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Email and OTP required",
      });
    }

    const otpKey = `admin:otp:${email}`;
    const attemptsKey = `admin:otp:attempts:${email}`;

    const savedOtp = await redis.get(otpKey);

    if (!savedOtp) {
      return res.status(400).json({
        success: false,
        error: "OTP expired. Please request a new OTP.",
      });
    }

    const attempts = Number(await redis.get(attemptsKey)) || 0;

    // Max attempts reached
    if (attempts >= 5) {
      await redis.del(otpKey);
      await redis.set(attemptsKey, "0");

      return res.status(429).json({
        success: false,
        error:
          "Too many invalid attempts. OTP expired. Please request a new OTP.",
      });
    }

    // Wrong OTP
    if (savedOtp !== otp) {
      const newAttempts = attempts + 1;
      await redis.set(attemptsKey, newAttempts.toString(), { EX: 900 });

      return res.status(400).json({
        success: false,
        error: `Invalid OTP. Attempts left: ${5 - newAttempts}`,
      });
    }

    // Correct OTP
    const jti = uuidv4();

    const token = jwt.sign(
      {
        role: "ADMIN",
        email,
        jti,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "2h" },
    );

    // Create admin session
    await redis.set(`admin:session:${jti}`, email, { EX: 60 * 60 * 2 });

    // Cleanup
    await redis.del(otpKey);
    await redis.del(attemptsKey);

    res.json({
      success: true,
      message: "Admin login successful",
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

// 2) Admin logout, delete the redis data
export async function adminLogout(req: AdminAuthRequest, res: Response) {
  try {
    const authHeader = req.headers.authorization;

    const token = authHeader?.split(" ")[1];
    if (!token) {
      return res.status(200).json({
        success: true,
        message: "Admin already logged out",
      });
    }

    const payload: any = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!payload?.jti) {
      return res.status(200).json({
        success: true,
        message: "Admin session cleared",
      });
    }

    const sessionKey = `admin:session:${payload.jti}`;
    const existed = await redis.exists(sessionKey);

    if (existed) {
      await redis.del(sessionKey);
      return res.status(200).json({
        success: true,
        message: "Admin logged out successfully",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin session already expired",
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
