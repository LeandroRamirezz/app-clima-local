import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para la suite de pruebas QA
 * Proyecto: Observatorio del Clima
 * Ambiente QA: https://app-clima-local.vercel.app
 */
export default defineConfig({
  testDir: './casos',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.QA_BASE_URL || 'https://app-clima-local.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'ejemplo',
      testDir: './casos/ejemplo',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'jc',
      testDir: './casos/jc',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'js',
      testDir: './casos/js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ss',
      testDir: './casos/ss',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
