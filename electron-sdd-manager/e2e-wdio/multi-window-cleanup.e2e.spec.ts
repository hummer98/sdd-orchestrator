/**
 * Task 10.4: Window close resource cleanup E2E test
 *
 * Tests:
 * - When a window with a project is closed, file watchers are stopped
 * - After closing, the project's duplicate lock is released
 * - The released project can be opened in a new window
 * - WindowManager state is cleaned up after window close
 *
 * Requirements: 8.4 (resource cleanup E2E)
 */

import * as path from 'path';
import { ensureProjectSelected } from './helpers/auto-execution.helpers';

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const PROJECT_A_PATH = path.join(FIXTURE_DIR, 'multi-window-test-a');
const PROJECT_B_PATH = path.join(FIXTURE_DIR, 'multi-window-test-b');

describe('Task 10.4: Window close resource cleanup', () => {

  afterEach(async () => {
    // Clean up extra windows (all tests use destroy() inline now, but just in case)
    try {
      await browser.electron.execute((electron) => {
        const wm = (global as any).__WINDOW_MANAGER__;
        const windows = electron.BrowserWindow.getAllWindows();
        // Keep only the first window (main test window)
        if (windows.length > 1) {
          windows.slice(1).forEach((w) => {
            if (!w.isDestroyed()) w.destroy();
          });
        }
      });
    } catch {
      // Session may be in a bad state
    }
  });

  // ============================================================
  // Service cleanup on window close
  // ============================================================
  describe('Service cleanup on window close', () => {
    it('PerWindowServices are removed after window close', async () => {
      // Create, verify, close, and verify cleanup all in one execute call
      // to avoid WDIO session being hijacked by the new window
      const result = await browser.electron.execute(
        (electron, projB) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);

          const servicesBefore = wm.getWindowServices(win.id) !== null;

          // Use destroy() to avoid async close event issues
          win.destroy();

          // handleWindowClose is triggered synchronously by destroy
          const servicesAfter = wm.getWindowServices(win.id);

          return {
            servicesBefore,
            servicesAfterIsNull: servicesAfter === null,
          };
        },
        PROJECT_B_PATH
      );

      expect(result.servicesBefore).toBe(true);
      expect(result.servicesAfterIsNull).toBe(true);
    });

    it('WindowState is removed after window close', async () => {
      const result = await browser.electron.execute(
        (electron, projB) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);

          const contextBefore = wm.getWindowContext(win.id) !== null;
          win.destroy();
          const contextAfter = wm.getWindowContext(win.id);

          return {
            contextBefore,
            contextAfterIsNull: contextAfter === null,
          };
        },
        PROJECT_B_PATH
      );

      expect(result.contextBefore).toBe(true);
      expect(result.contextAfterIsNull).toBe(true);
    });

    it('Window ID is removed from getAllWindowIds after close', async () => {
      const result = await browser.electron.execute(
        (electron, projB) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);

          const idsBefore = wm.getAllWindowIds();
          const containsBefore = idsBefore.includes(win.id);

          win.destroy();

          const idsAfter = wm.getAllWindowIds();
          const containsAfter = idsAfter.includes(win.id);

          return { containsBefore, containsAfter };
        },
        PROJECT_B_PATH
      );

      expect(result.containsBefore).toBe(true);
      expect(result.containsAfter).toBe(false);
    });
  });

  // ============================================================
  // Duplicate lock release on window close
  // ============================================================
  describe('Duplicate lock release after window close', () => {
    it('A closed window project can be opened in a new window', async () => {
      const result = await browser.electron.execute(
        (electron, projB) => {
          const wm = (global as any).__WINDOW_MANAGER__;

          // Create window with project B
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);

          // Verify duplicate detection
          const duplicateBefore = wm.checkDuplicate(projB);

          // Close the window
          win.destroy();

          // Verify duplicate lock released
          const duplicateAfter = wm.checkDuplicate(projB);

          // Re-open project B in a new window
          const newWin = wm.createWindow();
          const setResult = wm.setWindowProject(newWin.id, projB);

          // Clean up the new window
          newWin.destroy();

          return {
            duplicateBeforeNotNull: duplicateBefore !== null,
            duplicateAfterIsNull: duplicateAfter === null,
            reopenOk: setResult.ok,
          };
        },
        PROJECT_B_PATH
      );

      expect(result.duplicateBeforeNotNull).toBe(true);
      expect(result.duplicateAfterIsNull).toBe(true);
      expect(result.reopenOk).toBe(true);
    });

    it('webContentsToWindowId mapping is cleaned up after window close', async () => {
      const result = await browser.electron.execute(
        (electron, projB) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const win = wm.createWindow();
          const wcId = win.webContents.id;
          wm.setWindowProject(win.id, projB);

          const mappingBefore = wm.getWindowIdByWebContents(wcId);
          const matchesBefore = mappingBefore === win.id;

          win.destroy();

          const mappingAfter = wm.getWindowIdByWebContents(wcId);

          return {
            matchesBefore,
            mappingAfterIsNull: mappingAfter === null,
          };
        },
        PROJECT_B_PATH
      );

      expect(result.matchesBefore).toBe(true);
      expect(result.mappingAfterIsNull).toBe(true);
    });
  });

  // ============================================================
  // First window remains functional after second window close
  // ============================================================
  describe('First window remains functional after second window close', () => {
    it('Primary window is not affected when secondary window is closed', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Create, close second window, and verify first window - all in one execute
      const result = await browser.electron.execute(
        (electron, projB) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const initialWin = electron.BrowserWindow.getAllWindows()[0];
          if (!initialWin) return { exists: false } as any;
          const initialWinId = initialWin.id;

          // Create and close second window
          const secondWin = wm.createWindow();
          wm.setWindowProject(secondWin.id, projB);
          secondWin.destroy();

          // Verify first window still intact
          const ctx = wm.getWindowContext(initialWinId);
          const win = electron.BrowserWindow.getAllWindows().find(
            (w) => w.id === initialWinId
          );
          return {
            exists: !!win,
            isDestroyed: win?.isDestroyed() ?? true,
            hasContext: ctx !== null,
            projectPath: ctx?.projectPath ?? null,
            hasServices: ctx?.services !== null,
          };
        },
        PROJECT_B_PATH
      );

      expect(result.exists).toBe(true);
      expect(result.isDestroyed).toBe(false);
      expect(result.hasContext).toBe(true);
      expect(result.projectPath).toContain('multi-window-test-a');
      expect(result.hasServices).toBe(true);
    });
  });

  // ============================================================
  // Security and stability
  // ============================================================
  describe('Security and stability', () => {
    it('contextIsolation is enabled', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows[0]?.webContents?.getLastWebPreferences()?.contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('nodeIntegration is disabled', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows[0]?.webContents?.getLastWebPreferences()?.nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });

    it('Application does not crash after window close operations', async () => {
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.some((w) => w.webContents.isCrashed());
      });
      expect(isCrashed).toBe(false);
    });
  });
});
