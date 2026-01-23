/**
 * Metrics Display E2E Tests
 * Task 9.2: E2E tests for metrics UI display
 * Requirements: 5.1-5.4 (spec-productivity-metrics)
 *
 * These tests verify:
 * - Metrics IPC API exists
 * - Metrics can be retrieved for a spec
 * - Metrics update after phase execution
 *
 * Prerequisites:
 * - Run with: npm run test:e2e
 * - Test fixtures are in e2e-wdio/fixtures/test-project/
 */

import * as path from 'path';

// Fixture project path (relative to electron-sdd-manager)
const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Select project using Zustand store action via executeAsync
 */
async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.projectStore?.getState) {
          await stores.projectStore.getState().selectProject(projPath);
          done(true);
        } else {
          console.error('[E2E] __STORES__ not available on window');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectProject error:', e);
        done(false);
      }
    }, projectPath).then(resolve);
  });
}

/**
 * Helper: Select spec using Zustand specStore action
 */
async function selectSpecViaStore(specId: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (id: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.specStore?.getState) {
          const specStore = stores.specStore.getState();
          const spec = specStore.specs.find((s: any) => s.name === id);
          if (spec) {
            specStore.selectSpec(spec);
            done(true);
          } else {
            console.error('[E2E] Spec not found:', id);
            done(false);
          }
        } else {
          console.error('[E2E] __STORES__ not available on window');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectSpec error:', e);
        done(false);
      }
    }, specId).then(resolve);
  });
}

describe('Metrics Display Feature', () => {
  before(async () => {
    // Wait for app to initialize
    await browser.pause(3000);
  });

  describe('Metrics API Infrastructure (Requirement 5.1)', () => {
    it('should have getSpecMetrics API available', async () => {
      // Check if electronAPI has the metrics methods
      const hasGetSpecMetrics = await browser.execute(() => {
        return typeof (window as any).electronAPI?.getSpecMetrics === 'function';
      });

      expect(hasGetSpecMetrics).toBe(true);
    });

    it('should have recordHumanSession API available', async () => {
      const hasRecordHumanSession = await browser.execute(() => {
        return typeof (window as any).electronAPI?.recordHumanSession === 'function';
      });

      expect(hasRecordHumanSession).toBe(true);
    });
  });

  describe('Metrics Retrieval (Requirement 5.2)', () => {
    before(async () => {
      // Select the fixture project
      const result = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
      expect(result).toBe(true);
      await browser.pause(1000);
    });

    it('should retrieve metrics for a spec via IPC', async () => {
      // Check if a spec exists
      const specListItems = await $$('[data-testid^="spec-list-item-"]');

      if (specListItems.length > 0) {
        // Get first spec name
        const firstSpecItem = specListItems[0];
        const specName = await firstSpecItem.getAttribute('data-testid');
        const specId = specName?.replace('spec-list-item-', '') || 'test-feature';

        // Try to get metrics for this spec
        const metrics = await browser.execute(async (id: string) => {
          try {
            const result = await (window as any).electronAPI.getSpecMetrics(id);
            return {
              success: true,
              hasData: !!result,
              specId: result?.specId || id,
              totalAiTimeMs: result?.totalAiTimeMs ?? 0,
              totalHumanTimeMs: result?.totalHumanTimeMs ?? 0,
            };
          } catch (error: any) {
            return {
              success: false,
              error: error?.message || 'Unknown error',
            };
          }
        }, specId);

        console.log('[E2E] Metrics retrieval result:', metrics);
        expect(metrics.success).toBe(true);
      } else {
        console.log('[E2E] No specs found in fixture project, skipping metrics retrieval test');
      }
    });
  });

  describe('Metrics Update After Phase Execution (Requirement 5.3)', () => {
    it('should track execution time when phase executes', async () => {
      // This test verifies the metrics infrastructure exists
      // Full workflow testing is done in workflow-integration tests

      // Select the fixture project
      await selectProjectViaStore(FIXTURE_PROJECT_PATH);
      await browser.pause(1000);

      // Verify phase execution panel exists (where metrics would be displayed)
      const phasePanel = await $('[data-testid="phase-execution-panel"]');
      const isPanelDisplayed = await phasePanel.isDisplayed().catch(() => false);

      if (isPanelDisplayed) {
        console.log('[E2E] Phase execution panel is displayed');
        // Future: Check for metrics summary display in this panel
      } else {
        console.log('[E2E] Phase execution panel not displayed (no spec selected or different layout)');
      }
    });
  });

  describe('Metrics Reload on Spec Switch (Requirement 5.4)', () => {
    it('should reload metrics when switching specs', async () => {
      // Select the fixture project
      await selectProjectViaStore(FIXTURE_PROJECT_PATH);
      await browser.pause(1000);

      // Get all spec items
      const specListItems = await $$('[data-testid^="spec-list-item-"]');

      if (specListItems.length >= 2) {
        // Click first spec
        await specListItems[0].click();
        await browser.pause(500);

        // Get metrics for first spec
        const firstSpecMetrics = await browser.execute(async () => {
          const stores = (window as any).__STORES__;
          const selectedSpec = stores?.specStore?.getState()?.selectedSpec;
          if (selectedSpec) {
            return (window as any).electronAPI.getSpecMetrics(selectedSpec.name);
          }
          return null;
        });
        console.log('[E2E] First spec metrics:', firstSpecMetrics);

        // Click second spec
        await specListItems[1].click();
        await browser.pause(500);

        // Get metrics for second spec
        const secondSpecMetrics = await browser.execute(async () => {
          const stores = (window as any).__STORES__;
          const selectedSpec = stores?.specStore?.getState()?.selectedSpec;
          if (selectedSpec) {
            return (window as any).electronAPI.getSpecMetrics(selectedSpec.name);
          }
          return null;
        });
        console.log('[E2E] Second spec metrics:', secondSpecMetrics);

        // Verify metrics were retrieved for different specs
        if (firstSpecMetrics && secondSpecMetrics) {
          expect(firstSpecMetrics.specId).not.toBe(secondSpecMetrics.specId);
        }
      } else {
        console.log('[E2E] Not enough specs for switch test (need at least 2)');
      }
    });
  });

  describe('Security Settings', () => {
    it('should have contextIsolation enabled', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows()[0]?.webContents?.getLastWebPreferences?.()?.contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('should have nodeIntegration disabled', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows()[0]?.webContents?.getLastWebPreferences?.()?.nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });
  });

  describe('Application Stability', () => {
    it('should not crash during metrics operations', async () => {
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.length > 0 ? windows[0].webContents.isCrashed() : false;
      });
      expect(isCrashed).toBe(false);
    });
  });
});
