import { decodePayload, sendShoppingAck } from "../services/shoppingTool.js";
import type { Request, Response } from "express";
import prisma from "../database/client.js";
import { serializeBigInt } from "../services/serializeBigInt.js";
import { VoucherStatus } from "@prisma/client";

function resolveUserWhere(userId: string) {
  if (userId.startsWith("@")) {
    const telegramUser = userId.slice(1);
    if (!telegramUser) {
      throw new Error("invalidTelegramUsername");
    }
    return { telegramUser };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userId)) {
    throw new Error("invalidUserIdFormat");
  }

  return { email: userId };
}

export async function redeemVoucherFromShopping(req: Request, res: Response) {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: req.t("externalAction.error.missingPayload"),
      });
    }

    // Decode request
    const decoded = decodePayload(data);
    const { userId, voucherCode, expiry, nonce } = decoded;

    if (!userId || !voucherCode || !expiry || !nonce) {
      return res.status(400).json({
        success: false,
        error: req.t("externalAction.error.invalidPayload"),
      });
    }

    // Expiry check
    if (Date.now() > new Date(expiry).getTime()) {
      return res.status(400).json({
        success: false,
        error: req.t("externalAction.error.requestExpired"),
      });
    }

    const voucher = await prisma.userVoucher.findUnique({
      where: { code: voucherCode },
      include: {
        createdBy: { select: { id: true } },
        allowedUser: { select: { id: true } },
      },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: req.t("externalAction.error.voucherNotFound"),
      });
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: req.t("externalAction.error.voucherAlreadyUsed"),
      });
    }

    // Resolve and find redeeming user
    let redeemUser;
    try {
      const where = resolveUserWhere(userId);
      redeemUser = await prisma.user.findFirst({
        where,
        select: { id: true },
      });
    } catch (err: any) {
      const errorKey =
        err.message === "invalidTelegramUsername"
          ? "invalidTelegramUsername"
          : "invalidUserIdFormat";

      return res.status(400).json({
        success: false,
        error: req.t(`externalAction.error.${errorKey}`),
      });
    }

    if (!redeemUser) {
      return res.status(404).json({
        success: false,
        error: req.t("externalAction.error.userNotFound"),
      });
    }

    // Permission check
    const isCreator = voucher.createdById === redeemUser.id;
    const isAllowed =
      voucher.allowedUserId && voucher.allowedUserId === redeemUser.id;

    if (!isCreator && !isAllowed) {
      return res.status(403).json({
        success: false,
        error: req.t("externalAction.error.userNotAllowedToRedeem"),
      });
    }

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
    });

    if (!config?.exchangeRate || config.exchangeRate <= 0) {
      return res.status(500).json({
        success: false,
        error: req.t("externalAction.error.exchangeRateNotConfigured"),
      });
    }

    const points = Math.floor(voucher.goldAmount / config.exchangeRate);
    if (points <= 0) {
      return res.status(500).json({
        success: false,
        error: req.t("externalAction.error.pointsShouldBeGreaterThanZero"),
      });
    }

    await prisma.$transaction(async (tx) => {
      // Mark voucher as redeemed
      await tx.userVoucher.update({
        where: { id: voucher.id },
        data: {
          status: VoucherStatus.REDEEMED,
          redeemedById: redeemUser.id,
          updatedAt: new Date(),
        },
      });

      // Send acknowledgment to shopping backend
      await sendShoppingAck({
        success: true,
        points,
        nonce,
      });
    });

    return res.json({
      success: true,
      message: req.t("externalAction.success.voucherRedeemed"),
      data: serializeBigInt({
        userId,
        voucherCode,
        points,
      }),
    });
  } catch (err: any) {
    console.error("redeemVoucherFromShopping error:", err);

    return res.status(500).json({
      success: false,
      error:
        err.message || req.t("externalAction.error.voucherRedemptionFailed"),
    });
  }
}
