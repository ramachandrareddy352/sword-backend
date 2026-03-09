"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemVoucherFromShopping = redeemVoucherFromShopping;
const shoppingTool_1 = require("../services/shoppingTool");
const client_1 = __importDefault(require("../database/client"));
const serializeBigInt_1 = require("../services/serializeBigInt");
const client_2 = require("@prisma/client");
async function redeemVoucherFromShopping(req, res) {
    try {
        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ success: false, error: "Missing payload" });
        }
        // decode request
        const decoded = (0, shoppingTool_1.decodePayload)(data);
        const { email, voucherCode, expiry, nonce } = decoded;
        if (!email || !voucherCode || !expiry || !nonce) {
            return res.status(400).json({ success: false, error: "Invalid payload" });
        }
        // expiry check
        if (Date.now() > new Date(expiry).getTime()) {
            return res.status(400).json({
                success: false,
                error: "Request expired",
            });
        }
        const voucher = await client_1.default.userVoucher.findUnique({
            where: { code: voucherCode },
            include: {
                createdBy: true,
                allowedUser: true,
            },
        });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                error: "Voucher not found",
            });
        }
        if (voucher.status !== client_2.VoucherStatus.PENDING) {
            return res.status(400).json({
                success: false,
                error: "Voucher already used",
            });
        }
        // get user redeeming
        const redeemUser = await client_1.default.user.findUnique({
            where: { email },
        });
        if (!redeemUser) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        // permission check
        const isCreator = voucher.createdBy.email === email;
        const isAllowed = voucher.allowedUser && voucher.allowedUser.email === email;
        if (!isCreator && !isAllowed) {
            return res.status(403).json({
                success: false,
                error: "User not allowed to redeem this voucher",
            });
        }
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
        });
        if (!config?.exchangeRate || config?.exchangeRate <= 0) {
            return res.status(500).json({
                success: false,
                error: "Exchange rate not configured",
            });
        }
        const points = Math.floor(voucher.goldAmount / config.exchangeRate);
        if (points <= 0) {
            return res.status(500).json({
                success: false,
                error: "Point shoule be greater than 0",
            });
        }
        await client_1.default.$transaction(async (tx) => {
            // mark redeemed
            await tx.userVoucher.update({
                where: { id: voucher.id },
                data: {
                    status: client_2.VoucherStatus.REDEEMED,
                    redeemedById: redeemUser.id,
                    updatedAt: new Date(),
                },
            });
            // send acknowledge to shopping backend
            await (0, shoppingTool_1.sendShoppingAck)({
                success: true,
                points,
                nonce,
            });
        });
        return res.json({
            success: true,
            message: "Voucher redeemed successfully",
            data: (0, serializeBigInt_1.serializeBigInt)({
                email,
                voucherCode,
                points,
            }),
        });
    }
    catch (err) {
        console.error("redeemVoucherFromShopping error:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "Voucher redemption failed",
        });
    }
}
//# sourceMappingURL=externalActionController.js.map