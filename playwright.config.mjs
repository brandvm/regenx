import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/playwright',
  fullyParallel: true,
  workers: 3,
  use: { browserName: 'chromium', channel: 'chromium', headless: true },
});
