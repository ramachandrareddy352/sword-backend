"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = auth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_ts_1 = __importDefault(require("../config/redis.ts"));
async function auth(req, res, next) {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const sessionKey = `session:${payload.jti}`;
        const exists = await redis_ts_1.default.exists(sessionKey);
        if (!exists) {
            return res.status(401).json({ error: "Session expired" });
        }
        req.user = payload;
        next();
    }
    catch (_b) {
        return res.status(401).json({ error: "Invalid token" });
    }
}
//# sourceMappingURL=userAuth.js.map