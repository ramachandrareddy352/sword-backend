import { decodePayload, sendShoppingAck } from "../services/shoppingTool";
import type { Request, Response } from "express";
import prisma from "../database/client";
import { serializeBigInt } from "../services/serializeBigInt";
import { VoucherStatus } from "@prisma/client";

export async function redeemVoucherFromShopping(req: Request, res: Response) {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: "Missing payload" });
    }

    // decode request
    const decoded = decodePayload(data);

    const { email, voucherCode, expiry, nonce } = decoded;

    if (!email || !voucherCode || !expiry || !nonce) {
      return res.status(400).json({ success: false, error: "Invalid payload" });
    }

    // expiry check
    if (Date.now() > new Date(expiry).getTime()) {
      return res.status(400).json({
        success: false,
        error: "Request expired",
      });
    }

    const voucher = await prisma.userVoucher.findUnique({
      where: { code: voucherCode },
      include: {
        createdBy: true,
        allowedUser: true,
      },
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: "Voucher not found",
      });
    }

    if (voucher.status !== VoucherStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: "Voucher already used",
      });
    }

    // get user redeeming
    const redeemUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!redeemUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // permission check
    const isCreator = voucher.createdBy.email === email;
    const isAllowed =
      voucher.allowedUser && voucher.allowedUser.email === email;

    if (!isCreator && !isAllowed) {
      return res.status(403).json({
        success: false,
        error: "User not allowed to redeem this voucher",
      });
    }

    const config = await prisma.adminConfig.findUnique({
      where: { id: BigInt(1) },
    });

    if (!config?.exchangeRate || config?.exchangeRate <= 0) {
      return res.status(500).json({
        success: false,
        error: "Exchange rate not configured",
      });
    }

    const points = Math.floor(voucher.goldAmount / config.exchangeRate);
    if (points <= 0) {
      return res.status(500).json({
        success: false,
        error: "Point shoule be greater than 0",
      });
    }

    await prisma.$transaction(async (tx) => {
      // mark redeemed
      await tx.userVoucher.update({
        where: { id: voucher.id },
        data: {
          status: VoucherStatus.REDEEMED,
          redeemedById: redeemUser.id,
          updatedAt: new Date(),
        },
      });

      // send acknowledge to shopping backend
      await sendShoppingAck({
        success: true,
        points,
        nonce,
      });
    });

    return res.json({
      success: true,
      message: "Voucher redeemed successfully",
      data: serializeBigInt({
        email,
        voucherCode,
        points,
      }),
    });
  } catch (err: any) {
    console.error("redeemVoucherFromShopping error:", err);

    return res.status(500).json({
      success: false,
      error: err.message || "Voucher redemption failed",
    });
  }
}
