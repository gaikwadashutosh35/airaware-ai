import { defineConfig, devices } from '@playwright/test';

// End-to-end checks against the built app on one port, as in production.
// Run with `npm run e2e`. They need the network, server/.env and
// client/.env, so they are not part of `npm test` or CI. One worker keeps
// the run under the 10-per-minute plan limit.
export default defineConfig({
  testDir: '.',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  use: { baseURL: 'http://localhost:8090' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command:
      'npm run build -w client && node --env-file-if-exists=server/.env server/src/server.ts',
    cwd: '..',
    env: { PORT: '8090' },
    url: 'http://localhost:8090/api/v1/health',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
