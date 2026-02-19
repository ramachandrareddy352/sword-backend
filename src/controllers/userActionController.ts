import type { Response } from "express";
import crypto from "crypto";
import prisma from "../database/client";
import { generateSecureCode } from "../services/generateCode";
import { userGuard } from "../services/queryHelpers";
import type { UserAuthRequest } from "../middleware/userAuth";
import {
  VoucherStatus,
  SupportCategory,
  SupportPriority,
  AdRewardType,
} from "@prisma/client";
import { serializeBigInt } from "../services/serializeBigInt";

// 1) Toggle Sound On/Off
export const toggleSound = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const user = await userGuard(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { soundOn: !user.soundOn },
      select: { soundOn: true },
    });

    return res.json({
      success: true,
      message: `Sound turned ${updated.soundOn ? "ON" : "OFF"}`,
      soundOn: updated.soundOn,
    });
  } catch (err: any) {
    console.error("Toggle sound error: ", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 2) Create Voucher (User creates a voucher by locking gold)
export const createVoucher = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { goldAmount } = req.body;

    if (!goldAmount || typeof goldAmount !== "number" || goldAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "goldAmount must be a positive number",
      });
    }

    const amount = Math.floor(goldAmount);

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
      select: { minVoucherGold: true, maxVoucherGold: true },
    });

    if (!config) {
      return res.status(500).json({
        success: false,
        error: "Admin configuration not found",
      });
    }

    if (amount < config.minVoucherGold || amount > config.maxVoucherGold) {
      return res.status(400).json({
        success: false,
        error: `Voucher amount must be between ${config.minVoucherGold} and ${config.maxVoucherGold}`,
      });
    }

    let voucher;

    // Retry loop for unique code
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateSecureCode(16); // increase entropy

      try {
        voucher = await prisma.$transaction(async (tx) => {
          //  Always check balance inside transaction (race-safe)
          const user = await userGuard(userId);

          if (!user || user.gold < amount) {
            throw new Error("Insufficient gold balance");
          }

          // Deduct gold
          await tx.user.update({
            where: { id: userId },
            data: {
              gold: { decrement: amount },
            },
          });

          // Create voucher
          return tx.userVoucher.create({
            data: {
              code,
              createdById: userId,
              allowedUserId: null, // initially null
              goldAmount: amount,
              status: VoucherStatus.PENDING,
            },
          });
        });

        break; // success
      } catch (err: any) {
        if (err.code === "P2002") {
          // Code collision → retry
          continue;
        }
        throw err;
      }
    }

    if (!voucher) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate unique voucher code after retries",
      });
    }

    return res.json({
      success: true,
      message: "Voucher created successfully.",
      data: serializeBigInt(voucher),
    });
  } catch (err: any) {
    console.error("Creating voucher error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

export const assignAllowedUserToVoucher = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const creatorId = BigInt(req.user.userId);
    const { voucherId, allowedEmail } = req.body;

    if (!voucherId || isNaN(Number(voucherId))) {
      return res.status(400).json({
        success: false,
        error: "Valid voucher ID required",
      });
    }

    if (!allowedEmail) {
      return res.status(400).json({
        success: false,
        error: "Valid allowedEmail required",
      });
    }

    const normalizedEmail = allowedEmail.trim().toLowerCase();

    // 🔥 Validate creator
    await userGuard(creatorId);

    // 🔥 Find voucher
    const voucher = await prisma.userVoucher.findUnique({
      where: { id: BigInt(voucherId) },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: "Voucher not found",
      });
    }

    // 🔥 Ownership check
    if (voucher.createdById !== creatorId) {
      return res.status(403).json({
        success: false,
        error: "You can only assign your own vouchers",
      });
    }

    // 🔥 Must be pending
    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "Only pending vouchers can be assigned",
      });
    }

    // 🔥 Expiry check (if enabled)
    // if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: "Voucher has expired",
    //   });
    // }

    // 🔥 Find allowed user by email
    const allowedUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!allowedUser) {
      return res.status(404).json({
        success: false,
        error: "Allowed user not found",
      });
    }

    // 🔥 Check allowed user banned
    if (allowedUser.isBanned) {
      return res.status(400).json({
        success: false,
        error: "Allowed user is banned",
      });
    }

    // 🔥 Prevent self-assign
    if (allowedUser.id === creatorId) {
      return res.status(400).json({
        success: false,
        error: "You cannot assign voucher to yourself",
      });
    }

    // 🔥 Atomic update
    await prisma.userVoucher.update({
      where: {
        id: BigInt(voucherId),
        status: VoucherStatus.PENDING, // prevents race condition
      },
      data: {
        allowedUserId: allowedUser.id,
      },
    });

    return res.json({
      success: true,
      message: "Voucher successfully assigned to user",
    });
  } catch (err: any) {
    console.error("Assign voucher error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 3) Cancel Voucher (refund gold if pending)
export const cancelVoucher = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    await userGuard(userId);
    const { voucherId } = req.body;

    if (!voucherId || isNaN(Number(voucherId))) {
      return res.status(400).json({
        success: false,
        error: "Valid voucher ID required",
      });
    }

    const voucher = await prisma.userVoucher.findUnique({
      where: { id: BigInt(voucherId) },
      select: {
        createdById: true,
        goldAmount: true,
        status: true,
      },
    });

    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, error: "Voucher not found" });
    }

    if (voucher.createdById !== userId) {
      return res.status(403).json({
        success: false,
        error: "You can only cancel your own vouchers",
      });
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "Only pending vouchers can be cancelled",
      });
    }

    await prisma.$transaction(async (tx) => {
      // Refund gold
      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: voucher.goldAmount } },
      });

      // Cancel voucher
      await tx.userVoucher.update({
        where: { id: BigInt(voucherId) },
        data: {
          status: VoucherStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: "Voucher cancelled successfully. Gold refunded.",
    });
  } catch (err: any) {
    console.error("Cancelling voucher error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 4) Create Customer Support Complaint(no check for the user ban here)
export const createComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const {
      title,
      content,
      message,
      category = SupportCategory.OTHER,
      priority = SupportPriority.NORMAL,
    } = req.body;

    // Basic validation
    if (!title || typeof title !== "string" || title.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Title must be at least 5 characters",
      });
    }

    if (!content || typeof content !== "string" || content.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "Content must be at least 5 characters",
      });
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "Message must be at least 10 characters",
      });
    }

    // Validate category & priority enums
    if (!Object.values(SupportCategory).includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Allowed: ${Object.values(SupportCategory).join(", ")}`,
      });
    }

    if (!Object.values(SupportPriority).includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Allowed: ${Object.values(SupportPriority).join(", ")}`,
      });
    }

    const complaint = await prisma.customerSupport.create({
      data: {
        userId,
        title: title.trim(),
        content: content.trim(),
        message: message.trim(),
        category,
        priority,
      },
    });

    return res.json({
      success: true,
      message: "Complaint submitted successfully. We'll review it soon.",
      data: serializeBigInt(complaint),
    });
  } catch (err: any) {
    console.error("Create Complaint error:", err);
    return res
      .status(400)
      .json({ success: false, error: err.message || "Internal server error" });
  }
};

