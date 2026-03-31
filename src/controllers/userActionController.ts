import type { Response } from "express";
import crypto from "crypto";
import prisma from "../database/client.js";
import { generateSecureCode } from "../services/generateCode.js";
import { userGuard } from "../services/queryHelpers.js";
import type { UserAuthRequest } from "../middleware/userAuth.js";
import {
  VoucherStatus,
  SupportCategory,
  SupportPriority,
  AdRewardType,
  GiftItemType,
  GiftStatus,
} from "@prisma/client";
import { serializeBigInt } from "../services/serializeBigInt.js";

// 1) Create Voucher (User creates a voucher by locking gold)
export const createVoucher = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { goldAmount } = req.body;

    if (!goldAmount || typeof goldAmount !== "number" || goldAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.goldAmountRequired"),
      });
    }

    const amount = Math.floor(goldAmount);

    // Ensure voucher amount is in multiples of 1000
    if (amount % 1000 !== 0) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.voucherMultipleOf1000"),
      });
    }

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
      select: { minVoucherGold: true, maxVoucherGold: true },
    });

    if (!config) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.adminConfigNotFound"),
      });
    }

    if (amount < config.minVoucherGold || amount > config.maxVoucherGold) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.voucherAmountOutOfRange", {
          min: config.minVoucherGold,
          max: config.maxVoucherGold,
        }),
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
            return res.status(400).json({
              success: false,
              error: req.t("userAction.error.InsufficientGold"),
            });
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
        error: req.t("userAction.error.voucherCodeGenerationFailed"),
      });
    }

    return res.json({
      success: true,
      message: req.t("userAction.success.voucherCreated"),
      data: serializeBigInt(voucher),
    });
  } catch (err: any) {
    console.error("Creating voucher error:", err);
    return res.status(400).json({
      success: false,
      error: req.t("userAction.error.internalServerError"),
    });
  }
};

// 2)
export const assignAllowedUserToVoucher = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const creatorId = BigInt(req.user.userId);

    const { voucherId, allowedEmail, allowedTgUserName } = req.body;

    if (!voucherId || isNaN(Number(voucherId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.voucherIdRequired"),
      });
    }

    // must provide at least one
    if (!allowedEmail && !allowedTgUserName) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.provideEmailOrTgUsername"),
      });
    }

    await userGuard(creatorId);

    const voucher = await prisma.userVoucher.findUnique({
      where: { id: BigInt(voucherId) },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.voucherNotFound"),
      });
    }

    if (voucher.createdById !== creatorId) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.notYourVoucher"),
      });
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.onlyPendingVoucherAssignable"),
      });
    }

    let allowedUser = null;

    // EMAIL CASE
    if (allowedEmail) {
      const normalizedEmail = allowedEmail.trim().toLowerCase();

      allowedUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    }

    // TELEGRAM USERNAME CASE
    else if (allowedTgUserName) {
      const normalizedTg = allowedTgUserName
        .replace("@", "")
        .trim()
        .toLowerCase();

      allowedUser = await prisma.user.findFirst({
        where: {
          telegramUser: normalizedTg,
          isTelegramLogin: true,
        },
      });
    }

    if (!allowedUser) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.allowedUserNotFound"),
      });
    }

    if (allowedUser.isBanned) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.allowedUserBanned"),
      });
    }

    if (allowedUser.id === creatorId) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.cannotAssignToSelf"),
      });
    }

    await prisma.userVoucher.update({
      where: {
        id: BigInt(voucherId),
        status: VoucherStatus.PENDING,
      },
      data: {
        allowedUserId: allowedUser.id,
      },
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.voucherAssigned"),
    });
  } catch (err: any) {
    console.error("Assign voucher error:", err);

    return res.status(400).json({
      success: false,
      error: req.t("userAction.error.internalServerError"),
    });
  }
};

// 3)
export const removeAllowedUserFromVoucher = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const creatorId = BigInt(req.user.userId);
    const { voucherId } = req.body;

    if (!voucherId || isNaN(Number(voucherId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.voucherIdRequired"),
      });
    }

    await userGuard(creatorId);

    const voucher = await prisma.userVoucher.findUnique({
      where: { id: BigInt(voucherId) },
      select: {
        createdById: true,
        status: true,
        allowedUserId: true,
      },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.voucherNotFound"),
      });
    }

    if (voucher.createdById !== creatorId) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.notYourVoucher"),
      });
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.onlyPendingVoucherAssignable"),
      });
    }

    if (!voucher.allowedUserId) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.noUserAssigned"),
      });
    }

    // Remove assignment
    await prisma.userVoucher.update({
      where: { id: BigInt(voucherId) },
      data: {
        allowedUserId: null,
      },
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.assignedUserRemoved"),
    });
  } catch (err: any) {
    console.error("Remove allowed user error:", err);
    return res.status(400).json({
      success: false,
      error: req.t("userAction.error.internalServerError"),
    });
  }
};

// 4) Cancel Voucher (refund gold if pending)
export const cancelVoucher = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    await userGuard(userId);
    const { voucherId } = req.body;

    if (!voucherId || isNaN(Number(voucherId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.voucherIdRequired"),
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
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.voucherNotFound"),
      });
    }

    if (voucher.createdById !== userId) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.notYourVoucher"),
      });
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.onlyPendingVoucherCancellable"),
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
          updatedAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.voucherCancelled"),
    });
  } catch (err: any) {
    console.error("Cancelling voucher error:", err);
    return res.status(400).json({
      success: false,
      error: req.t("userAction.error.internalServerError"),
    });
  }
};

