"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveUser = resolveUser;
exports.getPagination = getPagination;
exports.userGuard = userGuard;
exports.handleUserError = handleUserError;
const client_ts_1 = __importDefault(require("../database/client.ts"));
async function resolveUser(identifier) {
    if (identifier.id) {
        const user = await client_ts_1.default.user.findUnique({
            where: { id: BigInt(identifier.id) },
        });
        if (!user)
            throw new Error("USER_NOT_FOUND");
        return user;
    }
    if (identifier.email) {
        const user = await client_ts_1.default.user.findUnique({
            where: { email: identifier.email },
        });
        if (!user)
            throw new Error("USER_NOT_FOUND");
        return user;
    }
    throw new Error("IDENTIFIER_REQUIRED");
}
function getPagination(query) {
    const limit = query.limit ? Number(query.limit) : 20;
    const page = query.page ? Number(query.page) : 1;
    if (page <= 0)
        return null;
    return {
        take: limit,
        skip: (page - 1) * limit,
        page,
        limit,
    };
}
async function userGuard(userId) {
    const user = await client_ts_1.default.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("USER_NOT_FOUND");
    if (user.isBanned)
        throw new Error("USER_BANNED");
    return user;
}
function handleUserError(err, res) {
    console.error("User action error:", err);
    if (err.message === "USER_NOT_FOUND") {
        return res.status(404).json({ success: false, error: "User not found" });
    }
    if (err.message === "USER_BANNED") {
        return res
            .status(403)
            .json({
            success: false,
            error: "Account is banned. Actions restricted.",
        });
    }
    if (err.message.includes("INSUFFICIENT_GOLD")) {
        return res
            .status(400)
            .json({ success: false, error: "Insufficient gold balance" });
    }
    if (err.message.includes("INVALID_AMOUNT")) {
        return res
            .status(400)
            .json({ success: false, error: "Amount out of allowed range" });
    }
    if (err.message.includes("ITEM_NOT_FOUND")) {
        return res
            .status(404)
            .json({ success: false, error: "Item not found or inactive" });
    }
    if (err.message.includes("NOT_ON_ANVIL")) {
        return res
            .status(400)
            .json({ success: false, error: "Sword must be on anvil to upgrade" });
    }
    return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
}
//# sourceMappingURL=queryHelpers.js.map