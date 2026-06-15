// controllers/notificationController.ts
import prisma from "../database/client.js";
import { getPagination } from "../services/queryHelpers.js";
import { serializeBigInt } from "../services/serializeBigInt.js";
export const getAllNotifications = async (req, res) => {
    try {
        // Pagination from query params (page, limit)
        const pagination = getPagination(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: req.t("commonGetter.error.invalidPaginationParameters"),
            });
        }
        // Optional: admin can pass extra filters if needed in future
        const { sortCreatedAt = "desc" } = req.query;
        // Build orderBy
        const orderBy = [];
        if (sortCreatedAt === "asc" || sortCreatedAt === "desc") {
            orderBy.push({ createdAt: sortCreatedAt });
        }
        else {
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
                ? req.t("commonGetter.success.notificationsFetched")
                : req.t("commonGetter.success.noNotificationsFound"),
            data: serializeBigInt(notifications),
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit),
        });
    }
    catch (err) {
        console.error("getAllNotifications error:", err);
        return res.status(500).json({
            success: false,
            error: req.t("commonGetter.error.internalServerError"),
        });
    }
};
//# sourceMappingURL=commonGetterController.js.map