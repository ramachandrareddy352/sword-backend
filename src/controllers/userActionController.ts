import type { Response } from "express";
import prisma from "../database/client.ts";
import { generateSecureCode } from "../services/generateCode.ts";
import { handleUserError, userGuard } from "../services/queryHelpers.ts";
import type { UserAuthRequest } from "../middleware/userAuth.ts";
import { VoucherStatus, MarketplaceItemType } from "@prisma/client";
import type { MaterialType, ShieldType } from "@prisma/client";
import { serializeBigInt } from "../services/serializeBigInt.ts";

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
    handleUserError(err, res);
  }
};

// 2) Create Voucher
export const createVoucher = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { goldAmount } = req.body;

    const user = await userGuard(userId);

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
    });
    if (!config) {
      return res
        .status(400)
        .json({ success: false, error: "Admin config data not found" });
    }

    const amount = BigInt(goldAmount);
    if (amount < config.minVoucherGold || amount > config.maxVoucherGold) {
      return res.status(400).json({
        success: false,
        error: `Amount must be between ${config.minVoucherGold} and ${config.maxVoucherGold}`,
      });
    }

    if (user.gold < amount) {
      throw new Error("INSUFFICIENT_GOLD");
    }

    let code: string;
    let voucher;
    for (let attempt = 0; attempt < 10; attempt++) {
      code = generateSecureCode(12);
      try {
        voucher = await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { gold: { decrement: amount } },
          });

          return tx.userVoucher.create({
            data: {
              userId,
              code,
              goldAmount: amount,
              status: VoucherStatus.PENDING,
            },
          });
        });
        break;
      } catch (err: any) {
        if (err.code !== "P2002") throw err;
      }
    }

    if (!voucher) {
      return res
        .status(500)
        .json({ success: false, error: "Failed to generate unique code" });
    }

    return res.json({
      success: true,
      message: "Voucher created successfully",
      data: serializeBigInt(voucher),
    });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 3) Cancel Voucher
export const cancelVoucher = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { voucherId } = req.body;

    if (!voucherId)
      return res
        .status(400)
        .json({ success: false, error: "Voucher ID required" });

    await userGuard(userId);

    const voucher = await prisma.userVoucher.findUnique({
      where: { id: BigInt(voucherId) },
    });

    if (!voucher || voucher.userId !== userId) {
      return res
        .status(404)
        .json({ success: false, error: "Voucher not found" });
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "Only pending vouchers can be cancelled",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: voucher.goldAmount } },
      });

      await tx.userVoucher.update({
        where: { id: voucher.id },
        data: {
          status: VoucherStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    });

    return res.json({
      success: true,
      message: "Voucher cancelled, gold refunded",
    });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 4) Create Customer Support Complaint (No ban check)