// 5) Update Complaint (only if not reviewed)
export const updateComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { complaintId, title, content, message } = req.body;

    if (!complaintId || isNaN(Number(complaintId))) {
      return res.status(400).json({
        success: false,
        error: "Valid complaint ID required",
      });
    }

    if (!title && !content && !message) {
      return res.status(400).json({
        success: false,
        error:
          "Provide at least one field to update (title, content, or message)",
      });
    }

    // Validate lengths if provided
    if (title && (typeof title !== "string" || title.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        error: "Title must be at least 5 characters if provided",
      });
    }

    if (content && (typeof content !== "string" || content.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        error: "Content must be at least 5 characters if provided",
      });
    }

    if (
      message &&
      (typeof message !== "string" || message.trim().length < 10)
    ) {
      return res.status(400).json({
        success: false,
        error: "Message must be at least 10 characters if provided",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const complaint = await tx.customerSupport.findUnique({
        where: { id: BigInt(complaintId) },
      });

      if (!complaint) {
        throw new Error("Complaint not found");
      }

      if (complaint.userId !== userId) {
        throw new Error("Not your complaint");
      }

      if (complaint.isReviewed) {
        throw new Error("Complaint is already reviewed");
      }

      return tx.customerSupport.update({
        where: { id: BigInt(complaintId) },
        data: {
          title: title ? title.trim() : complaint.title,
          content: content ? content.trim() : complaint.content,
          message: message ? message.trim() : complaint.message,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          content: true,
          message: true,
          updatedAt: true,
          isReviewed: true,
        },
      });
    });

    return res.json({
      success: true,
      message: "Complaint updated successfully",
      data: serializeBigInt(updated),
    });
  } catch (err: any) {
    console.error("Update Complaint error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 6) Delete Complaint (only if not reviewed)
export const deleteComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { complaintId } = req.body;

    if (!complaintId || isNaN(Number(complaintId))) {
      return res.status(400).json({
        success: false,
        error: "Valid complaint ID required",
      });
    }

    await prisma.$transaction(async (tx) => {
      const complaint = await tx.customerSupport.findUnique({
        where: { id: BigInt(complaintId) },
        select: {
          userId: true,
          isReviewed: true,
        },
      });

      if (!complaint) {
        throw new Error("Complaint not found");
      }

      if (complaint.userId !== userId) {
        throw new Error("Not your complaint");
      }

      if (complaint.isReviewed) {
        throw new Error("Complaint is already reviewed");
      }

      await tx.customerSupport.delete({
        where: { id: BigInt(complaintId) },
      });
    });

    return res.json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (err: any) {
    console.error("Delete Complaint error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 7) Buy Sword from Marketplace (single sword at a time)
export async function buySword(req: UserAuthRequest, res: Response) {
  try {
    const userId = BigInt(req.user.userId);
    const { swordLevelDefinitionId } = req.body;

    if (!swordLevelDefinitionId) {
      return res.status(400).json({
        success: false,
        error: "swordLevelDefinitionId is required",
      });
    }

    const swordDefId = BigInt(swordLevelDefinitionId);

    // User guard (not banned, exists)
    const user = await userGuard(userId);

    // Fetch sword definition
    const swordDefinition = await prisma.swordLevelDefinition.findUnique({
      where: { id: swordDefId },
      select: {
        id: true,
        level: true,
        buyingCost: true,
        isBuyingAllow: true,
      },
    });

    if (!swordDefinition) {
      return res.status(404).json({
        success: false,
        error: "Sword not found",
      });
    }

    // Check if buying is allowed
    if (!swordDefinition.isBuyingAllow) {
      return res.status(400).json({
        success: false,
        error: "This sword is not available for purchase now",
      });
    }

    const price = swordDefinition.buyingCost;

    // Check sufficient gold
    if (user.gold < price) {
      return res.status(400).json({
        success: false,
        error: "Insufficient gold to buy this sword",
      });
    }

    let createdSword;
    let purchaseRecord;

    await prisma.$transaction(async (tx) => {
      // Deduct gold
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: price } },
      });

      // Generate unique sword code
      const swordCode = generateSecureCode(12); // assume this function exists

      // Create UserSword
      createdSword = await tx.userSword.create({
        data: {
          code: swordCode,
          userId,
          level: swordDefinition.level,
          isOnAnvil: false,
          swordLevelDefinitionId: swordDefId,
          isSolded: false,
          isBroken: false,
        },
      });

      // Create purchase record
      purchaseRecord = await tx.swordMarketplacePurchase.create({
        data: {
          userId,
          swordId: createdSword.id,
          swordLevelDefinitionId: swordDefId,
          priceGold: price,
        },
      });
    });

    return res.json({
      success: true,
      message: "Sword purchased successfully",
      data: {
        sword: serializeBigInt(createdSword),
        purchase: serializeBigInt(purchaseRecord),
      },
    });
  } catch (err: any) {
    console.error("buySword error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
}

// 8) Buy Material from Marketplace (with quantity)
export async function buyMaterial(req: UserAuthRequest, res: Response) {
  try {
    const userId = BigInt(req.user.userId);
    const { materialId, quantity } = req.body;

    if (!materialId || !quantity) {
      return res.status(400).json({
        success: false,
        error: "materialId and quantity are required",
      });
    }

    const matId = BigInt(materialId);
    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be a positive integer",
      });
    }

    // User guard
    const user = await userGuard(userId);

    // Fetch material
    const material = await prisma.material.findUnique({
      where: { id: matId },
      select: {
        id: true,
        buyingCost: true,
        isBuyingAllow: true,
      },
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        error: "Material not found",
      });
    }

    // Check if buying is allowed
    if (!material.isBuyingAllow) {
      return res.status(400).json({
        success: false,
        error: "This material is not available for purchase",
      });
    }

    const pricePerUnit = material.buyingCost;
    const totalPrice = pricePerUnit * qty;

    // Check sufficient gold
    if (user.gold < totalPrice) {
      return res.status(400).json({
        success: false,
        error: "Insufficient gold to buy this quantity",
      });
    }

    let purchaseRecord;

    await prisma.$transaction(async (tx) => {
      // Deduct gold
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: totalPrice } },
      });

      // Upsert UserMaterial (add to unsoldQuantity)
      await tx.userMaterial.upsert({
        where: {
          userId_materialId: { userId, materialId: matId },
        },
        update: { unsoldQuantity: { increment: qty } },
        create: {
          userId,
          materialId: matId,
          unsoldQuantity: qty,
          soldedQuantity: 0,
        },
      });

      // Create purchase record
      purchaseRecord = await tx.materialMarketplacePurchase.create({
        data: {
          userId,
          materialId: matId,
          quantity: qty,
          priceGold: totalPrice,
        },
      });
    });

    return res.json({
      success: true,
      message: "Material purchased successfully",
      data: serializeBigInt(purchaseRecord),
    });
  } catch (err: any) {
    console.error("buyMaterial error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
}

// 9) Buy Shields from Marketplace (with quantity)
export async function buyShields(req: UserAuthRequest, res: Response) {
  try {
    const userId = BigInt(req.user.userId);
    const { quantity } = req.body;

    if (!quantity) {
      return res.status(400).json({
        success: false,
        error: "quantity is required",
      });
    }

    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be a positive integer",
      });
    }

    // User guard
    const user = await userGuard(userId);

    // Fetch admin config for shields
    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
      select: {
        shieldGoldPrice: true,
        maxShieldHold: true,
        shieldActiveOnMarketplace: true,
      },
    });

    if (!config) {
      return res.status(500).json({
        success: false,
        error: "Admin configuration not found",
      });
    }

    // Check if shields are active for purchase
    if (!config.shieldActiveOnMarketplace) {
      return res.status(400).json({
        success: false,
        error: "Shields are not available for purchase at this time",
      });
    }

    const pricePerShield = config.shieldGoldPrice;
    const totalPrice = pricePerShield * qty;

    // Check sufficient gold
    if (user.gold < totalPrice) {
      return res.status(400).json({
        success: false,
        error: "Insufficient gold to buy this quantity",
      });
    }

    // Check max hold limit (if maxShieldHold > 0)
    if (
      config.maxShieldHold > 0 &&
      user.totalShields + qty > config.maxShieldHold
    ) {
      return res.status(400).json({
        success: false,
        error: `Cannot exceed maximum shield hold limit of ${config.maxShieldHold}`,
      });
    }

    let purchaseRecord;

    await prisma.$transaction(async (tx) => {
      // Deduct gold
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: totalPrice } },
      });

      // Increment totalShields
      await tx.user.update({
        where: { id: userId },
        data: { totalShields: { increment: qty } },
      });

      // Create purchase record
      purchaseRecord = await tx.shieldMarketplacePurchase.create({
        data: {
          userId,
          quantity: qty,
          priceGold: totalPrice,
        },
      });
    });

    return res.json({
      success: true,
      message: "Shields purchased successfully",
      data: serializeBigInt(purchaseRecord),
    });
  } catch (err: any) {
    console.error("buy Shields error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
}

// 10) Sell Sword (single sword)
export const sellSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body;

    if (!swordId || isNaN(Number(swordId))) {
      return res.status(400).json({
        success: false,
        error: "Valid sword ID required",
      });
    }

    // User guard: checks user exists and not banned
    await userGuard(userId);

    // Fetch sword with level definition
    const sword = await prisma.userSword.findUnique({
      where: { id: BigInt(swordId) },
      include: {
        swordLevelDefinition: {
          select: {
            sellingCost: true,
            isSellingAllow: true,
          },
        },
      },
    });

    if (!sword || sword.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Sword not found or does not belong to you",
      });
    }

    // Check if selling is allowed for this sword level
    if (!sword.swordLevelDefinition.isSellingAllow) {
      return res.status(400).json({
        success: false,
        error: "Selling is not allowed for this sword level",
      });
    }

    // Check if already sold
    if (sword.isSolded) {
      return res.status(400).json({
        success: false,
        error: "This sword has already been sold",
      });
    }

    const goldToAdd = sword.swordLevelDefinition.sellingCost;

    await prisma.$transaction(async (tx) => {
      // If sword was on anvil, clear anvilSwordId
      if (sword.isOnAnvil) {
        await tx.user.update({
          where: { id: userId },
          data: { anvilSwordId: null },
        });
      }

      // Mark sword as sold and remove from anvil
      await tx.userSword.update({
        where: { id: BigInt(swordId) },
        data: {
          isSolded: true,
          isOnAnvil: false,
        },
      });

      // Add gold to user
      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldToAdd } },
      });
    });

    return res.json({
      success: true,
      message: "Sword sold successfully",
      goldAdded: goldToAdd,
    });
  } catch (err: any) {
    console.error("sell sword error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 11) Sell Material (with quantity)
export const sellMaterial = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { materialId, quantity } = req.body;

    if (!materialId || !quantity) {
      return res.status(400).json({
        success: false,
        error: "materialId and quantity are required",
      });
    }

    const matId = BigInt(materialId);
    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be a positive integer",
      });
    }

    // User guard: checks user exists and not banned
    await userGuard(userId);

    // Fetch user material with material definition
    const userMaterial = await prisma.userMaterial.findUnique({
      where: {
        userId_materialId: { userId, materialId: matId },
      },
      include: {
        material: {
          select: {
            sellingCost: true,
            isSellingAllow: true,
          },
        },
      },
    });

    if (!userMaterial) {
      return res.status(404).json({
        success: false,
        error: "You do not have this material",
      });
    }

    // Check if selling is allowed for this material
    if (!userMaterial.material.isSellingAllow) {
      return res.status(400).json({
        success: false,
        error: "Selling is not allowed for this material",
      });
    }

    // Check sufficient unsold quantity
    if (userMaterial.unsoldQuantity < qty) {
      return res.status(400).json({
        success: false,
        error: `Insufficient unsold quantity (you have ${userMaterial.unsoldQuantity})`,
      });
    }

    const pricePerUnit = userMaterial.material.sellingCost;
    const goldToAdd = pricePerUnit * qty;

    await prisma.$transaction(async (tx) => {
      // Update UserMaterial: reduce unsold, increase sold
      await tx.userMaterial.update({
        where: {
          userId_materialId: { userId, materialId: matId },
        },
        data: {
          unsoldQuantity: { decrement: qty },
          soldedQuantity: { increment: qty },
        },
      });

      // Add gold to user
      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldToAdd } },
      });
    });

    return res.json({
      success: true,
      message: "Material sold successfully",
      goldAdded: goldToAdd,
      quantitySold: qty,
    });
  } catch (err: any) {
    console.error("sell material error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 12) Set Sword on Anvil (only if not already on anvil, not broken, not sold, user not banned)
export const setSwordOnAnvil = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body;

    if (!swordId || isNaN(Number(swordId))) {
      return res.status(400).json({
        success: false,
        error: "Valid sword ID required",
      });
    }

    // User guard: checks user exists and not banned
    const user = await userGuard(userId);

    // Fetch sword with owner check
    const sword = await prisma.userSword.findUnique({
      where: { id: BigInt(swordId) },
      select: {
        id: true,
        userId: true,
        isOnAnvil: true,
        isSolded: true,
        isBroken: true,
      },
    });

    if (!sword || sword.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Sword not found or does not belong to you",
      });
    }

    // Cannot set if already on anvil
    if (sword.isOnAnvil) {
      return res.status(400).json({
        success: false,
        error: "This sword is already on the anvil",
      });
    }

    // Cannot set if sold
    if (sword.isSolded) {
      return res.status(400).json({
        success: false,
        error: "Cannot place a solded sword on the anvil",
      });
    }

    // Cannot set if broken
    if (sword.isBroken) {
      return res.status(400).json({
        success: false,
        error: "Cannot place a broken sword on the anvil",
      });
    }

    await prisma.$transaction(async (tx) => {
      // Remove current anvil sword if any (clear old one)
      if (user.anvilSwordId) {
        await tx.userSword.update({
          where: { id: user.anvilSwordId },
          data: { isOnAnvil: false },
        });
      }

      // Set new sword on anvil
      await tx.userSword.update({
        where: { id: BigInt(swordId) },
        data: { isOnAnvil: true },
      });

      // Update user's anvil reference
      await tx.user.update({
        where: { id: userId },
        data: { anvilSwordId: BigInt(swordId) },
      });
    });

    return res.json({
      success: true,
      message: "Sword successfully placed on anvil",
      swordId: swordId.toString(),
    });
  } catch (err: any) {
    console.error("set sword on anvil error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 13) Remove Sword from Anvil (only if it is currently on anvil)
export const removeSwordFromAnvil = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const user = await userGuard(userId);

    // Check if there is any sword on anvil at all
    if (!user.anvilSwordId) {
      return res.status(400).json({
        success: false,
        error: "No sword is currently on the anvil",
      });
    }

    // Verify the sword exists, belongs to the user, AND is actually on the anvil
    const sword = await prisma.userSword.findUnique({
      where: { id: user.anvilSwordId },
      select: {
        userId: true,
        isOnAnvil: true,
      },
    });

    if (!sword) {
      return res.status(404).json({
        success: false,
        error: "Sword not found",
      });
    }

    if (sword.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "You do not own this sword",
      });
    }

    // Ensure the sword is actually on the anvil
    if (!sword.isOnAnvil) {
      return res.status(400).json({
        success: false,
        error: "This sword is not currently placed on the anvil",
      });
    }

    await prisma.$transaction(async (tx) => {
      // Remove from anvil
      await tx.userSword.update({
        where: { id: user.anvilSwordId! },
        data: { isOnAnvil: false },
      });

      // Clear user's anvil reference
      await tx.user.update({
        where: { id: userId },
        data: { anvilSwordId: null },
      });
    });

    return res.json({
      success: true,
      message:
        "Sword successfully removed from anvil and placed back in inventory",
      swordId: user.anvilSwordId.toString(),
    });
  } catch (err: any) {
    console.error("remove sword from anvil error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 14) Upgrade Sword (with shield protection, 4 cases, random byproduct on break + history record)
export const upgradeSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body;
    if (!swordId || isNaN(Number(swordId))) {
      return res.status(400).json({
        success: false,
        error: "Valid sword ID required",
      });
    }
    // User guard: checks user exists and not banned
    const user = await userGuard(userId);
    // Fetch sword + definition
    const sword = await prisma.userSword.findUnique({
      where: { id: BigInt(swordId) },
      include: {
        swordLevelDefinition: {
          select: {
            id: true,
            level: true,
            upgradeCost: true,
            successRate: true,
          },
        },
      },
    });
    if (!sword || sword.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Sword not found or does not belong to you",
      });
    }
    // Basic checks
    if (sword.isSolded) {
      return res.status(400).json({
        success: false,
        error: "Cannot upgrade a sold sword",
      });
    }
    if (sword.isBroken) {
      return res.status(400).json({
        success: false,
        error: "Cannot upgrade a broken sword",
      });
    }
    if (!sword.isOnAnvil) {
      return res.status(400).json({
        success: false,
        error: "Sword must be on anvil to upgrade",
      });
    }
    if (sword.level >= 100) {
      return res.status(400).json({
        success: false,
        error: "Sword has reached maximum level (100)",
      });
    }
    const upgradeCost = sword.swordLevelDefinition.upgradeCost;
    if (user.gold < upgradeCost) {
      return res.status(400).json({
        success: false,
        error: "Insufficient gold for upgrade",
      });
    }
    const successRate = sword.swordLevelDefinition.successRate / 100; // e.g. 45 → 0.45
    const randomChance = Math.random(); // 0.0 to 1.0
    let result: any = {};
    let historyData: any = {
      userId,
      swordId: sword.id,
      fromSwordLevelId: sword.swordLevelDefinition.id,
      success: false,
      goldSpent: upgradeCost,
    };
    await prisma.$transaction(async (tx) => {
      // Always deduct upgrade cost
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: upgradeCost } },
      });
      // Case 1 & 2: Success
      if (randomChance <= successRate) {
        const nextLevel = sword.level + 1;
        const nextDef = await tx.swordLevelDefinition.findUnique({
          where: { level: nextLevel },
          select: { id: true },
        });
        if (!nextDef) {
          throw new Error("Next level definition not found");
        }
        // Consume shield if protection is on
        let shieldConsumed = false;
        if (user.isShieldOn) {
          if (user.totalShields < 1) {
            throw new Error("Shield protection is on but no shields available");
          }
          await tx.user.update({
            where: { id: userId },
            data: { totalShields: { decrement: 1 } },
          });
          shieldConsumed = true;
        }
        // Upgrade sword
        await tx.userSword.update({
          where: { id: sword.id },
          data: {
            level: nextLevel,
            swordLevelDefinitionId: nextDef.id,
          },
        });
        // Update history
        historyData.toSwordLevelId = nextDef.id;
        historyData.success = true;
        result = {
          type: "success",
          message: `Upgrade successful! Sword upgraded to level ${nextLevel}`,
          newLevel: nextLevel,
          shieldConsumed,
        };
      }
      // Case 3 & 4: Failure
      else {
        let shieldConsumed = false;
        let swordBroken = false;
        let byproduct = null;
        if (user.isShieldOn) {
          // Case 3: Shield ON → protect sword, consume shield
          if (user.totalShields < 1) {
            throw new Error("Shield protection is on but no shields available");
          }
          await tx.user.update({
            where: { id: userId },
            data: { totalShields: { decrement: 1 } },
          });
          shieldConsumed = true;
          result = {
            type: "protected_failure",
            message: "Upgrade failed, but shield protected the sword!",
            shieldConsumed: true,
            swordBroken: false,
          };
        } else {
          // Case 4: Shield OFF → sword breaks, give random byproduct
          swordBroken = true;
          await tx.userSword.update({
            where: { id: sword.id },
            data: {
              isBroken: true,
              isOnAnvil: false,
            },
          });
          await tx.user.update({
            where: { id: userId },
            data: { anvilSwordId: null },
          });
          // Give random byproduct material
          const drops = await tx.swordUpgradeDrop.findMany({
            where: { swordLevelDefinitionId: sword.swordLevelDefinitionId },
            select: {
              materialId: true,
              dropPercentage: true,
              minQuantity: true,
              maxQuantity: true,
            },
          });
          if (drops.length === 0) {
            throw new Error("No drop materials defined for this sword level");
          }
          // Draw random material based on drop percentages
          let randomDrop = Math.random() * 100;
          let selectedDrop = drops[0];
          let cumulative = 0;
          for (const drop of drops) {
            cumulative += drop.dropPercentage;
            if (randomDrop <= cumulative) {
              selectedDrop = drop;
              break;
            }
          }
          // Random quantity in range
          const qty =
            Math.floor(
              Math.random() *
                (selectedDrop.maxQuantity - selectedDrop.minQuantity + 1),
            ) + selectedDrop.minQuantity;
          // Add to user's unsold materials (upsert)
          await tx.userMaterial.upsert({
            where: {
              userId_materialId: {
                userId,
                materialId: selectedDrop.materialId,
              },
            },
            update: { unsoldQuantity: { increment: qty } },
            create: {
              userId,
              materialId: selectedDrop.materialId,
              unsoldQuantity: qty,
              soldedQuantity: 0,
            },
          });
          byproduct = {
            materialId: selectedDrop.materialId,
            quantity: qty,
          };
          // Update history for byproduct
          historyData.droppedMaterialId = selectedDrop.materialId;
          historyData.droppedQuantity = qty;
          result = {
            type: "broken_failure",
            message:
              "Upgrade failed! Sword broke, but received random material as byproduct.",
            swordBroken: true,
            shieldConsumed: false,
            byproduct,
          };
        }
      }
      // Create history record (always, success or failure)
      await tx.swordUpgradeHistory.create({
        data: historyData,
      });
    });
    return res.json({
      success: true,
      message: result.message,
      data: serializeBigInt(result),
    });
  } catch (err: any) {
    if (err.message === "Next level definition not found") {
      return res.status(400).json({
        success: false,
        error: "Cannot upgrade: Next level sword definition is not ready",
      });
    }
    if (err.message === "No drop materials defined for this sword level") {
      return res.status(500).json({
        success: false,
        error:
          "Upgrade failed: No byproduct materials configured for this level",
      });
    }
    if (err.message === "Shield protection is on but no shields available") {
      return res.status(400).json({
        success: false,
        error: "Shield protection is active but you have no shields left",
      });
    }
    console.error("upgradeSword error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error during upgrade",
    });
  }
};

