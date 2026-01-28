import type { Request, Response } from "express";
import prisma from "../database/client.ts";
import { resolveUser } from "../services/queryHelpers.ts";
import { serializeBigInt } from "../services/serializeBigInt.ts";

// =============== Access by admin or self user ===============

// 1) get complete information about the user using his id or email
export const getUserFullDetails = async (req: Request, res: Response) => {
  try {
    const { email, userId } = req.query;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        error: "Either 'email' or 'userId' query parameter is required",
      });
    }

    // Use helper to find user (throws USER_NOT_FOUND if missing)
    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    // Core user data (safe fields only)
    const safeUser = {
      id: user.id,
      email: user.email,
      gold: user.gold,
      trustPoints: user.trustPoints,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastReviewed: user.lastReviewed,
      emailVerified: user.emailVerified,
      oneDayAdsViewed: user.oneDayAdsViewed,
      totalAdsViewed: user.totalAdsViewed,
      totalMissionsDone: user.totalMissionsDone,
      isBanned: user.isBanned,
      anvilSwordId: user.anvilSwordId,
      anvilShieldId: user.anvilShieldId,
      soundOn: user.soundOn,
    };

    // Vouchers
    const vouchers = await prisma.userVoucher.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Swords with level definition
    const swords = await prisma.userSword.findMany({
      where: { userId: user.id },
      include: {
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
      orderBy: { createdAt: "desc" },
    });

    // Materials
    const materials = await prisma.userMaterial.findMany({
      where: { userId: user.id },
      include: {
        material: {
          select: {
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
      orderBy: { createdAt: "desc" },
    });

    // Shields
    const shields = await prisma.userShield.findMany({
      where: { userId: user.id },
      include: {
        shield: {
          select: {
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
      orderBy: { createdAt: "desc" },
    });

    // Gifts + items
    const gifts = await prisma.userGift.findMany({
      where: { receiverId: user.id },
      include: {
        items: true, // all fields
      },
      orderBy: { createdAt: "desc" },
    });

    // Marketplace purchases
    const marketplacePurchases = await prisma.marketplacePurchase.findMany({
      where: { userId: user.id },
      include: {
        marketplaceItem: {
          select: {
            id: true,
            itemType: true,
            priceGold: true,
            isActive: true,
            isPurchased: true,
            createdAt: true,
            updatedAt: true,

            // Sword — if purchased a sword
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

            // Material — if purchased a material
            material: {
              select: {
                code: true,
                name: true,
                description: true,
                image: true,
                cost: true,
                power: true,
                rarity: true,
              },
            },

            // Shield — if purchased a shield
            shieldType: {
              select: {
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
        },
      },
      orderBy: { purchasedAt: "desc" },
    });

    // Customer support tickets
    const customerSupports = await prisma.customerSupport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      user: serializeBigInt(safeUser),
      vouchers: { list: serializeBigInt(vouchers), total: vouchers.length },
      swords: { list: serializeBigInt(swords), total: swords.length },
      materials: { list: serializeBigInt(materials), total: materials.length },
      shields: { list: serializeBigInt(shields), total: shields.length },
      gifts: { list: serializeBigInt(gifts), total: gifts.length },
      marketplacePurchases: {
        list: serializeBigInt(marketplacePurchases),
        total: marketplacePurchases.length,
      },
      customerSupports: {
        list: serializeBigInt(customerSupports),
        total: customerSupports.length,
      },
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (error.message === "IDENTIFIER_REQUIRED") {
      return res.status(400).json({
        success: false,
        error: "Either email or userId is required",
      });
    }

    console.error("getUserFullDetails error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 2) Returns only main user table fields (no relations)
export const getUserBasicInfo = async (req: Request, res: Response) => {
  try {
    const { email, userId } = req.query;

    if (!email && !userId) {
      return res
        .status(400)
        .json({ success: false, error: "email or userId required" });
    }

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      gold: user.gold,
      trustPoints: user.trustPoints,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastReviewed: user.lastReviewed,
      emailVerified: user.emailVerified,
      oneDayAdsViewed: user.oneDayAdsViewed,
      totalAdsViewed: user.totalAdsViewed,
      totalMissionsDone: user.totalMissionsDone,
      isBanned: user.isBanned,
      anvilSwordId: user.anvilSwordId,
      anvilShieldId: user.anvilShieldId,
      soundOn: user.soundOn,
    };

    return res.status(200).json({
      success: true,
      message: "Fetched user basic details successfully",
      user: serializeBigInt(safeUser),
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 3) Only user's swords list + total count
export const getUserSwords = async (req: Request, res: Response) => {
  try {
    const {
      email,
      userId,

      // optional sorting params
      sortCreatedAt,
      sortPower,
      sortUpgradeCost,
      sortSellingCost,
      sortSuccessRate,
    } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    /* ---------------- BUILD ORDER BY ---------------- */
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({
        swordLevelDefinition: { power: sortPower },
      });
    }

    if (
      sortUpgradeCost &&
      ["asc", "desc"].includes(sortUpgradeCost as string)
    ) {
      orderBy.push({
        swordLevelDefinition: { upgradeCost: sortUpgradeCost },
      });
    }

    if (
      sortSellingCost &&
      ["asc", "desc"].includes(sortSellingCost as string)
    ) {
      orderBy.push({
        swordLevelDefinition: { sellingCost: sortSellingCost },
      });
    }

    if (
      sortSuccessRate &&
      ["asc", "desc"].includes(sortSuccessRate as string)
    ) {
      orderBy.push({
        swordLevelDefinition: { successRate: sortSuccessRate },
      });
    }

    // ✅ default fallback
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    /* ---------------- FETCH DATA ---------------- */
    const swords = await prisma.userSword.findMany({
      where: { userId: user.id },
      include: {
        swordLevelDefinition: {
          select: {
            level: true,
            name: true,
            image: true,
            power: true,
            upgradeCost: true,
            sellingCost: true,
            successRate: true,
          },
        },
      },
      orderBy,
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User swords details successfully",
      swords: serializeBigInt(swords),
      total: swords.length,
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.error("getUserSwords error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 4) only user's materials list + total count
export const getUserMaterials = async (req: Request, res: Response) => {
  try {
    const {
      email,
      userId,

      // optional sorting
      sortCreatedAt,
      sortCost,
      sortPower,
      rarity,
    } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    /* ---------------- VALIDATE RARITY ---------------- */
    const allowedRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

    let filterRarity: string | undefined;
    if (rarity) {
      const upper = String(rarity).toUpperCase();
      if (!allowedRarities.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid rarity. Allowed: ${allowedRarities.join(", ")}`,
        });
      }
      filterRarity = upper;
    }

    /* ---------------- WHERE CLAUSE ---------------- */
    const where: any = {
      userId: user.id,
    };

    if (filterRarity) {
      where.material = { rarity: filterRarity };
    }

    /* ---------------- ORDER BY ---------------- */
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (sortCost && ["asc", "desc"].includes(sortCost as string)) {
      orderBy.push({ material: { cost: sortCost } });
    }

    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ material: { power: sortPower } });
    }

    // ✅ default fallback
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    /* ---------------- FETCH DATA ---------------- */
    const materials = await prisma.userMaterial.findMany({
      where,
      include: {
        material: {
          select: {
            code: true,
            name: true,
            image: true,
            cost: true,
            power: true,
            rarity: true,
          },
        },
      },
      orderBy,
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User materials details successfully",
      materials: serializeBigInt(materials),
      total: materials.length,
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.error("getUserMaterials error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 5) only user's shields list + total count
export const getUserShields = async (req: Request, res: Response) => {
  try {
    const {
      email,
      userId,

      // optional sorting
      sortCreatedAt,
      sortCost,
      sortPower,
      rarity,
    } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    /* ---------------- VALIDATE RARITY ---------------- */
    const allowedRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

    let filterRarity: string | undefined;
    if (rarity) {
      const upper = String(rarity).toUpperCase();
      if (!allowedRarities.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid rarity. Allowed: ${allowedRarities.join(", ")}`,
        });
      }
      filterRarity = upper;
    }

    /* ---------------- WHERE CLAUSE ---------------- */
    const where: any = {
      userId: user.id,
    };

    if (filterRarity) {
      where.shield = { rarity: filterRarity };
    }

    /* ---------------- ORDER BY ---------------- */
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    if (sortCost && ["asc", "desc"].includes(sortCost as string)) {
      orderBy.push({ shield: { cost: sortCost } });
    }

    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ shield: { power: sortPower } });
    }

    // ✅ default fallback
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    /* ---------------- FETCH DATA ---------------- */
    const shields = await prisma.userShield.findMany({
      where,
      include: {
        shield: {
          select: {
            code: true,
            name: true,
            image: true,
            cost: true,
            power: true,
            rarity: true,
          },
        },
      },
      orderBy,
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User shields details successfully",
      shields: serializeBigInt(shields),
      total: shields.length,
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.error("getUserShields error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 6) Only user's gift list + total count
export const getUserGifts = async (req: Request, res: Response) => {
  try {
    const {
      email,
      userId,

      // optional filters
      status,
      type,
      sortCreatedAt,
    } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

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
    if (type) {
      const upper = String(type).toUpperCase();
      if (!validTypes.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid gift type. Allowed: ${validTypes.join(", ")}`,
        });
      }
      filterType = upper;
    }

    /* ---------------- WHERE CLAUSE ---------------- */
    const where: any = {
      receiverId: user.id,
    };

    if (filterStatus) {
      where.status = filterStatus;
    }

    if (filterType) {
      where.items = {
        some: {
          type: filterType,
        },
      };
    }

    /* ---------------- ORDER BY ---------------- */
    let orderBy: any | undefined;

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy = { createdAt: sortCreatedAt };
    }

    /* ---------------- FETCH ---------------- */
    const gifts = await prisma.userGift.findMany({
      where,
      include: {
        items: {
          select: {
            type: true,
            amount: true,
            materialId: true,
            materialRarity: true,
            swordLevel: true,
            shieldId: true,
            shieldRarity: true,
          },
        },
      },
      ...(orderBy ? { orderBy } : {}), // ✅ apply only if provided
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User gifts details successfully",
      gifts: serializeBigInt(gifts),
      total: gifts.length,
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.error("getUserGifts error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 7) only user's vouchers list + total count
export const getUserVouchers = async (req: Request, res: Response) => {
  try {
    const {
      email,
      userId,

      // optional filters
      status,

      // optional sorts
      sortCreatedAt,
      sortGoldAmount,
    } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

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

    /* ---------------- WHERE CLAUSE ---------------- */
    const where: any = {
      userId: user.id,
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

    // If no sort provided → Prisma default order
    const vouchers = await prisma.userVoucher.findMany({
      where,
      ...(orderBy.length > 0 ? { orderBy } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User voucher details successfully",
      vouchers: serializeBigInt(vouchers),
      total: vouchers.length,
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.error("getUserVouchers error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 8) only user's customer support list + total count
export const getUserCustomerSupports = async (req: Request, res: Response) => {
  try {
    const {
      email,
      userId,

      // optional filters
      isReviewed,
      category,
      priority,
      sortCreatedAt,
    } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

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
          error: "isReviewed must be true or false",
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

    /* ---------------- WHERE CLAUSE ---------------- */
    const where: any = {
      userId: user.id,
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

    const complaints = await prisma.customerSupport.findMany({
      where,
      ...(orderBy.length > 0 ? { orderBy } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User complaints details successfully",
      complaints: serializeBigInt(complaints),
      total: complaints.length,
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    console.error("getUserCustomerSupports error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 9) only user's marketplace pucrchases list + total count
export const getUserMarketplacePurchases = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      email,
      userId,

      // optional filters
      itemType,
      sortCreatedAt,
      sortPriceGold,
    } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    /* ---------------- VALIDATION ---------------- */
    const validItemTypes = ["SWORD", "MATERIAL", "SHIELD"];

    let filterItemType: string | undefined;
    if (itemType) {
      const upper = String(itemType).toUpperCase();
      if (!validItemTypes.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid itemType. Allowed: ${validItemTypes.join(", ")}`,
        });
      }
      filterItemType = upper;
    }

    /* ---------------- WHERE CLAUSE ---------------- */
    const where: any = {
      userId: user.id,
    };

    if (filterItemType) {
      where.marketplaceItem = {
        itemType: filterItemType,
      };
    }

    /* ---------------- ORDER BY ---------------- */
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ purchasedAt: sortCreatedAt });
    }

    if (sortPriceGold && ["asc", "desc"].includes(sortPriceGold as string)) {
      orderBy.push({ priceGold: sortPriceGold });
    }

    // default sorting (only if nothing provided)
    if (orderBy.length === 0) {
      orderBy.push({ purchasedAt: "desc" });
    }

    const purchases = await prisma.marketplacePurchase.findMany({
      where,
      orderBy,
      include: {
        marketplaceItem: {
          select: {
            id: true,
            itemType: true,
            priceGold: true,
            createdAt: true,
            swordLevelDefinition: {
              select: { level: true, name: true },
            },
            material: {
              select: { name: true, rarity: true },
            },
            shieldType: {
              select: { name: true, rarity: true },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User marketplace details successfully",
      purchases: serializeBigInt(purchases),
      total: purchases.length,
    });
  } catch (err: any) {
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }
    console.error("getUserMarketplacePurchases error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
