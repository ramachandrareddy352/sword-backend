import { createClient } from "redis";
export const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.on("connect", () => {
    console.log("✅ Redis connected");
});
redisClient.on("error", (err) => {
    console.error("❌ Redis error", err);
});
export async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}
// ---------- BASIC OPS ----------
export async function setValue(key, value, ttl) {
    if (ttl) {
        await redisClient.set(key, value, { EX: ttl });
    }
    else {
        await redisClient.set(key, value);
    }
}
export async function getValue(key) {
    return await redisClient.get(key);
}
export async function deleteValue(key) {
    await redisClient.del(key);
}
// ---------- GAME-SPECIFIC OPS ----------
// Atomic counter (ads, attempts, etc.)
export async function increment(key, ttl) {
    const count = await redisClient.incr(key);
    if (count === 1 && ttl) {
        await redisClient.expire(key, ttl);
    }
    return count;
}
// Set only if not exists (cooldowns, locks)
export async function setOnce(key, value, ttl) {
    return await redisClient.set(key, value, {
        EX: ttl,
        NX: true,
    });
}
export default redisClient;
//# sourceMappingURL=redis.js.map