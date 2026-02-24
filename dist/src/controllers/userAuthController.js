"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerification = sendVerification;
exports.verifyRegistration = verifyRegistration;
exports.login = login;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.logout = logout;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const client_ts_1 = __importDefault(require("../database/client.ts"));
const redis_ts_1 = __importDefault(require("../config/redis.ts"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const generateOTP_ts_1 = require("../services/generateOTP.ts");
const generateCode_ts_1 = require("../services/generateCode.ts");
async function sendVerification(req, res) {
    try {
        const { email, password, name } = req.body;
        /* ---------- VALIDATION ---------- */
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const usernameRegex = /^(?=.*[a-z])[a-z0-9._@#$%&*!-]{3,15}$/;
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: "Email, password and username are required",
            });
        }
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid email format",
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters",
            });
        }
        if (!usernameRegex.test(name)) {
            return res.status(400).json({
                success: false,
                error: "Username must be lowercase, 3–15 chars, no spaces. Special chars allowed.",
            });
        }
        /* ---------- CHECK EXISTING USER ---------- */
        const existing = await client_ts_1.default.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: "Email already registered",
            });
        }
        /* ---------- HASH PASSWORD ---------- */
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        /* ---------- STORE TEMP DATA IN REDIS ---------- */
        await redis_ts_1.default.set(`verify:data:${email}`, JSON.stringify({ email, name, password: hashedPassword }), { EX: 900 });
        /* ---------- GENERATE OTP ---------- */
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await redis_ts_1.default.set(`verify:otp:${email}`, code, { EX: 900 });
        await (0, generateOTP_ts_1.sendEmail)(email, "Account Verification Code", `Your verification code is ${code}. It expires in 15 minutes.`);
        return res.json({
            success: true,
            message: "Verification code sent to email",
        });
    }
    catch (err) {
        console.error("sendVerification error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
async function verifyRegistration(req, res) {
    var _a;
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: "Email and code are required",
            });
        }
        /* ---------- VERIFY OTP ---------- */
        const storedOtp = await redis_ts_1.default.get(`verify:otp:${email}`);
        if (storedOtp !== code) {
            return res.status(400).json({
                success: false,
                error: "Invalid or expired verification code",
            });
        }
        /* ---------- GET TEMP USER DATA ---------- */
        const tempData = await redis_ts_1.default.get(`verify:data:${email}`);
        if (!tempData) {
            return res.status(400).json({
                success: false,
                error: "Registration session expired",
            });
        }
        const { name, password } = JSON.parse(tempData);
        /* ---------- FETCH ADMIN CONFIG ---------- */
        const config = await client_ts_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
            select: { defaultTrustPoints: true },
        });
        const trustPoints = (_a = config === null || config === void 0 ? void 0 : config.defaultTrustPoints) !== null && _a !== void 0 ? _a : 100;
        /* ---------- FETCH DEFAULT SWORD & SHIELD ---------- */
        const levelZeroSword = await client_ts_1.default.swordLevelDefinition.findUnique({
            where: { id: BigInt(1) },
        });
        const defaultShield = await client_ts_1.default.shieldType.findUnique({
            where: { id: BigInt(1) },
        });
        if (!levelZeroSword || !defaultShield) {
            return res.status(500).json({
                success: false,
                error: "Starter items missing. Contact admin.",
            });
        }
        /* ---------- TRANSACTION ---------- */
        const user = await client_ts_1.default.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    name,
                    gold: 5000,
                    password,
                    trustPoints,
                    emailVerified: true,
                    lastReviewed: new Date(),
                    lastLoginAt: new Date(),
                },
            });
            const swordCode = (0, generateCode_ts_1.generateSecureCode)(12);
            await tx.userSword.create({
                data: {
                    code: swordCode,
                    userId: newUser.id,
                    level: levelZeroSword.level,
                    isOnAnvil: true,
                    swordLevelDefinitionId: levelZeroSword.id,
                },
            });
            await tx.userShield.create({
                data: {
                    userId: newUser.id,
                    shieldId: defaultShield.id,
                    quantity: 1,
                    isOnAnvil: true,
                },
            });
            await tx.user.update({
                where: { id: newUser.id },
                data: {
                    anvilSwordId: levelZeroSword.id,
                    anvilShieldId: defaultShield.id,
                },
            });
            return newUser;
        });
        /* ---------- CLEAN REDIS ---------- */
        await redis_ts_1.default.del(`verify:otp:${email}`);
        await redis_ts_1.default.del(`verify:data:${email}`);
        /* ---------- CREATE SESSION ---------- */
        const jti = (0, uuid_1.v4)();
        const token = jsonwebtoken_1.default.sign({ userId: user.id.toString(), jti }, process.env.JWT_SECRET, { expiresIn: "60m" });
        await redis_ts_1.default.set(`session:${jti}`, user.id.toString(), { EX: 3600 });
        return res.json({
            success: true,
            message: "Registration successful",
            token,
            data: {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (err) {
        console.error("verifyRegistration error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ success: false, error: "Email and password are required" });
        }
        const user = await client_ts_1.default.user.findUnique({ where: { email } });
        if (!user || !user.emailVerified) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials or email not verified",
            });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res
                .status(401)
                .json({ success: false, error: "Invalid credentials" });
        }
        const jti = (0, uuid_1.v4)();
        const token = jsonwebtoken_1.default.sign({ userId: user.id.toString(), jti }, process.env.JWT_SECRET, { expiresIn: "60m" });
        await redis_ts_1.default.set(`session:${jti}`, user.id.toString(), { EX: 3600 }); // 15 minutes
        await client_ts_1.default.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return res.json({
            success: true,
            message: "User login is successfull",
            token,
            data: {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (err) {
        console.error("Error in login:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
}
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res
                .status(400)
                .json({ success: false, error: "Email is required" });
        }
        const user = await client_ts_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await redis_ts_1.default.set(`reset:${email}`, code, { EX: 900 }); // 15 minutes expiry
        await (0, generateOTP_ts_1.sendEmail)(email, "Password Reset Code", `Your password reset code is: ${code}. It expires in 15 minutes.`);
        return res.json({
            success: true,
            message: "Password reset code sent to your email",
        });
    }
    catch (err) {
        console.error("Error in forgotPassword:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
}
async function resetPassword(req, res) {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res
                .status(400)
                .json({ error: "Email, code, and new password are required" });
        }
        const storedCode = await redis_ts_1.default.get(`reset:${email}`);
        if (storedCode !== code) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid or expired reset code" });
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(newPassword, salt);
        await client_ts_1.default.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        await redis_ts_1.default.del(`reset:${email}`);
        return res.json({
            success: true,
            message: "Password has been reset successfully",
        });
    }
    catch (err) {
        console.error("Error in resetPassword:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
}
async function logout(req, res) {
    try {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.json({ success: true, message: "Logged out" });
        }
        const token = auth.split(" ")[1];
        const payload = jsonwebtoken_1.default.decode(token);
        if (payload === null || payload === void 0 ? void 0 : payload.jti) {
            await redis_ts_1.default.del(`session:${payload.jti}`);
        }
        return res.json({ success: true, message: "Logged out successfully" });
    }
    catch (err) {
        console.error("Error in logout:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
}
//# sourceMappingURL=userAuthController.js.map