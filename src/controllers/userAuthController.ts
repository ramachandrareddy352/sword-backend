import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../database/client";
import redis from "../config/redis";
import bcrypt from "bcrypt";
import { sendEmail } from "../services/generateOTP";
import { generateSecureCode } from "../services/generateCode";
import { serializeBigInt } from "../services/serializeBigInt";

export async function sendVerification(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    /* ---------- VALIDATION ---------- */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^(?=.*[a-z])[a-z0-9._@#$%&*!-]{3,15}$/;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: "Email, password and username are required",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    if (!usernameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        error:
          "Username must be lowercase, 3–15 chars, no spaces. Special chars allowed.",
      });
    }

    /* ---------- CHECK EXISTING USER ---------- */
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });
    }

    /* ---------- HASH PASSWORD ---------- */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ---------- STORE TEMP DATA IN REDIS ---------- */
    await redis.set(
      `verify:data:${email}`,
      JSON.stringify({ email, name, password: hashedPassword }),
      { EX: 900 }, // 15 mins
    );

    /* ---------- GENERATE OTP ---------- */
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`verify:otp:${email}`, code, { EX: 900 });

    await sendEmail(
      email,
      "Account Verification Code",
      `Your verification code is ${code}. It expires in 15 minutes.`,
    );

    return res.json({
      success: true,
      message: "Verification code sent to email",
    });
  } catch (err) {
    console.error("sendVerification error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

export async function verifyRegistration(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    /* ---------- VERIFY OTP ---------- */
    const storedOtp = await redis.get(`verify:otp:${email}`);
    if (storedOtp !== code) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code",
      });
    }

    /* ---------- GET TEMP USER DATA ---------- */
    const tempData = await redis.get(`verify:data:${email}`);
    if (!tempData) {
      return res.status(400).json({
        success: false,
        error: "Registration session expired. Please try again.",
      });
    }

    const { name, password } = JSON.parse(tempData);

    /* ---------- FETCH ADMIN CONFIG (DEFAULT VALUES) ---------- */
    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
      select: {
        defaultGold: true,
        defaultTrustPoints: true,
      },
    });

    if (!config) {
      return res.status(400).json({
        success: false,
        error: "Admin config data is not present",
      });
    }

    // Use config values or fallback if config missing
    const defaultGold = config.defaultGold;
    const defaultTrustPoints = config.defaultTrustPoints;

    /* ---------- FETCH DEFAULT LEVEL 0 SWORD ---------- */
    const levelZeroSword = await prisma.swordLevelDefinition.findFirst({
      where: { level: 0 }, // Assuming level 0 is the starter sword
      select: {
        id: true,
        level: true,
      },
    });

    if (!levelZeroSword) {
      return res.status(500).json({
        success: false,
        error: "Starter sword (level 0) not found. Contact admin.",
      });
    }

    /* ---------- CREATE USER + DEFAULT SWORD IN TRANSACTION ---------- */
    const user = await prisma.$transaction(async (tx) => {
      // Create new user with config defaults
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password, // already hashed before storing in Redis
          gold: defaultGold,
          trustPoints: defaultTrustPoints,
          lastReviewed: new Date(),
          lastLoginAt: new Date(),
        },
      });

      // Generate unique sword code
      const swordCode = generateSecureCode(12);

      // Create default level 0 sword on anvil
      const createdSword = await tx.userSword.create({
        data: {
          code: swordCode,
          userId: newUser.id,
          level: levelZeroSword.level,
          isOnAnvil: true,
          swordLevelDefinitionId: levelZeroSword.id,
          isSolded: false,
          isBroken: false,
        },
      });

      // Update user's anvilSwordId
      await tx.user.update({
        where: { id: newUser.id },
        data: {
          anvilSwordId: createdSword.id,
        },
      });

      return newUser;
    });

    /* ---------- CLEAN REDIS ---------- */
    await redis.del(`verify:otp:${email}`);
    await redis.del(`verify:data:${email}`);

    /* ---------- CREATE SESSION & JWT ---------- */
    const jti = uuidv4();
    const token = jwt.sign(
      { userId: user.id.toString(), jti },
      process.env.JWT_SECRET!,
      { expiresIn: "60m" },
    );

    // Store session in Redis (1 hour expiry)
    await redis.set(`session:${jti}`, user.id.toString(), { EX: 3600 });

    return res.json({
      success: true,
      message: "Registration successful! Welcome to the game.",
      token,
      data: serializeBigInt(user),
    });
  } catch (err: any) {
    console.error("verifyRegistration error:", err);
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please try again later.",
    });
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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
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
      { expiresIn: "60m" },
    );
    await redis.set(`session:${jti}`, user.id.toString(), { EX: 3600 }); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.json({
      success: true,
      message: "User login is successfull",
      token,
      data: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
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

    const user = await prisma.user.findUnique({ where: { email } });
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
    await prisma.user.update({
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
