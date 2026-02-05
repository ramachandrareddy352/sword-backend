import type { Response } from "express";
import prisma from "../database/client";
import type { UserAuthRequest } from "../middleware/userAuth";

// Get current user's rank across all leaderboard fields
export const getUserRank = async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user.userId);

    // Fetch current user to verify and get their values
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        gold: true,
        trustPoints: true,
        totalShields: true,
        totalAdsViewed: true,
        totalMissionsDone: true,
        createdAt: true,
        isBanned: true,
        swords: {
          where: { isSolded: false, isBroken: false },
          select: { id: true }, // just count
        },
        materials: {
          select: { unsoldQuantity: true },
        },
      },
    });

    if (!currentUser || currentUser.isBanned) {
      return res.status(404).json({
        success: false,
        error: "User not found or is banned",
      });
    }

    // Fetch all non-banned users for ranking
    const users = await prisma.user.findMany({
      where: { isBanned: false },
      select: {
        id: true,
        gold: true,
        trustPoints: true,
        totalShields: true,
        totalAdsViewed: true,
        totalMissionsDone: true,
        createdAt: true,
        swords: {
          where: { isSolded: false, isBroken: false },
          select: { id: true }, // just count
        },
        materials: {
          select: { unsoldQuantity: true },
        },
      },
    });

    // Compute leaderboard data (same logic as getLeaderboard)
    const leaderboardData = users.map((u) => ({
      userId: u.id.toString(),
      gold: Number(u.gold),
      trustPoints: u.trustPoints,
      totalShields: u.totalShields,
      totalAdsViewed: u.totalAdsViewed,
      totalMissionsDone: u.totalMissionsDone,
      totalSwords: u.swords.length,
      totalMaterials: u.materials.reduce((sum, m) => sum + m.unsoldQuantity, 0),
      createdAt: u.createdAt,
    }));

    // Valid fields (exactly matching your leaderboard)
    const rankFields = [
      "totalSwords",
      "totalMaterials",
      "totalShields",
      "gold",
      "trustPoints",
      "totalAdsViewed",
      "totalMissionsDone",
      "createdAt",
    ] as const;

    // Compute rank for each field
    const userRanks: Record<
      (typeof rankFields)[number],
      { rank: number; value: number | Date; totalUsers: number }
    > = {} as any;

    for (const field of rankFields) {
      // Sort descending (higher value = better rank), except createdAt (newer = better)
      leaderboardData.sort((a, b) => {
        if (field === "createdAt") {
          return b.createdAt.getTime() - a.createdAt.getTime(); // newer first
        }
        return (b[field] as number) - (a[field] as number); // higher number first
      });

      const rankIndex = leaderboardData.findIndex(
        (u) => u.userId === userId.toString(),
      );

      if (rankIndex === -1) {
        userRanks[field] = {
          rank: -1,
          value: 0,
          totalUsers: leaderboardData.length,
        };
      } else {
        userRanks[field] = {
          rank: rankIndex + 1, // 1-based rank
          value: leaderboardData[rankIndex][field],
          totalUsers: leaderboardData.length,
        };
      }
    }

    return res.json({
      success: true,
      message: "Your ranks across all leaderboard categories",
      userId: userId.toString(),
      ranks: userRanks,
    });
  } catch (err) {
    console.error("getUserRank error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};
