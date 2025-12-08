import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, path.resolve('.'), '');
    
    // Safely get API Key from various possible naming conventions (Vercel, Local, etc.)
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || "";

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Explicitly define process.env.API_KEY for the client-side code
        // This injects the key value at build time
        'process.env.API_KEY': JSON.stringify(apiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false
      }
    };
});