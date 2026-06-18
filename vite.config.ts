import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

// Electron + Vite. The renderer is the React app in src/; the main and preload
// processes live in electron/. node-pty is a native module, so it must stay
// external (never bundled).
export default defineConfig({
  // Relative base so the built renderer loads its assets over file:// inside
  // the packaged Electron app.
  base: './',
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['node-pty', 'electron-updater'],
              output: { entryFileNames: 'main.js' },
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              // CommonJS preload so it loads reliably regardless of sandbox.
              output: { format: 'cjs', entryFileNames: 'preload.js', inlineDynamicImports: true },
            },
          },
        },
      },
    }),
  ],
});