export const createComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const {
      title,
      content,
      message,
      category = "OTHER",
      priority = "NORMAL",
    } = req.body;

    if (!title || title.length < 5) {
      return res
        .status(400)
        .json({ success: false, error: "Title must be at least 5 characters" });
    }
    if (!content || content.length < 5) {
      return res.status(400).json({
        success: false,
        error: "Content must be at least 5 characters",
      });
    }
    if (!message || message.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Message must be at least 10 characters",
      });
    }

    const complaint = await prisma.customerSupport.create({
      data: {
        userId,
        title,
        content,
        message,
        category,
        priority,
      },
    });

    return res.json({
      success: true,
      message: "Complaint submitted successfully",
      data: serializeBigInt(complaint),
    });
  } catch (err: any) {
    console.error("createComplaint error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 5) Update Complaint (only if not reviewed)
export const updateComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { complaintId, title, content, message } = req.body;

    if (!complaintId) {
      return res
        .status(400)
        .json({ success: false, error: "Complaint ID required" });
    }

    if (!title && !content && !message) {
      return res.status(400).json({
        success: false,
        error: "Provide at least one field to update",
      });
    }

    if (title && title.length < 5) {
      return res
        .status(400)
        .json({ success: false, error: "Title must be at least 5 characters" });
    }
    if (content && content.length < 5) {
      return res.status(400).json({
        success: false,
        error: "Content must be at least 5 characters",
      });
    }
    if (message && message.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Message must be at least 10 characters",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const complaint = await tx.customerSupport.findUnique({
        where: { id: BigInt(complaintId) },
      });

      if (!complaint) {
        return res
          .status(404)
          .json({ success: false, error: "Complaint not found" });
      }

      if (complaint.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "You can only update your own complaints",
        });
      }

      if (complaint.isReviewed) {
        return res
          .status(403)
          .json({ success: false, error: "Cannot update reviewed complaint" });
      }

      return tx.customerSupport.update({
        where: { id: complaint.id },
        data: {
          title: title ?? complaint.title,
          content: content ?? complaint.content,
          message: message ?? complaint.message,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          content: true,
          message: true,
          updatedAt: true,
        },
      });
    });

    return res.json({
      success: true,
      message: "Complaint updated successfully",
      complaint: serializeBigInt(updated),
    });
  } catch (err: any) {
    console.error("updateComplaint error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 6) Delete Complaint (only if not reviewed)
export const deleteComplaint = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { complaintId } = req.body;

    if (!complaintId) {
      return res
        .status(400)
        .json({ success: false, error: "Complaint ID required" });
    }

    await prisma.$transaction(async (tx) => {
      const complaint = await tx.customerSupport.findUnique({
        where: { id: BigInt(complaintId) },
      });

      if (!complaint) {
        return res
          .status(404)
          .json({ success: false, error: "Complaint not found" });
      }

      if (complaint.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "You can only delete your own complaints",
        });
      }

      if (complaint.isReviewed) {
        return res
          .status(403)
          .json({ success: false, error: "Cannot delete reviewed complaint" });
      }

      await tx.customerSupport.delete({
        where: { id: complaint.id },
      });
    });

    return res.json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (err: any) {
    console.error("deleteComplaint error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

// 7) Buy Marketplace Item
export const buyMarketplaceItem = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);
    const { marketplaceItemId } = req.body;

    if (!marketplaceItemId)
      return res
        .status(400)
        .json({ success: false, error: "Marketplace item ID required" });

    const user = await userGuard(userId);

    const item = await prisma.marketplaceItem.findUnique({
      where: { id: BigInt(marketplaceItemId) },
      include: {
        swordLevelDefinition: true,
        material: true,
        shieldType: true,
      },
    });

    if (!item || !item.isActive) {
      return res
        .status(400)
        .json({ success: false, error: "Item not available for purchase" });
    }
    if (item.isPurchased) {
      return res
        .status(400)
        .json({ success: false, error: "Item is already purchased" });
    }

    if (user.gold < item.priceGold) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient gold" });
    }

    await prisma.$transaction(async (tx) => {
      // Deduct gold
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: item.priceGold } },
      });

      // Mark as purchased
      await tx.marketplaceItem.update({
        where: { id: item.id },
        data: { isPurchased: true },
      });

      // Add to user inventory
      if (
        item.itemType === MarketplaceItemType.SWORD &&
        item.swordLevelDefinition
      ) {
        const swordCode = generateSecureCode(12);
        await tx.userSword.create({
          data: {
            code: swordCode,
            userId,
            level: item.swordLevelDefinition.level,
            isOnAnvil: false,
            swordLevelDefinitionId: item.swordLevelDefinition.id,
            isSolded: false,
          },
        });
      } else if (
        item.itemType === MarketplaceItemType.MATERIAL &&
        item.material
      ) {
        await tx.userMaterial.upsert({
          where: {
            userId_materialId: { userId, materialId: item.material.id },
          },
          update: { quantity: { increment: 1 } },
          create: {
            userId,
            materialId: item.material.id,
            quantity: 1,
            soldedQuantity: 0,
          },
        });
      } else if (
        item.itemType === MarketplaceItemType.SHIELD &&
        item.shieldType
      ) {
        await tx.userShield.upsert({
          where: { userId_shieldId: { userId, shieldId: item.shieldType.id } },
          update: { quantity: { increment: 1 } },
          create: {
            userId,
            shieldId: item.shieldType.id,
            quantity: 1,
            soldedQuantity: 0,
            isOnAnvil: false,
          },
        });
      }

      // Record purchase
      await tx.marketplacePurchase.create({
        data: {
          userId,
          marketplaceItemId: item.id,
          priceGold: item.priceGold,
        },
      });
    });

    return res.json({ success: true, message: "Item purchased successfully" });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 8) Sell Sword
