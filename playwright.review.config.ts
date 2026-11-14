import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './review-tests',
  tsconfig: './tsconfig.app.json',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4176/all-things-denote/', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-review', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'webkit-review', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: [
    { command: 'node scripts/review-test-server.mjs', url: 'http://127.0.0.1:8788/health', reuseExistingServer: false },
    { command: 'npm run preview -- --host 127.0.0.1 --port 4176 --strictPort', url: 'http://127.0.0.1:4176/all-things-denote/', reuseExistingServer: false },
  ],
});
