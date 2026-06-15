import type { Response } from "express";
import prisma from "../database/client.js";
import { AdminRole } from "@prisma/client";
import type { AdminAuthRequest } from "../middleware/adminAuth.js";
import { serializeBigInt } from "../services/serializeBigInt.js";
import redis from "../config/redis.js";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 1) Create a normal admin (VIEWER or EDITOR)
export async function createAdmin(req: AdminAuthRequest, res: Response) {
  try {
    const { email, role } = req.body;

    if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
      return res
        .status(400)
        .json({ success: false, error: "Valid email is required" });
    }

    if (!role || !Object.values(AdminRole).includes(role)) {
      return res.status(400).json({
        success: false,
        error: `role must be one of: ${Object.values(AdminRole).join(", ")}`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Cannot create an admin equal to the super admin email
    const config = await prisma.adminConfig.findUnique({
      where: { id: 1n },
      select: { adminEmailId: true },
    });
    if (config && config.adminEmailId.toLowerCase() === normalizedEmail) {
      return res.status(400).json({
        success: false,
        error:
          "This email is the super admin and cannot be added as a normal admin",
      });
    }

    const existing = await prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res
        .status(409)
        .json({
          success: false,
          error: "Admin with this email already exists",
        });
    }

    const created = await prisma.admin.create({
      data: { email: normalizedEmail, role },
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: serializeBigInt(created),
    });
  } catch (err) {
    console.error("createAdmin error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create admin" });
  }
}

// 2) Update a normal admin's role (VIEWER <-> EDITOR) or active status
export async function updateAdmin(req: AdminAuthRequest, res: Response) {
  try {
    const { id, email, role, isActive } = req.body;

    if (!id && !email) {
      return res
        .status(400)
        .json({ success: false, error: "Provide admin id or email" });
    }

    if (role !== undefined && !Object.values(AdminRole).includes(role)) {
      return res.status(400).json({
        success: false,
        error: `role must be one of: ${Object.values(AdminRole).join(", ")}`,
      });
    }

    const where: any = id
      ? { id: BigInt(id) }
      : { email: (email as string).trim().toLowerCase() };

    const existing = await prisma.admin.findUnique({ where });
    if (!existing) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No valid fields to update" });
    }

    const updated = await prisma.admin.update({
      where: { id: existing.id },
      data: updateData,
    });

    // If role changed or admin deactivated, revoke their active sessions
    await revokeAdminSessions(existing.email);

    return res.json({
      success: true,
      message:
        "Admin updated successfully. Their active sessions were revoked.",
      data: serializeBigInt(updated),
    });
  } catch (err) {
    console.error("updateAdmin error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update admin" });
  }
}

// 3) Remove (delete) a normal admin
export async function removeAdmin(req: AdminAuthRequest, res: Response) {
  try {
    const { id, email } = req.body;

    if (!id && !email) {
      return res
        .status(400)
        .json({ success: false, error: "Provide admin id or email" });
    }

    const where: any = id
      ? { id: BigInt(id) }
      : { email: (email as string).trim().toLowerCase() };

    const existing = await prisma.admin.findUnique({ where });
    if (!existing) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    await prisma.admin.delete({ where: { id: existing.id } });

    // Kill any active sessions for the removed admin
    await revokeAdminSessions(existing.email);

    return res.json({
      success: true,
      message: "Admin removed successfully",
    });
  } catch (err) {
    console.error("removeAdmin error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to remove admin" });
  }
}

// 4) List all normal admins
export async function getAllAdmins(req: AdminAuthRequest, res: Response) {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      success: true,
      message: "Admins fetched successfully",
      data: serializeBigInt(admins),
    });
  } catch (err) {
    console.error("getAllAdmins error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch admins" });
  }
}

// Helper: revoke all active Redis sessions belonging to an email
async function revokeAdminSessions(email: string) {
  try {
    const keys = await redis.keys("admin:session:*");
    for (const key of keys) {
      const val = await redis.get(key);
      if (!val) continue;
      try {
        const parsed = JSON.parse(val);
        if (parsed.email === email) {
          await redis.del(key);
        }
      } catch {
        // legacy plain-string session — skip
      }
    }
  } catch (err) {
    console.error("revokeAdminSessions error:", err);
  }
}
