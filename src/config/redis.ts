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
export async function setValue(
    key: string,
    value: string,
    ttl?: number
) {
    if (ttl) {
        await redisClient.set(key, value, { EX: ttl });
    } else {
        await redisClient.set(key, value);
    }
}

export async function getValue(key: string) {
    return await redisClient.get(key);
}

export async function deleteValue(key: string) {
    await redisClient.del(key);
}

// ---------- GAME-SPECIFIC OPS ----------
// Atomic counter (ads, attempts, etc.)
export async function increment(
    key: string,
    ttl?: number
) {
    const count = await redisClient.incr(key);
    if (count === 1 && ttl) {
        await redisClient.expire(key, ttl);
    }
    return count;
}

// Set only if not exists (cooldowns, locks)
export async function setOnce(
    key: string,
    value: string,
    ttl: number
) {
    return await redisClient.set(key, value, {
        EX: ttl,
        NX: true,
    });
}

export default redisClient;
