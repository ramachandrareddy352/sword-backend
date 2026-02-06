import type { Response } from "express";
import prisma from "../database/client";
import { MaterialRarity, GiftItemType, GiftStatus } from "@prisma/client";
import type { AdminAuthRequest } from "../middleware/adminAuth";
import { generateSecureCode } from "../services/generateCode";
import { serializeBigInt } from "../services/serializeBigInt";
import { uploadToCloudinary } from "../services/uploadToCloudinary";
import cloudinary from "../config/cloudinary";

// get the image id using teh complete URL
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

async function findSwordByLevel(tx: any, level: number) {
  if (!Number.isInteger(level) || level < 0 || level > 100) {
    throw new Error("Invalid sword level: must be integer 0–100");
  }

  const sword = await tx.swordLevelDefinition.findUnique({
    where: { level },
  });

  if (!sword) {
    throw new Error(`Sword level ${level} not found`);
  }

  return sword;
}

// 1) update the admin config data(except mailID)
export async function updateAdminConfig(req: AdminAuthRequest, res: Response) {
  try {
    const data = req.body;
    const updateData: Record<string, any> = {};

    const validateUnsignedInt = (value: any, field: string) => {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Invalid ${field}`);
      }
    };

    // ================= Shield Config =================
    if (data.shieldGoldPrice !== undefined) {
      validateUnsignedInt(data.shieldGoldPrice, "shield Gold Price");
      updateData.shieldGoldPrice = data.shieldGoldPrice;
    }

    if (data.maxDailyShieldAds !== undefined) {
      validateUnsignedInt(data.maxDailyShieldAds, "maximum daily shield Ads");
      updateData.maxDailyShieldAds = data.maxDailyShieldAds;
    }

    if (data.maxShieldHold !== undefined) {
      if (!Number.isInteger(data.maxShieldHold)) {
        throw new Error("Invalid maximum shiled hold value type");
      }
      updateData.maxShieldHold = data.maxShieldHold;
    }

    if (data.shieldActiveOnMarketplace !== undefined) {
      updateData.shieldActiveOnMarketplace = Boolean(
        data.shieldActiveOnMarketplace,
      );
    }

    // ================= Ads & Missions =================
    if (data.maxDailyAds !== undefined) {
      if (!Number.isInteger(data.maxDailyAds)) {
        throw new Error("Invalid maximum daily Ads value type");
      }
      updateData.maxDailyAds = data.maxDailyAds;
    }

    if (data.maxDailyMissions !== undefined) {
      if (!Number.isInteger(data.maxDailyMissions)) {
        throw new Error("Invalid maximum Missions Ads value type");
      }
      updateData.maxDailyMissions = data.maxDailyMissions;
    }

    // ================= Defaults =================
    if (data.defaultTrustPoints !== undefined) {
      if (!Number.isInteger(data.defaultTrustPoints)) {
        throw new Error("Invalid default trust points  value type");
      }
      updateData.defaultTrustPoints = data.defaultTrustPoints;
    }

    if (data.defaultGold !== undefined) {
      if (!Number.isInteger(data.defaultGold)) {
        throw new Error("Invalid default Gold value type");
      }
      updateData.defaultGold = data.defaultGold;
    }

    // ================= Voucher =================
    if (data.minVoucherGold !== undefined) {
      validateUnsignedInt(data.minVoucherGold, "minimum Voucher Gold");
      updateData.minVoucherGold = data.minVoucherGold;
    }

    if (data.maxVoucherGold !== undefined) {
      validateUnsignedInt(data.maxVoucherGold, "maximum Voucher Gold");
      updateData.maxVoucherGold = data.maxVoucherGold;
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
      if (!Number.isInteger(data.voucherExpiryDays)) {
        throw new Error("Invalid voucher Expiry Days value type");
      }
      updateData.voucherExpiryDays = data.voucherExpiryDays;
    }

    if (data.expiryAllow !== undefined) {
      updateData.expiryAllow = Boolean(data.expiryAllow);
    }

    // ================= Security =================
    if (data.adminEmailId !== undefined) {
      return res.status(403).json({
        success: false,
        error: "Admin EmailId update not allowed through API",
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields to update",
      });
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
  } catch (err: any) {
    console.error(err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
}

// 2) Create material, name should be unique
export async function createMaterial(req: AdminAuthRequest, res: Response) {
  try {
    const {
      name,
      description,
      buyingCost,
      sellingCost,
      rarity,
      isBuyingAllow,
      isSellingAllow,
    } = req.body;

    // ================= Validation =================
    if (!name || buyingCost === undefined || sellingCost === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    if (
      !Number.isInteger(buyingCost) ||
      !Number.isInteger(sellingCost) ||
      buyingCost < 0 ||
      sellingCost < 0
    ) {
      return res.status(400).json({
        success: false,
        error: "buyingCost and sellingCost must be non-negative integers",
      });
    }

    if (rarity && !Object.values(MaterialRarity).includes(rarity)) {
      return res.status(400).json({
        success: false,
        error: "Invalid material rarity type",
      });
    }

    const existing = await prisma.material.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Material name already exists",
      });
    }

    // ================= Image =================
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: "Material image is required",
      });
    }

    const uploaded: any = await uploadToCloudinary(
      file.buffer,
      "sword-game/materials",
    );

    const image = uploaded?.secure_url;
    if (!image) {
      return res.status(400).json({
        success: false,
        error: "Failed to upload image",
      });
    }

    // ================= Create =================
    let created;
    for (let i = 0; i < 5; i++) {
      try {
        created = await prisma.material.create({
          data: {
            code: generateSecureCode(12),
            name,
            description: description ?? null,
            image,
            rarity: rarity ?? "COMMON",
            buyingCost,
            sellingCost,
            isBuyingAllow:
              isBuyingAllow !== undefined ? Boolean(isBuyingAllow) : true,
            isSellingAllow:
              isSellingAllow !== undefined ? Boolean(isSellingAllow) : true,
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

// 3) Update material data using code
export async function updateMaterial(req: AdminAuthRequest, res: Response) {
  try {
    const {
      code,
      name,
      description,
      buyingCost,
      sellingCost,
      rarity,
      isBuyingAllow,
      isSellingAllow,
      isImageChanged,
    } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Material code is required",
      });
    }

    const existing = await prisma.material.findUnique({
      where: { code },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Material not found",
      });
    }

    // ================= Validation =================
    if (
      buyingCost !== undefined &&
      (!Number.isInteger(buyingCost) || buyingCost < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid buyingCost",
      });
    }

    if (
      sellingCost !== undefined &&
      (!Number.isInteger(sellingCost) || sellingCost < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid sellingCost",
      });
    }

    if (rarity && !Object.values(MaterialRarity).includes(rarity)) {
      return res.status(400).json({
        success: false,
        error: "Invalid material rarity",
      });
    }

    // ================= Image =================
    let image: string | undefined;
    const file = (req as any).file;

    if (isImageChanged === "yes" && file) {
      const uploaded: any = await uploadToCloudinary(
        file.buffer,
        "sword-game/materials",
      );

      image = uploaded?.secure_url;
      if (!image) {
        return res.status(400).json({
          success: false,
          error: "Failed to upload image",
        });
      }

      if (existing.image) {
        const oldPublicId = getPublicIdFromUrl(existing.image);
        if (oldPublicId) {
          await cloudinary.uploader.destroy(oldPublicId);
        }
      }
    }

    // ================= Update =================
    const updated = await prisma.material.update({
      where: { code },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        image: image ?? existing.image,
        buyingCost: buyingCost !== undefined ? buyingCost : existing.buyingCost,
        sellingCost:
          sellingCost !== undefined ? sellingCost : existing.sellingCost,
        rarity: rarity ?? existing.rarity,
        isBuyingAllow:
          isBuyingAllow !== undefined
            ? Boolean(isBuyingAllow)
            : existing.isBuyingAllow,
        isSellingAllow:
          isSellingAllow !== undefined
            ? Boolean(isSellingAllow)
            : existing.isSellingAllow,
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

// 4) Ban user from making actions in the game
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

// 5) Reply to customer complaints
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

// 6) Create sword level with synthesize & upgrade rules
/*
Example body:
{
  "name": "Dragon Blade",
  "description": "Level 3 sword",
  "buyingCost": 500,
  "sellingCost": 250,
  "upgradeCost": 300,
  "synthesizeCost": 200,
  "successRate": 45,
  "isBuyingAllow": true,
  "isSellingAllow": true,
  "isSynthesizeAllow": true,
  "materials": [
    {
      "materialId": 1,
      "requiredQuantity": 10,
      "dropPercentage": 40,
      "minQuantity": 1,
      "maxQuantity": 5
    },
    {
      "materialId": 2,
      "requiredQuantity": 50,
      "dropPercentage": 60,
      "minQuantity": 3,
      "maxQuantity": 10
    }
  ]
}
*/
export async function createSwordLevel(req: AdminAuthRequest, res: Response) {
  try {
    const {
      name,
      synthesizeName,
      description,
      buyingCost,
      sellingCost,
      upgradeCost,
      synthesizeCost,
      successRate,
      isBuyingAllow,
      isSellingAllow,
      isSynthesizeAllow,
      materials,
    } = req.body;

    // ---------- VALIDATION - stop at first error ----------
    if (
      !name ||
      typeof name !== "string" ||
      name.trim() === "" ||
      !synthesizeName ||
      typeof synthesizeName !== "string" ||
      synthesizeName.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        error: "Name is required and must be a non-empty string",
      });
    }

    if (
      !Array.isArray(materials) ||
      materials.length < 1 ||
      materials.length > 4
    ) {
      return res.status(400).json({
        success: false,
        error: "Materials must be an array with 1 to 4 items",
      });
    }

    if (
      typeof successRate !== "number" ||
      successRate < 0 ||
      successRate > 100
    ) {
      return res.status(400).json({
        success: false,
        error: "Success rate must be a number between 0 and 100",
      });
    }

    if (
      typeof buyingCost !== "number" ||
      buyingCost <= 0 ||
      typeof sellingCost !== "number" ||
      sellingCost <= 0 ||
      typeof upgradeCost !== "number" ||
      upgradeCost <= 0 ||
      typeof synthesizeCost !== "number" ||
      synthesizeCost < 0
    ) {
      return res.status(400).json({
        success: false,
        error: "All costs (buying, selling, upgrade) must be positive numbers",
      });
    }

    // Material validations
    const materialIds = materials.map((m) => m.materialId);
    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    const totalDrop = materials.reduce(
      (sum, m) => sum + (Number(m.dropPercentage) || 0),
      0,
    );
    if (totalDrop !== 100) {
      return res.status(400).json({
        success: false,
        error: `Drop percentages must sum exactly to 100 (current sum: ${totalDrop})`,
      });
    }

    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];

      if (
        typeof m.materialId !== "number" ||
        !Number.isInteger(m.materialId) ||
        m.materialId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Material at position ${i + 1}: materialId must be a positive integer`,
        });
      }

      if (
        typeof m.requiredQuantity !== "number" ||
        !Number.isInteger(m.requiredQuantity) ||
        m.requiredQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: requiredQuantity must be a positive integer`,
        });
      }

      if (
        typeof m.dropPercentage !== "number" ||
        !Number.isInteger(m.dropPercentage) ||
        m.dropPercentage < 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: dropPercentage must be a non-negative integer`,
        });
      }

      if (
        typeof m.minQuantity !== "number" ||
        !Number.isInteger(m.minQuantity) ||
        m.minQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: minQuantity must be a positive integer`,
        });
      }

      if (
        typeof m.maxQuantity !== "number" ||
        !Number.isInteger(m.maxQuantity) ||
        m.maxQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: maxQuantity must be a positive integer`,
        });
      }

      if (m.maxQuantity < m.minQuantity) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: maxQuantity must be >= minQuantity`,
        });
      }
    }

    // ---------- Verify all material IDs exist ----------
    const existingMaterials = await prisma.material.findMany({
      where: {
        id: { in: materialIds },
      },
      select: { id: true },
    });

    const foundIds = new Set(existingMaterials.map((m) => m.id));
    const missingIds = materialIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `The following material ID(s) do not exist: ${missingIds.join(", ")}`,
      });
    }

    // ---------- LEVEL ----------
    const maxLevel = await prisma.swordLevelDefinition.aggregate({
      _max: { level: true },
    });
    const nextLevel = (maxLevel._max.level ?? -1) + 1;
    if (nextLevel > 100) {
      return res
        .status(400)
        .json({ success: false, error: "Maximum sword level (100) reached" });
    }

    // ---------- IMAGE UPLOAD ----------
    const file = (req as any).file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "Sword image is required" });
    }

    let image: string;
    try {
      const uploaded: any = await uploadToCloudinary(
        file.buffer,
        "sword-game/swords",
      );
      image = uploaded.secure_url;
      if (!image) throw new Error("Upload returned no URL");
    } catch (uploadErr) {
      console.error("Image upload failed:", uploadErr);
      return res
        .status(500)
        .json({ success: false, error: "Failed to upload sword image" });
    }

    // ---------- CREATE IN TRANSACTION ----------
    const sword = await prisma.$transaction(async (tx) => {
      const created = await tx.swordLevelDefinition.create({
        data: {
          level: nextLevel,
          name: name.trim(),
          description: description || null,
          synthesizeName: synthesizeName.trim(),
          image,
          buyingCost,
          sellingCost,
          upgradeCost,
          synthesizeCost,
          successRate,
          isBuyingAllow:
            typeof isBuyingAllow === "boolean" ? isBuyingAllow : true,
          isSellingAllow:
            typeof isSellingAllow === "boolean" ? isSellingAllow : true,
          isSynthesizeAllow:
            typeof isSynthesizeAllow === "boolean" ? isSynthesizeAllow : true,
        },
      });

      // Synthesis requirements
      await tx.swordSynthesisRequirement.createMany({
        data: materials.map((m) => ({
          swordLevelDefinitionId: created.id,
          materialId: m.materialId,
          requiredQuantity: m.requiredQuantity,
        })),
      });

      // Upgrade drops
      await tx.swordUpgradeDrop.createMany({
        data: materials.map((m) => ({
          swordLevelDefinitionId: created.id,
          materialId: m.materialId,
          dropPercentage: m.dropPercentage,
          minQuantity: m.minQuantity,
          maxQuantity: m.maxQuantity,
        })),
      });

      return created;
    });

    // Fetch complete data with relations
    const fullSword = await prisma.swordLevelDefinition.findUnique({
      where: { id: sword.id },
      include: {
        synthesisRequirements: true,
        upgradeDrops: true,
      },
    });

    return res.json({
      success: true,
      message: "Sword created successfully",
      data: serializeBigInt(fullSword),
    });
  } catch (err) {
    console.error("Create sword error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create sword level" });
  }
}

// 7) Update thhe sword definations
export async function updateSwordLevel(req: AdminAuthRequest, res: Response) {
  try {
    const {
      level,
      name,
      synthesizeName,
      isImageChanged, // "yes" or anything else / missing
      description,
      buyingCost,
      sellingCost,
      upgradeCost,
      synthesizeCost,
      successRate,
      isBuyingAllow,
      isSellingAllow,
      isSynthesizeAllow,
    } = req.body;

    // ---------- 1. Validation: need at least level or name to identify sword ----------
    if (level === undefined && !name) {
      return res.status(400).json({
        success: false,
        error: "Either 'level' or 'name' is required to identify the sword",
      });
    }

    // ---------- 2. Find existing sword ----------
    const existing = await prisma.swordLevelDefinition.findFirst({
      where: {
        OR: [
          level !== undefined ? { level: Number(level) } : undefined,
          name ? { name: name.trim() } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        synthesisRequirements: true,
        upgradeDrops: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Sword level not found with the provided level or name",
      });
    }

    // ---------- 3. Field validations ----------
    if (
      !synthesizeName ||
      typeof synthesizeName !== "string" ||
      synthesizeName.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        error: "Name is required and must be a non-empty string",
      });
    }

    if (
      successRate !== undefined &&
      (typeof successRate !== "number" || successRate < 0 || successRate > 100)
    ) {
      return res.status(400).json({
        success: false,
        error: "Success rate must be a number between 0 and 100 if provided",
      });
    }

    if (
      upgradeCost !== undefined &&
      (typeof upgradeCost !== "number" || upgradeCost <= 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Upgrade cost must be a positive number if provided",
      });
    }

    if (
      sellingCost !== undefined &&
      (typeof sellingCost !== "number" || sellingCost <= 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Selling cost must be a positive number if provided",
      });
    }

    if (
      buyingCost !== undefined &&
      (typeof buyingCost !== "number" || buyingCost <= 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Buying cost must be a positive number if provided",
      });
    }

    if (
      synthesizeCost !== undefined &&
      (typeof synthesizeCost !== "number" || synthesizeCost < 0)
    ) {
      return res.status(400).json({
        success: false,
        error: "Synthesize cost must be >= 0 if provided",
      });
    }

    // ---------- 4. Image handling ----------
    let newImageUrl: string | undefined;

    const file = (req as any).file;

    if (isImageChanged === "yes") {
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "Sword image file is required when isImageChanged is 'yes'",
        });
      }

      try {
        const uploaded: any = await uploadToCloudinary(
          file.buffer,
          "sword-game/swords",
        );
        newImageUrl = uploaded.secure_url;

        if (!newImageUrl || newImageUrl === "") {
          throw new Error("Cloudinary returned empty URL");
        }

        // Delete old image if exists
        if (existing.image) {
          const oldPublicId = getPublicIdFromUrl(existing.image);
          if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId);
          }
        }
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        return res.status(500).json({
          success: false,
          error: "Failed to upload new sword image",
        });
      }
    }

    // ---------- 5. Prepare update data ----------
    const updateData: any = {};

    if (newImageUrl) updateData.image = newImageUrl;
    if (synthesizeName !== undefined)
      updateData.synthesizeName = synthesizeName.trim();
    if (description !== undefined) updateData.description = description || null;
    if (buyingCost !== undefined) updateData.buyingCost = buyingCost;
    if (sellingCost !== undefined) updateData.sellingCost = sellingCost;
    if (upgradeCost !== undefined) updateData.upgradeCost = upgradeCost;
    if (synthesizeCost !== undefined)
      updateData.synthesizeCost = synthesizeCost;
    if (successRate !== undefined) updateData.successRate = successRate;
    if (isBuyingAllow !== undefined) updateData.isBuyingAllow = !!isBuyingAllow;
    if (isSellingAllow !== undefined)
      updateData.isSellingAllow = !!isSellingAllow;
    if (isSynthesizeAllow !== undefined)
      updateData.isSynthesizeAllow = !!isSynthesizeAllow;

    // If name is provided and different → update (but check uniqueness if changed)
    if (name !== undefined && name.trim() !== existing.name) {
      const nameExists = await prisma.swordLevelDefinition.findFirst({
        where: { name: name.trim(), id: { not: existing.id } },
      });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          error: "Another sword level already uses this name",
        });
      }
      updateData.name = name.trim();
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return res.json({
        success: true,
        message: "No changes provided - sword remains unchanged",
        data: serializeBigInt(existing),
      });
    }

    // ---------- 6. Update ----------
    const updated = await prisma.swordLevelDefinition.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        synthesisRequirements: true,
        upgradeDrops: true,
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

// 8) Update synthesize requirements only (quantities of EXISTING materials)
// Body example:
// {
//   "level": 5,
//   "materials": [
//     { "materialId": 1, "requiredQuantity": 15 },
//     { "materialId": 2, "requiredQuantity": 60 }
//   ]
// }
// → Only updates quantities for materials already linked to this sword
// → Cannot add new materials or remove existing ones
export async function updateSynthesizeRequirements(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const { level, materials } = req.body;

    if (level === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "level is required in body" });
    }

    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Materials array is required and cannot be empty",
      });
    }

    const materialIds = materials.map((m: any) => m.materialId);
    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    // Validate input format
    for (const m of materials) {
      if (
        typeof m.materialId !== "number" ||
        !Number.isInteger(m.materialId) ||
        m.materialId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Invalid materialId: ${m.materialId || "missing"}`,
        });
      }
      if (
        typeof m.requiredQuantity !== "number" ||
        !Number.isInteger(m.requiredQuantity) ||
        m.requiredQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `requiredQuantity must be positive integer for material ${m.materialId}`,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Find the sword
      const sword = await findSwordByLevel(tx, level);

      // 2. Get currently attached synthesis materials for this sword
      const currentRequirements = await tx.swordSynthesisRequirement.findMany({
        where: { swordLevelDefinitionId: sword.id },
        select: { materialId: true, requiredQuantity: true },
      });

      const currentMaterialIds = new Set(
        currentRequirements.map((r) => r.materialId),
      );

      // 3. Check that ALL provided materialIds are already attached
      const providedNotAttached = materialIds.filter(
        (id) => !currentMaterialIds.has(id),
      );
      if (providedNotAttached.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot add new materials in this endpoint. The following material IDs are not currently attached: ${providedNotAttached.join(", ")}`,
        });
      }

      // 4. Check that no existing materials were omitted (i.e. no removal allowed here)
      const attachedNotProvided = [...currentMaterialIds].filter(
        (id) => !materialIds.includes(id),
      );
      if (attachedNotProvided.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot remove materials in this endpoint. Missing IDs that are currently attached: ${attachedNotProvided.join(", ")}`,
        });
      }

      // 5. All IDs match → safe to update quantities
      for (const m of materials) {
        await tx.swordSynthesisRequirement.update({
          where: {
            swordLevelDefinitionId_materialId: {
              swordLevelDefinitionId: sword.id,
              materialId: m.materialId,
            },
          },
          data: {
            requiredQuantity: m.requiredQuantity,
          },
        });
      }

      // 6. Touch updatedAt on parent
      await tx.swordLevelDefinition.update({
        where: { id: sword.id },
        data: { successRate: sword.successRate }, // dummy update to trigger @updatedAt
      });
    });

    // 7. Return full updated sword with relations
    const fullSword = await prisma.swordLevelDefinition.findUnique({
      where: { level: Number(level) },
      include: {
        synthesisRequirements: true,
        upgradeDrops: true,
      },
    });

    return res.json({
      success: true,
      message: "Sword Synthesize data is updated",
      data: serializeBigInt(fullSword),
    });
  } catch (err: any) {
    console.error("Update synthesize requirements error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to update synthesize requirements",
    });
  }
}

