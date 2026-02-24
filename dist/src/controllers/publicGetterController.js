"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMarketplacePurchases = exports.getAllMarketplaceItems = exports.getLeaderboard = exports.getShield = exports.getMaterial = exports.getSword = exports.getAllShields = exports.getAllMaterials = exports.getAllSwords = void 0;
const client_ts_1 = __importDefault(require("../database/client.ts"));
const queryHelpers_ts_1 = require("../services/queryHelpers.ts");
const serializeBigInt_ts_1 = require("../services/serializeBigInt.ts");
// 1. GET /public/swords - All sword definitions
const getAllSwords = async (req, res) => {
    try {
        const { sortLevel, // 'asc' | 'desc'
        sortPower, // 'asc' | 'desc'
        sortUpgradeCost, // 'asc' | 'desc'
        sortSellingCost, // 'asc' | 'desc'
        sortCreatedAt, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "No swords found for in the game",
            });
        }
        // Build orderBy array dynamically
        const orderBy = [];
        if (sortLevel && ["asc", "desc"].includes(sortLevel)) {
            orderBy.push({ level: sortLevel });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ power: sortPower });
        }
        if (sortUpgradeCost &&
            ["asc", "desc"].includes(sortUpgradeCost)) {
            orderBy.push({ upgradeCost: sortUpgradeCost });
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
        const total = await client_ts_1.default.swordLevelDefinition.count();
        const swords = await client_ts_1.default.swordLevelDefinition.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                level: true,
                name: true,
                image: true,
                description: true,
                upgradeCost: true,
                sellingCost: true,
                successRate: true,
                power: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (swords.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No swords found in the game",
                data: [],
                total,
                page: pagination.page,
                limit: pagination.limit,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Swords fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(swords),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllSwords error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllSwords = getAllSwords;
// 2. GET /public/materials - All material types
const getAllMaterials = async (req, res) => {
    try {
        const { sortCost, // 'asc' | 'desc'
        sortPower, // 'asc' | 'desc'
        sortCode, // 'asc' | 'desc'
        sortCreatedAt, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "No materials found for  in the game",
            });
        }
        const orderBy = [];
        if (sortCost && ["asc", "desc"].includes(sortCost)) {
            orderBy.push({ cost: sortCost });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ power: sortPower });
        }
        if (sortCode && ["asc", "desc"].includes(sortCode)) {
            orderBy.push({ code: sortCode });
        }
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const total = await client_ts_1.default.materialType.count();
        const materials = await client_ts_1.default.materialType.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                image: true,
                cost: true,
                power: true,
                rarity: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (materials.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No materials found in the game",
                data: [],
                total,
                page: pagination.page,
                limit: pagination.limit,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Materials fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(materials),
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
// 3. GET /public/shields - All shield types
const getAllShields = async (req, res) => {
    try {
        const { sortCost, // 'asc' | 'desc'
        sortPower, // 'asc' | 'desc'
        sortCode, // 'asc' | 'desc'
        sortCreatedAt, // 'asc' | 'desc'
         } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "No shields found for in the game",
            });
        }
        const orderBy = [];
        if (sortCost && ["asc", "desc"].includes(sortCost)) {
            orderBy.push({ cost: sortCost });
        }
        if (sortPower && ["asc", "desc"].includes(sortPower)) {
            orderBy.push({ power: sortPower });
        }
        if (sortCode && ["asc", "desc"].includes(sortCode)) {
            orderBy.push({ code: sortCode });
        }
        if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt)) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        const total = await client_ts_1.default.shieldType.count();
        const shields = await client_ts_1.default.shieldType.findMany({
            orderBy,
            skip: pagination.skip,
            take: pagination.take,
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                image: true,
                cost: true,
                power: true,
                rarity: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (shields.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No shields found in the game",
                data: [],
                total,
                page: pagination.page,
                limit: pagination.limit,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Shields fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(shields),
            total,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllShields error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllShields = getAllShields;
// 4. GET /public/sword - Single sword by level or name
const getSword = async (req, res) => {
    try {
        const { level, name } = req.query;
        if (!level && !name) {
            return res.status(400).json({
                success: false,
                error: "Provide either 'level' or 'name' query parameter",
            });
        }
        let sword;
        if (level) {
            sword = await client_ts_1.default.swordLevelDefinition.findUnique({
                where: { level: Number(level) },
                select: {
                    id: true,
                    level: true,
                    name: true,
                    image: true,
                    description: true,
                    upgradeCost: true,
                    sellingCost: true,
                    successRate: true,
                    power: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        else if (name) {
            sword = await client_ts_1.default.swordLevelDefinition.findUnique({
                where: { name: name },
                select: {
                    id: true,
                    level: true,
                    name: true,
                    image: true,
                    description: true,
                    upgradeCost: true,
                    sellingCost: true,
                    successRate: true,
                    power: true,
                    createdAt: true,
                    updatedAt: true,
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
            message: "Sword fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(sword),
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
// 5. GET /public/material - Single material by id, code or name
const getMaterial = async (req, res) => {
    try {
        const { id, code, name } = req.query;
        if (!id && !code && !name) {
            return res.status(400).json({
                success: false,
                error: "Provide 'id', 'code' or 'name' query parameter",
            });
        }
        let material;
        if (id) {
            material = await client_ts_1.default.materialType.findUnique({
                where: { id: BigInt(id) },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    image: true,
                    cost: true,
                    power: true,
                    rarity: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        else if (code) {
            material = await client_ts_1.default.materialType.findUnique({
                where: { code: code },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    image: true,
                    cost: true,
                    power: true,
                    rarity: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        else if (name) {
            material = await client_ts_1.default.materialType.findUnique({
                where: { name: name },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    image: true,
                    cost: true,
                    power: true,
                    rarity: true,
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
            data: (0, serializeBigInt_ts_1.serializeBigInt)(material),
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
// 6. GET /public/shield - Single shield by id, code or name
const getShield = async (req, res) => {
    try {
        const { id, code, name } = req.query;
        if (!id && !code && !name) {
            return res.status(400).json({
                success: false,
                error: "Provide 'id', 'code' or 'name' query parameter",
            });
        }
        let shield;
        if (id) {
            shield = await client_ts_1.default.shieldType.findUnique({
                where: { id: BigInt(id) },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    image: true,
                    cost: true,
                    power: true,
                    rarity: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        else if (code) {
            shield = await client_ts_1.default.shieldType.findUnique({
                where: { code: code },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    image: true,
                    cost: true,
                    power: true,
                    rarity: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        else if (name) {
            shield = await client_ts_1.default.shieldType.findUnique({
                where: { name: name },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    image: true,
                    cost: true,
                    power: true,
                    rarity: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }
        if (!shield) {
            return res
                .status(404)
                .json({ success: false, error: "Shield not found in the game" });
        }
        return res.status(200).json({
            success: true,
            message: "Shield fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(shield),
        });
    }
    catch (error) {
        console.error("getShield error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getShield = getShield;
// 7)
const getLeaderboard = async (req, res) => {
    try {
        // ── Safe extraction of sortBy ───────────────────────────────────────
        let sortBy = "createdAt"; // default
        const sortByRaw = req.query.sortBy;
        if (typeof sortByRaw === "string" && sortByRaw.trim()) {
            sortBy = sortByRaw.trim();
        }
        else if (Array.isArray(sortByRaw) && sortByRaw.length > 0) {
            // take first value if someone sent multiple (common frontend mistake)
            sortBy = String(sortByRaw[0]).trim();
        }
        // ── Validate sort field ──────────────────────────────────────────────
        const validSortFields = [
            "totalSwords",
            "totalMaterials",
            "totalShields",
            "gold",
            "trustPoints",
            "totalPower",
            "createdAt",
        ];
        if (!validSortFields.includes(sortBy)) {
            // type assertion safe here
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
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "No data found in the game",
            });
        }
        // ── Fetch users (unchanged) ──────────────────────────────────────────
        const users = await client_ts_1.default.user.findMany({
            where: { isBanned: false },
            select: {
                id: true,
                name: true,
                createdAt: true,
                gold: true,
                trustPoints: true,
                swords: {
                    where: { isSolded: false },
                    select: { swordLevelDefinition: { select: { power: true } } },
                },
                materials: {
                    select: {
                        quantity: true,
                        material: { select: { power: true } },
                    },
                },
                shields: {
                    select: {
                        quantity: true,
                        shield: { select: { power: true } },
                    },
                },
            },
        });
        // ── Compute leaderboard data (unchanged) ─────────────────────────────
        const leaderboardData = users.map((u) => ({
            userId: u.id.toString(),
            name: u.name,
            createdAt: u.createdAt,
            gold: Number(u.gold),
            trustPoints: u.trustPoints,
            totalSwords: u.swords.length,
            totalMaterials: u.materials.reduce((sum, m) => sum + m.quantity, 0),
            totalShields: u.shields.reduce((sum, s) => sum + s.quantity, 0),
            totalPower: u.swords.reduce((sum, s) => sum + s.swordLevelDefinition.power, 0) +
                u.materials.reduce((sum, m) => sum + m.material.power * m.quantity, 0) +
                u.shields.reduce((sum, s) => sum + s.shield.power * s.quantity, 0),
        }));
        // ── Sort ─────────────────────────────────────────────────────────────
        leaderboardData.sort((a, b) => {
            let valA;
            let valB;
            // Type-safe access — we already validated sortBy
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
            message: "Leaderboard data fetched successfully",
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
// 8) all marketplace items
const getAllMarketplaceItems = async (req, res) => {
    try {
        const { itemType, isActive, isPurchased, sortPriceGold, sortCreatedAt } = req.query;
        /* ---------------- WHERE CLAUSE ---------------- */
        const where = {};
        if (itemType) {
            const allowedTypes = ["SWORD", "MATERIAL", "SHIELD"];
            if (!allowedTypes.includes(String(itemType))) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid itemType. Allowed: ${allowedTypes.join(", ")}`,
                });
            }
            where.itemType = itemType;
        }
        if (isActive !== undefined) {
            where.isActive = isActive === "true";
        }
        if (isPurchased !== undefined) {
            where.isPurchased = isPurchased === "true";
        }
        /* ---------------- ORDER BY ---------------- */
        const orderBy = [];
        if (sortCreatedAt && ["asc", "desc"].includes(String(sortCreatedAt))) {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        if (sortPriceGold && ["asc", "desc"].includes(String(sortPriceGold))) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        // Default sort → latest first
        if (orderBy.length === 0) {
            orderBy.push({ createdAt: "desc" });
        }
        /* ---------------- QUERY ---------------- */
        const items = await client_ts_1.default.marketplaceItem.findMany({
            where,
            orderBy,
            include: {
                swordLevelDefinition: true,
                material: true,
                shieldType: true,
            },
        });
        return res.status(200).json({
            success: true,
            message: "Marketplace items fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(items),
            total: items.length,
        });
    }
    catch (error) {
        console.error("getAllMarketplaceItems error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllMarketplaceItems = getAllMarketplaceItems;
// 9) Admin GET all marketplace purchases — optional itemType filter
const getAllMarketplacePurchases = async (req, res) => {
    try {
        const { type, // optional: 'SWORD' | 'MATERIAL' | 'SHIELD'
        sortType, sortPriceGold, sortPurchasedAt, } = req.query;
        const pagination = (0, queryHelpers_ts_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "No marketplace purchases found",
            });
        }
        // Optional type filter + validation
        let filterType;
        if (type) {
            const upper = type.toUpperCase();
            const valid = ["SWORD", "MATERIAL", "SHIELD"];
            if (!valid.includes(upper)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid item type. Allowed: ${valid.join(", ")}`,
                });
            }
            filterType = upper;
        }
        const where = {};
        if (filterType) {
            where.marketplaceItem = { itemType: filterType };
        }
        const orderBy = [];
        if (sortType && ["asc", "desc"].includes(sortType)) {
            orderBy.push({ marketplaceItem: { itemType: sortType } });
        }
        if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold)) {
            orderBy.push({ priceGold: sortPriceGold });
        }
        if (sortPurchasedAt &&
            ["asc", "desc"].includes(sortPurchasedAt)) {
            orderBy.push({ purchasedAt: sortPurchasedAt });
        }
        if (orderBy.length === 0) {
            orderBy.push({ purchasedAt: "desc" });
        }
        const totalItems = await client_ts_1.default.marketplacePurchase.count({ where });
        const purchases = await client_ts_1.default.marketplacePurchase.findMany({
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
                marketplaceItem: {
                    select: {
                        id: true,
                        itemType: true,
                        priceGold: true,
                        isActive: true,
                        isPurchased: true,
                        createdAt: true,
                        updatedAt: true,
                        swordLevelDefinition: {
                            select: { level: true, name: true, image: true, power: true },
                        },
                        material: {
                            select: { name: true, rarity: true, image: true, cost: true },
                        },
                        shieldType: {
                            select: { name: true, rarity: true, image: true, cost: true },
                        },
                    },
                },
            },
        });
        return res.status(200).json({
            success: true,
            message: "Maretplace purchases fetched successfully",
            data: (0, serializeBigInt_ts_1.serializeBigInt)(purchases),
            total: totalItems,
            page: pagination.page,
            limit: pagination.limit,
        });
    }
    catch (error) {
        console.error("getAllMarketplacePurchases error:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
};
exports.getAllMarketplacePurchases = getAllMarketplacePurchases;
//# sourceMappingURL=publicGetterController.js.map