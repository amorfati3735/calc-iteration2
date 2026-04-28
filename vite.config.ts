import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Split big vendor chunks so the home/login screen
        // doesn't have to wait for firebase to download.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase/database') || id.includes('@firebase/database')) return 'fb-db';
            if (id.includes('firebase/auth') || id.includes('@firebase/auth')) return 'fb-auth';
            if (id.includes('firebase') || id.includes('@firebase')) return 'fb-core';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('react-dom')) return 'react-dom';
            if (id.includes('/react/')) return 'react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    headers: {
      // Long-cache local fonts during dev for parity with prod
      'Cache-Control': 'public, max-age=3600',
    },
  },
});
