import type { Response } from "express";
import prisma from "../database/client";
import { MaterialRarity, GiftItemType, GiftStatus } from "@prisma/client";
import type { AdminAuthRequest } from "../middleware/adminAuth";
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

    // Helper to validate non-negative integers
    const validateUnsignedInt = (value: any, fieldName: string) => {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Invalid ${fieldName}: must be a non-negative integer`);
      }
    };

    // Helper to validate semantic version string (major.minor.patch)
    const validateVersion = (value: any, fieldName: string) => {
      if (typeof value !== "string") {
        throw new Error(`${fieldName} must be a string`);
      }
      const parts = value.split(".");
      if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) {
        throw new Error(
          `Invalid ${fieldName} format. Expected: major.minor.patch (e.g., "1.2.3")`,
        );
      }
    };

    // ================= Shield Config =================
    if (data.shieldGoldPrice !== undefined) {
      validateUnsignedInt(data.shieldGoldPrice, "shieldGoldPrice");
      updateData.shieldGoldPrice = data.shieldGoldPrice;
    }

    if (data.maxDailyShieldAds !== undefined) {
      validateUnsignedInt(data.maxDailyShieldAds, "maxDailyShieldAds");
      updateData.maxDailyShieldAds = data.maxDailyShieldAds;
    }

    if (data.maxShieldHold !== undefined) {
      validateUnsignedInt(data.maxShieldHold, "maxShieldHold");
      updateData.maxShieldHold = data.maxShieldHold;
    }

    if (data.shieldActiveOnMarketplace !== undefined) {
      updateData.shieldActiveOnMarketplace = Boolean(
        data.shieldActiveOnMarketplace,
      );
    }

    // ================= Sword & Gold Ads =================
    if (data.maxDailySwordAds !== undefined) {
      validateUnsignedInt(data.maxDailySwordAds, "maxDailySwordAds");
      updateData.maxDailySwordAds = data.maxDailySwordAds;
    }

    if (data.swordLevelReward !== undefined) {
      validateUnsignedInt(data.swordLevelReward, "swordLevelReward");
      updateData.swordLevelReward = data.swordLevelReward;
    }

    if (data.maxDailyGoldAds !== undefined) {
      validateUnsignedInt(data.maxDailyGoldAds, "maxDailyGoldAds");
      updateData.maxDailyGoldAds = data.maxDailyGoldAds;
    }

    if (data.goldReward !== undefined) {
      validateUnsignedInt(data.goldReward, "goldReward");
      updateData.goldReward = data.goldReward;
    }

    // ================= Default values for new users =================
    if (data.defaultTrustPoints !== undefined) {
      validateUnsignedInt(data.defaultTrustPoints, "defaultTrustPoints");
      updateData.defaultTrustPoints = data.defaultTrustPoints;
    }

    if (data.defaultGold !== undefined) {
      validateUnsignedInt(data.defaultGold, "defaultGold");
      updateData.defaultGold = data.defaultGold;
    }

    // ================= Voucher settings =================
    if (data.minVoucherGold !== undefined) {
      validateUnsignedInt(data.minVoucherGold, "minVoucherGold");
      updateData.minVoucherGold = data.minVoucherGold;
    }

    if (data.maxVoucherGold !== undefined) {
      validateUnsignedInt(data.maxVoucherGold, "maxVoucherGold");
      updateData.maxVoucherGold = data.maxVoucherGold;
    }

    // Cross-field validation for voucher range
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
      validateUnsignedInt(data.voucherExpiryDays, "voucherExpiryDays");
      updateData.voucherExpiryDays = data.voucherExpiryDays;
    }

    if (data.expiryAllow !== undefined) {
      updateData.expiryAllow = Boolean(data.expiryAllow);
    }

    // ================= Shopping permission =================
    if (data.isShoppingAllowed !== undefined) {
      updateData.isShoppingAllowed = Boolean(data.isShoppingAllowed);
    }
    if (data.isGameStopped !== undefined) {
      updateData.isGameStopped = Boolean(data.isGameStopped);
    }

    // ================= NEW: App Version & Update Control =================
    if (data.minRequiredVersion !== undefined) {
      validateVersion(data.minRequiredVersion, "minRequiredVersion");
      updateData.minRequiredVersion = data.minRequiredVersion.trim();
    }

    if (data.latestVersion !== undefined) {
      validateVersion(data.latestVersion, "latestVersion");
      updateData.latestVersion = data.latestVersion.trim();
    }

    // Cross-check: minRequiredVersion should not be higher than latestVersion
    if (
      updateData.minRequiredVersion &&
      updateData.latestVersion &&
      parseVersion(updateData.minRequiredVersion) >
        parseVersion(updateData.latestVersion)
    ) {
      return res.status(400).json({
        success: false,
        error: "minRequiredVersion cannot be higher than latestVersion",
      });
    }

    if (data.mandatoryUpdateMessage !== undefined) {
      if (
        typeof data.mandatoryUpdateMessage !== "string" ||
        data.mandatoryUpdateMessage.trim().length < 10
      ) {
        return res.status(400).json({
          success: false,
          error:
            "mandatoryUpdateMessage must be a string with at least 10 characters",
        });
      }
      updateData.mandatoryUpdateMessage = data.mandatoryUpdateMessage.trim();
    }

    if (data.notificationUpdateMessage !== undefined) {
      if (
        typeof data.notificationUpdateMessage !== "string" ||
        data.notificationUpdateMessage.trim().length < 5
      ) {
        return res.status(400).json({
          success: false,
          error:
            "notificationUpdateMessage must be a string with at least 5 characters",
        });
      }
      updateData.notificationUpdateMessage =
        data.notificationUpdateMessage.trim();
    }

    if (data.playStoreLink !== undefined) {
      if (
        typeof data.playStoreLink !== "string" ||
        !data.playStoreLink.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "playStoreLink must be a valid URL string",
        });
      }
      updateData.playStoreLink = data.playStoreLink.trim();
    }

    if (data.appStoreLink !== undefined) {
      if (typeof data.appStoreLink !== "string" || !data.appStoreLink.trim()) {
        return res.status(400).json({
          success: false,
          error: "appStoreLink must be a valid URL string",
        });
      }
      updateData.appStoreLink = data.appStoreLink.trim();
    }

    // ================= Protected fields =================
    if (data.adminEmailId !== undefined) {
      return res.status(403).json({
        success: false,
        error: "adminEmailId cannot be updated via this endpoint",
      });
    }

    // ================= Final checks =================
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update",
      });
    }

    const updatedConfig = await prisma.adminConfig.update({
      where: { id: 1n },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Admin configuration updated successfully",
      data: serializeBigInt(updatedConfig),
    });
  } catch (err: any) {
    console.error("updateAdminConfig error:", err);

    const status =
      err.message?.includes("Invalid") || err.message?.includes("cannot")
        ? 400
        : 500;
    const message = err.message || "Internal server error";

    return res.status(status).json({
      success: false,
      error: message,
    });
  }
}

// Helper function used above (you can place it inside the file or in a utils file)
function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error("Invalid version format. Expected: major.minor.patch");
  }
  return [parts[0], parts[1], parts[2]];
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

    if (buyingCost < 0 || sellingCost < 0) {
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
            name,
            description: description ?? null,
            image,
            rarity: rarity ?? "COMMON",
            buyingCost: Number(buyingCost),
            sellingCost: Number(sellingCost),
            isBuyingAllow:
              isBuyingAllow !== undefined ? isBuyingAllow === "true" : true,
            isSellingAllow:
              isSellingAllow !== undefined ? isSellingAllow === "true" : true,
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
    console.error("Error while creating the material", err);
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
      name,
      description,
      buyingCost,
      sellingCost,
      rarity,
      isBuyingAllow,
      isSellingAllow,
      isImageChanged,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Material name is required",
      });
    }

    const existing = await prisma.material.findUnique({
      where: { name },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Material not found",
      });
    }

    // ================= Validation =================
    if (buyingCost !== undefined && buyingCost < 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid buyingCost",
      });
    }

    if (sellingCost !== undefined && sellingCost < 0) {
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
      where: { name },
      data: {
        description: description ?? existing.description,
        image: image ?? existing.image,
        buyingCost:
          buyingCost !== undefined ? Number(buyingCost) : existing.buyingCost,
        sellingCost:
          sellingCost !== undefined
            ? Number(sellingCost)
            : existing.sellingCost,
        rarity: rarity ?? existing.rarity,
        isBuyingAllow:
          isBuyingAllow !== undefined ? isBuyingAllow === "true" : true,
        isSellingAllow:
          isSellingAllow !== undefined ? isSellingAllow === "true" : true,
      },
    });

    return res.json({
      success: true,
      message: "Material updated successfully",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error("Error while updating the material: ", err);
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
      materials: materialsRaw,
    } = req.body;

    // ────────────────────────────────────────────────
    // Parse materials (from FormData → string → array)
    // ────────────────────────────────────────────────
    let materials: Array<{
      materialId: number;
      requiredQuantity: number;
      dropPercentage: number;
      minQuantity: number;
      maxQuantity: number;
    }> = [];

    if (typeof materialsRaw === "string" && materialsRaw.trim() !== "") {
      try {
        materials = JSON.parse(materialsRaw);
      } catch (parseError) {
        console.error("Failed to parse materials JSON:", parseError);
        return res.status(400).json({
          success: false,
          error:
            "Invalid format for materials field – must be valid JSON array",
        });
      }
    } else if (Array.isArray(materialsRaw)) {
      materials = materialsRaw;
    } else {
      return res.status(400).json({
        success: false,
        error: "Materials field is required and must be a JSON array",
      });
    }

    // ────────────────────────────────────────────────
    // Basic array validation
    // ────────────────────────────────────────────────
    if (materials.length < 1 || materials.length > 4) {
      return res.status(400).json({
        success: false,
        error: "Materials must contain 1 to 4 items",
      });
    }

    // ────────────────────────────────────────────────
    // NEW: Drop percentage validations
    // ────────────────────────────────────────────────
    let totalDrop = 0;

    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      const drop = Number(m.dropPercentage);

      if (isNaN(drop)) {
        return res.status(400).json({
          success: false,
          error: `Material #${i + 1}: dropPercentage must be a valid number`,
        });
      }

      if (drop <= 0) {
        return res.status(400).json({
          success: false,
          error: `Material #${i + 1} (ID ${m.materialId}): dropPercentage must be greater than 0`,
        });
      }

      if (drop > 100) {
        return res.status(400).json({
          success: false,
          error: `Material #${i + 1} (ID ${m.materialId}): dropPercentage cannot exceed 100`,
        });
      }

      totalDrop += drop;
    }

    if (totalDrop !== 100) {
      return res.status(400).json({
        success: false,
        error: `Sum of all drop percentages must be exactly 100% (current sum: ${totalDrop}%)`,
      });
    }

    // ────────────────────────────────────────────────
    // Remaining field validations
    // ────────────────────────────────────────────────
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
        error:
          "Name and synthesizeName are required and must be non-empty strings",
      });
    }

    const successNum = Number(successRate);
    if (isNaN(successNum) || successNum < 0 || successNum > 100) {
      return res.status(400).json({
        success: false,
        error: "Success rate must be a number between 0 and 100",
      });
    }

    const buy = Number(buyingCost);
    const sell = Number(sellingCost);
    const upg = Number(upgradeCost);
    const synth = Number(synthesizeCost);

    if (
      isNaN(buy) ||
      buy <= 0 ||
      isNaN(sell) ||
      sell <= 0 ||
      isNaN(upg) ||
      upg <= 0 ||
      isNaN(synth) ||
      synth < 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Buying, selling, and upgrade costs must be positive numbers. Synthesize cost must be ≥ 0.",
      });
    }

    // Material ID uniqueness + basic per-material checks
    const materialIds = materials.map((m) => Number(m.materialId));
    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];

      if (Number(m.materialId) <= 0 || isNaN(Number(m.materialId))) {
        return res.status(400).json({
          success: false,
          error: `Material #${i + 1}: materialId must be a positive integer`,
        });
      }

      if (
        Number(m.requiredQuantity) <= 0 ||
        isNaN(Number(m.requiredQuantity))
      ) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: requiredQuantity must be positive integer`,
        });
      }

      if (isNaN(Number(m.minQuantity)) || Number(m.minQuantity) < 0) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: minQuantity must be positive integer`,
        });
      }

      if (Number(m.maxQuantity) <= 0 || isNaN(Number(m.maxQuantity))) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: maxQuantity must be positive integer`,
        });
      }

      if (Number(m.maxQuantity) <= Number(m.minQuantity)) {
        return res.status(400).json({
          success: false,
          error: `Material ID ${m.materialId}: maxQuantity must be > minQuantity`,
        });
      }
    }

    // Verify materials exist in DB
    const existingMaterials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true },
    });

    const foundIds = new Set(existingMaterials.map((m) => m.id));
    const missing = materialIds.filter((id) => !foundIds.has(BigInt(id)));

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Material ID(s) not found: ${missing.join(", ")}`,
      });
    }

    // Determine next level
    const maxLevel = await prisma.swordLevelDefinition.aggregate({
      _max: { level: true },
    });

    const currentMax = maxLevel._max.level ?? 0;
    const nextLevel = currentMax + 1;

    if (nextLevel > 100) {
      return res.status(400).json({
        success: false,
        error: "Maximum sword level (100) reached",
      });
    }

    // Safety check: ensure no gap (someone deleted a record manually)
    const count = await prisma.swordLevelDefinition.count();
    if (count !== currentMax) {
      return res.status(400).json({
        success: false,
        error: `Level sequence is broken (expected ${currentMax} records, found ${count}). Contact developer.`,
      });
    }

    // Image upload
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: "Sword image is required",
      });
    }

    let imageUrl: string;
    try {
      const uploaded: any = await uploadToCloudinary(
        file.buffer,
        "sword-game/swords",
      );
      imageUrl = uploaded.secure_url;
      if (!imageUrl) throw new Error("No secure_url from Cloudinary");
    } catch (uploadErr) {
      console.error("Cloudinary upload failed:", uploadErr);
      return res.status(500).json({
        success: false,
        error: "Failed to upload sword image",
      });
    }

    // ────────────────────────────────────────────────
    // Transaction: create sword + requirements + drops
    // ────────────────────────────────────────────────
    const sword = await prisma.$transaction(async (tx) => {
      const created = await tx.swordLevelDefinition.create({
        data: {
          id: BigInt(nextLevel),
          level: nextLevel,
          name: name.trim(),
          synthesizeName: synthesizeName.trim(),
          description: description?.trim() || null,
          image: imageUrl,
          buyingCost: buy,
          sellingCost: sell,
          upgradeCost: upg,
          synthesizeCost: synth,
          successRate: successNum,
          isBuyingAllow: isBuyingAllow === "true" || isBuyingAllow === true,
          isSellingAllow: isSellingAllow === "true" || isSellingAllow === true,
          isSynthesizeAllow:
            isSynthesizeAllow === "true" || isSynthesizeAllow === true,
        },
      });

      await tx.swordSynthesisRequirement.createMany({
        data: materials.map((m) => ({
          swordLevelDefinitionId: created.id,
          materialId: Number(m.materialId),
          requiredQuantity: Number(m.requiredQuantity),
        })),
      });

      await tx.swordUpgradeDrop.createMany({
        data: materials.map((m) => ({
          swordLevelDefinitionId: created.id,
          materialId: Number(m.materialId),
          dropPercentage: Number(m.dropPercentage),
          minQuantity: Number(m.minQuantity),
          maxQuantity: Number(m.maxQuantity),
        })),
      });

      return created;
    });

    const fullSword = await prisma.swordLevelDefinition.findUnique({
      where: { id: sword.id },
      include: {
        synthesisRequirements: true,
        upgradeDrops: true,
      },
    });

    return res.json({
      success: true,
      message: `Sword level ${nextLevel} created successfully`,
      data: serializeBigInt(fullSword),
    });
  } catch (err) {
    console.error("Create sword error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while creating sword",
    });
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
      (Number(successRate) < 0 || Number(successRate) > 100)
    ) {
      return res.status(400).json({
        success: false,
        error: "Success rate must be a number between 0 and 100 if provided",
      });
    }

    if (upgradeCost !== undefined && Number(upgradeCost) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Upgrade cost must be a positive number if provided",
      });
    }

    if (sellingCost !== undefined && Number(sellingCost) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Selling cost must be a positive number if provided",
      });
    }

    if (buyingCost !== undefined && Number(buyingCost) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Buying cost must be a positive number if provided",
      });
    }

    if (synthesizeCost !== undefined && Number(synthesizeCost) < 0) {
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
    if (buyingCost !== undefined) updateData.buyingCost = Number(buyingCost);
    if (sellingCost !== undefined) updateData.sellingCost = Number(sellingCost);
    if (upgradeCost !== undefined) updateData.upgradeCost = Number(upgradeCost);
    if (synthesizeCost !== undefined)
      updateData.synthesizeCost = Number(synthesizeCost);
    if (successRate !== undefined) updateData.successRate = Number(successRate);
    if (isBuyingAllow !== undefined)
      updateData.isBuyingAllow = isBuyingAllow === "true" ? true : false;
    if (isSellingAllow !== undefined)
      updateData.isSellingAllow = isSellingAllow === "true" ? true : false;
    if (isSynthesizeAllow !== undefined)
      updateData.isSynthesizeAllow =
        isSynthesizeAllow === "true" ? true : false;

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
// In updateSynthesizeRequirements
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

    // Convert materialId to BigInt
    const materialIds = materials.map((m: any) => BigInt(m.materialId));

    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    // Validate input format
    for (const m of materials) {
      if (BigInt(m.materialId) <= 0n) {
        return res.status(400).json({
          success: false,
          error: `Invalid materialId: ${m.materialId || "missing"}`,
        });
      }
      if (Number(m.requiredQuantity) <= 0) {
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
        currentRequirements.map((r) => r.materialId), // BigInt
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
              materialId: BigInt(m.materialId),
            },
          },
          data: {
            requiredQuantity: Number(m.requiredQuantity),
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

// 9) Similarly for updateUpgradeDrops
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

    // Convert materialId to BigInt
    const materialIds = materials.map((m: any) => BigInt(m.materialId));

    const uniqueIds = new Set(materialIds);

    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    let totalDrop = 0;
    for (const m of materials) {
      if (BigInt(m.materialId) <= 0n) {
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
        m.minQuantity < 0
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
      if (m.maxQuantity <= m.minQuantity) {
        return res.status(400).json({
          success: false,
          error: `maxQuantity > minQuantity required for material ${m.materialId}`,
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

      const currentMaterialIds = new Set(currentDrops.map((d) => d.materialId)); // BigInt

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
              materialId: BigInt(m.materialId),
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

    // ────────────────────────────────────────────────
    // Fix 1: Convert incoming materialId (number) → BigInt
    // This is the #1 cause of "Material ID(s) do not exist"
    // ────────────────────────────────────────────────
    const materialIds: bigint[] = materials.map((m: any) => {
      const idNum = Number(m.materialId);
      if (isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
        throw new Error(`Invalid materialId: ${m.materialId}`);
      }
      return BigInt(idNum);
    });

    const uniqueIds = new Set(materialIds);
    if (uniqueIds.size !== materialIds.length) {
      return res.status(400).json({
        success: false,
        error: "Duplicate material IDs are not allowed",
      });
    }

    let totalDrop = 0;
    for (const m of materials) {
      const mid = Number(m.materialId); // for error messages only

      if (
        typeof m.requiredQuantity !== "number" ||
        !Number.isInteger(m.requiredQuantity) ||
        m.requiredQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `requiredQuantity must be positive integer for material ${mid}`,
        });
      }

      if (
        typeof m.dropPercentage !== "number" ||
        !Number.isInteger(m.dropPercentage) ||
        m.dropPercentage < 0
      ) {
        return res.status(400).json({
          success: false,
          error: `dropPercentage must be non-negative integer for material ${mid}`,
        });
      }

      if (
        typeof m.minQuantity !== "number" ||
        !Number.isInteger(m.minQuantity) ||
        m.minQuantity < 0
      ) {
        return res.status(400).json({
          success: false,
          error: `minQuantity must be positive integer for material ${mid}`,
        });
      }

      if (
        typeof m.maxQuantity !== "number" ||
        !Number.isInteger(m.maxQuantity) ||
        m.maxQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: `maxQuantity must be positive integer for material ${mid}`,
        });
      }

      if (m.maxQuantity <= m.minQuantity) {
        return res.status(400).json({
          success: false,
          error: `maxQuantity > minQuantity required for material ${mid}`,
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

    // ────────────────────────────────────────────────
    // Check existence with BigInt IDs
    // ────────────────────────────────────────────────
    const existingMaterials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true }, // ← added name for better debugging
    });

    const foundIds = new Set(existingMaterials.map((m) => m.id));
    const missingIds = materialIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      // Optional: make error more helpful
      const missingNames = missingIds.map(
        (id) => existingMaterials.find((m) => m.id === id)?.name || `ID ${id}`,
      );
      return res.status(400).json({
        success: false,
        error: `The following materials do not exist: ${missingIds
          .map((id, i) => `${id} (${missingNames[i] || "unknown"})`)
          .join(", ")}`,
      });
    }

    // ────────────────────────────────────────────────
    // Transaction – full replace
    // ────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      const sword = await findSwordByLevel(tx, level);

      // Delete old ones
      await tx.swordSynthesisRequirement.deleteMany({
        where: { swordLevelDefinitionId: sword.id },
      });

      await tx.swordUpgradeDrop.deleteMany({
        where: { swordLevelDefinitionId: sword.id },
      });

      // Create new synthesis requirements
      await tx.swordSynthesisRequirement.createMany({
        data: materials.map((m: any) => ({
          swordLevelDefinitionId: sword.id,
          materialId: BigInt(m.materialId),
          requiredQuantity: m.requiredQuantity,
        })),
      });

      // Create new upgrade drops
      await tx.swordUpgradeDrop.createMany({
        data: materials.map((m: any) => ({
          swordLevelDefinitionId: sword.id,
          materialId: BigInt(m.materialId),
          dropPercentage: m.dropPercentage,
          minQuantity: m.minQuantity,
          maxQuantity: m.maxQuantity,
        })),
      });

      // Touch updatedAt
      await tx.swordLevelDefinition.update({
        where: { id: sword.id },
        data: { successRate: sword.successRate }, // dummy
      });
    });

    const fullSword = await prisma.swordLevelDefinition.findUnique({
      where: { level: Number(level) },
      include: {
        synthesisRequirements: {
          include: { material: true },
        },
        upgradeDrops: {
          include: { material: true },
        },
      },
    });

    return res.json({
      success: true,
      message: "Sword materials fully updated",
      data: serializeBigInt(fullSword),
    });
  } catch (err: any) {
    console.error("updateSwordMaterials error:", err);
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
    const {
      email,
      userId,
      type,
      amount,
      materialId,
      materialQuantity,
      swordLevel,
      swordQuantity,
      note,
    } = req.body;

    // Only one item type per gift (schema constraint: exactly one non-null content field)
    if (!Object.values(GiftItemType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid gift type. Allowed: ${Object.values(GiftItemType).join(", ")}`,
      });
    }

    // ---------- Resolve Receiver ----------
    let receiverId: bigint;
    let receiver;

    if (userId) {
      receiver = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { id: true, isBanned: true },
      });
      if (!receiver) {
        return res
          .status(404)
          .json({ success: false, error: "User not found (by userId)" });
      }
    } else if (email) {
      receiver = await prisma.user.findUnique({
        where: { email: email as string },
        select: { id: true, isBanned: true },
      });
      if (!receiver) {
        return res
          .status(404)
          .json({ success: false, error: "User not found (by email)" });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Provide either userId or email" });
    }

    if (receiver.isBanned) {
      return res
        .status(403)
        .json({ success: false, error: "Cannot send gifts to banned users" });
    }

    receiverId = receiver.id;

    // ---------- Validate Content based on type ----------
    let giftData: any = {
      receiverId,
      status: GiftStatus.PENDING,
      note: note || null,
      type,
    };

    switch (type) {
      case GiftItemType.GOLD:
      case GiftItemType.TRUST_POINTS:
      case GiftItemType.SHIELD:
        if (
          typeof amount !== "number" ||
          amount <= 0 ||
          !Number.isInteger(amount)
        ) {
          return res.status(400).json({
            success: false,
            error: `${type} requires a positive integer amount`,
          });
        }
        giftData.amount = amount;
        break;

      case GiftItemType.MATERIAL:
        if (!materialId || BigInt(materialId) <= 0n) {
          return res.status(400).json({
            success: false,
            error: "Valid materialId (positive bigint) required",
          });
        }
        if (
          !materialQuantity ||
          !Number.isInteger(materialQuantity) ||
          materialQuantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            error: "Positive integer materialQuantity required",
          });
        }

        const material = await prisma.material.findUnique({
          where: { id: BigInt(materialId) },
          select: { id: true },
        });
        if (!material) {
          return res.status(404).json({
            success: false,
            error: `Material not found (id=${materialId})`,
          });
        }

        giftData.materialId = BigInt(materialId);
        giftData.materialQuantity = materialQuantity;
        break;

      case GiftItemType.SWORD:
        if (!swordLevel || !Number.isInteger(swordLevel) || swordLevel <= 0) {
          return res.status(400).json({
            success: false,
            error: "Valid swordLevel (positive integer) required",
          });
        }
        if (
          !swordQuantity ||
          !Number.isInteger(swordQuantity) ||
          swordQuantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            error: "Positive integer swordQuantity required",
          });
        }

        const swordDef = await prisma.swordLevelDefinition.findUnique({
          where: { level: swordLevel },
          select: { id: true },
        });
        if (!swordDef) {
          return res.status(404).json({
            success: false,
            error: `Sword level ${swordLevel} not found`,
          });
        }

        giftData.swordId = swordDef.id; // note: swordId references .level (Int)
        giftData.swordQuantity = swordQuantity;
        break;

      default:
        return res
          .status(400)
          .json({ success: false, error: "Unsupported gift type" });
    }

    // Create the gift
    const createdGift = await prisma.userGift.create({
      data: giftData,
      include: {
        receiver: { select: { id: true, name: true, email: true } },
        material:
          type === GiftItemType.MATERIAL
            ? { select: { id: true, name: true, rarity: true } }
            : undefined,
        swordLevelDefinition:
          type === GiftItemType.SWORD
            ? { select: { level: true, name: true } }
            : undefined,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Gift created successfully",
      data: serializeBigInt(createdGift),
    });
  } catch (err: any) {
    console.error("createGift error:", err);
    if (err.code === "P2003") {
      // foreign key violation
      return res
        .status(400)
        .json({ success: false, error: "Invalid reference (material/sword)" });
    }
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

    await prisma.userGift.update({
      where: { id: BigInt(giftId) },
      data: { status: GiftStatus.CANCELLED, cancelledAt: new Date() },
    });

    return res.json({
      success: true,
      message: "Gift cancelled successfully",
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

// 14) create daily missions
export async function createDailyMission(req: AdminAuthRequest, res: Response) {
  try {
    const { title, description, conditions, targetValue, reward } = req.body;

    if (!title || !conditions || !reward || !targetValue) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    if (!Array.isArray(conditions)) {
      return res.status(400).json({
        success: false,
        error: "conditions must be array",
      });
    }

    if (Number(targetValue) <= 0) {
      return res.status(400).json({
        success: false,
        error: "targetValue must be positive integer",
      });
    }

    const mission = await prisma.dailyMissionDefinition.create({
      data: {
        title,
        description,
        conditions,
        targetValue,
        reward,
      },
    });

    return res.json({
      success: true,
      message: "Daily mission created",
      data: serializeBigInt(mission),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Failed to create daily mission",
    });
  }
}

// 15) Pause / Activate Daily Mission
export async function toggleDailyMission(req: AdminAuthRequest, res: Response) {
  try {
    const { id, isActive } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Mission id is required",
      });
    }

    const missionId = BigInt(id);

    const existing = await prisma.dailyMissionDefinition.findUnique({
      where: { id: missionId },
      select: { id: true, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Daily mission not found",
      });
    }

    if (existing.isActive === Boolean(isActive)) {
      return res.json({
        success: true,
        message: `Mission already ${isActive ? "active" : "paused"}`,
      });
    }

    const updated = await prisma.dailyMissionDefinition.update({
      where: { id: missionId },
      data: { isActive: Boolean(isActive) },
    });

    return res.json({
      success: true,
      message: `Daily mission ${isActive ? "activated" : "paused"} successfully`,
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error("toggleDailyMission error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update daily mission",
    });
  }
}

// 16) Delete Daily Mission
export async function deleteDailyMission(req: AdminAuthRequest, res: Response) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Mission id is required",
      });
    }

    const missionId = BigInt(id);

    const existing = await prisma.dailyMissionDefinition.findUnique({
      where: { id: missionId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Daily mission not found",
      });
    }

    await prisma.dailyMissionDefinition.delete({
      where: { id: missionId },
    });

    return res.json({
      success: true,
      message: "Daily mission deleted successfully",
    });
  } catch (err) {
    console.error("deleteDailyMission error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to delete daily mission",
    });
  }
}

// 17) Create One-Time Mission
export async function createOneTimeMission(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const {
      title,
      description,
      conditions,
      targetValue,
      reward,
      startAt,
      expiresAt,
    } = req.body;

    if (!title || !conditions || !reward || !targetValue) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const startDate = startAt ? new Date(startAt) : new Date(); // default to now
    const expiryDate = expiresAt ? new Date(expiresAt) : null;

    if (expiryDate && expiryDate <= startDate) {
      return res.status(400).json({
        success: false,
        error: "expiresAt must be after startAt",
      });
    }

    const mission = await prisma.oneTimeMissionDefinition.create({
      data: {
        title,
        description,
        conditions,
        targetValue,
        reward,
        startAt: startDate,
        expiresAt: expiryDate,
      },
    });

    return res.json({
      success: true,
      message: "One-time mission created",
      data: serializeBigInt(mission),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Failed to create one-time mission",
    });
  }
}

// 18) Pause / Activate One-Time Mission
export async function toggleOneTimeMission(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const { id, isActive } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Mission id is required",
      });
    }

    const missionId = BigInt(id);

    const result = await prisma.oneTimeMissionDefinition.updateMany({
      where: { id: missionId },
      data: { isActive: Boolean(isActive) },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "One-time mission not found",
      });
    }

    return res.json({
      success: true,
      message: `Mission ${isActive ? "activated" : "paused"} successfully`,
    });
  } catch (err) {
    console.error("toggleOneTimeMissionFast error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update mission",
    });
  }
}

// 19) Delete One-Time Mission
export async function deleteOneTimeMission(
  req: AdminAuthRequest,
  res: Response,
) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Mission id is required",
      });
    }

    const missionId = BigInt(id);

    const existing = await prisma.oneTimeMissionDefinition.findUnique({
      where: { id: missionId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "One-time mission not found",
      });
    }

    await prisma.oneTimeMissionDefinition.delete({
      where: { id: missionId },
    });

    return res.json({
      success: true,
      message: "One-time mission deleted successfully",
    });
  } catch (err) {
    console.error("deleteOneTimeMission error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to delete one-time mission",
    });
  }
}

export const createNotification = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { title, description, webLink } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: "Title and description are required",
      });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        description,
        webLink,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: serializeBigInt(notification),
    });
  } catch (err: any) {
    console.error("createNotification error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const deleteNotification = async (
  req: AdminAuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.body;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: "Valid notification ID is required",
      });
    }

    const notificationId = BigInt(id);

    // Check if notification exists
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (err: any) {
    console.error("deleteNotification error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
