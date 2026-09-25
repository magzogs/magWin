import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

// Everything (including @magwin/core and zod) is bundled so the packaged app ships no node_modules
// and the sandboxed preload stays a single file.
export default defineConfig({
  main: {
    build: { externalizeDeps: false },
  },
  preload: {
    build: { externalizeDeps: false },
  },
  renderer: {
    plugins: [react()],
  },
});
