import { type Redis as RedisClientType } from 'ioredis';

let redisClient: RedisClientType | null = null;
let useRedis = false;

// High-performance in-memory fallback cache
const memoryCache = new Map<string, { value: any; expiry: number }>();

// Periodic cleanup of expired fallback memory cache entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now >= entry.expiry) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Try to initialize Redis connection if env variable is set
const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("ℹ️ REDIS_URL not configured. Using high-performance in-memory cache fallback.");
    return;
  }

  try {
    // Dynamic import to prevent crash if ioredis package is missing or failing to load
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true
    });

    redisClient.on('error', (err) => {
      console.warn("⚠️ Redis client connection error:", err.message);
      useRedis = false;
    });

    redisClient.on('connect', () => {
      console.log("⚡ Redis connection established successfully.");
      useRedis = true;
    });

    await redisClient.connect();
    useRedis = true;
  } catch (error: any) {
    console.warn("⚠️ Failed to load or connect to Redis. Falling back to in-memory cache.", error.message);
    useRedis = false;
  }
};

// Initialize connection asynchronously
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
        console.warn(`⚠️ Redis GET error for key ${key}:`, err.message);
      }
    }

    // Memory Cache Fallback
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
        console.warn(`⚠️ Redis SET error for key ${key}:`, err.message);
      }
    }

    // Memory Cache Fallback
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
        console.warn(`⚠️ Redis DEL error for key ${key}:`, err.message);
      }
    }

    // Memory Cache Fallback
    memoryCache.delete(key);
  },

  async clearPattern(pattern: string): Promise<void> {
    if (useRedis && redisClient) {
      try {
        // Safe scan and delete for high concurrency (avoiding blocking KEYS command)
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
        console.warn(`⚠️ Redis clearPattern error for pattern ${pattern}:`, err.message);
      }
    }

    // Memory Cache Fallback
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
