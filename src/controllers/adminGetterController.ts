import type { Response } from "express";
import prisma from "../database/client.ts";
import {
  MaterialRarity,
  GiftItemType,
  MarketplaceItemType,
  VoucherStatus,
  GiftStatus,
} from "@prisma/client";
import type { AdminAuthRequest } from "../middleware/adminAuth.ts";
import { resolveUser, getPagination } from "../services/queryHelpers.ts";
import { serializeBigInt } from "../services/serializeBigInt.ts";

// 1) Get the basic information of all users using pagination
export const getAllUsers = async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      sortByBanned, // 'true' | 'false' string
      sortGold, // 'asc' | 'desc'
      sortTrustPoints, // 'asc' | 'desc'
      sortMissionsDone, // 'asc' | 'desc'
      sortRegisteredDate, // 'new' | 'old'
      sortAdsViewed, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);

    // If page <= 0 → return empty result with metadata
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "There are no users in game",
        users: [],
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
        totalUsers: 0,
      });
    }

    // Build filter (only for banned status)
    const where: any = {};
    if (sortByBanned !== undefined) {
      where.isBanned = sortByBanned === "true";
    }

    // Build sorting
    const orderBy: any[] = [];
    if (sortGold) orderBy.push({ gold: sortGold });
    if (sortTrustPoints) orderBy.push({ trustPoints: sortTrustPoints });
    if (sortMissionsDone) orderBy.push({ totalMissionsDone: sortMissionsDone });
    if (sortRegisteredDate) {
      orderBy.push({
        createdAt: sortRegisteredDate === "new" ? "desc" : "asc",
      });
    }
    if (sortAdsViewed) orderBy.push({ totalAdsViewed: sortAdsViewed });

    // Default sort if nothing provided (newest first)
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Get total count
    const totalUsers = await prisma.user.count({ where });

    // Fetch paginated users
    const users = await prisma.user.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        email: true,
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
      return res.status(400).json({
        success: false,
        error: "There are no users in Game",
        users: [],
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
        totalUsers: 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Users data fetched successfully",
      users,
      page: pagination.page,
      limit: pagination.limit,
      totalUsers,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 2) get complete information about the user using his id or email
export const getUserFullDetails = async (
  req: AdminAuthRequest,
  res: Response,
) => {
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
      user: safeUser,
      vouchers: { list: vouchers, total: vouchers.length },
      swords: { list: swords, total: swords.length },
      materials: { list: materials, total: materials.length },
      shields: { list: shields, total: shields.length },
      gifts: { list: gifts, total: gifts.length },
      marketplacePurchases: {
        list: marketplacePurchases,
        total: marketplacePurchases.length,
      },
      customerSupports: {
        list: customerSupports,
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

// 3) Returns only core user table fields (no relations)
export const getUserBasicInfo = async (
  req: AdminAuthRequest,
  res: Response,
) => {
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
      user: safeUser,
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

// 4) Only user's swords + total count
export const getUserSwords = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { email, userId } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

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
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User swords details successfully",
      swords,
      total: swords.length,
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

// 5) GET /admin/users/materials
export const getUserMaterials = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { email, userId } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    const materials = await prisma.userMaterial.findMany({
      where: { userId: user.id },
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
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User materials details successfully",
      materials,
      total: materials.length,
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

// 6) GET /admin/users/shields
export const getUserShields = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { email, userId } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    const shields = await prisma.userShield.findMany({
      where: { userId: user.id },
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
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User shields details successfully",
      shields,
      total: shields.length,
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

// 7) GET /admin/users/gifts
export const getUserGifts = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { email, userId } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    const gifts = await prisma.userGift.findMany({
      where: { receiverId: user.id },
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
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User gifts details successfully",
      gifts,
      total: gifts.length,
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

// 8) GET /admin/users/vouchers
export const getUserVouchers = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { email, userId } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    const vouchers = await prisma.userVoucher.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User voucher details successfully",
      vouchers,
      total: vouchers.length,
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

// 9) GET /admin/users/complaints  (customer support)
export const getUserCustomerSupports = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { email, userId } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    const complaints = await prisma.customerSupport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User complaints details successfully",
      complaints,
      total: complaints.length,
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

// 10) GET /admin/users/marketplace-purchases
export const getUserMarketplacePurchases = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { email, userId } = req.query;

    const user = await resolveUser({
      id: userId ? String(userId) : undefined,
      email: email ? String(email) : undefined,
    });

    const purchases = await prisma.marketplacePurchase.findMany({
      where: { userId: user.id },
      include: {
        marketplaceItem: {
          select: {
            id: true,
            itemType: true,
            priceGold: true,
            createdAt: true,
            swordLevelDefinition: { select: { level: true, name: true } },
            material: { select: { name: true, rarity: true } },
            shieldType: { select: { name: true, rarity: true } },
          },
        },
      },
      orderBy: { purchasedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Fetched User marketplace details successfully",
      purchases,
      total: purchases.length,
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

// 11) Admin GET all users' materials with sorting (power, gold cost), optional rarity filter, pagination
export const getAllUsersMaterials = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      sortPower, // 'asc' | 'desc'
      sortGoldCost, // 'asc' | 'desc'
      rarity, // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' (filter)
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        materials: [],
        totalItems: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    // Validate rarity if provided
    const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
    let filterRarity: MaterialRarity | undefined;
    if (rarity) {
      const upperRarity = (rarity as string).toUpperCase();
      if (!validRarities.includes(upperRarity)) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid rarity value. Must be one of: " + validRarities.join(", "),
        });
      }
      filterRarity = upperRarity as MaterialRarity;
    }

    // Build where clause
    const where: any = {};
    if (filterRarity) {
      where.material = { rarity: filterRarity };
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ material: { power: sortPower } });
    }
    if (sortGoldCost && ["asc", "desc"].includes(sortGoldCost as string)) {
      orderBy.push({ material: { cost: sortGoldCost } });
    }
    // Default sort if none: createdAt desc
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Get total count
    const totalItems = await prisma.userMaterial.count({ where });

    // Fetch data
    const materials = await prisma.userMaterial.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        userId: true,
        quantity: true,
        createdAt: true,
        updatedAt: true,
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
      materials,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllUsersMaterials error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 12) Admin GET all users' swords with sorting (level, power), pagination
export const getAllUsersSwords = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      sortLevel, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "No users data found",
        swords: [],
        totalItems: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({ level: sortLevel });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ swordLevelDefinition: { power: sortPower } });
    }
    // Default sort if none: createdAt desc
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Get total count
    const totalItems = await prisma.userSword.count();

    // Fetch data
    const swords = await prisma.userSword.findMany({
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        code: true,
        userId: true,
        level: true,
        isOnAnvil: true,
        createdAt: true,
        updatedAt: true,
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
      message: "Users data fetched successfully",
      swords: serializeBigInt(swords),
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllUsersSwords error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 13) Admin GET all users' shields with optional rarity filter + sorting (rarity, power, cost), pagination
export const getAllUsersShields = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      rarity, // optional: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
      sortRarity, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortCost, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "info",
        shields: [],
        totalItems: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    // Optional rarity filter + validation
    let filterRarity: MaterialRarity | undefined;
    if (rarity) {
      const upper = (rarity as string).toUpperCase();
      const valid = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
      if (!valid.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid rarity. Allowed: ${valid.join(", ")}`,
        });
      }
      filterRarity = upper as MaterialRarity;
    }

    // Build where clause
    const where: any = {};
    if (filterRarity) {
      where.shield = { rarity: filterRarity };
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (sortRarity && ["asc", "desc"].includes(sortRarity as string)) {
      orderBy.push({ shield: { rarity: sortRarity } });
    }
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ shield: { power: sortPower } });
    }
    if (sortCost && ["asc", "desc"].includes(sortCost as string)) {
      orderBy.push({ shield: { cost: sortCost } });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const totalItems = await prisma.userShield.count({ where });

    const shields = await prisma.userShield.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        userId: true,
        quantity: true,
        createdAt: true,
        updatedAt: true,
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
      message: "info",
      shields,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllUsersShields error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 14) Admin GET all users' gifts with optional status filter, optional itemType filter (gifts containing that item type), sorting (createdAt, status), pagination
export const getAllUsersGifts = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      status, // optional: 'PENDING' | 'CLAIMED' | 'CANCELLED'
      itemType, // optional: 'GOLD' | 'TRUST_POINTS' | 'MATERIAL' | 'SWORD' | 'SHIELD'
      sortCreatedAt, // 'asc' | 'desc'
      // Note: No direct sort on GiftItemType as it's 1-many relation; added filter instead (more useful)
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "info",
        gifts: [],
        totalItems: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    // Optional status filter + validation
    let filterStatus: GiftStatus | undefined;
    if (status) {
      const upper = (status as string).toUpperCase();
      const valid = ["PENDING", "CLAIMED", "CANCELLED"];
      if (!valid.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid gift status. Allowed: ${valid.join(", ")}`,
        });
      }
      filterStatus = upper as GiftStatus;
    }

    // Optional itemType filter + validation (filter gifts with at least one item of this type)
    let filterItemType: GiftItemType | undefined;
    if (itemType) {
      const upper = (itemType as string).toUpperCase();
      const valid = ["GOLD", "TRUST_POINTS", "MATERIAL", "SWORD", "SHIELD"];
      if (!valid.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid gift item type. Allowed: ${valid.join(", ")}`,
        });
      }
      filterItemType = upper as GiftItemType;
    }

    // Build where clause
    const where: any = {};
    if (filterStatus) {
      where.status = filterStatus;
    }
    if (filterItemType) {
      where.items = {
        some: {
          type: filterItemType,
        },
      };
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    // Default sort if none: createdAt desc
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Get total count
    const totalItems = await prisma.userGift.count({ where });

    // Fetch data
    const gifts = await prisma.userGift.findMany({
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
            materialId: true,
            materialRarity: true,
            swordLevel: true,
            shieldId: true,
            shieldRarity: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "info",
      gifts,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllUsersGifts error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 15) Admin GET all marketplace purchases — optional itemType filter
export const getAllMarketplacePurchases = async (
  req: AdminAuthRequest,
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
      return res.status(200).json({
        success: true,
        message: "info",
        purchases: [],
        totalItems: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
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
        user: { select: { id: true, email: true } },
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
      message: "info",
      purchases,
      totalItems,
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

// 16) Admin GET all customer support — no rarity/type filter (only sorting), added message
export const getAllCustomerSupports = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { sortPriority, sortCategory, sortCreatedAt } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "info",
        supports: [],
        totalItems: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    const orderBy: any[] = [];
    if (sortPriority && ["asc", "desc"].includes(sortPriority as string)) {
      orderBy.push({ priority: sortPriority });
    }
    if (sortCategory && ["asc", "desc"].includes(sortCategory as string)) {
      orderBy.push({ category: sortCategory });
    }
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const totalItems = await prisma.customerSupport.count();

    const supports = await prisma.customerSupport.findMany({
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: "info",
      supports,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllCustomerSupports error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 17) Admin GET all users' vouchers — optional status filter + sorting
export const getAllUsersVouchers = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      status, // optional: 'PENDING' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED'
      sortCreatedAt,
      sortGoldAmount,
      sortStatus,
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(200).json({
        success: true,
        message: "info",
        vouchers: [],
        totalItems: 0,
        page: Number(req.query.page || 0),
        limit: Number(req.query.limit || 20),
      });
    }

    // Optional status filter + validation
    let filterStatus: VoucherStatus | undefined;
    if (status) {
      const upper = (status as string).toUpperCase();
      const valid = ["PENDING", "REDEEMED", "CANCELLED", "EXPIRED"];
      if (!valid.includes(upper)) {
        return res.status(400).json({
          success: false,
          error: `Invalid voucher status. Allowed: ${valid.join(", ")}`,
        });
      }
      filterStatus = upper as VoucherStatus;
    }

    const where: any = {};
    if (filterStatus) {
      where.status = filterStatus;
    }

    const orderBy: any[] = [];
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    if (sortGoldAmount && ["asc", "desc"].includes(sortGoldAmount as string)) {
      orderBy.push({ goldAmount: sortGoldAmount });
    }
    if (sortStatus && ["asc", "desc"].includes(sortStatus as string)) {
      orderBy.push({ status: sortStatus });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    const totalItems = await prisma.userVoucher.count({ where });

    const vouchers = await prisma.userVoucher.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: "info",
      vouchers,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (error) {
    console.error("getAllUsersVouchers error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

export const getAdminConfig = async (req: AdminAuthRequest, res: Response) => {
  try {
    // Fetch the single AdminConfig row (id is fixed to 1 as per your schema)
    const config = await prisma.adminConfig.findUnique({
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
      config: serializeBigInt(config),
    });
  } catch (error) {
    console.error("getAdminConfig error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch admin configuration",
    });
  }
};