export const sellSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body;

    if (!swordId)
      return res
        .status(400)
        .json({ success: false, error: "Sword ID required" });

    await userGuard(userId);

    const sword = await prisma.userSword.findUnique({
      where: { id: BigInt(swordId) },
      include: { swordLevelDefinition: true },
    });

    if (!sword || sword.userId !== userId) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or not valid user" });
    }
    if (sword.isSolded) {
      return res
        .status(400)
        .json({ success: false, error: "Sword already solded" });
    }

    const goldToAdd = sword.swordLevelDefinition.sellingCost;

    await prisma.$transaction(async (tx) => {
      if (sword.isOnAnvil) {
        await tx.user.update({
          where: { id: userId },
          data: { anvilSwordId: null },
        });
      }

      await tx.userSword.update({
        where: { id: sword.id },
        data: { isSolded: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldToAdd } },
      });
    });

    return res.json({
      success: true,
      message: "Sword solded successfully",
      goldAdded: goldToAdd.toString(),
    });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 9) Sell Material
export const sellMaterial = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { materialId, quantity = 1 } = req.body;

    if (!materialId || quantity <= 0)
      return res
        .status(400)
        .json({ success: false, error: "Invalid input data" });

    await userGuard(userId);

    const userMaterial = await prisma.userMaterial.findUnique({
      where: { userId_materialId: { userId, materialId: BigInt(materialId) } },
      include: { material: true },
    });

    if (!userMaterial || userMaterial.quantity < quantity) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient material quantity" });
    }

    const goldToAdd = userMaterial.material.cost * BigInt(quantity);

    await prisma.$transaction(async (tx) => {
      await tx.userMaterial.update({
        where: {
          userId_materialId: { userId, materialId: BigInt(materialId) },
        },
        data: {
          quantity: { decrement: quantity },
          soldedQuantity: { increment: quantity },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldToAdd } },
      });
    });

    return res.json({
      success: true,
      message: "Material sold successfully",
      goldAdded: goldToAdd.toString(),
    });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 10) Sell Shield
export const sellShield = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { shieldId, quantity = 1 } = req.body;

    if (!shieldId || quantity <= 0)
      return res.status(400).json({ success: false, error: "Invalid input" });

    const user = await userGuard(userId);

    const userShield = await prisma.userShield.findUnique({
      where: { userId_shieldId: { userId, shieldId: BigInt(shieldId) } },
      include: { shield: true },
    });

    if (!userShield || userShield.quantity < quantity) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient quantity" });
    }

    const goldToAdd = userShield.shield.cost * BigInt(quantity);

    await prisma.$transaction(async (tx) => {
      if (userShield.isOnAnvil) {
        await tx.user.update({
          where: { id: userId },
          data: {
            anvilShieldId:
              userShield.quantity === quantity ? null : user.anvilShieldId,
          },
        });
      }

      await tx.userShield.update({
        where: { userId_shieldId: { userId, shieldId: BigInt(shieldId) } },
        data: {
          quantity: { decrement: quantity },
          soldedQuantity: { increment: quantity },
          isOnAnvil:
            userShield.quantity === quantity ? false : userShield.isOnAnvil,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { gold: { increment: goldToAdd } },
      });
    });

    return res.json({
      success: true,
      message: "Shield sold successfully",
      goldAdded: goldToAdd.toString(),
    });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 11) Set Sword on Anvil
export const setSwordOnAnvil = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body;

    if (!swordId)
      return res
        .status(400)
        .json({ success: false, error: "Sword ID required" });

    const user = await userGuard(userId);

    const sword = await prisma.userSword.findUnique({
      where: { id: BigInt(swordId) },
    });

    if (!sword || sword.userId !== userId) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid sword user action" });
    }
    if (sword.isSolded) {
      return res
        .status(400)
        .json({ success: false, error: "Sword is already solded" });
    }

    await prisma.$transaction(async (tx) => {
      // Remove current anvil sword if exists
      if (user.anvilSwordId) {
        await tx.userSword.update({
          where: { id: user.anvilSwordId },
          data: { isOnAnvil: false },
        });
      }

      await tx.userSword.update({
        where: { id: sword.id },
        data: { isOnAnvil: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { anvilSwordId: sword.id },
      });
    });

    return res.json({ success: true, message: "Sword placed on anvil" });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 12) Remove Sword from Anvil (Put back to bag)
