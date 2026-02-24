"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimOneTimeMission = exports.claimDailyMission = exports.verifyAdSession = exports.createAdSession = exports.toggleShieldProtection = exports.claimGift = exports.synthesizeSword = exports.upgradeSword = exports.removeSwordFromAnvil = exports.setSwordOnAnvil = exports.sellMaterial = exports.sellSword = exports.deleteComplaint = exports.updateComplaint = exports.createComplaint = exports.cancelVoucher = exports.removeAllowedUserFromVoucher = exports.assignAllowedUserToVoucher = exports.createVoucher = void 0;
exports.buySword = buySword;
exports.buyMaterial = buyMaterial;
exports.buyShields = buyShields;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../database/client"));
const generateCode_1 = require("../services/generateCode");
const queryHelpers_1 = require("../services/queryHelpers");
const client_2 = require("@prisma/client");
const serializeBigInt_1 = require("../services/serializeBigInt");
// 1) Create Voucher (User creates a voucher by locking gold)
const createVoucher = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { goldAmount } = req.body;
        if (!goldAmount || typeof goldAmount !== "number" || goldAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: "goldAmount must be a positive number",
            });
        }
        const amount = Math.floor(goldAmount);
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
            select: { minVoucherGold: true, maxVoucherGold: true },
        });
        if (!config) {
            return res.status(500).json({
                success: false,
                error: "Admin configuration not found",
            });
        }
        if (amount < config.minVoucherGold || amount > config.maxVoucherGold) {
            return res.status(400).json({
                success: false,
                error: `Voucher amount must be between ${config.minVoucherGold} and ${config.maxVoucherGold}`,
            });
        }
        let voucher;
        // Retry loop for unique code
        for (let attempt = 0; attempt < 10; attempt++) {
            const code = (0, generateCode_1.generateSecureCode)(16); // increase entropy
            try {
                voucher = await client_1.default.$transaction(async (tx) => {
                    //  Always check balance inside transaction (race-safe)
                    const user = await (0, queryHelpers_1.userGuard)(userId);
                    if (!user || user.gold < amount) {
                        throw new Error("Insufficient gold balance");
                    }
                    // Deduct gold
                    await tx.user.update({
                        where: { id: userId },
                        data: {
                            gold: { decrement: amount },
                        },
                    });
                    // Create voucher
                    return tx.userVoucher.create({
                        data: {
                            code,
                            createdById: userId,
                            allowedUserId: null, // initially null
                            goldAmount: amount,
                            status: client_2.VoucherStatus.PENDING,
                        },
                    });
                });
                break; // success
            }
            catch (err) {
                if (err.code === "P2002") {
                    // Code collision → retry
                    continue;
                }
                throw err;
            }
        }
        if (!voucher) {
            return res.status(500).json({
                success: false,
                error: "Failed to generate unique voucher code after retries",
            });
        }
        return res.json({
            success: true,
            message: "Voucher created successfully.",
            data: (0, serializeBigInt_1.serializeBigInt)(voucher),
        });
    }
    catch (err) {
        console.error("Creating voucher error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.createVoucher = createVoucher;
// 2)
const assignAllowedUserToVoucher = async (req, res) => {
    try {
        const creatorId = BigInt(req.user.userId);
        const { voucherId, allowedEmail } = req.body;
        if (!voucherId || isNaN(Number(voucherId))) {
            return res.status(400).json({
                success: false,
                error: "Valid voucher ID required",
            });
        }
        if (!allowedEmail) {
            return res.status(400).json({
                success: false,
                error: "Valid allowedEmail required",
            });
        }
        const normalizedEmail = allowedEmail.trim().toLowerCase();
        // 🔥 Validate creator
        await (0, queryHelpers_1.userGuard)(creatorId);
        // 🔥 Find voucher
        const voucher = await client_1.default.userVoucher.findUnique({
            where: { id: BigInt(voucherId) },
        });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                error: "Voucher not found",
            });
        }
        // 🔥 Ownership check
        if (voucher.createdById !== creatorId) {
            return res.status(403).json({
                success: false,
                error: "You can only assign your own vouchers",
            });
        }
        // 🔥 Must be pending
        if (voucher.status !== client_2.VoucherStatus.PENDING) {
            return res.status(400).json({
                success: false,
                error: "Only pending vouchers can be assigned",
            });
        }
        // 🔥 Expiry check (if enabled)
        // if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        //   return res.status(400).json({
        //     success: false,
        //     error: "Voucher has expired",
        //   });
        // }
        // 🔥 Find allowed user by email
        const allowedUser = await client_1.default.user.findUnique({
            where: { email: normalizedEmail },
        });
        if (!allowedUser) {
            return res.status(404).json({
                success: false,
                error: "Allowed user not found",
            });
        }
        // 🔥 Check allowed user banned
        if (allowedUser.isBanned) {
            return res.status(400).json({
                success: false,
                error: "Allowed user is banned",
            });
        }
        // 🔥 Prevent self-assign
        if (allowedUser.id === creatorId) {
            return res.status(400).json({
                success: false,
                error: "You cannot assign voucher to yourself",
            });
        }
        // 🔥 Atomic update
        await client_1.default.userVoucher.update({
            where: {
                id: BigInt(voucherId),
                status: client_2.VoucherStatus.PENDING, // prevents race condition
            },
            data: {
                allowedUserId: allowedUser.id,
            },
        });
        return res.json({
            success: true,
            message: "Voucher successfully assigned to user",
        });
    }
    catch (err) {
        console.error("Assign voucher error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.assignAllowedUserToVoucher = assignAllowedUserToVoucher;
// 3)
const removeAllowedUserFromVoucher = async (req, res) => {
    try {
        const creatorId = BigInt(req.user.userId);
        const { voucherId } = req.body;
        if (!voucherId || isNaN(Number(voucherId))) {
            return res.status(400).json({
                success: false,
                error: "Valid voucher ID required",
            });
        }
        await (0, queryHelpers_1.userGuard)(creatorId);
        const voucher = await client_1.default.userVoucher.findUnique({
            where: { id: BigInt(voucherId) },
            select: {
                createdById: true,
                status: true,
                allowedUserId: true,
            },
        });
        if (!voucher) {
            return res.status(404).json({
                success: false,
                error: "Voucher not found",
            });
        }
        if (voucher.createdById !== creatorId) {
            return res.status(403).json({
                success: false,
                error: "You can only modify your own vouchers",
            });
        }
        if (voucher.status !== client_2.VoucherStatus.PENDING) {
            return res.status(400).json({
                success: false,
                error: "Only PENDING vouchers can have their assigned user removed",
            });
        }
        if (!voucher.allowedUserId) {
            return res.status(400).json({
                success: false,
                error: "No user is currently assigned to this voucher",
            });
        }
        // Remove assignment
        await client_1.default.userVoucher.update({
            where: { id: BigInt(voucherId) },
            data: {
                allowedUserId: null,
            },
        });
        return res.json({
            success: true,
            message: "Assigned user removed. Voucher is now redeemable by you.",
        });
    }
    catch (err) {
        console.error("Remove allowed user error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Failed to remove assigned user",
        });
    }
};
exports.removeAllowedUserFromVoucher = removeAllowedUserFromVoucher;
// 4) Cancel Voucher (refund gold if pending)
const cancelVoucher = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        await (0, queryHelpers_1.userGuard)(userId);
        const { voucherId } = req.body;
        if (!voucherId || isNaN(Number(voucherId))) {
            return res.status(400).json({
                success: false,
                error: "Valid voucher ID required",
            });
        }
        const voucher = await client_1.default.userVoucher.findUnique({
            where: { id: BigInt(voucherId) },
            select: {
                createdById: true,
                goldAmount: true,
                status: true,
            },
        });
        if (!voucher) {
            return res
                .status(404)
                .json({ success: false, error: "Voucher not found" });
        }
        if (voucher.createdById !== userId) {
            return res.status(403).json({
                success: false,
                error: "You can only cancel your own vouchers",
            });
        }
        if (voucher.status !== client_2.VoucherStatus.PENDING) {
            return res.status(400).json({
                success: false,
                error: "Only pending vouchers can be cancelled",
            });
        }
        await client_1.default.$transaction(async (tx) => {
            // Refund gold
            await tx.user.update({
                where: { id: userId },
                data: { gold: { increment: voucher.goldAmount } },
            });
            // Cancel voucher
            await tx.userVoucher.update({
                where: { id: BigInt(voucherId) },
                data: {
                    status: client_2.VoucherStatus.CANCELLED,
                    updatedAt: new Date(),
                },
            });
        });
        return res.json({
            success: true,
            message: "Voucher cancelled successfully. Gold refunded.",
        });
    }
    catch (err) {
        console.error("Cancelling voucher error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.cancelVoucher = cancelVoucher;
// 5) Create Customer Support Complaint(no check for the user ban here)
const createComplaint = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { title, content, message, category = client_2.SupportCategory.OTHER, priority = client_2.SupportPriority.NORMAL, } = req.body;
        // Basic validation
        if (!title || typeof title !== "string" || title.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: "Title must be at least 5 characters",
            });
        }
        if (!content || typeof content !== "string" || content.trim().length < 5) {
            return res.status(400).json({
                success: false,
                error: "Content must be at least 5 characters",
            });
        }
        if (!message || typeof message !== "string" || message.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: "Message must be at least 10 characters",
            });
        }
        // Validate category & priority enums
        if (!Object.values(client_2.SupportCategory).includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Allowed: ${Object.values(client_2.SupportCategory).join(", ")}`,
            });
        }
        if (!Object.values(client_2.SupportPriority).includes(priority)) {
            return res.status(400).json({
                success: false,
                error: `Invalid priority. Allowed: ${Object.values(client_2.SupportPriority).join(", ")}`,
            });
        }
        const complaint = await client_1.default.customerSupport.create({
            data: {
                userId,
                title: title.trim(),
                content: content.trim(),
                message: message.trim(),
                category,
                priority,
            },
        });
        return res.json({
            success: true,
            message: "Complaint submitted successfully. We'll review it soon.",
            data: (0, serializeBigInt_1.serializeBigInt)(complaint),
        });
    }
    catch (err) {
        console.error("Create Complaint error:", err);
        return res
            .status(400)
            .json({ success: false, error: err.message || "Internal server error" });
    }
};
exports.createComplaint = createComplaint;
// 6) Update Complaint (only if not reviewed)
const updateComplaint = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { complaintId, title, content, message } = req.body;
        if (!complaintId || isNaN(Number(complaintId))) {
            return res.status(400).json({
                success: false,
                error: "Valid complaint ID required",
            });
        }
        if (!title && !content && !message) {
            return res.status(400).json({
                success: false,
                error: "Provide at least one field to update (title, content, or message)",
            });
        }
        // Validate lengths if provided
        if (title && (typeof title !== "string" || title.trim().length < 5)) {
            return res.status(400).json({
                success: false,
                error: "Title must be at least 5 characters if provided",
            });
        }
        if (content && (typeof content !== "string" || content.trim().length < 5)) {
            return res.status(400).json({
                success: false,
                error: "Content must be at least 5 characters if provided",
            });
        }
        if (message &&
            (typeof message !== "string" || message.trim().length < 10)) {
            return res.status(400).json({
                success: false,
                error: "Message must be at least 10 characters if provided",
            });
        }
        const updated = await client_1.default.$transaction(async (tx) => {
            const complaint = await tx.customerSupport.findUnique({
                where: { id: BigInt(complaintId) },
            });
            if (!complaint) {
                throw new Error("Complaint not found");
            }
            if (complaint.userId !== userId) {
                throw new Error("Not your complaint");
            }
            if (complaint.isReviewed) {
                throw new Error("Complaint is already reviewed");
            }
            return tx.customerSupport.update({
                where: { id: BigInt(complaintId) },
                data: {
                    title: title ? title.trim() : complaint.title,
                    content: content ? content.trim() : complaint.content,
                    message: message ? message.trim() : complaint.message,
                    updatedAt: new Date(),
                },
                select: {
                    id: true,
                    title: true,
                    content: true,
                    message: true,
                    updatedAt: true,
                    isReviewed: true,
                },
            });
        });
        return res.json({
            success: true,
            message: "Complaint updated successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(updated),
        });
    }
    catch (err) {
        console.error("Update Complaint error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.updateComplaint = updateComplaint;
// 7) Delete Complaint (only if not reviewed)
const deleteComplaint = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { complaintId } = req.body;
        if (!complaintId || isNaN(Number(complaintId))) {
            return res.status(400).json({
                success: false,
                error: "Valid complaint ID required",
            });
        }
        await client_1.default.$transaction(async (tx) => {
            const complaint = await tx.customerSupport.findUnique({
                where: { id: BigInt(complaintId) },
                select: {
                    userId: true,
                    isReviewed: true,
                },
            });
            if (!complaint) {
                throw new Error("Complaint not found");
            }
            if (complaint.userId !== userId) {
                throw new Error("Not your complaint");
            }
            if (complaint.isReviewed) {
                throw new Error("Complaint is already reviewed");
            }
            await tx.customerSupport.delete({
                where: { id: BigInt(complaintId) },
            });
        });
        return res.json({
            success: true,
            message: "Complaint deleted successfully",
        });
    }
    catch (err) {
        console.error("Delete Complaint error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.deleteComplaint = deleteComplaint;
// 8) Buy Sword from Marketplace (with quantity)
async function buySword(req, res) {
    try {
        const userId = BigInt(req.user.userId);
        const { swordLevelDefinitionId, quantity } = req.body;
        if (!swordLevelDefinitionId || !quantity) {
            return res.status(400).json({
                success: false,
                error: "swordLevelDefinitionId and quantity are required",
            });
        }
        const swordDefId = BigInt(swordLevelDefinitionId);
        const qty = Number(quantity);
        if (qty <= 0 || !Number.isInteger(qty)) {
            return res.status(400).json({
                success: false,
                error: "Quantity must be a positive integer",
            });
        }
        // User guard
        const user = await (0, queryHelpers_1.userGuard)(userId);
        // Fetch sword definition
        const swordDefinition = await client_1.default.swordLevelDefinition.findUnique({
            where: { id: swordDefId },
            select: {
                id: true,
                level: true,
                buyingCost: true,
                isBuyingAllow: true,
            },
        });
        if (!swordDefinition) {
            return res.status(404).json({
                success: false,
                error: "Sword not found",
            });
        }
        // Check if buying is allowed
        if (!swordDefinition.isBuyingAllow) {
            return res.status(400).json({
                success: false,
                error: "This sword is not available for purchase now",
            });
        }
        const pricePerUnit = swordDefinition.buyingCost;
        const totalPrice = pricePerUnit * qty;
        // Check sufficient gold
        if (user.gold < totalPrice) {
            return res.status(400).json({
                success: false,
                error: "Insufficient gold to buy this quantity",
            });
        }
        let purchaseRecord;
        await client_1.default.$transaction(async (tx) => {
            // Deduct gold
            await tx.user.update({
                where: { id: userId },
                data: { gold: { decrement: totalPrice } },
            });
            // Upsert UserSword (add to unsoldQuantity)
            await tx.userSword.upsert({
                where: {
                    userId_swordId: { userId, swordId: swordDefId },
                },
                update: { unsoldQuantity: { increment: qty } },
                create: {
                    userId,
                    swordId: swordDefId,
                    isOnAnvil: false,
                    unsoldQuantity: qty,
                    soldedQuantity: 0,
                    brokenQuantity: 0,
                },
            });
            // Create purchase record
            purchaseRecord = await tx.swordMarketplacePurchase.create({
                data: {
                    userId,
                    swordLevelDefinitionId: swordDefId,
                    quantity: qty,
                    priceGold: totalPrice,
                },
            });
        });
        return res.json({
            success: true,
            message: "Sword purchased successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(purchaseRecord),
        });
    }
    catch (err) {
        console.error("buySword error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
}
// 8) Buy Material from Marketplace (with quantity)
async function buyMaterial(req, res) {
    try {
        const userId = BigInt(req.user.userId);
        const { materialId, quantity } = req.body;
        if (!materialId || !quantity) {
            return res.status(400).json({
                success: false,
                error: "materialId and quantity are required",
            });
        }
        const matId = BigInt(materialId);
        const qty = Number(quantity);
        if (qty <= 0 || !Number.isInteger(qty)) {
            return res.status(400).json({
                success: false,
                error: "Quantity must be a positive integer",
            });
        }
        // User guard
        const user = await (0, queryHelpers_1.userGuard)(userId);
        // Fetch material
        const material = await client_1.default.material.findUnique({
            where: { id: matId },
            select: {
                id: true,
                buyingCost: true,
                isBuyingAllow: true,
            },
        });
        if (!material) {
            return res.status(404).json({
                success: false,
                error: "Material not found",
            });
        }
        // Check if buying is allowed
        if (!material.isBuyingAllow) {
            return res.status(400).json({
                success: false,
                error: "This material is not available for purchase",
            });
        }
        const pricePerUnit = material.buyingCost;
        const totalPrice = pricePerUnit * qty;
        // Check sufficient gold
        if (user.gold < totalPrice) {
            return res.status(400).json({
                success: false,
                error: "Insufficient gold to buy this quantity",
            });
        }
        let purchaseRecord;
        await client_1.default.$transaction(async (tx) => {
            // Deduct gold
            await tx.user.update({
                where: { id: userId },
                data: { gold: { decrement: totalPrice } },
            });
            // Upsert UserMaterial (add to unsoldQuantity)
            await tx.userMaterial.upsert({
                where: {
                    userId_materialId: { userId, materialId: matId },
                },
                update: { unsoldQuantity: { increment: qty } },
                create: {
                    userId,
                    materialId: matId,
                    unsoldQuantity: qty,
                    soldedQuantity: 0,
                },
            });
            // Create purchase record
            purchaseRecord = await tx.materialMarketplacePurchase.create({
                data: {
                    userId,
                    materialId: matId,
                    quantity: qty,
                    priceGold: totalPrice,
                },
            });
        });
        return res.json({
            success: true,
            message: "Material purchased successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(purchaseRecord),
        });
    }
    catch (err) {
        console.error("buyMaterial error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
}
// 9) Buy Shields from Marketplace (with quantity)
async function buyShields(req, res) {
    try {
        const userId = BigInt(req.user.userId);
        const { quantity } = req.body;
        if (!quantity) {
            return res.status(400).json({
                success: false,
                error: "quantity is required",
            });
        }
        const qty = Number(quantity);
        if (qty <= 0 || !Number.isInteger(qty)) {
            return res.status(400).json({
                success: false,
                error: "Quantity must be a positive integer",
            });
        }
        // User guard
        const user = await (0, queryHelpers_1.userGuard)(userId);
        // Fetch admin config for shields
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
            select: {
                shieldGoldPrice: true,
                maxShieldHold: true,
                shieldActiveOnMarketplace: true,
            },
        });
        if (!config) {
            return res.status(500).json({
                success: false,
                error: "Admin configuration not found",
            });
        }
        // Check if shields are active for purchase
        if (!config.shieldActiveOnMarketplace) {
            return res.status(400).json({
                success: false,
                error: "Shields are not available for purchase at this time",
            });
        }
        const pricePerShield = config.shieldGoldPrice;
        const totalPrice = pricePerShield * qty;
        // Check sufficient gold
        if (user.gold < totalPrice) {
            return res.status(400).json({
                success: false,
                error: "Insufficient gold to buy this quantity",
            });
        }
        // Check max hold limit (if maxShieldHold > 0)
        if (config.maxShieldHold > 0 &&
            user.totalShields + qty > config.maxShieldHold) {
            return res.status(400).json({
                success: false,
                error: `Cannot exceed maximum shield hold limit of ${config.maxShieldHold}`,
            });
        }
        let purchaseRecord;
        await client_1.default.$transaction(async (tx) => {
            // Deduct gold
            await tx.user.update({
                where: { id: userId },
                data: { gold: { decrement: totalPrice } },
            });
            // Increment totalShields
            await tx.user.update({
                where: { id: userId },
                data: { totalShields: { increment: qty } },
            });
            // Create purchase record
            purchaseRecord = await tx.shieldMarketplacePurchase.create({
                data: {
                    userId,
                    quantity: qty,
                    priceGold: totalPrice,
                },
            });
        });
        return res.json({
            success: true,
            message: "Shields purchased successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(purchaseRecord),
        });
    }
    catch (err) {
        console.error("buy Shields error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
}
// 10) Sell Sword (quantity sword)
const sellSword = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { swordId, quantity } = req.body; // swordId here means swordLevelDefinitionId
        if (!swordId || !quantity) {
            return res.status(400).json({
                success: false,
                error: "swordId (level) and quantity are required",
            });
        }
        const swordDefId = BigInt(swordId);
        const qty = Number(quantity);
        if (qty <= 0 || !Number.isInteger(qty)) {
            return res.status(400).json({
                success: false,
                error: "Quantity must be a positive integer",
            });
        }
        // User guard: checks user exists and not banned
        await (0, queryHelpers_1.userGuard)(userId);
        // Fetch user's sword ownership + definition
        const userSword = await client_1.default.userSword.findUnique({
            where: {
                userId_swordId: { userId, swordId: swordDefId },
            },
            include: {
                swordLevelDefinition: {
                    select: {
                        level: true,
                        sellingCost: true,
                        isSellingAllow: true,
                    },
                },
            },
        });
        if (!userSword) {
            return res.status(404).json({
                success: false,
                error: "You do not own any swords of this level",
            });
        }
        // Check if selling is allowed for this sword level
        if (!userSword.swordLevelDefinition.isSellingAllow) {
            return res.status(400).json({
                success: false,
                error: "Selling is not allowed for this sword level",
            });
        }
        // Check sufficient unsold quantity
        if (userSword.unsoldQuantity < qty) {
            return res.status(400).json({
                success: false,
                error: `Insufficient unsold quantity (you have ${userSword.unsoldQuantity})`,
            });
        }
        const pricePerUnit = userSword.swordLevelDefinition.sellingCost;
        const goldToAdd = pricePerUnit * qty;
        await client_1.default.$transaction(async (tx) => {
            // Update UserSword: reduce unsold, increase sold
            await tx.userSword.update({
                where: {
                    userId_swordId: { userId, swordId: swordDefId },
                },
                data: {
                    unsoldQuantity: { decrement: qty },
                    soldedQuantity: { increment: qty },
                    // If on anvil and we're selling the last one, clear anvil (optional safety)
                    ...(userSword.isOnAnvil && userSword.unsoldQuantity === qty
                        ? { isOnAnvil: false }
                        : {}),
                },
            });
            // If anvil sword was this level and now zero unsold → clear anvilSwordLevel
            if (userSword.isOnAnvil && userSword.unsoldQuantity === qty) {
                await tx.user.update({
                    where: { id: userId },
                    data: { anvilSwordLevel: null },
                });
            }
            // Add gold to user
            await tx.user.update({
                where: { id: userId },
                data: { gold: { increment: goldToAdd } },
            });
            // Create sell history record
            await tx.swordSellHistory.create({
                data: {
                    userId,
                    swordLevelDefinitionId: swordDefId,
                    quantity: qty,
                    priceGold: goldToAdd,
                    soldAt: new Date(),
                },
            });
        });
        return res.json({
            success: true,
            message: "Sword sold successfully",
            goldAdded: goldToAdd,
            quantitySold: qty,
        });
    }
    catch (err) {
        console.error("sellSword error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.sellSword = sellSword;
// 11) Sell Material (with quantity)
const sellMaterial = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { materialId, quantity } = req.body;
        if (!materialId || !quantity) {
            return res.status(400).json({
                success: false,
                error: "materialId and quantity are required",
            });
        }
        const matId = BigInt(materialId);
        const qty = Number(quantity);
        if (qty <= 0 || !Number.isInteger(qty)) {
            return res.status(400).json({
                success: false,
                error: "Quantity must be a positive integer",
            });
        }
        // User guard: checks user exists and not banned
        await (0, queryHelpers_1.userGuard)(userId);
        // Fetch user material with material definition
        const userMaterial = await client_1.default.userMaterial.findUnique({
            where: {
                userId_materialId: { userId, materialId: matId },
            },
            include: {
                material: {
                    select: {
                        sellingCost: true,
                        isSellingAllow: true,
                    },
                },
            },
        });
        if (!userMaterial) {
            return res.status(404).json({
                success: false,
                error: "You do not have this material",
            });
        }
        // Check if selling is allowed for this material
        if (!userMaterial.material.isSellingAllow) {
            return res.status(400).json({
                success: false,
                error: "Selling is not allowed for this material",
            });
        }
        // Check sufficient unsold quantity
        if (userMaterial.unsoldQuantity < qty) {
            return res.status(400).json({
                success: false,
                error: `Insufficient unsold quantity (you have ${userMaterial.unsoldQuantity})`,
            });
        }
        const pricePerUnit = userMaterial.material.sellingCost;
        const goldToAdd = pricePerUnit * qty;
        await client_1.default.$transaction(async (tx) => {
            // Update UserMaterial: reduce unsold, increase sold
            await tx.userMaterial.update({
                where: {
                    userId_materialId: { userId, materialId: matId },
                },
                data: {
                    unsoldQuantity: { decrement: qty },
                    soldedQuantity: { increment: qty },
                },
            });
            // Add gold to user
            await tx.user.update({
                where: { id: userId },
                data: { gold: { increment: goldToAdd } },
            });
            // Create sell history record
            await tx.materialSellHistory.create({
                data: {
                    userId,
                    materialId: matId,
                    quantity: qty,
                    priceGold: goldToAdd,
                    soldAt: new Date(),
                },
            });
        });
        return res.json({
            success: true,
            message: "Material sold successfully",
            goldAdded: goldToAdd,
            quantitySold: qty,
        });
    }
    catch (err) {
        console.error("sell material error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.sellMaterial = sellMaterial;
// 12) Set Sword on Anvil (only if not already on anvil, not broken, not sold, user not banned)
const setSwordOnAnvil = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { swordId } = req.body; // swordId here means swordLevelDefinitionId (level)
        if (!swordId || isNaN(Number(swordId))) {
            return res.status(400).json({
                success: false,
                error: "Valid sword level ID required",
            });
        }
        const swordDefId = BigInt(swordId);
        // User guard: checks user exists and not banned
        const user = await (0, queryHelpers_1.userGuard)(userId);
        // Fetch user's ownership of this sword level
        const userSword = await client_1.default.userSword.findUnique({
            where: {
                userId_swordId: { userId, swordId: swordDefId },
            },
            select: {
                userId: true,
                unsoldQuantity: true,
                isOnAnvil: true,
            },
        });
        if (!userSword) {
            return res.status(404).json({
                success: false,
                error: "You do not own any swords of this level",
            });
        }
        // Cannot place on anvil if already on anvil
        if (userSword.isOnAnvil) {
            return res.status(400).json({
                success: false,
                error: "This sword level is already on the anvil",
            });
        }
        // New rule: Must have at least 1 unsold sword
        if (userSword.unsoldQuantity < 1) {
            return res.status(400).json({
                success: false,
                error: "You must have at least one unsold sword of this level to place on anvil",
            });
        }
        await client_1.default.$transaction(async (tx) => {
            // Remove current anvil sword if any (clear old one)
            if (user.anvilSwordLevel) {
                await tx.userSword.update({
                    where: {
                        userId_swordId: { userId, swordId: user.anvilSwordLevel },
                    },
                    data: { isOnAnvil: false },
                });
            }
            // Set new sword on anvil
            await tx.userSword.update({
                where: {
                    userId_swordId: { userId, swordId: swordDefId },
                },
                data: { isOnAnvil: true },
            });
            // Update user's anvil reference (now stores level, not individual sword ID)
            await tx.user.update({
                where: { id: userId },
                data: { anvilSwordLevel: swordDefId },
            });
        });
        return res.json({
            success: true,
            message: "Sword successfully placed on anvil",
        });
    }
    catch (err) {
        console.error("setSwordOnAnvil error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.setSwordOnAnvil = setSwordOnAnvil;
// 13) Remove Sword from Anvil (only if it is currently on anvil)
const removeSwordFromAnvil = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        // User guard
        const user = await (0, queryHelpers_1.userGuard)(userId);
        // Check if there is any sword on anvil at all
        if (!user.anvilSwordLevel) {
            return res.status(400).json({
                success: false,
                error: "No sword is currently on the anvil",
            });
        }
        // Verify the sword level exists and belongs to user
        const userSword = await client_1.default.userSword.findUnique({
            where: {
                userId_swordId: { userId, swordId: user.anvilSwordLevel },
            },
            select: {
                userId: true,
                isOnAnvil: true,
                swordId: true,
            },
        });
        if (!userSword) {
            return res.status(404).json({
                success: false,
                error: "Anvil sword not found in your inventory",
            });
        }
        if (userSword.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: "You do not own this sword",
            });
        }
        // Ensure it is actually on the anvil
        if (!userSword.isOnAnvil) {
            return res.status(400).json({
                success: false,
                error: "This sword level is not currently on the anvil",
            });
        }
        await client_1.default.$transaction(async (tx) => {
            // Remove from anvil
            await tx.userSword.update({
                where: {
                    userId_swordId: { userId, swordId: user.anvilSwordLevel },
                },
                data: { isOnAnvil: false },
            });
            // Clear user's anvil reference
            await tx.user.update({
                where: { id: userId },
                data: { anvilSwordLevel: null },
            });
        });
        return res.json({
            success: true,
            message: "Sword successfully removed from anvil and placed back in inventory",
            swordLevel: user.anvilSwordLevel.toString(),
        });
    }
    catch (err) {
        console.error("removeSwordFromAnvil error:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.removeSwordFromAnvil = removeSwordFromAnvil;
// 14) Upgrade Sword (with shield protection, 4 cases, random byproduct on break + history record)
const upgradeSword = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { swordId } = req.body; // swordId here means swordLevelDefinitionId (level)
        if (!swordId || isNaN(Number(swordId))) {
            return res.status(400).json({
                success: false,
                error: "Valid sword level ID required",
            });
        }
        const currentLevelId = BigInt(swordId);
        // User guard
        const user = await (0, queryHelpers_1.userGuard)(userId);
        // Fetch current sword level ownership
        const currentSword = await client_1.default.userSword.findUnique({
            where: {
                userId_swordId: { userId, swordId: currentLevelId },
            },
            include: {
                swordLevelDefinition: {
                    select: {
                        id: true,
                        level: true,
                        upgradeCost: true,
                        successRate: true,
                    },
                },
            },
        });
        if (!currentSword) {
            return res.status(404).json({
                success: false,
                error: "You do not own any swords of this level",
            });
        }
        // Must have at least 1 unsold to upgrade
        if (currentSword.unsoldQuantity < 1) {
            return res.status(400).json({
                success: false,
                error: "You need at least 1 unsold sword of this level to upgrade",
            });
        }
        // Must be on anvil
        if (!currentSword.isOnAnvil) {
            return res.status(400).json({
                success: false,
                error: "Sword must be on anvil to upgrade",
            });
        }
        // Max level check
        if (currentSword.swordLevelDefinition.level >= 100) {
            return res.status(400).json({
                success: false,
                error: "Sword has reached maximum level (100)",
            });
        }
        const upgradeCost = currentSword.swordLevelDefinition.upgradeCost;
        if (user.gold < upgradeCost) {
            return res.status(400).json({
                success: false,
                error: "Insufficient gold for upgrade",
            });
        }
        const successRate = currentSword.swordLevelDefinition.successRate / 100;
        const randomChance = Math.random();
        let result = {};
        let historyData = {
            userId,
            fromSwordLevelId: currentSword.swordLevelDefinition.id,
            success: false,
            goldSpent: upgradeCost,
        };
        await client_1.default.$transaction(async (tx) => {
            // Always deduct cost
            await tx.user.update({
                where: { id: userId },
                data: { gold: { decrement: upgradeCost } },
            });
            // Success case
            if (randomChance <= successRate) {
                const nextLevel = currentSword.swordLevelDefinition.level + 1;
                const nextDef = await tx.swordLevelDefinition.findUnique({
                    where: { level: nextLevel },
                    select: { id: true },
                });
                if (!nextDef) {
                    throw new Error("Next level definition not found");
                }
                if (user.isShieldOn) {
                    if (user.totalShields < 1) {
                        throw new Error("Shield protection is on but no shields available");
                    }
                    await tx.user.update({
                        where: { id: userId },
                        data: { totalShields: { decrement: 1 } },
                    });
                }
                // Consume 1 from current level
                await tx.userSword.update({
                    where: { userId_swordId: { userId, swordId: currentLevelId } },
                    data: { unsoldQuantity: { decrement: 1 } },
                });
                // Add 1 to next level (upsert)
                await tx.userSword.upsert({
                    where: { userId_swordId: { userId, swordId: BigInt(nextDef.id) } },
                    update: { unsoldQuantity: { increment: 1 } },
                    create: {
                        userId,
                        swordId: BigInt(nextDef.id),
                        isOnAnvil: false,
                        unsoldQuantity: 1,
                        soldedQuantity: 0,
                        brokenQuantity: 0,
                    },
                });
                // Always move anvil to the next level after success
                // 1. Clear old anvil status (previous level)
                await tx.userSword.update({
                    where: { userId_swordId: { userId, swordId: currentLevelId } },
                    data: { isOnAnvil: false },
                });
                // 2. Set anvil to next level
                await tx.user.update({
                    where: { id: userId },
                    data: { anvilSwordLevel: BigInt(nextDef.id) },
                });
                await tx.userSword.update({
                    where: { userId_swordId: { userId, swordId: BigInt(nextDef.id) } },
                    data: { isOnAnvil: true },
                });
                historyData.toSwordLevelId = nextDef.id;
                historyData.success = true;
                result = {
                    type: "success",
                    message: `Upgrade successful! Sword upgraded to level ${nextLevel}`,
                    newLevel: nextLevel,
                };
            }
            // Failure case
            else {
                if (user.isShieldOn) {
                    // Shield protects → consume shield, no damage
                    if (user.totalShields < 1) {
                        throw new Error("Shield protection is on but no shields available");
                    }
                    await tx.user.update({
                        where: { id: userId },
                        data: { totalShields: { decrement: 1 } },
                    });
                    result = {
                        type: "protected_failure",
                        message: "Upgrade failed, but shield protected the sword!",
                        shieldConsumed: true,
                        swordBroken: false,
                    };
                }
                else {
                    // Decrease unsold, increase broken
                    await tx.userSword.update({
                        where: { userId_swordId: { userId, swordId: currentLevelId } },
                        data: {
                            unsoldQuantity: { decrement: 1 },
                            brokenQuantity: { increment: 1 },
                        },
                    });
                    // If this was the last unsold and on anvil → clear anvil
                    const updated = await tx.userSword.findUnique({
                        where: { userId_swordId: { userId, swordId: currentLevelId } },
                        select: { unsoldQuantity: true },
                    });
                    if (updated?.unsoldQuantity === 0) {
                        await tx.user.update({
                            where: { id: userId },
                            data: { anvilSwordLevel: null },
                        });
                    }
                    // Give random byproduct (same as before)
                    const drops = await tx.swordUpgradeDrop.findMany({
                        where: {
                            swordLevelDefinitionId: currentSword.swordLevelDefinition.id,
                        },
                        select: {
                            materialId: true,
                            dropPercentage: true,
                            minQuantity: true,
                            maxQuantity: true,
                        },
                    });
                    if (drops.length === 0) {
                        throw new Error("No drop materials defined for this sword level");
                    }
                    let randomDrop = Math.random() * 100;
                    let selectedDrop = drops[0];
                    let cumulative = 0;
                    for (const drop of drops) {
                        cumulative += drop.dropPercentage;
                        if (randomDrop <= cumulative) {
                            selectedDrop = drop;
                            break;
                        }
                    }
                    const qty = Math.floor(Math.random() *
                        (selectedDrop.maxQuantity - selectedDrop.minQuantity + 1)) + selectedDrop.minQuantity;
                    await tx.userMaterial.upsert({
                        where: {
                            userId_materialId: {
                                userId,
                                materialId: selectedDrop.materialId,
                            },
                        },
                        update: { unsoldQuantity: { increment: qty } },
                        create: {
                            userId,
                            materialId: selectedDrop.materialId,
                            unsoldQuantity: qty,
                            soldedQuantity: 0,
                        },
                    });
                    historyData.droppedMaterialId = selectedDrop.materialId;
                    historyData.droppedQuantity = qty;
                    result = {
                        type: "broken_failure",
                        message: "Upgrade failed! Sword broke, but received random material as byproduct.",
                        swordBroken: true,
                        shieldConsumed: false,
                        byproduct: { materialId: selectedDrop.materialId, quantity: qty },
                    };
                }
            }
            // Always record history
            await tx.swordUpgradeHistory.create({
                data: historyData,
            });
        });
        return res.json({
            success: true,
            message: result.message,
            data: (0, serializeBigInt_1.serializeBigInt)(result),
        });
    }
    catch (err) {
        console.error("upgradeSword error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error during upgrade",
        });
    }
};
exports.upgradeSword = upgradeSword;
// 15) Sword Synthesis (Consume exact required materials, guarantee 1 new sword + record history)
const synthesizeSword = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { swordLevelDefinitionId } = req.body;
        if (!swordLevelDefinitionId || isNaN(Number(swordLevelDefinitionId))) {
            return res.status(400).json({
                success: false,
                error: "swordLevelDefinitionId is required and must be a valid number",
            });
        }
        const targetLevelId = BigInt(swordLevelDefinitionId);
        // User guard: checks user exists and not banned
        const user = await (0, queryHelpers_1.userGuard)(userId);
        // Fetch target sword level definition
        const targetLevel = await client_1.default.swordLevelDefinition.findUnique({
            where: { id: targetLevelId },
            select: {
                id: true,
                level: true,
                synthesizeCost: true,
                isSynthesizeAllow: true,
            },
        });
        if (!targetLevel) {
            return res.status(404).json({
                success: false,
                error: "Target sword level not found",
            });
        }
        // Check if synthesis is allowed for this level
        if (!targetLevel.isSynthesizeAllow) {
            return res.status(400).json({
                success: false,
                error: "Synthesis is not allowed for this sword level",
            });
        }
        // Check sufficient gold
        if (user.gold < targetLevel.synthesizeCost) {
            return res.status(400).json({
                success: false,
                error: `Insufficient gold. Required: ${targetLevel.synthesizeCost}, You have: ${user.gold}`,
            });
        }
        // Fetch required materials for this level
        const requiredMaterials = await client_1.default.swordSynthesisRequirement.findMany({
            where: { swordLevelDefinitionId: targetLevelId },
            include: {
                material: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (requiredMaterials.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No synthesis requirements defined for this sword level",
            });
        }
        // Check user has enough unsold quantity for each required material
        for (const reqMat of requiredMaterials) {
            const userMat = await client_1.default.userMaterial.findUnique({
                where: {
                    userId_materialId: { userId, materialId: reqMat.materialId },
                },
                select: { unsoldQuantity: true },
            });
            if (!userMat || userMat.unsoldQuantity < reqMat.requiredQuantity) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient ${reqMat.material.name}. Required: ${reqMat.requiredQuantity}, You have: ${userMat?.unsoldQuantity ?? 0}`,
                });
            }
        }
        let historyRecord;
        await client_1.default.$transaction(async (tx) => {
            // Deduct synthesize cost
            await tx.user.update({
                where: { id: userId },
                data: { gold: { decrement: targetLevel.synthesizeCost } },
            });
            // Consume required materials
            for (const reqMat of requiredMaterials) {
                await tx.userMaterial.update({
                    where: {
                        userId_materialId: { userId, materialId: reqMat.materialId },
                    },
                    data: {
                        unsoldQuantity: { decrement: reqMat.requiredQuantity },
                    },
                });
            }
            // Upsert: create new sword entry or increment unsoldQuantity if already owned
            await tx.userSword.upsert({
                where: {
                    userId_swordId: {
                        userId,
                        swordId: targetLevel.id, // swordId references SwordLevelDefinition.id
                    },
                },
                update: {
                    unsoldQuantity: { increment: 1 },
                },
                create: {
                    userId,
                    swordId: targetLevel.id,
                    isOnAnvil: false,
                    unsoldQuantity: 1,
                    soldedQuantity: 0,
                    brokenQuantity: 0,
                },
            });
            // Record synthesis history
            historyRecord = await tx.swordSynthesisHistory.create({
                data: {
                    userId,
                    swordLevelDefinitionId: targetLevel.id,
                    goldSpent: targetLevel.synthesizeCost,
                },
            });
        });
        return res.json({
            success: true,
            message: `Synthesis successful! You crafted a Level ${targetLevel.level} sword.`,
            history: (0, serializeBigInt_1.serializeBigInt)(historyRecord),
        });
    }
    catch (err) {
        if (err.message === "INSUFFICIENT_GOLD") {
            return res.status(400).json({
                success: false,
                error: "Not enough gold to synthesize",
            });
        }
        console.error("synthesizeSword error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Internal server error",
        });
    }
};
exports.synthesizeSword = synthesizeSword;
// 16) gift claim endpoint
const claimGift = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { giftId } = req.body;
        if (!giftId) {
            return res.status(400).json({ success: false, error: "giftId required" });
        }
        await client_1.default.$transaction(async (tx) => {
            // Fetch the gift with direct content fields
            const gift = await tx.userGift.findUnique({
                where: { id: BigInt(giftId) },
                include: {
                    material: true, // if MATERIAL
                    swordLevelDefinition: true, // if SWORD
                },
            });
            if (!gift)
                throw new Error("Gift not found");
            if (gift.receiverId !== userId)
                throw new Error("Not your gift");
            if (gift.status === client_2.GiftStatus.CLAIMED)
                throw new Error("Gift was already claimed");
            if (gift.status === client_2.GiftStatus.CANCELLED)
                throw new Error("Gift was cancelled by admin");
            // Handle reward based on gift type (only one type per gift)
            switch (gift.type) {
                case client_2.GiftItemType.GOLD:
                    if (gift.amount && gift.amount > 0) {
                        await tx.user.update({
                            where: { id: userId },
                            data: { gold: { increment: gift.amount } },
                        });
                    }
                    break;
                case client_2.GiftItemType.TRUST_POINTS:
                    if (gift.amount && gift.amount > 0) {
                        await tx.user.update({
                            where: { id: userId },
                            data: { trustPoints: { increment: gift.amount } },
                        });
                    }
                    break;
                case client_2.GiftItemType.SHIELD:
                    if (gift.amount && gift.amount > 0) {
                        await tx.user.update({
                            where: { id: userId },
                            data: { totalShields: { increment: gift.amount } },
                        });
                    }
                    break;
                case client_2.GiftItemType.MATERIAL:
                    if (gift.materialId &&
                        gift.materialQuantity &&
                        gift.materialQuantity > 0) {
                        await tx.userMaterial.upsert({
                            where: {
                                userId_materialId: { userId, materialId: gift.materialId },
                            },
                            update: {
                                unsoldQuantity: { increment: gift.materialQuantity },
                            },
                            create: {
                                userId,
                                materialId: gift.materialId,
                                unsoldQuantity: gift.materialQuantity,
                                soldedQuantity: 0,
                            },
                        });
                    }
                    break;
                case client_2.GiftItemType.SWORD:
                    if (gift.swordId && gift.swordQuantity && gift.swordQuantity > 0) {
                        // swordId is the level (Int/BigInt)
                        const def = await tx.swordLevelDefinition.findUnique({
                            where: { level: Number(gift.swordId) }, // level is Int
                        });
                        if (!def)
                            throw new Error("Invalid sword level in gift");
                        await tx.userSword.upsert({
                            where: {
                                userId_swordId: { userId, swordId: BigInt(gift.swordId) },
                            },
                            update: {
                                unsoldQuantity: { increment: gift.swordQuantity },
                            },
                            create: {
                                userId,
                                swordId: BigInt(gift.swordId),
                                isOnAnvil: false,
                                unsoldQuantity: gift.swordQuantity,
                                soldedQuantity: 0,
                                brokenQuantity: 0,
                            },
                        });
                    }
                    break;
                default:
                    throw new Error("Unsupported gift type");
            }
            // Mark gift as claimed
            await tx.userGift.update({
                where: { id: BigInt(giftId) },
                data: {
                    status: client_2.GiftStatus.CLAIMED,
                    claimedAt: new Date(),
                },
            });
        });
        return res.json({
            success: true,
            message: "Gift claimed successfully",
        });
    }
    catch (err) {
        console.error("Claim gift Error: ", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Failed to claim gift",
        });
    }
};
exports.claimGift = claimGift;
// 17) toggle the shiled protection
// userActionController.ts
const toggleShieldProtection = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const user = await (0, queryHelpers_1.userGuard)(userId);
        const updated = await client_1.default.user.update({
            where: { id: userId },
            data: { isShieldOn: !user.isShieldOn },
            select: { isShieldOn: true },
        });
        return res.json({
            success: true,
            isShieldOn: updated.isShieldOn,
        });
    }
    catch (err) {
        console.error("Toggle shiled protection Error:", err);
        return res
            .status(400)
            .json({ success: false, error: err.message || "Internal server Error" });
    }
};
exports.toggleShieldProtection = toggleShieldProtection;
// 18) Start Session (Authenticated)
const createAdSession = async (req, res) => {
    try {
        const { rewardType } = req.body;
        const userId = BigInt(req.user.userId);
        if (!["GOLD", "OLD_SWORD", "SHIELD"].includes(rewardType)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid reward type" });
        }
        // Check limits from AdminConfig and User
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
        });
        const user = await client_1.default.user.findUnique({ where: { id: userId } });
        if (!config || !user) {
            return res
                .status(400)
                .json({ success: false, error: "Config or user not found" });
        }
        if (rewardType === client_2.AdRewardType.SHIELD) {
            if (user.oneDayShieldAdsViewed >= config.maxDailyShieldAds) {
                return res
                    .status(400)
                    .json({ success: false, error: "Daily shield ad limit reached" });
            }
            if (user.totalShields >= config.maxShieldHold) {
                return res
                    .status(400)
                    .json({ success: false, error: "Max shields held" });
            }
        }
        else if (rewardType === client_2.AdRewardType.GOLD) {
            if (user.oneDayGoldAdsViewed >= config.maxDailyGoldAds) {
                return res
                    .status(400)
                    .json({ success: false, error: "Daily gold ad limit reached" });
            }
        }
        else if (rewardType === client_2.AdRewardType.OLD_SWORD) {
            if (user.oneDaySwordAdsViewed >= config.maxDailySwordAds) {
                return res
                    .status(400)
                    .json({ success: false, error: "Daily sword ad limit reached" });
            }
        }
        else {
            return res
                .status(400)
                .json({ success: false, error: "Invalid Ad request type" });
        }
        const nonce = crypto_1.default.randomBytes(32).toString("hex");
        await client_1.default.adRewardSession.create({
            data: {
                userId,
                nonce,
                rewardType,
                rewarded: false,
            },
        });
        res.json({ success: true, nonce, userId: userId.toString() });
    }
    catch (err) {
        console.error("Create add Error:", err);
        return res
            .status(400)
            .json({ success: false, error: err.message || "Internal server Error" });
    }
};
exports.createAdSession = createAdSession;
// 19) Claim Reward (Authenticated)
const verifyAdSession = async (req, res) => {
    try {
        const { nonce } = req.body;
        const userId = BigInt(req.user.userId);
        // CLEANUP expired sessions (15 minutes old)
        await client_1.default.adRewardSession.deleteMany({
            where: {
                createdAt: {
                    lt: new Date(Date.now() - 15 * 60 * 1000),
                },
            },
        });
        const session = await client_1.default.adRewardSession.findUnique({
            where: { nonce },
        });
        if (!session ||
            session.userId !== userId ||
            session.rewarded !== true || // SSV Admob verification
            session.rewardedAt !== null) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid or unverified session" });
        }
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
        });
        if (!config) {
            return res
                .status(400)
                .json({ success: false, error: "Config not found" });
        }
        // Grant reward
        switch (session.rewardType) {
            case client_2.AdRewardType.GOLD:
                await client_1.default.user.update({
                    where: { id: userId },
                    data: {
                        gold: { increment: config.goldReward },
                        oneDayGoldAdsViewed: { increment: 1 },
                        totalAdsViewed: { increment: 1 },
                    },
                });
                break;
            case client_2.AdRewardType.OLD_SWORD:
                // Find the reward sword definition
                const swordDef = await client_1.default.swordLevelDefinition.findUnique({
                    where: { level: config.swordLevelReward },
                });
                if (!swordDef) {
                    throw new Error("Sword definition not found for reward level");
                }
                // Upsert: create if not exists, or increment unsoldQuantity if already owned
                await client_1.default.userSword.upsert({
                    where: {
                        userId_swordId: {
                            userId,
                            swordId: BigInt(swordDef.id), // swordId = level
                        },
                    },
                    update: {
                        unsoldQuantity: { increment: 1 },
                    },
                    create: {
                        userId,
                        swordId: BigInt(swordDef.level),
                        isOnAnvil: false,
                        unsoldQuantity: 1,
                        soldedQuantity: 0,
                        brokenQuantity: 0,
                    },
                });
                // Update ad view counters
                await client_1.default.user.update({
                    where: { id: userId },
                    data: {
                        oneDaySwordAdsViewed: { increment: 1 },
                        totalAdsViewed: { increment: 1 },
                    },
                });
                break;
            case client_2.AdRewardType.SHIELD:
                await client_1.default.user.update({
                    where: { id: userId },
                    data: {
                        totalShields: { increment: 1 },
                        oneDayShieldAdsViewed: { increment: 1 },
                        totalAdsViewed: { increment: 1 },
                    },
                });
                break;
        }
        // Delete the session after successful reward
        await client_1.default.adRewardSession.delete({
            where: { nonce },
        });
        res.json({ success: true, rewardType: session.rewardType });
    }
    catch (err) {
        console.error("verifyAdSession Error:", err);
        return res
            .status(400)
            .json({ success: false, error: err.message || "Internal server error" });
    }
};
exports.verifyAdSession = verifyAdSession;
// 20) daily missions claim
const claimDailyMission = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { missionId } = req.body;
        if (!missionId || isNaN(Number(missionId))) {
            return res.status(400).json({
                success: false,
                error: "Valid missionId is required",
            });
        }
        const missionIdBig = BigInt(missionId);
        const result = await client_1.default.$transaction(async (tx) => {
            // 1. Fetch mission definition
            const mission = await tx.dailyMissionDefinition.findUnique({
                where: { id: missionIdBig },
                select: {
                    id: true,
                    title: true,
                    isActive: true,
                    conditions: true,
                    targetValue: true,
                    reward: true,
                },
            });
            if (!mission) {
                throw new Error("Mission not found");
            }
            if (!mission.isActive) {
                throw new Error("This mission is no longer active");
            }
            // 2. Validate "completeAllAds" condition and get adType
            let adType;
            try {
                const conditions = mission.conditions;
                if (!Array.isArray(conditions) || conditions.length === 0) {
                    throw new Error("Mission has no valid conditions");
                }
                const adCondition = conditions.find((c) => c?.type === "completeAllAds" && c?.adType);
                if (!adCondition) {
                    throw new Error(`Mission does not contain a valid "completeAllAds" condition. ` +
                        `Found: ${JSON.stringify(conditions)}`);
                }
                adType = adCondition.adType;
                if (!["GOLD", "SHIELD", "OLD_SWORD"].includes(adType)) {
                    throw new Error(`Unsupported ad type: ${adType}`);
                }
            }
            catch (parseErr) {
                console.error("Condition parse error:", parseErr, {
                    missionId,
                    conditions: mission.conditions,
                });
                throw new Error("Invalid mission configuration");
            }
            // 3. Fetch user ad views + admin config
            const [user, config] = await Promise.all([
                tx.user.findUnique({
                    where: { id: userId },
                    select: {
                        oneDayGoldAdsViewed: true,
                        oneDayShieldAdsViewed: true,
                        oneDaySwordAdsViewed: true,
                    },
                }),
                tx.adminConfig.findUnique({
                    where: { id: BigInt(1) },
                    select: {
                        maxDailyGoldAds: true,
                        maxDailyShieldAds: true,
                        maxDailySwordAds: true,
                    },
                }),
            ]);
            if (!user)
                throw new Error("User not found");
            if (!config)
                throw new Error("Server configuration missing");
            // 4. Check if already claimed today
            const progress = await tx.userDailyMissionProgress.findUnique({
                where: {
                    userId_missionId: { userId, missionId: missionIdBig },
                },
            });
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            if (progress?.lastClaimedAt &&
                new Date(progress.lastClaimedAt) >= todayStart) {
                throw new Error("You have already claimed this mission today");
            }
            // 5. Validate ad completion
            let eligible = false;
            switch (adType) {
                case "GOLD":
                    eligible = user.oneDayGoldAdsViewed >= config.maxDailyGoldAds;
                    break;
                case "SHIELD":
                    eligible = user.oneDayShieldAdsViewed >= config.maxDailyShieldAds;
                    break;
                case "OLD_SWORD":
                    eligible = user.oneDaySwordAdsViewed >= config.maxDailySwordAds;
                    break;
            }
            if (!eligible) {
                throw new Error("You have not completed the required ads yet");
            }
            // 6. Grant reward (now supports quantity for swords)
            const reward = mission.reward;
            let rewardMessage = "";
            switch (reward?.type) {
                case "gold":
                    if (typeof reward.amount !== "number" || reward.amount <= 0) {
                        throw new Error("Invalid gold reward amount");
                    }
                    await tx.user.update({
                        where: { id: userId },
                        data: { gold: { increment: reward.amount } },
                    });
                    rewardMessage = `${reward.amount} gold`;
                    break;
                case "trustPoints":
                    if (typeof reward.amount !== "number" || reward.amount <= 0) {
                        throw new Error("Invalid trust points reward amount");
                    }
                    await tx.user.update({
                        where: { id: userId },
                        data: { trustPoints: { increment: reward.amount } },
                    });
                    rewardMessage = `${reward.amount} trust points`;
                    break;
                case "shield":
                    if (typeof reward.quantity !== "number" || reward.quantity <= 0) {
                        throw new Error("Invalid shield reward quantity");
                    }
                    await tx.user.update({
                        where: { id: userId },
                        data: { totalShields: { increment: reward.quantity } },
                    });
                    rewardMessage = `${reward.quantity} shield${reward.quantity > 1 ? "s" : ""}`;
                    break;
                case "sword":
                    if (typeof reward.level !== "number" ||
                        reward.level < 1 ||
                        typeof reward.quantity !== "number" ||
                        reward.quantity < 1) {
                        throw new Error("Invalid sword reward: level and quantity required");
                    }
                    const swordDef = await tx.swordLevelDefinition.findUnique({
                        where: { level: reward.level },
                    });
                    if (!swordDef) {
                        throw new Error(`Sword level ${reward.level} not found`);
                    }
                    await tx.userSword.upsert({
                        where: {
                            userId_swordId: { userId, swordId: swordDef.id },
                        },
                        update: {
                            unsoldQuantity: { increment: reward.quantity },
                        },
                        create: {
                            userId,
                            swordId: swordDef.id,
                            isOnAnvil: false,
                            unsoldQuantity: reward.quantity,
                            soldedQuantity: 0,
                            brokenQuantity: 0,
                        },
                    });
                    rewardMessage = `${reward.quantity} × ${swordDef.name} (Lv ${reward.level})`;
                    break;
                case "material":
                    if (typeof reward.materialId !== "number" ||
                        typeof reward.quantity !== "number" ||
                        reward.quantity <= 0) {
                        throw new Error("Invalid material reward data");
                    }
                    await tx.userMaterial.upsert({
                        where: {
                            userId_materialId: {
                                userId,
                                materialId: BigInt(reward.materialId),
                            },
                        },
                        update: {
                            unsoldQuantity: { increment: reward.quantity },
                        },
                        create: {
                            userId,
                            materialId: BigInt(reward.materialId),
                            unsoldQuantity: reward.quantity,
                            soldedQuantity: 0,
                        },
                    });
                    rewardMessage = `${reward.quantity} × material ID ${reward.materialId}`;
                    break;
                default:
                    throw new Error(`Unsupported reward type: ${reward?.type}`);
            }
            // 7. Update user mission counter
            await tx.user.update({
                where: { id: userId },
                data: {
                    totalMissionsDone: { increment: 1 },
                },
            });
            // 8. Record / update progress
            if (progress) {
                await tx.userDailyMissionProgress.update({
                    where: { userId_missionId: { userId, missionId: missionIdBig } },
                    data: {
                        claimedTimes: { increment: 1 },
                        lastClaimedAt: now,
                    },
                });
            }
            else {
                await tx.userDailyMissionProgress.create({
                    data: {
                        userId,
                        missionId: missionIdBig,
                        claimedTimes: 1,
                        lastClaimedAt: now,
                    },
                });
            }
            return {
                success: true,
                message: `Daily mission claimed successfully! Reward: ${rewardMessage}`,
            };
        });
        return res.json(result);
    }
    catch (err) {
        console.error("claimDailyMission error:", {
            userId: req.user?.userId,
            missionId: req.body?.missionId,
            error: err.message,
            stack: err.stack,
        });
        const status = err.message?.includes("not found") ||
            err.message?.includes("already claimed") ||
            err.message?.includes("Invalid")
            ? 400
            : 500;
        return res.status(status).json({
            success: false,
            error: err.message || "Failed to claim daily mission",
        });
    }
};
exports.claimDailyMission = claimDailyMission;
// 21) one time missions claim
const claimOneTimeMission = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { missionId } = req.body;
        if (!missionId || isNaN(Number(missionId))) {
            return res.status(400).json({
                success: false,
                error: "Valid missionId required",
            });
        }
        await client_1.default.$transaction(async (tx) => {
            // 1. Fetch mission
            const mission = await tx.oneTimeMissionDefinition.findUnique({
                where: { id: BigInt(missionId) },
            });
            if (!mission || !mission.isActive) {
                throw new Error("Mission not active");
            }
            const now = new Date();
            // 2. Check time window
            if (mission.startAt > now) {
                throw new Error("Mission not started yet");
            }
            if (mission.expiresAt && mission.expiresAt < now) {
                throw new Error("Mission expired");
            }
            // 3. Check already claimed
            const existing = await tx.userOneTimeMissionProgress.findUnique({
                where: {
                    userId_missionId: {
                        userId,
                        missionId: BigInt(missionId),
                    },
                },
            });
            if (existing) {
                throw new Error("Mission already claimed");
            }
            const conditions = mission.conditions;
            const targetValue = mission.targetValue;
            let totalProgress = 0;
            const dateFilter = {
                gte: mission.startAt,
                ...(mission.expiresAt && { lte: mission.expiresAt }),
            };
            for (const cond of conditions) {
                switch (cond.type) {
                    case "buySword": {
                        const count = await tx.swordMarketplacePurchase.count({
                            where: {
                                userId,
                                purchasedAt: dateFilter,
                                ...(cond.level && {
                                    swordLevelDefinition: {
                                        level: cond.level,
                                    },
                                }),
                            },
                        });
                        totalProgress += count;
                        break;
                    }
                    case "buyMaterial": {
                        const count = await tx.materialMarketplacePurchase.aggregate({
                            where: {
                                userId,
                                purchasedAt: dateFilter,
                                ...(cond.materialId && {
                                    materialId: BigInt(cond.materialId),
                                }),
                            },
                            _sum: {
                                quantity: true,
                            },
                        });
                        totalProgress += Number(count._sum.quantity || 0);
                        break;
                    }
                    case "buyShield": {
                        const count = await tx.shieldMarketplacePurchase.aggregate({
                            where: {
                                userId,
                                purchasedAt: dateFilter,
                            },
                            _sum: {
                                quantity: true,
                            },
                        });
                        totalProgress += Number(count._sum.quantity || 0);
                        break;
                    }
                    case "upgradeSword": {
                        const count = await tx.swordUpgradeHistory.count({
                            where: {
                                userId,
                                createdAt: dateFilter,
                                ...(cond.level && {
                                    toSwordLevelDefinition: {
                                        level: cond.level,
                                    },
                                }),
                            },
                        });
                        totalProgress += count;
                        break;
                    }
                    case "synthesize": {
                        const count = await tx.swordSynthesisHistory.count({
                            where: {
                                userId,
                                createdAt: dateFilter,
                                ...(cond.level && {
                                    swordLevelDefinition: {
                                        level: cond.level,
                                    },
                                }),
                            },
                        });
                        totalProgress += count;
                        break;
                    }
                    default:
                        throw new Error(`Unsupported mission condition: ${cond.type}`);
                }
            }
            // 4. Check completion
            if (totalProgress < targetValue) {
                throw new Error(`Mission not completed. Progress: ${totalProgress}/${targetValue}`);
            }
            // 5. Grant reward
            const reward = mission.reward;
            switch (reward.type) {
                case "gold":
                    await tx.user.update({
                        where: { id: userId },
                        data: { gold: { increment: reward.amount } },
                    });
                    break;
                case "trustPoints":
                    await tx.user.update({
                        where: { id: userId },
                        data: { trustPoints: { increment: reward.amount } },
                    });
                    break;
                case "shield":
                    await tx.user.update({
                        where: { id: userId },
                        data: { totalShields: { increment: reward.quantity } },
                    });
                    break;
                case "sword": {
                    const def = await tx.swordLevelDefinition.findUnique({
                        where: { level: reward.level },
                    });
                    if (!def)
                        throw new Error("Invalid sword reward");
                    await tx.userSword.upsert({
                        where: {
                            userId_swordId: { userId, swordId: BigInt(reward.level) },
                        },
                        update: {
                            unsoldQuantity: { increment: 1 },
                        },
                        create: {
                            userId,
                            swordId: BigInt(reward.level),
                            isOnAnvil: false,
                            unsoldQuantity: 1,
                            soldedQuantity: 0,
                            brokenQuantity: 0,
                        },
                    });
                    break;
                }
                case "material":
                    await tx.userMaterial.upsert({
                        where: {
                            userId_materialId: {
                                userId,
                                materialId: BigInt(reward.materialId),
                            },
                        },
                        update: {
                            unsoldQuantity: { increment: reward.quantity },
                        },
                        create: {
                            userId,
                            materialId: BigInt(reward.materialId),
                            unsoldQuantity: reward.quantity,
                            soldedQuantity: 0,
                        },
                    });
                    break;
                default:
                    throw new Error("Invalid reward type");
            }
            // 6. Update mission counters
            await tx.user.update({
                where: { id: userId },
                data: {
                    totalMissionsDone: { increment: 1 },
                },
            });
            // 7. Mark claimed
            await tx.userOneTimeMissionProgress.create({
                data: {
                    userId,
                    missionId: BigInt(missionId),
                    claimedAt: new Date(),
                },
            });
        });
        return res.json({
            success: true,
            message: "One-time mission claimed successfully",
        });
    }
    catch (err) {
        console.error("Claim one-time mission error:", err);
        return res.status(400).json({
            success: false,
            error: err.message || "Failed to claim mission",
        });
    }
};
exports.claimOneTimeMission = claimOneTimeMission;
//# sourceMappingURL=userActionController.js.map