// 9) Update upgrade drops only (percent, min/max quantities of EXISTING materials)
// Body example:
// {
//   "level": 5,
//   "materials": [
//     { "materialId": 1, "dropPercentage": 35, "minQuantity": 2, "maxQuantity": 8 },
//     { "materialId": 3, "dropPercentage": 65, "minQuantity": 1, "maxQuantity": 5 }
//   ]
// }
// → Only updates values for materials already linked to this sword
// → Cannot add new materials or remove existing ones
export async function updateUpgradeDrops(req: AdminAuthRequest, res: Response) {
  try {
    const { level, materials } = req.body;

    if (level === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "level is required in body" });
    }

    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Materials array is required and cannot be empty",
      });
    }

    const materialIds = materials.map((m: any) => m.materialId);
    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    let totalDrop = 0;
    for (const m of materials) {
      if (
        typeof m.materialId !== "number" ||
        !Number.isInteger(m.materialId) ||
        m.materialId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Invalid materialId: ${m.materialId || "missing"}`,
        });
      }
      if (
        typeof m.dropPercentage !== "number" ||
        !Number.isInteger(m.dropPercentage) ||
        m.dropPercentage < 0
      ) {
        return res.status(400).json({
          success: false,
          error: `dropPercentage must be non-negative integer for material ${m.materialId}`,
        });
      }
      if (
        typeof m.minQuantity !== "number" ||
        !Number.isInteger(m.minQuantity) ||
        m.minQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `minQuantity must be positive integer for material ${m.materialId}`,
        });
      }
      if (
        typeof m.maxQuantity !== "number" ||
        !Number.isInteger(m.maxQuantity) ||
        m.maxQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `maxQuantity must be positive integer for material ${m.materialId}`,
        });
      }
      if (m.maxQuantity < m.minQuantity) {
        return res.status(400).json({
          success: false,
          error: `maxQuantity >= minQuantity required for material ${m.materialId}`,
        });
      }
      totalDrop += m.dropPercentage;
    }

    if (totalDrop !== 100) {
      return res.status(400).json({
        success: false,
        error: `Drop percentages must sum exactly to 100 (current: ${totalDrop})`,
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Find the sword
      const sword = await findSwordByLevel(tx, level);

      // 2. Get currently attached upgrade drops for this sword
      const currentDrops = await tx.swordUpgradeDrop.findMany({
        where: { swordLevelDefinitionId: sword.id },
        select: {
          materialId: true,
          dropPercentage: true,
          minQuantity: true,
          maxQuantity: true,
        },
      });

      const currentMaterialIds = new Set(currentDrops.map((d) => d.materialId));

      // 3. Check that ALL provided materialIds are already attached (no new additions)
      const providedNotAttached = materialIds.filter(
        (id) => !currentMaterialIds.has(id),
      );
      if (providedNotAttached.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot add new materials in this endpoint. The following material IDs are not currently attached: ${providedNotAttached.join(", ")}`,
        });
      }

      // 4. Check that no existing drops were omitted (no removal allowed here)
      const attachedNotProvided = [...currentMaterialIds].filter(
        (id) => !materialIds.includes(id),
      );
      if (attachedNotProvided.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot remove materials in this endpoint. Missing IDs that are currently attached: ${attachedNotProvided.join(", ")}`,
        });
      }

      // 5. All IDs match → safe to update existing drops
      for (const m of materials) {
        await tx.swordUpgradeDrop.update({
          where: {
            swordLevelDefinitionId_materialId: {
              swordLevelDefinitionId: sword.id,
              materialId: m.materialId,
            },
          },
          data: {
            dropPercentage: m.dropPercentage,
            minQuantity: m.minQuantity,
            maxQuantity: m.maxQuantity,
          },
        });
      }

      // 6. Touch updatedAt on parent
      await tx.swordLevelDefinition.update({
        where: { id: sword.id },
        data: { successRate: sword.successRate }, // dummy update to trigger @updatedAt
      });
    });

    // 7. Return full updated sword with relations
    const fullSword = await prisma.swordLevelDefinition.findUnique({
      where: { level: Number(level) },
      include: {
        synthesisRequirements: true,
        upgradeDrops: true,
      },
    });

    return res.json({
      success: true,
      data: serializeBigInt(fullSword),
    });
  } catch (err: any) {
    console.error("Update upgrade drops error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to update upgrade drops",
    });
  }
}

// 10) Update both synthesize + upgrade drops at once (FULL REPLACE)
// Body example:
// {
//   "level": 5,
//   "materials": [
//     { "materialId": 1, "requiredQuantity": 15, "dropPercentage": 35, "minQuantity": 2, "maxQuantity": 8 },
//     { "materialId": 5, "requiredQuantity": 20, "dropPercentage": 25, "minQuantity": 1, "maxQuantity": 5 },
//     { "materialId": 6, "requiredQuantity": 10, "dropPercentage": 20, "minQuantity": 3, "maxQuantity": 10 },
//     { "materialId": 2, "requiredQuantity": 8,  "dropPercentage": 20, "minQuantity": 1, "maxQuantity": 4 }
//   ]
// }
// → Completely replaces old list with new one
// → Can add new materials, remove old ones, change quantities/percentages
// → No duplicates allowed
export async function updateSwordMaterials(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const { level, materials } = req.body;

    if (level === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "level is required in body" });
    }

    if (
      !Array.isArray(materials) ||
      materials.length < 1 ||
      materials.length > 4
    ) {
      return res.status(400).json({
        success: false,
        error: "Materials must be an array with 1 to 4 items",
      });
    }

    const materialIds = materials.map((m: any) => m.materialId);
    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    let totalDrop = 0;
    for (const m of materials) {
      // Validate materialId
      if (
        typeof m.materialId !== "number" ||
        !Number.isInteger(m.materialId) ||
        m.materialId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `Invalid materialId: ${m.materialId || "missing"}`,
        });
      }

      // Validate requiredQuantity
      if (
        typeof m.requiredQuantity !== "number" ||
        !Number.isInteger(m.requiredQuantity) ||
        m.requiredQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `requiredQuantity must be positive integer for material ${m.materialId}`,
        });
      }

      // Validate dropPercentage
      if (
        typeof m.dropPercentage !== "number" ||
        !Number.isInteger(m.dropPercentage) ||
        m.dropPercentage < 0
      ) {
        return res.status(400).json({
          success: false,
          error: `dropPercentage must be non-negative integer for material ${m.materialId}`,
        });
      }

      // Validate minQuantity & maxQuantity
      if (
        typeof m.minQuantity !== "number" ||
        !Number.isInteger(m.minQuantity) ||
        m.minQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `minQuantity must be positive integer for material ${m.materialId}`,
        });
      }

      if (
        typeof m.maxQuantity !== "number" ||
        !Number.isInteger(m.maxQuantity) ||
        m.maxQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `maxQuantity must be positive integer for material ${m.materialId}`,
        });
      }

      if (m.maxQuantity < m.minQuantity) {
        return res.status(400).json({
          success: false,
          error: `maxQuantity >= minQuantity required for material ${m.materialId}`,
        });
      }

      totalDrop += m.dropPercentage;
    }

    if (totalDrop !== 100) {
      return res.status(400).json({
        success: false,
        error: `Drop percentages must sum exactly to 100 (current: ${totalDrop})`,
      });
    }

    // Check all material IDs exist in Material table
    const existingMaterials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true },
    });
    const foundIds = new Set(existingMaterials.map((m) => m.id));
    const missingIds = materialIds.filter((id: bigint) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Material ID(s) do not exist: ${missingIds.join(", ")}`,
      });
    }

    // Perform the full replace in transaction
    await prisma.$transaction(async (tx) => {
      const sword = await findSwordByLevel(tx, level);

      // Delete all existing synthesize requirements
      await tx.swordSynthesisRequirement.deleteMany({
        where: { swordLevelDefinitionId: sword.id },
      });

      // Delete all existing upgrade drops
      await tx.swordUpgradeDrop.deleteMany({
        where: { swordLevelDefinitionId: sword.id },
      });

      // Create new synthesize requirements
      await tx.swordSynthesisRequirement.createMany({
        data: materials.map((m: any) => ({
          swordLevelDefinitionId: sword.id,
          materialId: m.materialId,
          requiredQuantity: m.requiredQuantity,
        })),
      });

      // Create new upgrade drops
      await tx.swordUpgradeDrop.createMany({
        data: materials.map((m: any) => ({
          swordLevelDefinitionId: sword.id,
          materialId: m.materialId,
          dropPercentage: m.dropPercentage,
          minQuantity: m.minQuantity,
          maxQuantity: m.maxQuantity,
        })),
      });

      // Trigger updatedAt on parent
      await tx.swordLevelDefinition.update({
        where: { id: sword.id },
        data: { successRate: sword.successRate }, // dummy update
      });
    });

    // Fetch and return full updated sword
    const fullSword = await prisma.swordLevelDefinition.findUnique({
      where: { level: Number(level) },
      include: {
        synthesisRequirements: true,
        upgradeDrops: true,
      },
    });

    return res.json({
      success: true,
      data: serializeBigInt(fullSword),
    });
  } catch (err: any) {
    console.error("Update sword materials error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to update sword materials",
    });
  }
}

