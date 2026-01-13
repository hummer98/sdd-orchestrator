/**
 * Global Setup for Playwright Tests
 *
 * テスト実行前にElectronアプリを起動し、Remote UIが利用可能な状態にする。
 * プロセス情報は環境変数経由でglobal-teardownに共有される。
 *
 * Requirements Coverage:
 * - 2.1: Electronアプリ起動オプション
 * - 2.2: E2E_MOCK_CLAUDE_COMMAND設定
 * - 2.3: Remote UI応答待機
 * - 6.3: 既存fixtures参照
 */

import * as path from 'path';
import { startElectron, getElectronPid } from './helpers/electron-launcher';

// Fixture project path (using bugs-pane-test which has both specs and bugs)
const FIXTURE_PROJECT = path.resolve(__dirname, '../e2e-wdio/fixtures/bugs-pane-test');

// Mock Claude CLI path
const MOCK_CLAUDE_PATH = path.resolve(__dirname, '../scripts/e2e-mock/mock-claude.sh');

// Default configuration
const DEFAULT_CONFIG = {
  projectPath: FIXTURE_PROJECT,
  remotePort: 8765,
  mockClaudePath: MOCK_CLAUDE_PATH,
  mockClaudeDelay: '0.1',
  timeout: 30000, // 30 seconds startup timeout
};

/**
 * Global setup function called before all tests
 */
async function globalSetup(): Promise<void> {
  console.log('[global-setup] Starting Electron app for Playwright tests...');
  console.log(`[global-setup] Fixture project: ${FIXTURE_PROJECT}`);
  console.log(`[global-setup] Mock Claude: ${MOCK_CLAUDE_PATH}`);

  try {
    const result = await startElectron(DEFAULT_CONFIG);

    // Store process info for teardown via environment variables
    process.env.ELECTRON_PID = String(getElectronPid());
    process.env.REMOTE_UI_URL = result.url;
    process.env.REMOTE_UI_PORT = String(result.port);

    console.log(`[global-setup] Electron started successfully`);
    console.log(`[global-setup] Remote UI available at: ${result.url}`);
    console.log(`[global-setup] PID: ${process.env.ELECTRON_PID}`);
  } catch (error) {
    console.error(`[global-setup] Failed to start Electron: ${error}`);
    console.error('[global-setup] Ensure the app is built: npm run build');
    throw error;
  }
}

export default globalSetup;
