/**
 * Recent Projects List E2E Tests
 *
 * Coverage:
 * - UC1.3: Recent projects display in ProjectSelectionView
 *
 * Test Scenarios:
 * - UJ-001: After project selection, recent project list appears on project selection view
 * - UJ-002: Recent project list contains the previously selected project
 *
 * Preconditions:
 * - Uses test-project fixture (default)
 * - Tests navigate back to ProjectSelectionView after initial project selection
 */

import * as path from 'path';
import { ensureProjectSelected, waitForProjectUIReady, dismissDialogs } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Navigate to ProjectSelectionView by deselecting project
 */
async function navigateToProjectSelection(): Promise<void> {
  // Use store to clear current project (state key is `currentProject`)
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.project?.setState) return;
    stores.project.setState({
      currentProject: null,
    });
  });
  await browser.pause(500);
}

/**
 * Helper: Check if ProjectSelectionView is visible
 */
async function isProjectSelectionViewVisible(): Promise<boolean> {
  return browser.execute(() => {
    // ProjectSelectionView has the "プロジェクトを選択" heading or folder button
    const text = document.body.textContent || '';
    return text.includes('プロジェクトを選択') || text.includes('フォルダを選択');
  });
}

describe('Recent Projects E2E', () => {
  before(async () => {
    await browser.electron.execute((electron) => {
      const windows = electron.BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].setSize(1280, 900);
        windows[0].center();
      }
    });
    await browser.pause(500);

    // First, select a project to populate recent projects list
    await ensureProjectSelected(FIXTURE_PROJECT_PATH);
    await waitForProjectUIReady(15000);
    await dismissDialogs();
  });

  // ============================================================
  // UJ-001: Recent projects list visibility
  // ============================================================
  describe('UJ-001: Recent projects list on selection view', () => {
    before(async () => {
      // Navigate back to project selection view
      await navigateToProjectSelection();
      await browser.pause(500);
    });

    it('ProjectSelectionView is displayed', async () => {
      const isVisible = await isProjectSelectionViewVisible();
      expect(isVisible).toBe(true);
    });

    it('Recent project list container exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="recent-project-list"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Recent project content
  // ============================================================
  describe('UJ-002: Recent project list content', () => {
    before(async () => {
      if (!(await isProjectSelectionViewVisible())) {
        await navigateToProjectSelection();
        await browser.pause(500);
      }
    });

    it('Recent project list contains at least one project', async () => {
      const recentList = await browser.execute(() => {
        const container = document.querySelector('[data-testid="recent-project-list"]');
        if (!container) return 0;
        return container.querySelectorAll('button').length;
      });
      expect(recentList).toBeGreaterThan(0);
    });

    it('Recent project list shows the fixture project path', async () => {
      const listText = await browser.execute(() => {
        const container = document.querySelector('[data-testid="recent-project-list"]');
        return container ? container.textContent || '' : '';
      });
      // Should contain the fixture project folder name
      expect(listText).toContain('test-project');
    });
  });

  // ============================================================
  // Security and Stability
  // ============================================================
  describe('Security and Stability', () => {
    it('contextIsolation is enabled', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return undefined;
        const prefs = windows[0].webContents.getWebPreferences();
        return prefs ? prefs.contextIsolation : undefined;
      });
      expect(contextIsolation === true || contextIsolation === undefined).toBe(true);
    });

    it('nodeIntegration is disabled', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return undefined;
        const prefs = windows[0].webContents.getWebPreferences();
        return prefs ? prefs.nodeIntegration : undefined;
      });
      expect(nodeIntegration === false || nodeIntegration === undefined).toBe(true);
    });

    it('Application has not crashed', async () => {
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.isCrashed();
      });
      expect(isCrashed).toBe(false);
    });
  });
});
