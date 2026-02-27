/**
 * Phase Rejection E2E Tests
 *
 * Coverage:
 * - UC2.10: Phase rejection with RejectDialog
 *
 * Test Scenarios:
 * - UJ-001: Generated phase shows reject button in ApprovalPanel
 * - UJ-002: Clicking reject button opens RejectDialog
 * - UJ-003: RejectDialog requires reason input
 * - UJ-004: Cancel in RejectDialog closes without rejecting
 * - UJ-005: Submitting rejection with reason updates phase status
 *
 * Preconditions:
 * - Uses test-project fixture with requirements-generated phase
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
 * Helper: Check if RejectDialog is visible
 */
async function isRejectDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    // RejectDialog title format: "{phaseName}を却下"
    const elements = document.querySelectorAll('h2, h3, [role="dialog"]');
    for (const el of elements) {
      if (el.textContent?.includes('を却下')) {
        return true;
      }
    }
    // Also check for the reject reason textarea
    return !!document.getElementById('reject-reason');
  });
}

/**
 * Helper: Find and click the reject button for a phase in ApprovalPanel
 */
async function clickRejectButton(): Promise<boolean> {
  return browser.execute(() => {
    // Find buttons with "却下" text in the approval area
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === '却下' && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    return false;
  });
}

/**
 * Helper: Close RejectDialog by clicking cancel
 */
async function closeRejectDialog(): Promise<void> {
  await browser.execute(() => {
    // Find cancel button within the reject dialog context
    const textarea = document.getElementById('reject-reason');
    if (!textarea) return;
    // Navigate up to find the dialog and its buttons
    const dialog = textarea.closest('[role="dialog"]') || textarea.closest('.fixed');
    if (!dialog) return;
    const buttons = dialog.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === 'キャンセル') {
        btn.click();
        return;
      }
    }
  });
  await browser.pause(300);
}

// SKIP: ApprovalPanel (which renders the 却下 button) is exported but not imported/rendered
// anywhere in the current UI. The workflow uses WorkflowViewCore → PhaseItem which only has 承認.
// Re-enable when reject functionality is added back to the workflow UI.
describe.skip('Phase Rejection E2E', () => {
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

    // Select spec with requirements-generated phase
    await selectSpecViaUI(SPEC_NAME);
    await waitForSpecDetailReady(SPEC_NAME, 15000);
  });

  afterEach(async () => {
    if (await isRejectDialogVisible()) {
      await closeRejectDialog();
    }
  });

  // ============================================================
  // UJ-001: Reject button visibility
  // ============================================================
  describe('UJ-001: Reject button in ApprovalPanel', () => {
    it('WorkflowView is displayed after spec selection', async () => {
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });
      expect(await workflowView.isExisting()).toBe(true);
    });

    it('Reject button exists for generated phase', async () => {
      // The test-project fixture has requirements-generated,
      // so there should be a reject button somewhere in the approval area
      const hasRejectButton = await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === '却下') {
            return true;
          }
        }
        return false;
      });

      expect(hasRejectButton).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: RejectDialog opens
  // ============================================================
  describe('UJ-002: Opening RejectDialog', () => {
    it('Clicking reject button opens RejectDialog', async () => {
      const clicked = await clickRejectButton();
      expect(clicked).toBe(true);

      await browser.pause(300);
      const isVisible = await isRejectDialogVisible();
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: RejectDialog reason validation
  // ============================================================
  describe('UJ-003: Rejection reason input', () => {
    before(async () => {
      if (!(await isRejectDialogVisible())) {
        await clickRejectButton();
        await browser.pause(300);
      }
    });

    it('RejectDialog has reason textarea', async () => {
      const exists = await browser.execute(() => {
        return !!document.getElementById('reject-reason');
      });
      expect(exists).toBe(true);
    });

    it('Dialog title contains phase name', async () => {
      if (!(await isRejectDialogVisible())) {
        await clickRejectButton();
        await browser.pause(300);
      }

      const dialogText = await browser.execute(() => {
        const body = document.body.textContent || '';
        return body;
      });
      // Should contain "を却下" with a phase name before it
      expect(dialogText).toContain('を却下');
    });

    it('Submit without reason shows validation error', async () => {
      if (!(await isRejectDialogVisible())) {
        await clickRejectButton();
        await browser.pause(300);
      }

      // Click the reject/confirm button without entering a reason
      await browser.execute(() => {
        const textarea = document.getElementById('reject-reason');
        if (!textarea) return;
        const dialog = textarea.closest('[role="dialog"]') || textarea.closest('.fixed');
        if (!dialog) return;
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === '却下') {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(300);

      // Validation error should appear
      const hasError = await browser.execute(() => {
        return (document.body.textContent || '').includes('却下理由を入力してください');
      });
      expect(hasError).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: Cancel rejection
  // ============================================================
  describe('UJ-004: Cancel rejection', () => {
    before(async () => {
      if (!(await isRejectDialogVisible())) {
        await clickRejectButton();
        await browser.pause(300);
      }
    });

    it('Cancel button closes RejectDialog', async () => {
      if (!(await isRejectDialogVisible())) {
        await clickRejectButton();
        await browser.pause(300);
      }

      await closeRejectDialog();

      const isVisible = await isRejectDialogVisible();
      expect(isVisible).toBe(false);
    });
  });

  // ============================================================
  // UJ-005: Submit rejection with reason
  // ============================================================
  describe('UJ-005: Submit rejection with reason', () => {
    before(async () => {
      await clickRejectButton();
      await browser.pause(300);
    });

    it('Entering reason and submitting closes dialog', async () => {
      if (!(await isRejectDialogVisible())) {
        await clickRejectButton();
        await browser.pause(300);
      }

      // Type reason into textarea
      await browser.execute(() => {
        const textarea = document.getElementById('reject-reason') as HTMLTextAreaElement;
        if (!textarea) return;
        // Use native value setter for React
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(textarea, 'Requirements need more detail on error handling.');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await browser.pause(300);

      // Click reject confirm button
      await browser.execute(() => {
        const textarea = document.getElementById('reject-reason');
        if (!textarea) return;
        const dialog = textarea.closest('[role="dialog"]') || textarea.closest('.fixed');
        if (!dialog) return;
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === '却下') {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(1000);

      const isVisible = await isRejectDialogVisible();
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
