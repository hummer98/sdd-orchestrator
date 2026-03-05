/**
 * Task 10.1: Multi-window creation and independent project operation E2E test
 *
 * Tests:
 * - Creating a new window via WindowManager
 * - Each window can open a different project
 * - Each window shows the correct project name in its title
 * - Each window has independent spec lists
 *
 * Requirements: 8.1 (multi-window E2E)
 */

import * as path from 'path';
import { ensureProjectSelected } from './helpers/auto-execution.helpers';

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const PROJECT_A_PATH = path.join(FIXTURE_DIR, 'multi-window-test-a');
const PROJECT_B_PATH = path.join(FIXTURE_DIR, 'multi-window-test-b');

describe('Task 10.1: Multi-window creation and independent project operation', () => {
  // Track window IDs created during tests for cleanup
  let createdWindowIds: number[] = [];

  afterEach(async () => {
    // Close any extra windows created during tests (keep the first one)
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
    // Small delay to let close events propagate
    await browser.pause(500);
  });

  // ============================================================
  // Window creation basics
  // ============================================================
  describe('New window creation', () => {
    it('WindowManager creates a new BrowserWindow', async () => {
      const initialCount = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows().length;
      });

      // Create a new window via WindowManager
      const newWindowId = await browser.electron.execute((electron) => {
        // Access the WindowManager singleton from the main process
        // WindowManager is initialized during app startup
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const win = wm.createWindow();
        return win.id;
      });
      createdWindowIds.push(newWindowId);

      expect(typeof newWindowId).toBe('number');

      // Wait for window to be created
      await browser.pause(1000);

      const afterCount = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows().length;
      });

      expect(afterCount).toBe(initialCount + 1);
    });

    it('New window is registered in WindowManager', async () => {
      const newWindowId = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const win = wm.createWindow();
        return win.id;
      });
      createdWindowIds.push(newWindowId);

      await browser.pause(500);

      const allWindowIds = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        return wm.getAllWindowIds();
      });

      expect(allWindowIds).toContain(newWindowId);
    });

    it('Each created window has a unique ID', async () => {
      const firstId = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const win = wm.createWindow();
        return win.id;
      });
      createdWindowIds.push(firstId);

      const secondId = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const win = wm.createWindow();
        return win.id;
      });
      createdWindowIds.push(secondId);

      expect(firstId).not.toBe(secondId);
    });
  });

  // ============================================================
  // Independent project operation
  // ============================================================
  describe('Independent project operation', () => {
    it('Window A opens project A via SDD_PROJECT_PATH (initial window)', async () => {
      // The first window should already have a project selected via SDD_PROJECT_PATH
      // (multi-window-test-a is the fixture configured for this test file)
      const projectSelected = await ensureProjectSelected(PROJECT_A_PATH, 15000);
      expect(projectSelected).toBe(true);

      const currentProject = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState()?.currentProject ?? null;
      });
      expect(currentProject).toBeTruthy();
      expect(currentProject).toContain('multi-window-test-a');
    });

    it('Window title shows the project name', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      const title = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return null;
        // Find the focused window or use the first one
        const focused = electron.BrowserWindow.getFocusedWindow();
        return (focused || windows[0]).getTitle();
      });

      expect(title).not.toBeNull();
      if (title) {
        expect(title).toContain('multi-window-test-a');
      }
    });

    it('Window A project is registered in WindowManager', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      const windowManagerState = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const windowIds = wm.getAllWindowIds();
        const result: { windowId: number; projectPath: string | null }[] = [];
        for (const id of windowIds) {
          result.push({
            windowId: id,
            projectPath: wm.getWindowProject(id),
          });
        }
        return result;
      });

      const projectPaths = windowManagerState
        .map((w) => w.projectPath)
        .filter(Boolean);
      const hasProjectA = projectPaths.some(
        (p) => p && p.includes('multi-window-test-a')
      );
      expect(hasProjectA).toBe(true);
    });

    it('A new window starts without a project (project is null)', async () => {
      const newWindowId = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const win = wm.createWindow();
        return win.id;
      });
      createdWindowIds.push(newWindowId);

      await browser.pause(500);

      const newWindowProject = await browser.electron.execute(
        (electron, winId) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          return wm.getWindowProject(winId);
        },
        newWindowId
      );

      expect(newWindowProject).toBeNull();
    });

    it('Setting different projects on different windows registers them independently', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Create a second window and set project B on it
      const newWindowId = await browser.electron.execute(
        (electron, projB) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.createWindow();
          const result = wm.setWindowProject(win.id, projB);
          return { windowId: win.id, result };
        },
        PROJECT_B_PATH
      );
      createdWindowIds.push(newWindowId.windowId);

      await browser.pause(1000);

      // Verify both projects are registered independently
      const windowStates = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const ids = wm.getAllWindowIds();
        return ids.map((id) => ({
          windowId: id,
          projectPath: wm.getWindowProject(id),
        }));
      });

      const projects = windowStates
        .map((s) => s.projectPath)
        .filter(Boolean);
      const hasA = projects.some((p) => p && p.includes('multi-window-test-a'));
      const hasB = projects.some((p) => p && p.includes('multi-window-test-b'));

      expect(hasA).toBe(true);
      expect(hasB).toBe(true);
    });
  });

  // ============================================================
  // Window title reflects project name
  // ============================================================
  describe('Window titles reflect project names', () => {
    it('Each window title contains its own project name', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Create a second window with project B
      const newWindowId = await browser.electron.execute(
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
      createdWindowIds.push(newWindowId);

      await browser.pause(1000);

      // Get all window titles
      const titles = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows().map((w) => ({
          id: w.id,
          title: w.getTitle(),
        }));
      });

      // Find window A and window B titles
      const titleWithA = titles.find((t) =>
        t.title.includes('multi-window-test-a')
      );
      const titleWithB = titles.find((t) =>
        t.title.includes('multi-window-test-b')
      );

      expect(titleWithA).toBeTruthy();
      expect(titleWithB).toBeTruthy();
    });
  });

  // ============================================================
  // Spec lists are independent per window
  // ============================================================
  describe('Spec lists are independent per window', () => {
    it('Window A Spec list contains only project A specs', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Wait for spec list to render
      const specList = await $('[data-testid="spec-list"]');
      await specList.waitForExist({ timeout: 10000 });

      // Check that project A spec is listed
      const specItem = await $('[data-testid="spec-item-mw-feature-a"]');
      const exists = await specItem.isExisting();
      expect(exists).toBe(true);

      // Check that project B spec is NOT listed
      const specItemB = await $('[data-testid="spec-item-mw-feature-b"]');
      const existsB = await specItemB.isExisting();
      expect(existsB).toBe(false);
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

    it('Application does not crash after multi-window operations', async () => {
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.some((w) => w.webContents.isCrashed());
      });
      expect(isCrashed).toBe(false);
    });
  });
});
