import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../database/client";
import redis from "../config/redis";
// import bcrypt from "bcrypt";
import { sendEmail } from "../services/generateOTP";
// import { generateSecureCode } from "../services/generateCode";
// import { serializeBigInt } from "../services/serializeBigInt";
import { UserAuthRequest } from "../middleware/userAuth";
import {
  sendTelegramMessage,
  verifyTelegramData,
} from "../services/tgServices";

// export async function sendVerification(req: Request, res: Response) {
//   try {
//     const { email, password, name } = req.body;

//     /* ---------- VALIDATION ---------- */
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const usernameRegex = /^(?=.*[a-z])[a-z0-9._@#$%&*!-]{3,15}$/;

//     if (!email || !password || !name) {
//       return res.status(400).json({
//         success: false,
//         error: "Email, password and username are required",
//       });
//     }

//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid email format",
//       });
//     }

//     if (password.length < 8) {
//       return res.status(400).json({
//         success: false,
//         error: "Password must be at least 8 characters",
//       });
//     }

//     if (!usernameRegex.test(name)) {
//       return res.status(400).json({
//         success: false,
//         error:
//           "Username must be lowercase, 3–15 chars, no spaces. Special chars allowed.",
//       });
//     }

//     /* ---------- CHECK EXISTING USER ---------- */
//     const existing = await prisma.user.findUnique({
//       where: { email },
//     });
//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         error: "Email already registered",
//       });
//     }

//     /* ---------- HASH PASSWORD ---------- */
//     const hashedPassword = await bcrypt.hash(password, 10);

//     /* ---------- STORE TEMP DATA IN REDIS ---------- */
//     await redis.set(
//       `verify:data:${email}`,
//       JSON.stringify({ email, name, password: hashedPassword }),
//       { EX: 900 }, // 15 mins
//     );

//     /* ---------- GENERATE OTP ---------- */
//     const code = Math.floor(100000 + Math.random() * 900000).toString();
//     await redis.set(`verify:otp:${email}`, code, { EX: 900 });

//     await sendEmail(
//       email,
//       "Account Verification Code",
//       `Your verification code is ${code}. It expires in 15 minutes.`,
//     );

//     return res.json({
//       success: true,
//       message: "Verification code sent to email",
//     });
//   } catch (err) {
//     console.error("sendVerification error:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Internal server error",
//     });
//   }
// }

// export async function verifyRegistration(req: Request, res: Response) {
//   try {
//     const { email, code } = req.body;

//     if (!email || !code) {
//       return res.status(400).json({
//         success: false,
//         error: "Email and verification code are required",
//       });
//     }

//     const otpKey = `verify:otp:${email}`;
//     const attemptsKey = `verify:otp:attempts:${email}`;

//     const storedOtp = await redis.get(otpKey);

//     if (!storedOtp) {
//       return res.status(400).json({
//         success: false,
//         error: "Verification code expired. Please request a new one.",
//       });
//     }

//     let attempts = Number(await redis.get(attemptsKey)) || 0;

//     // Max attempts reached → invalidate OTP
//     if (attempts >= 5) {
//       await redis.del(otpKey);
//       await redis.del(attemptsKey);
//       await redis.del(`verify:data:${email}`);
//       return res.status(429).json({
//         success: false,
//         error:
//           "Too many invalid attempts. Verification code expired. Please request a new code.",
//       });
//     }

//     // Wrong OTP → increment attempts
//     if (storedOtp !== code) {
//       const newAttempts = attempts + 1;
//       await redis.set(attemptsKey, newAttempts.toString(), { EX: 900 });
//       return res.status(400).json({
//         success: false,
//         error: `Invalid verification code. Attempts left: ${5 - newAttempts}`,
//       });
//     }

//     // Correct OTP → proceed with registration
//     const tempData = await redis.get(`verify:data:${email}`);
//     if (!tempData) {
//       await redis.del(otpKey);
//       await redis.del(attemptsKey);
//       return res.status(400).json({
//         success: false,
//         error: "Registration session expired. Please try again.",
//       });
//     }

//     const { name, password } = JSON.parse(tempData);

//     const config = await prisma.adminConfig.findUnique({
//       where: { id: BigInt(1) },
//       select: {
//         defaultGold: true,
//         defaultTrustPoints: true,
//       },
//     });

//     if (!config) {
//       return res.status(500).json({
//         success: false,
//         error: "Admin config not found",
//       });
//     }

//     // Find level 1 sword definition
//     const levelOneSwordDef = await prisma.swordLevelDefinition.findFirst({
//       where: { level: 1 },
//       select: { id: true, level: true },
//     });

//     if (!levelOneSwordDef) {
//       return res.status(500).json({
//         success: false,
//         error: "Starter sword definition (level 1) not found",
//       });
//     }

//     const newUser = await prisma.$transaction(async (tx) => {
//       // Create the user
//       const createdUser = await tx.user.create({
//         data: {
//           email,
//           name,
//           password,
//           gold: config.defaultGold,
//           trustPoints: config.defaultTrustPoints,
//           lastReviewed: new Date(),
//           lastLoginAt: new Date(),
//         },
//       });

//       // Directly give starter sword (level 1) with quantity 1
//       await tx.userSword.upsert({
//         where: {
//           userId_swordId: {
//             userId: createdUser.id,
//             swordId: BigInt(levelOneSwordDef.id),
//           },
//         },
//         update: {
//           unsoldQuantity: { increment: 1 },
//         },
//         create: {
//           userId: createdUser.id,
//           swordId: BigInt(levelOneSwordDef.id),
//           isOnAnvil: true,
//           unsoldQuantity: 1,
//           soldedQuantity: 0,
//           brokenQuantity: 0,
//         },
//       });

//       // Set as anvil sword
//       await tx.user.update({
//         where: { id: createdUser.id },
//         data: { anvilSwordLevel: BigInt(levelOneSwordDef.id) },
//       });

//       return createdUser;
//     });

//     // Cleanup Redis
//     await redis.del(`verify:otp:${email}`);
//     await redis.del(`verify:otp:attempts:${email}`);
//     await redis.del(`verify:data:${email}`);

//     // Create JWT session
//     const jti = uuidv4();
//     const token = jwt.sign(
//       { userId: newUser.id.toString(), jti },
//       process.env.JWT_SECRET!,
//       { expiresIn: "2h" },
//     );

//     await redis.set(`session:${jti}`, newUser.id.toString(), {
//       EX: 60 * 60 * 2,
//     });

//     return res.json({
//       success: true,
//       message:
//         "Registration successful! Welcome to the game. You received a starter sword (Level 1) and it has been placed on your anvil.",
//       token,
//       data: serializeBigInt(newUser),
//     });
//   } catch (err: any) {
//     console.error("verifyRegistration error:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Registration failed. Please try again later.",
//     });
//   }
// }

// export async function login(req: Request, res: Response) {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Email and password are required" });
//     }

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid credentials or email not verified",
//       });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Invalid credentials" });
//     }

//     const jti = uuidv4();
//     const token = jwt.sign(
//       { userId: user.id.toString(), jti },
//       process.env.JWT_SECRET!,
//       { expiresIn: "2h" },
//     );
//     await redis.set(`session:${jti}`, user.id.toString(), { EX: 60 * 60 * 2 }); // 120 minutes

//     await prisma.user.update({
//       where: { id: user.id },
//       data: { lastLoginAt: new Date() },
//     });

//     return res.json({
//       success: true,
//       message: "User login is successfull",
//       token,
//       data: {
//         id: user.id.toString(),
//         email: user.email,
//         name: user.name,
//       },
//     });
//   } catch (err) {
//     console.error("Error in login:", err);
//     return res
//       .status(500)
//       .json({ success: false, error: "Internal server error" });
//   }
// }

// export async function forgotPassword(req: Request, res: Response) {
//   try {
//     const { email } = req.body;
//     if (!email) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Email is required" });
//     }

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ success: false, error: "User not found" });
//     }

