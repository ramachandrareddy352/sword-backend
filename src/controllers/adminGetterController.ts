import type { Response } from "express";
import prisma from "../database/client";
import { MaterialRarity, VoucherStatus } from "@prisma/client";
import type { AdminAuthRequest } from "../middleware/adminAuth";
import { getPagination } from "../services/queryHelpers";
import { serializeBigInt } from "../services/serializeBigInt";

// 1) Get the basic information of all users using pagination
export const getAllUsers = async (req: AdminAuthRequest, res: Response) => {
  try {
    const {
      sortByBanned, // 'true' | 'false' (filter only)
      sortGold, // 'asc' | 'desc'
      sortTrustPoints, // 'asc' | 'desc'
      sortTotalShields, // 'asc' | 'desc'
      sortTotalAdsViewed, // 'asc' | 'desc'
      sortTotalMissionsDone, // 'asc' | 'desc'
      sortRegisteredDate, // 'asc' | 'desc' (createdAt)
    } = req.query;

    const pagination = getPagination(req.query);

    // If pagination invalid → early return
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    // Build WHERE clause (only for banned filter)
    const where: any = {};
    if (
      sortByBanned !== undefined &&
      ["true", "false"].includes(sortByBanned as string)
    ) {
      where.isBanned = sortByBanned === "true";
    }

    // Build ORDER BY array
    const orderBy: any[] = [];

    // Registered date (createdAt)
    if (
      sortRegisteredDate &&
      ["asc", "desc"].includes(sortRegisteredDate as string)
    ) {
      orderBy.push({ createdAt: sortRegisteredDate });
    }

    // Gold
    if (sortGold && ["asc", "desc"].includes(sortGold as string)) {
      orderBy.push({ gold: sortGold });
    }

    // Trust Points
    if (
      sortTrustPoints &&
      ["asc", "desc"].includes(sortTrustPoints as string)
    ) {
      orderBy.push({ trustPoints: sortTrustPoints });
    }

    // Total Shields
    if (
      sortTotalShields &&
      ["asc", "desc"].includes(sortTotalShields as string)
    ) {
      orderBy.push({ totalShields: sortTotalShields });
    }

    // Total Ads Viewed
    if (
      sortTotalAdsViewed &&
      ["asc", "desc"].includes(sortTotalAdsViewed as string)
    ) {
      orderBy.push({ totalAdsViewed: sortTotalAdsViewed });
    }

    // Total Missions Done
    if (
      sortTotalMissionsDone &&
      ["asc", "desc"].includes(sortTotalMissionsDone as string)
    ) {
      orderBy.push({ totalMissionsDone: sortTotalMissionsDone });
    }

    // Default sort: newest users first
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Get total count (with optional banned filter)
    const totalUsers = await prisma.user.count({ where });

    // Fetch paginated users with full basic details
    const users = await prisma.user.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        email: true,
        name: true,
        profileLogo: true,
        gold: true,
        trustPoints: true,
        totalShields: true,
        totalAdsViewed: true,
        oneDayAdsViewed: true,
        totalMissionsDone: true,
        todayMissionsDone: true,
        createdAt: true,
        lastReviewed: true,
        lastLoginAt: true,
        isBanned: true,
        anvilSwordId: true,
        soundOn: true,
      },
    });

    // If no users match criteria
    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users found matching the criteria",
        data: [],
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
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

