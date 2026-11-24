import { defineConfig, devices } from '@playwright/test';

// This explicit smoke test creates and cleans up its own production event.
export default defineConfig({
  testDir: './review-tests',
  testMatch: 'real-photo.spec.ts',
  tsconfig: './tsconfig.app.json',
  timeout: 120000,
  workers: 1,
  expect: { timeout: 20000 },
  use: { baseURL: 'https://astrocyte74.github.io/all-things-denote/', trace: 'off' },
  projects: [
    { name: 'live-chromium', use: devices['Pixel 7'] },
    { name: 'live-webkit', use: devices['iPhone 13'] },
  ],
});
