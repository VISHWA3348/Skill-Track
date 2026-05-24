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
