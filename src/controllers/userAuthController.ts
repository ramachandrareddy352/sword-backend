import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../database/client.js";
import redis from "../config/redis.js";
import { sendEmail } from "../services/generateOTP.js";
import { UserAuthRequest } from "../middleware/userAuth.js";
import {
  sendTelegramMessage,
  verifyTelegramData,
} from "../services/tgServices.js";

export async function logout(req: Request, res: Response) {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.json({
        success: true,
        message: req.t("userAuth.success.logout"),
      });
    }

    const token = auth.split(" ")[1];
    const payload: any = jwt.decode(token);
    if (payload?.jti) {
      await redis.del(`session:${payload.jti}`);
    }

    return res.json({
      success: true,
      message: req.t("userAuth.success.logout"),
    });
  } catch (err) {
    console.error("Error in logout:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userAuth.error.internalServerError"),
    });
  }
}

export async function googleLogin(req: Request, res: Response) {
  try {
    const { idToken, os, isDev } = req.body;
    const clientId =
      isDev === "true"
        ? process.env.DEV_GOOGLE_WEB_CLIENT_ID
        : process.env.GOOGLE_WEB_CLIENT_ID;

    const googleClient = new OAuth2Client(clientId);

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.googleIdTokenRequired"),
      });
    }

    // 1️⃣ Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.invalidGoogleToken"),
      });
    }

    const { email, name, profile } = payload;

    // 2️⃣ Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // 3️⃣ If not exists → create user + give starter sword directly
    if (!user) {
      const config = await prisma.adminConfig.findUnique({
        where: { id: BigInt(1) },
      });

      if (!config) {
        return res.status(500).json({
          success: false,
          error: req.t("userAuth.error.adminConfigNotFound"),
        });
      }

      const levelOneSwordDef = await prisma.swordLevelDefinition.findFirst({
        where: { level: 1 },
        select: { id: true, level: true },
      });

      if (!levelOneSwordDef) {
        return res.status(500).json({
          success: false,
          error: req.t("userAuth.error.starterSwordNotFound"),
        });
      }

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            isTelegramLogin: false,
            telegramId: null,
            telegramUser: null,
            email,
            name: name?.toLowerCase().replace(/\s/g, "") || "googleuser",
            password: "", // No password for Google login
            profileLogo: profile,
            gold: config.defaultGold ?? 0,
            trustPoints: config.defaultTrustPoints ?? 0,
            lastReviewed: new Date(),
            lastLoginAt: new Date(),
          },
        });

        // Directly give starter sword (level 1) with quantity 1
        await tx.userSword.upsert({
          where: {
            userId_swordId: {
              userId: newUser.id,
              swordId: BigInt(levelOneSwordDef.id),
            },
          },
          update: {
            unsoldQuantity: { increment: 1 },
          },
          create: {
            userId: newUser.id,
            swordId: BigInt(levelOneSwordDef.id),
            isOnAnvil: true,
            unsoldQuantity: 1,
            soldedQuantity: 0,
            brokenQuantity: 0,
          },
        });

        // Set as anvil sword
        await tx.user.update({
          where: { id: newUser.id },
          data: { anvilSwordLevel: BigInt(levelOneSwordDef.id) },
        });

        return newUser;
      });
    }
    // EXISTING USER → update profile only
    else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          profileLogo: profile,
        },
      });
    }

    // 4️⃣ Create JWT session
    const jti = uuidv4();

    const token = jwt.sign(
      { userId: user.id.toString(), jti },
      process.env.JWT_SECRET!,
      { expiresIn: "2h" },
    );

    await redis.set(`session:${jti}`, user.id.toString(), { EX: 60 * 60 * 2 });

    return res.json({
      success: true,
      token,
      data: {
        id: user.id.toString(),
        email: user.email,
        name: name,
      },
      message:
        user.createdAt.getTime() === user.lastLoginAt?.getTime()
          ? req.t("userAuth.success.welcomeStarterSword")
          : req.t("userAuth.success.googleLogin"),
    });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(400).json({
      success: false,
      error: req.t("userAuth.error.googleAuthFailed"),
    });
  }
}

