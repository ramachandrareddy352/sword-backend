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
exports.googleLogin = googleLogin;
exports.requestCancelMembership = requestCancelMembership;
exports.confirmCancelMembership = confirmCancelMembership;
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const client_1 = __importDefault(require("../database/client"));
const redis_1 = __importDefault(require("../config/redis"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const generateOTP_1 = require("../services/generateOTP");
const serializeBigInt_1 = require("../services/serializeBigInt");
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
        const existing = await client_1.default.user.findUnique({
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
        await redis_1.default.set(`verify:data:${email}`, JSON.stringify({ email, name, password: hashedPassword }), { EX: 900 });
        /* ---------- GENERATE OTP ---------- */
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await redis_1.default.set(`verify:otp:${email}`, code, { EX: 900 });
        await (0, generateOTP_1.sendEmail)(email, "Account Verification Code", `Your verification code is ${code}. It expires in 15 minutes.`);
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
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: "Email and verification code are required",
            });
        }
        const otpKey = `verify:otp:${email}`;
        const attemptsKey = `verify:otp:attempts:${email}`;
        const storedOtp = await redis_1.default.get(otpKey);
        if (!storedOtp) {
            return res.status(400).json({
                success: false,
                error: "Verification code expired. Please request a new one.",
            });
        }
        let attempts = Number(await redis_1.default.get(attemptsKey)) || 0;
        // Max attempts reached → invalidate OTP
        if (attempts >= 5) {
            await redis_1.default.del(otpKey);
            await redis_1.default.del(attemptsKey);
            await redis_1.default.del(`verify:data:${email}`);
            return res.status(429).json({
                success: false,
                error: "Too many invalid attempts. Verification code expired. Please request a new code.",
            });
        }
        // Wrong OTP → increment attempts
        if (storedOtp !== code) {
            const newAttempts = attempts + 1;
            await redis_1.default.set(attemptsKey, newAttempts.toString(), { EX: 900 });
            return res.status(400).json({
                success: false,
                error: `Invalid verification code. Attempts left: ${5 - newAttempts}`,
            });
        }
        // Correct OTP → proceed with registration
        const tempData = await redis_1.default.get(`verify:data:${email}`);
        if (!tempData) {
            await redis_1.default.del(otpKey);
            await redis_1.default.del(attemptsKey);
            return res.status(400).json({
                success: false,
                error: "Registration session expired. Please try again.",
            });
        }
        const { name, password } = JSON.parse(tempData);
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
            select: {
                defaultGold: true,
                defaultTrustPoints: true,
            },
        });
        if (!config) {
            return res.status(500).json({
                success: false,
                error: "Admin config not found",
            });
        }
        // Find level 1 sword definition
        const levelOneSwordDef = await client_1.default.swordLevelDefinition.findFirst({
            where: { level: 1 },
            select: { id: true, level: true },
        });
        if (!levelOneSwordDef) {
            return res.status(500).json({
                success: false,
                error: "Starter sword definition (level 1) not found",
            });
        }
        const newUser = await client_1.default.$transaction(async (tx) => {
            // Create the user
            const createdUser = await tx.user.create({
                data: {
                    email,
                    name,
                    password,
                    gold: config.defaultGold,
                    trustPoints: config.defaultTrustPoints,
                    lastReviewed: new Date(),
                    lastLoginAt: new Date(),
                },
            });
            // Directly give starter sword (level 1) with quantity 1
            await tx.userSword.upsert({
                where: {
                    userId_swordId: {
                        userId: createdUser.id,
                        swordId: BigInt(levelOneSwordDef.id),
                    },
                },
                update: {
                    unsoldQuantity: { increment: 1 },
                },
                create: {
                    userId: createdUser.id,
                    swordId: BigInt(levelOneSwordDef.id),
                    isOnAnvil: true,
                    unsoldQuantity: 1,
                    soldedQuantity: 0,
                    brokenQuantity: 0,
                },
            });
            // Set as anvil sword
            await tx.user.update({
                where: { id: createdUser.id },
                data: { anvilSwordLevel: BigInt(levelOneSwordDef.id) },
            });
            return createdUser;
        });
        // Cleanup Redis
        await redis_1.default.del(`verify:otp:${email}`);
        await redis_1.default.del(`verify:otp:attempts:${email}`);
        await redis_1.default.del(`verify:data:${email}`);
        // Create JWT session
        const jti = (0, uuid_1.v4)();
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id.toString(), jti }, process.env.JWT_SECRET, { expiresIn: "2h" });
        await redis_1.default.set(`session:${jti}`, newUser.id.toString(), {
            EX: 60 * 60 * 2,
        });
        return res.json({
            success: true,
            message: "Registration successful! Welcome to the game. You received a starter sword (Level 1) and it has been placed on your anvil.",
            token,
            data: (0, serializeBigInt_1.serializeBigInt)(newUser),
        });
    }
    catch (err) {
        console.error("verifyRegistration error:", err);
        return res.status(500).json({
            success: false,
            error: "Registration failed. Please try again later.",
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
        const user = await client_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials or email not verified",
            });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid credentials" });
        }
        const jti = (0, uuid_1.v4)();
        const token = jsonwebtoken_1.default.sign({ userId: user.id.toString(), jti }, process.env.JWT_SECRET, { expiresIn: "2h" });
        await redis_1.default.set(`session:${jti}`, user.id.toString(), { EX: 60 * 60 * 2 }); // 120 minutes
        await client_1.default.user.update({
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
        const user = await client_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await redis_1.default.set(`reset:${email}`, code, { EX: 900 }); // 15 minutes expiry
        await (0, generateOTP_1.sendEmail)(email, "Password Reset Code", `Your password reset code is: ${code}. It expires in 15 minutes.`);
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
            return res.status(400).json({
                success: false,
                error: "Email, code, and new password are required",
            });
        }
        const otpKey = `reset:${email}`;
        const attemptsKey = `reset:attempts:${email}`;
        const storedCode = await redis_1.default.get(otpKey);
        if (!storedCode) {
            return res.status(400).json({
                success: false,
                error: "Reset code expired. Please request a new one.",
            });
        }
        let attempts = Number(await redis_1.default.get(attemptsKey)) || 0;
        // Max attempts → invalidate
        if (attempts >= 5) {
            await redis_1.default.del(otpKey);
            await redis_1.default.del(attemptsKey);
            return res.status(429).json({
                success: false,
                error: "Too many invalid attempts. Reset code expired. Please request a new code.",
            });
        }
        // Wrong code → increment
        if (storedCode !== code) {
            const newAttempts = attempts + 1;
            await redis_1.default.set(attemptsKey, newAttempts.toString(), { EX: 900 });
            return res.status(400).json({
                success: false,
                error: `Invalid reset code. Attempts left: ${5 - newAttempts}`,
            });
        }
        // Correct code → reset password
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(newPassword, salt);
        await client_1.default.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        // Cleanup
        await redis_1.default.del(otpKey);
        await redis_1.default.del(attemptsKey);
        return res.json({
            success: true,
            message: "Password has been reset successfully. Please login.",
        });
    }
    catch (err) {
        console.error("resetPassword error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to reset password. Please try again.",
        });
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
        if (payload?.jti) {
            await redis_1.default.del(`session:${payload.jti}`);
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
async function googleLogin(req, res) {
    try {
        const { idToken, os, isDev } = req.body;
        const clientId = isDev === "true"
            ? process.env.DEV_GOOGLE_WEB_CLIENT_ID
            : process.env.GOOGLE_WEB_CLIENT_ID;
        const googleClient = new google_auth_library_1.OAuth2Client(clientId);
        if (!idToken) {
            return res.status(400).json({
                success: false,
                error: "Google ID token is required",
            });
        }
        // 1️⃣ Verify token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: clientId,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(400).json({
                success: false,
                error: "Invalid Google token",
            });
        }
        const { email, name } = payload;
        // 2️⃣ Check if user exists
        let user = await client_1.default.user.findUnique({
            where: { email },
        });
        // 3️⃣ If not exists → create user + give starter sword directly
        if (!user) {
            const config = await client_1.default.adminConfig.findUnique({
                where: { id: BigInt(1) },
            });
            if (!config) {
                return res.status(500).json({
                    success: false,
                    error: "Admin config not found",
                });
            }
            const levelOneSwordDef = await client_1.default.swordLevelDefinition.findFirst({
                where: { level: 1 },
                select: { id: true, level: true },
            });
            if (!levelOneSwordDef) {
                return res.status(500).json({
                    success: false,
                    error: "Starter sword definition (level 1) not found",
                });
            }
            user = await client_1.default.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email,
                        name: name?.toLowerCase().replace(/\s/g, "") || "googleuser",
                        password: "", // No password for Google
                        gold: config.defaultGold ?? 0,
                        trustPoints: config.defaultTrustPoints ?? 0,
                        lastReviewed: new Date(),
                        lastLoginAt: new Date(),
                    },
                });
                // Directly give starter sword (level 1) with quantity 1
                await tx.userSword.upsert({
                    where: {
                        userId_swordId: {
                            userId: newUser.id,
                            swordId: BigInt(levelOneSwordDef.id),
                        },
                    },
                    update: {
                        unsoldQuantity: { increment: 1 },
                    },
                    create: {
                        userId: newUser.id,
                        swordId: BigInt(levelOneSwordDef.id),
                        isOnAnvil: true,
                        unsoldQuantity: 1,
                        soldedQuantity: 0,
                        brokenQuantity: 0,
                    },
                });
                // Set as anvil sword
                await tx.user.update({
                    where: { id: newUser.id },
                    data: { anvilSwordLevel: BigInt(levelOneSwordDef.id) },
                });
                return newUser;
            });
        }
        // 4️⃣ Create JWT session
        const jti = (0, uuid_1.v4)();
        const token = jsonwebtoken_1.default.sign({ userId: user.id.toString(), jti }, process.env.JWT_SECRET, { expiresIn: "2h" });
        await redis_1.default.set(`session:${jti}`, user.id.toString(), { EX: 60 * 60 * 2 });
        return res.json({
            success: true,
            token,
            data: {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
            },
            message: user.createdAt.getTime() === user.lastLoginAt?.getTime()
                ? "Welcome! You received a starter sword (Level 1) placed on your anvil."
                : "Login successful!",
        });
    }
    catch (err) {
        console.error("Google login error:", err);
        return res.status(400).json({
            success: false,
            error: "Google authentication failed",
        });
    }
}
//  Request Cancel Membership → Send OTP to user's email
async function requestCancelMembership(req, res) {
    try {
        const userId = BigInt(req.user.userId); // from JWT via userAuth middleware
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Send email
        await (0, generateOTP_1.sendEmail)(user.email, "Account Deletion Request - OTP", `Hello ${user.name},\n\nYou requested to delete your account.\n\nYour confirmation OTP is: **${otp}**\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nFor security, this action cannot be undone.`);
        const otpKey = `cancel:otp:${user.email}`;
        const attemptsKey = `cancel:otp:attempts:${user.email}`;
        // Save OTP (15 min expiry)
        await redis_1.default.set(otpKey, otp, { EX: 900 });
        // Reset attempts
        await redis_1.default.set(attemptsKey, "0", { EX: 900 });
        return res.json({
            success: true,
            message: "OTP sent to your registered email for account deletion confirmation",
        });
    }
    catch (err) {
        console.error("requestCancelMembership error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to send OTP. Please try again later.",
        });
    }
}
//  Confirm Cancel Membership → Verify OTP & Delete Account
async function confirmCancelMembership(req, res) {
    try {
        const userId = BigInt(req.user.userId);
        const { otp } = req.body;
        if (!otp) {
            return res.status(400).json({
                success: false,
                error: "OTP code is required",
            });
        }
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        const otpKey = `cancel:otp:${user.email}`;
        const attemptsKey = `cancel:otp:attempts:${user.email}`;
        const storedOtp = await redis_1.default.get(otpKey);
        if (!storedOtp) {
            return res.status(400).json({
                success: false,
                error: "OTP expired or invalid. Please request a new one.",
            });
        }
        let attempts = Number(await redis_1.default.get(attemptsKey)) || 0;
        // Too many failed attempts
        if (attempts >= 5) {
            await redis_1.default.del(otpKey);
            await redis_1.default.del(attemptsKey);
            return res.status(429).json({
                success: false,
                error: "Too many invalid attempts. OTP expired. Please request a new code.",
            });
        }
        // Wrong OTP
        if (storedOtp !== otp) {
            const newAttempts = attempts + 1;
            await redis_1.default.set(attemptsKey, newAttempts.toString(), { EX: 900 });
            return res.status(400).json({
                success: false,
                error: `Invalid OTP. Attempts left: ${5 - newAttempts}`,
            });
        }
        // Correct OTP → Proceed with full account deletion
        await client_1.default.$transaction(async (tx) => {
            // Because we set onDelete: Cascade on almost all relations,
            // deleting the user will automatically delete:
            // - AdRewardSession
            // - SwordSynthesisHistory
            // - SwordUpgradeHistory
            // - UserSword (including anvil)
            // - UserVoucher
            // - UserMaterial
            // - UserGift (+ UserGiftItem via cascade)
            // - SwordMarketplacePurchase
            // - MaterialMarketplacePurchase
            // - ShieldMarketplacePurchase
            // - CustomerSupport
            await tx.user.delete({
                where: { id: userId },
            });
        });
        // Invalidate current session
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            try {
                const payload = jsonwebtoken_1.default.decode(token);
                if (payload?.jti) {
                    await redis_1.default.del(`session:${payload.jti}`);
                }
            }
            catch (e) {
                // silent fail
            }
        }
        // Cleanup OTP data
        await redis_1.default.del(otpKey);
        await redis_1.default.del(attemptsKey);
        return res.json({
            success: true,
            message: "Your account and all associated data have been permanently deleted. You have been logged out.",
        });
    }
    catch (err) {
        console.error("confirmCancelMembership error:", err);
        if (err.code === "P2025") {
            return res.status(404).json({
                success: false,
                error: "Account not found or already deleted",
            });
        }
        return res.status(500).json({
            success: false,
            error: "Failed to delete account. Please try again or contact support.",
        });
    }
}
//# sourceMappingURL=userAuthController.js.map