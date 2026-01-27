import type { Response } from "express";
import prisma from "../database/client.ts";
import {
  MaterialRarity,
  GiftItemType,
  MarketplaceItemType,
} from "@prisma/client";
import type { AdminAuthRequest } from "../middleware/adminAuth.ts";
import { generateSecureCode } from "../services/generateCode.ts";
import { serializeBigInt } from "../services/serializeBigInt.ts";

async function ensureNotPurchased(itemId: bigint) {
  const purchase = await prisma.marketplacePurchase.findFirst({
    where: { marketplaceItemId: itemId },
    select: { id: true },
  });
  if (purchase) {
    throw new Error("ITEM_ALREADY_PURCHASED");
  }
}

// 1) Admin can update the config data
export async function updateAdminConfig(req: AdminAuthRequest, res: Response) {
  try {
    const data = req.body;
    const updateData: any = {};

    if (data.maxDailyAds !== undefined) {
      if (!Number.isInteger(data.maxDailyAds) || data.maxDailyAds < 0) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid maxDailyAds" });
      }
      updateData.maxDailyAds = data.maxDailyAds;
    }
    if (data.maxDailyMissions !== undefined) {
      if (
        !Number.isInteger(data.maxDailyMissions) ||
        data.maxDailyMissions < 0
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid maxDailyMissions" });
      }
      updateData.maxDailyMissions = data.maxDailyMissions;
    }
    if (data.defaultTrustPoints !== undefined) {
      if (
        !Number.isInteger(data.defaultTrustPoints) ||
        data.defaultTrustPoints < 0
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid defaultTrustPoints" });
      }
      updateData.defaultTrustPoints = data.defaultTrustPoints;
    }

    if (data.minVoucherGold !== undefined) {
      updateData.minVoucherGold = BigInt(data.minVoucherGold);
    }
    if (data.maxVoucherGold !== undefined) {
      updateData.maxVoucherGold = BigInt(data.maxVoucherGold);
    }
    if (
      updateData.minVoucherGold !== undefined &&
      updateData.maxVoucherGold !== undefined &&
      updateData.minVoucherGold > updateData.maxVoucherGold
    ) {
      return res.status(400).json({
        success: false,
        error: "minVoucherGold cannot be greater than maxVoucherGold",
      });
    }
    if (data.voucherExpiryDays !== undefined) {
      if (
        !Number.isInteger(data.voucherExpiryDays) ||
        data.voucherExpiryDays < 0
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid voucherExpiryDays" });
      }
      updateData.voucherExpiryDays = data.voucherExpiryDays;
    }
    if (data.expiryallowVoucherCancel !== undefined) {
      updateData.expiryallowVoucherCancel = Boolean(
        data.expiryallowVoucherCancel,
      );
    }

    // Do NOT allow changing adminEmailId through API
    if (data.adminEmailId !== undefined) {
      return res.status(403).json({
        success: false,
        error: "Admin EmailId update not allowed through API",
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No valid fields to update" });
    }

    const config = await prisma.adminConfig.update({
      where: { id: 1 },
      data: updateData,
    });

    return res.json({
      success: true,
      message: "Admin configuration updated",
      data: config,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

// 2) CREATE (or) UPDATE Sword Level Definition
export async function upsertSwordLevel(req: AdminAuthRequest, res: Response) {
  try {
    const {
      name,
      image,
      description,
      upgradeCost,
      sellingCost,
      successRate,
      power,
      createnew,
    } = req.body;

    // ---------- Validation ----------
    if (
      !name ||
      !image ||
      upgradeCost === undefined ||
      successRate <= 0 ||
      successRate > 100 ||
      power <= 0
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing fields" });
    }

    const upgradeCostBigInt = BigInt(upgradeCost);
    const sellingCostBigInt = BigInt(sellingCost);

    // ---------- Transaction ----------
    const result = await prisma.$transaction(async (tx) => {
      // Check if sword already exists by name
      const existing = await tx.swordLevelDefinition.findUnique({
        where: { name },
      });

      if (createnew === "yes" && existing) {
        return res.status(400).json({
          success: false,
          error: "Sword is already existed with that name",
        });
      }

      // update the existing Sword
      if (existing) {
        return tx.swordLevelDefinition.update({
          where: { id: existing.id },
          data: {
            image,
            description,
            upgradeCost: upgradeCostBigInt,
            sellingCost: sellingCostBigInt,
            successRate,
            power,
          },
        });
      }

      // CREATE NEW LEVEL (auto increment)
      const agg = await tx.swordLevelDefinition.aggregate({
        _max: { level: true },
      });
      const currentMax = agg._max.level ?? -1;
      const nextLevel = currentMax + 1;

      // Enforce 0 → 100
      if (nextLevel > 100) {
        return res.status(400).json({
          success: false,
          error: "Maximum sword level (100) already reached.",
        });
      }

      return tx.swordLevelDefinition.create({
        data: {
          level: nextLevel,
          name,
          image,
          description: description || null,
          upgradeCost: upgradeCostBigInt,
          sellingCost: sellingCostBigInt,
          successRate,
          power,
        },
      });
    });

    return res.json({
      success: true,
      message: "Sword level upserted successfully",
      data: serializeBigInt(result),
    });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

// 3) CREATE (or) UPDATE Material Data
export async function upsertMaterial(req: AdminAuthRequest, res: Response) {
  try {
    const { code, name, description, image, cost, power, rarity } = req.body;

    // ---------- Validation ----------
    if (!name || !image || cost === undefined || power === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }
    if (typeof power !== "number" || power <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid power value < 0" });
    }

    const costBigInt = BigInt(cost);
    if (costBigInt <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid cost value < 0" });
    }
    if (rarity && !Object.values(MaterialRarity).includes(rarity)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid material rarity" });
    }

    // ---------- CASE 1: CODE PROVIDED → UPDATE ----------
    if (code) {
      const existing = await prisma.materialType.findUnique({
        where: { code },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Material not found" });
      }

      const updated = await prisma.materialType.update({
        where: { code },
        data: {
          name,
          description: description || null,
          image,
          cost: costBigInt,
          power,
          rarity: rarity || existing.rarity,
        },
      });

      return res.json({
        success: true,
        message: "Material updated successfully",
        data: updated,
      });
    }

    // ---------- CASE 2: NO CODE → CREATE ----------
    let generatedCode: string;
    let created;

    // Avoid rare collision
    for (let i = 0; i < 5; i++) {
      generatedCode = generateSecureCode(12);
      try {
        created = await prisma.materialType.create({
          data: {
            code: generatedCode,
            name,
            description: description || null,
            image,
            cost: costBigInt,
            power,
            rarity: rarity || "COMMON",
          },
        });
        break;
      } catch (err: any) {
        if (err.code !== "P2002") throw err;
      }
    }

    if (!created) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate unique material code",
      });
    }

    return res.json({
      success: true,
      message: "Material created successfully",
      data: created,
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, error: "Material code already exists" });
    }
    return res
      .status(500)
      .json({ success: false, error: "Failed to upsert material" });
  }
}

// 4) CREATE (or) UPDATE Shield Data
export async function upsertShield(req: AdminAuthRequest, res: Response) {
  try {
    const { code, name, description, image, cost, power, rarity } = req.body;

    // ---------- Basic Validation ----------
    if (!name || !image || cost === undefined || power === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }
    if (typeof power !== "number" || power <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid power value" });
    }

    let costBigInt: bigint;
    try {
      costBigInt = BigInt(cost);
      if (costBigInt <= 0) throw new Error();
    } catch {
      return res
        .status(400)
        .json({ success: false, error: "Invalid cost value" });
    }

    if (rarity && !Object.values(MaterialRarity).includes(rarity)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid shield rarity" });
    }

    // ---------- CASE 1: CODE PROVIDED → UPDATE ----------
    if (code) {
      const existing = await prisma.shieldType.findUnique({ where: { code } });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, error: "Shield not found" });
      }

      const updated = await prisma.shieldType.update({
        where: { code },
        data: {
          name,
          description: description || existing.description,
          image,
          cost: costBigInt,
          power,
          rarity: rarity || existing.rarity,
        },
      });

      return res.json({
        success: true,
        message: "Shield updated successfully",
        data: updated,
      });
    }

    // ---------- CASE 2: NO CODE → CREATE ----------
    let createdShield: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const generatedCode = generateSecureCode(12);
      try {
        createdShield = await prisma.shieldType.create({
          data: {
            code: generatedCode,
            name,
            description: description || null,
            image,
            cost: costBigInt,
            power,
            rarity: rarity || "COMMON",
          },
        });
        break;
      } catch (err: any) {
        if (err.code !== "P2002") {
          throw err;
        }
      }
    }

    if (!createdShield) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate unique shield code",
      });
    }

    return res.json({
      success: true,
      message: "Shield created successfully",
      data: createdShield,
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, error: "Shield code already exists" });
    }
    return res
      .status(500)
      .json({ success: false, error: "Failed to upsert shield" });
  }
}