export const removeSwordFromAnvil = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const user = await userGuard(userId);

    if (!user.anvilSwordId) {
      return res
        .status(400)
        .json({ success: false, error: "No sword on anvil" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userSword.update({
        where: { id: user.anvilSwordId! },
        data: { isOnAnvil: false },
      });

      await tx.user.update({
        where: { id: userId },
        data: { anvilSwordId: null },
      });
    });

    return res.json({ success: true, message: "Sword removed from anvil" });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 13) Upgrade Sword
export const upgradeSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { swordId } = req.body;

    if (!swordId)
      return res
        .status(400)
        .json({ success: false, error: "Sword ID required" });

    const user = await userGuard(userId);

    const sword = await prisma.userSword.findUnique({
      where: { id: BigInt(swordId) },
      include: { swordLevelDefinition: true },
    });

    if (!sword || sword.userId !== userId) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid sword owner action" });
    }
    if (sword.isSolded) {
      return res
        .status(400)
        .json({ success: false, error: "Sword is already solded" });
    }
    if (!sword.isOnAnvil) {
      return res
        .status(400)
        .json({ success: false, error: "Sword should be on anvil to upgrade" });
    }

    const upgradeCost = sword.swordLevelDefinition.upgradeCost;
    if (user.gold < upgradeCost) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient gold for upgrade" });
    }

    // Check if max level reached (assuming max is 100)
    if (sword.level >= 100) {
      return res
        .status(400)
        .json({ success: false, error: "Sword is at maximum level" });
    }

    const successRate = sword.swordLevelDefinition.successRate;
    const success = Math.random() < successRate;

    let result: any;
    await prisma.$transaction(async (tx) => {
      // Deduct cost always
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: upgradeCost } },
      });

      if (success) {
        const nextLevel = sword.level + 1;
        const nextDef = await tx.swordLevelDefinition.findUnique({
          where: { level: nextLevel },
        });
        if (!nextDef) throw new Error("Next level not defined");

        await tx.userSword.update({
          where: { id: sword.id },
          data: {
            level: nextLevel,
            swordLevelDefinitionId: nextDef.id,
          },
        });

        result = {
          success: true,
          message: "Upgrade successful!",
          newLevel: nextLevel,
        };
      } else {
        // Fail: delete sword
        await tx.userSword.delete({ where: { id: sword.id } });

        // Random reward (material or shield)
        const materials = await tx.materialType.findMany({ take: 100 });
        const shields = await tx.shieldType.findMany({ take: 100 });

        if (materials.length === 0 && shields.length === 0) {
          throw new Error("No rewards available");
        }

        // Use discriminated union for proper type narrowing
        type RewardItem =
          | { kind: "material"; data: MaterialType }
          | { kind: "shield"; data: ShieldType };

        const rewards: RewardItem[] = [
          ...materials.map((m) => ({ kind: "material" as const, data: m })),
          ...shields.map((s) => ({ kind: "shield" as const, data: s })),
        ];

        const randomReward =
          rewards[Math.floor(Math.random() * rewards.length)];

        let rewardData: any;

        if (randomReward.kind === "material") {
          const mat = randomReward.data;
          await tx.userMaterial.upsert({
            where: { userId_materialId: { userId, materialId: mat.id } },
            update: { quantity: { increment: 1 } },
            create: {
              userId,
              materialId: mat.id,
              quantity: 1,
              soldedQuantity: 0,
            },
          });
          rewardData = { type: "material", ...mat };
        } else {
          const sh = randomReward.data;
          await tx.userShield.upsert({
            where: { userId_shieldId: { userId, shieldId: sh.id } },
            update: { quantity: { increment: 1 } },
            create: {
              userId,
              shieldId: sh.id,
              quantity: 1,
              soldedQuantity: 0,
              isOnAnvil: false,
            },
          });
          rewardData = { type: "shield", ...sh };
        }

        // Clear anvil
        await tx.user.update({
          where: { id: userId },
          data: { anvilSwordId: null },
        });

        result = {
          success: false,
          message: "Upgrade failed, sword destroyed. Received random reward.",
          reward: rewardData,
        };
      }
    });

    return res.json(result);
  } catch (err: any) {
    if (err.message === "Next level not defined") {
      return res.status(400).json({
        success: false,
        error: "Cannot upgrade beyond maximum level",
      });
    }
    if (err.message === "No rewards available") {
      return res.status(500).json({
        success: false,
        error: "No reward items available for failure",
      });
    }
    handleUserError(err, res);
  }
};

