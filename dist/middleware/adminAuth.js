"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = adminAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = __importDefault(require("../config/redis"));
async function adminAuth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Admin token not found" });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!payload || payload.role !== "ADMIN") {
            return res.status(403).json({ error: "Not an admin token" });
        }
        const sessionKey = `admin:session:${payload.jti}`;
        const exists = await redis_1.default.exists(sessionKey);
        if (!exists) {
            return res.status(401).json({ error: "Admin session expired" });
        }
        req.admin = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid admin token" });
    }
}
//# sourceMappingURL=adminAuth.js.map