export async function googleWebLogin(req: Request, res: Response) {
  try {
    const { idToken, os, isDev } = req.body;
    const clientId =
      isDev === "true"
        ? process.env.DEV_GOOGLE_WEB_CLIENT_ID
        : process.env.GOOGLE_WEB_CLIENT_ID;

    const googleClient = new OAuth2Client(clientId);

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.googleIdTokenRequired"),
      });
    }

    // 1️⃣ Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.invalidGoogleToken"),
      });
    }

    const { email, name, profile } = payload;

    // 2️⃣ Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // 3️⃣ If not exists → error
    if (!user) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.userAccountNotFound"),
      });
    }

    // EXISTING USER → update profile only
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        profileLogo: profile,
      },
    });

    // 4️⃣ Create JWT session
    const jti = uuidv4();

    const token = jwt.sign(
      { userId: user.id.toString(), jti },
      process.env.JWT_SECRET!,
      { expiresIn: "2h" },
    );

    await redis.set(`session:${jti}`, user.id.toString(), { EX: 60 * 60 * 2 });

    return res.json({
      success: true,
      token,
      data: {
        id: user.id.toString(),
        email: user.email,
        name: name,
      },
      message: req.t("userAuth.success.googleWebLogin"),
    });
  } catch (err) {
    console.error("Google web login error:", err);
    return res.status(400).json({
      success: false,
      error: req.t("userAuth.error.googleAuthFailed"),
    });
  }
}

export async function telegramLogin(req: Request, res: Response) {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.telegramInitDataRequired"),
      });
    }

    const botToken = process.env.TELEGRAM_GAME_BOT_TOKEN!;

    const isValid = verifyTelegramData(initData, botToken);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: req.t("userAuth.error.invalidTelegramAuth"),
      });
    }

    const params = new URLSearchParams(initData);
    const userData = JSON.parse(params.get("user")!);

    const telegramId = BigInt(userData.id);
    const username = userData.username || null;
    const photoUrl = userData.photo_url || null;

    const firstName = userData.first_name || "";
    const lastName = userData.last_name || "";

    const fullName = `${firstName} ${lastName}`.trim();

    // 2️⃣ Check if user exists
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    // 3️⃣ FIRST LOGIN → CREATE USER
    if (!user) {
      const config = await prisma.adminConfig.findUnique({
        where: { id: BigInt(1) },
      });

      if (!config) {
        return res.status(500).json({
          success: false,
          error: req.t("userAuth.error.adminConfigNotFound"),
        });
      }

      const levelOneSwordDef = await prisma.swordLevelDefinition.findFirst({
        where: { level: 1 },
        select: { id: true },
      });

      if (!levelOneSwordDef) {
        return res.status(500).json({
          success: false,
          error: req.t("userAuth.error.starterSwordNotFound"),
        });
      }

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: null,
            password: null,
            isTelegramLogin: true,
            telegramId: telegramId,
            telegramUser: username,
            name: fullName || "telegram_user",
            profileLogo: photoUrl || null,
            gold: config.defaultGold ?? 0,
            trustPoints: config.defaultTrustPoints ?? 0,
            lastReviewed: new Date(),
            lastLoginAt: new Date(),
          },
        });

        // give starter sword
        await tx.userSword.create({
          data: {
            userId: newUser.id,
            swordId: BigInt(levelOneSwordDef.id),
            isOnAnvil: true,
            unsoldQuantity: 1,
            soldedQuantity: 0,
            brokenQuantity: 0,
          },
        });

        await tx.user.update({
          where: { id: newUser.id },
          data: {
            anvilSwordLevel: BigInt(levelOneSwordDef.id),
          },
        });

        return newUser;
      });
    } // else update the telegram details on every login
    else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUser: username,
          name: fullName || "telegram_user",
          profileLogo: photoUrl,
        },
      });
    }

    // 4️⃣ CREATE SESSION
    const jti = uuidv4();

    const token = jwt.sign(
      { userId: user.id.toString(), jti },
      process.env.JWT_SECRET!,
      { expiresIn: "2h" },
    );

    await redis.set(`session:${jti}`, user.id.toString(), {
      EX: 60 * 60 * 2,
    });

    return res.json({
      success: true,
      token,
      message: req.t("userAuth.success.telegramLogin"),
    });
  } catch (err) {
    console.error("Telegram login error:", err);

    return res.status(500).json({
      success: false,
      error: req.t("userAuth.error.telegramAuthFailed"),
    });
  }
}

