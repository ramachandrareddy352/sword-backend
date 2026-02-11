import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redis from "../config/redis";
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

    await resetDailyAdCountersIfNeeded(BigInt(payload.userId));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
