"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = auth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = __importDefault(require("../config/redis"));
const client_1 = __importDefault(require("../database/client"));
const dailyReset_1 = require("../services/dailyReset");
async function auth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const sessionKey = `session:${payload.jti}`;
        const exists = await redis_1.default.exists(sessionKey);
        if (!exists) {
            return res.status(401).json({ error: "Session expired" });
        }
        req.user = payload;
        // 1. Check if game is stopped (before proceeding)
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
            select: { isGameStopped: true },
        });
        if (config?.isGameStopped === true) {
            return res.status(403).json({
                success: false,
                error: "Game is currently under maintenance. Please try again later.",
            });
        }
        await (0, dailyReset_1.resetDailyAdCountersIfNeeded)(BigInt(payload.userId));
        await forceSetLowestSwordOnAnvilIfNeeded(BigInt(payload.userId));
        next();
        await forceSetLowestSwordOnAnvilIfNeeded(BigInt(payload.userId));
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
async function forceSetLowestSwordOnAnvilIfNeeded(userId) {
    try {
        // Get current user anvil level
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { anvilSwordLevel: true },
        });
        if (!user)
            return;
        if (user.anvilSwordLevel !== null)
            return; // Already set → skip
        // Find the lowest level sword the user owns with unsold > 0
        const lowestSword = await client_1.default.userSword.findFirst({
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
        if (!lowestSword)
            return; // User has no eligible swords
        const lowestLevel = lowestSword.swordLevelDefinition.level;
        // Update user's anvilSwordLevel
        await client_1.default.user.update({
            where: { id: userId },
            data: { anvilSwordLevel: lowestLevel },
        });
        await client_1.default.userSword.update({
            where: {
                userId_swordId: {
                    userId,
                    swordId: lowestSword.swordId,
                },
            },
            data: { isOnAnvil: true },
        });
        console.log(`Forced set anvilSwordLevel to ${lowestLevel} for user ${userId}`);
    }
    catch (err) {
        console.error("forceSetLowestSwordOnAnvilIfNeeded error:", err);
        // Silent fail — don't block auth
    }
}
//# sourceMappingURL=userAuth.js.map