//     const code = Math.floor(100000 + Math.random() * 900000).toString();
//     await redis.set(`reset:${email}`, code, { EX: 900 }); // 15 minutes expiry

//     await sendEmail(
//       email,
//       "Password Reset Code",
//       `Your password reset code is: ${code}. It expires in 15 minutes.`,
//     );

//     return res.json({
//       success: true,
//       message: "Password reset code sent to your email",
//     });
//   } catch (err) {
//     console.error("Error in forgotPassword:", err);
//     return res
//       .status(500)
//       .json({ success: false, error: "Internal server error" });
//   }
// }

// export async function resetPassword(req: Request, res: Response) {
//   try {
//     const { email, code, newPassword } = req.body;

//     if (!email || !code || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         error: "Email, code, and new password are required",
//       });
//     }

//     const otpKey = `reset:${email}`;
//     const attemptsKey = `reset:attempts:${email}`;

//     const storedCode = await redis.get(otpKey);

//     if (!storedCode) {
//       return res.status(400).json({
//         success: false,
//         error: "Reset code expired. Please request a new one.",
//       });
//     }

//     let attempts = Number(await redis.get(attemptsKey)) || 0;

//     // Max attempts → invalidate
//     if (attempts >= 5) {
//       await redis.del(otpKey);
//       await redis.del(attemptsKey);
//       return res.status(429).json({
//         success: false,
//         error:
//           "Too many invalid attempts. Reset code expired. Please request a new code.",
//       });
//     }

//     // Wrong code → increment
//     if (storedCode !== code) {
//       const newAttempts = attempts + 1;
//       await redis.set(attemptsKey, newAttempts.toString(), { EX: 900 });
//       return res.status(400).json({
//         success: false,
//         error: `Invalid reset code. Attempts left: ${5 - newAttempts}`,
//       });
//     }