// 5) Create Customer Support Complaint(no check for the user ban here)
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
        error: req.t("userAction.error.titleTooShort"),
      });
    }

    if (!content || typeof content !== "string" || content.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.contentTooShort"),
      });
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.messageTooShort"),
      });
    }

    // Validate category & priority enums
    if (!Object.values(SupportCategory).includes(category)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.invalidCategory", {
          allowed: Object.values(SupportCategory).join(", "),
        }),
      });
    }

    if (!Object.values(SupportPriority).includes(priority)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.invalidPriority", {
          allowed: Object.values(SupportPriority).join(", "),
        }),
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
      message: req.t("userAction.success.complaintSubmitted"),
      data: serializeBigInt(complaint),
    });
  } catch (err: any) {
    console.error("Create Complaint error:", err);
    return res.status(400).json({
      success: false,
      error: req.t("userAction.error.internalServerError"),
    });
  }
};

// 6) Update Complaint (only if not reviewed)
export const updateComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { complaintId, title, content, message } = req.body;

    if (!complaintId || isNaN(Number(complaintId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.voucherIdRequired"),
      }); // reuse key or add new
    }

    if (!title && !content && !message) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.provideAtLeastOneField"),
      });
    }

    // Validate lengths if provided
    if (!title || typeof title !== "string" || title.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.titleTooShort"),
      });
    }

    if (!content || typeof content !== "string" || content.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.contentTooShort"),
      });
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.messageTooShort"),
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const complaint = await tx.customerSupport.findUnique({
        where: { id: BigInt(complaintId) },
      });

      if (!complaint)
        throw new Error(req.t("userAction.error.complaintNotFound"));
      if (complaint.userId !== userId)
        throw new Error(req.t("userAction.error.notYourComplaint"));
      if (complaint.isReviewed)
        throw new Error(req.t("userAction.error.complaintAlreadyReviewed"));

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
      message: req.t("userAction.success.complaintUpdated"),
      data: serializeBigInt(updated),
    });
  } catch (err: any) {
    console.error("Update Complaint error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 7) Delete Complaint (only if not reviewed)
export const deleteComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { complaintId } = req.body;

    if (!complaintId || isNaN(Number(complaintId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.voucherIdRequired"), // Consider making a generic "idRequired" later
      });
    }

    await prisma.$transaction(async (tx) => {
      const complaint = await tx.customerSupport.findUnique({
        where: { id: BigInt(complaintId) },
        select: { userId: true, isReviewed: true },
      });

      if (!complaint) {
        throw new Error(req.t("userAction.error.complaintNotFound"));
      }

      if (complaint.userId !== userId) {
        throw new Error(req.t("userAction.error.notYourComplaint"));
      }

      if (complaint.isReviewed) {
        throw new Error(req.t("userAction.error.complaintAlreadyReviewed"));
      }

      await tx.customerSupport.delete({
        where: { id: BigInt(complaintId) },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.complaintDeleted"),
    });
  } catch (err: any) {
    console.error("Delete Complaint error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 8) Buy Sword from Marketplace (with quantity)
export async function buySword(req: UserAuthRequest, res: Response) {
  try {
    const userId = BigInt(req.user.userId);
    const { swordLevelDefinitionId, quantity } = req.body;

    if (!swordLevelDefinitionId || !quantity) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordLevelAndQuantityRequired"),
      });
    }

    const swordDefId = BigInt(swordLevelDefinitionId);
    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.quantityMustBePositiveInteger"),
      });
    }

    const user = await userGuard(userId);

    const swordDefinition = await prisma.swordLevelDefinition.findUnique({
      where: { id: swordDefId },
      select: { id: true, level: true, buyingCost: true, isBuyingAllow: true },
    });

    if (!swordDefinition) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.swordNotFound"),
      });
    }

    if (!swordDefinition.isBuyingAllow) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordNotAvailableForPurchase"),
      });
    }

    const totalPrice = swordDefinition.buyingCost * qty;

    if (user.gold < totalPrice) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.insufficientGold"),
      });
    }

    let purchaseRecord;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: totalPrice } },
      });

      await tx.userSword.upsert({
        where: { userId_swordId: { userId, swordId: swordDefId } },
        update: { unsoldQuantity: { increment: qty } },
        create: {
          userId,
          swordId: swordDefId,
          isOnAnvil: false,
          unsoldQuantity: qty,
          soldedQuantity: 0,
          brokenQuantity: 0,
        },
      });

      purchaseRecord = await tx.swordMarketplacePurchase.create({
        data: {
          userId,
          swordLevelDefinitionId: swordDefId,
          quantity: qty,
          priceGold: totalPrice,
        },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.swordPurchased"),
      data: serializeBigInt(purchaseRecord),
    });
  } catch (err: any) {
    console.error("buySword error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
}

// 9) Buy Material from Marketplace (with quantity)
export async function buyMaterial(req: UserAuthRequest, res: Response) {
  try {
    const userId = BigInt(req.user.userId);
    const { materialId, quantity } = req.body;

    if (!materialId || !quantity) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordLevelAndQuantityRequired"), // Reuse or create specific key
      });
    }

    const matId = BigInt(materialId);
    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.quantityMustBePositiveInteger"),
      });
    }

    const user = await userGuard(userId);

    const material = await prisma.material.findUnique({
      where: { id: matId },
      select: { id: true, buyingCost: true, isBuyingAllow: true },
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.materialNotFound"),
      });
    }

    if (!material.isBuyingAllow) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.materialNotAvailableForPurchase"),
      });
    }

    const totalPrice = material.buyingCost * qty;

    if (user.gold < totalPrice) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.insufficientGold"),
      });
    }

    let purchaseRecord;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: totalPrice } },
      });

      await tx.userMaterial.upsert({
        where: { userId_materialId: { userId, materialId: matId } },
        update: { unsoldQuantity: { increment: qty } },
        create: {
          userId,
          materialId: matId,
          unsoldQuantity: qty,
          soldedQuantity: 0,
        },
      });

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
      message: req.t("userAction.success.materialPurchased"),
      data: serializeBigInt(purchaseRecord),
    });
  } catch (err: any) {
    console.error("buyMaterial error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
}

// 10) Buy Shields
export async function buyShields(req: UserAuthRequest, res: Response) {
  try {
    const userId = BigInt(req.user.userId);
    const { quantity } = req.body;

    if (!quantity) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.quantityMustBePositiveInteger"),
      });
    }

    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.quantityMustBePositiveInteger"),
      });
    }

    const user = await userGuard(userId);

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
        error: req.t("userAction.error.adminConfigNotFound"),
      });
    }

    if (!config.shieldActiveOnMarketplace) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.shieldsNotAvailable"),
      });
    }

    const totalPrice = config.shieldGoldPrice * qty;

    if (user.gold < totalPrice) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.insufficientGold"),
      });
    }

    if (
      config.maxShieldHold > 0 &&
      user.totalShields + qty > config.maxShieldHold
    ) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.maxShieldLimitExceeded", {
          max: config.maxShieldHold,
        }),
      });
    }

    let purchaseRecord;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: totalPrice } },
      });

      await tx.user.update({
        where: { id: userId },
        data: { totalShields: { increment: qty } },
      });

      purchaseRecord = await tx.shieldMarketplacePurchase.create({
        data: { userId, quantity: qty, priceGold: totalPrice },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.shieldsPurchased"),
      data: serializeBigInt(purchaseRecord),
    });
  } catch (err: any) {
    console.error("buy Shields error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
}
// 11) Sell Sword
export const sellSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId, quantity } = req.body;

    if (!swordId || !quantity) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordLevelAndQuantityRequired"),
      });
    }

    const swordDefId = BigInt(swordId);
    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.quantityMustBePositiveInteger"),
      });
    }

    await userGuard(userId);

    const userSword = await prisma.userSword.findUnique({
      where: { userId_swordId: { userId, swordId: swordDefId } },
      include: {
        swordLevelDefinition: {
          select: { level: true, sellingCost: true, isSellingAllow: true },
        },
      },
    });

    if (!userSword) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.youDoNotOwnThisSword"),
      });
    }

    if (!userSword.swordLevelDefinition.isSellingAllow) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.sellingNotAllowed"),
      });
    }

    if (userSword.unsoldQuantity < qty) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.insufficientUnsoldQuantity", {
          count: userSword.unsoldQuantity,
        }),
      });
    }

    const goldToAdd = userSword.swordLevelDefinition.sellingCost * qty;

    await prisma.$transaction(async (tx) => {
      await tx.userSword.update({
        where: { userId_swordId: { userId, swordId: swordDefId } },
        data: {
          unsoldQuantity: { decrement: qty },
          soldedQuantity: { increment: qty },
          ...(userSword.isOnAnvil && userSword.unsoldQuantity === qty
            ? { isOnAnvil: false }
            : {}),
        },
      });

      if (userSword.isOnAnvil && userSword.unsoldQuantity === qty) {
        await tx.user.update({
          where: { id: userId },
          data: { anvilSwordLevel: null },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldToAdd } },
      });

      await tx.swordSellHistory.create({
        data: {
          userId,
          swordLevelDefinitionId: swordDefId,
          quantity: qty,
          priceGold: goldToAdd,
          soldAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.swordSold"),
      goldAdded: goldToAdd,
      quantitySold: qty,
    });
  } catch (err: any) {
    console.error("sellSword error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 12) Sell Material
export const sellMaterial = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { materialId, quantity } = req.body;

    if (!materialId || !quantity) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordLevelAndQuantityRequired"),
      });
    }

    const matId = BigInt(materialId);
    const qty = Number(quantity);

    if (qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.quantityMustBePositiveInteger"),
      });
    }

    await userGuard(userId);

    const userMaterial = await prisma.userMaterial.findUnique({
      where: { userId_materialId: { userId, materialId: matId } },
      include: {
        material: { select: { sellingCost: true, isSellingAllow: true } },
      },
    });

    if (!userMaterial) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.youDoNotOwnThisMaterial"),
      });
    }

    if (!userMaterial.material.isSellingAllow) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.materialSellingNotAllowed"),
      });
    }

    if (userMaterial.unsoldQuantity < qty) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.insufficientUnsoldQuantity", {
          count: userMaterial.unsoldQuantity,
        }),
      });
    }

    const goldToAdd = userMaterial.material.sellingCost * qty;

    await prisma.$transaction(async (tx) => {
      await tx.userMaterial.update({
        where: { userId_materialId: { userId, materialId: matId } },
        data: {
          unsoldQuantity: { decrement: qty },
          soldedQuantity: { increment: qty },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldToAdd } },
      });

      await tx.materialSellHistory.create({
        data: {
          userId,
          materialId: matId,
          quantity: qty,
          priceGold: goldToAdd,
          soldAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.materialSold"),
      goldAdded: goldToAdd,
      quantitySold: qty,
    });
  } catch (err: any) {
    console.error("sell material error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 13) Set Sword on Anvil
export const setSwordOnAnvil = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body;

    if (!swordId || isNaN(Number(swordId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordLevelAndQuantityRequired"), // Better to create "swordIdRequired" later
      });
    }

    const swordDefId = BigInt(swordId);
    const user = await userGuard(userId);

    const userSword = await prisma.userSword.findUnique({
      where: { userId_swordId: { userId, swordId: swordDefId } },
      select: { unsoldQuantity: true, isOnAnvil: true },
    });

    if (!userSword) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.youDoNotOwnThisSword"),
      });
    }

    if (userSword.isOnAnvil) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordAlreadyOnAnvil"),
      });
    }

    if (userSword.unsoldQuantity < 1) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.noUnsoldSwordForAnvil"),
      });
    }

    await prisma.$transaction(async (tx) => {
      if (user.anvilSwordLevel) {
        await tx.userSword.update({
          where: { userId_swordId: { userId, swordId: user.anvilSwordLevel } },
          data: { isOnAnvil: false },
        });
      }

      await tx.userSword.update({
        where: { userId_swordId: { userId, swordId: swordDefId } },
        data: { isOnAnvil: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { anvilSwordLevel: swordDefId },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.swordOnAnvil"),
    });
  } catch (err: any) {
    console.error("setSwordOnAnvil error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 14) Remove Sword from Anvil
export const removeSwordFromAnvil = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const user = await userGuard(userId);

    if (!user.anvilSwordLevel) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.noSwordOnAnvil"),
      });
    }

    const userSword = await prisma.userSword.findUnique({
      where: { userId_swordId: { userId, swordId: user.anvilSwordLevel } },
      select: { isOnAnvil: true },
    });

    if (!userSword || !userSword.isOnAnvil) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordNotOnAnvil"),
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userSword.update({
        where: { userId_swordId: { userId, swordId: user.anvilSwordLevel! } },
        data: { isOnAnvil: false },
      });

      await tx.user.update({
        where: { id: userId },
        data: { anvilSwordLevel: null },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.swordRemovedFromAnvil"),
      swordLevel: user.anvilSwordLevel.toString(),
    });
  } catch (err: any) {
    console.error("removeSwordFromAnvil error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 14) Upgrade Sword (with shield protection, 4 cases, random byproduct on break + history record)
export const upgradeSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body; // swordId here means swordLevelDefinitionId (level)

    if (!swordId || isNaN(Number(swordId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordLevelAndQuantityRequired"),
      });
    }

    const currentLevelId = BigInt(swordId);

    // User guard
    const user = await userGuard(userId);

    // Fetch current sword level ownership
    const currentSword = await prisma.userSword.findUnique({
      where: {
        userId_swordId: { userId, swordId: currentLevelId },
      },
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
    if (!currentSword) {
      return res.status(404).json({
        success: false,
        error: req.t("userAction.error.youDoNotOwnThisSword"),
      });
    }

    if (currentSword.unsoldQuantity < 1) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.needAtLeastOneUnsoldSword"),
      });
    }

    if (!currentSword.isOnAnvil) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordMustBeOnAnvil"),
      });
    }

    // Max level check
    if (currentSword.swordLevelDefinition.level >= 100) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordAtMaxLevel"),
      });
    }

    const upgradeCost = currentSword.swordLevelDefinition.upgradeCost;
    if (user.gold < upgradeCost) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.insufficientGoldForUpgrade"),
      });
    }

    const successRate = currentSword.swordLevelDefinition.successRate / 100;
    const randomChance = Math.random();

    let result: any = {};
    let historyData: any = {
      userId,
      fromSwordLevelId: currentSword.swordLevelDefinition.id,
      success: false,
      goldSpent: upgradeCost,
    };

    const nextLevel = currentSword.swordLevelDefinition.level + 1;
    const nextDef = await prisma.swordLevelDefinition.findUnique({
      where: { level: nextLevel },
      select: { id: true },
    });

    if (!nextDef) {
      throw new Error(req.t("userAction.error.nextLevelNotDefined"));
    }

    await prisma.$transaction(async (tx: any) => {
      // Always deduct cost
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: upgradeCost } },
      });

      // Success case
      if (randomChance <= successRate) {
        if (user.isShieldOn) {
          if (user.totalShields < 1) {
            throw new Error(req.t("userAction.error.noShieldProtection"));
          }
          await tx.user.update({
            where: { id: userId },
            data: { totalShields: { decrement: 1 } },
          });
        }

        // Consume 1 from current level
        await tx.userSword.update({
          where: { userId_swordId: { userId, swordId: currentLevelId } },
          data: { unsoldQuantity: { decrement: 1 } },
        });

        // Add 1 to next level (upsert)
        await tx.userSword.upsert({
          where: { userId_swordId: { userId, swordId: BigInt(nextDef.id) } },
          update: { unsoldQuantity: { increment: 1 } },
          create: {
            userId,
            swordId: BigInt(nextDef.id),
            isOnAnvil: false,
            unsoldQuantity: 1,
            soldedQuantity: 0,
            brokenQuantity: 0,
          },
        });

        // Always move anvil to the next level after success
        // 1. Clear old anvil status (previous level)
        await tx.userSword.update({
          where: { userId_swordId: { userId, swordId: currentLevelId } },
          data: { isOnAnvil: false },
        });

        // 2. Set anvil to next level
        await tx.user.update({
          where: { id: userId },
          data: { anvilSwordLevel: BigInt(nextDef.id) },
        });

        await tx.userSword.update({
          where: { userId_swordId: { userId, swordId: BigInt(nextDef.id) } },
          data: { isOnAnvil: true },
        });

        historyData.toSwordLevelId = nextDef.id;
        historyData.success = true;

        result = {
          type: "success",
          message: req.t("userAction.success.upgradeSuccess", {
            level: nextLevel,
          }),
          newLevel: nextLevel,
        };
      }
      // Failure case
      else {
        if (user.isShieldOn) {
          // Shield protects → consume shield, no damage
          if (user.totalShields < 1) {
            throw new Error(req.t("userAction.error.noShieldProtection"));
          }
          await tx.user.update({
            where: { id: userId },
            data: { totalShields: { decrement: 1 } },
          });

          result = {
            type: "protected_failure",
            message: req.t("userAction.success.upgradeProtected"),
            shieldConsumed: true,
            swordBroken: false,
          };
        } else {
          // Decrease unsold, increase broken
          await tx.userSword.update({
            where: { userId_swordId: { userId, swordId: currentLevelId } },
            data: {
              unsoldQuantity: { decrement: 1 },
              brokenQuantity: { increment: 1 },
            },
          });

          // If this was the last unsold and on anvil → clear anvil
          const updated = await tx.userSword.findUnique({
            where: { userId_swordId: { userId, swordId: currentLevelId } },
            select: { unsoldQuantity: true },
          });

          if (updated?.unsoldQuantity === 0) {
            await tx.user.update({
              where: { id: userId },
              data: { anvilSwordLevel: null },
            });
            await tx.userSword.update({
              where: { userId_swordId: { userId, swordId: currentLevelId } },
              data: {
                isOnAnvil: false,
              },
            });
          }

          // Give random byproduct (same as before)
          const drops = await tx.swordUpgradeDrop.findMany({
            where: {
              swordLevelDefinitionId: currentSword.swordLevelDefinition.id,
            },
            select: {
              materialId: true,
              dropPercentage: true,
              minQuantity: true,
              maxQuantity: true,
            },
          });

          if (drops.length === 0) {
            throw new Error(req.t("userAction.success.noDropMaterialsFound"));
          }

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

          const qty =
            Math.floor(
              Math.random() *
                (selectedDrop.maxQuantity - selectedDrop.minQuantity + 1),
            ) + selectedDrop.minQuantity;

          let byproduct = null;

          if (qty > 0) {
            // Give material to user
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
          }

          historyData.droppedMaterialId = selectedDrop.materialId;
          historyData.droppedQuantity = qty;

          result = {
            type: "broken_failure",
            message: req.t("userAction.success.upgradeFailedBroken", {
              byproduct:
                qty > 0
                  ? req.t("userAction.success.upgradeFailedBrokenWithByproduct")
                  : req.t("userAction.success.upgradeFailedBrokenNoByproduct"),
            }),
            swordBroken: true,
            shieldConsumed: false,
            byproduct,
          };
        }
      }

      // Always record history
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
    console.error("upgradeSword error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 15) Sword Synthesis (Consume exact required materials, guarantee 1 new sword + record history)
// 15) Sword Synthesis
export const synthesizeSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordLevelDefinitionId } = req.body;

    if (!swordLevelDefinitionId || isNaN(Number(swordLevelDefinitionId))) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.swordLevelAndQuantityRequired"), // You can add a more specific key later
      });
    }

    const targetLevelId = BigInt(swordLevelDefinitionId);

    const user = await userGuard(userId);

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
        error: req.t("userAction.error.swordNotFound"), // Reusing sword not found is acceptable, or add "targetSwordNotFound"
      });
    }

    if (!targetLevel.isSynthesizeAllow) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.synthesisNotAllowed"),
      });
    }

    if (user.gold < targetLevel.synthesizeCost) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.insufficientGoldForSynthesis", {
          required: targetLevel.synthesizeCost,
          have: user.gold,
        }),
      });
    }

    const requiredMaterials = await prisma.swordSynthesisRequirement.findMany({
      where: { swordLevelDefinitionId: targetLevelId },
      include: {
        material: { select: { id: true, name: true } },
      },
    });

    if (requiredMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.noSynthesisRequirements"),
      });
    }

    // Check material quantities
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
          error: req.t("userAction.error.insufficientMaterial", {
            material: reqMat.material.name,
            required: reqMat.requiredQuantity,
            have: userMat?.unsoldQuantity ?? 0,
          }),
        });
      }
    }

    let historyRecord;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: targetLevel.synthesizeCost } },
      });

      for (const reqMat of requiredMaterials) {
        await tx.userMaterial.update({
          where: {
            userId_materialId: { userId, materialId: reqMat.materialId },
          },
          data: { unsoldQuantity: { decrement: reqMat.requiredQuantity } },
        });
      }

      await tx.userSword.upsert({
        where: {
          userId_swordId: { userId, swordId: targetLevel.id },
        },
        update: { unsoldQuantity: { increment: 1 } },
        create: {
          userId,
          swordId: targetLevel.id,
          isOnAnvil: false,
          unsoldQuantity: 1,
          soldedQuantity: 0,
          brokenQuantity: 0,
        },
      });

      historyRecord = await tx.swordSynthesisHistory.create({
        data: {
          userId,
          swordLevelDefinitionId: targetLevel.id,
          goldSpent: targetLevel.synthesizeCost,
        },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.synthesisSuccess", {
        level: targetLevel.level,
      }),
      history: serializeBigInt(historyRecord),
    });
  } catch (err: any) {
    console.error("synthesizeSword error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 16) Claim Gift
export const claimGift = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { giftId } = req.body;

    if (!giftId) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.giftIdRequired"),
      });
    }

    await prisma.$transaction(async (tx) => {
      const gift = await tx.userGift.findUnique({
        where: { id: BigInt(giftId) },
        include: {
          material: true,
          swordLevelDefinition: true,
        },
      });

      if (!gift) throw new Error(req.t("userAction.error.giftNotFound"));
      if (gift.receiverId !== userId)
        throw new Error(req.t("userAction.error.notYourGift"));
      if (gift.status === GiftStatus.CLAIMED)
        throw new Error(req.t("userAction.error.giftAlreadyClaimed"));
      if (gift.status === GiftStatus.CANCELLED)
        throw new Error(req.t("userAction.error.giftCancelled"));

      switch (gift.type) {
        case GiftItemType.GOLD:
          if (gift.amount && gift.amount > 0) {
            await tx.user.update({
              where: { id: userId },
              data: { gold: { increment: gift.amount } },
            });
          }
          break;

        case GiftItemType.SHIELD:
          if (gift.amount && gift.amount > 0) {
            await tx.user.update({
              where: { id: userId },
              data: { totalShields: { increment: gift.amount } },
            });
          }
          break;

        case GiftItemType.MATERIAL:
          if (
            gift.materialId &&
            gift.materialQuantity &&
            gift.materialQuantity > 0
          ) {
            await tx.userMaterial.upsert({
              where: {
                userId_materialId: { userId, materialId: gift.materialId },
              },
              update: { unsoldQuantity: { increment: gift.materialQuantity } },
              create: {
                userId,
                materialId: gift.materialId,
                unsoldQuantity: gift.materialQuantity,
                soldedQuantity: 0,
              },
            });
          }
          break;

        case GiftItemType.SWORD:
          if (gift.swordId && gift.swordQuantity && gift.swordQuantity > 0) {
            const def = await tx.swordLevelDefinition.findUnique({
              where: { level: Number(gift.swordId) },
            });

            if (!def) throw new Error(req.t("userAction.error.swordNotFound"));

            await tx.userSword.upsert({
              where: {
                userId_swordId: { userId, swordId: BigInt(gift.swordId) },
              },
              update: { unsoldQuantity: { increment: gift.swordQuantity } },
              create: {
                userId,
                swordId: BigInt(gift.swordId),
                isOnAnvil: false,
                unsoldQuantity: gift.swordQuantity,
                soldedQuantity: 0,
                brokenQuantity: 0,
              },
            });
          }
          break;

        default:
          throw new Error(req.t("userAction.error.unsupportedGiftType"));
      }

      await tx.userGift.update({
        where: { id: BigInt(giftId) },
        data: {
          status: GiftStatus.CLAIMED,
          claimedAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.giftClaimed"),
    });
  } catch (err: any) {
    console.error("Claim gift Error: ", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 17) Toggle Shield Protection
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
      message: req.t("userAction.success.shieldToggled"),
    });
  } catch (err: any) {
    console.error("Toggle shield protection Error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 18) Create Ad Session
export const createAdSession = async (req: UserAuthRequest, res: Response) => {
  try {
    const { rewardType } = req.body as { rewardType: AdRewardType };
    const userId = BigInt(req.user.userId);

    if (!["GOLD", "OLD_SWORD", "SHIELD"].includes(rewardType)) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.invalidRewardType"),
      });
    }

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!config || !user) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.configNotFound"),
      });
    }

    // Global 1-hour cooldown
    if (user.lastAdViewedAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (user.lastAdViewedAt > oneHourAgo) {
        const timeLeftMs =
          user.lastAdViewedAt.getTime() + 60 * 60 * 1000 - Date.now();
        const minutesLeft = Math.ceil(timeLeftMs / 1000 / 60);

        return res.status(429).json({
          success: false,
          error: req.t("userAction.error.adCooldown", {
            minutes: minutesLeft,
            plural: minutesLeft > 1 ? "s" : "",
          }),
        });
      }
    }

    if (rewardType === AdRewardType.SHIELD) {
      if (user.oneDayShieldAdsViewed >= config.maxDailyShieldAds) {
        return res.status(400).json({
          success: false,
          error: req.t("userAction.error.dailyShieldLimitReached"),
        });
      }
      if (user.totalShields >= config.maxShieldHold) {
        return res.status(400).json({
          success: false,
          error: req.t("userAction.error.maxShieldsHeld"),
        });
      }
    } else if (rewardType === AdRewardType.GOLD) {
      if (user.oneDayGoldAdsViewed >= config.maxDailyGoldAds) {
        return res.status(400).json({
          success: false,
          error: req.t("userAction.error.dailyGoldLimitReached"),
        });
      }
    } else if (rewardType === AdRewardType.OLD_SWORD) {
      if (user.oneDaySwordAdsViewed >= config.maxDailySwordAds) {
        return res.status(400).json({
          success: false,
          error: req.t("userAction.error.dailySwordLimitReached"),
        });
      }
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    await prisma.adRewardSession.create({
      data: { userId, nonce, rewardType, rewarded: false },
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.adSessionCreated"),
      nonce,
      userId: userId.toString(),
    });
  } catch (err: any) {
    console.error("Create ad session Error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 19) Verify / Claim Ad Reward
export const verifyAdSession = async (req: UserAuthRequest, res: Response) => {
  try {
    const { nonce } = req.body;
    const userId = BigInt(req.user.userId);

    // Cleanup expired sessions
    await prisma.adRewardSession.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
    });

    const session = await prisma.adRewardSession.findUnique({
      where: { nonce },
    });

    if (
      !session ||
      session.userId !== userId ||
      session.rewarded !== true ||
      session.rewardedAt !== null
    ) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.invalidOrUnverifiedSession"),
      });
    }

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
    });
    if (!config) {
      return res.status(400).json({
        success: false,
        error: req.t("userAction.error.configNotFound"),
      });
    }

    // Grant reward (logic remains same)
    switch (session.rewardType) {
      case AdRewardType.GOLD:
        await prisma.user.update({
          where: { id: userId },
          data: {
            gold: { increment: config.goldReward },
            oneDayGoldAdsViewed: { increment: 1 },
            totalAdsViewed: { increment: 1 },
            lastAdViewedAt: new Date(),
          },
        });
        break;

      case AdRewardType.OLD_SWORD:
        const swordDef = await prisma.swordLevelDefinition.findUnique({
          where: { level: config.swordLevelReward },
        });
        if (!swordDef) {
          throw new Error(req.t("userAction.error.swordDefinitionNotFound"));
        }

        await prisma.userSword.upsert({
          where: { userId_swordId: { userId, swordId: BigInt(swordDef.id) } },
          update: { unsoldQuantity: { increment: 1 } },
          create: {
            userId,
            swordId: BigInt(swordDef.id),
            isOnAnvil: false,
            unsoldQuantity: 1,
            soldedQuantity: 0,
            brokenQuantity: 0,
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: {
            oneDaySwordAdsViewed: { increment: 1 },
            totalAdsViewed: { increment: 1 },
            lastAdViewedAt: new Date(),
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
            lastAdViewedAt: new Date(),
          },
        });
        break;
    }

    await prisma.adRewardSession.delete({ where: { nonce } });

    return res.json({
      success: true,
      message: req.t("userAction.success.adRewardClaimed"),
      rewardType: session.rewardType,
    });
  } catch (err: any) {
    console.error("verifyAdSession Error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
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
        error: req.t("userAction.error.missionIdRequired"),
      });
    }

    const missionIdBig = BigInt(missionId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch mission definition
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
        throw new Error(req.t("userAction.error.missionNotFound"));
      }

      if (!mission.isActive) {
        throw new Error(req.t("userAction.error.missionNotActive"));
      }

      // 2. Validate "completeAllAds" condition and get adType
      let adType: string | undefined;

      try {
        const conditions = mission.conditions as any[];

        if (!Array.isArray(conditions) || conditions.length === 0) {
          throw new Error(
            req.t("userAction.error.invalidMissionConfiguration"),
          );
        }

        const adCondition = conditions.find(
          (c) => c?.type === "completeAllAds" && c?.adType,
        );

        if (!adCondition) {
          throw new Error(
            req.t("userAction.error.invalidMissionConfiguration"),
          );
        }

        adType = adCondition.adType;

        if (!["GOLD", "SHIELD", "OLD_SWORD"].includes(adType!)) {
          throw new Error(
            req.t("userAction.error.invalidMissionConfiguration"),
          );
        }
      } catch (parseErr) {
        console.error("Condition parse error:", parseErr, {
          missionId,
          conditions: mission.conditions,
        });
        throw new Error(req.t("userAction.error.invalidMissionConfiguration"));
      }

      // 3. Fetch user ad views + admin config
      const [userData, config] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: {
            oneDayGoldAdsViewed: true,
            oneDayShieldAdsViewed: true,
            oneDaySwordAdsViewed: true,
          },
        }),
        tx.adminConfig.findUnique({
          where: { id: BigInt(1) },
          select: {
            maxDailyGoldAds: true,
            maxDailyShieldAds: true,
            maxDailySwordAds: true,
          },
        }),
      ]);

      if (!userData) throw new Error(req.t("userAction.error.missionNotFound")); // Generic fallback
      if (!config) throw new Error(req.t("userAction.error.configNotFound"));

      // 4. Check if already claimed today
      const progress = await tx.userDailyMissionProgress.findUnique({
        where: {
          userId_missionId: { userId, missionId: missionIdBig },
        },
      });

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      if (
        progress?.lastClaimedAt &&
        new Date(progress.lastClaimedAt) >= todayStart
      ) {
        throw new Error(req.t("userAction.error.missionAlreadyClaimedToday"));
      }

      // 5. Validate ad completion
      let eligible = false;

      switch (adType) {
        case "GOLD":
          eligible = userData.oneDayGoldAdsViewed >= config.maxDailyGoldAds;
          break;
        case "SHIELD":
          eligible = userData.oneDayShieldAdsViewed >= config.maxDailyShieldAds;
          break;
        case "OLD_SWORD":
          eligible = userData.oneDaySwordAdsViewed >= config.maxDailySwordAds;
          break;
      }

      if (!eligible) {
        throw new Error(req.t("userAction.error.missionNotCompleted"));
      }

      // 6. Grant reward
      const reward = mission.reward as any;
      let rewardMessage = "";

      switch (reward?.type) {
        case "gold":
          if (typeof reward.amount !== "number" || reward.amount <= 0) {
            throw new Error(
              req.t("userAction.error.invalidMissionConfiguration"),
            );
          }
          await tx.user.update({
            where: { id: userId },
            data: { gold: { increment: reward.amount } },
          });
          rewardMessage = `${reward.amount} gold`;
          break;

        case "trustPoints":
          if (typeof reward.amount !== "number" || reward.amount <= 0) {
            throw new Error(
              req.t("userAction.error.invalidMissionConfiguration"),
            );
          }
          await tx.user.update({
            where: { id: userId },
            data: { trustPoints: { increment: reward.amount } },
          });
          rewardMessage = `${reward.amount} trust points`;
          break;

        case "shield":
          if (typeof reward.quantity !== "number" || reward.quantity <= 0) {
            throw new Error(
              req.t("userAction.error.invalidMissionConfiguration"),
            );
          }
          await tx.user.update({
            where: { id: userId },
            data: { totalShields: { increment: reward.quantity } },
          });
          rewardMessage = `${reward.quantity} shield${reward.quantity > 1 ? "s" : ""}`;
          break;

        case "sword":
          if (
            typeof reward.level !== "number" ||
            reward.level < 1 ||
            typeof reward.quantity !== "number" ||
            reward.quantity < 1
          ) {
            throw new Error(
              req.t("userAction.error.invalidMissionConfiguration"),
            );
          }

          const swordDef = await tx.swordLevelDefinition.findUnique({
            where: { level: reward.level },
          });

          if (!swordDef) {
            throw new Error(req.t("userAction.error.swordDefinitionNotFound"));
          }

          await tx.userSword.upsert({
            where: {
              userId_swordId: { userId, swordId: swordDef.id },
            },
            update: {
              unsoldQuantity: { increment: reward.quantity },
            },
            create: {
              userId,
              swordId: swordDef.id,
              isOnAnvil: false,
              unsoldQuantity: reward.quantity,
              soldedQuantity: 0,
              brokenQuantity: 0,
            },
          });

          rewardMessage = `${reward.quantity} × ${swordDef.name} (Lv ${reward.level})`;
          break;

        case "material":
          if (
            typeof reward.materialId !== "number" ||
            typeof reward.quantity !== "number" ||
            reward.quantity <= 0
          ) {
            throw new Error(
              req.t("userAction.error.invalidMissionConfiguration"),
            );
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

          rewardMessage = `${reward.quantity} × material ID ${reward.materialId}`;
          break;

        default:
          throw new Error(
            req.t("userAction.error.invalidMissionConfiguration"),
          );
      }

      // 7. Update user mission counter
      await tx.user.update({
        where: { id: userId },
        data: {
          totalMissionsDone: { increment: 1 },
        },
      });

      // 8. Record / update progress
      if (progress) {
        await tx.userDailyMissionProgress.update({
          where: { userId_missionId: { userId, missionId: missionIdBig } },
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

      return {
        success: true,
        message: req.t("userAction.success.dailyMissionClaimed", {
          reward: rewardMessage,
        }),
      };
    });

    return res.json(result);
  } catch (err: any) {
    console.error("claimDailyMission error:", {
      userId: req.user?.userId,
      missionId: req.body?.missionId,
      error: err.message,
      stack: err.stack,
    });

    const status =
      err.message?.includes("not found") ||
      err.message?.includes("already claimed") ||
      err.message?.includes("Invalid")
        ? 400
        : 500;

    return res.status(status).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

// 21) One-Time Mission Claim
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
        error: req.t("userAction.error.missionIdRequired"),
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Fetch mission
      const mission = await tx.oneTimeMissionDefinition.findUnique({
        where: { id: BigInt(missionId) },
      });

      if (!mission || !mission.isActive) {
        throw new Error(req.t("userAction.error.missionNotActive"));
      }

      const now = new Date();

      // 2. Check time window
      if (mission.startAt > now) {
        throw new Error(req.t("userAction.error.missionNotStarted"));
      }

      if (mission.expiresAt && mission.expiresAt < now) {
        throw new Error(req.t("userAction.error.missionExpired"));
      }

      // 3. Check already claimed
      const existing = await tx.userOneTimeMissionProgress.findUnique({
        where: {
          userId_missionId: {
            userId,
            missionId: BigInt(missionId),
          },
        },
      });

      if (existing) {
        throw new Error(req.t("userAction.error.oneTimeMissionAlreadyClaimed"));
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

          case "upgradeSword": {
            const count = await tx.swordUpgradeHistory.count({
              where: {
                userId,
                createdAt: dateFilter,
                ...(cond.level && {
                  toSwordLevelDefinition: {
                    level: cond.level,
                  },
                }),
              },
            });

            totalProgress += count;
            break;
          }

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
            throw new Error(
              req.t("userAction.error.invalidMissionConfiguration"),
            );
        }
      }

      // 4. Check completion
      if (totalProgress < targetValue) {
        throw new Error(
          req.t("userAction.error.missionNotCompletedProgress", {
            progress: totalProgress,
            target: targetValue,
          }),
        );
      }

      // 5. Grant reward
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

          if (!def)
            throw new Error(req.t("userAction.error.swordDefinitionNotFound"));

          await tx.userSword.upsert({
            where: {
              userId_swordId: { userId, swordId: BigInt(reward.level) },
            },
            update: {
              unsoldQuantity: { increment: 1 },
            },
            create: {
              userId,
              swordId: BigInt(reward.level),
              isOnAnvil: false,
              unsoldQuantity: 1,
              soldedQuantity: 0,
              brokenQuantity: 0,
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
          throw new Error(
            req.t("userAction.error.invalidMissionConfiguration"),
          );
      }

      // 6. Update user mission counter
      await tx.user.update({
        where: { id: userId },
        data: {
          totalMissionsDone: { increment: 1 },
        },
      });

      // 7. Mark claimed
      await tx.userOneTimeMissionProgress.create({
        data: {
          userId,
          missionId: BigInt(missionId),
          claimedAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: req.t("userAction.success.oneTimeMissionClaimed"),
    });
  } catch (err: any) {
    console.error("Claim one-time mission error:", err);
    return res.status(400).json({
      success: false,
      error: err.message || req.t("userAction.error.internalServerError"),
    });
  }
};

export const markNotificationsAsRead = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    await prisma.user.update({
      where: { id: userId },
      data: { lastNotificationReadTime: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: req.t("userAction.success.notificationsMarkedRead"),
    });
  } catch (err: any) {
    console.error("markNotificationsAsRead error:", err);
    return res.status(500).json({
      success: false,
      error: req.t("userAction.error.internalServerError"),
    });
  }
};
