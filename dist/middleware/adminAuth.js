import jwt from "jsonwebtoken";
import redis from "../config/redis.js";
export default async function adminAuth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Admin token not found" });
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!payload || payload.role !== "ADMIN") {
            return res.status(403).json({ error: "Not an admin token" });
        }
        const sessionKey = `admin:session:${payload.jti}`;
        const session = await redis.get(sessionKey);
        if (!session) {
            return res.status(401).json({ error: "Admin session expired" });
        }
        // Session is authoritative for role (revocation-safe)
        const sessionData = JSON.parse(session);
        req.admin = {
            email: sessionData.email,
            role: "ADMIN",
            adminRole: sessionData.adminRole,
            isSuper: sessionData.isSuper,
            jti: payload.jti,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid admin token" });
    }
}
// Guard: require EDITOR (full update) rights. Super admin always passes.
export function requireEditor(req, res, next) {
    if (!req.admin) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    if (req.admin.isSuper || req.admin.adminRole === "EDITOR") {
        return next();
    }
    return res.status(403).json({
        success: false,
        error: "You have view-only access. Update rights required.",
    });
}
// Guard: require super admin (manage admins).
export function requireSuperAdmin(req, res, next) {
    if (!req.admin) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    if (req.admin.isSuper) {
        return next();
    }
    return res.status(403).json({
        success: false,
        error: "Super admin access required.",
    });
}
//# sourceMappingURL=adminAuth.js.map