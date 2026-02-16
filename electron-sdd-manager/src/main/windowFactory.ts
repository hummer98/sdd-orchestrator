/**
 * Window Factory
 * Creates and manages the main BrowserWindow instance.
 * Extracted from index.ts to eliminate circular dependencies with menu.ts and productionServices.ts.
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { getConfigStore } from './services/configStore';
import { projectLogger as logger } from './services/projectLogger';
import { setupTRPCHandler } from './trpc/handler';

let mainWindow: BrowserWindow | null = null;

/**
 * Get the current main window instance.
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Create the main application window.
 * CLI flags (--e2e-test, --headless) are read directly from process.argv.
 */
export function createWindow(): void {
  const isE2ETest = process.argv.includes('--e2e-test') || process.env.E2E_TEST === 'true';
  const isDev = !app.isPackaged && !isE2ETest;
  const configStore = getConfigStore();
  const savedBounds = configStore.getWindowBounds();

  const isHeadless = process.argv.includes('--headless');

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
      additionalArguments: isE2ETest ? ['--is-e2e'] : [],
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // trpc-infrastructure: Register tRPC IPC handler (DD-005)
  // Must be called after BrowserWindow creation
  // Inject createNewWindow as serviceOverride so productionServices.ts doesn't need
  // to reverse-import from this module (eliminates circular dependency).
  setupTRPCHandler(mainWindow, {
    createNewWindow: async () => createWindow(),
  });

  // Show window when ready (unless headless mode)
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

  // ipclink-singleton-unification Task 3.1: Forward Renderer console output to Main process log
  // All environments (previously E2E-only). Replaces consoleHook.ts (SSOT/KISS, DD-003).
  // Level mapping: 0=debug, 1=info, 2=warn, 3=error (Electron native console-message event)
  {
    const logMethods: Record<number, (msg: string, meta?: Record<string, unknown>) => void> = {
      0: (msg, meta) => logger.debug(msg, meta),
      1: (msg, meta) => logger.info(msg, meta),
      2: (msg, meta) => logger.warn(msg, meta),
      3: (msg, meta) => logger.error(msg, meta),
    };
    // Noise patterns: HMR, Vite dev server, React DevTools messages
    const noisePatterns = [
      /^\[HMR\]/,
      /^\[vite\]/,
      /^Download the React DevTools/,
    ];
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      try {
        // Filter out dev-tooling noise from log files
        if (noisePatterns.some((p) => p.test(message))) return;
        const source = sourceId ? sourceId.split('/').pop() : '';
        const logMethod = logMethods[level] ?? logMethods[1];
        logMethod(`[Renderer Console] ${message}`, { line, source });
      } catch (error) {
        logger.error('[main] Error in console-message listener', { error });
      }
    });
  }

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}
