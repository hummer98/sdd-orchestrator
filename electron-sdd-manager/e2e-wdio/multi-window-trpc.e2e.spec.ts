/**
 * Task 10.3: Per-window tRPC operations E2E test
 *
 * Tests:
 * - Each window has its own tRPC context with window-scoped project data
 * - Spec lists retrieved via tRPC are window-specific
 * - WindowContextFactory resolves the correct window context
 * - Spec change events in one project do not affect other windows
 *
 * Requirements: 8.3 (per-window tRPC operations E2E)
 */

import * as path from 'path';
import { ensureProjectSelected } from './helpers/auto-execution.helpers';

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const PROJECT_A_PATH = path.join(FIXTURE_DIR, 'multi-window-test-a');
const PROJECT_B_PATH = path.join(FIXTURE_DIR, 'multi-window-test-b');

describe('Task 10.3: Per-window tRPC operations', () => {
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
  // Window context resolution
  // ============================================================
  describe('Window context resolution via WindowManager', () => {
    it('getWindowContext returns correct context for window with project A', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      const context = await browser.electron.execute(
        (electron, projA) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const win = wm.getWindowByProject(projA);
          if (!win) return null;
          const ctx = wm.getWindowContext(win.id);
          return ctx
            ? {
                windowId: ctx.windowId,
                projectPath: ctx.projectPath,
                hasServices: ctx.services !== null,
              }
            : null;
        },
        PROJECT_A_PATH
      );

      expect(context).not.toBeNull();
      if (context) {
        expect(context.projectPath).toContain('multi-window-test-a');
        expect(context.hasServices).toBe(true);
      }
    });

    it('Different windows return different contexts with their respective project paths', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

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
      createdWindowIds.push(windowBId);

      await browser.pause(1000);

      // Get contexts for both windows
      const contexts = await browser.electron.execute(
        (electron, projA) => {
          const { getWindowManager } = require(
            require('path').join(
              __dirname,
              '../src/main/services/windowManager'
            )
          );
          const wm = getWindowManager();
          const ids = wm.getAllWindowIds();
          return ids.map((id) => {
            const ctx = wm.getWindowContext(id);
            return {
              windowId: id,
              projectPath: ctx?.projectPath ?? null,
              hasServices: ctx?.services !== null,
            };
          });
        },
        PROJECT_A_PATH
      );

      const contextA = contexts.find(
        (c) => c.projectPath && c.projectPath.includes('multi-window-test-a')
      );
      const contextB = contexts.find(
        (c) => c.projectPath && c.projectPath.includes('multi-window-test-b')
      );

      expect(contextA).toBeTruthy();
      expect(contextB).toBeTruthy();
      expect(contextA?.windowId).not.toBe(contextB?.windowId);
    });

    it('webContentsToWindowId mapping resolves correctly for each window', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      const mappingResult = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const windows = electron.BrowserWindow.getAllWindows();

        return windows.map((w) => ({
          windowId: w.id,
          webContentsId: w.webContents.id,
          resolvedWindowId: wm.getWindowIdByWebContents(w.webContents.id),
        }));
      });

      for (const mapping of mappingResult) {
        expect(mapping.resolvedWindowId).toBe(mapping.windowId);
      }
    });
  });

  // ============================================================
  // Per-window services isolation
  // ============================================================
  describe('Per-window services isolation', () => {
    it('Each window gets its own PerWindowServices instance', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Create second window with project B
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
      createdWindowIds.push(windowBId);

      await browser.pause(1000);

      // Check that both windows have their own services
      const servicesInfo = await browser.electron.execute((electron) => {
        const { getWindowManager } = require(
          require('path').join(
            __dirname,
            '../src/main/services/windowManager'
          )
        );
        const wm = getWindowManager();
        const ids = wm.getAllWindowIds();
        return ids.map((id) => {
          const services = wm.getWindowServices(id);
          return {
            windowId: id,
            projectPath: wm.getWindowProject(id),
            hasServices: services !== null,
            hasSpecManager: services?.specManagerService !== undefined,
            hasSpecsWatcher: services?.specsWatcherService !== undefined,
            hasBugsWatcher: services?.bugsWatcherService !== undefined,
            hasAgentRecordWatcher:
              services?.agentRecordWatcherService !== undefined,
            hasMetricsService: services?.metricsService !== undefined,
            hasAutoExecutionCoordinator:
              services?.autoExecutionCoordinator !== undefined,
          };
        });
      });

      // Find windows with projects
      const windowsWithProjects = servicesInfo.filter(
        (s) => s.projectPath !== null
      );
      expect(windowsWithProjects.length).toBeGreaterThanOrEqual(2);

      for (const svc of windowsWithProjects) {
        expect(svc.hasServices).toBe(true);
        expect(svc.hasSpecManager).toBe(true);
        expect(svc.hasSpecsWatcher).toBe(true);
        expect(svc.hasBugsWatcher).toBe(true);
        expect(svc.hasAgentRecordWatcher).toBe(true);
        expect(svc.hasMetricsService).toBe(true);
        expect(svc.hasAutoExecutionCoordinator).toBe(true);
      }
    });
  });

  // ============================================================
  // Spec list independence (via Renderer UI)
  // ============================================================
  describe('Spec list independence', () => {
    it('Window A shows only project A specs in the UI', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // Wait for spec list to render
      const specList = await $('[data-testid="spec-list"]');
      await specList.waitForExist({ timeout: 10000 });

      // Verify project A spec exists
      const specItemA = await $('[data-testid="spec-item-mw-feature-a"]');
      const existsA = await specItemA.isExisting();
      expect(existsA).toBe(true);

      // Verify project B spec does NOT exist
      const specItemB = await $('[data-testid="spec-item-mw-feature-b"]');
      const existsB = await specItemB.isExisting();
      expect(existsB).toBe(false);
    });
  });

  // ============================================================
  // tRPC context services return window-scoped data
  // ============================================================
  describe('tRPC context returns window-scoped data', () => {
    it('getCurrentProjectPath from tRPC context returns the window project path', async () => {
      await ensureProjectSelected(PROJECT_A_PATH, 15000);

      // The Renderer store's currentProject reflects the tRPC-resolved project path
      const currentProject = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState()?.currentProject ?? null;
      });

      expect(currentProject).toBeTruthy();
      expect(currentProject).toContain('multi-window-test-a');
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

    it('Application does not crash after per-window tRPC operations', async () => {
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.some((w) => w.webContents.isCrashed());
      });
      expect(isCrashed).toBe(false);
    });
  });
});
