/**
 * CLI Install Dialog E2E Tests
 *
 * Coverage:
 * - UC8.4: CLI install dialog (sdd command installation)
 *
 * Test Scenarios:
 * - UJ-001: CLI Install dialog can be opened via menu
 * - UJ-002: Dialog shows location options (user/system)
 * - UJ-003: Dialog has install and close buttons
 * - UJ-004: Close button closes the dialog
 *
 * Preconditions:
 * - Uses test-project fixture (default)
 */

import * as path from 'path';
import { ensureProjectSelected, waitForProjectUIReady, dismissDialogs } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Open CLI Install dialog via Electron menu click
 * Menu click triggers eventBus.emit → tRPC subscription → React state update
 */
async function openCliInstallDialog(): Promise<void> {
  await browser.electron.execute((electron) => {
    const menu = electron.Menu.getApplicationMenu();
    if (!menu) return;
    for (const topItem of menu.items) {
      if (!topItem.submenu) continue;
      for (const item of topItem.submenu.items) {
        if (item.label?.includes('CLIコマンドをインストール')) {
          item.click(item as any, electron.BrowserWindow.getFocusedWindow() ?? undefined, {} as any);
          return;
        }
      }
    }
  });
  await browser.pause(500);
}

/**
 * Helper: Check if CLI Install dialog is visible
 */
async function isCliInstallDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    return !!document.querySelector('[data-testid="cli-install-dialog"]');
  });
}

/**
 * Helper: Close CLI Install dialog
 */
async function closeCliInstallDialog(): Promise<void> {
  await browser.execute(() => {
    const closeBtn = document.querySelector('[data-testid="cli-install-close-button"]') as HTMLElement;
    if (closeBtn) closeBtn.click();
  });
  await browser.pause(300);
}

describe('CLI Install Dialog E2E', () => {
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
    await dismissDialogs();
  });

  afterEach(async () => {
    if (await isCliInstallDialogVisible()) {
      await closeCliInstallDialog();
    }
  });

  // ============================================================
  // UJ-001: Open CLI Install dialog
  // ============================================================
  describe('UJ-001: Open CLI Install dialog', () => {
    it('CLI Install dialog opens via menu event', async () => {
      await openCliInstallDialog();

      const isVisible = await isCliInstallDialogVisible();
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Location options
  // ============================================================
  describe('UJ-002: Location options', () => {
    before(async () => {
      if (!(await isCliInstallDialogVisible())) {
        await openCliInstallDialog();
      }
    });

    it('User location option exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="cli-install-location-user"]');
      });
      expect(exists).toBe(true);
    });

    it('System location option exists', async () => {
      if (!(await isCliInstallDialogVisible())) {
        await openCliInstallDialog();
      }
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="cli-install-location-system"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: Install and close buttons
  // ============================================================
  describe('UJ-003: Dialog buttons', () => {
    before(async () => {
      if (!(await isCliInstallDialogVisible())) {
        await openCliInstallDialog();
      }
    });

    it('Install button exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="cli-install-submit-button"]');
      });
      expect(exists).toBe(true);
    });

    it('Close button exists', async () => {
      if (!(await isCliInstallDialogVisible())) {
        await openCliInstallDialog();
      }
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="cli-install-close-button"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: Close dialog
  // ============================================================
  describe('UJ-004: Close button closes dialog', () => {
    it('Clicking close button hides the dialog', async () => {
      if (!(await isCliInstallDialogVisible())) {
        await openCliInstallDialog();
      }

      await closeCliInstallDialog();

      const isVisible = await isCliInstallDialogVisible();
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
