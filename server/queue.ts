import { cacheService } from './redis_cache';

type JobHandler = (data: any) => Promise<any>;

const handlers = new Map<string, JobHandler>();
const inMemoryQueue: Array<{ id: string; type: string; data: any; retries: number }> = [];
let isProcessingInMemory = false;

// BullMQ lazy load references
let BullQueue: any = null;
let BullWorker: any = null;
let bullQueueInstance: any = null;
let useBull = false;

const initBullMQ = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("ℹ️ BullMQ not initialized (no REDIS_URL). Using high-performance in-memory async queue.");
    startInMemoryWorker();
    return;
  }

  try {
    const bullmq = await import('bullmq');
    BullQueue = bullmq.Queue;
    BullWorker = bullmq.Worker;

    // Connect to Redis for BullMQ
    const { default: Redis } = await import('ioredis');
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

    bullQueueInstance = new BullQueue('skill-track-jobs', { connection });
    
    // Initialize BullMQ Worker
    new BullWorker('skill-track-jobs', async (job) => {
      const handler = handlers.get(job.name);
      if (handler) {
        const result = await handler(job.data);
        if (result !== undefined) {
          await cacheService.set(`job:result:${job.id}`, result, 120); // Keep results for 120s
        }
        return result;
      }
      throw new Error(`No handler registered for job type: ${job.name}`);
    }, { connection, concurrency: 5 });

    useBull = true;
    console.log("⚡ BullMQ background worker queue initialized successfully.");
  } catch (err: any) {
    console.warn("⚠️ Failed to initialize BullMQ, falling back to in-memory async queue.", err.message);
    useBull = false;
    startInMemoryWorker();
  }
};

// Start the background loop for the in-memory queue fallback
const startInMemoryWorker = () => {
  if (isProcessingInMemory) return;
  isProcessingInMemory = true;

  const processNext = async () => {
    if (inMemoryQueue.length === 0) {
      setTimeout(processNext, 500); // Poll every 500ms when idle
      return;
    }

    const job = inMemoryQueue.shift();
    if (!job) {
      setImmediate(processNext);
      return;
    }

    const handler = handlers.get(job.type);
    if (!handler) {
      console.error(`❌ No handler registered for job type: ${job.type}`);
      setImmediate(processNext);
      return;
    }

    try {
      const result = await handler(job.data);
      if (result !== undefined) {
        await cacheService.set(`job:result:${job.id}`, result, 120); // Keep results for 120s
      }
    } catch (err: any) {
      console.error(`❌ Background job ${job.id} failed:`, err.message);
      if (job.retries > 0) {
        job.retries--;
        // Exponential backoff retry
        setTimeout(() => {
          inMemoryQueue.push(job);
        }, 2000);
      }
    }

    setImmediate(processNext);
  };

  setImmediate(processNext);
};

// Initialize BullMQ on boot
initBullMQ();

export const queueService = {
  /**
   * Registers a callback handler for a specific type of background job.
   */
  registerHandler(type: string, handler: JobHandler): void {
    handlers.set(type, handler);
    console.log(`📌 Registered background job handler for: ${type}`);
  },

  /**
   * Enqueues a job for asynchronous execution.
   */
  async addJob(type: string, data: any): Promise<string> {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (useBull && bullQueueInstance) {
      try {
        const job = await bullQueueInstance.add(type, data, {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        });
        return job.id || jobId;
      } catch (err: any) {
        console.warn("⚠️ BullMQ addJob failed, falling back to in-memory queue:", err.message);
      }
    }

    // In-memory fallback queue
    inMemoryQueue.push({
      id: jobId,
      type,
      data,
      retries: 3
    });
    return jobId;
  },

  /**
   * Waits for a job to complete and return its cached result.
   */
  async waitForJobResult(jobId: string, timeoutMs: number = 30000): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await cacheService.get(`job:result:${jobId}`);
      if (result !== null) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
    }
    throw new Error("Job execution timeout");
  }
};
