import prisma from "../database/client";

export async function resetDailyAdCountersIfNeeded(userId: bigint) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastReviewed: true,
    },
  });

  if (!user) return;

  const now = new Date();
  const lastReset = new Date(user.lastReviewed);

  const isDifferentDay =
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate();

  if (!isDifferentDay) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      oneDayGoldAdsViewed: 0,
      oneDayShieldAdsViewed: 0,
      oneDaySwordAdsViewed: 0,
      lastReviewed: now,
    },
  });
}
