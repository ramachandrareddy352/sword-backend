import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prismaClient from "../database/client.ts";
import redis from "../config/redis.ts";
import bcrypt from "bcrypt";
import { sendEmail } from "../services/generateOTP.ts";
import { generateSecureCode } from "../services/generateCode.ts";

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

    // Check verification code
    const storedCode = await redis.get(`verify:${email}`);
    if (storedCode !== code) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Fetch admin config for default trust points
    const config = await prismaClient.adminConfig.findUnique({
      where: { id: BigInt(1) },
      select: { defaultTrustPoints: true },
    });
    const defaultTrustPoints = config?.defaultTrustPoints ?? 100;

    // Find level-0 sword definition
    const levelZeroSword = await prismaClient.swordLevelDefinition.findUnique({
      where: { id: 1 },
    });
    if (!levelZeroSword) {
      return res.status(500).json({
        success: false,
        error: "Level 0 sword definition not found. Please contact admin.",
      });
    }

    // Find default shield (assuming code = "shield-1")
    const defaultShield = await prismaClient.shieldType.findUnique({
      where: { id: 1 },
    });
    if (!defaultShield) {
      return res.status(500).json({
        success: false,
        error: "Default shield (shield-1) not found. Please contact admin.",
      });
    }

    // Transaction: create user, assign sword & shield, set anvil items
    const result = await prismaClient.$transaction(async (tx) => {
      // Create user with defaults
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          gold: BigInt(0),
          trustPoints: defaultTrustPoints,
          emailVerified: true,
          lastReviewed: new Date(),
          lastLoginAt: new Date(),
        },
      });

      // Generate unique code for UserSword
      let swordCode: string;
      let attempts = 0;
      while (attempts < 5) {
        swordCode = generateSecureCode(12);
        try {
          await tx.userSword.create({
            data: {
              code: swordCode,
              userId: newUser.id,
              level: 0,
              isOnAnvil: true,
              swordLevelDefinitionId: levelZeroSword.id,
            },
          });

          // Create UserShield (quantity 1)
          await tx.userShield.create({
            data: {
              userId: newUser.id,
              shieldId: defaultShield.id,
              quantity: 1,
              isOnAnvil: true,
            },
          });

          // Update user with anvil IDs
          await tx.user.update({
            where: { id: newUser.id },
            data: {
              anvilSwordId: levelZeroSword.id,
              anvilShieldId: defaultShield.id,
            },
          });

          return newUser;
        } catch (err: any) {
          if (err.code !== "P2002") throw err; // retry on unique constraint
          attempts++;
        }
      }

      throw new Error("Failed to generate unique sword code after retries");
    });

    // Clean up verification code
    await redis.del(`verify:${email}`);

    // Generate JWT & session
    const jti = uuidv4();
    const token = jwt.sign(
      { userId: result.id.toString(), jti },
      process.env.JWT_SECRET!,
      { expiresIn: "60m" },
    );
    await redis.set(`session:${jti}`, result.id.toString(), { EX: 3600 }); // 1 hour

    return res.json({
      success: true,
      message: "User registration and verification successful",
      token,
      user: {
        id: result.id.toString(),
        email: result.email,
      },
    });
  } catch (err: any) {
    console.error("Error in verifyRegistration:", err);
    if (err.message.includes("Failed to generate unique sword code")) {
      return res.status(500).json({
        success: false,
        error: "Failed to assign starter sword. Please try again.",
      });
    }
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
      { expiresIn: "60m" },
    );
    await redis.set(`session:${jti}`, user.id.toString(), { EX: 3600 }); // 15 minutes

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
