import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/playwright',
  fullyParallel: true,
  workers: 3,
  // CI: fail on a stray test.only, and retry once so a slow runner cannot
  // block a deploy; the retry is reported as flaky rather than hidden.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { browserName: 'chromium', channel: 'chromium', headless: true },
});
