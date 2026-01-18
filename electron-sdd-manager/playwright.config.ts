/**
 * Playwright Configuration for Remote UI E2E Tests
 *
 * Remote UIテスト用のPlaywright設定。
 * Electronアプリをglobal-setupで起動し、ブラウザからRemote UIにアクセスしてテストを実行する。
 *
 * Requirements Coverage:
 * - 1.1: playwright.config.ts存在
 * - 1.2: baseURL設定（動的にポートファイルから取得）
 * - 1.3: テストパターン e2e-playwright/[all].spec.ts
 * - 1.4: レポート出力設定
 */

import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the Remote UI base URL from the port file written by global-setup.
 * Falls back to default port if file doesn't exist (e.g., during config loading).
 */
function getBaseURL(): string {
  const portFile = path.resolve(__dirname, '.playwright-remote-port');
  if (fs.existsSync(portFile)) {
    const port = fs.readFileSync(portFile, 'utf-8').trim();
    return `http://localhost:${port}`;
  }
  // Fallback for initial config loading (before global-setup runs)
  return 'http://localhost:8765';
}

export default defineConfig({
  // Test directory and file matching
  testDir: './e2e-playwright',
  testMatch: '**/*.spec.ts',

  // Sequential execution (Electron process shared)
  fullyParallel: false,
  workers: 1,

  // Retries (more in CI)
  retries: process.env.CI ? 1 : 0,

  // Reporters
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
  ],

  // Global setup/teardown for Electron app lifecycle
  globalSetup: require.resolve('./e2e-playwright/global-setup'),
  globalTeardown: require.resolve('./e2e-playwright/global-teardown'),

  // Default test options
  use: {
    // Remote UI base URL (dynamically read from port file)
    baseURL: getBaseURL(),

    // Tracing and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    // Default timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Timeout settings
  timeout: 60000, // 60 seconds per test

  // Output directories
  outputDir: 'test-results',

  // Expect options
  expect: {
    timeout: 10000,
  },
});
