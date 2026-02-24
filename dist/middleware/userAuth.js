"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = auth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = __importDefault(require("../config/redis"));
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
        await (0, dailyReset_1.resetDailyAdCountersIfNeeded)(BigInt(payload.userId));
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
//# sourceMappingURL=userAuth.js.map