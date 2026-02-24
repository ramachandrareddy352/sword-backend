"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUserByEmail = exports.getAdminConfig = exports.getAllUsersVouchers = exports.getAllCustomerSupports = exports.getAllUsersShields = exports.getAllUsersSwords = exports.getAllUsersMaterials = exports.getAllUsers = void 0;
exports.getAllUsersGifts = getAllUsersGifts;
const client_ts_1 = __importDefault(require("../database/client.ts"));
const queryHelpers_ts_1 = require("../services/queryHelpers.ts");
const serializeBigInt_ts_1 = require("../services/serializeBigInt.ts");
// 1) Get the basic information of all users using pagination
const getAllUsers = async (req, res) => {
    try {
        const { sortByBanned, // 'true' | 'false' string
        sortGold, // 'asc' | 'desc'
        sortTrustPoints, // 'asc' | 'desc'
        sortMissionsDone, // 'asc' | 'desc'
        sortRegisteredDate, // 'asc' | 'desc'
        sortAdsViewed, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        // If page <= 0 → return empty result with metadata
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "There are no users in game",
            });
        }
        // Build filter (only for banned status)
        const where = {};
        if (sortByBanned !== undefined &&
            ["true", "false"].includes(sortByBanned)) {
            where.isBanned = sortByBanned === "true";
        }
        // Build sorting
        const orderBy = [];
        if (sortRegisteredDate &&
            ["asc", "desc"].includes(sortRegisteredDate)) {
            orderBy.push({ createdAt: sortRegisteredDate });
        }
        if (sortGold && ["asc", "desc"].includes(sortGold)) {
            orderBy.push({ gold: sortGold });
        }
        if (sortTrustPoints &&
            ["asc", "desc"].includes(sortTrustPoints)) {
            orderBy.push({ trustPoints: sortTrustPoints });
        }
        if (sortMissionsDone &&
            ["asc", "desc"].includes(sortMissionsDone)) {
            orderBy.push({ totalMissionsDone: sortMissionsDone });
        }
        if (sortAdsViewed && ["asc", "desc"].includes(sortAdsViewed)) {
            orderBy.push({ totalAdsViewed: sortAdsViewed });
        }
        // Default sort if nothing provided (newest first)
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Get total count
        const totalUsers = await client_ts_1.default.user.count({ where });
        // Fetch paginated users
        const users = await client_ts_1.default.user.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                email: true,
                name: true,
                gold: true,
                trustPoints: true,
                createdAt: true,
                lastReviewed: true,
                lastLoginAt: true,
                emailVerified: true,
                oneDayAdsViewed: true,
                totalAdsViewed: true,
                totalMissionsDone: true,
                isBanned: true,
                anvilSwordId: true,
                anvilShieldId: true,
            },
        });
        if (users.length === 0) {
            return res.status(200).json({
                success: true,
                message: "There are no users in Game",
                data: [],
                page: Number(req.query.page || 0),
                limit: Number(req.query.limit || 20),
                total: 0,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Users data fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(users),
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
// 2) Admin GET all users' materials with sorting (power, gold cost), optional rarity filter, pagination
const getAllUsersMaterials = async (req, res) => {
    try {
        const { sortCreatedAt, // 'asc' | 'desc'
        sortPower, // 'asc' | 'desc'
        sortGoldCost, // 'asc' | 'desc'
        rarity, // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' (filter)
        sold, // true | false
         } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "There are no materails in the game",
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
                    error: "Invalid rarity value. Must be one of: " + validRarities.join(", "),
                });
            }
            filterRarity = upperRarity;
        }
        // Build where clause
        const where = {};
        if (filterRarity) {
            where.material = { rarity: filterRarity };
        }
        // SOLD FILTER
        if (sold === "true") {
            where.soldedQuantity = { gt: 0 };
        }
        if (sold === "false") {
            where.soldedQuantity = 0;
        }
        // Build orderBy
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ material: { createdAt: sortCreatedAt } });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ material: { power: sortPower } });
        }
        if (sortGoldCost && ["asc", "desc"].includes(sortGoldCost)) {
            orderBy.push({ material: { cost: sortGoldCost } });
        }
        // Default sort if none: createdAt desc
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Get total count
        const totalItems = await client_ts_1.default.userMaterial.count({ where });
        // Fetch data
        const materials = await client_ts_1.default.userMaterial.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                userId: true,
                quantity: true,
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
        });
        return res.status(200).json({
            success: true,
            data: (0, serializeBigInt_ts_1.serializeBigInt)(materials),
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
// 3) Admin GET all users' swords with sorting (level, power), pagination
// 3) Admin GET all users' swords with sorting (level, power), pagination
const getAllUsersSwords = async (req, res) => {
    try {
        const { sortCreatedAt, // 'asc' | 'desc'
        sortLevel, // 'asc' | 'desc'
        sortPower, // 'asc' | 'desc'
        sold, // 'true' | 'false' | undefined (all)
        page = 1, limit = 20, } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Build where clause
        const where = {};
        // Sold filter
        if (sold === "true")
            where.isSolded = true;
        if (sold === "false")
            where.isSolded = false;
        // undefined → show all
        // Build orderBy array (multiple sorts supported)
        const orderBy = [];
        // Direct fields on UserSword
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt }); // ← FIXED: no nesting
        }
        if (sortLevel && ["asc", "desc"].includes(sortLevel)) {
            orderBy.push({ level: sortLevel });
        }
        // Nested relation fields
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ swordLevelDefinition: { power: sortPower } });
        }
        // Default sort if none provided
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Get total count
        const totalItems = await client_ts_1.default.userSword.count({ where });
        // Fetch swords with user details
        const swords = await client_ts_1.default.userSword.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                code: true,
                level: true,
                isOnAnvil: true,
                isSolded: true,
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
        });
        return res.status(200).json({
            success: true,
            message: "Users' swords fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(swords),
            total: totalItems,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllUsersSwords error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllUsersSwords = getAllUsersSwords;
// 4) Admin GET all users' shields with optional rarity filter + sorting (rarity, power, cost), pagination
const getAllUsersShields = async (req, res) => {
    try {
        const { sortCreatedAt, // 'asc' | 'desc'
        rarity, // optional: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
        sortRarity, // 'asc' | 'desc'
        sortPower, // 'asc' | 'desc'
        sortCost, // 'asc' | 'desc'
        sold, // true | false
         } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "There are no shields in the game",
            });
        }
        // Optional rarity filter + validation
        let filterRarity;
        if (rarity) {
            const upper = rarity.toUpperCase();
            const valid = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
            if (!valid.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid rarity. Allowed: ${valid.join(", ")}`,
                });
            }
            filterRarity = upper;
        }
        // Build where clause
        const where = {};
        if (filterRarity) {
            where.shield = { rarity: filterRarity };
        }
        // SOLD FILTER
        if (sold === "true")
            where.soldedQuantity = { gt: 0 };
        if (sold === "false")
            where.soldedQuantity = 0;
        // Build orderBy
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ material: { createdAt: sortCreatedAt } });
        }
        if (sortRarity && ["asc", "desc"].includes(sortRarity)) {
            orderBy.push({ shield: { rarity: sortRarity } });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ shield: { power: sortPower } });
        }
        if (sortCost && ["asc", "desc"].includes(sortCost)) {
            orderBy.push({ shield: { cost: sortCost } });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const totalItems = await client_ts_1.default.userShield.count({ where });
        const shields = await client_ts_1.default.userShield.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                userId: true,
                quantity: true,
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
                shield: {
                    select: {
                        id: true,
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
        });
        return res.status(200).json({
            success: true,
            message: "Users shields fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(shields),
            total: totalItems,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllUsersShields error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllUsersShields = getAllUsersShields;
// 5) Admin GET all users' gifts with optional status filter, optional itemType filter (gifts containing that item type), sorting (createdAt, status), pagination
// Example: in adminGetterController.ts or wherever getAllUsersGifts is defined
async function getAllUsersGifts(req, res) {
    try {
        const { status, // optional: "PENDING" | "CLAIMED" | "CANCELLED"
        itemType, // NEW: filter by GiftItemType (GOLD, TRUST_POINTS, MATERIAL, SWORD, SHIELD)
        sortCreatedAt, // "asc" | "desc"
        sortItemType, // NEW: "asc" | "desc" — sort by first item's type
        page = 1, limit = 12, } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Build where clause
        const where = {};
        // Status filter
        if (status &&
            ["PENDING", "CLAIMED", "CANCELLED"].includes(status)) {
            where.status = status;
        }
        // Item Type filter (has at least one item of this type)
        if (itemType &&
            ["GOLD", "TRUST_POINTS", "MATERIAL", "SWORD", "SHIELD"].includes(itemType)) {
            where.items = {
                some: {
                    type: itemType,
                },
            };
        }
        // Build orderBy (for direct fields)
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        // Default sort if none provided
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Fetch gifts with deep relations
        const gifts = await client_ts_1.default.userGift.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            include: {
                items: {
                    select: {
                        id: true,
                        type: true,
                        amount: true,
                        // Material full details
                        material: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                image: true,
                                description: true,
                                cost: true,
                                power: true,
                                rarity: true,
                            },
                        },
                        materialId: true,
                        materialRarity: true,
                        // Sword full details
                        swordLevel: true,
                        swordLevelDefinition: {
                            select: {
                                id: true,
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
                        // Shield full details
                        shield: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                image: true,
                                description: true,
                                cost: true,
                                power: true,
                                rarity: true,
                            },
                        },
                        shieldId: true,
                        shieldRarity: true,
                    },
                },
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
            },
        });
        // NEW: In-memory sort by first item's type (if requested)
        let finalGifts = gifts;
        if (sortItemType && ["asc", "desc"].includes(sortItemType)) {
            finalGifts = [...gifts].sort((a, b) => {
                var _a, _b;
                const typeA = ((_a = a.items[0]) === null || _a === void 0 ? void 0 : _a.type) || "NONE";
                const typeB = ((_b = b.items[0]) === null || _b === void 0 ? void 0 : _b.type) || "NONE";
                if (sortItemType === "asc") {
                    return typeA.localeCompare(typeB);
                }
                else {
                    return typeB.localeCompare(typeA);
                }
            });
        }
        // Total count (before in-memory sort)
        const totalItems = await client_ts_1.default.userGift.count({ where });
        return res.status(200).json({
            success: true,
            message: "Gifts fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(finalGifts),
            total: totalItems,
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
}
// 6) Admin GET all customer support — no rarity/type filter (only sorting), added message
const getAllCustomerSupports = async (req, res) => {
    try {
        const { sortPriority, sortCategory, sortCreatedAt } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
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
        const totalItems = await client_ts_1.default.customerSupport.count();
        const supports = await client_ts_1.default.customerSupport.findMany({
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
                        gold: true,
                        trustPoints: true,
                    },
                },
            },
        });
        return res.status(200).json({
            success: true,
            message: "Users complaints fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(supports),
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
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
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
        const totalItems = await client_ts_1.default.userVoucher.count({ where });
        const vouchers = await client_ts_1.default.userVoucher.findMany({
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
                        isBanned: true,
                        gold: true,
                        trustPoints: true,
                    },
                },
            },
        });
        return res.status(200).json({
            success: true,
            message: "Usres vouchers fetched successfullt",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(vouchers),
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
// 8) admin config data
const getAdminConfig = async (req, res) => {
    try {
        // Fetch the single AdminConfig row (id is fixed to 1 as per your schema)
        const config = await client_ts_1.default.adminConfig.findUnique({
            where: { id: 1 }, // BigInt literal (1n)
            select: {
                id: true,
                maxDailyAds: true,
                maxDailyMissions: true,
                defaultTrustPoints: true,
                minVoucherGold: true,
                maxVoucherGold: true,
                voucherExpiryDays: true,
                expiryallowVoucherCancel: true,
                adminEmailId: true,
                updatedAt: true,
            },
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
            data: (0, serializeBigInt_ts_1.serializeBigInt)(config),
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
        const user = await client_ts_1.default.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                email: true,
                name: true,
                isBanned: true,
                emailVerified: true,
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
            data: {
                id: user.id.toString(), // convert BigInt to string for JSON
                email: user.email,
                name: user.name || "Unnamed User",
                isBanned: user.isBanned,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt.toISOString(),
                // gold: user.gold ? Number(user.gold) : undefined,
                // trustPoints: user.trustPoints,
            },
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
//# sourceMappingURL=adminGetterController.js.map