// 11) Create Gift (Admin)
// Body example:
// {
//   "email": "user@example.com",           // or "userId": "123"
//   "note": "Happy birthday!",
//   "items": [
//     { "type": "GOLD", "amount": 5000 },
//     { "type": "TRUST_POINTS", "amount": 200 },
//     { "type": "MATERIAL", "materialId": 17, "materialQuantity": 50 },
//     { "type": "SWORD", "swordLevel": 5 },
//     { "type": "SHIELD", "amount": 10 }
//   ]
// }
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

    // ---------- Validate & Verify Each Item ----------
    for (const item of items) {
      if (!Object.values(GiftItemType).includes(item.type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid gift item type: ${item.type}`,
        });
      }

      // GOLD, TRUST_POINTS, SHIELD → require amount > 0
      if (
        ["GOLD", "TRUST_POINTS", "SHIELD"].includes(item.type) &&
        (!item.amount || typeof item.amount !== "number" || item.amount <= 0)
      ) {
        return res.status(400).json({
          success: false,
          error: `${item.type} requires a positive amount`,
        });
      }

      // MATERIAL → require materialId & materialQuantity > 0
      if (item.type === GiftItemType.MATERIAL) {
        if (
          !item.materialId ||
          typeof item.materialId !== "number" ||
          !Number.isInteger(item.materialId)
        ) {
          return res.status(400).json({
            success: false,
            error: "Material gift requires valid materialId (integer)",
          });
        }
        if (
          !item.materialQuantity ||
          typeof item.materialQuantity !== "number" ||
          !Number.isInteger(item.materialQuantity) ||
          item.materialQuantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            error: "Material gift requires positive materialQuantity",
          });
        }

        const materialExists = await prisma.material.findUnique({
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

      // SWORD → require swordLevel (integer)
      if (item.type === GiftItemType.SWORD) {
        if (
          item.swordLevel === undefined ||
          typeof item.swordLevel !== "number" ||
          !Number.isInteger(item.swordLevel) ||
          item.swordLevel < 0
        ) {
          return res.status(400).json({
            success: false,
            error:
              "Sword gift requires valid swordLevel (non-negative integer)",
          });
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
    }

    // ---------- Create Gift ----------
    const gift = await prisma.userGift.create({
      data: {
        receiverId,
        note: note || null,
        items: {
          create: items.map((item: any) => ({
            type: item.type,
            amount: item.amount ? item.amount : null, // GOLD, TRUST_POINTS, SHIELD
            materialId: item.materialId ? BigInt(item.materialId) : null,
            materialQuantity: item.materialQuantity
              ? item.materialQuantity
              : null,
            swordLevel: item.swordLevel ?? null,
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
    console.error("createGift error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create gift" });
  }
}

// 12) Cancel Gift (only if PENDING)
export async function cancelGift(req: AdminAuthRequest, res: Response) {
  try {
    const { giftId } = req.body;

    if (!giftId || isNaN(Number(giftId))) {
      return res
        .status(400)
        .json({ success: false, error: "Valid giftId is required" });
    }

    const gift = await prisma.userGift.findUnique({
      where: { id: BigInt(giftId) },
      select: { status: true },
    });

    if (!gift) {
      return res.status(404).json({ success: false, error: "Gift not found" });
    }

    if (gift.status !== GiftStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "Only pending gifts can be cancelled",
      });
    }

    const updated = await prisma.userGift.update({
      where: { id: BigInt(giftId) },
      data: { status: GiftStatus.CANCELLED },
    });

    return res.json({
      success: true,
      message: "Gift cancelled successfully",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error("cancelGift error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to cancel gift" });
  }
}

// 13) Delete Gift (only if PENDING)
export async function deleteGift(req: AdminAuthRequest, res: Response) {
  try {
    const { giftId } = req.body;

    if (!giftId || isNaN(Number(giftId))) {
      return res
        .status(400)
        .json({ success: false, error: "Valid giftId is required" });
    }

    const gift = await prisma.userGift.findUnique({
      where: { id: BigInt(giftId) },
      select: { status: true },
    });

    if (!gift) {
      return res.status(404).json({ success: false, error: "Gift not found" });
    }

    if (gift.status !== GiftStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "Only pending gifts can be deleted",
      });
    }

    await prisma.$transaction([
      prisma.userGiftItem.deleteMany({ where: { giftId: BigInt(giftId) } }),
      prisma.userGift.delete({ where: { id: BigInt(giftId) } }),
    ]);

    return res.json({ success: true, message: "Gift deleted successfully" });
  } catch (err) {
    console.error("deleteGift error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete gift" });
  }
}
