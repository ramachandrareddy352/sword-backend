"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserMarketplacePurchases = exports.getUserCustomerSupports = exports.getUserVouchers = exports.getUserGifts = exports.getUserShields = exports.getUserMaterials = exports.getUserSwords = exports.getUserBasicInfo = exports.getUserFullDetails = void 0;
const client_1 = __importDefault(require("../database/client"));
const queryHelpers_1 = require("../services/queryHelpers");
const serializeBigInt_1 = require("../services/serializeBigInt");
// =================== COMMON ROUTES =================== //
// 1) get complete information about the user using his id or email
const getUserFullDetails = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        // Use helper to find user (throws USER_NOT_FOUND if missing)
        const user = await (0, queryHelpers_1.resolveUser)({
            id: undefined,
            email: email ? String(email) : undefined,
        });
        // Core user data (safe fields only)
        const safeUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            gold: user.gold,
            trustPoints: user.trustPoints,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            lastReviewed: user.lastReviewed,
            emailVerified: user.emailVerified,
            oneDayAdsViewed: user.oneDayAdsViewed,
            totalAdsViewed: user.totalAdsViewed,
            totalMissionsDone: user.totalMissionsDone,
            isBanned: user.isBanned,
            anvilSwordId: user.anvilSwordId,
            anvilShieldId: user.anvilShieldId,
            soundOn: user.soundOn,
        };
        // Vouchers
        const vouchers = await client_1.default.userVoucher.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });
        // Swords with level definition
        const swords = await client_1.default.userSword.findMany({
            where: { userId: user.id },
            include: {
                swordLevelDefinition: {
                    select: {
                        level: true,
                        name: true,
                        image: true,
                        description: true,
                        power: true,
                        upgradeCost: true,
                        sellingCost: true,
                        successRate: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        // Materials
        const materials = await client_1.default.userMaterial.findMany({
            where: { userId: user.id },
            include: {
                material: {
                    select: {
                        code: true,
                        name: true,
                        description: true,
                        image: true,
                        cost: true,
                        power: true,
                        rarity: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        // Shields
        const shields = await client_1.default.userShield.findMany({
            where: { userId: user.id },
            include: {
                shield: {
                    select: {
                        code: true,
                        name: true,
                        description: true,
                        image: true,
                        cost: true,
                        power: true,
                        rarity: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        // Gifts + items
        const gifts = await client_1.default.userGift.findMany({
            where: { receiverId: user.id },
            include: {
                items: true, // all fields
            },
            orderBy: { createdAt: "desc" },
        });
        // Marketplace purchases
        const marketplacePurchases = await client_1.default.marketplacePurchase.findMany({
            where: { userId: user.id },
            include: {
                marketplaceItem: {
                    select: {
                        id: true,
                        itemType: true,
                        priceGold: true,
                        isActive: true,
                        isPurchased: true,
                        createdAt: true,
                        updatedAt: true,
                        // Sword — if purchased a sword
                        swordLevelDefinition: {
                            select: {
                                level: true,
                                name: true,
                                image: true,
                                description: true,
                                power: true,
                                upgradeCost: true,
                                sellingCost: true,
                                successRate: true,
                            },
                        },
                        // Material — if purchased a material
                        material: {
                            select: {
                                code: true,
                                name: true,
                                description: true,
                                image: true,
                                cost: true,
                                power: true,
                                rarity: true,
                            },
                        },
                        // Shield — if purchased a shield
                        shieldType: {
                            select: {
                                code: true,
                                name: true,
                                description: true,
                                image: true,
                                cost: true,
                                power: true,
                                rarity: true,
                            },
                        },
                    },
                },
            },
            orderBy: { purchasedAt: "desc" },
        });
        // Customer support tickets
        const customerSupports = await client_1.default.customerSupport.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({
            success: true,
            message: "User data fetched successfully",
            user: (0, serializeBigInt_1.serializeBigInt)(safeUser),
            vouchers: { list: (0, serializeBigInt_1.serializeBigInt)(vouchers), total: vouchers.length },
            swords: { list: (0, serializeBigInt_1.serializeBigInt)(swords), total: swords.length },
            materials: { list: (0, serializeBigInt_1.serializeBigInt)(materials), total: materials.length },
            shields: { list: (0, serializeBigInt_1.serializeBigInt)(shields), total: shields.length },
            gifts: { list: (0, serializeBigInt_1.serializeBigInt)(gifts), total: gifts.length },
            marketplacePurchases: {
                list: (0, serializeBigInt_1.serializeBigInt)(marketplacePurchases),
                total: marketplacePurchases.length,
            },
            customerSupports: {
                list: (0, serializeBigInt_1.serializeBigInt)(customerSupports),
                total: customerSupports.length,
            },
        });
    }
    catch (error) {
        console.error(error);
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        if (error.message === "IDENTIFIER_REQUIRED") {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        console.error("getUserFullDetails error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserFullDetails = getUserFullDetails;
// 2) Returns only main user table fields (no relations)
const getUserBasicInfo = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const user = await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        const safeUser = {
            id: userId,
            email: user.email,
            name: user.name,
            gold: user.gold,
            trustPoints: user.trustPoints,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            lastReviewed: user.lastReviewed,
            emailVerified: user.emailVerified,
            oneDayAdsViewed: user.oneDayAdsViewed,
            totalAdsViewed: user.totalAdsViewed,
            totalMissionsDone: user.totalMissionsDone,
            isBanned: user.isBanned,
            anvilSwordId: user.anvilSwordId,
            anvilShieldId: user.anvilShieldId,
            soundOn: user.soundOn,
        };
        return res.status(200).json({
            success: true,
            message: "Fetched user basic details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(safeUser),
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        console.error(err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserBasicInfo = getUserBasicInfo;
// 3) Only user's swords list + total count
const getUserSwords = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const { sortCreatedAt, sortPower, sortUpgradeCost, sortSellingCost, sortSuccessRate, sold, } = req.query;
        await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        /* ---------------- WHERE ---------------- */
        const where = {
            userId: userId,
        };
        if (sold === "true")
            where.isSolded = true;
        if (sold === "false")
            where.isSolded = false;
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ swordLevelDefinition: { power: sortPower } });
        }
        if (sortUpgradeCost &&
            ["asc", "desc"].includes(sortUpgradeCost)) {
            orderBy.push({
                swordLevelDefinition: { upgradeCost: sortUpgradeCost },
            });
        }
        if (sortSellingCost &&
            ["asc", "desc"].includes(sortSellingCost)) {
            orderBy.push({
                swordLevelDefinition: { sellingCost: sortSellingCost },
            });
        }
        if (sortSuccessRate &&
            ["asc", "desc"].includes(sortSuccessRate)) {
            orderBy.push({
                swordLevelDefinition: { successRate: sortSuccessRate },
            });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        /* ---------------- FETCH ---------------- */
        const swords = await client_1.default.userSword.findMany({
            where,
            include: {
                swordLevelDefinition: {
                    select: {
                        level: true,
                        name: true,
                        image: true,
                        power: true,
                        upgradeCost: true,
                        sellingCost: true,
                        successRate: true,
                    },
                },
            },
            orderBy,
        });
        return res.status(200).json({
            success: true,
            message: "Fetched User swords details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(swords),
            total: swords.length,
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        console.error("getUserSwords error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserSwords = getUserSwords;
// 4) only user's materials list + total count
const getUserMaterials = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const { sortCreatedAt, sortCost, sortPower, rarity, sold } = req.query;
        await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        const allowedRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
        let filterRarity;
        if (rarity) {
            const upper = String(rarity).toUpperCase();
            if (!allowedRarities.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid rarity. Allowed: ${allowedRarities.join(", ")}`,
                });
            }
            filterRarity = upper;
        }
        /* ---------------- WHERE ---------------- */
        const where = {
            userId: userId,
        };
        if (filterRarity) {
            where.material = { rarity: filterRarity };
        }
        if (sold === "true")
            where.soldedQuantity = { gt: 0 };
        if (sold === "false")
            where.soldedQuantity = 0;
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortCost && ["asc", "desc"].includes(sortCost)) {
            orderBy.push({ material: { cost: sortCost } });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ material: { power: sortPower } });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        /* ---------------- FETCH ---------------- */
        const materials = await client_1.default.userMaterial.findMany({
            where,
            include: {
                material: {
                    select: {
                        code: true,
                        name: true,
                        image: true,
                        cost: true,
                        power: true,
                        rarity: true,
                    },
                },
            },
            orderBy,
        });
        return res.status(200).json({
            success: true,
            message: "Fetched User materials details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(materials),
            total: materials.length,
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        console.error("getUserMaterials error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserMaterials = getUserMaterials;
// 5) only user's shields list + total count
const getUserShields = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const { sortCreatedAt, sortCost, sortPower, rarity, sold, // NEW
         } = req.query;
        await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        const allowedRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
        let filterRarity;
        if (rarity) {
            const upper = String(rarity).toUpperCase();
            if (!allowedRarities.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid rarity. Allowed: ${allowedRarities.join(", ")}`,
                });
            }
            filterRarity = upper;
        }
        /* ---------------- WHERE ---------------- */
        const where = {
            userId: userId,
        };
        if (filterRarity) {
            where.shield = { rarity: filterRarity };
        }
        if (sold === "true")
            where.soldedQuantity = { gt: 0 };
        if (sold === "false")
            where.soldedQuantity = 0;
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortCost && ["asc", "desc"].includes(sortCost)) {
            orderBy.push({ shield: { cost: sortCost } });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ shield: { power: sortPower } });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        /* ---------------- FETCH ---------------- */
        const shields = await client_1.default.userShield.findMany({
            where,
            include: {
                shield: {
                    select: {
                        code: true,
                        name: true,
                        image: true,
                        cost: true,
                        power: true,
                        rarity: true,
                    },
                },
            },
            orderBy,
        });
        return res.status(200).json({
            success: true,
            message: "Fetched User shields details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(shields),
            total: shields.length,
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        console.error("getUserShields error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserShields = getUserShields;
// 6) Only user's gift list + total count
const getUserGifts = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const { status, type, sortCreatedAt } = req.query;
        await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        /* ---------------- ENUM VALIDATION ---------------- */
        const validStatuses = ["PENDING", "CLAIMED", "CANCELLED"];
        const validTypes = ["GOLD", "TRUST_POINTS", "MATERIAL", "SWORD", "SHIELD"];
        let filterStatus;
        if (status) {
            const upper = String(status).toUpperCase();
            if (!validStatuses.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Allowed: ${validStatuses.join(", ")}`,
                });
            }
            filterStatus = upper;
        }
        let filterType;
        if (type) {
            const upper = String(type).toUpperCase();
            if (!validTypes.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid gift type. Allowed: ${validTypes.join(", ")}`,
                });
            }
            filterType = upper;
        }
        /* ---------------- WHERE CLAUSE ---------------- */
        const where = {
            receiverId: userId,
        };
        if (filterStatus) {
            where.status = filterStatus;
        }
        if (filterType) {
            where.items = {
                some: {
                    type: filterType,
                },
            };
        }
        /* ---------------- ORDER BY ---------------- */
        let orderBy;
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy = { createdAt: sortCreatedAt };
        }
        /* ---------------- FETCH ---------------- */
        const gifts = await client_1.default.userGift.findMany({
            where,
            include: {
                items: {
                    select: {
                        type: true,
                        amount: true,
                        materialId: true,
                        materialRarity: true,
                        swordLevel: true,
                        shieldId: true,
                        shieldRarity: true,
                        material: true,
                        shield: true,
                        swordLevelDefinition: true,
                    },
                },
            },
            ...(orderBy ? { orderBy } : {}), // ✅ apply only if provided
        });
        return res.status(200).json({
            success: true,
            message: "Fetched User gifts details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(gifts),
            total: gifts.length,
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        console.error("getUserGifts error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserGifts = getUserGifts;
// 7) only user's vouchers list + total count
const getUserVouchers = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const { status, sortCreatedAt, sortGoldAmount } = req.query;
        await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        /* ---------------- VALIDATION ---------------- */
        const validStatuses = ["PENDING", "REDEEMED", "CANCELLED", "EXPIRED"];
        let filterStatus;
        if (status) {
            const upper = String(status).toUpperCase();
            if (!validStatuses.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid voucher status. Allowed: ${validStatuses.join(", ")}`,
                });
            }
            filterStatus = upper;
        }
        /* ---------------- WHERE CLAUSE ---------------- */
        const where = {
            userId: userId,
        };
        if (filterStatus) {
            where.status = filterStatus;
        }
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortGoldAmount && ["asc", "desc"].includes(sortGoldAmount)) {
            orderBy.push({ goldAmount: sortGoldAmount });
        }
        // If no sort provided → Prisma default order
        const vouchers = await client_1.default.userVoucher.findMany({
            where,
            ...(orderBy.length > 0 ? { orderBy } : {}),
        });
        return res.status(200).json({
            success: true,
            message: "Fetched User voucher details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(vouchers),
            total: vouchers.length,
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        console.error("getUserVouchers error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserVouchers = getUserVouchers;
// 8) only user's customer support list + total count
const getUserCustomerSupports = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const { isReviewed, category, priority, sortCreatedAt } = req.query;
        await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        /* ---------------- VALIDATION ---------------- */
        const validCategories = [
            "GAME_BUG",
            "PAYMENT",
            "ACCOUNT",
            "BAN_APPEAL",
            "SUGGESTION",
            "OTHER",
        ];
        const validPriorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"];
        let filterIsReviewed;
        if (isReviewed !== undefined) {
            if (isReviewed !== "true" && isReviewed !== "false") {
                return res.status(400).json({
                    success: false,
                    error: "isReviewed must be true or false",
                });
            }
            filterIsReviewed = isReviewed === "true";
        }
        let filterCategory;
        if (category) {
            const upper = String(category).toUpperCase();
            if (!validCategories.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid category. Allowed: ${validCategories.join(", ")}`,
                });
            }
            filterCategory = upper;
        }
        let filterPriority;
        if (priority) {
            const upper = String(priority).toUpperCase();
            if (!validPriorities.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid priority. Allowed: ${validPriorities.join(", ")}`,
                });
            }
            filterPriority = upper;
        }
        /* ---------------- WHERE CLAUSE ---------------- */
        const where = {
            userId: userId,
        };
        if (filterIsReviewed !== undefined) {
            where.isReviewed = filterIsReviewed;
        }
        if (filterCategory) {
            where.category = filterCategory;
        }
        if (filterPriority) {
            where.priority = filterPriority;
        }
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        const complaints = await client_1.default.customerSupport.findMany({
            where,
            ...(orderBy.length > 0 ? { orderBy } : {}),
        });
        return res.status(200).json({
            success: true,
            message: "Fetched User complaints details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(complaints),
            total: complaints.length,
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        console.error("getUserCustomerSupports error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserCustomerSupports = getUserCustomerSupports;
// 9) only user's marketplace pucrchases list + total count
const getUserMarketplacePurchases = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "UserId is required",
            });
        }
        const { itemType, sortCreatedAt, sortPriceGold } = req.query;
        await (0, queryHelpers_1.resolveUser)({
            id: userId ? String(userId) : undefined,
            email: undefined,
        });
        /* ---------------- VALIDATION ---------------- */
        const validItemTypes = ["SWORD", "MATERIAL", "SHIELD"];
        let filterItemType;
        if (itemType) {
            const upper = String(itemType).toUpperCase();
            if (!validItemTypes.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid itemType. Allowed: ${validItemTypes.join(", ")}`,
                });
            }
            filterItemType = upper;
        }
        /* ---------------- WHERE CLAUSE ---------------- */
        const where = {
            userId: userId,
        };
        if (filterItemType) {
            where.marketplaceItem = {
                itemType: filterItemType,
            };
        }
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ purchasedAt: sortCreatedAt });
        }
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        // default sorting (only if nothing provided)
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const purchases = await client_1.default.marketplacePurchase.findMany({
            where,
            orderBy,
            include: {
                marketplaceItem: {
                    select: {
                        id: true,
                        itemType: true,
                        priceGold: true,
                        createdAt: true,
                        swordLevelDefinition: {
                            select: {
                                level: true,
                                name: true,
                                image: true,
                                description: true,
                                power: true,
                                upgradeCost: true,
                                sellingCost: true,
                                successRate: true,
                            },
                        },
                        material: {
                            select: {
                                name: true,
                                image: true,
                                description: true,
                                power: true,
                                cost: true,
                                rarity: true,
                            },
                        },
                        shieldType: {
                            select: {
                                name: true,
                                image: true,
                                description: true,
                                power: true,
                                cost: true,
                                rarity: true,
                            },
                        },
                    },
                },
            },
        });
        return res.status(200).json({
            success: true,
            message: "Fetched User marketplace details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(purchases),
            total: purchases.length,
        });
    }
    catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        console.error("getUserMarketplacePurchases error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserMarketplacePurchases = getUserMarketplacePurchases;
//# sourceMappingURL=commonGetterController.js.map