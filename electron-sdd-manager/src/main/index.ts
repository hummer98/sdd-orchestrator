/**
 * Electron Main Process Entry Point
 * Requirements: 11.1, 11.6, 11.7, 13.1, 13.2
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { registerIpcHandlers, setProjectPath, setInitialProjectPath } from './ipc/handlers';
import { createMenu } from './menu';
import { getConfigStore } from './services/configStore';
import { logger } from './services/logger';

let mainWindow: BrowserWindow | null = null;

// E2E test mode detection via command line argument
const isE2ETest = process.argv.includes('--e2e-test');

/**
 * Parse command line arguments to get initial project path
 * Supports: --project=<path> or --project <path>
 * Also checks SDD_PROJECT_PATH environment variable
 */
function parseProjectPathArg(): string | null {
  // First check environment variable (works better with vite dev server)
  const envPath = process.env.SDD_PROJECT_PATH;
  if (envPath) {
    return envPath;
  }

  const args = process.argv.slice(2); // Remove node and app path

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // --project=<path> format
    if (arg.startsWith('--project=')) {
      const path = arg.substring('--project='.length);
      return path || null;
    }

    // --project <path> format
    if (arg === '--project' && i + 1 < args.length) {
      return args[i + 1];
    }
  }

  return null;
}

// Initial project path from command line or environment variable
const initialProjectPath = parseProjectPathArg();

// Enable remote debugging for MCP server (development only)
// Note: This must be set before app.whenReady()
// Temporarily disabled due to vite-plugin-electron bundling issue
// if (process.env.NODE_ENV !== 'production' && !isE2ETest) {
//   app.commandLine.appendSwitch('remote-debugging-port', '9222');
// }

function createWindow(): void {
  const isDev = !app.isPackaged && !isE2ETest;
  const configStore = getConfigStore();
  const savedBounds = configStore.getWindowBounds();

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

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
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

  // Register IPC handlers
  registerIpcHandlers();

  // Create application menu
  createMenu();

  // Initialize with project path from command line if provided
  if (initialProjectPath) {
    logger.info('[main] Initial project path from command line', { initialProjectPath });

    // Validate project path exists
    if (existsSync(initialProjectPath)) {
      try {
        // Set the initial project path for IPC queries from renderer
        setInitialProjectPath(initialProjectPath);

        await setProjectPath(initialProjectPath);
        logger.info('[main] SpecManagerService initialized with project path', { initialProjectPath });

        // Add to recent projects
        const configStore = getConfigStore();
        configStore.addRecentProject(initialProjectPath);
      } catch (error) {
        logger.error('[main] Failed to initialize with project path', { error, initialProjectPath });
      }
    } else {
      logger.warn('[main] Project path does not exist', { initialProjectPath });
    }
  }

  // Create main window
  createWindow();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Export for testing
export { createWindow, mainWindow };
