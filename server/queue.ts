import { cacheService } from './redis_cache';
import { redis } from '../src/config/redis';

type JobHandler = (data: any) => Promise<any>;

const handlers = new Map<string, JobHandler>();
const inMemoryQueue: Array<{ id: string; type: string; data: any; retries: number }> = [];
let isProcessingInMemory = false;

// BullMQ references
let BullQueue: any = null;
let BullWorker: any = null;
let useBull = false;

const queues: Record<string, any> = {};
const workers: any[] = [];

const jobTypeToQueueMap: Record<string, string> = {
  'send-broadcast-notification': 'Notification Queue',
  'generate-resume-pdf': 'Resume Processing Queue',
  'ai-analysis': 'Background Task Queue',
  'export-excel': 'Background Task Queue',
  'email': 'Email Queue',
  'notification': 'Notification Queue',
  'certificate': 'Certificate Processing Queue',
  'resume': 'Resume Processing Queue',
  'background': 'Background Task Queue'
};

const initBullMQ = async () => {
  if (process.env.REDIS_ONLINE === 'false') {
    console.log("ℹ️ Running in development/test mode. Falling back to in-memory queue.");
    useBull = false;
    startInMemoryWorker();
    return;
  }

  try {
    const bullmq = await import('bullmq');
    BullQueue = bullmq.Queue;
    BullWorker = bullmq.Worker;

    // Connect to Redis for BullMQ
    const connection = redis;
    
    connection.on('error', (err) => {
      console.error("❌ BullMQ Redis connection error:", err.message);
    });

    // Test the connection first to fail fast if unavailable
    await connection.ping();

    const queueNames = [
      'Email Queue',
      'Notification Queue',
      'Certificate Processing Queue',
      'Resume Processing Queue',
      'Background Task Queue'
    ];

    for (const qName of queueNames) {
      queues[qName] = new BullQueue(qName, { connection });

      const worker = new BullWorker(qName, async (job) => {
        const handler = handlers.get(job.name);
        if (handler) {
          try {
            const result = await handler(job.data);
            await cacheService.set(`job:result:${job.id}`, { status: 'completed', result }, 120);
            return result;
          } catch (err: any) {
            await cacheService.set(`job:result:${job.id}`, { status: 'failed', error: err.message || 'Job execution failed' }, 120);
            throw err;
          }
        }
        throw new Error(`No handler registered for job type: ${job.name}`);
      }, { connection, concurrency: 5 });

      workers.push(worker);
    }

    console.log("✅ Workers Registered");
    useBull = true;
  } catch (err: any) {
    console.error("❌ Failed to initialize BullMQ:", err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log("ℹ️ Running in development/test mode. Falling back to in-memory queue.");
      useBull = false;
      startInMemoryWorker();
    }
  }
};

// Start the background loop for the in-memory queue fallback
const startInMemoryWorker = () => {
  if (isProcessingInMemory) return;
  isProcessingInMemory = true;

  const processNext = async () => {
    if (inMemoryQueue.length === 0) {
      setTimeout(processNext, 500);
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
      await cacheService.set(`job:result:${job.id}`, { status: 'completed', result }, 120);
    } catch (err: any) {
      console.error(`❌ Background job ${job.id} failed:`, err.message);
      if (job.retries > 0) {
        job.retries--;
        setTimeout(() => {
          inMemoryQueue.push(job);
        }, 2000);
      } else {
        await cacheService.set(`job:result:${job.id}`, { status: 'failed', error: err.message || 'Job execution failed' }, 120);
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
    const qName = jobTypeToQueueMap[type] || 'Background Task Queue';
    const queue = queues[qName];

    if (useBull && queue) {
      const job = await queue.add(type, data, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      });
      return job.id || jobId;
    }

    // In-memory fallback queue for development
    inMemoryQueue.push({
      id: jobId,
      type,
      data,
      retries: 3
    });
    return jobId;
  },

  async waitForJobResult(jobId: string, timeoutMs: number = 30000): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const entry = await cacheService.get(`job:result:${jobId}`);
      if (entry !== null) {
        if (entry && typeof entry === 'object' && entry.status === 'completed') {
          return entry.result;
        }
        if (entry && typeof entry === 'object' && entry.status === 'failed') {
          throw new Error(entry.error || "Job execution failed");
        }
        return entry;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Job execution timeout");
  }
};
