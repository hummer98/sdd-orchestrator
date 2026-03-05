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
  let createdWindowIds: number[] = [];

  afterEach(async () => {
    for (const windowId of createdWindowIds) {
      try {
        await browser.electron.execute((electron, winId) => {
          const win = electron.BrowserWindow.getAllWindows().find(
            (w) => w.id === winId
          );
          if (win && !win.isDestroyed()) {
            win.close();
          }
        }, windowId);
      } catch {
        // Window may already be closed
      }
    }
    createdWindowIds = [];
    await browser.pause(500);
  });

  // ============================================================
  // Service cleanup on window close
  // ============================================================
  describe('Service cleanup on window close', () => {
    it('PerWindowServices are removed after window close', async () => {
      // Create a second window with project B
      const windowBId = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);
          return win.id;
        },
        PROJECT_B_PATH
      );

      await browser.pause(1000);

      // Verify services exist before close
      const servicesBeforeClose = await browser.electron.execute(
        (electron, winId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          return wm.getWindowServices(winId) !== null;
        },
        windowBId
      );
      expect(servicesBeforeClose).toBe(true);

      // Close the second window
      await browser.electron.execute((electron, winId) => {
        const win = electron.BrowserWindow.getAllWindows().find(
          (w) => w.id === winId
        );
        if (win && !win.isDestroyed()) {
          win.close();
        }
      }, windowBId);

      // Wait for close event to propagate
      await browser.pause(1000);

      // Verify services are cleaned up
      const servicesAfterClose = await browser.electron.execute(
        (electron, winId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          return wm.getWindowServices(winId);
        },
        windowBId
      );
      expect(servicesAfterClose).toBeNull();
    });

    it('WindowState is removed after window close', async () => {
      const windowBId = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);
          return win.id;
        },
        PROJECT_B_PATH
      );

      await browser.pause(1000);

      // Verify the window is in the state map
      const contextBefore = await browser.electron.execute(
        (electron, winId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          return wm.getWindowContext(winId) !== null;
        },
        windowBId
      );
      expect(contextBefore).toBe(true);

      // Close the window
      await browser.electron.execute((electron, winId) => {
        const win = electron.BrowserWindow.getAllWindows().find(
          (w) => w.id === winId
        );
        if (win && !win.isDestroyed()) {
          win.close();
        }
      }, windowBId);

      await browser.pause(1000);

      // Verify the window state is cleaned up
      const contextAfter = await browser.electron.execute(
        (electron, winId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          return wm.getWindowContext(winId);
        },
        windowBId
      );
      expect(contextAfter).toBeNull();
    });

    it('Window ID is removed from getAllWindowIds after close', async () => {
      const windowBId = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);
          return win.id;
        },
        PROJECT_B_PATH
      );

      await browser.pause(500);

      // Verify the window ID is present
      const idsBefore = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        return getWindowManager().getAllWindowIds();
      });
      expect(idsBefore).toContain(windowBId);

      // Close the window
      await browser.electron.execute((electron, winId) => {
        const win = electron.BrowserWindow.getAllWindows().find(
          (w) => w.id === winId
        );
        if (win && !win.isDestroyed()) {
          win.close();
        }
      }, windowBId);

      await browser.pause(1000);

      // Verify the window ID is removed
      const idsAfter = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        return getWindowManager().getAllWindowIds();
      });
      expect(idsAfter).not.toContain(windowBId);
    });
  });

  // ============================================================
  // Duplicate lock release on window close
  // ============================================================
  describe('Duplicate lock release after window close', () => {
    it('A closed window project can be opened in a new window', async () => {
      // Create a window with project B
      const windowBId = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);
          return win.id;
        },
        PROJECT_B_PATH
      );

      await browser.pause(500);

      // Verify project B is now a duplicate (cannot be opened again)
      const duplicateBefore = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          return getWindowManager().checkDuplicate(projB);
        },
        PROJECT_B_PATH
      );
      expect(duplicateBefore).not.toBeNull();

      // Close the window with project B
      await browser.electron.execute((electron, winId) => {
        const win = electron.BrowserWindow.getAllWindows().find(
          (w) => w.id === winId
        );
        if (win && !win.isDestroyed()) {
          win.close();
        }
      }, windowBId);

      await browser.pause(1000);

      // Verify the duplicate lock is released
      const duplicateAfter = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          return getWindowManager().checkDuplicate(projB);
        },
        PROJECT_B_PATH
      );
      expect(duplicateAfter).toBeNull();

      // Now open project B in a new window (should succeed)
      const result = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const newWin = wm.createWindow();
          const setResult = wm.setWindowProject(newWin.id, projB);
          return {
            windowId: newWin.id,
            ok: setResult.ok,
          };
        },
        PROJECT_B_PATH
      );
      createdWindowIds.push(result.windowId);

      expect(result.ok).toBe(true);
    });

    it('webContentsToWindowId mapping is cleaned up after window close', async () => {
      // Create a window and note its webContents ID
      const windowInfo = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);
          return {
            windowId: win.id,
            webContentsId: win.webContents.id,
          };
        },
        PROJECT_B_PATH
      );

      await browser.pause(500);

      // Verify mapping exists before close
      const mappingBefore = await browser.electron.execute(
        (electron, wcId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          return getWindowManager().getWindowIdByWebContents(wcId);
        },
        windowInfo.webContentsId
      );
      expect(mappingBefore).toBe(windowInfo.windowId);

      // Close the window
      await browser.electron.execute((electron, winId) => {
        const win = electron.BrowserWindow.getAllWindows().find(
          (w) => w.id === winId
        );
        if (win && !win.isDestroyed()) {
          win.close();
        }
      }, windowInfo.windowId);

      await browser.pause(1000);

      // Verify mapping is cleaned up after close
      const mappingAfter = await browser.electron.execute(
        (electron, wcId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          return getWindowManager().getWindowIdByWebContents(wcId);
        },
        windowInfo.webContentsId
      );
      expect(mappingAfter).toBeNull();
    });
  });

  // ============================================================
  // First window remains functional after second window close
  // ============================================================
  describe('First window remains functional after second window close', () => {
    it('Primary window is not affected when secondary window is closed', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Get initial window info
      const initialWindowId = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows[0]?.id ?? null;
      });
      expect(initialWindowId).not.toBeNull();

      // Create and close a second window
      const secondWindowId = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.createWindow();
          wm.setWindowProject(win.id, projB);
          return win.id;
        },
        PROJECT_B_PATH
      );

      await browser.pause(500);

      // Close the second window
      await browser.electron.execute((electron, winId) => {
        const win = electron.BrowserWindow.getAllWindows().find(
          (w) => w.id === winId
        );
        if (win && !win.isDestroyed()) {
          win.close();
        }
      }, secondWindowId);

      await browser.pause(1000);

      // Verify the first window still works
      const firstWindowState = await browser.electron.execute(
        (electron, winId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const ctx = wm.getWindowContext(winId);
          const win = electron.BrowserWindow.getAllWindows().find(
            (w) => w.id === winId
          );
          return {
            exists: !!win,
            isDestroyed: win?.isDestroyed() ?? true,
            hasContext: ctx !== null,
            projectPath: ctx?.projectPath ?? null,
            hasServices: ctx?.services !== null,
          };
        },
        initialWindowId
      );

      expect(firstWindowState.exists).toBe(true);
      expect(firstWindowState.isDestroyed).toBe(false);
      expect(firstWindowState.hasContext).toBe(true);
      expect(firstWindowState.projectPath).toContain('multi-window-test-a');
      expect(firstWindowState.hasServices).toBe(true);
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
