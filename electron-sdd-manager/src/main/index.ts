/**
 * Electron Main Process Entry Point
 * Requirements: 11.1, 11.6, 11.7, 13.1, 13.2
 * Task 10.2: CLI起動オプション統合
 * Task 6.4: MCP server auto-start (mcp-server-integration)
 * multi-window-integration Task 7.1-7.3: WindowManager-based startup flow
 */

import { app, dialog } from 'electron';
import { existsSync } from 'fs';
import { initializeEventWiring, selectProject } from './trpc/helpers/projectSetup';
import { getGlobalEventBus } from './trpc/services/globalEventBus';
import { setInitialProjectPath, setInitialSelectResult } from './trpc/helpers/projectState';
// trpc-full-migration Task 10.7: IPC handlers deleted, utility functions moved to services/
import { setupStatusNotifications, getRemoteAccessServer } from './services/remoteAccessSetup';
import { setupSSHStatusNotifications } from './services/sshSetup';
// worktreeHandlers: tRPC gitルーターに移行・削除済み (Task 8.3)
// bugWorktreeHandlers: tRPC bugルーターに移行済み (Task 5.4)
// convertWorktreeHandlers: tRPC bugルーター (convertToWorktree) に移行済み (Task 5.4)
import { createMenu, initializeMenuFocusTracking } from './menu';
import { getConfigStore } from './services/configStore';
// agent-error-notification: logger.ts -> projectLogger migration (Requirements 1.2, 1.3, 1.5)
import { projectLogger as logger } from './services/projectLogger';
// unified-tool-path-resolver: Unified tool path resolution (Requirements 1.1, 2.1, 4.1)
import { getToolPathResolverService } from './services/toolPathResolverService';
import { parseCLIArgs, printHelp, type CLIOptions } from './utils/cliArgsParser';
import { getAccessTokenService } from './services/accessTokenService';
import { initializeMcpServer, getMcpServerService } from './services/mcp/mcpAutoStart';
import { setupMcpStatusBroadcast } from './services/mcp/mcpStatusBroadcast';
// multi-window-integration Task 7.1-7.3: WindowManager-based window management
import { getWindowManager } from './services/windowManager';
import { initializeTRPCHandler } from './trpc/handler';
// Entry point must have zero exports — testable cleanup logic lives in appLifecycle.ts
import { cleanupOnQuit } from './appLifecycle';
// Crash reporter: logs errors to fixed-path crash.log and intercepts dialog.showErrorBox
import { initCrashReporter, writeCrashLog } from './services/crashReporter';

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

// Initialize crash reporter as early as possible.
// Detects non-interactive mode (E2E, background) to skip blocking dialogs.
// Also intercepts dialog.showErrorBox to always log errors to crash.log.
const isNonInteractive = process.argv.includes('--e2e-test') || !!process.env.SDD_NON_INTERACTIVE;
initCrashReporter(isNonInteractive);

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

  // Write to crash log (always works, independent of project logger)
  writeCrashLog('Uncaught Exception', `${error.message}\n${error.stack ?? '(no stack)'}`);

  // Also log via project logger
  logger.error('[main] Uncaught exception', { error: error.message, stack: error.stack });

  // Show error dialog to user (only if app is ready)
  // Note: dialog.showErrorBox is intercepted by crashReporter:
  // - Always logs to crash.log before showing
  // - Skips dialog in non-interactive mode (E2E, background)
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
  writeCrashLog('Unhandled Rejection', `${message}\n${stack ?? '(no stack)'}`);
  logger.error('[main] Unhandled promise rejection', { reason: message, stack });
});

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

