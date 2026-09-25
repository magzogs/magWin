import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// `pnpm --filter @magwin/desktop preview:ui` — renderer screens in a plain browser with a fake API.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  // Open http://localhost:5199/preview.html
  server: { port: 5199, strictPort: true },
});
