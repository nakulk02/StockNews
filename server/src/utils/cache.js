import Redis from "ioredis";
import loggerInit from "./logger.js";

const logger = loggerInit();

/**
 * Optional Redis cache. Without REDIS_URL, or when Redis is unreachable,
 * every call falls through to the loader, so caching never breaks a request.
 */
let client = null;
if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
  client.on("error", (err) => logger.warn(`Redis error: ${err.message}`));
}

export const cacheEnabled = () => client !== null && client.status === "ready";

/**
 * Return the cached JSON value for `key`, or call `loader()`, cache its result
 * for `ttlSeconds` and return it. Returns { value, cached, ms }.
 */
export async function cached(key, ttlSeconds, loader) {
  const start = Date.now();
  if (cacheEnabled()) {
    try {
      const hit = await client.get(key);
      if (hit !== null) return { value: JSON.parse(hit), cached: true, ms: Date.now() - start };
    } catch (err) {
      logger.warn(`Redis get failed for ${key}: ${err.message}`);
    }
  }
  const value = await loader();
  if (cacheEnabled() && value !== undefined) {
    try {
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err) {
      logger.warn(`Redis set failed for ${key}: ${err.message}`);
    }
  }
  return { value, cached: false, ms: Date.now() - start };
}
