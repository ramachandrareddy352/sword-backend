"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAdminOtp = sendAdminOtp;
exports.verifyAdminOtp = verifyAdminOtp;
exports.adminLogout = adminLogout;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const client_1 = __importDefault(require("../database/client"));
const redis_1 = __importDefault(require("../config/redis"));
const generateOTP_1 = require("../services/generateOTP");
// 1.1) Admin login, send otp to admin mail id
async function sendAdminOtp(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: "Email required" });
        }
        const adminConfig = await client_1.default.adminConfig.findUnique({
            where: { id: 1 },
        });
        if (!adminConfig || adminConfig.adminEmailId !== email) {
            return res
                .status(403)
                .json({ success: false, error: "Not authorized as admin" });
        }
        const otp = (0, crypto_1.randomInt)(100000, 999999).toString();
        await (0, generateOTP_1.sendEmail)(email, "Admin login OTP", `Admin login OTP code is: ${otp}. It expires in 15 minutes. Please make it confidential.`);
        // Save OTP (15 min)
        await redis_1.default.set(`admin:otp:${email}`, otp, { EX: 900 });
        // Reset attempts for new OTP
        await redis_1.default.set(`admin:otp:attempts:${email}`, "0", { EX: 900 });
        res.json({
            success: true,
            message: "OTP sent to admin Email",
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
// 1.2) Admin verify login with OTP, and receive JWT token to frontend e
async function verifyAdminOtp(req, res) {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: "Email and OTP required",
            });
        }
        const otpKey = `admin:otp:${email}`;
        const attemptsKey = `admin:otp:attempts:${email}`;
        const savedOtp = await redis_1.default.get(otpKey);
        if (!savedOtp) {
            return res.status(400).json({
                success: false,
                error: "OTP expired. Please request a new OTP.",
            });
        }
        const attempts = Number(await redis_1.default.get(attemptsKey)) || 0;
        // Max attempts reached
        if (attempts >= 5) {
            await redis_1.default.del(otpKey);
            await redis_1.default.set(attemptsKey, "0");
            return res.status(429).json({
                success: false,
                error: "Too many invalid attempts. OTP expired. Please request a new OTP.",
            });
        }
        // Wrong OTP
        if (savedOtp !== otp) {
            const newAttempts = attempts + 1;
            await redis_1.default.set(attemptsKey, newAttempts.toString(), { EX: 900 });
            return res.status(400).json({
                success: false,
                error: `Invalid OTP. Attempts left: ${5 - newAttempts}`,
            });
        }
        // Correct OTP
        const jti = (0, uuid_1.v4)();
        const token = jsonwebtoken_1.default.sign({
            role: "ADMIN",
            email,
            jti,
        }, process.env.JWT_SECRET, { expiresIn: "2h" });
        // Create admin session
        await redis_1.default.set(`admin:session:${jti}`, email, { EX: 60 * 60 * 2 });
        // Cleanup
        await redis_1.default.del(otpKey);
        await redis_1.default.del(attemptsKey);
        res.json({
            success: true,
            message: "Admin login successful",
            token,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
// 2) Admin logout, delete the redis data
async function adminLogout(req, res) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        if (!token) {
            return res.status(200).json({
                success: true,
                message: "Admin already logged out",
            });
        }
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!payload?.jti) {
            return res.status(200).json({
                success: true,
                message: "Admin session cleared",
            });
        }
        const sessionKey = `admin:session:${payload.jti}`;
        const existed = await redis_1.default.exists(sessionKey);
        if (existed) {
            await redis_1.default.del(sessionKey);
            return res.status(200).json({
                success: true,
                message: "Admin logged out successfully",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Admin session already expired",
        });
    }
    catch (error) {
        console.error("Admin logout error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
//# sourceMappingURL=adminAuthController.js.map