// Single instance lock: prevent multiple app instances
// When a second instance is launched, focus the existing window and handle its arguments
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance already running - quit this one
  // The existing instance will receive 'second-instance' event with our argv
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    logger.info('[main] second-instance event received', { argv: argv.join(' ') });

    // Parse the second instance's arguments to extract --project path
    // For packaged apps, argv[0] is the executable path
    const secondArgs = isAppPackaged ? argv.slice(1) : argv.slice(2);
    const secondOptions = parseCLIArgs(secondArgs);

    // multi-window-integration Task 7.2: Use WindowManager for second-instance handling
    const windowManager = getWindowManager();

    // If the second instance specified a project path, check for existing window
    if (secondOptions.projectPath && existsSync(secondOptions.projectPath)) {
      logger.info('[main] Selecting project from second instance', {
        projectPath: secondOptions.projectPath,
      });

      // Check if project is already open in a window
      const existingWindow = windowManager.getWindowByProject(secondOptions.projectPath);
      if (existingWindow) {
        // Restore and focus the existing window (handles minimized state)
        const existingWindowId = existingWindow.id;
        windowManager.restoreAndFocus(existingWindowId);
        logger.info('[main] Focused existing window for project', {
          projectPath: secondOptions.projectPath,
          windowId: existingWindowId,
        });
      } else {
        // No existing window for this project - create new window and select project
        windowManager.createWindow();
        selectProject(secondOptions.projectPath).catch((error) => {
          logger.error('[main] Failed to select project from second instance', { error });
        });
      }
    } else {
      // No project specified - focus the first available window
      const windowIds = windowManager.getAllWindowIds();
      if (windowIds.length > 0) {
        windowManager.restoreAndFocus(windowIds[0]);
      } else {
        windowManager.createWindow();
      }
    }
  });
}

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

// Diagnostic: Log env vars and resolved initialProjectPath
logger.info('[main] Startup diagnostic', {
  envSDD_PROJECT_PATH: process.env.SDD_PROJECT_PATH ?? '(not set)',
  envE2E_MOCK_CLAUDE_COMMAND: process.env.E2E_MOCK_CLAUDE_COMMAND ?? '(not set)',
  cliProjectPath: cliOptions.projectPath ?? '(not set)',
  resolvedInitialProjectPath: initialProjectPath ?? '(null)',
  isE2ETest,
  isAppPackaged,
  cliArgsRaw: cliArgs.join(' '),
});

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

  // E2E: Expose globalEventBus on global for test access
  // (Renderer side exposes __STORES__ and __TRPC__ on window for the same purpose)
  if (isE2ETest) {
    (global as any).__GLOBAL_EVENT_BUS__ = getGlobalEventBus();
  }

  // Remote Access & SSH: IPC handlers deleted (Task 10.7), setup notifications only
  setupStatusNotifications();
  setupSSHStatusNotifications();

  // worktreeHandlers: tRPC gitルーターに移行・削除済み (Task 8.3)

  // bugWorktreeHandlers: tRPC bugルーターに移行済み (Task 5.4)
  // convertWorktreeHandlers: tRPC bugルーターに移行済み (Task 5.4)

  // Create application menu
  createMenu();

  // multi-window-integration Task 5.2: Enable menu context tracking on window focus change
  initializeMenuFocusTracking();

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

  // multi-window-integration Task 8.2: Restore previous window states or create default window
  // replaces direct createWindow() call from Task 7.1
  const windowManager = getWindowManager();
  const { restored, skipped } = windowManager.restoreWindows();
  logger.info('[main] Window restoration complete', { restored, skipped: skipped.length });

  // multi-window-integration Task 7.1: Initialize tRPC IPC handler with WindowManager
  // IPCHandler is created once and attached to the first window (DD-001 Singleton pattern)
  const allWindowIds = windowManager.getAllWindowIds();
  const firstWindow = allWindowIds.length > 0 ? windowManager.getWindow(allWindowIds[0]) : null;
  if (firstWindow) {
    initializeTRPCHandler(windowManager, firstWindow);
  } else {
    logger.error('[main] No windows available after restoration - cannot initialize tRPC handler');
  }

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
// multi-window-integration Task 7.2: Use WindowManager for activate handler
app.on('activate', () => {
  const windowManager = getWindowManager();
  const windowIds = windowManager.getAllWindowIds();
  logger.info('[main] activate event fired', { windowCount: windowIds.length });
  if (windowIds.length === 0) {
    logger.info('[main] No windows found, creating new window');
    windowManager.createWindow();
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  logger.info('[main] window-all-closed event fired', { platform: process.platform, isE2ETest });
  if (process.platform !== 'darwin' || isE2ETest) {
    logger.info('[main] Quitting app (non-macOS or E2E test mode)');
    app.quit();
  } else {
    logger.info('[main] macOS, keeping app running');
  }
});

// Task 7.4: Stop watchdog on app quit (Requirement: 7.5)
// Extended: Also stop remote UI server if running
app.on('will-quit', async () => {
  logger.info('[main] will-quit event fired');
  await cleanupOnQuit();
});