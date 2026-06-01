import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@/': resolve(__dirname, 'src') + '/',
        'firebase/app': resolve(__dirname, 'src/api/app.ts'),
        'firebase/auth': resolve(__dirname, 'src/api/auth.ts'),
        'firebase/firestore': resolve(__dirname, 'src/api/firestore.ts'),
        'firebase/storage': resolve(__dirname, 'src/api/storage.ts'),
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:5000',
        '/uploads': 'http://localhost:5000',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/data/**', '**/uploads/**']
      }
    },
    // Phase 11: Production build optimizations
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Vendor chunk splitting — libraries cached independently of app code
          manualChunks: (id) => {
            // React core — tiny, changes rarely
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'vendor-react';
            }
            // React Router
            if (id.includes('node_modules/react-router')) {
              return 'vendor-router';
            }
            // Recharts is large (~500KB) — isolate it
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) {
              return 'vendor-charts';
            }
            // Framer/Motion animations
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            // PDF / QR / image generators (split individually due to size)
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable')) {
              return 'vendor-jspdf';
            }
            if (id.includes('node_modules/pdfkit') || id.includes('node_modules/fontkit') || id.includes('node_modules/linebreak')) {
              return 'vendor-pdfkit';
            }
            if (id.includes('node_modules/exceljs')) {
              return 'vendor-excel';
            }
            if (id.includes('node_modules/xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('node_modules/qrcode') || id.includes('node_modules/react-qr')) {
              return 'vendor-qr';
            }
            if (id.includes('node_modules/html2canvas')) {
              return 'vendor-html2canvas';
            }
            // Image processing
            if (id.includes('node_modules/cropperjs') || id.includes('node_modules/react-cropper') || id.includes('node_modules/exifr')) {
              return 'vendor-image';
            }
            // Markdown rendering
            if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/unified')) {
              return 'vendor-markdown';
            }
            // UI utilities (small, keep together)
            if (
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/date-fns')
            ) {
              return 'vendor-ui';
            }
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
        'react-qr-code',
        'recharts',
        'motion',
        'date-fns',
        'clsx',
        'tailwind-merge'
      ],
    },
  };
});
