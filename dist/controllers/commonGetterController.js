"use strict";
// controllers/notificationController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllNotifications = void 0;
const client_1 = __importDefault(require("../database/client"));
const queryHelpers_1 = require("../services/queryHelpers");
const serializeBigInt_1 = require("../services/serializeBigInt");
const getAllNotifications = async (req, res) => {
    try {
        // Pagination from query params (page, limit)
        const pagination = (0, queryHelpers_1.getPagination)(req.query);
        if (!pagination) {
            return res.status(400).json({
                success: false,
                error: "Invalid pagination parameters",
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
        const [notifications, total] = await client_1.default.$transaction([
            client_1.default.notification.findMany({
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
            client_1.default.notification.count(),
        ]);
        return res.status(200).json({
            success: true,
            message: notifications.length
                ? "Notifications fetched successfully"
                : "No notifications found",
            data: (0, serializeBigInt_1.serializeBigInt)(notifications),
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
            error: "Internal server error",
        });
    }
};
exports.getAllNotifications = getAllNotifications;
//# sourceMappingURL=commonGetterController.js.map