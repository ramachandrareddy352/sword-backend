import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import { v4 as uuidv4 } from "uuid";
import prisma from "../database/client.js";
import redis from "../config/redis.js";
import { sendEmail } from "../services/generateOTP.js";
// Resolve whether an email is the super admin, a normal admin, or neither
async function resolveAdmin(email) {
    const adminConfig = await prisma.adminConfig.findUnique({
        where: { id: 1n },
        select: { adminEmailId: true },
    });
    if (adminConfig && adminConfig.adminEmailId === email) {
        return { kind: "SUPER" };
    }
    const admin = await prisma.admin.findUnique({
        where: { email },
        select: { role: true, isActive: true },
    });
    if (admin && admin.isActive) {
        return { kind: "NORMAL", role: admin.role };
    }
    return null;
}
// 1.1) Admin login, send OTP to admin mail id
export async function sendAdminOtp(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: "Email required" });
        }
        const resolved = await resolveAdmin(email);
        if (!resolved) {
            return res
                .status(400)
                .json({ success: false, error: "Not authorized as admin" });
        }
        const otp = randomInt(100000, 999999).toString();
        await sendEmail(email, "Admin login OTP", `Admin login OTP code is: ${otp}. It expires in 15 minutes. Please make it confidential.`);
        await redis.set(`admin:otp:${email}`, otp, { EX: 900 });
        await redis.set(`admin:otp:attempts:${email}`, "0", { EX: 900 });
        res.json({ success: true, message: "OTP sent to admin Email" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
// 1.2) Admin verify login with OTP, receive JWT
export async function verifyAdminOtp(req, res) {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res
                .status(400)
                .json({ success: false, error: "Email and OTP required" });
        }
        const otpKey = `admin:otp:${email}`;
        const attemptsKey = `admin:otp:attempts:${email}`;
        const savedOtp = await redis.get(otpKey);
        if (!savedOtp) {
            return res.status(400).json({
                success: false,
                error: "OTP expired. Please request a new OTP.",
            });
        }
        const attempts = Number(await redis.get(attemptsKey)) || 0;
        if (attempts >= 5) {
            await redis.del(otpKey);
            await redis.set(attemptsKey, "0");
            return res.status(429).json({
                success: false,
                error: "Too many invalid attempts. OTP expired. Please request a new OTP.",
            });
        }
        if (savedOtp !== otp) {
            const newAttempts = attempts + 1;
            await redis.set(attemptsKey, newAttempts.toString(), { EX: 900 });
            return res.status(400).json({
                success: false,
                error: `Invalid OTP. Attempts left: ${5 - newAttempts}`,
            });
        }
        // Re-resolve role at verify time (in case it changed/was revoked since OTP send)
        const resolved = await resolveAdmin(email);
        if (!resolved) {
            await redis.del(otpKey);
            await redis.del(attemptsKey);
            return res
                .status(403)
                .json({ success: false, error: "Admin access revoked" });
        }
        const isSuper = resolved.kind === "SUPER";
        // SUPER acts as EDITOR for permission checks, plus has the super flag
        const role = isSuper ? "EDITOR" : resolved.role;
        const jti = uuidv4();
        const token = jwt.sign({ role: "ADMIN", adminRole: role, isSuper, email, jti }, process.env.JWT_SECRET, { expiresIn: "2h" });
        // Store role in the session too so it can be enforced/revoked server-side
        await redis.set(`admin:session:${jti}`, JSON.stringify({ email, adminRole: role, isSuper }), { EX: 60 * 60 * 2 });
        await redis.del(otpKey);
        await redis.del(attemptsKey);
        res.json({
            success: true,
            message: "Admin login successful",
            token,
            role,
            isSuper,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
// 2) Admin logout
export async function adminLogout(req, res) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res
                .status(200)
                .json({ success: true, message: "Admin already logged out" });
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!payload?.jti) {
            return res
                .status(200)
                .json({ success: true, message: "Admin session cleared" });
        }
        const sessionKey = `admin:session:${payload.jti}`;
        const existed = await redis.exists(sessionKey);
        if (existed) {
            await redis.del(sessionKey);
            return res
                .status(200)
                .json({ success: true, message: "Admin logged out successfully" });
        }
        return res
            .status(200)
            .json({ success: true, message: "Admin session already expired" });
    }
    catch (error) {
        console.error("Admin logout error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
}
//# sourceMappingURL=adminAuthController.js.map