// 15) Sword Synthesis (Consume exact required materials, guarantee 1 new sword + record history)
export const synthesizeSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordLevelDefinitionId } = req.body;

    if (!swordLevelDefinitionId || isNaN(Number(swordLevelDefinitionId))) {
      return res.status(400).json({
        success: false,
        error: "swordLevelDefinitionId is required and must be a valid number",
      });
    }

    const targetLevelId = BigInt(swordLevelDefinitionId);

    // User guard: checks user exists and not banned
    const user = await userGuard(userId);

    // Fetch target sword level definition
    const targetLevel = await prisma.swordLevelDefinition.findUnique({
      where: { id: targetLevelId },
      select: {
        id: true,
        level: true,
        synthesizeCost: true,
        isSynthesizeAllow: true,
      },
    });

    if (!targetLevel) {
      return res.status(404).json({
        success: false,
        error: "Target sword level not found",
      });
    }

    // Check if synthesis is allowed for this level
    if (!targetLevel.isSynthesizeAllow) {
      return res.status(400).json({
        success: false,
        error: "Synthesis is not allowed for this sword level",
      });
    }

    // Check sufficient gold
    if (user.gold < targetLevel.synthesizeCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient gold. Required: ${targetLevel.synthesizeCost}, You have: ${user.gold}`,
      });
    }

    // Fetch required materials for this level
    const requiredMaterials = await prisma.swordSynthesisRequirement.findMany({
      where: { swordLevelDefinitionId: targetLevelId },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (requiredMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No synthesis requirements defined for this sword level",
      });
    }

    // Check user has enough unsold quantity for each required material
    for (const reqMat of requiredMaterials) {
      const userMat = await prisma.userMaterial.findUnique({
        where: {
          userId_materialId: { userId, materialId: reqMat.materialId },
        },
        select: { unsoldQuantity: true },
      });

      if (!userMat || userMat.unsoldQuantity < reqMat.requiredQuantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient ${reqMat.material.name} (${reqMat.material.code}). Required: ${reqMat.requiredQuantity}, You have: ${userMat?.unsoldQuantity ?? 0}`,
        });
      }
    }

    let newSword;
    let historyRecord;

    await prisma.$transaction(async (tx) => {
      // Deduct synthesize cost
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: targetLevel.synthesizeCost } },
      });

      // Consume required materials
      for (const reqMat of requiredMaterials) {
        await tx.userMaterial.update({
          where: {
            userId_materialId: { userId, materialId: reqMat.materialId },
          },
          data: {
            unsoldQuantity: { decrement: reqMat.requiredQuantity },
          },
        });
      }

      // Generate unique sword code
      const swordCode = generateSecureCode(12); // your helper function

      // Create new sword
      newSword = await tx.userSword.create({
        data: {
          code: swordCode,
          userId,
          level: targetLevel.level,
          isOnAnvil: false,
          swordLevelDefinitionId: targetLevel.id,
          isSolded: false,
          isBroken: false,
        },
      });

      // Record synthesis history
      historyRecord = await tx.swordSynthesisHistory.create({
        data: {
          userId,
          swordLevelDefinitionId: targetLevel.id,
          createdSwordId: newSword.id,
          goldSpent: targetLevel.synthesizeCost,
        },
      });
    });

    return res.json({
      success: true,
      message: `Synthesis successful! You crafted a Level ${targetLevel.level} sword.`,
      sword: serializeBigInt(newSword),
      history: serializeBigInt(historyRecord),
    });
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_GOLD") {
      return res.status(400).json({
        success: false,
        error: "Not enough gold to synthesize",
      });
    }
    console.error("synthesizeSword error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

// 16) gift claim endpoint
export const claimGift = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { giftId } = req.body;

    if (!giftId) {
      return res.status(400).json({ success: false, error: "giftId required" });
    }

    await prisma.$transaction(async (tx) => {
      const gift = await tx.userGift.findUnique({
        where: { id: BigInt(giftId) },
        include: { items: true },
      });

      if (!gift) throw new Error("Gift not found");
      if (gift.receiverId !== userId) throw new Error("Not your gift");
      if (gift.status === "CLAIMED")
        throw new Error("Gift was already claimed");
      if (gift.status === "CANCELLED")
        throw new Error("Gift was cancelled by admin");

      for (const it of gift.items) {
        switch (it.type) {
          case "GOLD":
            await tx.user.update({
              where: { id: userId },
              data: { gold: { increment: it.amount ?? 0 } },
            });
            break;

          case "TRUST_POINTS":
            await tx.user.update({
              where: { id: userId },
              data: { trustPoints: { increment: it.amount ?? 0 } },
            });
            break;

          case "SHIELD":
            await tx.user.update({
              where: { id: userId },
              data: { totalShields: { increment: it.amount ?? 0 } },
            });
            break;

          case "MATERIAL":
            if (it.materialId) {
              await tx.userMaterial.upsert({
                where: {
                  userId_materialId: { userId, materialId: it.materialId },
                },
                update: {
                  unsoldQuantity: { increment: it.materialQunatity ?? 0 },
                },
                create: {
                  userId,
                  materialId: it.materialId,
                  unsoldQuantity: it.materialQunatity ?? 0,
                  soldedQuantity: 0,
                },
              });
            }
            break;

          case "SWORD":
            if (it.swordLevel) {
              const def = await tx.swordLevelDefinition.findUnique({
                where: { level: it.swordLevel },
              });
              if (!def) throw new Error("Invalid sword level in gift");

              const code = generateSecureCode(12);

              await tx.userSword.create({
                data: {
                  code,
                  userId,
                  level: def.level,
                  swordLevelDefinitionId: def.id,
                  isOnAnvil: false,
                  isSolded: false,
                  isBroken: false,
                },
              });
            }
            break;
        }
      }

      await tx.userGift.update({
        where: { id: BigInt(giftId) },
        data: { status: "CLAIMED", claimedAt: new Date() },
      });
    });

    return res.json({ success: true, message: "Gift claimed successfully" });
  } catch (err: any) {
    console.error("Claim gift Error: ", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to claim gift",
    });
  }
};

