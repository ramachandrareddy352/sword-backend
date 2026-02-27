// controllers/notificationController.ts

import prisma from "../database/client";
import { UserAuthRequest } from "../middleware/userAuth";
import { AdminAuthRequest } from "../middleware/adminAuth";
import { Response } from "express";
import { getPagination } from "../services/queryHelpers";
import { serializeBigInt } from "../services/serializeBigInt";

// Union type to accept both user and admin requests
type AuthRequest = UserAuthRequest | AdminAuthRequest;

export const getAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    // Pagination from query params (page, limit)
    const pagination = getPagination(req.query);
    if (!pagination) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination parameters",
      });
    }

    // Optional: admin can pass extra filters if needed in future
    const { sortCreatedAt = "desc" } = req.query;

    // Build orderBy
    const orderBy: any[] = [];
    if (sortCreatedAt === "asc" || sortCreatedAt === "desc") {
      orderBy.push({ createdAt: sortCreatedAt });
    } else {
      orderBy.push({ createdAt: "desc" }); // default newest first
    }

    // Fetch paginated list + total count in transaction
    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        select: {
          id: true,
          title: true,
          description: true,
          webLink: true,
          createdAt: true,
        },
      }),
      prisma.notification.count(),
    ]);

    return res.status(200).json({
      success: true,
      message: notifications.length
        ? "Notifications fetched successfully"
        : "No notifications found",
      data: serializeBigInt(notifications),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    });
  } catch (err: any) {
    console.error("getAllNotifications error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