// 2) Admin GET all users' swords with sorting (level, power, isBroken, isSolded), pagination
export const getAllUsersSwords = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      sortCreatedAt, // 'asc' | 'desc'
      sortLevel, // 'asc' | 'desc'
      sold, // 'true' | 'false' | undefined (filter isSolded)
      broken, // 'true' | 'false' | undefined (filter isBroken)
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
    if (sold === "true") {
      where.isSolded = true;
    } else if (sold === "false") {
      where.isSolded = false;
    }

    // Broken filter
    if (broken === "true") {
      where.isBroken = true;
    } else if (broken === "false") {
      where.isBroken = false;
    }

    // Build orderBy array (multiple sorts supported)
    const orderBy: any[] = [];

    // Direct fields on UserSword
    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    if (sortLevel && ["asc", "desc"].includes(sortLevel as string)) {
      orderBy.push({ level: sortLevel });
    }

    // Default sort if none provided: newest first
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Get total count
    const totalItems = await prisma.userSword.count({ where });

    // Fetch swords with user & sword definition details
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
        isBroken: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileLogo: true,
            isBanned: true,
            gold: true,
            trustPoints: true,
          },
        },
        swordLevelDefinition: {
          select: {
            name: true,
            image: true,
            description: true,
            upgradeCost: true,
            sellingCost: true,
            buyingCost: true,
            synthesizeCost: true,
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

// 3) Admin GET all users' materials with sorting (power, gold cost), optional rarity filter, pagination
export const getAllUsersMaterials = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const {
      sortCreatedAt, // 'asc' | 'desc'
      rarity, // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' (filter)
      sold, // 'true' | 'false' (filter soldedQuantity > 0 or = 0)
    } = req.query;

    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
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
          error: `Invalid rarity value. Must be one of: ${validRarities.join(", ")}`,
        });
      }
      filterRarity = upperRarity as MaterialRarity;
    }

    // Build where clause
    const where: any = {};
    if (filterRarity) {
      where.material = { rarity: filterRarity };
    }
    if (sold === "true") {
      where.soldedQuantity = { gt: 0 };
    }
    if (sold === "false") {
      where.soldedQuantity = 0;
    }

    // Build orderBy
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }

    // Default sort: newest first
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
        unsoldQuantity: true,
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
            buyingCost: true,
            sellingCost: true,
            rarity: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Users' materials fetched successfully",
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

// 4) admin config data
export const getAdminConfig = async (_req: AdminAuthRequest, res: Response) => {
  try {
    // Fetch the single AdminConfig row (id is fixed to 1 as per your schema)
    const config = await prisma.adminConfig.findUnique({
      where: { id: 1 }, // BigInt literal (1n),
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

// 5) Admin GET all users' gifts with optional status filter, optional itemType filter, sorting (createdAt, status), pagination
export async function getAllUsersGifts(req: AdminAuthRequest, res: Response) {
  try {
    const {
      status, // optional: "PENDING" | "CLAIMED" | "CANCELLED"
      itemType, // optional: "GOLD" | "TRUST_POINTS" | "MATERIAL" | "SWORD" | "SHIELD"
      sortCreatedAt, // "asc" | "desc"
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

    // Status filter
    if (
      status &&
      ["PENDING", "CLAIMED", "CANCELLED"].includes(status as string)
    ) {
      where.status = status;
    }

    // Item Type filter (gifts that contain at least one item of this type)
    if (
      itemType &&
      ["GOLD", "TRUST_POINTS", "MATERIAL", "SWORD", "SHIELD"].includes(
        itemType as string,
      )
    ) {
      where.items = {
        some: {
          type: itemType,
        },
      };
    }

    // Build orderBy (for direct fields on UserGift)
    const orderBy: any[] = [];

    if (sortCreatedAt && ["asc", "desc"].includes(sortCreatedAt as string)) {
      orderBy.push({ createdAt: sortCreatedAt });
    }
    // Default sort: newest first
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: "desc" });
    }

    // Fetch gifts with deep relations
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
            amount: true, // used for GOLD, TRUST_POINTS, SHIELD
            materialId: true,
            materialQunatity: true,
            material: {
              select: {
                id: true,
                name: true,
                code: true,
                image: true,
                description: true,
                buyingCost: true,
                sellingCost: true,
                rarity: true,
              },
            },
            swordLevel: true,
            swordLevelDefinition: {
              select: {
                id: true,
                level: true,
                name: true,
                image: true,
                description: true,
                upgradeCost: true,
                sellingCost: true,
                successRate: true,
              },
            },
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

    // Total count
    const totalItems = await prisma.userGift.count({ where });

    return res.status(200).json({
      success: true,
      message: "Gifts fetched successfully",
      data: serializeBigInt(gifts),
      total: totalItems,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("getAllUsersGifts error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch gifts",
    });
  }
}

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
            profileLogo: true,
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

// 8) verify weaher user is a registered one or not
export const checkUserByEmail = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { email } = req.query;

    // 1. Input validation
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: "Valid email address is required in the request body",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Find user (only select safe/public fields)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        isBanned: true,
        createdAt: true,
      },
    });

    // 3. Response
    if (!user) {
      return res.status(400).json({
        success: false,
        exists: false,
        error: "No user registered with this email",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      message: "User found",
      data: serializeBigInt(user),
    });
  } catch (err: any) {
    console.error("[checkUserByEmail] Error:", err);

    // In production, you might want to hide full error details
    return res.status(500).json({
      success: false,
      error: "Internal server error while checking user",
    });
  }
};
