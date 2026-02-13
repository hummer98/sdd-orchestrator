/**
 * Agent Delete E2E Tests
 *
 * Coverage:
 * - UC4.3: Agent session deletion
 *
 * Test Scenarios:
 * - UJ-001: Completed agent shows delete button (Trash2 icon, aria-label="削除")
 * - UJ-002: Clicking delete button shows confirmation dialog
 * - UJ-003: Cancel in confirmation dialog keeps the agent
 * - UJ-004: Confirm in confirmation dialog removes the agent
 *
 * Preconditions:
 * - Uses mock Claude CLI for agent execution
 * - auto-exec-test fixture with simple-feature spec
 */

import * as path from 'path';
import {
  ensureProjectSelected,
  waitForProjectUIReady,
  selectSpecViaUI,
  waitForSpecDetailReady,
  waitForAgentInStore,
  getFirstAgentForSpec,
  dismissDialogs,
} from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/auto-exec-test');
const SPEC_NAME = 'simple-feature';

/**
 * Helper: Click a phase button to start a single agent
 */
async function startSinglePhaseExecution(phase: string): Promise<void> {
  const phaseButton = await $(`[data-testid="phase-button-${phase}"]`);
  await phaseButton.waitForExist({ timeout: 5000 });
  await browser.execute((p: string) => {
    const btn = document.querySelector(`[data-testid="phase-button-${p}"]`) as HTMLElement;
    if (btn) btn.click();
  }, phase);
  await browser.pause(500);
}

/**
 * Helper: Wait for agent to reach a terminal status (completed/failed)
 */
async function waitForAgentTerminal(specName: string, timeout = 30000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const agent = await getFirstAgentForSpec(specName);
    if (agent && (agent.status === 'completed' || agent.status === 'failed')) {
      return true;
    }
    await browser.pause(500);
  }
  return false;
}

/**
 * Helper: Find the delete button for the first agent item
 */
async function findDeleteButton(): Promise<boolean> {
  return browser.execute(() => {
    const agentItems = document.querySelectorAll('[data-testid^="agent-item-"]');
    for (const item of agentItems) {
      const deleteBtn = item.querySelector('[aria-label="削除"]');
      if (deleteBtn) return true;
    }
    return false;
  });
}

/**
 * Helper: Click the delete button for the first agent item
 */
async function clickDeleteButton(): Promise<void> {
  await browser.execute(() => {
    const agentItems = document.querySelectorAll('[data-testid^="agent-item-"]');
    for (const item of agentItems) {
      const deleteBtn = item.querySelector('[aria-label="削除"]') as HTMLElement;
      if (deleteBtn) {
        deleteBtn.click();
        return;
      }
    }
  });
  await browser.pause(300);
}

/**
 * Helper: Check if agent delete confirmation dialog is visible
 */
async function isDeleteConfirmDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    const headings = document.querySelectorAll('h4');
    for (const h of headings) {
      if (h.textContent?.includes('セッションを削除しますか')) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Helper: Click a button in the delete confirmation dialog by text
 */
async function clickDeleteConfirmButton(buttonText: string): Promise<void> {
  await browser.execute((text: string) => {
    // Find the delete confirm dialog by heading
    const headings = document.querySelectorAll('h4');
    for (const h of headings) {
      if (h.textContent?.includes('セッションを削除しますか')) {
        const dialog = h.closest('.fixed');
        if (!dialog) continue;
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === text) {
            btn.click();
            return;
          }
        }
      }
    }
  }, buttonText);
  await browser.pause(300);
}

/**
 * Helper: Count agent items in the UI
 */
async function countAgentItems(): Promise<number> {
  return browser.execute(() => {
    return document.querySelectorAll('[data-testid^="agent-item-"]').length;
  });
}

describe('Agent Delete E2E', () => {
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

    // Select spec via UI
    await selectSpecViaUI(SPEC_NAME);
    await waitForSpecDetailReady(SPEC_NAME, 15000);
  });

  // ============================================================
  // UJ-001: Completed agent shows delete button
  // ============================================================
  describe('UJ-001: Delete button visibility', () => {
    before(async () => {
      // Start a phase execution to create an agent
      await startSinglePhaseExecution('requirements');

      // Wait for agent to appear and complete
      await waitForAgentInStore(SPEC_NAME, 10000);
      await waitForAgentTerminal(SPEC_NAME, 30000);
      await browser.pause(500);
    });

    it('Completed agent item exists in agent list', async () => {
      const count = await countAgentItems();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('Completed agent shows delete button with trash icon', async () => {
      const hasDeleteButton = await findDeleteButton();
      expect(hasDeleteButton).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Delete confirmation dialog
  // ============================================================
  describe('UJ-002: Delete confirmation dialog', () => {
    it('Clicking delete button shows confirmation dialog', async () => {
      await clickDeleteButton();

      const isVisible = await isDeleteConfirmDialogVisible();
      expect(isVisible).toBe(true);
    });

    it('Confirmation dialog has cancel and delete buttons', async () => {
      const dialogButtons = await browser.execute(() => {
        const headings = document.querySelectorAll('h4');
        for (const h of headings) {
          if (h.textContent?.includes('セッションを削除しますか')) {
            const dialog = h.closest('.fixed');
            if (!dialog) continue;
            const buttons = dialog.querySelectorAll('button');
            const texts = Array.from(buttons).map(btn => btn.textContent?.trim());
            return texts;
          }
        }
        return [];
      });

      expect(dialogButtons).toContain('キャンセル');
      expect(dialogButtons).toContain('削除');
    });
  });

  // ============================================================
  // UJ-003: Cancel deletion
  // ============================================================
  describe('UJ-003: Cancel agent deletion', () => {
    before(async () => {
      // Ensure we're in the confirmation dialog
      if (!(await isDeleteConfirmDialogVisible())) {
        await clickDeleteButton();
      }
    });

    it('Clicking cancel closes the dialog and keeps agent', async () => {
      const countBefore = await countAgentItems();

      await clickDeleteConfirmButton('キャンセル');

      // Dialog should close
      const isVisible = await isDeleteConfirmDialogVisible();
      expect(isVisible).toBe(false);

      // Agent should still exist
      const countAfter = await countAgentItems();
      expect(countAfter).toBe(countBefore);
    });
  });

  // ============================================================
  // UJ-004: Confirm deletion
  // ============================================================
  describe('UJ-004: Confirm agent deletion', () => {
    before(async () => {
      // Open the delete confirmation dialog
      await clickDeleteButton();
      await browser.pause(300);
    });

    it('Clicking delete removes the agent from the list', async () => {
      const countBefore = await countAgentItems();

      await clickDeleteConfirmButton('削除');
      await browser.pause(500);

      // Dialog should close
      const isVisible = await isDeleteConfirmDialogVisible();
      expect(isVisible).toBe(false);

      // Agent count should decrease
      const countAfter = await countAgentItems();
      expect(countAfter).toBeLessThan(countBefore);
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
