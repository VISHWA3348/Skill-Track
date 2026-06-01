console.log("BOOTING SERVER...");
import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import { registerGlobalCrashHandlers } from "./server/error_monitor";
import { apiRateLimiter } from "./server/middleware";

// Initialize process crash/promise monitoring immediately at startup
registerGlobalCrashHandlers();

// SQLite DB API setup
import { setupApi } from "./server/api";
import { setupAdmin } from "./server/admin";
import { setupAdvancedFeatures } from "./server/advanced_features";
import { setupHODFeatures } from "./server/hod_features";
import { setupCollegeAdminEnhancements } from "./server/college_admin_enhancements";
import { setupSuperAdminApi } from "./server/superadmin_api";
import { setupAcademicFeatures } from "./server/academic_features";
import { setupResumeFeatures } from "./server/resume_features";
import { setupAiApi } from "./server/ai_api";
import { setupInviteCodesApi } from "./server/invite_codes_api";

async function startServer() {
  const app = express();
  const PORT = 5000;

  // Security Headers Middleware (Helmet manual implementation)
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

  // Phase 6: Response compression (Brotli/GZIP) — reduces payloads 60-80%
  app.use(compression({
    level: 6,                  // balanced speed vs compression ratio
    threshold: 1024,           // only compress responses > 1KB
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
      // Allow requests with no origin (e.g. server-to-server or non-browser local requests)
      if (!origin) return callback(null, true);
      
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  // General middleware
  app.use(express.json({ limit: '50mb' })); // Support large JSON bodies
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API rate limiter
  app.use('/api', apiRateLimiter);

  // Setup Routes
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
        hmr: { port: 3001 } // Explicit HMR port to avoid conflicts
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Phase 12: Aggressive caching for hashed assets, no-cache for HTML
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          // HTML must always revalidate — never cache
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|ico|webp)$/.test(filePath)) {
          // Vite adds content hashes to all JS/CSS/asset filenames
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler (JSON for /api, HTML for others)
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
