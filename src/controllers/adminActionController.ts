import type { Request, Response } from "express";
import prisma from "../database/client";
import {
  MaterialRarity,
  GiftItemType,
  MarketplaceItemType,
} from "@prisma/client";
import type { AdminAuthRequest } from "../middleware/adminAuth";
import { generateSecureCode } from "../services/generateCode";
import { serializeBigInt } from "../services/serializeBigInt";
import { uploadToCloudinary } from "../services/uploadToCloudinary";
import cloudinary from "../config/cloudinary";

async function ensureNotPurchased(itemId: bigint) {
  const purchase = await prisma.marketplacePurchase.findFirst({
    where: { marketplaceItemId: itemId },
    select: { id: true },
  });
  if (purchase) {
    throw new Error("ITEM_ALREADY_PURCHASED");
  }
}

function getPublicIdFromUrl(url: string): string | null {
  try {
    const parts = url.split("/");
    const filenameWithExt = parts[parts.length - 1];
    const filename = filenameWithExt.split(".")[0];
    const folderPath = parts.slice(parts.indexOf("upload") + 2, -1).join("/");
    return folderPath ? `${folderPath}/${filename}` : filename;
  } catch {
    return null;
  }
}

export async function updateAdminConfig(req: Request, res: Response) {
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
      data: serializeBigInt(config),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

export async function createSwordLevel(req: AdminAuthRequest, res: Response) {
  try {
    const { name, description, upgradeCost, sellingCost, successRate, power } =
      req.body;

    if (
      !name ||
      upgradeCost === undefined ||
      sellingCost === undefined ||
      parseFloat(successRate) <= 0 ||
      parseFloat(successRate) > 100 ||
      power <= 0
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing fields" });
    }

    if (power <= 0 || BigInt(upgradeCost) <= 0 || BigInt(sellingCost) <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid power or cost" });
    }

    const existing = await prisma.swordLevelDefinition.findUnique({
      where: { name },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Sword name already exists",
      });
    }

    const agg = await prisma.swordLevelDefinition.aggregate({
      _max: { level: true },
    });
    const nextLevel = (agg._max.level ?? -1) + 1;

    if (nextLevel > 100) {
      return res.status(400).json({
        success: false,
        error: "Maximum sword level (100) reached",
      });
    }

    const file = (req as any).file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "Missing sword file" });
    }

    const uploaded: any = await uploadToCloudinary(
      file.buffer,
      "sword-game/swords",
    );

    const image = uploaded.secure_url;
    if (!image || image === "") {
      return res
        .status(400)
        .json({ success: false, error: "Image is failed to upload" });
    }

    const created = await prisma.swordLevelDefinition.create({
      data: {
        level: nextLevel,
        name,
        image,
        description: description || null,
        upgradeCost: BigInt(upgradeCost),
        sellingCost: BigInt(sellingCost),
        successRate: parseFloat(successRate),
        power: Number(power),
      },
    });

    return res.json({
      success: true,
      message: "Sword level created successfully",
      data: serializeBigInt(created),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Failed to create sword level",
    });
  }
}