// 5) Create Gift for user (by email or id)
export async function createGift(req: AdminAuthRequest, res: Response) {
  try {
    const { email, userId, items, note } = req.body;
    let receiverId: bigint;
    let receiverUser;

    // ---------- Resolve User ----------
    if (userId) {
      receiverUser = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { id: true, isBanned: true },
      });
      if (!receiverUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found with this userId" });
      }
    } else if (email) {
      receiverUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, isBanned: true },
      });
      if (!receiverUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found with this email" });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Provide userId or email" });
    }

    // BANNED USER CHECK
    if (receiverUser.isBanned) {
      return res
        .status(403)
        .json({ success: false, error: "Cannot send gifts to a banned user" });
    }
    receiverId = receiverUser.id;

    // ---------- Validate Items ----------
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "At least one gift item is required" });
    }

    // ---------- Validate & Verify Items ----------
    for (const item of items) {
      if (!Object.values(GiftItemType).includes(item.type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid gift item type: ${item.type}`,
        });
      }

      // GOLD / TRUST
      if (
        (item.type === "GOLD" || item.type === "TRUST_POINTS") &&
        (!item.amount || item.amount <= 0)
      ) {
        return res.status(400).json({
          success: false,
          error: `${item.type} requires a valid amount`,
        });
      }

      // MATERIAL
      if (item.type === "MATERIAL") {
        if (!item.materialId) {
          return res.status(400).json({
            success: false,
            error: "Material gift requires materialId",
          });
        }
        const materialExists = await prisma.materialType.findUnique({
          where: { id: BigInt(item.materialId) },
          select: { id: true },
        });
        if (!materialExists) {
          return res.status(404).json({
            success: false,
            error: `Material not found (id=${item.materialId})`,
          });
        }
      }

      // SWORD
      if (item.type === "SWORD") {
        if (item.swordLevel === undefined) {
          return res
            .status(400)
            .json({ success: false, error: "Sword gift requires swordLevel" });
        }
        const swordLevelExists = await prisma.swordLevelDefinition.findUnique({
          where: { level: item.swordLevel },
          select: { id: true },
        });
        if (!swordLevelExists) {
          return res.status(404).json({
            success: false,
            error: `Sword level not found (level=${item.swordLevel})`,
          });
        }
      }

      // SHIELD
      if (item.type === "SHIELD") {
        if (!item.shieldId) {
          return res
            .status(400)
            .json({ success: false, error: "Shield gift requires shieldId" });
        }
        const shieldExists = await prisma.shieldType.findUnique({
          where: { id: BigInt(item.shieldId) },
          select: { id: true },
        });
        if (!shieldExists) {
          return res.status(404).json({
            success: false,
            error: `Shield not found (id=${item.shieldId})`,
          });
        }
      }
    }

    // ---------- Create Gift ----------
    const gift = await prisma.userGift.create({
      data: {
        receiverId,
        note: note || null,
        items: {
          create: items.map((item: any) => ({
            type: item.type,
            amount: item.amount ? BigInt(item.amount) : null,
            materialId: item.materialId ? BigInt(item.materialId) : null,
            swordLevel: item.swordLevel ?? null,
            shieldId: item.shieldId ? BigInt(item.shieldId) : null,
            shieldRarity: item.shieldRarity || null,
          })),
        },
      },
      include: { items: true },
    });

    return res.json({
      success: true,
      message: "Gift created successfully",
      data: gift,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create gift" });
  }
}

// 6) Cancel gift if not claimed
export async function cancelGift(req: AdminAuthRequest, res: Response) {
  try {
    const giftId = BigInt(req.body.giftId);
    const gift = await prisma.userGift.findUnique({
      where: { id: giftId },
      select: { status: true },
    });

    if (!gift) {
      return res.status(404).json({ success: false, error: "Gift not found" });
    }
    if (gift.status !== "PENDING") {
      return res
        .status(400)
        .json({ success: false, error: "Only pending gifts can be cancelled" });
    }

    await prisma.userGift.update({
      where: { id: giftId },
      data: { status: "CANCELLED" },
    });

    return res.json({ success: true, message: "Gift cancelled successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to cancel gift" });
  }
}

// 7) Delete gift if not claimed
export async function deleteGift(req: AdminAuthRequest, res: Response) {
  try {
    const giftId = BigInt(req.body.giftId);
    const gift = await prisma.userGift.findUnique({
      where: { id: giftId },
      select: { status: true },
    });

    if (!gift) {
      return res.status(404).json({ success: false, error: "Gift not found" });
    }
    if (gift.status !== "PENDING") {
      return res
        .status(400)
        .json({ success: false, error: "Only pending gifts can be deleted" });
    }

    await prisma.$transaction([
      prisma.userGiftItem.deleteMany({ where: { giftId } }),
      prisma.userGift.delete({ where: { id: giftId } }),
    ]);

    return res.json({ success: true, message: "Gift deleted successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete gift" });
  }
}

// 8) Create a item in marketplace for sale
export async function createMarketplaceItem(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const {
      itemType,
      swordLevelDefinitionId,
      materialId,
      shieldTypeId,
      rarity,
      shieldRarity,
      priceGold,
    } = req.body;

    // ---------- Validation ----------
    if (!itemType || priceGold === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "itemType and priceGold are required" });
    }
    if (!Object.values(MarketplaceItemType).includes(itemType)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid itemType" });
    }

    let price: bigint;
    try {
      price = BigInt(priceGold);
      if (price <= 0) throw new Error();
    } catch {
      return res
        .status(400)
        .json({ success: false, error: "Invalid priceGold value" });
    }

    const data: any = { itemType, priceGold: price, isActive: true };
    // ---------- SWORD ----------
    if (itemType === "SWORD") {
      if (!swordLevelDefinitionId) {
        return res.status(400).json({
          success: false,
          error: "swordLevelDefinitionId is required",
        });
      }

      const sword = await prisma.swordLevelDefinition.findUnique({
        where: { id: BigInt(swordLevelDefinitionId) },
        select: { id: true },
      });

      if (!sword) {
        return res
          .status(404)
          .json({ success: false, error: "Sword level definition not found" });
      }
      data.swordLevelDefinitionId = sword.id;
    }

    // ---------- MATERIAL ----------
    else if (itemType === "MATERIAL") {
      if (!materialId) {
        return res
          .status(400)
          .json({ success: false, error: "materialId is required" });
      }

      const material = await prisma.materialType.findUnique({
        where: { id: BigInt(materialId) },
        select: { id: true },
      });
      if (!material) {
        return res
          .status(404)
          .json({ success: false, error: "Material not found" });
      }

      if (rarity && !Object.values(MaterialRarity).includes(rarity)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid material rarity" });
      }

      data.materialId = material.id;
      data.rarity = rarity || null; // quantity always = 1
    }

    // // ---------- SHIELD ----------
    else if (itemType === "SHIELD") {
      if (!shieldTypeId) {
        return res
          .status(400)
          .json({ success: false, error: "shieldTypeId is required" });
      }

      const shield = await prisma.shieldType.findUnique({
        where: { id: BigInt(shieldTypeId) },
        select: { id: true },
      });

      if (!shield) {
        return res
          .status(404)
          .json({ success: false, error: "Shield not found" });
      }
      if (
        shieldRarity &&
        !Object.values(MaterialRarity).includes(shieldRarity)
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid shield rarity" });
      }

      data.shieldTypeId = shield.id;
      data.shieldRarity = shieldRarity || null;
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Item type" });
    }

    const item = await prisma.marketplaceItem.create({ data });

    return res.json({
      success: true,
      message: "Marketplace item created successfully",
      data: item,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create marketplace item" });
  }
}

// 9) Toggle Deactivate a item in marketplace for sale before purchase
export async function toggleMarketplaceItemActive(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const { id, isActive } = req.body;
    if (id === undefined || typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "id and isActive(boolean) are required",
      });
    }
    let itemId: bigint;

    try {
      itemId = BigInt(id);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid item id" });
    }

    const item = await prisma.marketplaceItem.findUnique({
      where: { id: itemId },
      select: { id: true, isActive: true },
    });
    if (!item) {
      return res
        .status(404)
        .json({ success: false, error: "Marketplace item not found" });
    }

    // Block if already purchased
    await ensureNotPurchased(itemId);

    // Idempotent behavior
    if (item.isActive === isActive) {
      return res.json({
        success: true,
        message: `Marketplace item already ${isActive ? "active" : "inactive"}`,
      });
    }

    await prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { isActive },
    });

    return res.json({
      success: true,
      message: `Marketplace item ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (err: any) {
    console.error(err);
    if (err.message === "ITEM_ALREADY_PURCHASED") {
      return res.status(400).json({
        success: false,
        error: "Item already purchased, cannot change status",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Failed to update marketplace item status",
    });
  }
}

// 10) Delete a item in marketplace for sale before purchase
export async function deleteMarketplaceItem(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const itemId = BigInt(req.body.id);

    await ensureNotPurchased(itemId);

    await prisma.marketplaceItem.delete({ where: { id: itemId } });

    return res.json({ success: true, message: "Marketplace item deleted" });
  } catch (err: any) {
    console.error(err);
    if (err.message === "ITEM_ALREADY_PURCHASED") {
      return res.status(400).json({
        success: false,
        error: "Item already purchased, cannot delete",
      });
    }
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete marketplace item" });
  }
}

// 11) update gold price for item in marketplace for sale before purchase
export async function updateMarketplaceItemPrice(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const itemId = BigInt(req.body.id);
    const { priceGold } = req.body;
    if (priceGold === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "priceGold is required" });
    }
    let price: bigint;

    try {
      price = BigInt(priceGold);
      if (price <= 0) throw new Error();
    } catch {
      return res
        .status(400)
        .json({ success: false, error: "Invalid priceGold value" });
    }

    await ensureNotPurchased(itemId);

    await prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { priceGold: price },
    });

    return res.json({
      success: true,
      message: "Marketplace item price updated",
    });
  } catch (err: any) {
    console.error(err);
    if (err.message === "ITEM_ALREADY_PURCHASED") {
      return res.status(400).json({
        success: false,
        error: "Item already purchased, cannot update price",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Failed to update marketplace item price",
    });
  }
}