// 17) toggle the shiled protection
// userActionController.ts
export const toggleShieldProtection = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const user = await userGuard(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isShieldOn: !user.isShieldOn },
      select: { isShieldOn: true },
    });

    return res.json({
      success: true,
      isShieldOn: updated.isShieldOn,
    });
  } catch (err: any) {
    console.error("Toggle shiled protection Error:", err);
    return res
      .status(400)
      .json({ success: false, error: err.message || "Internal server Error" });
  }
};

// 18) Start Session (Authenticated)
export const createAdSession = async (req: UserAuthRequest, res: Response) => {
  try {
    const { rewardType } = req.body as { rewardType: AdRewardType };
    const userId = BigInt(req.user.userId);

    if (!["GOLD", "OLD_SWORD", "SHIELD"].includes(rewardType)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid reward type" });
    }

    // Check limits from AdminConfig and User
    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!config || !user) {
      return res
        .status(400)
        .json({ success: false, error: "Config or user not found" });
    }

    if (rewardType === AdRewardType.SHIELD) {
      if (user.oneDayShieldAdsViewed >= config.maxDailyShieldAds) {
        return res
          .status(400)
          .json({ success: false, error: "Daily shield ad limit reached" });
      }
      if (user.totalShields >= config.maxShieldHold) {
        return res
          .status(400)
          .json({ success: false, error: "Max shields held" });
      }
    } else if (rewardType === AdRewardType.GOLD) {
      if (user.oneDayAdsViewed >= config.maxDailyAds) {
        return res
          .status(400)
          .json({ success: false, error: "Daily gold ad limit reached" });
      }
    } else if (rewardType === AdRewardType.OLD_SWORD) {
      if (user.oneDaySwordAdsViewed >= config.maxDailySwordAds) {
        return res
          .status(400)
          .json({ success: false, error: "Daily sword ad limit reached" });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Ad request type" });
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    await prisma.adRewardSession.create({
      data: {
        userId,
        nonce,
        rewardType,
        rewarded: false,
      },
    });

    res.json({ success: true, nonce, userId: userId.toString() });
  } catch (err: any) {
    console.error("Create add Error:", err);
    return res
      .status(400)
      .json({ success: false, error: err.message || "Internal server Error" });
  }
};

// 19) Claim Reward (Authenticated)
export const verifyAdSession = async (req: UserAuthRequest, res: Response) => {
  try {
    const { nonce } = req.body;
    const userId = BigInt(req.user.userId);

    // CLEANUP expired sessions
    await prisma.adRewardSession.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
    });

    const session = await prisma.adRewardSession.findUnique({
      where: { nonce },
    });

    if (
      !session ||
      session.userId !== userId ||
      // session.rewarded === true ||
      session.rewardedAt !== null
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or unverified session" });
    }

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
    });
    if (!config) {
      return res
        .status(400)
        .json({ success: false, error: "Config not found" });
    }

    // Grant reward
    switch (session.rewardType) {
      case AdRewardType.GOLD:
        await prisma.user.update({
          where: { id: userId },
          data: {
            gold: { increment: config.goldReward },
            oneDayAdsViewed: { increment: 1 },
            totalAdsViewed: { increment: 1 },
          },
        });
        break;
      case AdRewardType.OLD_SWORD:
        // Create sword at configured level
        const swordDef = await prisma.swordLevelDefinition.findUnique({
          where: { level: config.swordLevelReward },
        });
        if (!swordDef)
          throw new Error("Sword definition not found for reward level");
        const code = generateSecureCode(12);
        await prisma.userSword.create({
          data: {
            code,
            userId,
            level: config.swordLevelReward,
            isOnAnvil: false,
            swordLevelDefinitionId: swordDef.id,
          },
        });
        await prisma.user.update({
          where: { id: userId },
          data: {
            oneDaySwordAdsViewed: { increment: 1 },
            totalAdsViewed: { increment: 1 },
          },
        });
        break;
      case AdRewardType.SHIELD:
        await prisma.user.update({
          where: { id: userId },
          data: {
            totalShields: { increment: 1 },
            oneDayShieldAdsViewed: { increment: 1 },
            totalAdsViewed: { increment: 1 },
          },
        });
        break;
    }

    await prisma.adRewardSession.delete({
      where: { nonce },
    });

    res.json({ success: true, rewardType: session.rewardType });
  } catch (err: any) {
    console.error("verify add Error:", err);
    return res
      .status(400)
      .json({ success: false, error: err.message || "Internal server Error" });
  }
};

