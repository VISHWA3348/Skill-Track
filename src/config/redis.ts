import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is missing in environment");
}

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,   // REQUIRED FOR BULLMQ
  enableReadyCheck: false,      // REQUIRED FOR VALKEY (Render Redis)
  lazyConnect: process.env.NODE_ENV !== 'production', // Don't auto-connect in dev/test
});
