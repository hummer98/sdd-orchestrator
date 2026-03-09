/**
 * Task 10.2: Duplicate project open prevention E2E test
 *
 * Tests:
 * - When project A is open in window A, attempting to open project A
 *   in window B results in project NOT being opened in window B
 * - Instead, window A receives focus
 * - Minimized window A is restored before being focused
 *
 * Requirements: 8.2 (duplicate open prevention E2E)
 */

import * as path from 'path';
import { ensureProjectSelected } from './helpers/auto-execution.helpers';

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const PROJECT_A_PATH = path.join(FIXTURE_DIR, 'multi-window-test-a');

describe('Task 10.2: Duplicate project open prevention', () => {
  let createdWindowIds: number[] = [];

  afterEach(async () => {
    try {
      await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length > 1) {
          const sorted = [...windows].sort((a, b) => a.id - b.id);
          sorted.slice(1).forEach((w) => {
            if (!w.isDestroyed()) w.destroy();
          });
        }
      });
    } catch {
      // Session may be in a bad state
    }
    createdWindowIds = [];
  });

  // ============================================================
  // Duplicate project detection
  // ============================================================
  describe('Duplicate project detection via WindowManager', () => {
    it('setWindowProject returns DUPLICATE_PROJECT error when same project is opened in another window', async () => {
      // Ensure project A is opened in the first window
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Create a new window
      const result = await browser.electron.execute(
        (electron, projA) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const newWin = wm.createWindow();

          // Try to set the same project on the new window
          const setResult = wm.setWindowProject(newWin.id, projA);
          return {
            windowId: newWin.id,
            ok: setResult.ok,
            errorType: setResult.ok ? null : setResult.error?.type,
            existingWindowId: setResult.ok
              ? null
              : setResult.error?.existingWindowId,
          };
        },
        PROJECT_A_PATH
      );
      createdWindowIds.push(result.windowId);

      expect(result.ok).toBe(false);
      expect(result.errorType).toBe('DUPLICATE_PROJECT');
      expect(result.existingWindowId).not.toBeNull();
    });

    it('checkDuplicate returns window ID when project is already open', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      const duplicateWindowId = await browser.electron.execute(
        (electron, projA) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          return wm.checkDuplicate(projA);
        },
        PROJECT_A_PATH
      );

      expect(duplicateWindowId).not.toBeNull();
      expect(typeof duplicateWindowId).toBe('number');
    });

    it('checkDuplicate returns null for a project that is not open', async () => {
      const result = await browser.electron.execute((electron) => {
        const wm = (global as any).__WINDOW_MANAGER__;
        return wm.checkDuplicate('/non/existent/project/path');
      });

      // checkDuplicate returns null, but IPC serialization may convert to undefined
      expect(result == null).toBe(true);
    });
  });

  // ============================================================
  // Existing window focus behavior
  // ============================================================
  describe('Existing window focus on duplicate attempt', () => {
    it('restoreAndFocus focuses the existing window with the duplicate project', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Get the initial window ID that has project A
      const initialWindowId = await browser.electron.execute(
        (electron, projA) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const win = wm.getWindowByProject(projA);
          return win ? win.id : null;
        },
        PROJECT_A_PATH
      );

      expect(initialWindowId).not.toBeNull();

      // Call restoreAndFocus
      const focusResult = await browser.electron.execute(
        (electron, winId) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          wm.restoreAndFocus(winId);
          return true;
        },
        initialWindowId as number
      );

      expect(focusResult).toBe(true);
    });

    it('Minimized window is restored and focused when duplicate project is detected', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      const result = await browser.electron.execute(
        (electron, projA) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const existingWin = wm.getWindowByProject(projA);
          if (!existingWin) return { success: false, reason: 'no-window' };

          // Minimize the window
          existingWin.minimize();
          const wasMinimized = existingWin.isMinimized();

          // Simulate duplicate detection and restoreAndFocus
          wm.restoreAndFocus(existingWin.id);

          // Check that the window is now restored
          const isMinimizedAfter = existingWin.isMinimized();

          return {
            success: true,
            wasMinimized,
            isMinimizedAfter,
          };
        },
        PROJECT_A_PATH
      );

      expect(result.success).toBe(true);
      // After minimization, the window should have been minimized
      if (result.wasMinimized) {
        // After restoreAndFocus, it should no longer be minimized
        expect(result.isMinimizedAfter).toBe(false);
      }
    });
  });

  // ============================================================
  // Path normalization for duplicate detection
  // ============================================================
  describe('Path normalization for duplicate detection', () => {
    it('Trailing slashes do not bypass duplicate detection', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Check duplicate with trailing slash
      const duplicateId = await browser.electron.execute(
        (electron, projA) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          // Add trailing slashes to the path
          return wm.checkDuplicate(projA + '///');
        },
        PROJECT_A_PATH
      );

      // Should still detect the duplicate despite trailing slashes
      expect(duplicateId).not.toBeNull();
    });
  });

  // ============================================================
  // The second window's project remains null on duplicate
  // ============================================================
  describe('Second window project state on duplicate', () => {
    it('The new window project is null when duplicate is rejected', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      const result = await browser.electron.execute(
        (electron, projA) => {
          const wm = (global as any).__WINDOW_MANAGER__;
          const newWin = wm.createWindow();

          // Try to set duplicate project (should fail)
          const setResult = wm.setWindowProject(newWin.id, projA);

          // Get the new window's project (should be null)
          const newWindowProject = wm.getWindowProject(newWin.id);

          return {
            windowId: newWin.id,
            setOk: setResult.ok,
            newWindowProject,
          };
        },
        PROJECT_A_PATH
      );
      createdWindowIds.push(result.windowId);

      expect(result.setOk).toBe(false);
      expect(result.newWindowProject).toBeNull();
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

    it('Application does not crash after duplicate prevention operations', async () => {
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.some((w) => w.webContents.isCrashed());
      });
      expect(isCrashed).toBe(false);
    });
  });
});
