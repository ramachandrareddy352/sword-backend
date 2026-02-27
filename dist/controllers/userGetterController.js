"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadNotifications = exports.getUserAnvilSwordDetails = exports.getUserOneTimeMissions = exports.getUserDailyMissions = exports.getUserSynthesisHistory = exports.getUserUpgradeHistory = exports.getUserPurchasedShields = exports.getUserPurchasedMaterials = exports.getUserPurchasedSwords = exports.getUserCustomerSupports = exports.getUserVouchers = exports.getUserGifts = exports.getUserMaterials = exports.getUserBasicInfo = exports.getUserSwords = exports.getUserRank = void 0;
const client_1 = __importDefault(require("../database/client"));
const serializeBigInt_1 = require("../services/serializeBigInt");
const queryHelpers_1 = require("../services/queryHelpers");
// 1) Get current user's rank across all leaderboard fields
const getUserRank = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        // Fetch current user
        const currentUser = await client_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                gold: true,
                trustPoints: true,
                totalShields: true,
                totalAdsViewed: true,
                totalMissionsDone: true,
                createdAt: true,
                isBanned: true,
                swords: { select: { unsoldQuantity: true } },
                materials: { select: { unsoldQuantity: true } },
            },
        });
        if (!currentUser || currentUser.isBanned) {
            return res.status(404).json({
                success: false,
                error: "User not found or is banned",
            });
        }
        // Compute user's stats
        const userStats = {
            userId: userId.toString(),
            gold: Number(currentUser.gold),
            trustPoints: currentUser.trustPoints,
            totalShields: currentUser.totalShields,
            totalAdsViewed: currentUser.totalAdsViewed,
            totalMissionsDone: currentUser.totalMissionsDone,
            totalSwords: currentUser.swords.reduce((sum, s) => sum + s.unsoldQuantity, 0),
            totalMaterials: currentUser.materials.reduce((sum, m) => sum + m.unsoldQuantity, 0),
            createdAt: currentUser.createdAt,
        };
        // Fetch ALL non-banned users (with minimal fields needed for ranking)
        const allUsers = await client_1.default.user.findMany({
            where: { isBanned: false },
            select: {
                id: true,
                gold: true,
                trustPoints: true,
                totalShields: true,
                totalAdsViewed: true,
                totalMissionsDone: true,
                createdAt: true,
                swords: { select: { unsoldQuantity: true } },
                materials: { select: { unsoldQuantity: true } },
            },
        });
        const totalActiveUsers = allUsers.length;
        // Compute stats for every user
        const leaderboardData = allUsers.map((u) => ({
            userId: u.id.toString(),
            gold: Number(u.gold),
            trustPoints: u.trustPoints,
            totalShields: u.totalShields,
            totalAdsViewed: u.totalAdsViewed,
            totalMissionsDone: u.totalMissionsDone,
            totalSwords: u.swords.reduce((sum, s) => sum + s.unsoldQuantity, 0),
            totalMaterials: u.materials.reduce((sum, m) => sum + m.unsoldQuantity, 0),
            createdAt: u.createdAt,
        }));
        // Define ranking categories
        const rankCategories = [
            "totalSwords",
            "totalMaterials",
            "totalShields",
            "gold",
            "trustPoints",
            "totalAdsViewed",
            "totalMissionsDone",
            "createdAt",
        ];
        const userRanks = {};
        // Compute rank for each category
        for (const category of rankCategories) {
            let rank = 1;
            if (category === "createdAt") {
                // Newer = better (higher rank = smaller number)
                const better = leaderboardData.filter((u) => u.createdAt > userStats.createdAt).length;
                rank = better + 1;
            }
            else {
                // Higher number = better
                const better = leaderboardData.filter((u) => u[category] > userStats[category]).length;
                rank = better + 1;
            }
            userRanks[category] = {
                rank,
                value: userStats[category],
                totalUsers: totalActiveUsers,
            };
        }
        return res.json({
            success: true,
            message: "Your current ranks across all leaderboard categories",
            ranks: userRanks,
            totalActiveUsers,
        });
    }
    catch (err) {
        console.error("getUserRank error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserRank = getUserRank;
// 2) Authenticated user sees their own swords
const getUserSwords = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { sortCreatedAt, // "asc" | "desc"
        sortLevel, // "asc" | "desc" — sorts by sword level
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Build where clause (always scoped to current user)
        const where = {
            userId,
            unsoldQuantity: {
                gt: 0,
            },
        };
        // Build orderBy
        const orderBy = [];
        if (sortCreatedAt === "asc" || sortCreatedAt === "desc") {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortLevel === "asc" || sortLevel === "desc") {
            orderBy.push({
                swordLevelDefinition: { level: sortLevel },
            });
        }
        // Default: newest first
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // ─── Single round-trip: count + data ────────────────────────────────
        const [userSwords, total] = await client_1.default.$transaction([
            client_1.default.userSword.findMany({
                where,
                orderBy,
                skip: pagination.skip,
                take: pagination.take,
                select: {
                    userId: true,
                    swordId: true,
                    isOnAnvil: true,
                    unsoldQuantity: true,
                    soldedQuantity: true,
                    brokenQuantity: true,
                    createdAt: true,
                    updatedAt: true,
                    swordLevelDefinition: {
                        select: {
                            level: true,
                            name: true,
                            image: true,
                            description: true,
                            upgradeCost: true,
                            buyingCost: true,
                            sellingCost: true,
                            synthesizeCost: true,
                            successRate: true,
                            isBuyingAllow: true,
                            isSellingAllow: true,
                            isSynthesizeAllow: true,
                        },
                    },
                },
            }),
            client_1.default.userSword.count({ where }),
        ]);
        // ─────────────────────────────────────────────────────────────────────
        // Enrich response with computed fields
        const enriched = userSwords.map((entry) => ({
            ...entry,
            swordLevel: entry.swordLevelDefinition.level,
            totalOwned: entry.unsoldQuantity + entry.soldedQuantity + entry.brokenQuantity,
        }));
        return res.status(200).json({
            success: true,
            message: enriched.length
                ? "Your swords fetched successfully"
                : "You don't own any swords yet",
            data: (0, serializeBigInt_1.serializeBigInt)(enriched),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserSwords error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserSwords = getUserSwords;
// 3) Returns only main user table fields (no relations)
const getUserBasicInfo = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        // Fetch user with only safe scalar fields
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                profileLogo: true,
                gold: true,
                trustPoints: true,
                totalShields: true,
                createdAt: true,
                lastLoginAt: true,
                lastReviewed: true,
                oneDayGoldAdsViewed: true,
                oneDaySwordAdsViewed: true,
                totalAdsViewed: true,
                oneDayShieldAdsViewed: true,
                totalMissionsDone: true,
                isShieldOn: true,
                isBanned: true,
                anvilSwordLevel: true,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Fetched user basic details successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(user),
        });
    }
    catch (err) {
        console.error("getUserBasicInfo error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserBasicInfo = getUserBasicInfo;
// 4) Authenticated user sees their own materials
const getUserMaterials = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { sortCreatedAt, // 'asc' | 'desc'
        sortBuyingCost, // 'asc' | 'desc'
        sortSellingCost, // 'asc' | 'desc'
        rarity, // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
        sold, // 'true' | 'false' (filter soldedQuantity)
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Validate rarity filter if provided
        const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
        let filterRarity;
        if (rarity) {
            const upper = String(rarity).toUpperCase();
            if (!validRarities.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid rarity. Allowed: ${validRarities.join(", ")}`,
                });
            }
            filterRarity = upper;
        }
        /* ---------------- WHERE ---------------- */
        const where = {
            userId,
            unsoldQuantity: {
                gt: 0,
            },
        };
        if (filterRarity) {
            where.material = { rarity: filterRarity };
        }
        if (sold === "true") {
            where.soldedQuantity = { gt: 0 };
        }
        if (sold === "false") {
            where.soldedQuantity = 0;
        }
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortBuyingCost && ["asc", "desc"].includes(sortBuyingCost)) {
            orderBy.push({ material: { buyingCost: sortBuyingCost } });
        }
        if (sortSellingCost &&
            ["asc", "desc"].includes(sortSellingCost)) {
            orderBy.push({ material: { sellingCost: sortSellingCost } });
        }
        // Default sort: newest first
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const totalCount = await client_1.default.userMaterial.count({
            where,
        });
        /* ---------------- FETCH ---------------- */
        const materials = await client_1.default.userMaterial.findMany({
            where,
            include: {
                material: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        image: true,
                        rarity: true,
                        buyingCost: true,
                        sellingCost: true,
                        isBuyingAllow: true,
                        isSellingAllow: true,
                    },
                },
            },
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
        });
        return res.status(200).json({
            success: true,
            message: "Your materials fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(materials),
            total: totalCount,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserMaterials error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserMaterials = getUserMaterials;
// 5) get users all gifts
const getUserGifts = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { status, // "PENDING" | "CLAIMED" | "CANCELLED"
        itemType, // "GOLD" | "TRUST_POINTS" | "MATERIAL" | "SWORD" | "SHIELD"
        sortCreatedAt, // "asc" | "desc"
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
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
        if (itemType) {
            const upper = String(itemType).toUpperCase();
            if (!validTypes.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid gift type. Allowed: ${validTypes.join(", ")}`,
                });
            }
            filterType = upper;
        }
        /* ---------------- WHERE ---------------- */
        const where = {
            receiverId: userId,
        };
        if (filterStatus) {
            where.status = filterStatus;
        }
        if (filterType) {
            where.type = filterType; // ← corrected: no items relation anymore
        }
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        /* ---------------- FETCH ---------------- */
        const gifts = await client_1.default.userGift.findMany({
            where,
            include: {
                material: {
                    select: {
                        id: true,
                        name: true,
                        rarity: true,
                        image: true,
                    },
                },
                swordLevelDefinition: {
                    select: {
                        id: true,
                        level: true,
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
        });
        const total = await client_1.default.userGift.count({ where });
        return res.status(200).json({
            success: true,
            message: "Your gifts fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(gifts),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserGifts error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserGifts = getUserGifts;
// 6) User's own vouchers list + total count
const getUserVouchers = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { status, sortCreatedAt, sortGoldAmount } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
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
        /* ---------------- WHERE ---------------- */
        const where = {
            createdById: userId, // ✅ fixed
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
        /* ---------------- FETCH ---------------- */
        const [vouchers, total] = await client_1.default.$transaction([
            client_1.default.userVoucher.findMany({
                where,
                include: {
                    allowedUser: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                    redeemedBy: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                },
                orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: "desc" }],
                skip: pagination.skip,
                take: pagination.take,
            }),
            client_1.default.userVoucher.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            message: "Your vouchers fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(vouchers),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserVouchers error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserVouchers = getUserVouchers;
// 7) User's own support complaints list + total count
const getUserCustomerSupports = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { isReviewed, // "true" | "false"
        category, // GAME_BUG, PAYMENT, etc.
        priority, // LOW, NORMAL, HIGH, CRITICAL
        sortCreatedAt, // "asc" | "desc"
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
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
                    error: "isReviewed must be 'true' or 'false'",
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
        /* ---------------- WHERE ---------------- */
        const where = {
            userId,
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
        /* ---------------- FETCH ---------------- */
        const complaints = await client_1.default.customerSupport.findMany({
            where,
            orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: "desc" }],
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                title: true,
                content: true,
                message: true,
                category: true,
                priority: true,
                isReviewed: true,
                createdAt: true,
                updatedAt: true,
                reviewedAt: true,
                adminReply: true,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Your support complaints fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(complaints),
            total: complaints.length,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserCustomerSupports error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserCustomerSupports = getUserCustomerSupports;
// 8)  solded single user swords list
const getUserPurchasedSwords = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { sortPurchasedAt = "desc", // 'asc' | 'desc'
        sortPriceGold, // 'asc' | 'desc'
        sortLevel, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        if (["asc", "desc"].includes(sortPurchasedAt)) {
            orderBy.push({ purchasedAt: sortPurchasedAt });
        }
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        if (sortLevel && ["asc", "desc"].includes(sortLevel)) {
            orderBy.push({
                swordLevelDefinition: { level: sortLevel },
            });
        }
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const total = await client_1.default.swordMarketplacePurchase.count({
            where: { userId },
        });
        const purchases = await client_1.default.swordMarketplacePurchase.findMany({
            where: { userId },
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                swordLevelDefinition: {
                    select: {
                        level: true,
                        name: true,
                        image: true,
                        successRate: true,
                    },
                },
                quantity: true,
                priceGold: true,
                purchasedAt: true,
            },
        });
        // Fetch minimal user info for context
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { name: true, profileLogo: true },
        });
        return res.json({
            success: true,
            message: "Your purchased swords fetched successfully",
            user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
            data: (0, serializeBigInt_1.serializeBigInt)(purchases),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserPurchasedSwords error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserPurchasedSwords = getUserPurchasedSwords;
// 9)  solded single user materials list
const getUserPurchasedMaterials = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { sortPurchasedAt = "desc", // 'asc' | 'desc'
        sortPriceGold, // 'asc' | 'desc'
        sortMaterialId, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        if (["asc", "desc"].includes(sortPurchasedAt)) {
            orderBy.push({ purchasedAt: sortPurchasedAt });
        }
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        if (sortMaterialId && ["asc", "desc"].includes(sortMaterialId)) {
            orderBy.push({ materialId: sortMaterialId });
        }
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const total = await client_1.default.materialMarketplacePurchase.count({
            where: { userId },
        });
        const purchases = await client_1.default.materialMarketplacePurchase.findMany({
            where: { userId },
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                material: {
                    select: {
                        id: true,
                        name: true,
                        rarity: true,
                        image: true,
                    },
                },
                quantity: true,
                priceGold: true,
                purchasedAt: true,
            },
        });
        // Fetch minimal user info
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { name: true, profileLogo: true },
        });
        return res.json({
            success: true,
            message: "Your purchased materials fetched successfully",
            user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
            data: (0, serializeBigInt_1.serializeBigInt)(purchases),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserPurchasedMaterials error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserPurchasedMaterials = getUserPurchasedMaterials;
// 10)  solded single user shields list
const getUserPurchasedShields = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { sortPurchasedAt = "desc", // 'asc' | 'desc'
        sortPriceGold, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        if (["asc", "desc"].includes(sortPurchasedAt)) {
            orderBy.push({ purchasedAt: sortPurchasedAt });
        }
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const total = await client_1.default.shieldMarketplacePurchase.count({
            where: { userId },
        });
        const purchases = await client_1.default.shieldMarketplacePurchase.findMany({
            where: { userId },
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                quantity: true,
                priceGold: true,
                purchasedAt: true,
            },
        });
        // Fetch minimal user info
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { name: true, profileLogo: true },
        });
        return res.json({
            success: true,
            message: "Your purchased shields fetched successfully",
            user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
            data: (0, serializeBigInt_1.serializeBigInt)(purchases),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserPurchasedShields error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserPurchasedShields = getUserPurchasedShields;
// 11) Fetch authenticated user's own sword upgrade history
const getUserUpgradeHistory = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { sortCreatedAt = "desc" } = req.query; // 'asc' | 'desc'
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        if (["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const total = await client_1.default.swordUpgradeHistory.count({
            where: { userId },
        });
        const history = await client_1.default.swordUpgradeHistory.findMany({
            where: { userId },
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
        });
        return res.json({
            success: true,
            message: "Your sword upgrade history fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(history),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserUpgradeHistory error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserUpgradeHistory = getUserUpgradeHistory;
// 12) Fetch authenticated user's own sword synthesis history
const getUserSynthesisHistory = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { sortCreatedAt = "desc" } = req.query; // 'asc' | 'desc'
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        if (["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const total = await client_1.default.swordSynthesisHistory.count({
            where: { userId },
        });
        const history = await client_1.default.swordSynthesisHistory.findMany({
            where: { userId },
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
        });
        return res.json({
            success: true,
            message: "Your sword synthesis history fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(history),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getUserSynthesisHistory error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getUserSynthesisHistory = getUserSynthesisHistory;
// 13) Get daily missions for authenticated user
const getUserDailyMissions = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        // Fetch user ad counters
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: {
                oneDayGoldAdsViewed: true,
                oneDayShieldAdsViewed: true,
                oneDaySwordAdsViewed: true,
                isBanned: true,
            },
        });
        if (!user || user.isBanned) {
            return res.status(404).json({
                success: false,
                error: "User not found or banned",
            });
        }
        // Fetch admin config (for max limits)
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
            select: {
                maxDailyGoldAds: true,
                maxDailyShieldAds: true,
                maxDailySwordAds: true,
            },
        });
        if (!config) {
            return res.status(500).json({
                success: false,
                error: "Admin config not found",
            });
        }
        // Fetch all active daily missions
        const missions = await client_1.default.dailyMissionDefinition.findMany({
            where: { isActive: true },
            include: {
                progress: {
                    where: { userId },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const result = missions.map((mission) => {
            const progress = mission.progress[0];
            // Check if claimed today
            const claimedToday = progress?.lastClaimedAt &&
                new Date(progress.lastClaimedAt) >= todayStart;
            let currentProgress = 0;
            let dynamicTargetValue = mission.targetValue;
            const conditions = mission.conditions;
            for (const condition of conditions) {
                if (condition.type === "completeAllAds") {
                    switch (condition.adType) {
                        case "GOLD":
                            currentProgress = user.oneDayGoldAdsViewed;
                            dynamicTargetValue = config.maxDailyGoldAds;
                            break;
                        case "SHIELD":
                            currentProgress = user.oneDayShieldAdsViewed;
                            dynamicTargetValue = config.maxDailyShieldAds;
                            break;
                        case "OLD_SWORD":
                            currentProgress = user.oneDaySwordAdsViewed;
                            dynamicTargetValue = config.maxDailySwordAds;
                            break;
                        default:
                            console.warn(`Unknown adType: ${condition.adType}`);
                    }
                }
            }
            const isCompleted = currentProgress >= dynamicTargetValue;
            const canClaim = isCompleted && !claimedToday;
            return {
                missionId: mission.id.toString(),
                title: mission.title,
                description: mission.description,
                targetValue: dynamicTargetValue,
                currentProgress,
                isCompleted,
                claimedToday: !!claimedToday,
                canClaim,
                reward: mission.reward,
            };
        });
        return res.status(200).json({
            success: true,
            message: "Daily missions fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(result),
        });
    }
    catch (err) {
        console.error("getUserDailyMissions error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserDailyMissions = getUserDailyMissions;
// 14) GET Active One-Time Missions with eligibility + claimed status
const getUserOneTimeMissions = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const now = new Date();
        // Fetch only ACTIVE + valid time missions
        const missions = await client_1.default.oneTimeMissionDefinition.findMany({
            where: {
                isActive: true,
                startAt: { lte: now },
                OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
            },
        });
        if (missions.length === 0) {
            return res.json({
                success: true,
                message: "No active one-time missions",
                data: [],
            });
        }
        const missionResults = [];
        for (const mission of missions) {
            const conditions = mission.conditions;
            let progressValue = 0;
            // Time filter range
            const timeFilter = {
                gte: mission.startAt,
            };
            if (mission.expiresAt) {
                timeFilter.lte = mission.expiresAt;
            }
            for (const cond of conditions) {
                switch (cond.type) {
                    // ================= BUY SWORD =================
                    case "buySword":
                        progressValue += await client_1.default.swordMarketplacePurchase.count({
                            where: {
                                userId,
                                purchasedAt: timeFilter,
                                ...(cond.level && {
                                    swordLevelDefinition: { level: cond.level },
                                }),
                            },
                        });
                        break;
                    // ================= BUY MATERIAL =================
                    case "buyMaterial":
                        progressValue += await client_1.default.materialMarketplacePurchase.count({
                            where: {
                                userId,
                                purchasedAt: timeFilter,
                                ...(cond.materialId && {
                                    materialId: BigInt(cond.materialId),
                                }),
                            },
                        });
                        break;
                    // ================= BUY SHIELD =================
                    case "buyShield":
                        const shieldPurchases = await client_1.default.shieldMarketplacePurchase.findMany({
                            where: {
                                userId,
                                purchasedAt: timeFilter,
                            },
                            select: { quantity: true },
                        });
                        progressValue += shieldPurchases.reduce((sum, s) => sum + s.quantity, 0);
                        break;
                    // ================= UPGRADE SWORD =================
                    case "upgradeSword":
                        progressValue += await client_1.default.swordUpgradeHistory.count({
                            where: {
                                userId,
                                createdAt: timeFilter,
                                success: true,
                                ...(cond.level && {
                                    fromSwordLevelDefinition: { level: cond.level },
                                }),
                            },
                        });
                        break;
                    // ================= SYNTHESIZE =================
                    case "synthesize":
                        progressValue += await client_1.default.swordSynthesisHistory.count({
                            where: {
                                userId,
                                createdAt: timeFilter,
                                ...(cond.level && {
                                    swordLevelDefinition: { level: cond.level },
                                }),
                            },
                        });
                        break;
                }
            }
            // Check if already claimed
            const claimedRecord = await client_1.default.userOneTimeMissionProgress.findUnique({
                where: {
                    userId_missionId: {
                        userId,
                        missionId: mission.id,
                    },
                },
            });
            const claimed = !!claimedRecord;
            const canClaim = !claimed && progressValue >= mission.targetValue;
            missionResults.push({
                missionId: mission.id.toString(),
                title: mission.title,
                description: mission.description,
                reward: mission.reward,
                targetValue: mission.targetValue,
                progressValue,
                claimed,
                canClaim,
                startAt: mission.startAt,
                expiresAt: mission.expiresAt,
            });
        }
        return res.json({
            success: true,
            message: "Active one-time missions fetched",
            data: (0, serializeBigInt_1.serializeBigInt)(missionResults),
        });
    }
    catch (err) {
        console.error("getUserOneTimeMissions error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserOneTimeMissions = getUserOneTimeMissions;
// user anvil sword details
const getUserAnvilSwordDetails = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        const { level } = req.query;
        if (!level || isNaN(Number(level))) {
            return res.status(400).json({
                success: false,
                error: "Valid 'level' query parameter is required",
            });
        }
        const swordLevel = Number(level);
        // ─── Fetch sword definition ────────────────────────────────────────
        const swordDef = await client_1.default.swordLevelDefinition.findUnique({
            where: { level: swordLevel },
            select: {
                id: true,
                level: true,
                name: true,
                image: true,
                upgradeCost: true,
                sellingCost: true,
                successRate: true,
                isSellingAllow: true,
                isBuyingAllow: true,
                isSynthesizeAllow: true,
                description: true,
                upgradeDrops: {
                    select: {
                        material: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                rarity: true,
                            },
                        },
                        dropPercentage: true,
                        minQuantity: true,
                        maxQuantity: true,
                    },
                },
            },
        });
        if (!swordDef) {
            return res.status(404).json({
                success: false,
                error: `Sword level ${swordLevel} not found`,
            });
        }
        // ─── Fetch user's ownership stats for this exact sword level ────────
        const userSword = await client_1.default.userSword.findUnique({
            where: {
                userId_swordId: {
                    userId,
                    swordId: swordDef.id,
                },
            },
            select: {
                unsoldQuantity: true,
                soldedQuantity: true,
                brokenQuantity: true,
                isOnAnvil: true,
            },
        });
        // ─── Combine & respond ──────────────────────────────────────────────
        return res.status(200).json({
            success: true,
            message: userSword
                ? "Anvil sword details fetched successfully"
                : "Sword definition found, but you do not own any of this level",
            data: (0, serializeBigInt_1.serializeBigInt)({
                swordDefinition: swordDef,
                userOwnership: userSword || null, // null if user doesn't have it
            }),
        });
    }
    catch (err) {
        console.error("getUserAnvilSwordDetails error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserAnvilSwordDetails = getUserAnvilSwordDetails;
const getUnreadNotifications = async (req, res) => {
    try {
        const userId = BigInt(req.user.userId);
        // Fetch user with join date (createdAt) and last read time
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: {
                createdAt: true, // join time
                lastNotificationReadTime: true,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        const where = {
            createdAt: {
                gte: user.createdAt, // Only notifications after user joined
            },
        };
        // If user has ever marked notifications as read, show only newer unread ones
        if (user.lastNotificationReadTime) {
            where.createdAt.gt = user.lastNotificationReadTime;
        }
        const notifications = await client_1.default.notification.findMany({
            where,
            orderBy: { createdAt: "desc" }, // Newest first
        });
        return res.status(200).json({
            success: true,
            message: notifications.length > 0
                ? "Unread notifications fetched"
                : "No unread notifications",
            data: (0, serializeBigInt_1.serializeBigInt)(notifications),
        });
    }
    catch (err) {
        console.error("getUnreadNotifications error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUnreadNotifications = getUnreadNotifications;
//# sourceMappingURL=userGetterController.js.map