// 12) Ban or unBan the user
export async function toggleUserBan(req: AdminAuthRequest, res: Response) {
  try {
    const { id, ban } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "User id is required" });
    }
    if (typeof ban !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "ban must be a boolean" });
    }

    let userId: bigint;
    try {
      userId = BigInt(id);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid user id" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBanned: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    // Idempotent
    if (user.isBanned === ban) {
      return res.json({
        success: true,
        message: ban ? "User already banned" : "User already unbanned",
        data: user,
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: ban },
      select: { id: true, email: true, isBanned: true },
    });

    return res.json({
      success: true,
      message: ban ? "User banned successfully" : "User unbanned successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update user ban status" });
  }
}

// 13) Reply to / Mark as reviewed support ticket
export async function replyToSupportTicket(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const { id, adminReply } = req.body;
    if (!adminReply || !adminReply.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Reply content is required" });
    }

    let ticketId: bigint;
    try {
      ticketId = BigInt(id);
    } catch {
      return res
        .status(400)
        .json({ success: false, error: "Invalid ticket id" });
    }

    const ticket = await prisma.customerSupport.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, error: "Support ticket not found" });
    }

    const updated = await prisma.customerSupport.update({
      where: { id: ticketId },
      data: { adminReply, isReviewed: true, reviewedAt: new Date() },
      select: { id: true, title: true, isReviewed: true, adminReply: true },
    });

    return res.json({
      success: true,
      message: "Reply sent and ticket marked as reviewed",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to reply to support ticket" });
  }
}