export async function updateSwordLevel(req: AdminAuthRequest, res: Response) {
  try {
    const {
      level,
      name,
      isImageChanged,
      description,
      upgradeCost,
      sellingCost,
      successRate,
      power,
    } = req.body;

    // ---------- Validation ----------
    if (level === undefined && !name) {
      return res.status(400).json({
        success: false,
        error: "Either sword level or name is required",
      });
    }

    // ---------- Find Existing Sword ----------
    const existing = await prisma.swordLevelDefinition.findFirst({
      where: {
        OR: [
          level !== undefined ? { level: Number(level) } : undefined,
          name ? { name } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Sword is not founded",
      });
    }

    // ---------- Field Validation ----------
    if (successRate !== undefined) {
      if (successRate <= 0 || successRate > 100) {
        return res.status(400).json({
          success: false,
          error: "Success rate must be between 1 and 100",
        });
      }
    }

    if (power !== undefined && power <= 0) {
      return res.status(400).json({
        success: false,
        error: "Power must be greater than 0",
      });
    }

    if (upgradeCost !== undefined && BigInt(upgradeCost) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Upgrade cost must be greater than 0",
      });
    }

    if (sellingCost !== undefined && BigInt(sellingCost) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Selling cost must be greater than 0",
      });
    }

    let image = undefined;
    const file = (req as any).file;

    if (isImageChanged === "yes" && file) {
      const uploaded: any = await uploadToCloudinary(
        file.buffer,
        "sword-game/swords",
      );
      image = uploaded.secure_url;
      if (!image || image === "") {
        return res.status(400).json({
          success: false,
          error: "Image is failed to upload",
        });
      }
      if (existing.image) {
        const oldPublicId = getPublicIdFromUrl(existing.image);
        if (oldPublicId) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      }
    }

    // ---------- Update ----------
    const updated = await prisma.swordLevelDefinition.update({
      where: { id: existing.id },
      data: {
        image: image ?? existing.image,
        description: description ?? existing.description,
        upgradeCost:
          upgradeCost !== undefined
            ? BigInt(upgradeCost)
            : existing.upgradeCost,
        sellingCost:
          sellingCost !== undefined
            ? BigInt(sellingCost)
            : existing.sellingCost,
        successRate: parseFloat(successRate) ?? existing.successRate,
        power: Number(power) ?? existing.power,
      },
    });

    return res.json({
      success: true,
      message: "Sword level updated successfully",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error("updateSwordLevel error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update sword level",
    });
  }
}

export async function createMaterial(req: AdminAuthRequest, res: Response) {
  try {
    const { name, description, cost, power, rarity } = req.body;

    if (!name || cost === undefined || power === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const existing = await prisma.materialType.findUnique({
      where: { name },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Material name already exists",
      });
    }

    if (power <= 0 || BigInt(cost) <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid power or cost" });
    }

    if (rarity && !Object.values(MaterialRarity).includes(rarity)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid material rarity" });
    }

    const file = (req as any).file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "Missing sword file" });
    }

    const uploaded: any = await uploadToCloudinary(
      file.buffer,
      "sword-game/materials",
    );

    const image = uploaded.secure_url;
    if (!image || image === "") {
      return res
        .status(400)
        .json({ success: false, error: "Image is failed to upload" });
    }

    let created;
    for (let i = 0; i < 5; i++) {
      try {
        created = await prisma.materialType.create({
          data: {
            code: generateSecureCode(12),
            name,
            description: description || null,
            image,
            cost: BigInt(cost),
            power: Number(power),
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
      data: serializeBigInt(created),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Failed to create material",
    });
  }
}

export async function updateMaterial(req: AdminAuthRequest, res: Response) {
  try {
    const { code, name, isImageChanged, description, cost, power, rarity } =
      req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, error: "Material code is required" });
    }

    const existing = await prisma.materialType.findUnique({ where: { code } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Material not found" });
    }

    if (power !== undefined && power <= 0) {
      return res.status(400).json({
        success: false,
        error: "Power must be greater than 0",
      });
    }
    if (cost !== undefined && cost <= 0) {
      return res.status(400).json({
        success: false,
        error: "Cost must be greater than 0",
      });
    }

    if (rarity && !Object.values(MaterialRarity).includes(rarity)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid material rarity" });
    }

    let image = undefined;
    const file = (req as any).file;

    if (isImageChanged === "yes" && file) {
      const uploaded: any = await uploadToCloudinary(
        file.buffer,
        "sword-game/materials",
      );
      image = uploaded.secure_url;
      if (!image || image === "") {
        return res.status(400).json({
          success: false,
          error: "Image is failed to upload",
        });
      }
      if (existing.image) {
        const oldPublicId = getPublicIdFromUrl(existing.image);
        if (oldPublicId) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      }
    }

    const updated = await prisma.materialType.update({
      where: { code },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        image: image ?? existing.image,
        cost: cost !== undefined ? BigInt(cost) : existing.cost,
        power: Number(power) ?? existing.power,
        rarity: rarity ?? existing.rarity,
      },
    });

    return res.json({
      success: true,
      message: "Material updated successfully",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Failed to update material",
    });
  }
}

