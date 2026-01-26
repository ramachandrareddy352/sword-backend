import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prismaClient from "../database/client.ts";
import redis from "../config/redis.ts";
import bcrypt from "bcrypt";
import { sendEmail } from "../services/generateOTP.ts";

export async function sendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email is required" });
    }

    const existingUser = await prismaClient.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "Email already registered" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`verify:${email}`, code, { EX: 900 }); // 15 minutes expiry

    await sendEmail(
      email,
      "Account Verification Code",
      `Your verification code is: ${code}. It expires in 15 minutes.`,
    );

    return res.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (err) {
    console.error("Error in sendVerification:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function verifyRegistration(req: Request, res: Response) {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({
        success: false,
        error: "Email, code, and password are required",
      });
    }

    const storedCode = await redis.get(`verify:${email}`);
    if (storedCode !== code) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prismaClient.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: true,
        lastReviewed: new Date(), // Set as per schema comment
      },
    });

    await redis.del(`verify:${email}`);
    const jti = uuidv4();
    const token = jwt.sign(
      { userId: user.id.toString(), jti },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" },
    );
    await redis.set(`session:${jti}`, user.id.toString(), { EX: 900 }); // 15 minutes

    await prismaClient.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.json({
      success: true,
      message: "User verification is successfull",
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error in verifyRegistration:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password are required" });
    }

    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user || !user.emailVerified) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials or email not verified",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const jti = uuidv4();
    const token = jwt.sign(
      { userId: user.id.toString(), jti },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" },
    );
    await redis.set(`session:${jti}`, user.id.toString(), { EX: 900 }); // 15 minutes

    await prismaClient.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.json({
      success: true,
      message: "User login is successfull",
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error in login:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email is required" });
    }

    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`reset:${email}`, code, { EX: 900 }); // 15 minutes expiry

    await sendEmail(
      email,
      "Password Reset Code",
      `Your password reset code is: ${code}. It expires in 15 minutes.`,
    );

    return res.json({
      success: true,
      message: "Password reset code sent to your email",
    });
  } catch (err) {
    console.error("Error in forgotPassword:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ error: "Email, code, and new password are required" });
    }

    const storedCode = await redis.get(`reset:${email}`);
    if (storedCode !== code) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired reset code" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await prismaClient.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await redis.del(`reset:${email}`);
    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (err) {
    console.error("Error in resetPassword:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.json({ success: true, message: "Logged out" });
    }

    const token = auth.split(" ")[1];
    const payload: any = jwt.decode(token);
    if (payload?.jti) {
      await redis.del(`session:${payload.jti}`);
    }

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Error in logout:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
