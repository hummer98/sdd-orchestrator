/**
 * Project Switch Warning E2E Tests
 *
 * Coverage:
 * - UC1.4: Project switch with running agents warning (ProjectSwitchConfirmDialog)
 *
 * Test Scenarios:
 * - UJ-001: Trigger project switch with running agents → dialog appears
 * - UJ-002: Cancel button → dialog closes, switch does not happen
 * - UJ-003: Confirm button → dialog closes, switch proceeds
 */

import * as path from 'path';
import { ensureProjectSelected, waitForProjectUIReady } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Dismiss any modal overlays that may block interactions.
 */
async function dismissOverlays(): Promise<void> {
  const dismissed = await browser.execute(() => {
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (!dialog) return false;
    const backdrop = dialog.querySelector('.absolute.inset-0') as HTMLElement | null;
    if (backdrop) {
      backdrop.click();
      return true;
    }
    return false;
  });

  if (dismissed) {
    await browser.pause(500);
  }

  const stillOpen = await browser.execute(() => {
    return !!document.querySelector('[role="dialog"][aria-modal="true"]');
  });
  if (stillOpen) {
    await browser.execute(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (dialog) {
        (dialog as HTMLElement).style.display = 'none';
      }
    });
    await browser.pause(300);
  }
}

/**
 * Helper: Open ProjectSwitchConfirmDialog via connectionStore.
 * This is a setup operation that directly sets store state to trigger the dialog.
 */
async function openProjectSwitchConfirmDialog(
  runningAgentsCount: number,
  targetPath: string
): Promise<void> {
  await browser.execute((count: number, path: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.connection?.setState) return;
    stores.connection.setState({
      projectSwitchConfirm: {
        isOpen: true,
        runningAgentsCount: count,
        targetProject: { type: 'local', path },
        resolve: () => {},
      },
    });
  }, runningAgentsCount, targetPath);
  await browser.pause(300);
}

/**
 * Helper: Close ProjectSwitchConfirmDialog by resetting store state
 */
async function closeProjectSwitchConfirmDialog(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.connection?.setState) return;
    stores.connection.setState({
      projectSwitchConfirm: {
        isOpen: false,
        runningAgentsCount: 0,
        targetProject: null,
        resolve: null,
      },
    });
  });
  await browser.pause(300);
}

/**
 * Helper: Check if the ProjectSwitchConfirmDialog is visible.
 * Since it has no data-testid, we check for its unique text content.
 */
async function isProjectSwitchDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    // Look for the dialog by its unique text content
    const elements = document.querySelectorAll('h4');
    for (const el of elements) {
      // The dialog title includes agent count info
      if (el.textContent?.includes('実行中のエージェント') ||
          el.textContent?.includes('running agent')) {
        return true;
      }
    }
    // Also check for the confirm button text
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.includes('停止して続行')) {
        return true;
      }
    }
    return false;
  });
}

describe('Project Switch Warning E2E', () => {
  before(async () => {
    await browser.electron.execute((electron) => {
      const windows = electron.BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].setSize(1280, 900);
        windows[0].center();
      }
    });
    await browser.pause(500);

    await ensureProjectSelected(FIXTURE_PROJECT_PATH);
    await waitForProjectUIReady(15000);
    await dismissOverlays();
  });

  afterEach(async () => {
    // Clean up dialog state
    await closeProjectSwitchConfirmDialog();
  });

  // ============================================================
  // UJ-001: Dialog appears when switching with running agents
  // ============================================================
  describe('UJ-001: Project switch warning dialog', () => {
    it('Dialog appears when agents are running and project switch is requested', async () => {
      // Trigger dialog via store (simulate running agents)
      await openProjectSwitchConfirmDialog(2, '/tmp/other-project');

      const isVisible = await isProjectSwitchDialogVisible();
      expect(isVisible).toBe(true);
    });

    it('Dialog shows running agents count', async () => {
      await openProjectSwitchConfirmDialog(3, '/tmp/other-project');

      const dialogText = await browser.execute(() => {
        const body = document.body.textContent || '';
        return body;
      });

      // Dialog should mention the count of running agents
      expect(dialogText).toContain('3');
    });

    it('Dialog shows target project path', async () => {
      await openProjectSwitchConfirmDialog(1, '/tmp/target-project');

      const dialogText = await browser.execute(() => {
        const body = document.body.textContent || '';
        return body;
      });

      expect(dialogText).toContain('/tmp/target-project');
    });
  });

  // ============================================================
  // UJ-002: Cancel button
  // ============================================================
  describe('UJ-002: Cancel project switch', () => {
    it('Cancel button closes the dialog', async () => {
      await openProjectSwitchConfirmDialog(1, '/tmp/other-project');

      // Click Cancel button (text: "キャンセル" or the X button)
      await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === 'キャンセル') {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(500);

      const isVisible = await isProjectSwitchDialogVisible();
      expect(isVisible).toBe(false);
    });
  });

  // ============================================================
  // UJ-003: Confirm button
  // ============================================================
  describe('UJ-003: Confirm project switch', () => {
    it('Confirm button closes the dialog', async () => {
      await openProjectSwitchConfirmDialog(1, '/tmp/other-project');

      // Click confirm button (text: "停止して続行")
      await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('停止して続行')) {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(500);

      const isVisible = await isProjectSwitchDialogVisible();
      expect(isVisible).toBe(false);
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
