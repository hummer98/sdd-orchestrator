/**
 * Electron Main Process Entry Point
 * Requirements: 11.1, 11.6, 11.7, 13.1, 13.2
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { registerIpcHandlers } from './ipc/handlers';
import { createMenu } from './menu';
import { getConfigStore } from './services/configStore';

let mainWindow: BrowserWindow | null = null;

// E2E test mode detection via command line argument
const isE2ETest = process.argv.includes('--e2e-test');

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
app.whenReady().then(() => {
  // Register IPC handlers
  registerIpcHandlers();

  // Create application menu
  createMenu();

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
