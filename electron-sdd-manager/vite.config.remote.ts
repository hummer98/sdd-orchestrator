/**
 * Vite configuration for Remote UI
 *
 * This configuration builds the React-based Remote UI as a standalone web application.
 * The output is served as static files by remoteAccessServer.ts.
 *
 * Key differences from main Electron vite.config.ts:
 * - No Electron plugins (pure browser target)
 * - Separate output directory (dist/remote-ui)
 * - Independent entry point (src/remote-ui/index.html)
 * - Tailwind CSS 4 integration
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // Root directory for Remote UI source files
  root: 'src/remote-ui',

  // Base path for static file serving
  base: '/',

  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@remote-ui': resolve(__dirname, 'src/remote-ui'),
      '@renderer': resolve(__dirname, 'src/renderer'),
    },
  },

  // Environment variable prefix for client-side access
  envPrefix: ['VITE_'],

  build: {
    // Output to dist/remote-ui for static file serving
    outDir: resolve(__dirname, 'dist/remote-ui'),

    // Generate source maps for debugging
    sourcemap: true,

    // Clear output directory before build
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/remote-ui/index.html'),
      },
      output: {
        // Asset naming for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Target modern browsers only
    target: 'esnext',

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },

  // Development server configuration (for standalone development)
  server: {
    port: 5174, // Different from main Vite dev server (5173)
    strictPort: false,
    open: false,
  },

  // CSS configuration
  css: {
    // PostCSS is configured via postcss.config.js
    devSourcemap: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
  },
});
