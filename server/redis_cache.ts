import { type Redis as RedisClientType } from 'ioredis';
import { redis } from '../src/config/redis';

let redisClient: RedisClientType | null = null;
let useRedis = false;

// Memory Cache Fallback (only for local development/testing)
const memoryCache = new Map<string, { value: any; expiry: number }>();

const initRedis = async () => {
  if (process.env.REDIS_ONLINE === 'false') {
    console.log("ℹ️ Running in development/test mode. Falling back to local cache.");
    useRedis = false;
    return;
  }

  try {
    redisClient = redis;

    redisClient.on('error', (err) => {
      console.error("❌ Redis client connection error:", err.message);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        useRedis = false;
      }
    });

    if (redisClient.status === 'ready' || redisClient.status === 'connect') {
      useRedis = true;
    }

    redisClient.on('connect', () => {
      useRedis = true;
    });

    // Verify connection by pinging
    await redisClient.ping();
    useRedis = true;
  } catch (error: any) {
    console.error("❌ Redis connection failed:", error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log("ℹ️ Running in development/test mode. Falling back to local cache.");
      useRedis = false;
    }
  }
};

// Initialize connection
initRedis();

export const cacheService = {
  async get<T = any>(key: string): Promise<T | null> {
    if (useRedis && redisClient) {
      try {
        const cached = await redisClient.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      } catch (err: any) {
        console.error(`❌ Redis GET error for key ${key}:`, err.message);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    const entry = memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiry) {
        return entry.value as T;
      }
      memoryCache.delete(key);
    }
    return null;
  },

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (useRedis && redisClient) {
      try {
        const serialized = JSON.stringify(value);
        await redisClient.setex(key, ttlSeconds, serialized);
        return;
      } catch (err: any) {
        console.error(`❌ Redis SET error for key ${key}:`, err.message);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  },

  async del(key: string): Promise<void> {
    if (useRedis && redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (err: any) {
        console.error(`❌ Redis DEL error for key ${key}:`, err.message);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    memoryCache.delete(key);
  },

  async clearPattern(pattern: string): Promise<void> {
    if (useRedis && redisClient) {
      try {
        let cursor = '0';
        do {
          const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = reply[0];
          const keys = reply[1];
          if (keys.length > 0) {
            await redisClient.del(...keys);
          }
        } while (cursor !== '0');
        return;
      } catch (err: any) {
        console.error(`❌ Redis clearPattern error for pattern ${pattern}:`, err.message);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    for (const key of memoryCache.keys()) {
      if (key.startsWith(pattern.replace('*', ''))) {
        memoryCache.delete(key);
      }
    }
  },

  clearAll(): void {
    memoryCache.clear();
    console.log("🧹 In-memory cache cleared.");
  }
};
