import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'remotion/**/*.test.{ts,mjs}'],
    setupFiles: ['scripts/verification/node-offline.mjs'],
    maxWorkers: 2,
  },
});
