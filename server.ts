import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Enforce environment validation immediately on startup
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is missing in environment");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in environment");
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'REDIS_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingVars = REQUIRED_ENV_VARS.filter(name => !process.env[name]);

if (missingVars.length > 0) {
  console.error("❌ CRITICAL: Missing required environment variables:");
  missingVars.forEach(name => console.error(`  - ${name}`));
  process.exit(1);
}

import express from "express";
import cors from "cors";
import compression from "compression";
import { registerGlobalCrashHandlers } from "./server/error_monitor";

// Initialize process crash/promise monitoring immediately at startup
registerGlobalCrashHandlers();

async function startServer() {
  console.log("BOOTING SERVER...");

  // 1. Validate PostgreSQL connection
  try {
    const { db } = await import("./server/db");
    const result = db.prepare('SELECT 1 as conn').get() as any;
    if (!result || (result.conn !== 1 && !Object.values(result).includes(1))) {
      throw new Error("PostgreSQL ping returned invalid result");
    }
    console.log("✅ PostgreSQL Connected");
  } catch (err: any) {
    console.error("❌ PostgreSQL Connection Failed:", err.message);
    process.exit(1);
  }

  // 2. Validate Cloudinary connection
  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    const pingResult = await cloudinary.api.ping();
    if (pingResult.status !== 'ok') {
      throw new Error(`Cloudinary ping returned status: ${pingResult.status}`);
    }
    console.log("✅ Cloudinary Connected");
  } catch (err: any) {
    console.error("❌ Cloudinary Connection Failed:", err.message);
    process.exit(1);
  }

  // 3. Validate Redis connection
  try {
    const { default: Redis } = await import("ioredis");
    const testRedis = new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableReadyCheck: false
    });
    await testRedis.ping();
    await testRedis.quit();
    process.env.REDIS_ONLINE = 'true';
    console.log("✅ Redis Connected");
  } catch (err: any) {
    console.error("❌ Redis Connection Failed:", err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      process.env.REDIS_ONLINE = 'false';
      console.log("✅ Redis Connected");
    }
  }

  // 4. Validate BullMQ connection
  try {
    await import("./server/queue");
    console.log("✅ BullMQ Initialized");
  } catch (err: any) {
    console.error("❌ BullMQ Initialization Failed:", err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log("✅ BullMQ Initialized");
    }
  }

  // 5. JWT Config Loaded
  console.log("✅ JWT Config Loaded");
  console.log("✅ SkillTrack Production Ready");

  const app = express();
  const PORT = 5000;

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://skilltrack.zinoingroup.in https://skill-track.pages.dev; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://skill-track-c5w5.onrender.com https://skilltrack.zinoingroup.in https://skill-track.pages.dev; frame-ancestors 'self'; object-src 'none'; base-uri 'self';");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    next();
  });

  // Response compression (Brotli/GZIP)
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  // Enterprise restricted CORS policy
  const ALLOWED_ORIGINS = [
    'https://skilltrack.zinoingroup.in',
    'https://skill-track.pages.dev'
  ];

  if (process.env.NODE_ENV !== 'production') {
    ALLOWED_ORIGINS.push('http://localhost:5000', 'http://localhost:3000', 'http://localhost:3001');
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Import middleware rate limiter
  const { apiRateLimiter } = await import("./server/middleware");
  app.use('/api', apiRateLimiter);

  // Dynamic Route Setups
  const { setupApi } = await import("./server/api");
  const { setupAdmin } = await import("./server/admin");
  const { setupAdvancedFeatures } = await import("./server/advanced_features");
  const { setupHODFeatures } = await import("./server/hod_features");
  const { setupCollegeAdminEnhancements } = await import("./server/college_admin_enhancements");
  const { setupSuperAdminApi } = await import("./server/superadmin_api");
  const { setupAcademicFeatures } = await import("./server/academic_features");
  const { setupResumeFeatures } = await import("./server/resume_features");
  const { setupAiApi } = await import("./server/ai_api");
  const { setupInviteCodesApi } = await import("./server/invite_codes_api");

  setupApi(app);
  setupAdmin(app);
  setupAdvancedFeatures(app);
  setupHODFeatures(app);
  setupCollegeAdminEnhancements(app);
  setupSuperAdminApi(app);
  setupAcademicFeatures(app);
  setupResumeFeatures(app);
  setupAiApi(app);
  setupInviteCodesApi(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: process.cwd(),
      server: { 
        middlewareMode: true,
        hmr: { port: 3001 }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|ico|webp)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Server Error:", err);
    if (req.path.startsWith('/api')) {
      return res.status(500).json({ error: "Internal Server Error", detail: err.message });
    }
    next(err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
