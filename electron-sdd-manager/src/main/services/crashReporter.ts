/**
 * Crash Reporter Service
 *
 * Writes crash/error information to a fixed-path log file independent of
 * the project logger. This ensures errors are always captured, even when:
 * - The project logger is not yet initialized
 * - dialog.showErrorBox is called (which blocks the process)
 * - Errors occur during very early startup
 *
 * Crash log location:
 * - Production: ~/Library/Logs/SDD Orchestrator/crash.log
 * - Development: electron-sdd-manager/logs/crash.log
 *
 * Also intercepts dialog.showErrorBox to:
 * - Always log the error before showing the dialog
 * - Skip the dialog in non-interactive mode (E2E, background)
 */

import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';

/** Fixed crash log path, determined once at initialization */
let crashLogPath: string | null = null;

/** Whether we're in non-interactive mode (E2E, background) */
let nonInteractive = false;

/** Original dialog.showErrorBox (before interception) */
let originalShowErrorBox: typeof dialog.showErrorBox | null = null;

/**
 * Get the crash log directory path.
 * Uses the same directory logic as projectLogger for consistency.
 */
function getCrashLogDir(): string {
  if (process.env.SDD_LOG_DIR) {
    return process.env.SDD_LOG_DIR;
  }
  if (app.isPackaged) {
    return app.getPath('logs');
  }
  // Development: electron-sdd-manager/logs/
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  return path.join(projectRoot, 'logs');
}

/**
 * Write a crash entry to the crash log file.
 * Uses synchronous fs operations to ensure the log is written
 * even during process crash/exit scenarios.
 */
export function writeCrashLog(title: string, body: string): void {
  if (!crashLogPath) return;

  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [CRASH] ${title}\n${body}\n${'─'.repeat(60)}\n`;

  try {
    fs.appendFileSync(crashLogPath, entry, 'utf-8');
  } catch {
    // Last resort: stderr
    try {
      process.stderr.write(`[CrashReporter] Failed to write crash log. Entry:\n${entry}`);
    } catch {
      // Nothing we can do
    }
  }

  // Also write to stderr so parent process can capture it
  try {
    process.stderr.write(`[CrashReporter] ${title}: ${body.split('\n')[0]}\n`);
  } catch {
    // Ignore stderr errors (EPIPE, EIO)
  }
}

/**
 * Initialize the crash reporter.
 * Must be called as early as possible in the main process startup.
 *
 * @param isNonInteractive - If true, dialog.showErrorBox will be skipped
 */
export function initCrashReporter(isNonInteractive: boolean): void {
  nonInteractive = isNonInteractive;

  // Create crash log directory and file path
  const logDir = getCrashLogDir();
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    crashLogPath = path.join(logDir, 'crash.log');
  } catch (error) {
    // If we can't create the directory, log to stderr and continue
    process.stderr.write(`[CrashReporter] Failed to initialize crash log directory: ${error}\n`);
    return;
  }

  // Intercept dialog.showErrorBox
  interceptShowErrorBox();

  writeCrashLog('CrashReporter initialized', `logPath=${crashLogPath}, nonInteractive=${nonInteractive}`);
}

/**
 * Intercept dialog.showErrorBox to:
 * 1. Always log the error to crash log
 * 2. Skip the dialog in non-interactive mode
 */
function interceptShowErrorBox(): void {
  originalShowErrorBox = dialog.showErrorBox.bind(dialog);

  dialog.showErrorBox = (title: string, content: string): void => {
    // Always log to crash file
    writeCrashLog(`showErrorBox: ${title}`, content);

    // In non-interactive mode, skip the blocking dialog
    if (nonInteractive) {
      process.stderr.write(`[CrashReporter] Skipped showErrorBox in non-interactive mode: ${title}\n`);
      return;
    }

    // Show the dialog normally in interactive mode
    originalShowErrorBox!(title, content);
  };
}

/**
 * Get the crash log file path (for external tools to read).
 */
export function getCrashLogPath(): string | null {
  return crashLogPath;
}
