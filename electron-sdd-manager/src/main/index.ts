/**
 * Electron Main Process Entry Point
 * Requirements: 11.1, 11.6, 11.7, 13.1, 13.2
 * Task 10.2: CLI起動オプション統合
 * Task 6.4: MCP server auto-start (mcp-server-integration)
 */

import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { initializeEventWiring, setInitialProjectPath, selectProject, setInitialSelectResult } from './trpc/helpers/projectSetup';
// trpc-full-migration Task 10.7: IPC handlers deleted, utility functions moved to services/
import { setupStatusNotifications, getRemoteAccessServer } from './services/remoteAccessSetup';
import { setupSSHStatusNotifications } from './services/sshSetup';
// worktreeHandlers: tRPC gitルーターに移行・削除済み (Task 8.3)
// bugWorktreeHandlers: tRPC bugルーターに移行済み (Task 5.4)
// convertWorktreeHandlers: tRPC bugルーター (convertToWorktree) に移行済み (Task 5.4)
import { createMenu } from './menu';
import { getConfigStore } from './services/configStore';
// agent-error-notification: logger.ts -> projectLogger migration (Requirements 1.2, 1.3, 1.5)
import { projectLogger as logger } from './services/projectLogger';
// unified-tool-path-resolver: Unified tool path resolution (Requirements 1.1, 2.1, 4.1)
import { getToolPathResolverService } from './services/toolPathResolverService';
import { parseCLIArgs, printHelp, type CLIOptions } from './utils/cliArgsParser';
import { getAccessTokenService } from './services/accessTokenService';
import { initializeMcpServer, getMcpServerService } from './services/mcp/mcpAutoStart';
import { setupMcpStatusBroadcast } from './services/mcp/mcpStatusBroadcast';
// Task 7.4: Agent Lifecycle Management (agent-lifecycle-management feature)
import { getAgentWatchdog } from './services/agentLifecycleSetup';
// trpc-infrastructure: tRPC IPC handler setup (Requirements 8.1-8.5)
import { setupTRPCHandler } from './trpc/handler';
// trpc-service-wiring-completion: Production services DI assembly
import { createProductionServices } from './trpc/productionServices';
// startup-project-selection-race-condition: EventBus imports removed (Push model deleted)

// Prevent EPIPE/EIO errors from crashing the app
// These occur when stdout/stderr streams are closed (common in packaged Electron apps)
// See: https://github.com/electron/electron/issues/40781
if (process.stdout) {
  process.stdout.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE' || err.code === 'EIO') {
      // Silently ignore - stream is closed
      return;
    }
    // Re-throw other errors
    throw err;
  });
}
if (process.stderr) {
  process.stderr.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE' || err.code === 'EIO') {
      // Silently ignore - stream is closed
      return;
    }
    // Re-throw other errors
    throw err;
  });
}

// Handle uncaught exceptions gracefully
// EIO errors on stdout/stderr are common in packaged Electron apps
// when the console is unavailable or closed
process.on('uncaughtException', (error: Error) => {
  // Ignore EIO and EPIPE errors on stdout/stderr (common in packaged apps)
  if (error.message?.includes('EIO') || error.message?.includes('EPIPE')) {
    // Log to file only (console may be broken)
    logger.warn('[main] Ignored stdout/stderr error', { error: error.message });
    return;
  }

  // For other uncaught exceptions, log and show error dialog
  logger.error('[main] Uncaught exception', { error: error.message, stack: error.stack });

  // Show error dialog to user (only if app is ready)
  if (app.isReady()) {
    dialog.showErrorBox(
      'Unexpected Error',
      `An unexpected error occurred:\n\n${error.message}\n\nPlease restart the application.`
    );
  }
});

// Handle unhandled promise rejections
// Log to file so smoke tests can detect these issues
process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error('[main] Unhandled promise rejection', { reason: message, stack });
});

let mainWindow: BrowserWindow | null = null;

// Task 10.2: Parse CLI arguments using cliArgsParser
// In packaged apps, argv structure may differ (no 'electron' as first arg)
const isAppPackaged = app.isPackaged;
const cliArgs = isAppPackaged ? process.argv.slice(1) : process.argv.slice(2);
const cliOptions: CLIOptions = parseCLIArgs(cliArgs);

// Handle --help option early (before app.whenReady)
if (cliOptions.help) {
  console.log(printHelp());
  app.exit(0);
}

// E2E test mode detection via CLI options
const isE2ETest = cliOptions.e2eTest;

/**
 * Get initial project path from CLI options or environment
 * Priority: 1. CLI --project, 2. SDD_PROJECT_PATH env
 *
 * Note: For packaged Electron apps on macOS, process.argv structure differs
 * from development mode. We use multiple methods to ensure compatibility.
 * See: https://github.com/electron/electron/issues/4690
 */