// 14) Sword Synthesis (Consume 1-4 items, guarantee 1 new sword)
export const synthesizeSword = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { itemIds } = req.body; // array of { type: "material"|"shield", id: bigint, quantity?: number }

    if (!Array.isArray(itemIds) || itemIds.length < 1 || itemIds.length > 4) {
      return res
        .status(400)
        .json({ success: false, error: "Provide 1-4 items" });
    }

    await userGuard(userId);

    const levelZero = await prisma.swordLevelDefinition.findUnique({
      where: { level: 0 },
    });
    if (!levelZero) throw new Error("Level 0 sword definition missing");

    const swordCode = generateSecureCode(12);
    let newSword;

    await prisma.$transaction(async (tx) => {
      // Consume items (pseudo - implement decrement for each)
      for (const item of itemIds) {
        if (item.type === "material") {
          await tx.userMaterial.update({
            where: {
              userId_materialId: { userId, materialId: BigInt(item.id) },
            },
            data: { quantity: { decrement: item.quantity || 1 } },
          });
        } else if (item.type === "shield") {
          await tx.userShield.update({
            where: { userId_shieldId: { userId, shieldId: BigInt(item.id) } },
            data: { quantity: { decrement: item.quantity || 1 } },
          });
        } else {
          return res.status(400).json({
            success: false,
            error: "Only material or shields are allowed to synthesis",
          });
        }
      }

      newSword = await tx.userSword.create({
        data: {
          code: swordCode,
          userId,
          level: 0,
          isOnAnvil: false,
          swordLevelDefinitionId: levelZero.id,
          isSolded: false,
        },
      });
    });

    return res.json({
      success: true,
      message: "Sword synthesized successfully",
      data: newSword,
    });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 15) Set Shield on Anvil
export const setShieldOnAnvil = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);
    const { shieldId } = req.body;

    if (!shieldId) {
      return res
        .status(400)
        .json({ success: false, error: "Shield ID required" });
    }

    const user = await userGuard(userId);

    const shield = await prisma.userShield.findUnique({
      where: { userId_shieldId: { userId, shieldId: BigInt(shieldId) } },
    });

    if (!shield || shield.quantity === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or no shield available" });
    }

    // You can only put on anvil if you have at least 1
    if (shield.quantity < 1) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient shield quantity" });
    }

    await prisma.$transaction(async (tx) => {
      // Remove current anvil shield if exists
      if (user.anvilShieldId) {
        await tx.userShield.update({
          where: { userId_shieldId: { userId, shieldId: user.anvilShieldId } },
          data: { isOnAnvil: false },
        });
      }

      // Set new shield on anvil
      await tx.userShield.update({
        where: { userId_shieldId: { userId, shieldId: BigInt(shieldId) } },
        data: { isOnAnvil: true },
      });

      // Update user anvil reference
      await tx.user.update({
        where: { id: userId },
        data: { anvilShieldId: BigInt(shieldId) },
      });
    });

    return res.json({ success: true, message: "Shield placed on anvil" });
  } catch (err: any) {
    handleUserError(err, res);
  }
};

// 16) Remove Shield from Anvil (Put back to inventory)
export const removeShieldFromAnvil = async (
  req: UserAuthRequest,
  res: Response,
) => {
  try {
    const userId = BigInt(req.user.userId);

    const user = await userGuard(userId);

    if (!user.anvilShieldId) {
      return res
        .status(400)
        .json({ success: false, error: "No shield on anvil" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userShield.update({
        where: { userId_shieldId: { userId, shieldId: user.anvilShieldId! } },
        data: { isOnAnvil: false },
      });

      await tx.user.update({
        where: { id: userId },
        data: { anvilShieldId: null },
      });
    });

    return res.json({ success: true, message: "Shield removed from anvil" });
  } catch (err: any) {
    handleUserError(err, res);
  }
};