// 20) daily missions claim
export const claimDailyMission = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const { missionId } = req.body;

    if (!missionId || isNaN(Number(missionId))) {
      return res.status(400).json({
        success: false,
        error: "Valid missionId is required",
      });
    }

    const missionIdBig = BigInt(missionId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the mission definition
      const mission = await tx.dailyMissionDefinition.findUnique({
        where: { id: missionIdBig },
        select: {
          id: true,
          title: true,
          isActive: true,
          conditions: true,
          targetValue: true,
          reward: true,
        },
      });

      if (!mission) {
        throw new Error("Mission not found");
      }

      if (!mission.isActive) {
        throw new Error("This mission is no longer active");
      }

      // 2. Parse and validate conditions
      let adType: string | undefined;

      try {
        const conditions = mission.conditions as any[];

        if (!Array.isArray(conditions) || conditions.length === 0) {
          throw new Error("Mission has no valid conditions");
        }

        // We expect exactly one condition of type "completeAllAds"
        const adCondition = conditions.find(
          (c) => c?.type === "completeAllAds" && c?.adType,
        );

        if (!adCondition) {
          throw new Error(
            `Mission does not contain a valid "completeAllAds" condition. ` +
              `Found: ${JSON.stringify(conditions)}`,
          );
        }

        adType = adCondition.adType;

        if (!["GOLD", "SHIELD", "OLD_SWORD"].includes(adType!)) {
          throw new Error(`Unsupported ad type: ${adType}`);
        }
      } catch (parseErr) {
        console.error("Condition parse error:", parseErr, {
          missionId,
          conditions: mission.conditions,
        });
        throw new Error("Invalid mission configuration");
      }

      // 3. Fetch user and config
      const [user, config] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: {
            oneDayAdsViewed: true,
            oneDayShieldAdsViewed: true,
            oneDaySwordAdsViewed: true,
          },
        }),
        tx.adminConfig.findUnique({
          where: { id: BigInt(1) },
          select: {
            maxDailyAds: true,
            maxDailyShieldAds: true,
            maxDailySwordAds: true,
          },
        }),
      ]);

      if (!user) {
        throw new Error("User not found");
      }
      if (!config) {
        throw new Error("Server configuration missing");
      }

      // 4. Check if already claimed today
      const progress = await tx.userDailyMissionProgress.findUnique({
        where: {
          userId_missionId: {
            userId,
            missionId: missionIdBig,
          },
        },
      });

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      if (
        progress?.lastClaimedAt &&
        new Date(progress.lastClaimedAt) >= todayStart
      ) {
        throw new Error("You have already claimed this mission today");
      }

      // 5. Validate completion
      let eligible = false;

      switch (adType) {
        case "GOLD":
          eligible = user.oneDayAdsViewed >= config.maxDailyAds;
          break;
        case "SHIELD":
          eligible = user.oneDayShieldAdsViewed >= config.maxDailyShieldAds;
          break;
        case "OLD_SWORD":
          eligible = user.oneDaySwordAdsViewed >= config.maxDailySwordAds;
          break;
      }

      if (!eligible) {
        throw new Error("You have not completed the required ads yet");
      }

      // 6. Grant reward
      const reward = mission.reward as any;

      switch (reward?.type) {
        case "gold":
          if (typeof reward.amount !== "number" || reward.amount <= 0) {
            throw new Error("Invalid gold reward amount");
          }
          await tx.user.update({
            where: { id: userId },
            data: { gold: { increment: reward.amount } },
          });
          break;

        case "trustPoints":
          if (typeof reward.amount !== "number" || reward.amount <= 0) {
            throw new Error("Invalid trust points reward amount");
          }
          await tx.user.update({
            where: { id: userId },
            data: { trustPoints: { increment: reward.amount } },
          });
          break;

        case "shield":
          if (typeof reward.quantity !== "number" || reward.quantity <= 0) {
            throw new Error("Invalid shield reward quantity");
          }
          await tx.user.update({
            where: { id: userId },
            data: { totalShields: { increment: reward.quantity } },
          });
          break;

        case "sword":
          if (typeof reward.level !== "number" || reward.level < 1) {
            throw new Error("Invalid sword reward level");
          }
          const swordDef = await tx.swordLevelDefinition.findUnique({
            where: { level: reward.level },
          });
          if (!swordDef) {
            throw new Error(`Sword level ${reward.level} not found`);
          }
          await tx.userSword.create({
            data: {
              code: generateSecureCode(12),
              userId,
              level: swordDef.level,
              swordLevelDefinitionId: swordDef.id,
              isOnAnvil: false,
              isSolded: false,
              isBroken: false,
            },
          });
          break;

        case "material":
          if (
            typeof reward.materialId !== "number" ||
            typeof reward.quantity !== "number" ||
            reward.quantity <= 0
          ) {
            throw new Error("Invalid material reward data");
          }
          await tx.userMaterial.upsert({
            where: {
              userId_materialId: {
                userId,
                materialId: BigInt(reward.materialId),
              },
            },
            update: {
              unsoldQuantity: { increment: reward.quantity },
            },
            create: {
              userId,
              materialId: BigInt(reward.materialId),
              unsoldQuantity: reward.quantity,
              soldedQuantity: 0,
            },
          });
          break;

        default:
          throw new Error(`Unsupported reward type: ${reward?.type}`);
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          todayMissionsDone: { increment: 1 },
          totalMissionsDone: { increment: 1 },
        },
      });

      // 7. Record claim / update progress
      if (progress) {
        await tx.userDailyMissionProgress.update({
          where: {
            userId_missionId: { userId, missionId: missionIdBig },
          },
          data: {
            claimedTimes: { increment: 1 },
            lastClaimedAt: now,
          },
        });
      } else {
        await tx.userDailyMissionProgress.create({
          data: {
            userId,
            missionId: missionIdBig,
            claimedTimes: 1,
            lastClaimedAt: now,
          },
        });
      }

      return { success: true };
    });

    return res.json({
      success: true,
      message: "Daily mission claimed successfully",
    });
  } catch (err: any) {
    console.error("claimDailyMission error:", {
      userId: req.user?.userId,
      missionId: req.body?.missionId,
      error: err.message,
      stack: err.stack,
    });

    const status =
      err.message.includes("not found") ||
      err.message.includes("already claimed")
        ? 400
        : 500;

    return res.status(status).json({
      success: false,
      error: err.message || "Failed to claim daily mission",
    });
  }
};

