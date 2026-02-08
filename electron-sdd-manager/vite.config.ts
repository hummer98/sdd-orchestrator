import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';
import nodeResolve from '@rollup/plugin-node-resolve';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(options) {
          // Enable remote debugging for Electron MCP integration
          // Note: Must include '.' as the first argument (app entry point)
          options.startup(['.', '--no-sandbox', '--remote-debugging-port=9222']);
        },
        vite: {
          resolve: {
            alias: {
              '@': resolve(__dirname, 'src'),
              '@main': resolve(__dirname, 'src/main'),
              '@shared': resolve(__dirname, 'src/shared'),
            },
          },
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'zod'],
              // vite-plugin-electron uses build.lib mode, which makes Vite set
              // preserveEntrySignatures: 'strict'. With 'strict', Rollup creates
              // a facade (shim) when the chunk needs internal exports even if the
              // entry module has zero exports. 'exports-only' avoids the facade
              // for zero-export entries, producing a single output file.
              preserveEntrySignatures: 'exports-only',
            },
          },
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
