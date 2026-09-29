import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    pool: 'threads',
    maxWorkers: 1,
    testTimeout: 15000,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}'],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
