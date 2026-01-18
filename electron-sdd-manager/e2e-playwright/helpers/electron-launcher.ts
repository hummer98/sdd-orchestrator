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
import * as fs from 'fs';
import * as http from 'http';

/** File path to store the actual Remote UI port for test processes */
export const REMOTE_UI_PORT_FILE = path.resolve(__dirname, '../../.playwright-remote-port');

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

  // Clean up port file from previous run
  if (fs.existsSync(REMOTE_UI_PORT_FILE)) {
    fs.unlinkSync(REMOTE_UI_PORT_FILE);
  }

  // Spawn Electron process
  const proc = spawn(electronPath, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  electronProcess = proc;
  electronPid = proc.pid ?? null;

  // Track the actual port and URL from Electron output
  let actualPort: number | null = null;
  let actualUrl: string | null = null;
  let urlResolve: ((info: { port: number; url: string }) => void) | null = null;
  const urlPromise = new Promise<{ port: number; url: string }>((resolve) => {
    urlResolve = resolve;
  });

  // Log stdout/stderr for debugging and capture REMOTE_UI_URL and REMOTE_UI_PORT
  proc.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[electron] ${output}`);

      // Parse REMOTE_UI_URL from output (format: REMOTE_UI_URL=http://host:port?token=xxx)
      const urlMatch = output.match(/REMOTE_UI_URL=(\S+)/);
      if (urlMatch && !actualUrl) {
        actualUrl = urlMatch[1];
        console.log(`[electron-launcher] Detected Remote UI URL: ${actualUrl}`);
      }

      // Parse REMOTE_UI_PORT from output (format: REMOTE_UI_PORT=8767)
      const portMatch = output.match(/REMOTE_UI_PORT=(\d+)/);
      if (portMatch && !actualPort) {
        actualPort = parseInt(portMatch[1], 10);
        console.log(`[electron-launcher] Detected actual Remote UI port: ${actualPort}`);
      }

      // Resolve when both URL and port are available
      if (actualUrl && actualPort && urlResolve) {
        urlResolve({ port: actualPort, url: actualUrl });
        urlResolve = null; // Only resolve once
      }
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

  // Wait for actual port and URL to be detected from Electron output
  console.log(`[electron-launcher] Waiting for Remote UI URL detection...`);
  const { port: detectedPort, url: detectedUrl } = await Promise.race([
    urlPromise,
    new Promise<{ port: number; url: string }>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout waiting for REMOTE_UI_URL/PORT')), timeout)
    ),
  ]);

  // Extract token from the detected URL
  const urlObj = new URL(detectedUrl);
  const token = urlObj.searchParams.get('token') || '';

  // Wait for Remote UI to be ready on the actual port
  const localUrl = `http://localhost:${detectedPort}`;
  console.log(`[electron-launcher] Waiting for Remote UI at ${localUrl}...`);

  try {
    await waitForRemoteUI(localUrl, timeout);
    console.log(`[electron-launcher] Remote UI is ready at ${localUrl}`);
  } catch (error) {
    // Kill the process if startup failed
    await stopElectron();
    throw error;
  }

  // Build the full URL with token for test processes
  const testUrl = token ? `${localUrl}?token=${token}` : localUrl;

  // Save port and URL info to file for test processes to read (JSON format)
  const portInfo = { port: detectedPort, url: testUrl, token };
  fs.writeFileSync(REMOTE_UI_PORT_FILE, JSON.stringify(portInfo));
  console.log(`[electron-launcher] Saved port info to ${REMOTE_UI_PORT_FILE}: ${JSON.stringify(portInfo)}`);

  return {
    process: proc,
    url: testUrl,
    port: detectedPort,
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

  // Clean up port file
  if (fs.existsSync(REMOTE_UI_PORT_FILE)) {
    fs.unlinkSync(REMOTE_UI_PORT_FILE);
    console.log(`[electron-launcher] Cleaned up port file: ${REMOTE_UI_PORT_FILE}`);
  }
}

/** Port info structure stored in the port file */
interface PortInfo {
  port: number;
  url: string;
  token: string;
}

/** Cached port info to avoid re-reading file for each test */
let cachedPortInfo: PortInfo | null = null;

/**
 * Get the port info from the port file
 * This is used by test processes to get the correct port and URL
 * The info is cached after first read to ensure consistency across tests
 */
function getPortInfo(): PortInfo {
  // Return cached info if available
  if (cachedPortInfo !== null) {
    return cachedPortInfo;
  }

  if (!fs.existsSync(REMOTE_UI_PORT_FILE)) {
    throw new Error(
      `Port file not found: ${REMOTE_UI_PORT_FILE}. ` +
        'Make sure global-setup has run successfully.'
    );
  }

  const content = fs.readFileSync(REMOTE_UI_PORT_FILE, 'utf-8').trim();
  let portInfo: PortInfo;

  try {
    portInfo = JSON.parse(content);
  } catch {
    // Fallback for old format (plain port number)
    const port = parseInt(content, 10);
    if (isNaN(port)) {
      throw new Error(`Invalid port info in ${REMOTE_UI_PORT_FILE}`);
    }
    portInfo = { port, url: `http://localhost:${port}`, token: '' };
  }

  // Cache the info for subsequent calls
  cachedPortInfo = portInfo;
  console.log(`[electron-launcher] Cached Remote UI port info: ${JSON.stringify(portInfo)}`);
  return portInfo;
}

/**
 * Get the actual Remote UI port from the port file
 */
export function getRemoteUIPort(): number {
  return getPortInfo().port;
}

/**
 * Get the full Remote UI URL with token from the port file
 */
export function getRemoteUIUrl(): string {
  return getPortInfo().url;
}

/**
 * Clear the cached port info (used in teardown)
 */
export function clearCachedPort(): void {
  cachedPortInfo = null;
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
