import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redis from "../config/redis";
import prisma from "../database/client";
import { resetDailyAdCountersIfNeeded } from "../services/dailyReset";

export interface UserAuthRequest extends Request {
  user?: any;
}

export default async function auth(
  req: UserAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);

    const sessionKey = `session:${payload.jti}`;
    const exists = await redis.exists(sessionKey);
    if (!exists) {
      return res.status(401).json({ error: "Session expired" });
    }

    req.user = payload;

    // 1. Check if game is stopped (before proceeding)
    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
      select: { isGameStopped: true },
    });

    if (config?.isGameStopped === true) {
      return res.status(403).json({
        success: false,
        error: "Game is currently under maintenance. Please try again later.",
      });
    }

    await resetDailyAdCountersIfNeeded(BigInt(payload.userId));

    await forceSetLowestSwordOnAnvilIfNeeded(BigInt(payload.userId));
    next();
    await forceSetLowestSwordOnAnvilIfNeeded(BigInt(payload.userId));
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function forceSetLowestSwordOnAnvilIfNeeded(userId: bigint) {
  try {
    // Get current user anvil level
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { anvilSwordLevel: true },
    });

    if (!user) return;
    if (user.anvilSwordLevel !== null) return; // Already set → skip

    // Find the lowest level sword the user owns with unsold > 0
    const lowestSword = await prisma.userSword.findFirst({
      where: {
        userId,
        unsoldQuantity: { gt: 0 },
      },
      orderBy: {
        swordLevelDefinition: { level: "asc" }, // Lowest level first
      },
      select: {
        swordId: true,
        swordLevelDefinition: { select: { level: true } },
      },
    });

    if (!lowestSword) return; // User has no eligible swords

    const lowestLevel = lowestSword.swordLevelDefinition.level;

    // Update user's anvilSwordLevel
    await prisma.user.update({
      where: { id: userId },
      data: { anvilSwordLevel: lowestLevel },
    });

    await prisma.userSword.update({
      where: {
        userId_swordId: {
          userId,
          swordId: lowestSword.swordId,
        },
      },
      data: { isOnAnvil: true },
    });

    console.log(
      `Forced set anvilSwordLevel to ${lowestLevel} for user ${userId}`,
    );
  } catch (err) {
    console.error("forceSetLowestSwordOnAnvilIfNeeded error:", err);
    // Silent fail — don't block auth
  }
}
