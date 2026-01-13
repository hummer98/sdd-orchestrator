/**
 * Electron Launcher for Playwright E2E Tests
 *
 * Electronアプリをバックグラウンドで起動し、Remote UIが応答可能になるまで待機する。
 * テスト終了後はプロセスを確実に終了させる。
 *
 * Requirements Coverage:
 * - 2.1: Electronアプリ起動オプション
 * - 2.2: E2E_MOCK_CLAUDE_COMMAND環境変数設定
 * - 2.3: Remote UI応答待機
 * - 2.4: テスト後プロセス終了
 * - 2.5: 起動失敗時エラーメッセージ
 * - 3.1: Mock Claude CLI有効化
 */

import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as http from 'http';

const execAsync = promisify(exec);

/**
 * Electron Launcher configuration
 */
export interface ElectronLauncherConfig {
  /** Path to the fixture project */
  projectPath: string;
  /** Remote UI port (default: 8765) */
  remotePort: number;
  /** Path to mock-claude.sh */
  mockClaudePath: string;
  /** Mock Claude response delay in seconds */
  mockClaudeDelay: string;
  /** Startup timeout in milliseconds */
  timeout: number;
}

/**
 * Result of Electron launch
 */
export interface ElectronLauncherResult {
  /** Electron child process */
  process: ChildProcess;
  /** Remote UI URL */
  url: string;
  /** Remote UI port */
  port: number;
}

/**
 * State storage for process management
 */
let electronProcess: ChildProcess | null = null;
let electronPid: number | null = null;

/**
 * Wait for Remote UI to be ready by polling HTTP endpoint
 */
async function waitForRemoteUI(
  url: string,
  timeout: number,
  pollInterval = 500
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        reject(
          new Error(
            `Remote UI did not become ready within ${timeout}ms. ` +
              'Ensure the Electron app is built: npm run build'
          )
        );
        return;
      }

      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304) {
            resolve();
          } else {
            setTimeout(check, pollInterval);
          }
        })
        .on('error', () => {
          setTimeout(check, pollInterval);
        });
    };

    check();
  });
}

/**
 * Start Electron app with Remote UI enabled
 */
export async function startElectron(
  config: ElectronLauncherConfig
): Promise<ElectronLauncherResult> {
  const {
    projectPath,
    remotePort,
    mockClaudePath,
    mockClaudeDelay,
    timeout,
  } = config;

  // Resolve electron binary path
  const electronPath = path.resolve(__dirname, '../../node_modules/.bin/electron');
  const appEntryPoint = path.resolve(__dirname, '../../dist/main/index.js');

  // Environment variables for Electron app
  const env = {
    ...process.env,
    E2E_MOCK_CLAUDE_COMMAND: mockClaudePath,
    E2E_MOCK_CLAUDE_DELAY: mockClaudeDelay,
    // Unset ELECTRON_RUN_AS_NODE to ensure Electron runs as app, not Node.js
    ELECTRON_RUN_AS_NODE: undefined,
  };

  // Clean environment - explicitly delete ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RUN_AS_NODE;

  // Electron app arguments
  const args = [
    appEntryPoint,
    `--project=${projectPath}`,
    '--remote-ui=auto',
    '--no-auth',
    `--remote-port=${remotePort}`,
    '--e2e-test',
    '--playwright-test', // Additional flag to identify Playwright tests
  ];

  console.log(`[electron-launcher] Starting Electron with args: ${args.join(' ')}`);
  console.log(`[electron-launcher] Mock Claude: ${mockClaudePath}`);
  console.log(`[electron-launcher] Project: ${projectPath}`);

  // Spawn Electron process
  const proc = spawn(electronPath, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  electronProcess = proc;
  electronPid = proc.pid ?? null;

  // Log stdout/stderr for debugging
  proc.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[electron] ${output}`);
    }
  });

  proc.stderr?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`[electron-err] ${output}`);
    }
  });

  // Handle process errors
  proc.on('error', (error) => {
    console.error(`[electron-launcher] Failed to start Electron: ${error.message}`);
    throw new Error(
      `Failed to start Electron: ${error.message}. ` +
        'Ensure the app is built: npm run build'
    );
  });

  proc.on('exit', (code, signal) => {
    console.log(`[electron-launcher] Electron exited with code ${code}, signal ${signal}`);
    electronProcess = null;
    electronPid = null;
  });

  // Wait for Remote UI to be ready
  const url = `http://localhost:${remotePort}`;
  console.log(`[electron-launcher] Waiting for Remote UI at ${url}...`);

  try {
    await waitForRemoteUI(url, timeout);
    console.log(`[electron-launcher] Remote UI is ready at ${url}`);
  } catch (error) {
    // Kill the process if startup failed
    await stopElectron();
    throw error;
  }

  return {
    process: proc,
    url,
    port: remotePort,
  };
}

/**
 * Stop Electron process
 */
export async function stopElectron(): Promise<void> {
  if (electronProcess) {
    console.log(`[electron-launcher] Stopping Electron process (PID: ${electronPid})...`);

    try {
      // Try graceful termination first
      electronProcess.kill('SIGTERM');

      // Wait a bit for process to exit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force kill if still running
      if (electronProcess && !electronProcess.killed) {
        electronProcess.kill('SIGKILL');
      }
    } catch (error) {
      console.warn(`[electron-launcher] Error terminating process: ${error}`);
    }

    electronProcess = null;
    electronPid = null;
  }

  // Cleanup any remaining Playwright test Electron processes
  try {
    await execAsync("pkill -f '\\-\\-playwright-test' || true");
    console.log('[electron-launcher] Cleaned up Playwright test Electron processes');
  } catch {
    // Ignore if no processes found
  }
}

/**
 * Check if Electron is currently running
 */
export function isElectronRunning(): boolean {
  return electronProcess !== null && !electronProcess.killed;
}

/**
 * Get Electron process PID
 */
export function getElectronPid(): number | null {
  return electronPid;
}
