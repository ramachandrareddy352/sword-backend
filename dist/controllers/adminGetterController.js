"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserMissionsByUserId = exports.getAllUsersOneTimeMissionProgress = exports.getAllUsersDailyMissionProgress = exports.getAllOneTimeMissions = exports.getAllDailyMissions = exports.getAllUsersSynthesisHistory = exports.getAllUsersUpgradeHistory = exports.getUserFullDetails = exports.checkUserByEmail = exports.getAllUsersVouchers = exports.getAllCustomerSupports = exports.getAllUsersGifts = exports.getAdminConfig = exports.getAllUsersMaterials = exports.getAllUsersSwords = exports.getAllUsers = void 0;
const client_1 = __importDefault(require("../database/client"));
const client_2 = require("@prisma/client");
const queryHelpers_1 = require("../services/queryHelpers");
const serializeBigInt_1 = require("../services/serializeBigInt");
// 1) Get the basic information of all users using pagination
const getAllUsers = async (req, res) => {
    try {
        const { sortByBanned, // 'true' | 'false' (filter only)
        sortGold, // 'asc' | 'desc'
        sortTrustPoints, // 'asc' | 'desc'
        sortTotalShields, // 'asc' | 'desc'
        sortTotalAdsViewed, // 'asc' | 'desc'
        sortTotalMissionsDone, // 'asc' | 'desc'
        sortRegisteredDate, // 'asc' | 'desc' (createdAt)
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        // If pagination invalid → early return
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Build WHERE clause (only for banned filter)
        const where = {};
        if (sortByBanned !== undefined &&
            ["true", "false"].includes(sortByBanned)) {
            where.isBanned = sortByBanned === "true";
        }
        // Build ORDER BY array
        const orderBy = [];
        // Registered date (createdAt)
        if (sortRegisteredDate &&
            ["asc", "desc"].includes(sortRegisteredDate)) {
            orderBy.push({ createdAt: sortRegisteredDate });
        }
        // Gold
        if (sortGold && ["asc", "desc"].includes(sortGold)) {
            orderBy.push({ gold: sortGold });
        }
        // Trust Points
        if (sortTrustPoints &&
            ["asc", "desc"].includes(sortTrustPoints)) {
            orderBy.push({ trustPoints: sortTrustPoints });
        }
        // Total Shields
        if (sortTotalShields &&
            ["asc", "desc"].includes(sortTotalShields)) {
            orderBy.push({ totalShields: sortTotalShields });
        }
        // Total Ads Viewed
        if (sortTotalAdsViewed &&
            ["asc", "desc"].includes(sortTotalAdsViewed)) {
            orderBy.push({ totalAdsViewed: sortTotalAdsViewed });
        }
        // Total Missions Done
        if (sortTotalMissionsDone &&
            ["asc", "desc"].includes(sortTotalMissionsDone)) {
            orderBy.push({ totalMissionsDone: sortTotalMissionsDone });
        }
        // Default sort: newest users first
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Get total count (with optional banned filter)
        const totalUsers = await client_1.default.user.count({ where });
        // Fetch paginated users with full basic details
        const users = await client_1.default.user.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                email: true,
                name: true,
                profileLogo: true,
                gold: true,
                trustPoints: true,
                totalShields: true,
                totalAdsViewed: true,
                totalMissionsDone: true,
                createdAt: true,
                lastReviewed: true,
                lastLoginAt: true,
                isBanned: true,
            },
        });
        // If no users match criteria
        if (users.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No users found matching the criteria",
                data: [],
                page: pagination.page,
                limit: pagination.limit,
                total: 0,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(users),
            page: pagination.page,
            limit: pagination.limit,
            total: totalUsers,
        });
    }
    catch (error) {
        console.error("getAllUsers error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getAllUsers = getAllUsers;
// 2) Admin GET all users' swords with sorting (level, power, isBroken, isSolded), pagination
const getAllUsersSwords = async (req, res) => {
    try {
        const { sortCreatedAt, // 'asc' | 'desc'
        sortLevel, // 'asc' | 'desc'
        isOnAnvil, // 'true' | 'false'
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Build where clause
        const where = {};
        // Filter by anvil status
        if (isOnAnvil === "true") {
            where.isOnAnvil = true;
        }
        else if (isOnAnvil === "false") {
            where.isOnAnvil = false;
        }
        // Build orderBy
        const orderBy = [];
        if (sortCreatedAt === "asc" || sortCreatedAt === "desc") {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortLevel === "asc" || sortLevel === "desc") {
            orderBy.push({
                swordLevelDefinition: {
                    level: sortLevel,
                },
            });
        }
        // Default sort: newest first
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // ─── Single round-trip with $transaction ─────────────────────────────
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
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            profileLogo: true,
                            isBanned: true,
                        },
                    },
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
        // Optional: enrich response with total owned per sword (unsold + sold + broken)
        const enriched = userSwords.map((entry) => ({
            ...entry,
            totalOwned: entry.unsoldQuantity + entry.soldedQuantity + entry.brokenQuantity,
            swordLevel: entry.swordLevelDefinition?.level, // for easier frontend use
        }));
        return res.status(200).json({
            success: true,
            message: enriched.length
                ? "Users' swords fetched successfully"
                : "No sword ownership records found",
            data: (0, serializeBigInt_1.serializeBigInt)(enriched),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllUsersSwords error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getAllUsersSwords = getAllUsersSwords;
// 3) Admin GET all users' materials with sorting (power, gold cost), optional rarity filter, pagination
const getAllUsersMaterials = async (req, res) => {
    try {
        const { sortCreatedAt, // 'asc' | 'desc'
        rarity, // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' (filter)
        sold, // 'true' | 'false' (filter soldedQuantity > 0 or = 0)
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Validate rarity if provided
        const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
        let filterRarity;
        if (rarity) {
            const upperRarity = rarity.toUpperCase();
            if (!validRarities.includes(upperRarity)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid rarity value. Must be one of: ${validRarities.join(", ")}`,
                });
            }
            filterRarity = upperRarity;
        }
        // Build where clause
        const where = {};
        if (filterRarity) {
            where.material = { rarity: filterRarity };
        }
        if (sold === "true") {
            where.soldedQuantity = { gt: 0 };
        }
        if (sold === "false") {
            where.soldedQuantity = 0;
        }
        // Build orderBy
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        // Default sort: newest first
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Get total count
        const totalItems = await client_1.default.userMaterial.count({ where });
        // Fetch data
        const materials = await client_1.default.userMaterial.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                userId: true,
                unsoldQuantity: true,
                soldedQuantity: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        isBanned: true,
                        gold: true,
                        trustPoints: true,
                    },
                },
                material: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        image: true,
                        buyingCost: true,
                        sellingCost: true,
                        rarity: true,
                    },
                },
            },
        });
        return res.status(200).json({
            success: true,
            message: "Users' materials fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(materials),
            total: totalItems,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllUsersMaterials error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllUsersMaterials = getAllUsersMaterials;
// 4) admin config data
const getAdminConfig = async (_req, res) => {
    try {
        // Fetch the single AdminConfig row (id is fixed to 1 as per your schema)
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: 1 }, // BigInt literal (1n),
        });
        if (!config) {
            return res.status(404).json({
                success: false,
                error: "Admin configuration not found",
            });
        }
        // Return the config data (convert BigInt to string for safe JSON)
        return res.status(200).json({
            success: true,
            message: "Admin configuration retrieved successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(config),
        });
    }
    catch (error) {
        console.error("getAdminConfig error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch admin configuration",
        });
    }
};
exports.getAdminConfig = getAdminConfig;
// 5) Admin GET all users' gifts with optional status filter, optional itemType filter, sorting (createdAt, status), pagination
const getAllUsersGifts = async (req, res) => {
    try {
        const { status, // "PENDING" | "CLAIMED" | "CANCELLED"
        type, // "GOLD" | "TRUST_POINTS" | "MATERIAL" | "SWORD" | "SHIELD"
        sortCreatedAt, // "asc" | "desc"
        receiverId, // optional filter by user
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Build where clause
        const where = {};
        if (status &&
            ["PENDING", "CLAIMED", "CANCELLED"].includes(status)) {
            where.status = status;
        }
        if (type && Object.values(client_2.GiftItemType).includes(type)) {
            where.type = type;
        }
        if (receiverId) {
            try {
                where.receiverId = BigInt(receiverId);
            }
            catch {
                return res.status(400).json({
                    success: false,
                    error: "Invalid receiverId format (must be numeric)",
                });
            }
        }
        // Build orderBy
        const orderBy = [];
        if (sortCreatedAt === "asc" || sortCreatedAt === "desc") {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        // Default: newest first
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Single round-trip with transaction (count + data)
        const [gifts, total] = await client_1.default.$transaction([
            client_1.default.userGift.findMany({
                where,
                orderBy,
                skip: pagination.skip,
                take: pagination.take,
                select: {
                    id: true,
                    receiverId: true,
                    status: true,
                    note: true,
                    type: true,
                    amount: true, // GOLD, TRUST_POINTS, SHIELD
                    materialId: true,
                    materialQuantity: true, // note: corrected spelling
                    swordId: true, // this is actually the level (Int)
                    swordQuantity: true,
                    createdAt: true,
                    claimedAt: true,
                    cancelledAt: true,
                    receiver: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            profileLogo: true,
                            isBanned: true,
                            gold: true,
                            trustPoints: true,
                        },
                    },
                    material: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            rarity: true,
                        },
                    },
                    swordLevelDefinition: {
                        select: {
                            level: true,
                            name: true,
                            image: true,
                        },
                    },
                },
            }),
            client_1.default.userGift.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            message: gifts.length
                ? "User gifts fetched successfully"
                : "No gifts found matching the criteria",
            data: (0, serializeBigInt_1.serializeBigInt)(gifts),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getAllUsersGifts error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch gifts",
        });
    }
};
exports.getAllUsersGifts = getAllUsersGifts;
// 6) Admin GET all customer support — no rarity/type filter (only sorting), added message
const getAllCustomerSupports = async (req, res) => {
    try {
        const { sortPriority, sortCategory, sortCreatedAt } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "No complaints found",
            });
        }
        const orderBy = [];
        if (sortPriority && ["asc", "desc"].includes(sortPriority)) {
            orderBy.push({ priority: sortPriority });
        }
        if (sortCategory && ["asc", "desc"].includes(sortCategory)) {
            orderBy.push({ category: sortCategory });
        }
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const totalItems = await client_1.default.customerSupport.count();
        const supports = await client_1.default.customerSupport.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        isBanned: true,
                    },
                },
            },
        });
        return res.status(200).json({
            success: true,
            message: "Users complaints fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(supports),
            total: totalItems,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllCustomerSupports error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllCustomerSupports = getAllCustomerSupports;
// 7) Admin GET all users' vouchers — optional status filter + sorting
const getAllUsersVouchers = async (req, res) => {
    try {
        const { status, // optional: 'PENDING' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED'
        sortCreatedAt, sortGoldAmount, sortStatus, } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                message: "Data not found",
            });
        }
        // Optional status filter + validation
        let filterStatus;
        if (status) {
            const upper = status.toUpperCase();
            const valid = ["PENDING", "REDEEMED", "CANCELLED", "EXPIRED"];
            if (!valid.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid voucher status. Allowed: ${valid.join(", ")}`,
                });
            }
            filterStatus = upper;
        }
        const where = {};
        if (filterStatus) {
            where.status = filterStatus;
        }
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortGoldAmount && ["asc", "desc"].includes(sortGoldAmount)) {
            orderBy.push({ goldAmount: sortGoldAmount });
        }
        if (sortStatus && ["asc", "desc"].includes(sortStatus)) {
            orderBy.push({ status: sortStatus });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const [totalItems, vouchers] = await client_1.default.$transaction([
            client_1.default.userVoucher.count({ where }),
            client_1.default.userVoucher.findMany({
                where,
                orderBy,
                skip: pagination.skip,
                take: pagination.take,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            profileLogo: true,
                            isBanned: true,
                        },
                    },
                    allowedUser: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            profileLogo: true,
                            isBanned: true,
                        },
                    },
                    redeemedBy: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            profileLogo: true,
                            isBanned: true,
                        },
                    },
                },
            }),
        ]);
        return res.status(200).json({
            success: true,
            message: "Users vouchers fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(vouchers),
            total: totalItems,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllUsersVouchers error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllUsersVouchers = getAllUsersVouchers;
// 8) verify weaher user is a registered one or not
const checkUserByEmail = async (req, res) => {
    try {
        const { email } = req.query;
        // 1. Input validation
        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                success: false,
                error: "Valid email address is required in the request body",
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        // 2. Find user (only select safe/public fields)
        const user = await client_1.default.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                email: true,
                name: true,
                isBanned: true,
                createdAt: true,
            },
        });
        // 3. Response
        if (!user) {
            return res.status(400).json({
                success: false,
                exists: false,
                error: "No user registered with this email",
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            exists: true,
            message: "User found",
            data: (0, serializeBigInt_1.serializeBigInt)(user),
        });
    }
    catch (err) {
        console.error("[checkUserByEmail] Error:", err);
        // In production, you might want to hide full error details
        return res.status(500).json({
            success: false,
            error: "Internal server error while checking user",
        });
    }
};
exports.checkUserByEmail = checkUserByEmail;
// 9) Get complete user details (admin only) by email or id
const getUserFullDetails = async (req, res) => {
    try {
        const { email, userId } = req.query;
        if (!email && !userId) {
            return res.status(400).json({
                success: false,
                error: "Provide either 'email' or 'userId' query parameter",
            });
        }
        let user;
        if (userId) {
            user = await client_1.default.user.findUnique({
                where: { id: BigInt(userId) },
            });
        }
        else if (email) {
            user = await client_1.default.user.findUnique({
                where: { email: email },
            });
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }
        // ─── Core user data ───────────────────────────────────────────────
        const safeUser = {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            profileLogo: user.profileLogo,
            gold: user.gold,
            trustPoints: user.trustPoints,
            totalShields: user.totalShields,
            anvilSwordLevel: user.anvilSwordLevel?.toString() ?? null,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            lastReviewed: user.lastReviewed,
            oneDayGoldAdsViewed: user.oneDayGoldAdsViewed,
            oneDayShieldAdsViewed: user.oneDayShieldAdsViewed,
            oneDaySwordAdsViewed: user.oneDaySwordAdsViewed,
            totalAdsViewed: user.totalAdsViewed,
            totalMissionsDone: user.totalMissionsDone,
            isShieldOn: user.isShieldOn,
            isBanned: user.isBanned,
        };
        // ─── Parallel queries for better performance ──────────────────────
        const [vouchers, swords, materials, gifts, swordMarketplacePurchases, materialMarketplacePurchases, shieldMarketplacePurchases, synthesisHistories, upgradeHistories, swordSellHistories, materialSellHistories, customerSupports,] = await Promise.all([
            // Vouchers (created by this user)
            client_1.default.userVoucher.findMany({
                where: { createdById: user.id },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    code: true,
                    goldAmount: true,
                    status: true,
                    updatedAt: true,
                    createdAt: true,
                },
            }),
            // Owned swords (current inventory)
            client_1.default.userSword.findMany({
                where: { userId: user.id },
                include: {
                    swordLevelDefinition: {
                        select: {
                            level: true,
                            name: true,
                            image: true,
                            description: true,
                            upgradeCost: true,
                            sellingCost: true,
                            successRate: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            // Owned materials (current inventory)
            client_1.default.userMaterial.findMany({
                where: { userId: user.id },
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
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            // Received gifts
            client_1.default.userGift.findMany({
                where: { receiverId: user.id },
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
                            level: true,
                            name: true,
                            image: true,
                            // add more fields if needed: description, upgradeCost, etc.
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            // Sword marketplace purchases (bought)
            client_1.default.swordMarketplacePurchase.findMany({
                where: { userId: user.id },
                include: {
                    swordLevelDefinition: {
                        select: {
                            level: true,
                            name: true,
                            image: true,
                            successRate: true,
                        },
                    },
                },
                orderBy: { purchasedAt: "desc" },
            }),
            // Material marketplace purchases (bought)
            client_1.default.materialMarketplacePurchase.findMany({
                where: { userId: user.id },
                include: {
                    material: {
                        select: {
                            id: true,
                            name: true,
                            rarity: true,
                            image: true,
                        },
                    },
                },
                orderBy: { purchasedAt: "desc" },
            }),
            // Shield marketplace purchases (bought)
            client_1.default.shieldMarketplacePurchase.findMany({
                where: { userId: user.id },
                orderBy: { purchasedAt: "desc" },
            }),
            // Synthesis history
            client_1.default.swordSynthesisHistory.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
            }),
            // Upgrade history
            client_1.default.swordUpgradeHistory.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
            }),
            // **New** – Sword selling history
            client_1.default.swordSellHistory.findMany({
                where: { userId: user.id },
                include: {
                    swordLevelDefinition: {
                        select: {
                            level: true,
                            name: true,
                            image: true,
                            sellingCost: true,
                        },
                    },
                },
                orderBy: { soldAt: "desc" },
            }),
            // **New** – Material selling history
            client_1.default.materialSellHistory.findMany({
                where: { userId: user.id },
                include: {
                    material: {
                        select: {
                            id: true,
                            name: true,
                            rarity: true,
                            image: true,
                            sellingCost: true,
                        },
                    },
                },
                orderBy: { soldAt: "desc" },
            }),
            // Support tickets
            client_1.default.customerSupport.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
            }),
        ]);
        return res.status(200).json({
            success: true,
            message: "User full details fetched successfully",
            data: {
                user: (0, serializeBigInt_1.serializeBigInt)(safeUser),
                vouchers: {
                    list: (0, serializeBigInt_1.serializeBigInt)(vouchers),
                    total: vouchers.length,
                },
                inventory: {
                    swords: {
                        list: (0, serializeBigInt_1.serializeBigInt)(swords),
                        total: swords.length,
                    },
                    materials: {
                        list: (0, serializeBigInt_1.serializeBigInt)(materials),
                        total: materials.length,
                    },
                },
                giftsReceived: {
                    list: (0, serializeBigInt_1.serializeBigInt)(gifts),
                    total: gifts.length,
                },
                purchases: {
                    swords: {
                        list: (0, serializeBigInt_1.serializeBigInt)(swordMarketplacePurchases),
                        total: swordMarketplacePurchases.length,
                    },
                    materials: {
                        list: (0, serializeBigInt_1.serializeBigInt)(materialMarketplacePurchases),
                        total: materialMarketplacePurchases.length,
                    },
                    shields: {
                        list: (0, serializeBigInt_1.serializeBigInt)(shieldMarketplacePurchases),
                        total: shieldMarketplacePurchases.length,
                    },
                },
                activity: {
                    synthesis: {
                        list: (0, serializeBigInt_1.serializeBigInt)(synthesisHistories),
                        total: synthesisHistories.length,
                    },
                    upgrades: {
                        list: (0, serializeBigInt_1.serializeBigInt)(upgradeHistories),
                        total: upgradeHistories.length,
                    },
                    sales: {
                        swords: {
                            list: (0, serializeBigInt_1.serializeBigInt)(swordSellHistories),
                            total: swordSellHistories.length,
                        },
                        materials: {
                            list: (0, serializeBigInt_1.serializeBigInt)(materialSellHistories),
                            total: materialSellHistories.length,
                        },
                    },
                },
                support: {
                    list: (0, serializeBigInt_1.serializeBigInt)(customerSupports),
                    total: customerSupports.length,
                },
            },
        });
    }
    catch (error) {
        console.error("getUserFullDetails error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getUserFullDetails = getUserFullDetails;
// 10) get all upgrade history
const getAllUsersUpgradeHistory = async (req, res) => {
    try {
        const { sortCreatedAt = "desc", sortGoldSpent, success, minGoldSpent, maxGoldSpent, } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // ---------- WHERE FILTER ----------
        const where = {};
        if (success !== undefined) {
            where.success = success === "true";
        }
        if (minGoldSpent !== undefined || maxGoldSpent !== undefined) {
            where.goldSpent = {};
            if (minGoldSpent !== undefined) {
                where.goldSpent.gte = Number(minGoldSpent);
            }
            if (maxGoldSpent !== undefined) {
                where.goldSpent.lte = Number(maxGoldSpent);
            }
        }
        // ---------- ORDER BY ----------
        const orderBy = [];
        if (["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (["asc", "desc"].includes(sortGoldSpent)) {
            orderBy.push({ goldSpent: sortGoldSpent });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // ---------- COUNT ----------
        const total = await client_1.default.swordUpgradeHistory.count({ where });
        // ---------- FETCH ----------
        const history = await client_1.default.swordUpgradeHistory.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            message: "All users sword upgrade history fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(history),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getAllUsersUpgradeHistory error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getAllUsersUpgradeHistory = getAllUsersUpgradeHistory;
// 11) get all synthesize history
const getAllUsersSynthesisHistory = async (req, res) => {
    try {
        const { sortCreatedAt = "desc" } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // ---------- ORDER BY ----------
        const orderBy = [];
        if (["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // ---------- COUNT ----------
        const total = await client_1.default.swordSynthesisHistory.count();
        // ---------- FETCH ----------
        const history = await client_1.default.swordSynthesisHistory.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            message: "All users sword synthesis history fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(history),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getAllUsersSynthesisHistory error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getAllUsersSynthesisHistory = getAllUsersSynthesisHistory;
// 12) GET ALL DAILY MISSIONS
const getAllDailyMissions = async (req, res) => {
    try {
        const { active, rewardType, sortCreatedAt = "desc" } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const where = {};
        // Active filter
        if (active === "true")
            where.isActive = true;
        if (active === "false")
            where.isActive = false;
        // Reward type filter (reward is Json)
        if (rewardType) {
            where.reward = {
                path: ["type"],
                equals: rewardType,
            };
        }
        const orderBy = [];
        if (["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const total = await client_1.default.dailyMissionDefinition.count({ where });
        const missions = await client_1.default.dailyMissionDefinition.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            include: {
                progress: {
                    select: {
                        userId: true,
                        claimedTimes: true,
                        lastClaimedAt: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            message: "Daily missions fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(missions),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getAllDailyMissions error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getAllDailyMissions = getAllDailyMissions;
// 13) GET ALL ONE-TIME MISSIONS
const getAllOneTimeMissions = async (req, res) => {
    try {
        const { active, expired, rewardType, sortCreatedAt = "desc" } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const where = {};
        // Active filter
        if (active === "true")
            where.isActive = true;
        if (active === "false")
            where.isActive = false;
        // Expiry filter
        if (expired === "true") {
            where.expiresAt = { lt: new Date() };
        }
        if (expired === "false") {
            where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
        }
        // Reward filter
        if (rewardType) {
            where.reward = {
                path: ["type"],
                equals: rewardType,
            };
        }
        const orderBy = [];
        if (["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const total = await client_1.default.oneTimeMissionDefinition.count({ where });
        const missions = await client_1.default.oneTimeMissionDefinition.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            include: {
                progress: {
                    select: {
                        userId: true,
                        claimedAt: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            message: "One-time missions fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(missions),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getAllOneTimeMissions error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getAllOneTimeMissions = getAllOneTimeMissions;
// 14) GET ALL USERS DAILY MISSION COMPLETIONS
const getAllUsersDailyMissionProgress = async (req, res) => {
    try {
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const total = await client_1.default.userDailyMissionProgress.count();
        const progress = await client_1.default.userDailyMissionProgress.findMany({
            skip: pagination.skip,
            take: pagination.take,
            include: {
                user: {
                    select: { id: true, email: true, name: true },
                },
                mission: {
                    select: { id: true, title: true, reward: true },
                },
            },
            orderBy: { lastClaimedAt: "desc" },
        });
        return res.json({
            success: true,
            message: "All users daily mission progress fetched",
            data: (0, serializeBigInt_1.serializeBigInt)(progress),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getAllUsersDailyMissionProgress = getAllUsersDailyMissionProgress;
// 15) GET ALL USERS ONE-TIME MISSION COMPLETIONS
const getAllUsersOneTimeMissionProgress = async (req, res) => {
    try {
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const total = await client_1.default.userOneTimeMissionProgress.count();
        const progress = await client_1.default.userOneTimeMissionProgress.findMany({
            skip: pagination.skip,
            take: pagination.take,
            include: {
                user: {
                    select: { id: true, email: true, name: true },
                },
                mission: {
                    select: { id: true, title: true, reward: true },
                },
            },
            orderBy: { claimedAt: "desc" },
        });
        return res.json({
            success: true,
            message: "All users one-time mission progress fetched",
            data: (0, serializeBigInt_1.serializeBigInt)(progress),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getAllUsersOneTimeMissionProgress = getAllUsersOneTimeMissionProgress;
// 16) GET PARTICULAR USER MISSIONS (ADMIN ONLY)
const getUserMissionsByUserId = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "userId is required",
            });
        }
        const uid = BigInt(userId);
        const daily = await client_1.default.userDailyMissionProgress.findMany({
            where: { userId: uid },
            include: {
                mission: true,
            },
            orderBy: { lastClaimedAt: "desc" },
        });
        const oneTime = await client_1.default.userOneTimeMissionProgress.findMany({
            where: { userId: uid },
            include: {
                mission: true,
            },
            orderBy: { claimedAt: "desc" },
        });
        return res.json({
            success: true,
            message: "User mission data fetched successfully",
            dailyMissions: (0, serializeBigInt_1.serializeBigInt)(daily),
            oneTimeMissions: (0, serializeBigInt_1.serializeBigInt)(oneTime),
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getUserMissionsByUserId = getUserMissionsByUserId;
//# sourceMappingURL=adminGetterController.js.map