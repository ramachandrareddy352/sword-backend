"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.connectRedis = connectRedis;
exports.setValue = setValue;
exports.getValue = getValue;
exports.deleteValue = deleteValue;
exports.increment = increment;
exports.setOnce = setOnce;
const redis_1 = require("redis");
exports.redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});
exports.redisClient.on("connect", () => {
    console.log("✅ Redis connected");
});
exports.redisClient.on("error", (err) => {
    console.error("❌ Redis error", err);
});
async function connectRedis() {
    if (!exports.redisClient.isOpen) {
        await exports.redisClient.connect();
    }
}
// ---------- BASIC OPS ----------
async function setValue(key, value, ttl) {
    if (ttl) {
        await exports.redisClient.set(key, value, { EX: ttl });
    }
    else {
        await exports.redisClient.set(key, value);
    }
}
async function getValue(key) {
    return await exports.redisClient.get(key);
}
async function deleteValue(key) {
    await exports.redisClient.del(key);
}
// ---------- GAME-SPECIFIC OPS ----------
// Atomic counter (ads, attempts, etc.)
async function increment(key, ttl) {
    const count = await exports.redisClient.incr(key);
    if (count === 1 && ttl) {
        await exports.redisClient.expire(key, ttl);
    }
    return count;
}
// Set only if not exists (cooldowns, locks)
async function setOnce(key, value, ttl) {
    return await exports.redisClient.set(key, value, {
        EX: ttl,
        NX: true,
    });
}
exports.default = exports.redisClient;
//# sourceMappingURL=redis.js.map