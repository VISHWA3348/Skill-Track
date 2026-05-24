console.log("BOOTING SERVER...");
import express from "express";
import path from "path";
import cors from "cors";

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

async function startServer() {
  const app = express();
  const PORT = 5000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Support large JSON bodies
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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