export async function requestCancelMembership(
  req: UserAuthRequest,
  res: Response,
) {
  try {
    const userId = BigInt(req.user.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        telegramId: true,
        isTelegramLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: req.t("userAuth.error.userNotFound"),
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // EMAIL USER
    if (!user.isTelegramLogin && user.email) {
      await sendEmail(
        user.email,
        "⚠️ Account Deletion Request - OTP",
        `Hello ${user.name},

You requested to delete your account.

Your confirmation OTP is: ${otp}

This code expires in 15 minutes. If you did not request this, please ignore this message.`,
      );

      const otpKey = `cancel:otp:${user.email}`;
      const attemptsKey = `cancel:otp:attempts:${user.email}`;

      await redis.set(otpKey, otp, { EX: 900 });
      await redis.set(attemptsKey, "0", { EX: 900 });

      return res.json({
        success: true,
        message: req.t("userAuth.success.otpSentEmail"),
      });
    }

    // TELEGRAM USER
    if (user.isTelegramLogin && user.telegramId) {
      const telegramId = user.telegramId.toString();

      await sendTelegramMessage(
        telegramId,
        `⚠️ Account Deletion Request

Hello ${user.name}

Your OTP for confirming account deletion is:

${otp}

This OTP will expire in 15 minutes.

If you did not request this, please ignore this message.`,
      );

      const otpKey = `cancel:otp:tg:${telegramId}`;
      const attemptsKey = `cancel:otp:tg:attempts:${telegramId}`;

      await redis.set(otpKey, otp, { EX: 900 });
      await redis.set(attemptsKey, "0", { EX: 900 });

      return res.json({
        success: true,
        message: req.t("userAuth.success.otpSentTelegram"),
      });
    }

    return res.status(400).json({
      success: false,
      error: req.t("userAuth.error.unableToSendOtp"),
    });
  } catch (err) {
    console.error("requestCancelMembership error:", err);

    return res.status(500).json({
      success: false,
      error: req.t("userAuth.error.failedToSendOtp"),
    });
  }
}

export async function confirmCancelMembership(
  req: UserAuthRequest,
  res: Response,
) {
  try {
    const userId = BigInt(req.user.userId);
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.otpRequired"),
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        telegramId: true,
        isTelegramLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: req.t("userAuth.error.userNotFound"),
      });
    }

    let otpKey: string;
    let attemptsKey: string;

    if (user.isTelegramLogin && user.telegramId) {
      const tgId = user.telegramId.toString();
      otpKey = `cancel:otp:tg:${tgId}`;
      attemptsKey = `cancel:otp:tg:attempts:${tgId}`;
    } else if (user.email) {
      otpKey = `cancel:otp:${user.email}`;
      attemptsKey = `cancel:otp:attempts:${user.email}`;
    } else {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.userContactInfoMissing"),
      });
    }

    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.otpExpiredOrInvalid"),
      });
    }

    let attempts = Number(await redis.get(attemptsKey)) || 0;

    if (attempts >= 5) {
      await redis.del(otpKey);
      await redis.del(attemptsKey);

      return res.status(429).json({
        success: false,
        error: req.t("userAuth.error.tooManyAttempts"),
      });
    }

    if (storedOtp !== otp) {
      const newAttempts = attempts + 1;
      await redis.set(attemptsKey, newAttempts.toString(), { EX: 900 });

      return res.status(400).json({
        success: false,
        error: req.t("userAuth.error.invalidOtpAttemptsLeft", {
          remaining: 5 - newAttempts,
        }),
      });
    }

    // DELETE ACCOUNT
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({
        where: { id: userId },
      });
    });

    // invalidate session
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const payload: any = jwt.decode(token);

      if (payload?.jti) {
        await redis.del(`session:${payload.jti}`);
      }
    }

    await redis.del(otpKey);
    await redis.del(attemptsKey);

    return res.json({
      success: true,
      message: req.t("userAuth.success.accountDeleted"),
    });
  } catch (err: any) {
    console.error("confirmCancelMembership error:", err);

    return res.status(500).json({
      success: false,
      error: req.t("userAuth.error.failedToDeleteAccount"),
    });
  }
}
