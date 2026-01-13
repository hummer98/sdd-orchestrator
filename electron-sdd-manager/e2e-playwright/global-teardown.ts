/**
 * Global Teardown for Playwright Tests
 *
 * テスト終了後にElectronプロセスを確実に終了させる。
 * 残存プロセスのクリーンアップも実行する。
 *
 * Requirements Coverage:
 * - 2.4: テスト後プロセス終了
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { stopElectron } from './helpers/electron-launcher';

const execAsync = promisify(exec);

/**
 * Global teardown function called after all tests
 */
async function globalTeardown(): Promise<void> {
  console.log('[global-teardown] Cleaning up Electron processes...');

  // Stop the Electron process started by global-setup
  await stopElectron();

  // Additional cleanup: kill any remaining Playwright test processes
  const pid = process.env.ELECTRON_PID;

  if (pid) {
    try {
      // Attempt to kill by PID if still running
      await execAsync(`kill -TERM ${pid} || true`);
      console.log(`[global-teardown] Sent SIGTERM to process ${pid}`);
    } catch (error) {
      // Process may already be terminated
      console.log(`[global-teardown] Process ${pid} may already be terminated`);
    }
  }

  // Final cleanup: kill any remaining --playwright-test processes
  try {
    await execAsync("pkill -f '\\-\\-playwright-test' || true");
    console.log('[global-teardown] Cleaned up remaining Playwright test processes');
  } catch {
    // No processes found
  }

  // Also clean up any e2e-test processes that might be lingering
  try {
    await execAsync("pkill -f '\\-\\-e2e-test.*\\-\\-playwright-test' || true");
  } catch {
    // No processes found
  }

  console.log('[global-teardown] Cleanup complete');
}

export default globalTeardown;
