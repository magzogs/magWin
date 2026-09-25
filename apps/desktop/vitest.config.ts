import { defineProject } from 'vitest/config';

// Main-process tests run in node; renderer tests opt into jsdom with `// @vitest-environment jsdom`.
export default defineProject({
  esbuild: { jsx: 'automatic' },
  test: {
    name: 'desktop',
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/renderer/src/test/setup.ts'],
  },
});
