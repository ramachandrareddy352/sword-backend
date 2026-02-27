import type { Response } from "express";
import prisma from "../database/client";
import type { UserAuthRequest } from "../middleware/userAuth";
import { serializeBigInt } from "../services/serializeBigInt";
import { getPagination } from "../services/queryHelpers";

// 1) Get current user's rank across all leaderboard fields
export const getUserRank = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    // Fetch current user
    const currentUser = await prisma.user.findUnique({
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

    // Fetch ALL non-banned users (with minimal fields needed for ranking)
    const allUsers = await prisma.user.findMany({
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
    ] as const;

    type RankCategory = (typeof rankCategories)[number];

    const userRanks: Record<
      RankCategory,
      { rank: number; value: number | Date; totalUsers: number }
    > = {} as any;

    // Compute rank for each category
    for (const category of rankCategories) {
      let rank = 1;

      if (category === "createdAt") {
        // Newer = better (higher rank = smaller number)
        const better = leaderboardData.filter(
          (u) => u.createdAt > userStats.createdAt,
        ).length;
        rank = better + 1;
      } else {
        // Higher number = better
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
      message: "Your current ranks across all leaderboard categories",
      ranks: userRanks,
      totalActiveUsers,
    });
  } catch (err) {
    console.error("getUserRank error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 2) Authenticated user sees their own swords
export const getUserSwords = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const {
      sortCreatedAt, // "asc" | "desc"
      sortLevel, // "asc" | "desc" — sorts by sword level
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    // Build where clause (always scoped to current user)
    const where: any = {
      userId,
      unsoldQuantity: {
        gt: 0,
      },
    };

    // Build orderBy
    const orderBy: any[] = [];

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
    // ─────────────────────────────────────────────────────────────────────

    // Enrich response with computed fields
    const enriched = userSwords.map((entry) => ({
      ...entry,
      swordLevel: entry.swordLevelDefinition.level,
      totalOwned:
        entry.unsoldQuantity + entry.soldedQuantity + entry.brokenQuantity,
    }));

    return res.status(200).json({
      success: true,
      message: enriched.length
        ? "Your swords fetched successfully"
        : "You don't own any swords yet",
      data: serializeBigInt(enriched),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserSwords error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 3) Returns only main user table fields (no relations)
export const getUserBasicInfo = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    // Fetch user with only safe scalar fields
    const user = await prisma.user.findUnique({
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
      data: serializeBigInt(user),
    });
  } catch (err: any) {
    console.error("getUserBasicInfo error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 4) Authenticated user sees their own materials
export const getUserMaterials = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const {
      sortCreatedAt, // 'asc' | 'desc'
      sortBuyingCost, // 'asc' | 'desc'
      sortSellingCost, // 'asc' | 'desc'
      rarity, // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
      sold, // 'true' | 'false' (filter soldedQuantity)
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    // Validate rarity filter if provided
    const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
    let filterRarity: string | undefined;

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
    const where: any = {
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

    // Default sort: newest first
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const totalCount = await prisma.userMaterial.count({
      where,
    });

    /* ---------------- FETCH ---------------- */
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
      message: "Your materials fetched successfully",
      data: serializeBigInt(materials),
      total: totalCount,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserMaterials error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 5) get users all gifts
export const getUserGifts = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const {
      status, // "PENDING" | "CLAIMED" | "CANCELLED"
      itemType, // "GOLD" | "TRUST_POINTS" | "MATERIAL" | "SWORD" | "SHIELD"
      sortCreatedAt, // "asc" | "desc"
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    /* ---------------- ENUM VALIDATION ---------------- */
    const validStatuses = ["PENDING", "CLAIMED", "CANCELLED"];
    const validTypes = ["GOLD", "TRUST_POINTS", "MATERIAL", "SWORD", "SHIELD"];

    let filterStatus: string | undefined;
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

    let filterType: string | undefined;
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
    const where: any = {
      receiverId: userId,
    };

    if (filterStatus) {
      where.status = filterStatus;
    }

    if (filterType) {
      where.type = filterType; // ← corrected: no items relation anymore
    }

    /* ---------------- ORDER BY ---------------- */
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    /* ---------------- FETCH ---------------- */
    const gifts = await prisma.userGift.findMany({
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

    const total = await prisma.userGift.count({ where });

    return res.status(200).json({
      success: true,
      message: "Your gifts fetched successfully",
      data: serializeBigInt(gifts),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserGifts error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 6) User's own vouchers list + total count
export const getUserVouchers = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    const { status, sortCreatedAt, sortGoldAmount } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    /* ---------------- VALIDATION ---------------- */

    const validStatuses = ["PENDING", "REDEEMED", "CANCELLED", "EXPIRED"];

    let filterStatus: string | undefined;
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

    const where: any = {
      createdById: userId, // ✅ fixed
    };

    if (filterStatus) {
      where.status = filterStatus;
    }

    /* ---------------- ORDER BY ---------------- */

    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (sortGoldAmount && ["asc", "desc"].includes(sortGoldAmount as string)) {
      orderBy.push({ goldAmount: sortGoldAmount });
    }

    /* ---------------- FETCH ---------------- */

    const [vouchers, total] = await prisma.$transaction([
      prisma.userVoucher.findMany({
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
      prisma.userVoucher.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Your vouchers fetched successfully",
      data: serializeBigInt(vouchers),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserVouchers error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 7) User's own support complaints list + total count
export const getUserCustomerSupports = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const {
      isReviewed, // "true" | "false"
      category, // GAME_BUG, PAYMENT, etc.
      priority, // LOW, NORMAL, HIGH, CRITICAL
      sortCreatedAt, // "asc" | "desc"
    } = req.query;

    const pagination = getPagination(req.query);
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

    let filterIsReviewed: boolean | undefined;
    if (isReviewed !== undefined) {
      if (isReviewed !== "true" && isReviewed !== "false") {
        return res.status(400).json({
          success: false,
          error: "isReviewed must be 'true' or 'false'",
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
          error: `Invalid category. Allowed: ${validCategories.join(", ")}`,
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
          error: `Invalid priority. Allowed: ${validPriorities.join(", ")}`,
        });
      }
      filterPriority = upper;
    }

    /* ---------------- WHERE ---------------- */
    const where: any = {
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
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    /* ---------------- FETCH ---------------- */
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
      message: "Your support complaints fetched successfully",
      data: serializeBigInt(complaints),
      total: complaints.length,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserCustomerSupports error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 8)  solded single user swords list
export const getUserPurchasedSwords = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const {
      sortPurchasedAt = "desc", // 'asc' | 'desc'
      sortPriceGold, // 'asc' | 'desc'
      sortLevel, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];

    if (["asc", "desc"].includes(sortPurchasedAt as string)) {
      orderBy.push({ purchasedAt: sortPurchasedAt });
    }
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }
    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({
        swordLevelDefinition: { level: sortLevel },
      });
    }

    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, profileLogo: true },
    });

    return res.json({
      success: true,
      message: "Your purchased swords fetched successfully",
      user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getUserPurchasedSwords error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 9)  solded single user materials list
export const getUserPurchasedMaterials = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

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

    if (["asc", "desc"].includes(sortPurchasedAt as string)) {
      orderBy.push({ purchasedAt: sortPurchasedAt });
    }
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }
    if (sortMaterialId && ["asc", "desc"].includes(sortMaterialId as string)) {
      orderBy.push({ materialId: sortMaterialId });
    }

    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, profileLogo: true },
    });

    return res.json({
      success: true,
      message: "Your purchased materials fetched successfully",
      user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getUserPurchasedMaterials error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 10)  solded single user shields list
export const getUserPurchasedShields = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const {
      sortPurchasedAt = "desc", // 'asc' | 'desc'
      sortPriceGold, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];

    if (["asc", "desc"].includes(sortPurchasedAt as string)) {
      orderBy.push({ purchasedAt: sortPurchasedAt });
    }
    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }

    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

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

    // Fetch minimal user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, profileLogo: true },
    });

    return res.json({
      success: true,
      message: "Your purchased shields fetched successfully",
      user: user ? { name: user.name, profileLogo: user.profileLogo } : null,
      data: serializeBigInt(purchases),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err) {
    console.error("getUserPurchasedShields error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 11) Fetch authenticated user's own sword upgrade history
export const getUserUpgradeHistory = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const { sortCreatedAt = "desc" } = req.query; // 'asc' | 'desc'

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];

    if (["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const total = await prisma.swordUpgradeHistory.count({
      where: { userId },
    });

    const history = await prisma.swordUpgradeHistory.findMany({
      where: { userId },
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
    });

    return res.json({
      success: true,
      message: "Your sword upgrade history fetched successfully",
      data: serializeBigInt(history),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserUpgradeHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 12) Fetch authenticated user's own sword synthesis history
export const getUserSynthesisHistory = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const { sortCreatedAt = "desc" } = req.query; // 'asc' | 'desc'

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    const orderBy: any[] = [];

    if (["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

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
      message: "Your sword synthesis history fetched successfully",
      data: serializeBigInt(history),
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getUserSynthesisHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 13) Get daily missions for authenticated user
export const getUserDailyMissions = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    // Fetch user ad counters
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
        error: "User not found or banned",
      });
    }

    // Fetch admin config (for max limits)
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
        error: "Admin config not found",
      });
    }

    // Fetch all active daily missions
    const missions = await prisma.dailyMissionDefinition.findMany({
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
      data: serializeBigInt(result),
    });
  } catch (err: any) {
    console.error("getUserDailyMissions error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 14) GET Active One-Time Missions with eligibility + claimed status
export const getUserOneTimeMissions = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const now = new Date();

    // Fetch only ACTIVE + valid time missions
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
        message: "No active one-time missions",
        data: [],
      });
    }

    const missionResults = [];

    for (const mission of missions) {
      const conditions = mission.conditions as any[];
      let progressValue = 0;

      // Time filter range
      const timeFilter: any = {
        gte: mission.startAt,
      };

      if (mission.expiresAt) {
        timeFilter.lte = mission.expiresAt;
      }

      for (const cond of conditions) {
        switch (cond.type) {
          // ================= BUY SWORD =================
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

          // ================= BUY MATERIAL =================
          case "buyMaterial":
            progressValue += await prisma.materialMarketplacePurchase.count({
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
            const shieldPurchases =
              await prisma.shieldMarketplacePurchase.findMany({
                where: {
                  userId,
                  purchasedAt: timeFilter,
                },
                select: { quantity: true },
              });

            progressValue += shieldPurchases.reduce(
              (sum, s) => sum + s.quantity,
              0,
            );
            break;

          // ================= UPGRADE SWORD =================
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

          // ================= SYNTHESIZE =================
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

      // Check if already claimed
      const claimedRecord = await prisma.userOneTimeMissionProgress.findUnique({
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
      data: serializeBigInt(missionResults),
    });
  } catch (err: any) {
    console.error("getUserOneTimeMissions error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// user anvil sword details
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
        error: "Valid 'level' query parameter is required",
      });
    }

    const swordLevel = Number(level);

    // ─── Fetch sword definition ────────────────────────────────────────
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
    const userSword = await prisma.userSword.findUnique({
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
      data: serializeBigInt({
        swordDefinition: swordDef,
        userOwnership: userSword || null, // null if user doesn't have it
      }),
    });
  } catch (err: any) {
    console.error("getUserAnvilSwordDetails error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