// 21) one time missions claim
export const claimOneTimeMission = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const { missionId } = req.body;

    if (!missionId || isNaN(Number(missionId))) {
      return res.status(400).json({
        success: false,
        error: "Valid missionId required",
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch mission
      const mission = await tx.oneTimeMissionDefinition.findUnique({
        where: { id: BigInt(missionId) },
      });

      if (!mission || !mission.isActive) {
        throw new Error("Mission not active");
      }

      const now = new Date();

      // 2️⃣ Check time window
      if (mission.startAt > now) {
        throw new Error("Mission not started yet");
      }

      if (mission.expiresAt && mission.expiresAt < now) {
        throw new Error("Mission expired");
      }

      // 3️⃣ Check already claimed
      const existing = await tx.userOneTimeMissionProgress.findUnique({
        where: {
          userId_missionId: {
            userId,
            missionId: BigInt(missionId),
          },
        },
      });

      if (existing) {
        throw new Error("Mission already claimed");
      }

      const conditions = mission.conditions as any[];
      const targetValue = mission.targetValue;

      let totalProgress = 0;

      const dateFilter = {
        gte: mission.startAt,
        ...(mission.expiresAt && { lte: mission.expiresAt }),
      };

      for (const cond of conditions) {
        switch (cond.type) {
          // ================= BUY SWORD =================
          case "buySword": {
            const count = await tx.swordMarketplacePurchase.count({
              where: {
                userId,
                purchasedAt: dateFilter,
                ...(cond.level && {
                  swordLevelDefinition: {
                    level: cond.level,
                  },
                }),
              },
            });
            totalProgress += count;
            break;
          }

          // ================= BUY MATERIAL =================
          case "buyMaterial": {
            const count = await tx.materialMarketplacePurchase.aggregate({
              where: {
                userId,
                purchasedAt: dateFilter,
                ...(cond.materialId && {
                  materialId: BigInt(cond.materialId),
                }),
              },
              _sum: {
                quantity: true,
              },
            });

            totalProgress += Number(count._sum.quantity || 0);
            break;
          }

          // ================= BUY SHIELD =================
          case "buyShield": {
            const count = await tx.shieldMarketplacePurchase.aggregate({
              where: {
                userId,
                purchasedAt: dateFilter,
              },
              _sum: {
                quantity: true,
              },
            });

            totalProgress += Number(count._sum.quantity || 0);
            break;
          }

          // ================= UPGRADE SWORD =================
          case "upgradeSword": {
            const count = await tx.swordUpgradeHistory.count({
              where: {
                userId,
                createdAt: dateFilter,
                ...(cond.level && {
                  sword: {
                    level: cond.level,
                  },
                }),
              },
            });

            totalProgress += count;
            break;
          }

          // ================= SYNTHESIZE =================
          case "synthesize": {
            const count = await tx.swordSynthesisHistory.count({
              where: {
                userId,
                createdAt: dateFilter,
                ...(cond.level && {
                  swordLevelDefinition: {
                    level: cond.level,
                  },
                }),
              },
            });

            totalProgress += count;
            break;
          }

          default:
            throw new Error(`Unsupported mission condition: ${cond.type}`);
        }
      }

      // 4️⃣ Check completion
      if (totalProgress < targetValue) {
        throw new Error(
          `Mission not completed. Progress: ${totalProgress}/${targetValue}`,
        );
      }

      // 5️⃣ Grant reward
      const reward = mission.reward as any;

      switch (reward.type) {
        case "gold":
          await tx.user.update({
            where: { id: userId },
            data: { gold: { increment: reward.amount } },
          });
          break;

        case "trustPoints":
          await tx.user.update({
            where: { id: userId },
            data: { trustPoints: { increment: reward.amount } },
          });
          break;

        case "shield":
          await tx.user.update({
            where: { id: userId },
            data: { totalShields: { increment: reward.quantity } },
          });
          break;

        case "sword": {
          const def = await tx.swordLevelDefinition.findUnique({
            where: { level: reward.level },
          });

          if (!def) throw new Error("Invalid sword reward");

          await tx.userSword.create({
            data: {
              code: generateSecureCode(12),
              userId,
              level: def.level,
              swordLevelDefinitionId: def.id,
              isOnAnvil: false,
              isSolded: false,
              isBroken: false,
            },
          });
          break;
        }

        case "material":
          await tx.userMaterial.upsert({
            where: {
              userId_materialId: {
                userId,
                materialId: BigInt(reward.materialId),
              },
            },
            update: {
              unsoldQuantity: { increment: reward.quantity },
            },
            create: {
              userId,
              materialId: BigInt(reward.materialId),
              unsoldQuantity: reward.quantity,
              soldedQuantity: 0,
            },
          });
          break;

        default:
          throw new Error("Invalid reward type");
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          todayMissionsDone: { increment: 1 },
          totalMissionsDone: { increment: 1 },
        },
      });

      // 6️⃣ Mark claimed
      await tx.userOneTimeMissionProgress.create({
        data: {
          userId,
          missionId: BigInt(missionId),
        },
      });
    });

    return res.json({
      success: true,
      message: "One-time mission claimed successfully",
    });
  } catch (err: any) {
    console.error("Claim one-time mission error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || "Failed to claim mission",
    });
  }
};
