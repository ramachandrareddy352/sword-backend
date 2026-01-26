import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redis from "../config/redis.ts";

export interface AdminAuthRequest extends Request {
  admin?: { email: string; role: "ADMIN"; jti: string };
}

export default async function adminAuth(
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Admin token not found" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.role !== "ADMIN") {
      return res.status(403).json({ error: "Not an admin token" });
    }

    const sessionKey = `admin:session:${payload.jti}`;
    const exists = await redis.exists(sessionKey);

    if (!exists) {
      return res.status(401).json({ error: "Admin session expired" });
    }

    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
}
