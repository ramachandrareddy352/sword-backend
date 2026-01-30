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
import { getPagination, resolveUser } from "../services/queryHelpers.ts";
import { serializeBigInt } from "../services/serializeBigInt.ts";

// 1) Get the basic information of all users using pagination
export const getAllUsers = async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      sortByBanned, // 'true' | 'false' string
      sortGold, // 'asc' | 'desc'
      sortTrustPoints, // 'asc' | 'desc'
      sortMissionsDone, // 'asc' | 'desc'
      sortRegisteredDate, // 'asc' | 'desc'
      sortAdsViewed, // 'asc' | 'desc'
    } = req.query;

    const pagination = getPagination(req.query);

    // If page <= 0 → return empty result with metadata
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "There are no users in game",
      });
    }

    // Build filter (only for banned status)
    const where: any = {};
    if (
      sortByBanned !== undefined &&
      ["true", "false"].includes(sortByBanned as string)
    ) {
      where.isBanned = sortByBanned === "true";
    }

    // Build sorting
    const orderBy: any[] = [];
    if (
      sortRegisteredDate &&
      ["asc", "desc"].includes(sortRegisteredDate as string)
    ) {
      orderBy.push({ createdAt: sortRegisteredDate });
    }
    if (sortGold && ["asc", "desc"].includes(sortGold as string)) {
      orderBy.push({ gold: sortGold });
    }
    if (
      sortTrustPoints &&
      ["asc", "desc"].includes(sortTrustPoints as string)
    ) {
      orderBy.push({ trustPoints: sortTrustPoints });
    }
    if (
      sortMissionsDone &&
      ["asc", "desc"].includes(sortMissionsDone as string)
    ) {
      orderBy.push({ totalMissionsDone: sortMissionsDone });
    }
    if (sortAdsViewed && ["asc", "desc"].includes(sortAdsViewed as string)) {
      orderBy.push({ totalAdsViewed: sortAdsViewed });
    }

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
      data: serializeBigInt(users),
      page: pagination.page,
      limit: pagination.limit,
      total: totalUsers,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// 2) Admin GET all users' materials with sorting (power, gold cost), optional rarity filter, pagination
export const getAllUsersMaterials = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      sortCreatedAt, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortGoldCost, // 'asc' | 'desc'
      rarity, // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' (filter)
      sold, // true | false
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "There are no materails in the game",
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
    // SOLD FILTER
    if (sold === "true") {
      where.soldedQuantity = { gt: 0 };
    }
    if (sold === "false") {
      where.soldedQuantity = 0;
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ material: { createdAt: sortCreatedAt } });
    }
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
      data: serializeBigInt(materials),
      total: totalItems,
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

// 3) Admin GET all users' swords with sorting (level, power), pagination
// 3) Admin GET all users' swords with sorting (level, power), pagination
export const getAllUsersSwords = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      sortCreatedAt, // 'asc' | 'desc'
      sortLevel, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sold, // 'true' | 'false' | undefined (all)
      page = 1,
      limit = 20,
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    // Build where clause
    const where: any = {};

    // Sold filter
    if (sold === "true") where.isSolded = true;
    if (sold === "false") where.isSolded = false;
    // undefined → show all

    // Build orderBy array (multiple sorts supported)
    const orderBy: any[] = [];

    // Direct fields on UserSword
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt }); // ← FIXED: no nesting
    }
    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({ level: sortLevel });
    }

    // Nested relation fields
    if (sortPower && ["asc", "desc"].includes(sortPower as string)) {
      orderBy.push({ swordLevelDefinition: { power: sortPower } });
    }

    // Default sort if none provided
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Get total count
    const totalItems = await prisma.userSword.count({ where });

    // Fetch swords with user details
    const swords = await prisma.userSword.findMany({
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
      data: serializeBigInt(swords),
      total: totalItems,
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

// 4) Admin GET all users' shields with optional rarity filter + sorting (rarity, power, cost), pagination
export const getAllUsersShields = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      sortCreatedAt, // 'asc' | 'desc'
      rarity, // optional: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
      sortRarity, // 'asc' | 'desc'
      sortPower, // 'asc' | 'desc'
      sortCost, // 'asc' | 'desc'
      sold, // true | false
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "There are no shields in the game",
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

    // SOLD FILTER
    if (sold === "true") where.soldedQuantity = { gt: 0 };
    if (sold === "false") where.soldedQuantity = 0;

    // Build orderBy
    const orderBy: any[] = [];
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ material: { createdAt: sortCreatedAt } });
    }
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
      data: serializeBigInt(shields),
      total: totalItems,
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

// 5) Admin GET all users' gifts with optional status filter, optional itemType filter (gifts containing that item type), sorting (createdAt, status), pagination
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
      return res.status(400).json({
        success: false,
        error: "Ther are no gifts",
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
      message: "Users gifts fetched successfully",
      data: serializeBigInt(gifts),
      total: totalItems,
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

// 6) Admin GET all customer support — no rarity/type filter (only sorting), added message
export const getAllCustomerSupports = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { sortPriority, sortCategory, sortCreatedAt } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "No complaints found",
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
      data: serializeBigInt(supports),
      total: totalItems,
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

// 7) Admin GET all users' vouchers — optional status filter + sorting
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
      return res.status(400).json({
        success: false,
        message: "Data not found",
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
      data: serializeBigInt(vouchers),
      total: totalItems,
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

// 8) admin config data
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
