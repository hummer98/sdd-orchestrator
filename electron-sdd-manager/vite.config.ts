import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';

/**
 * Copy remote-ui static files to dist directory
 */
function copyRemoteUI() {
  return {
    name: 'copy-remote-ui',
    closeBundle() {
      const srcDir = resolve(__dirname, 'src/main/remote-ui');
      const destDir = resolve(__dirname, 'dist/main/remote-ui');

      // Recursively copy directory
      const copyDir = (src: string, dest: string) => {
        mkdirSync(dest, { recursive: true });
        const entries = readdirSync(src);
        for (const entry of entries) {
          const srcPath = resolve(src, entry);
          const destPath = resolve(dest, entry);
          const stat = statSync(srcPath);
          if (stat.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
          }
        }
      };

      try {
        copyDir(srcDir, destDir);
        console.log('[copy-remote-ui] Static files copied to dist/main/remote-ui');
      } catch (error) {
        console.warn('[copy-remote-ui] Could not copy remote-ui files:', error);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(options) {
          // Enable remote debugging for Electron MCP integration
          options.startup(['.', '--remote-debugging-port=9222']);
        },
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
          plugins: [copyRemoteUI()],
        },
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/main'),
      '@preload': resolve(__dirname, 'src/preload'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@remote-ui': resolve(__dirname, 'src/remote-ui'),
    },
  },
  build: {
    outDir: 'dist/renderer',
  },
});