//     // Correct code → reset password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(newPassword, salt);

//     await prisma.user.update({
//       where: { email },
//       data: { password: hashedPassword },
//     });

//     // Cleanup
//     await redis.del(otpKey);
//     await redis.del(attemptsKey);

//     return res.json({
//       success: true,
//       message: "Password has been reset successfully. Please login.",
//     });
//   } catch (err) {
//     console.error("resetPassword error:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to reset password. Please try again.",
//     });
//   }
// }

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
        error: "Google ID token is required",
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
        error: "Invalid Google token",
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
          error: "Admin config not found",
        });
      }

      const levelOneSwordDef = await prisma.swordLevelDefinition.findFirst({
        where: { level: 1 },
        select: { id: true, level: true },
      });

      if (!levelOneSwordDef) {
        return res.status(500).json({
          success: false,
          error: "Starter sword definition (level 1) not found",
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
          ? "Welcome! You received a starter sword (Level 1) placed on your anvil."
          : "Login successful!",
    });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(400).json({
      success: false,
      error: "Google authentication failed",
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
        error: "Google ID token is required",
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
        error: "Invalid Google token",
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
        error: "User account not found",
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
      message: "Login successful!",
    });
  } catch (err) {
    console.error("Google web login error:", err);
    return res.status(400).json({
      success: false,
      error: "Google authentication failed",
    });
  }
}

export async function telegramLogin(req: Request, res: Response) {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        success: false,
        error: "Telegram initData is required",
      });
    }

    const botToken = process.env.TELEGRAM_GAME_BOT_TOKEN!;
    console.log(botToken);

    const isValid = verifyTelegramData(initData, botToken);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid Telegram authentication",
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
          error: "Admin config not found",
        });
      }

      const levelOneSwordDef = await prisma.swordLevelDefinition.findFirst({
        where: { level: 1 },
        select: { id: true },
      });

      if (!levelOneSwordDef) {
        return res.status(500).json({
          success: false,
          error: "Starter sword definition missing",
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
      message: "Telegram login successful!",
    });
  } catch (err) {
    console.error("Telegram login error:", err);

    return res.status(500).json({
      success: false,
      error: "Telegram authentication failed",
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
        error: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // EMAIL USER
    if (!user.isTelegramLogin && user.email) {
      await sendEmail(
        user.email,
        "Account Deletion Request - OTP",
        `Hello ${user.name},

You requested to delete your account.

Your confirmation OTP is: ${otp}

This code expires in 15 minutes.`,
      );

      const otpKey = `cancel:otp:${user.email}`;
      const attemptsKey = `cancel:otp:attempts:${user.email}`;

      await redis.set(otpKey, otp, { EX: 900 });
      await redis.set(attemptsKey, "0", { EX: 900 });

      return res.json({
        success: true,
        message: "OTP sent to your email",
      });
    }

    // TELEGRAM USER
    if (user.isTelegramLogin && user.telegramId) {
      const telegramId = user.telegramId.toString();

      await sendTelegramMessage(
        telegramId,
        `⚠️ *Account Deletion Request*

Hello ${user.name}

Your OTP for confirming account deletion is:

*${otp}*

This OTP will expire in 15 minutes.

If you did not request this, ignore this message.`,
      );

      const otpKey = `cancel:otp:tg:${telegramId}`;
      const attemptsKey = `cancel:otp:tg:attempts:${telegramId}`;

      await redis.set(otpKey, otp, { EX: 900 });
      await redis.set(attemptsKey, "0", { EX: 900 });

      return res.json({
        success: true,
        message: "OTP sent to your Telegram account",
      });
    }

    return res.status(400).json({
      success: false,
      error: "Unable to send OTP",
    });
  } catch (err) {
    console.error("requestCancelMembership error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to send OTP",
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
        error: "OTP code is required",
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
        error: "User not found",
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
        error: "User contact info missing",
      });
    }

    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        error: "OTP expired or invalid. Please request for new OTP",
      });
    }

    let attempts = Number(await redis.get(attemptsKey)) || 0;

    if (attempts >= 5) {
      await redis.del(otpKey);
      await redis.del(attemptsKey);

      return res.status(429).json({
        success: false,
        error: "Too many invalid attempts. OTP expired.",
      });
    }

    if (storedOtp !== otp) {
      const newAttempts = attempts + 1;
      await redis.set(attemptsKey, newAttempts.toString(), { EX: 900 });

      return res.status(400).json({
        success: false,
        error: `Invalid OTP. Attempts left: ${5 - newAttempts}`,
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
      message: "Account deleted successfully",
    });
  } catch (err: any) {
    console.error("confirmCancelMembership error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to delete account",
    });
  }
}