export async function createShield(req: AdminAuthRequest, res: Response) {
  try {
    const { name, description, cost, power, rarity } = req.body;

    if (!name || cost === undefined || power === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const existing = await prisma.shieldType.findUnique({
      where: { name },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Shield name already exists",
      });
    }

    if (power !== undefined && power <= 0) {
      return res.status(400).json({
        success: false,
        error: "Power must be greater than 0",
      });
    }
    if (cost !== undefined && cost <= 0) {
      return res.status(400).json({
        success: false,
        error: "Cost must be greater than 0",
      });
    }

    const file = (req as any).file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "Missing sword file" });
    }

    const uploaded: any = await uploadToCloudinary(
      file.buffer,
      "sword-game/shields",
    );

    const image = uploaded.secure_url;
    if (!image || image === "") {
      return res
        .status(400)
        .json({ success: false, error: "Image is failed to upload" });
    }

    let created;
    for (let i = 0; i < 5; i++) {
      try {
        created = await prisma.shieldType.create({
          data: {
            code: generateSecureCode(12),
            name,
            description: description || null,
            image,
            cost: BigInt(cost),
            power: Number(power),
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
        error: "Failed to generate unique shield code",
      });
    }

    return res.json({
      success: true,
      message: "Shield created successfully",
      data: serializeBigInt(created),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Failed to create shield",
    });
  }
}

export async function updateShield(req: AdminAuthRequest, res: Response) {
  try {
    const { code, name, isImageChanged, description, cost, power, rarity } =
      req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, error: "Shield code is required" });
    }

    const existing = await prisma.shieldType.findUnique({ where: { code } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Shield not found" });
    }

    if (power !== undefined && power <= 0) {
      return res.status(400).json({
        success: false,
        error: "Power must be greater than 0",
      });
    }
    if (cost !== undefined && cost <= 0) {
      return res.status(400).json({
        success: false,
        error: "Cost must be greater than 0",
      });
    }

    let image = undefined;
    const file = (req as any).file;

    if (isImageChanged === "yes" && file) {
      const uploaded: any = await uploadToCloudinary(
        file.buffer,
        "sword-game/shields",
      );
      image = uploaded.secure_url;
      if (!image || image === "") {
        return res.status(400).json({
          success: false,
          error: "Image is failed to upload",
        });
      }
      if (existing.image) {
        const oldPublicId = getPublicIdFromUrl(existing.image);
        if (oldPublicId) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      }
    }

    const updated = await prisma.shieldType.update({
      where: { code },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        image: image ?? existing.image,
        cost: cost !== undefined ? BigInt(cost) : existing.cost,
        power: Number(power) ?? existing.power,
        rarity: rarity ?? existing.rarity,
      },
    });

    return res.json({
      success: true,
      message: "Shield updated successfully",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Failed to update shield",
    });
  }
}

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
      data: serializeBigInt(gift),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create gift" });
  }
}

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

    const updated = await prisma.userGift.update({
      where: { id: giftId },
      data: { status: "CANCELLED" },
    });

    return res.json({
      success: true,
      message: "Gift cancelled successfully",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to cancel gift" });
  }
}

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
      data: serializeBigInt(item),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create marketplace item" });
  }
}

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

    const updated = await prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { isActive },
    });

    return res.json({
      success: true,
      message: `Marketplace item ${isActive ? "activated" : "deactivated"} successfully`,
      data: serializeBigInt(updated),
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

    const updated = await prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { priceGold: price },
    });

    return res.json({
      success: true,
      message: "Marketplace item price updated",
      data: serializeBigInt(updated),
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

export async function toggleUserBan(req: AdminAuthRequest, res: Response) {
  try {
    const { id, email, ban } = req.body;

    // ---------- Validation ----------
    if (!id && !email) {
      return res.status(400).json({
        success: false,
        error: "Either user id or email is required",
      });
    }

    let whereClause: any = {};

    if (id) {
      try {
        whereClause.id = BigInt(id);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid user id",
        });
      }
    } else if (email) {
      whereClause.email = email;
    }

    // ---------- Fetch User ----------
    const user = await prisma.user.findUnique({
      where: whereClause,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // ---------- Idempotent Check ----------
    if (user.isBanned === ban) {
      return res.json({
        success: true,
        message: ban ? "User already banned" : "User already unbanned",
        data: serializeBigInt(user),
      });
    }

    // ---------- Update ----------
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isBanned: ban },
    });

    return res.json({
      success: true,
      message: ban ? "User banned successfully" : "User unbanned successfully",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error("toggleUserBan error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update user ban status",
    });
  }
}

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
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to reply to support ticket" });
  }
}
