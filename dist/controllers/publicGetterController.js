"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppVersionCheck = exports.getAdminConfig = exports.getPurchasedShields = exports.getPurchasedMaterials = exports.getPurchasedSwords = exports.getLeaderboard = exports.getMaterial = exports.getAllMaterials = exports.getSword = exports.getAllSwords = void 0;
const client_1 = __importDefault(require("../database/client"));
const queryHelpers_1 = require("../services/queryHelpers");
const serializeBigInt_1 = require("../services/serializeBigInt");
// 1) All sword definitions (paginated, basic info + optional relations)
const getAllSwords = async (req, res) => {
    try {
        const { sortLevel, // 'asc' | 'desc'
        includeRelations, // 'true' to include relations
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        if (sortLevel && ["asc", "desc"].includes(sortLevel)) {
            orderBy.push({ level: sortLevel });
        }
        if (orderBy.length === 0) {
            orderBy.push({ level: "asc" });
        }
        const total = await client_1.default.swordLevelDefinition.count();
        const swords = await client_1.default.swordLevelDefinition.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            // Use include (recommended when you want relations)
            include: includeRelations === "true"
                ? {
                    synthesisRequirements: {
                        select: {
                            material: true, // Return full material data in synthesis
                            requiredQuantity: true,
                        },
                    },
                    upgradeDrops: {
                        select: {
                            material: true,
                            dropPercentage: true,
                            minQuantity: true,
                            maxQuantity: true,
                        },
                    },
                }
                : undefined,
        });
        return res.status(200).json({
            success: true,
            message: "Swords fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(swords),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllSwords error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getAllSwords = getAllSwords;
// 2) Single sword by level or name (full details with relations)
const getSword = async (req, res) => {
    try {
        const { level, name, includeRelations, // 'true' to include relations
         } = req.query;
        if (!level && !name) {
            return res.status(400).json({
                success: false,
                error: "Provide either 'level' or 'name' query parameter",
            });
        }
        let sword;
        if (level) {
            sword = await client_1.default.swordLevelDefinition.findUnique({
                where: { level: Number(level) },
                include: includeRelations === "true"
                    ? {
                        synthesisRequirements: {
                            select: {
                                material: true,
                                requiredQuantity: true,
                            },
                        },
                        upgradeDrops: {
                            select: {
                                material: true,
                                dropPercentage: true,
                                minQuantity: true,
                                maxQuantity: true,
                            },
                        },
                    }
                    : undefined,
            });
        }
        else if (name) {
            sword = await client_1.default.swordLevelDefinition.findUnique({
                where: { name: name },
                include: {
                    synthesisRequirements: {
                        select: {
                            material: true,
                            requiredQuantity: true,
                        },
                    },
                    upgradeDrops: {
                        select: {
                            material: true,
                            dropPercentage: true,
                            minQuantity: true,
                            maxQuantity: true,
                        },
                    },
                },
            });
        }
        if (!sword) {
            return res
                .status(404)
                .json({ success: false, error: "Sword not found in the game" });
        }
        return res.status(200).json({
            success: true,
            message: "Sword details fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(sword),
        });
    }
    catch (error) {
        console.error("getSword error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getSword = getSword;
// 3) All materials (paginated, basic info)
const getAllMaterials = async (req, res) => {
    try {
        const { rarity, // optional filter: COMMON | RARE | EPIC | LEGENDARY | MYTHIC
        sortBuyingCost, // 'asc' | 'desc'
        sortSellingCost, // 'asc' | 'desc'
        sortCreatedAt, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // Build where clause for rarity filter
        const where = {};
        if (rarity) {
            const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
            const upperRarity = rarity.toUpperCase();
            if (!validRarities.includes(upperRarity)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid rarity value. Allowed: ${validRarities.join(", ")}`,
                });
            }
            where.rarity = upperRarity;
        }
        // Build orderBy array
        const orderBy = [];
        if (sortBuyingCost && ["asc", "desc"].includes(sortBuyingCost)) {
            orderBy.push({ buyingCost: sortBuyingCost });
        }
        if (sortSellingCost &&
            ["asc", "desc"].includes(sortSellingCost)) {
            orderBy.push({ sellingCost: sortSellingCost });
        }
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        // Default sort if nothing provided
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        // Count total (with filter applied)
        const total = await client_1.default.material.count({ where });
        const materials = await client_1.default.material.findMany({
            where,
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
        });
        if (materials.length === 0) {
            return res.status(200).json({
                success: true,
                message: rarity
                    ? `No ${rarity} materials found in the game`
                    : "No materials found in the game",
                data: [],
                total,
                page: pagination.page,
                limit: pagination.limit,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Materials fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(materials),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllMaterials error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllMaterials = getAllMaterials;
// 4) Single material by id or name
const getMaterial = async (req, res) => {
    try {
        const { id, name } = req.query;
        if (!id && !name) {
            return res.status(400).json({
                success: false,
                error: "Provide 'id', 'code' or 'name' query parameter",
            });
        }
        let material;
        if (id) {
            material = await client_1.default.material.findUnique({
                where: { id: BigInt(id) },
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
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        else if (name) {
            material = await client_1.default.material.findUnique({
                where: { name: name },
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
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        if (!material) {
            return res
                .status(404)
                .json({ success: false, error: "Material not found in the game" });
        }
        return res.status(200).json({
            success: true,
            message: "Material fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(material),
        });
    }
    catch (error) {
        console.error("getMaterial error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getMaterial = getMaterial;
// 5) Updated leaderboard with new fields
const getLeaderboard = async (req, res) => {
    try {
        // ── Safe extraction of sortBy ───────────────────────────────────────
        let sortBy = "totalSwords"; // default to missions or gold, etc.
        const sortByRaw = req.query.sortBy;
        if (typeof sortByRaw === "string" && sortByRaw.trim()) {
            sortBy = sortByRaw.trim();
        }
        else if (Array.isArray(sortByRaw) && sortByRaw.length > 0) {
            sortBy = String(sortByRaw[0]).trim();
        }
        // ── Validate sort field ──────────────────────────────────────────────
        const validSortFields = [
            "totalSwords",
            "totalMaterials",
            "totalShields",
            "gold",
            "trustPoints",
            "totalAdsViewed",
            "totalMissionsDone",
            "createdAt",
        ];
        if (!validSortFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                error: `Invalid sortBy field. Allowed: ${validSortFields.join(", ")}`,
            });
        }
        // ── Order (asc / desc) ───────────────────────────────────────────────
        let order = "desc";
        const orderRaw = req.query.order;
        if (typeof orderRaw === "string" &&
            (orderRaw === "asc" || orderRaw === "desc")) {
            order = orderRaw;
        }
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        // ── Fetch users (non-banned) ─────────────────────────────────────────
        const users = await client_1.default.user.findMany({
            where: { isBanned: false },
            select: {
                id: true,
                name: true,
                createdAt: true,
                gold: true,
                trustPoints: true,
                totalShields: true,
                totalAdsViewed: true,
                totalMissionsDone: true,
                swords: {
                    select: { unsoldQuantity: true },
                },
                materials: {
                    select: { unsoldQuantity: true },
                },
            },
        });
        // ── Compute leaderboard data ─────────────────────────────────────────
        const leaderboardData = users.map((u) => ({
            userId: u.id.toString(),
            name: u.name,
            createdAt: u.createdAt,
            gold: Number(u.gold),
            trustPoints: u.trustPoints,
            totalShields: u.totalShields,
            totalAdsViewed: u.totalAdsViewed,
            totalMissionsDone: u.totalMissionsDone,
            totalSwords: u.swords.reduce((sum, s) => sum + s.unsoldQuantity, 0),
            totalMaterials: u.materials.reduce((sum, m) => sum + m.unsoldQuantity, 0),
        }));
        // ── Sort ─────────────────────────────────────────────────────────────
        leaderboardData.sort((a, b) => {
            let valA;
            let valB;
            if (sortBy === "createdAt") {
                valA = a.createdAt;
                valB = b.createdAt;
                return order === "desc"
                    ? valB.getTime() - valA.getTime()
                    : valA.getTime() - valB.getTime();
            }
            // All other fields are numbers
            valA = a[sortBy];
            valB = b[sortBy];
            return order === "desc" ? valB - valA : valA - valB;
        });
        // ── Paginate ─────────────────────────────────────────────────────────
        const start = pagination.skip;
        const paginated = leaderboardData.slice(start, start + pagination.take);
        return res.json({
            success: true,
            data: paginated,
            total: leaderboardData.length,
            page: pagination.page,
            limit: pagination.limit,
            message: "Leaderboard fetched successfully",
        });
    }
    catch (err) {
        console.error("getLeaderboard error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getLeaderboard = getLeaderboard;
// 6)  solded swords list
const getPurchasedSwords = async (req, res) => {
    try {
        const { sortPurchasedAt, // 'asc' | 'desc' (default: desc)
        sortPriceGold, // 'asc' | 'desc' (price per sword)
        sortLevel, // 'asc' | 'desc' (sword level)
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        // Purchased at (time)
        if (sortPurchasedAt &&
            ["asc", "desc"].includes(sortPurchasedAt)) {
            orderBy.push({ purchasedAt: sortPurchasedAt });
        }
        // Price gold (per sword)
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        // Sword level
        if (sortLevel && ["asc", "desc"].includes(sortLevel)) {
            orderBy.push({
                swordLevelDefinition: { level: sortLevel },
            });
        }
        // Default: newest first
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const total = await client_1.default.swordMarketplacePurchase.count();
        const purchases = await client_1.default.swordMarketplacePurchase.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileLogo: true,
                        isBanned: true,
                    },
                },
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
        return res.json({
            success: true,
            message: "Purchased swords list fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(purchases),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getPurchasedSwords error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getPurchasedSwords = getPurchasedSwords;
// 7)  solded materials list
const getPurchasedMaterials = async (req, res) => {
    try {
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
        // Purchased at
        if (["asc", "desc"].includes(sortPurchasedAt)) {
            orderBy.push({ purchasedAt: sortPurchasedAt });
        }
        // Price gold (total)
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        // Material ID
        if (sortMaterialId && ["asc", "desc"].includes(sortMaterialId)) {
            orderBy.push({ materialId: sortMaterialId });
        }
        // Default: newest first
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const total = await client_1.default.materialMarketplacePurchase.count();
        const purchases = await client_1.default.materialMarketplacePurchase.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileLogo: true,
                        isBanned: true,
                    },
                },
                material: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        rarity: true,
                        image: true,
                    },
                },
                quantity: true,
                priceGold: true,
                purchasedAt: true,
            },
        });
        return res.json({
            success: true,
            message: "Purchased materials list fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(purchases),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getPurchasedMaterials error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getPurchasedMaterials = getPurchasedMaterials;
// 8)  solded shields list
const getPurchasedShields = async (req, res) => {
    try {
        const { sortPurchasedAt = "desc", // 'asc' | 'desc'
        sortPriceGold, // 'asc' | 'desc' — total
         } = req.query;
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
            });
        }
        const orderBy = [];
        // Purchased at
        if (["asc", "desc"].includes(sortPurchasedAt)) {
            orderBy.push({ purchasedAt: sortPurchasedAt });
        }
        // Price gold (total)
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        // Default: newest first
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const total = await client_1.default.shieldMarketplacePurchase.count();
        const purchases = await client_1.default.shieldMarketplacePurchase.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileLogo: true,
                        isBanned: true,
                        totalShields: true,
                    },
                },
                quantity: true,
                priceGold: true,
                purchasedAt: true,
            },
        });
        return res.json({
            success: true,
            message: "Purchased shields list fetched successfully",
            data: (0, serializeBigInt_1.serializeBigInt)(purchases),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (err) {
        console.error("getPurchasedShields error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getPurchasedShields = getPurchasedShields;
// 9) admin config data
const getAdminConfig = async (_req, res) => {
    try {
        // Fetch the single AdminConfig row (id is fixed to 1 as per your schema)
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: 1n }, // BigInt literal (1n)
            select: {
                // ── Existing Shield Config ───────────────────────────────────────
                shieldGoldPrice: true,
                maxDailyShieldAds: true,
                maxShieldHold: true,
                shieldActiveOnMarketplace: true,
                // ── Default values for new users ─────────────────────────────────
                defaultTrustPoints: true,
                defaultGold: true,
                // ── Sword & Gold Ads ─────────────────────────────────────────────
                maxDailySwordAds: true,
                swordLevelReward: true,
                maxDailyGoldAds: true,
                goldReward: true,
                // ── Voucher settings ─────────────────────────────────────────────
                minVoucherGold: true,
                maxVoucherGold: true,
                voucherExpiryDays: true,
                expiryAllow: true,
                // ── Shopping permission ──────────────────────────────────────────
                isShoppingAllowed: true,
                // ── NEW: App Version & Update Control Fields ─────────────────────
                minRequiredVersion: true, // e.g. "1.2.0"
                latestVersion: true, // e.g. "1.5.3"
                mandatoryUpdateMessage: true, // Message for forced update
                notificationUpdateMessage: true, // Message for optional update
                playStoreLink: true, // Google Play Store URL
                appStoreLink: true, // Apple App Store URL
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
function parseVersion(version) {
    const parts = version.split(".").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
        throw new Error("Invalid version format. Expected: major.minor.patch");
    }
    return [parts[0], parts[1], parts[2]];
}
// GET /public/version-check?version=1.2.3&platform=android
const getAppVersionCheck = async (req, res) => {
    try {
        const { version, platform } = req.query;
        if (!version || typeof version !== "string") {
            return res.status(400).json({
                success: false,
                error: "version query parameter is required (e.g., '1.2.3')",
            });
        }
        if (!platform || !["android", "ios"].includes(platform)) {
            return res.status(400).json({
                success: false,
                error: "platform must be 'android' or 'ios'",
            });
        }
        // Fetch config (cache if needed in production)
        const config = await client_1.default.adminConfig.findUnique({
            where: { id: BigInt(1) },
            select: {
                minRequiredVersion: true,
                latestVersion: true,
                mandatoryUpdateMessage: true,
                notificationUpdateMessage: true,
                playStoreLink: true,
                appStoreLink: true,
            },
        });
        if (!config || !config.minRequiredVersion || !config.latestVersion) {
            return res.status(500).json({
                success: false,
                error: "Version configuration not set up",
            });
        }
        let userVersionTuple;
        try {
            userVersionTuple = parseVersion(version);
        }
        catch {
            return res.status(400).json({
                success: false,
                error: "Invalid version format. Use major.minor.patch (e.g., '1.2.3')",
            });
        }
        const minRequiredTuple = parseVersion(config.minRequiredVersion);
        const latestTuple = parseVersion(config.latestVersion);
        const link = platform === "android" ? config.playStoreLink : config.appStoreLink;
        if (userVersionTuple < minRequiredTuple) {
            return res.json({
                success: true,
                required: true,
                message: config.mandatoryUpdateMessage ||
                    "Your app version is outdated. Please update to continue playing.",
                link: link || null,
            });
        }
        else if (userVersionTuple < latestTuple) {
            return res.json({
                success: true,
                required: false,
                message: config.notificationUpdateMessage ||
                    "A new version is available! Update for the latest features.",
                link: link || null,
            });
        }
        else {
            return res.json({
                success: true,
                upToDate: true,
            });
        }
    }
    catch (err) {
        console.error("getAppVersionCheck error:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
};
exports.getAppVersionCheck = getAppVersionCheck;
//# sourceMappingURL=publicGetterController.js.map