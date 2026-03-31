import type { Request, Response } from "express";
import prisma from "../database/client.js";
import { getPagination } from "../services/queryHelpers.js";
import { serializeBigInt } from "../services/serializeBigInt.js";

// 1) All sword definitions (paginated, basic info + optional relations)
export const getAllSwords = async (req: Request, res: Response) => {
  try {
    const { sortLevel, includeRelations } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.invalidPaginationParameters"),
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

    return res.status(200).json({
      success: true,
      message: req.t("publicGetter.success.swordsFetched"),
      data: serializeBigInt(swords),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllSwords error:", error);
    return res.status(500).json({
      success: false,
      error: req.t("publicGetter.error.internalServerError"),
    });
  }
};

// 2) Single sword by level or name
export const getSword = async (req: Request, res: Response) => {
  try {
    const { level, name, includeRelations } = req.query;

    if (!level && !name) {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.provideLevelOrName"),
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
      return res.status(404).json({
        success: false,
        error: req.t("publicGetter.error.swordNotFound"),
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t("publicGetter.success.swordDetailsFetched"),
      data: serializeBigInt(sword),
    });
  } catch (error) {
    console.error("getSword error:", error);
    return res.status(500).json({
      success: false,
      error: req.t("publicGetter.error.internalServerError"),
    });
  }
};

// 3) All materials (paginated)
export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    const { rarity, sortBuyingCost, sortSellingCost, sortCreatedAt } =
      req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.invalidPaginationParameters"),
      });
    }

    const where: any = {};

    if (rarity) {
      const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
      const upperRarity = (rarity as string).toUpperCase();

      if (!validRarities.includes(upperRarity)) {
        return res.status(400).json({
          success: false,
          error: req.t("publicGetter.error.invalidRarity", {
            allowed: validRarities.join(", "),
          }),
        });
      }

      where.rarity = upperRarity;
    }

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

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

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
          ? req.t("publicGetter.success.noRarityMaterialsFound", { rarity })
          : req.t("publicGetter.success.noMaterialsFound"),
        data: [],
        total,
        page: pagination.page,
        limit: pagination.limit,
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t("publicGetter.success.materialsFetched"),
      data: serializeBigInt(materials),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllMaterials error:", error);
    return res.status(500).json({
      success: false,
      error: req.t("publicGetter.error.internalServerError"),
    });
  }
};

// 4) Single material by id or name
export const getMaterial = async (req: Request, res: Response) => {
  try {
    const { id, name } = req.query;

    if (!id && !name) {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.provideIdOrName"),
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
      return res.status(404).json({
        success: false,
        error: req.t("publicGetter.error.materialNotFound"),
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t("publicGetter.success.materialFetched"),
      data: serializeBigInt(material),
    });
  } catch (error) {
    console.error("getMaterial error:", error);
    return res.status(500).json({
      success: false,
      error: req.t("publicGetter.error.internalServerError"),
    });
  }
};

// 5) Leaderboard
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    let sortBy: string = "totalSwords";
    const sortByRaw = req.query.sortBy;

    if (typeof sortByRaw === "string" && sortByRaw.trim()) {
      sortBy = sortByRaw.trim();
    } else if (Array.isArray(sortByRaw) && sortByRaw.length > 0) {
      sortBy = String(sortByRaw[0]).trim();
    }

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
        error: req.t("publicGetter.error.invalidSortByField", {
          allowed: validSortFields.join(", "),
        }),
      });
    }

    let order: "asc" | "desc" = "desc";
    const orderRaw = req.query.order;
    if (
      typeof orderRaw === "string" &&
      (orderRaw === "asc" || orderRaw === "desc")
    ) {
      order = orderRaw as "asc" | "desc";
    }

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.invalidPagination"),
      });
    }

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
        swords: { select: { unsoldQuantity: true } },
        materials: { select: { unsoldQuantity: true } },
      },
    });

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

      valA = (a as any)[sortBy] as number;
      valB = (b as any)[sortBy] as number;

      return order === "desc" ? valB - valA : valA - valB;
    });

    const start = pagination.skip;
    const paginated = leaderboardData.slice(start, start + pagination.take);

    return res.json({
      success: true,
      message: req.t("publicGetter.success.leaderboardFetched"),
      data: paginated,
      total: leaderboardData.length,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("publicGetter.error.internalServerError"),
    });
  }
};

// 6) Admin Config
export const getAdminConfig = async (req: Request, res: Response) => {
  try {
    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
      select: {
        shieldGoldPrice: true,
        maxDailyShieldAds: true,
        maxShieldHold: true,
        shieldActiveOnMarketplace: true,
        defaultTrustPoints: true,
        defaultGold: true,
        maxDailySwordAds: true,
        swordLevelReward: true,
        maxDailyGoldAds: true,
        goldReward: true,
        minVoucherGold: true,
        maxVoucherGold: true,
        voucherExpiryDays: true,
        expiryAllow: true,
        isShoppingAllowed: true,
        isGameStopped: true,
        exchangeRate: true,
        minRequiredVersion: true,
        latestVersion: true,
        mandatoryUpdateMessage: true,
        notificationUpdateMessage: true,
        playStoreLink: true,
        appStoreLink: true,
      },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: req.t("publicGetter.error.adminConfigNotFound"),
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t("publicGetter.success.adminConfigRetrieved"),
      data: serializeBigInt(config),
    });
  } catch (error) {
    console.error("getAdminConfig error:", error);
    return res.status(500).json({
      success: false,
      error: req.t("publicGetter.error.internalServerError"),
    });
  }
};

// 7) App Version Check
export const getAppVersionCheck = async (req: Request, res: Response) => {
  try {
    const { version, platform } = req.query;

    if (!version || typeof version !== "string") {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.versionParameterRequired"),
      });
    }

    if (!platform || !["android", "ios"].includes(platform as string)) {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.platformMustBeAndroidOrIos"),
      });
    }

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
        error: req.t("publicGetter.error.versionConfigNotSet"),
      });
    }

    let userVersionTuple: [number, number, number];
    try {
      userVersionTuple = parseVersion(version);
    } catch {
      return res.status(400).json({
        success: false,
        error: req.t("publicGetter.error.invalidVersionFormat"),
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
      error: req.t("publicGetter.error.internalServerError"),
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
