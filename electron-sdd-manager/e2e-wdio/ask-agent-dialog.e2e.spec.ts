/**
 * Ask Agent Dialog E2E Tests
 *
 * Coverage:
 * - UC2.13: Spec Ask (custom prompt execution on spec context)
 * - UC4.6: Project Ask (custom prompt execution on project context)
 *
 * Test Scenarios:
 * - UJ-001: Spec Ask button exists in AgentListPanel
 * - UJ-002: Clicking Spec Ask button opens AskAgentDialog
 * - UJ-003: AskAgentDialog has prompt input and execute button
 * - UJ-004: Execute button is disabled when prompt is empty
 * - UJ-005: Cancel closes the dialog
 *
 * Preconditions:
 * - Uses test-project fixture with spec selected
 */

import * as path from 'path';
import {
  ensureProjectSelected,
  waitForProjectUIReady,
  selectSpecViaUI,
  waitForSpecDetailReady,
  dismissDialogs,
} from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');
const SPEC_NAME = 'test-feature';

/**
 * Helper: Check if AskAgentDialog is visible
 */
async function isAskDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    return !!document.querySelector('[data-testid="ask-agent-dialog"]');
  });
}

/**
 * Helper: Close AskAgentDialog
 */
async function closeAskDialog(): Promise<void> {
  await browser.execute(() => {
    const closeBtn = document.querySelector('[data-testid="ask-agent-dialog"] [data-testid="close-button"]') as HTMLElement;
    if (closeBtn) {
      closeBtn.click();
      return;
    }
    // Fallback: click backdrop
    const backdrop = document.querySelector('[data-testid="ask-agent-dialog"] [data-testid="dialog-backdrop"]') as HTMLElement;
    if (backdrop) backdrop.click();
  });
  await browser.pause(300);
}

describe('Ask Agent Dialog E2E', () => {
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

    await selectSpecViaUI(SPEC_NAME);
    await waitForSpecDetailReady(SPEC_NAME, 15000);
  });

  afterEach(async () => {
    if (await isAskDialogVisible()) {
      await closeAskDialog();
    }
  });

  // ============================================================
  // UJ-001: Spec Ask button exists
  // ============================================================
  describe('UJ-001: Spec Ask button', () => {
    it('Spec Ask button exists in agent panel', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="spec-ask-button"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Opening AskAgentDialog
  // ============================================================
  describe('UJ-002: Open AskAgentDialog', () => {
    it('Clicking Spec Ask button opens dialog', async () => {
      await browser.execute(() => {
        const btn = document.querySelector('[data-testid="spec-ask-button"]') as HTMLElement;
        if (btn) btn.click();
      });
      await browser.pause(300);

      const isVisible = await isAskDialogVisible();
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: Dialog content
  // ============================================================
  describe('UJ-003: AskAgentDialog content', () => {
    before(async () => {
      if (!(await isAskDialogVisible())) {
        await browser.execute(() => {
          const btn = document.querySelector('[data-testid="spec-ask-button"]') as HTMLElement;
          if (btn) btn.click();
        });
        await browser.pause(300);
      }
    });

    it('Dialog has prompt input textarea', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="ask-prompt-input"]');
      });
      expect(exists).toBe(true);
    });

    it('Dialog has execute button', async () => {
      if (!(await isAskDialogVisible())) {
        await browser.execute(() => {
          const btn = document.querySelector('[data-testid="spec-ask-button"]') as HTMLElement;
          if (btn) btn.click();
        });
        await browser.pause(300);
      }

      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="ask-execute-button"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: Execute button validation
  // ============================================================
  describe('UJ-004: Execute button disabled when empty', () => {
    before(async () => {
      if (!(await isAskDialogVisible())) {
        await browser.execute(() => {
          const btn = document.querySelector('[data-testid="spec-ask-button"]') as HTMLElement;
          if (btn) btn.click();
        });
        await browser.pause(300);
      }
    });

    it('Execute button is disabled when prompt is empty', async () => {
      if (!(await isAskDialogVisible())) {
        await browser.execute(() => {
          const btn = document.querySelector('[data-testid="spec-ask-button"]') as HTMLElement;
          if (btn) btn.click();
        });
        await browser.pause(300);
      }

      const isDisabled = await browser.execute(() => {
        const btn = document.querySelector('[data-testid="ask-execute-button"]') as HTMLButtonElement;
        return btn ? btn.disabled : false;
      });
      expect(isDisabled).toBe(true);
    });
  });

  // ============================================================
  // UJ-005: Cancel dialog
  // ============================================================
  describe('UJ-005: Cancel closes dialog', () => {
    it('Closing dialog hides it', async () => {
      if (!(await isAskDialogVisible())) {
        await browser.execute(() => {
          const btn = document.querySelector('[data-testid="spec-ask-button"]') as HTMLElement;
          if (btn) btn.click();
        });
        await browser.pause(300);
      }

      await closeAskDialog();

      const isVisible = await isAskDialogVisible();
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
