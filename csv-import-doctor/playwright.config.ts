import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: {
      channel: 'chrome',
      headless: false,
    },
    baseURL: process.env.PLAYWRIGHT_APP_URL || 'http://localhost:3000',
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE || undefined,
    trace: 'retain-on-failure',
  },
});
