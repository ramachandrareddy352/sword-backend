"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDailyAdCountersIfNeeded = resetDailyAdCountersIfNeeded;
const client_1 = __importDefault(require("../database/client"));
async function resetDailyAdCountersIfNeeded(userId) {
    const user = await client_1.default.user.findUnique({
        where: { id: userId },
        select: {
            lastReviewed: true,
        },
    });
    if (!user)
        return;
    const now = new Date();
    const lastReset = new Date(user.lastReviewed);
    const isDifferentDay = now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
        now.getUTCMonth() !== lastReset.getUTCMonth() ||
        now.getUTCDate() !== lastReset.getUTCDate();
    if (!isDifferentDay)
        return;
    await client_1.default.user.update({
        where: { id: userId },
        data: {
            oneDayGoldAdsViewed: 0,
            oneDayShieldAdsViewed: 0,
            oneDaySwordAdsViewed: 0,
            lastReviewed: now,
        },
    });
}
//# sourceMappingURL=dailyReset.js.map