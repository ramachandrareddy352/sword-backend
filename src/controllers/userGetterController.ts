import type { Response } from "express";
import prisma from "../database/client.ts";
import type { UserAuthRequest } from "../middleware/userAuth.ts";

// 1) User Rank (authenticated, returns rank for a specific field)
export const getUserRank = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    // ── Safely extract and narrow 'field' to string ───────────────────────
    let field: string;

    const fieldRaw = req.query.field;

    if (typeof fieldRaw === "string" && fieldRaw.trim()) {
      field = fieldRaw.trim();
    } else if (Array.isArray(fieldRaw) && fieldRaw.length > 0) {
      // Take first value if frontend accidentally sent multiple (common bug)
      field = String(fieldRaw[0]).trim();
    } else {
      return res.status(400).json({
        success: false,
        error:
          "Field parameter must be a valid string (e.g. totalSwords, gold, totalPower)",
      });
    }

    // ── Validate field ────────────────────────────────────────────────────
    const validFields = [
      "totalSwords",
      "totalMaterials",
      "totalShields",
      "gold",
      "trustPoints",
      "totalPower",
    ] as const;

    if (!validFields.includes(field as any)) {
      return res.status(400).json({
        success: false,
        error: `Invalid field. Allowed: ${validFields.join(", ")}`,
      });
    }

    // ── Fetch users (unchanged) ───────────────────────────────────────────
    const users = await prisma.user.findMany({
      where: { isBanned: false },
      select: {
        id: true,
        gold: true,
        trustPoints: true,
        swords: {
          where: { isSolded: false },
          select: { swordLevelDefinition: { select: { power: true } } },
        },
        materials: {
          select: { quantity: true, material: { select: { power: true } } },
        },
        shields: {
          select: { quantity: true, shield: { select: { power: true } } },
        },
      },
    });

    // ── Compute ranked data (unchanged) ───────────────────────────────────
    const rankedData = users.map((u) => ({
      userId: u.id.toString(),
      gold: Number(u.gold),
      trustPoints: u.trustPoints,
      totalSwords: u.swords.length,
      totalMaterials: u.materials.reduce((sum, m) => sum + m.quantity, 0),
      totalShields: u.shields.reduce((sum, s) => sum + s.quantity, 0),
      totalPower:
        u.swords.reduce((sum, s) => sum + s.swordLevelDefinition.power, 0) +
        u.materials.reduce((sum, m) => sum + m.material.power * m.quantity, 0) +
        u.shields.reduce((sum, s) => sum + s.shield.power * s.quantity, 0),
    }));

    // ── Sort descending (higher is better) ────────────────────────────────
    rankedData.sort((a, b) => {
      // Now field is guaranteed to be string and one of the valid keys
      const valA = a[field as keyof typeof a] as number;
      const valB = b[field as keyof typeof a] as number;
      return valB - valA; // descending
    });

    // ── Find rank (1-based) ───────────────────────────────────────────────
    const rankIndex = rankedData.findIndex(
      (u) => u.userId === userId.toString(),
    );

    if (rankIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "User not found in leaderboard",
      });
    }

    const rank = rankIndex + 1;

    return res.json({
      success: true,
      field,
      rank,
      totalUsers: rankedData.length,
      userId: userId.toString(),
    });
  } catch (err) {
    console.error("getUserRank error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};