function getInitialProjectPathFromConfig(): string | null {
  // First check CLI option
  if (cliOptions.projectPath) {
    return cliOptions.projectPath;
  }

  // Then check environment variable (works better with vite dev server)
  const envPath = process.env.SDD_PROJECT_PATH;
  if (envPath) {
    return envPath;
  }

  // Try app.commandLine.getSwitchValue() for packaged apps
  // This works reliably for --project=value format
  const switchValue = app.commandLine.getSwitchValue('project');
  if (switchValue) {
    return switchValue;
  }

  return null;
}

// Initial project path from CLI or environment variable
const initialProjectPath = getInitialProjectPathFromConfig();

// Enable remote debugging for MCP server (development only)
// Note: This must be set before app.whenReady()
if (!isAppPackaged && !isE2ETest) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

/**
 * unified-tool-path-resolver: Resolve all tool paths at startup
 * Requirements: 4.1, 4.2, 4.3
 *
 * - Resolves all registered tools in parallel using Well Known path checks
 * - Logs warning if claude (required tool) resolution fails
 * - Note (well-known-tool-paths feature): Warning dialog removed, Renderer now auto-shows
 *   ToolSettingsPanel when claude is not resolved (Requirements: 3.1, 3.3)
 */
async function resolveToolPathsAtStartup(): Promise<void> {
  const resolver = getToolPathResolverService();

  // Requirement 4.1, 4.2: Resolve all tools in parallel at startup
  await resolver.resolveAll();

  // Check claude (required tool) - log status for debugging
  const claudeStatus = resolver.getStatus('claude');
  if (claudeStatus && !claudeStatus.resolution.resolved) {
    // well-known-tool-paths Task 6.3: Warning dialog removed
    // Renderer now auto-shows ToolSettingsPanel when claude is not resolved
    logger.warn('[main] Claude path resolution failed', { error: claudeStatus.resolution.error });
  } else if (claudeStatus) {
    logger.info('[main] Claude path resolved successfully', { path: claudeStatus.resolution.path });
  }
}

