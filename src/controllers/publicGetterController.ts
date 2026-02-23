import type { Request, Response } from "express";
import prisma from "../database/client";
import { getPagination } from "../services/queryHelpers";
import { serializeBigInt } from "../services/serializeBigInt";

// 1) All sword definitions (paginated, basic info + optional relations)
export const getAllSwords = async (req: Request, res: Response) => {
  try {
    const {
      sortLevel, // 'asc' | 'desc'
      includeRelations, // 'true' to include relations
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];
    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({ level: sortLevel });
    }
    if (orderBy.length === 0) {
      orderBy.push({ level: "asc" });
    }

    const total = await prisma.swordLevelDefinition.count();

    const swords = await prisma.swordLevelDefinition.findMany({
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      // Use include (recommended when you want relations)
      include:
        includeRelations === "true"
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
      data: serializeBigInt(swords),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllSwords error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 2) Single sword by level or name (full details with relations)
export const getSword = async (req: Request, res: Response) => {
  try {
    const {
      level,
      name,
      includeRelations, // 'true' to include relations
    } = req.query;

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
        include:
          includeRelations === "true"
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
    } else if (name) {
      sword = await prisma.swordLevelDefinition.findUnique({
        where: { name: name as string },
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
      data: serializeBigInt(sword),
    });
  } catch (error) {
    console.error("getSword error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 3) All materials (paginated, basic info)
export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    const {
      rarity, // optional filter: COMMON | RARE | EPIC | LEGENDARY | MYTHIC
      sortBuyingCost, // 'asc' | 'desc'
      sortSellingCost, // 'asc' | 'desc'
      sortCreatedAt, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    // Build where clause for rarity filter
    const where: any = {};

    if (rarity) {
      const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
      const upperRarity = (rarity as string).toUpperCase();

      if (!validRarities.includes(upperRarity)) {
        return res.status(400).json({
          success: false,
          error: `Invalid rarity value. Allowed: ${validRarities.join(", ")}`,
        });
      }

      where.rarity = upperRarity;
    }

    // Build orderBy array
    const orderBy: any[] = [];

    if (sortBuyingCost && ["asc", "desc"].includes(sortBuyingCost as string)) {
      orderBy.push({ buyingCost: sortBuyingCost });
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

    // Count total (with filter applied)
    const total = await prisma.material.count({ where });
    const materials = await prisma.material.findMany({
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

// 4) Single material by id or name
export const getMaterial = async (req: Request, res: Response) => {
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
      material = await prisma.material.findUnique({
        where: { id: BigInt(id as string) },
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
    } else if (name) {
      material = await prisma.material.findUnique({
        where: { name: name as string },
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
      data: serializeBigInt(material),
    });
  } catch (error) {
    console.error("getMaterial error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 5) Updated leaderboard with new fields
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    // ── Safe extraction of sortBy ───────────────────────────────────────
    let sortBy: string = "totalSwords"; // default to missions or gold, etc.
    const sortByRaw = req.query.sortBy;

    if (typeof sortByRaw === "string" && sortByRaw.trim()) {
      sortBy = sortByRaw.trim();
    } else if (Array.isArray(sortByRaw) && sortByRaw.length > 0) {
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
    ] as const;

    if (!validSortFields.includes(sortBy as any)) {
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
        error: "Invalid pagination parameters",
      });
    }

    // ── Fetch users (non-banned) ─────────────────────────────────────────
    const users = await prisma.user.findMany({
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
      let valA: number | Date;
      let valB: number | Date;

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
      message: "Leaderboard fetched successfully",
    });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 6)  solded swords list
export const getPurchasedSwords = async (req: Request, res: Response) => {
  try {
    const {
      sortPurchasedAt, // 'asc' | 'desc' (default: desc)
      sortPriceGold, // 'asc' | 'desc' (price per sword)
      sortLevel, // 'asc' | 'desc' (sword level)
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];

    // Purchased at (time)
    if (
      sortPurchasedAt &&
      ["asc", "desc"].includes(sortPurchasedAt as string)
    ) {
      orderBy.push({ purchasedAt: sortPurchasedAt });
    }

    // Price gold (per sword)
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }

    // Sword level
    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({
        swordLevelDefinition: { level: sortLevel },
      });
    }

    // Default: newest first
    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

    const total = await prisma.swordMarketplacePurchase.count();

    const purchases = await prisma.swordMarketplacePurchase.findMany({
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
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getPurchasedSwords error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 7)  solded materials list
export const getPurchasedMaterials = async (req: Request, res: Response) => {
  try {
    const {
      sortPurchasedAt = "desc", // 'asc' | 'desc'
      sortPriceGold, // 'asc' | 'desc'
      sortMaterialId, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];

    // Purchased at
    if (["asc", "desc"].includes(sortPurchasedAt as string)) {
      orderBy.push({ purchasedAt: sortPurchasedAt });
    }

    // Price gold (total)
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }

    // Material ID
    if (sortMaterialId && ["asc", "desc"].includes(sortMaterialId as string)) {
      orderBy.push({ materialId: sortMaterialId });
    }

    // Default: newest first
    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

    const total = await prisma.materialMarketplacePurchase.count();

    const purchases = await prisma.materialMarketplacePurchase.findMany({
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
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getPurchasedMaterials error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 8)  solded shields list
export const getPurchasedShields = async (req: Request, res: Response) => {
  try {
    const {
      sortPurchasedAt = "desc", // 'asc' | 'desc'
      sortPriceGold, // 'asc' | 'desc' — total
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];

    // Purchased at
    if (["asc", "desc"].includes(sortPurchasedAt as string)) {
      orderBy.push({ purchasedAt: sortPurchasedAt });
    }

    // Price gold (total)
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }

    // Default: newest first
    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

    const total = await prisma.shieldMarketplacePurchase.count();

    const purchases = await prisma.shieldMarketplacePurchase.findMany({
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
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getPurchasedShields error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 9) admin config data
export const getAdminConfig = async (_req: Request, res: Response) => {
  try {
    // Fetch the single AdminConfig row (id is fixed to 1 as per your schema)
    const config = await prisma.adminConfig.findUnique({
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
      data: serializeBigInt(config),
    });
  } catch (error) {
    console.error("getAdminConfig error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch admin configuration",
    });
  }
};

function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error("Invalid version format. Expected: major.minor.patch");
  }
  return [parts[0], parts[1], parts[2]];
}

// GET /public/version-check?version=1.2.3&platform=android
export const getAppVersionCheck = async (req: Request, res: Response) => {
  try {
    const { version, platform } = req.query;

    if (!version || typeof version !== "string") {
      return res.status(400).json({
        success: false,
        error: "version query parameter is required (e.g., '1.2.3')",
      });
    }

    if (!platform || !["android", "ios"].includes(platform as string)) {
      return res.status(400).json({
        success: false,
        error: "platform must be 'android' or 'ios'",
      });
    }

    // Fetch config (cache if needed in production)
    const config = await prisma.adminConfig.findUnique({
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

    let userVersionTuple: [number, number, number];
    try {
      userVersionTuple = parseVersion(version);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid version format. Use major.minor.patch (e.g., '1.2.3')",
      });
    }

    const minRequiredTuple = parseVersion(config.minRequiredVersion);
    const latestTuple = parseVersion(config.latestVersion);

    const link =
      platform === "android" ? config.playStoreLink : config.appStoreLink;

    if (userVersionTuple < minRequiredTuple) {
      return res.json({
        success: true,
        required: true,
        message:
          config.mandatoryUpdateMessage ||
          "Your app version is outdated. Please update to continue playing.",
        link: link || null,
      });
    } else if (userVersionTuple < latestTuple) {
      return res.json({
        success: true,
        required: false,
        message:
          config.notificationUpdateMessage ||
          "A new version is available! Update for the latest features.",
        link: link || null,
      });
    } else {
      return res.json({
        success: true,
        upToDate: true,
      });
    }
  } catch (err: any) {
    console.error("getAppVersionCheck error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
