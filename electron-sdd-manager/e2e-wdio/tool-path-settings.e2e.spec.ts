/**
 * Tool Path Settings E2E Tests
 *
 * Coverage:
 * - UC8.5: Tool path settings (well-known tool paths configuration)
 *
 * Test Scenarios:
 * - UJ-001: Tools tab exists in RemoteAccessDialog
 * - UJ-002: ToolSettingsPanel shows tool rows
 * - UJ-003: Tool rows display status information
 *
 * Preconditions:
 * - Uses test-project fixture (default)
 */

import * as path from 'path';
import { ensureProjectSelected, waitForProjectUIReady, dismissDialogs } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Open RemoteAccessDialog via MCP status indicator
 */
async function openRemoteAccessDialog(): Promise<void> {
  await browser.execute(() => {
    const btn = document.querySelector('[data-testid="mcp-status-indicator"]') as HTMLElement;
    if (btn) btn.click();
  });
  await browser.pause(500);
}

/**
 * Helper: Check if RemoteAccessDialog is visible
 */
async function isRemoteAccessDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    return !!document.querySelector('[aria-labelledby="remote-access-dialog-title"]');
  });
}

/**
 * Helper: Switch to Tools tab
 */
async function switchToToolsTab(): Promise<void> {
  await browser.execute(() => {
    const tab = document.querySelector('[aria-controls="tabpanel-tools"]') as HTMLElement;
    if (tab) tab.click();
  });
  await browser.pause(500);
}

/**
 * Helper: Close RemoteAccessDialog
 */
async function closeRemoteAccessDialog(): Promise<void> {
  await browser.execute(() => {
    const backdrop = document.querySelector('[aria-labelledby="remote-access-dialog-title"]');
    if (!backdrop) return;
    const bgDiv = backdrop.querySelector('.absolute.inset-0') as HTMLElement;
    if (bgDiv) bgDiv.click();
  });
  await browser.pause(300);
}

describe('Tool Path Settings E2E', () => {
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
    if (await isRemoteAccessDialogVisible()) {
      await closeRemoteAccessDialog();
    }
  });

  // ============================================================
  // UJ-001: Tools tab in RemoteAccessDialog
  // ============================================================
  describe('UJ-001: Tools tab', () => {
    it('Tools tab exists in RemoteAccessDialog', async () => {
      await openRemoteAccessDialog();

      const tabExists = await browser.execute(() => {
        return !!document.querySelector('[aria-controls="tabpanel-tools"]');
      });
      expect(tabExists).toBe(true);
    });

    it('Clicking Tools tab shows tool settings panel', async () => {
      if (!(await isRemoteAccessDialogVisible())) {
        await openRemoteAccessDialog();
        await browser.pause(300);
      }

      await switchToToolsTab();

      const panelVisible = await browser.execute(() => {
        return !!document.getElementById('tabpanel-tools');
      });
      expect(panelVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Tool rows
  // ============================================================
  describe('UJ-002: Tool rows in settings panel', () => {
    before(async () => {
      await openRemoteAccessDialog();
      await switchToToolsTab();
    });

    it('At least one tool row is displayed', async () => {
      if (!(await isRemoteAccessDialogVisible())) {
        await openRemoteAccessDialog();
        await switchToToolsTab();
      }

      // Wait for loading to complete
      await browser.waitUntil(async () => {
        const loading = await browser.execute(() => {
          return !!document.querySelector('[data-testid="tool-loading"]');
        });
        return !loading;
      }, { timeout: 10000 });

      const toolRowCount = await browser.execute(() => {
        return document.querySelectorAll('[data-testid^="tool-row-"]').length;
      });
      expect(toolRowCount).toBeGreaterThan(0);
    });

    it('Claude tool row exists', async () => {
      if (!(await isRemoteAccessDialogVisible())) {
        await openRemoteAccessDialog();
        await switchToToolsTab();
      }

      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="tool-row-claude"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: Tool status display
  // ============================================================
  describe('UJ-003: Tool status display', () => {
    before(async () => {
      if (!(await isRemoteAccessDialogVisible())) {
        await openRemoteAccessDialog();
        await switchToToolsTab();
      }
    });

    it('Tool panel contains status text', async () => {
      const panelText = await browser.execute(() => {
        const panel = document.getElementById('tabpanel-tools');
        return panel ? panel.textContent || '' : '';
      });
      // Should contain tool names and status text (TOOL_DEFINITIONS: claude, jj, jq)
      expect(panelText).toContain('claude');
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
