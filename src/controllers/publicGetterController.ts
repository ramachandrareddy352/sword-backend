import type { Request, Response } from "express";
import prisma from "../database/client.ts";
import { getPagination } from "../services/queryHelpers.ts";
import { serializeBigInt } from "../services/serializeBigInt.ts";
import { MarketplaceItemType } from "@prisma/client";

// 1. GET /public/swords - All sword definitions
export const getAllSwords = async (req: Request, res: Response) => {
  try {
    const {
      sortLevel, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortUpgradeCost, // 'asc' | 'desc'
      sortSellingCost, // 'asc' | 'desc'
      sortCreatedAt, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "No swords found for in the game",
      });
    }

    // Build orderBy array dynamically
    const orderBy: any[] = [];

    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({ level: sortLevel });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ power: sortPower });
    }
    if (
      sortUpgradeCost &&
      ["asc", "desc"].includes(sortUpgradeCost as string)
    ) {
      orderBy.push({ upgradeCost: sortUpgradeCost });
    }
    if (
      sortSellingCost &&
      ["asc", "desc"].includes(sortSellingCost as string)
    ) {
      orderBy.push({ sellingCost: sortSellingCost });
    }
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    // Default sort if nothing provided
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const total = await prisma.swordLevelDefinition.count();

    const swords = await prisma.swordLevelDefinition.findMany({
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
      data: serializeBigInt(swords),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllSwords error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 2. GET /public/materials - All material types
export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    const {
      sortCost, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortCode, // 'asc' | 'desc'
      sortCreatedAt, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "No materials found for  in the game",
      });
    }

    const orderBy: any[] = [];

    if (sortCost && ["asc", "desc"].includes(sortCost as string)) {
      orderBy.push({ cost: sortCost });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ power: sortPower });
    }
    if (sortCode && ["asc", "desc"].includes(sortCode as string)) {
      orderBy.push({ code: sortCode });
    }
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const total = await prisma.materialType.count();

    const materials = await prisma.materialType.findMany({
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
      data: serializeBigInt(materials),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllMaterials error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 3. GET /public/shields - All shield types
export const getAllShields = async (req: Request, res: Response) => {
  try {
    const {
      sortCost, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortCode, // 'asc' | 'desc'
      sortCreatedAt, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "No shields found for in the game",
      });
    }

    const orderBy: any[] = [];

    if (sortCost && ["asc", "desc"].includes(sortCost as string)) {
      orderBy.push({ cost: sortCost });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ power: sortPower });
    }
    if (sortCode && ["asc", "desc"].includes(sortCode as string)) {
      orderBy.push({ code: sortCode });
    }
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const total = await prisma.shieldType.count();

    const shields = await prisma.shieldType.findMany({
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
      data: serializeBigInt(shields),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllShields error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 4. GET /public/sword - Single sword by level or name
export const getSword = async (req: Request, res: Response) => {
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
      sword = await prisma.swordLevelDefinition.findUnique({
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
    } else if (name) {
      sword = await prisma.swordLevelDefinition.findUnique({
        where: { name: name as string },
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
      data: serializeBigInt(sword),
    });
  } catch (error) {
    console.error("getSword error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 5. GET /public/material - Single material by id, code or name
export const getMaterial = async (req: Request, res: Response) => {
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
      material = await prisma.materialType.findUnique({
        where: { id: BigInt(id as string) },
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
    } else if (code) {
      material = await prisma.materialType.findUnique({
        where: { code: code as string },
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
    } else if (name) {
      material = await prisma.materialType.findUnique({
        where: { name: name as string },
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
      data: serializeBigInt(material),
    });
  } catch (error) {
    console.error("getMaterial error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 6. GET /public/shield - Single shield by id, code or name
export const getShield = async (req: Request, res: Response) => {
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
      shield = await prisma.shieldType.findUnique({
        where: { id: BigInt(id as string) },
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
    } else if (code) {
      shield = await prisma.shieldType.findUnique({
        where: { code: code as string },
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
    } else if (name) {
      shield = await prisma.shieldType.findUnique({
        where: { name: name as string },
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
      data: serializeBigInt(shield),
    });
  } catch (error) {
    console.error("getShield error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 7)
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    // ── Safe extraction of sortBy ───────────────────────────────────────
    let sortBy: string = "createdAt"; // default
    const sortByRaw = req.query.sortBy;

    if (typeof sortByRaw === "string" && sortByRaw.trim()) {
      sortBy = sortByRaw.trim();
    } else if (Array.isArray(sortByRaw) && sortByRaw.length > 0) {
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
    ] as const;

    if (!validSortFields.includes(sortBy as any)) {
      // type assertion safe here
      return res.status(400).json({
        success: false,
        error: `Invalid sortBy field. Allowed: ${validSortFields.join(", ")}`,
      });
    }

    // ── Order (asc / desc) ───────────────────────────────────────────────
    let order: "asc" | "desc" = "desc";
    const orderRaw = req.query.order;
    if (
      typeof orderRaw === "string" &&
      (orderRaw === "asc" || orderRaw === "desc")
    ) {
      order = orderRaw;
    }

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "No data found in the game",
      });
    }

    // ── Fetch users (unchanged) ──────────────────────────────────────────
    const users = await prisma.user.findMany({
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
      totalPower:
        u.swords.reduce((sum, s) => sum + s.swordLevelDefinition.power, 0) +
        u.materials.reduce((sum, m) => sum + m.material.power * m.quantity, 0) +
        u.shields.reduce((sum, s) => sum + s.shield.power * s.quantity, 0),
    }));

    // ── Sort ─────────────────────────────────────────────────────────────
    leaderboardData.sort((a, b) => {
      let valA: number | Date;
      let valB: number | Date;

      // Type-safe access — we already validated sortBy
      if (sortBy === "createdAt") {
        valA = a.createdAt;
        valB = b.createdAt;
        return order === "desc"
          ? valB.getTime() - valA.getTime()
          : valA.getTime() - valB.getTime();
      }

      // All other fields are numbers
      valA = a[sortBy as keyof typeof a] as number;
      valB = b[sortBy as keyof typeof a] as number;

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
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 8) all marketplace items
export const getAllMarketplaceItems = async (req: Request, res: Response) => {
  try {
    const { itemType, isActive, isPurchased, sortPriceGold, sortCreatedAt } =
      req.query;

    /* ---------------- WHERE CLAUSE ---------------- */
    const where: any = {};

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
    const orderBy: any[] = [];

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
    const items = await prisma.marketplaceItem.findMany({
      where,
      orderBy,
      include: {
        swordLevelDefinition: {
          select: { id: true, level: true, name: true },
        },
        material: {
          select: { id: true, name: true, rarity: true },
        },
        shieldType: {
          select: { id: true, name: true, rarity: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Marketplace items fetched successfully",
      data: serializeBigInt(items),
      total: items.length,
    });
  } catch (error) {
    console.error("getAllMarketplaceItems error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 9) Admin GET all marketplace purchases — optional itemType filter
export const getAllMarketplacePurchases = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      type, // optional: 'SWORD' | 'MATERIAL' | 'SHIELD'
      sortType,
      sortPriceGold,
      sortPurchasedAt,
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "No marketplace purchases found",
      });
    }

    // Optional type filter + validation
    let filterType: MarketplaceItemType | undefined;
    if (type) {
      const upper = (type as string).toUpperCase();
      const valid = ["SWORD", "MATERIAL", "SHIELD"];
      if (!valid.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid item type. Allowed: ${valid.join(", ")}`,
        });
      }
      filterType = upper as MarketplaceItemType;
    }

    const where: any = {};
    if (filterType) {
      where.marketplaceItem = { itemType: filterType };
    }

    const orderBy: any[] = [];
    if (sortType && ["asc", "desc"].includes(sortType as string)) {
      orderBy.push({ marketplaceItem: { itemType: sortType } });
    }
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }
    if (
      sortPurchasedAt &&
      ["asc", "desc"].includes(sortPurchasedAt as string)
    ) {
      orderBy.push({ purchasedAt: sortPurchasedAt });
    }
    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

    const totalItems = await prisma.marketplacePurchase.count({ where });

    const purchases = await prisma.marketplacePurchase.findMany({
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
      data: serializeBigInt(purchases),
      total: totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllMarketplacePurchases error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};
