/**
 * MCP Server Settings E2E Tests
 *
 * Coverage:
 * - UC7.4: MCP Server settings (enable/disable, port config)
 *
 * Test Scenarios:
 * - UJ-001: MCP status indicator exists in header
 * - UJ-002: Clicking MCP indicator opens RemoteAccessDialog
 * - UJ-003: MCP tab is accessible in RemoteAccessDialog
 * - UJ-004: MCP settings panel shows enable checkbox and port input
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
async function openRemoteAccessDialog(): Promise<boolean> {
  return browser.execute(() => {
    const btn = document.querySelector('[data-testid="mcp-status-indicator"]') as HTMLElement;
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
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
 * Helper: Switch to a tab in RemoteAccessDialog
 */
async function switchRemoteAccessTab(tabId: string): Promise<void> {
  await browser.execute((id: string) => {
    const tab = document.querySelector(`[aria-controls="tabpanel-${id}"]`) as HTMLElement;
    if (tab) tab.click();
  }, tabId);
  await browser.pause(300);
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

describe('MCP Server Settings E2E', () => {
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
  // UJ-001: MCP status indicator
  // ============================================================
  describe('UJ-001: MCP status indicator in header', () => {
    it('MCP status indicator exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="mcp-status-indicator"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Open RemoteAccessDialog
  // ============================================================
  describe('UJ-002: Open RemoteAccessDialog', () => {
    it('Clicking MCP indicator opens dialog', async () => {
      const clicked = await openRemoteAccessDialog();
      expect(clicked).toBe(true);

      await browser.pause(300);
      const isVisible = await isRemoteAccessDialogVisible();
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: MCP tab
  // ============================================================
  describe('UJ-003: MCP tab in RemoteAccessDialog', () => {
    before(async () => {
      await openRemoteAccessDialog();
      await browser.pause(300);
    });

    it('MCP tab exists and is clickable', async () => {
      const tabExists = await browser.execute(() => {
        return !!document.querySelector('[aria-controls="tabpanel-mcp"]');
      });
      expect(tabExists).toBe(true);
    });

    it('Switching to MCP tab shows MCP panel', async () => {
      await switchRemoteAccessTab('mcp');

      const panelVisible = await browser.execute(() => {
        return !!document.getElementById('tabpanel-mcp');
      });
      expect(panelVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: MCP settings content
  // ============================================================
  describe('UJ-004: MCP settings panel content', () => {
    before(async () => {
      if (!(await isRemoteAccessDialogVisible())) {
        await openRemoteAccessDialog();
        await browser.pause(300);
      }
      await switchRemoteAccessTab('mcp');
    });

    it('MCP panel contains enable checkbox', async () => {
      const hasCheckbox = await browser.execute(() => {
        const panel = document.getElementById('tabpanel-mcp');
        if (!panel) return false;
        return !!panel.querySelector('input[type="checkbox"]');
      });
      expect(hasCheckbox).toBe(true);
    });

    it('MCP panel contains port input', async () => {
      const hasPortInput = await browser.execute(() => {
        return !!document.getElementById('mcp-port-input');
      });
      expect(hasPortInput).toBe(true);
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
