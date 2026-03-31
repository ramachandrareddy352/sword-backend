import type { Response } from "express";
import prisma from "../database/client";
import type { UserAuthRequest } from "../middleware/userAuth";
import { serializeBigInt } from "../services/serializeBigInt";
import { getPagination } from "../services/queryHelpers";

// 1) Get current user's rank across all leaderboard fields
export const getUserRank = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        gold: true,
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
        error: req.t("userGetter.error.userNotFoundOrBanned"),
      });
    }

    const userStats = {
      userId: userId.toString(),
      gold: Number(currentUser.gold),
      totalShields: currentUser.totalShields,
      totalAdsViewed: currentUser.totalAdsViewed,
      totalMissionsDone: currentUser.totalMissionsDone,
      totalSwords: currentUser.swords.reduce(
        (sum, s) => sum + s.unsoldQuantity,
        0,
      ),
      totalMaterials: currentUser.materials.reduce(
        (sum, m) => sum + m.unsoldQuantity,
        0,
      ),
      createdAt: currentUser.createdAt,
    };

    const allUsers = await prisma.user.findMany({
      where: { isBanned: false },
      select: {
        id: true,
        gold: true,
        totalShields: true,
        totalAdsViewed: true,
        totalMissionsDone: true,
        createdAt: true,
        swords: { select: { unsoldQuantity: true } },
        materials: { select: { unsoldQuantity: true } },
      },
    });

    const totalActiveUsers = allUsers.length;

    const leaderboardData = allUsers.map((u) => ({
      userId: u.id.toString(),
      gold: Number(u.gold),
      totalShields: u.totalShields,
      totalAdsViewed: u.totalAdsViewed,
      totalMissionsDone: u.totalMissionsDone,
      totalSwords: u.swords.reduce((sum, s) => sum + s.unsoldQuantity, 0),
      totalMaterials: u.materials.reduce((sum, m) => sum + m.unsoldQuantity, 0),
      createdAt: u.createdAt,
    }));

    const rankCategories = [
      "totalSwords",
      "totalMaterials",
      "totalShields",
      "gold",
      "totalAdsViewed",
      "totalMissionsDone",
      "createdAt",
    ] as const;

    type RankCategory = (typeof rankCategories)[number];

    const userRanks: Record<
      RankCategory,
      { rank: number; value: number | Date; totalUsers: number }
    > = {} as any;

    for (const category of rankCategories) {
      let rank = 1;

      if (category === "createdAt") {
        const better = leaderboardData.filter(
          (u) => u.createdAt > userStats.createdAt,
        ).length;
        rank = better + 1;
      } else {
        const better = leaderboardData.filter(
          (u) => (u[category] as number) > (userStats[category] as number),
        ).length;
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
      message: req.t("userGetter.success.userRankFetched"),
      ranks: userRanks,
      totalActiveUsers,
    });
  } catch (err) {
    console.error("getUserRank error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 2) Get User's Swords
export const getUserSwords = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const { sortCreatedAt, sortLevel } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const where: any = {
      userId,
      unsoldQuantity: { gt: 0 },
    };

    const orderBy: any[] = [];

    if (sortCreatedAt === "asc" || sortCreatedAt === "desc") {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    if (sortLevel === "asc" || sortLevel === "desc") {
      orderBy.push({ swordLevelDefinition: { level: sortLevel } });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const [userSwords, total] = await prisma.$transaction([
      prisma.userSword.findMany({
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
      prisma.userSword.count({ where }),
    ]);

    const enriched = userSwords.map((entry) => ({
      ...entry,
      swordLevel: entry.swordLevelDefinition.level,
      totalOwned:
        entry.unsoldQuantity + entry.soldedQuantity + entry.brokenQuantity,
    }));

    return res.status(200).json({
      success: true,
      message: enriched.length
        ? req.t("userGetter.success.userSwordsFetched")
        : req.t("userGetter.success.noSwordsOwned"),
      data: serializeBigInt(enriched),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserSwords error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 3) Get User Basic Info
export const getUserBasicInfo = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: req.t("userGetter.error.userNotFound"),
      });
    }

    return res.status(200).json({
      success: true,
      message: req.t("userGetter.success.userBasicInfoFetched"),
      data: serializeBigInt(user),
    });
  } catch (err: any) {
    console.error("getUserBasicInfo error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 4) Get User Materials
export const getUserMaterials = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const { sortCreatedAt, sortBuyingCost, sortSellingCost, rarity, sold } =
      req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
    let filterRarity: string | undefined;

    if (rarity) {
      const upper = String(rarity).toUpperCase();
      if (!validRarities.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: req.t("userGetter.error.invalidRarity", {
            allowed: validRarities.join(", "),
          }),
        });
      }
      filterRarity = upper;
    }

    const where: any = {
      userId,
      unsoldQuantity: { gt: 0 },
    };

    if (filterRarity) where.material = { rarity: filterRarity };
    if (sold === "true") where.soldedQuantity = { gt: 0 };
    if (sold === "false") where.soldedQuantity = 0;

    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    if (sortBuyingCost && ["asc", "desc"].includes(sortBuyingCost as string)) {
      orderBy.push({ material: { buyingCost: sortBuyingCost } });
    }
    if (
      sortSellingCost &&
      ["asc", "desc"].includes(sortSellingCost as string)
    ) {
      orderBy.push({ material: { sellingCost: sortSellingCost } });
    }
    if (orderBy.length === 0) orderBy.push({ createdAt: "desc" });

    const totalCount = await prisma.userMaterial.count({ where });

    const materials = await prisma.userMaterial.findMany({
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
      message: req.t("userGetter.success.userMaterialsFetched"),
      data: serializeBigInt(materials),
      total: totalCount,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserMaterials error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 5) Get User Gifts
export const getUserGifts = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const { status, itemType, sortCreatedAt } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const validStatuses = ["PENDING", "CLAIMED", "CANCELLED"];
    const validTypes = ["GOLD", "MATERIAL", "SWORD", "SHIELD"];

    let filterStatus: string | undefined;
    if (status) {
      const upper = String(status).toUpperCase();
      if (!validStatuses.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: req.t("userGetter.error.invalidStatus", {
            allowed: validStatuses.join(", "),
          }),
        });
      }
      filterStatus = upper;
    }

    let filterType: string | undefined;
    if (itemType) {
      const upper = String(itemType).toUpperCase();
      if (!validTypes.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: req.t("userGetter.error.invalidGiftType", {
            allowed: validTypes.join(", "),
          }),
        });
      }
      filterType = upper;
    }

    const where: any = { receiverId: userId };
    if (filterStatus) where.status = filterStatus;
    if (filterType) where.type = filterType;

    const orderBy: any[] = [];
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    if (orderBy.length === 0) orderBy.push({ createdAt: "desc" });

    const gifts = await prisma.userGift.findMany({
      where,
      include: {
        material: {
          select: { id: true, name: true, rarity: true, image: true },
        },
        swordLevelDefinition: {
          select: { id: true, level: true, name: true, image: true },
        },
      },
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
    });

    const total = await prisma.userGift.count({ where });

    return res.status(200).json({
      success: true,
      message: req.t("userGetter.success.userGiftsFetched"),
      data: serializeBigInt(gifts),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserGifts error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 6) Get User Vouchers
export const getUserVouchers = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const { status, sortCreatedAt, sortGoldAmount } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const validStatuses = ["PENDING", "REDEEMED"];
    let filterStatus: string | undefined;

    if (status) {
      const upper = String(status).toUpperCase();
      if (!validStatuses.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: req.t("userGetter.error.invalidVoucherStatus", {
            allowed: validStatuses.join(", "),
          }),
        });
      }
      filterStatus = upper;
    }

    const where: any = {
      createdById: userId,
      status: filterStatus ? filterStatus : { in: validStatuses },
    };

    const orderBy: any[] = [];
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    if (sortGoldAmount && ["asc", "desc"].includes(sortGoldAmount as string)) {
      orderBy.push({ goldAmount: sortGoldAmount });
    }

    const [vouchers, total] = await prisma.$transaction([
      prisma.userVoucher.findMany({
        where,
        include: {
          allowedUser: {
            select: {
              id: true,
              isTelegramLogin: true,
              telegramUser: true,
              email: true,
            },
          },
          redeemedBy: {
            select: {
              id: true,
              isTelegramLogin: true,
              telegramUser: true,
              email: true,
            },
          },
        },
        orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.userVoucher.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: req.t("userGetter.success.userVouchersFetched"),
      data: serializeBigInt(vouchers),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserVouchers error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 7) Get User Customer Supports / Complaints
export const getUserCustomerSupports = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const { isReviewed, category, priority, sortCreatedAt } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const validCategories = [
      "GAME_BUG",
      "PAYMENT",
      "ACCOUNT",
      "BAN_APPEAL",
      "SUGGESTION",
      "OTHER",
    ];
    const validPriorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

    let filterIsReviewed: boolean | undefined;
    if (isReviewed !== undefined) {
      if (isReviewed !== "true" && isReviewed !== "false") {
        return res.status(400).json({
          success: false,
          error: req.t("userGetter.error.isReviewedMustBeBoolean"),
        });
      }
      filterIsReviewed = isReviewed === "true";
    }

    let filterCategory: string | undefined;
    if (category) {
      const upper = String(category).toUpperCase();
      if (!validCategories.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: req.t("userGetter.error.invalidCategory", {
            allowed: validCategories.join(", "),
          }),
        });
      }
      filterCategory = upper;
    }

    let filterPriority: string | undefined;
    if (priority) {
      const upper = String(priority).toUpperCase();
      if (!validPriorities.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: req.t("userGetter.error.invalidPriority", {
            allowed: validPriorities.join(", "),
          }),
        });
      }
      filterPriority = upper;
    }

    const where: any = { userId };
    if (filterIsReviewed !== undefined) where.isReviewed = filterIsReviewed;
    if (filterCategory) where.category = filterCategory;
    if (filterPriority) where.priority = filterPriority;

    const orderBy: any[] = [];
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    const complaints = await prisma.customerSupport.findMany({
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
      message: req.t("userGetter.success.userComplaintsFetched"),
      data: serializeBigInt(complaints),
      total: complaints.length,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserCustomerSupports error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 8) Get User Purchased Swords
export const getUserPurchasedSwords = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const { sortPurchasedAt = "desc", sortPriceGold, sortLevel } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const orderBy: any[] = [];
    if (["asc", "desc"].includes(sortPurchasedAt as string))
      orderBy.push({ purchasedAt: sortPurchasedAt });
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string))
      orderBy.push({ priceGold: sortPriceGold });
    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({ swordLevelDefinition: { level: sortLevel } });
    }
    if (orderBy.length === 0) orderBy.push({ purchasedAt: "desc" });

    const total = await prisma.swordMarketplacePurchase.count({
      where: { userId },
    });

    const purchases = await prisma.swordMarketplacePurchase.findMany({
      where: { userId },
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        swordLevelDefinition: {
          select: { level: true, name: true, image: true, successRate: true },
        },
        quantity: true,
        priceGold: true,
        purchasedAt: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, profileLogo: true },
    });

    return res.json({
      success: true,
      message: req.t("userGetter.success.userPurchasedSwordsFetched"),
      user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getUserPurchasedSwords error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 9) Get User Purchased Materials
export const getUserPurchasedMaterials = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const {
      sortPurchasedAt = "desc",
      sortPriceGold,
      sortMaterialId,
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const orderBy: any[] = [];
    if (["asc", "desc"].includes(sortPurchasedAt as string))
      orderBy.push({ purchasedAt: sortPurchasedAt });
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string))
      orderBy.push({ priceGold: sortPriceGold });
    if (sortMaterialId && ["asc", "desc"].includes(sortMaterialId as string))
      orderBy.push({ materialId: sortMaterialId });
    if (orderBy.length === 0) orderBy.push({ purchasedAt: "desc" });

    const total = await prisma.materialMarketplacePurchase.count({
      where: { userId },
    });

    const purchases = await prisma.materialMarketplacePurchase.findMany({
      where: { userId },
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        material: {
          select: { id: true, name: true, rarity: true, image: true },
        },
        quantity: true,
        priceGold: true,
        purchasedAt: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, profileLogo: true },
    });

    return res.json({
      success: true,
      message: req.t("userGetter.success.userPurchasedMaterialsFetched"),
      user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getUserPurchasedMaterials error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 10) Get User Purchased Shields
export const getUserPurchasedShields = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const { sortPurchasedAt = "desc", sortPriceGold } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const orderBy: any[] = [];
    if (["asc", "desc"].includes(sortPurchasedAt as string))
      orderBy.push({ purchasedAt: sortPurchasedAt });
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string))
      orderBy.push({ priceGold: sortPriceGold });
    if (orderBy.length === 0) orderBy.push({ purchasedAt: "desc" });

    const total = await prisma.shieldMarketplacePurchase.count({
      where: { userId },
    });

    const purchases = await prisma.shieldMarketplacePurchase.findMany({
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, profileLogo: true },
    });

    return res.json({
      success: true,
      message: req.t("userGetter.success.userPurchasedShieldsFetched"),
      user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getUserPurchasedShields error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 11) Get User Upgrade History
export const getUserUpgradeHistory = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const { sortCreatedAt = "desc" } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const orderBy: any[] = [];
    if (["asc", "desc"].includes(sortCreatedAt as string))
      orderBy.push({ createdAt: sortCreatedAt });
    if (orderBy.length === 0) orderBy.push({ createdAt: "desc" });

    const total = await prisma.swordUpgradeHistory.count({ where: { userId } });

    const history = await prisma.swordUpgradeHistory.findMany({
      where: { userId },
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
    });

    return res.json({
      success: true,
      message: req.t("userGetter.success.userUpgradeHistoryFetched"),
      data: serializeBigInt(history),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserUpgradeHistory error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 12) Get User Synthesis History
export const getUserSynthesisHistory = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const { sortCreatedAt = "desc" } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.invalidPaginationParameters"),
      });
    }

    const orderBy: any[] = [];
    if (["asc", "desc"].includes(sortCreatedAt as string))
      orderBy.push({ createdAt: sortCreatedAt });
    if (orderBy.length === 0) orderBy.push({ createdAt: "desc" });

    const total = await prisma.swordSynthesisHistory.count({
      where: { userId },
    });

    const history = await prisma.swordSynthesisHistory.findMany({
      where: { userId },
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
    });

    return res.json({
      success: true,
      message: req.t("userGetter.success.userSynthesisHistoryFetched"),
      data: serializeBigInt(history),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserSynthesisHistory error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 13) Get Daily Missions
export const getUserDailyMissions = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const user = await prisma.user.findUnique({
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
        error: req.t("userGetter.error.userNotFoundOrBanned"),
      });
    }

    const config = await prisma.adminConfig.findUnique({
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
        error: req.t("userGetter.error.adminConfigNotFound"),
      });
    }

    const missions = await prisma.dailyMissionDefinition.findMany({
      where: { isActive: true },
      include: { progress: { where: { userId } } },
      orderBy: { createdAt: "desc" },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = missions.map((mission) => {
      const progress = mission.progress[0];
      const claimedToday =
        progress?.lastClaimedAt &&
        new Date(progress.lastClaimedAt) >= todayStart;

      let currentProgress = 0;
      let dynamicTargetValue = mission.targetValue;

      const conditions = mission.conditions as any[];
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
      message: req.t("userGetter.success.dailyMissionsFetched"),
      data: serializeBigInt(result),
    });
  } catch (err: any) {
    console.error("getUserDailyMissions error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 14) Get One-Time Missions
export const getUserOneTimeMissions = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const now = new Date();

    const missions = await prisma.oneTimeMissionDefinition.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    });

    if (missions.length === 0) {
      return res.json({
        success: true,
        message: req.t("userGetter.success.noActiveOneTimeMissions"),
        data: [],
      });
    }

    const missionResults = [];

    for (const mission of missions) {
      const conditions = mission.conditions as any[];
      let progressValue = 0;

      const timeFilter: any = { gte: mission.startAt };
      if (mission.expiresAt) timeFilter.lte = mission.expiresAt;

      for (const cond of conditions) {
        switch (cond.type) {
          case "buySword":
            progressValue += await prisma.swordMarketplacePurchase.count({
              where: {
                userId,
                purchasedAt: timeFilter,
                ...(cond.level && {
                  swordLevelDefinition: { level: cond.level },
                }),
              },
            });
            break;
          case "buyMaterial":
            progressValue += await prisma.materialMarketplacePurchase.count({
              where: {
                userId,
                purchasedAt: timeFilter,
                ...(cond.materialId && { materialId: BigInt(cond.materialId) }),
              },
            });
            break;
          case "buyShield":
            const shieldPurchases =
              await prisma.shieldMarketplacePurchase.findMany({
                where: { userId, purchasedAt: timeFilter },
                select: { quantity: true },
              });
            progressValue += shieldPurchases.reduce(
              (sum, s) => sum + s.quantity,
              0,
            );
            break;
          case "upgradeSword":
            progressValue += await prisma.swordUpgradeHistory.count({
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
          case "synthesize":
            progressValue += await prisma.swordSynthesisHistory.count({
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

      const claimedRecord = await prisma.userOneTimeMissionProgress.findUnique({
        where: { userId_missionId: { userId, missionId: mission.id } },
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
      message: req.t("userGetter.success.oneTimeMissionsFetched"),
      data: serializeBigInt(missionResults),
    });
  } catch (err: any) {
    console.error("getUserOneTimeMissions error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 15) Get User Anvil Sword Details
export const getUserAnvilSwordDetails = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const { level } = req.query;

    if (!level || isNaN(Number(level))) {
      return res.status(400).json({
        success: false,
        error: req.t("userGetter.error.validLevelRequired"),
      });
    }

    const swordLevel = Number(level);

    const swordDef = await prisma.swordLevelDefinition.findUnique({
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
              select: { id: true, name: true, image: true, rarity: true },
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
        error: req.t("userGetter.error.swordLevelNotFound", {
          level: swordLevel,
        }),
      });
    }

    const userSword = await prisma.userSword.findUnique({
      where: { userId_swordId: { userId, swordId: swordDef.id } },
      select: {
        unsoldQuantity: true,
        soldedQuantity: true,
        brokenQuantity: true,
        isOnAnvil: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: userSword
        ? req.t("userGetter.success.anvilSwordDetailsFetched")
        : req.t("userGetter.success.swordDefinitionFoundButNotOwned"),
      data: serializeBigInt({
        swordDefinition: swordDef,
        userOwnership: userSword || null,
      }),
    });
  } catch (err: any) {
    console.error("getUserAnvilSwordDetails error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};

// 16) Get Unread Notifications
export const getUnreadNotifications = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, lastNotificationReadTime: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: req.t("userGetter.error.userNotFound"),
      });
    }

    const where: any = { createdAt: { gte: user.createdAt } };
    if (user.lastNotificationReadTime) {
      where.createdAt.gt = user.lastNotificationReadTime;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message:
        notifications.length > 0
          ? req.t("userGetter.success.unreadNotificationsFetched")
          : req.t("userGetter.success.noUnreadNotifications"),
      data: serializeBigInt(notifications),
    });
  } catch (err: any) {
    console.error("getUnreadNotifications error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userGetter.error.internalServerError"),
    });
  }
};
