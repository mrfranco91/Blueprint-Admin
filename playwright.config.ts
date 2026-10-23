import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4181',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-chromium', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: {
    command: 'pnpm exec vite preview --config tests/a11y/vite.config.ts --host 127.0.0.1 --port 4181 --strictPort',
    url: 'http://127.0.0.1:4181/tests/a11y/',
    reuseExistingServer: false,
  },
});
