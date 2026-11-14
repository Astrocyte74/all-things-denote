import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  tsconfig: './tsconfig.app.json',
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4175/all-things-denote/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run preview -- --host localhost --port 4175 --strictPort',
    url: 'http://localhost:4175/all-things-denote/',
    reuseExistingServer: false,
  },
});