function createWindow(): void {
  const isDev = !app.isPackaged && !isE2ETest;
  const configStore = getConfigStore();
  const savedBounds = configStore.getWindowBounds();

  // Task 10.2: Headless mode - create window but don't show it
  const isHeadless = cliOptions.headless;

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1200,
    height: savedBounds?.height ?? 800,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 800,
    minHeight: 600,
    title: isDev ? 'SDD Orchestrator (dev)' : 'SDD Orchestrator',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: !isE2ETest, // Disable sandbox in E2E test mode
      preload: join(__dirname, '../preload/index.js'),
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // trpc-infrastructure: Register tRPC IPC handler (DD-005)
  // Must be called after BrowserWindow creation
  // trpc-service-wiring-completion: Pass production services as serviceOverrides
  const productionServices = createProductionServices();
  setupTRPCHandler(mainWindow, productionServices);

  // Show window when ready (unless headless mode)
  // startup-project-selection-race-condition: Broadcast removed (Pull model)
  // Renderer now pulls initial project selection result via tRPC query on mount
  mainWindow.once('ready-to-show', () => {
    if (!isHeadless) {
      mainWindow?.show();
    }
  });

  // Save window bounds on close
  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      configStore.setWindowBounds(bounds);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Application lifecycle
app.whenReady().then(async () => {
  // Set app name with (dev) suffix in development mode
  const isDev = !app.isPackaged;
  if (isDev) {
    app.setName(`${app.name} (dev)`);
  }

  // unified-tool-path-resolver: Resolve all tool paths at startup (Requirements 4.1, 4.2, 4.3)
  // This must be done early, before any agent processes are started
  await resolveToolPathsAtStartup();

  // Initialize event wiring (auto-execution events, file watchers)
  initializeEventWiring();

  // Remote Access & SSH: IPC handlers deleted (Task 10.7), setup notifications only
  setupStatusNotifications();
  setupSSHStatusNotifications();

  // worktreeHandlers: tRPC gitルーターに移行・削除済み (Task 8.3)

  // bugWorktreeHandlers: tRPC bugルーターに移行済み (Task 5.4)
  // convertWorktreeHandlers: tRPC bugルーターに移行済み (Task 5.4)

  // Create application menu
  createMenu();

  // Task 6.4: Initialize MCP server (mcp-server-integration)
  // Auto-start MCP server if enabled in settings
  const configStore = getConfigStore();

  // Setup MCP status broadcast to Renderer (must be done before server starts)
  const mcpService = getMcpServerService();
  setupMcpStatusBroadcast(mcpService);

  await initializeMcpServer(() => configStore.getMcpSettings());

  // Initialize with project path from command line if provided
  // Main process owns project selection - Renderer should not call selectProject again
  if (initialProjectPath) {
    logger.info('[main] Initial project path from command line', { initialProjectPath });

    // Validate project path exists
    if (existsSync(initialProjectPath)) {
      try {
        // Set the initial project path for IPC queries from renderer
        // This allows Renderer to know the initial path without calling selectProject
        setInitialProjectPath(initialProjectPath);

        // selectProject handles full initialization including:
        // - setProjectPath (AgentRecordService, AgentLifecycleManager)
        // - Loading specs, bugs, validation
        // - Adding to recent projects
        const result = await selectProject(initialProjectPath);
        if (result.success) {
          logger.info('[main] Initial project selected successfully', {
            initialProjectPath,
            specsCount: result.specs.length,
            bugsCount: result.bugs.length,
          });
          // startup-project-selection-fix Task 4.1: Cache result for later broadcast
          // Requirements: 1.1, 1.2
          setInitialSelectResult(result);
        } else {
          logger.error('[main] Failed to select initial project', {
            initialProjectPath,
            error: result.error,
          });
        }
      } catch (error) {
        logger.error('[main] Failed to initialize with project path', { error, initialProjectPath });
      }
    } else {
      logger.warn('[main] Project path does not exist', { initialProjectPath });
    }
  }

  // Create main window
  createWindow();

  // Task 10.2: Remote UI auto-start with CLI options
  if (cliOptions.remoteUIAuto) {
    await startRemoteUIWithCLIOptions();
  }
});

/**
 * Task 10.2: Start Remote UI server with CLI options
 *
 * Handles:
 * - --remote-ui=auto: Auto-start Remote UI server
 * - --remote-port=<port>: Use specified port
 * - --remote-token=<token>: Use fixed access token
 * - --no-auth: Disable authentication
 *
 * Outputs REMOTE_UI_URL=... to stdout for E2E test consumption
 */
async function startRemoteUIWithCLIOptions(): Promise<void> {
  try {
    const server = getRemoteAccessServer();
    if (!server) {
      logger.error('[main] Remote Access Server not initialized');
      return;
    }

    // Set fixed token if specified
    if (cliOptions.remoteToken) {
      const accessTokenService = getAccessTokenService();
      accessTokenService.setFixedToken(cliOptions.remoteToken);
      logger.info('[main] Using fixed access token from CLI');
    }

    // Start server with specified port
    const result = await server.start(cliOptions.remotePort, {
      publishToCloudflare: false, // E2E tests use local connection
    });

    if (result.ok) {
      const { url, accessToken } = result.value;
      const accessUrl = `${url}?token=${accessToken}`;

      // Output URL in format that E2E tests can parse
      // Use process.stdout.write to avoid newline issues
      console.log(`REMOTE_UI_URL=${accessUrl}`);
      console.log(`REMOTE_UI_PORT=${result.value.port}`);

      logger.info('[main] Remote UI server auto-started', {
        port: result.value.port,
        url: accessUrl,
      });
    } else {
      logger.error('[main] Failed to start Remote UI server', { error: result.error });
      console.error(`REMOTE_UI_ERROR=${result.error.type}`);
    }
  } catch (error) {
    logger.error('[main] Exception starting Remote UI server', { error });
    console.error(`REMOTE_UI_ERROR=${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// macOS: Re-create window when dock icon is clicked
app.on('activate', () => {
  logger.info('[main] activate event fired', { windowCount: BrowserWindow.getAllWindows().length });
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.info('[main] No windows found, creating new window');
    createWindow();
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  logger.info('[main] window-all-closed event fired', { platform: process.platform });
  if (process.platform !== 'darwin') {
    logger.info('[main] Not macOS, quitting app');
    app.quit();
  } else {
    logger.info('[main] macOS, keeping app running');
  }
});

/**
 * Cleanup function called on app quit
 * Stops agent watchdog and remote UI server
 */
export async function cleanupOnQuit(): Promise<void> {
  logger.info('[main] Starting cleanup on quit');

  // Stop agent watchdog
  try {
    const watchdog = getAgentWatchdog();
    if (watchdog) {
      watchdog.stop();
      logger.info('[main] Agent watchdog stopped');
    }
  } catch (error) {
    logger.warn('[main] Error stopping agent watchdog', { error });
  }

  // Stop remote UI server if running
  try {
    const server = getRemoteAccessServer();
    const status = server.getStatus();
    if (status.isRunning) {
      await server.stop();
      logger.info('[main] Remote UI server stopped');
    }
  } catch (error) {
    logger.warn('[main] Error stopping remote UI server', { error });
  }
}

// Task 7.4: Stop watchdog on app quit (Requirement: 7.5)
// Extended: Also stop remote UI server if running
app.on('will-quit', async () => {
  logger.info('[main] will-quit event fired');
  await cleanupOnQuit();
});

// Export for testing
export { createWindow, mainWindow };
