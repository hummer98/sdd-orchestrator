/**
 * Project Settings Dialog E2E Tests
 *
 * Coverage:
 * - UC8.3: Project settings dialog (LLM engine, VCS scheme, doc review scheme)
 *
 * Test Scenarios:
 * - UJ-001: Settings button in header → dialog opens
 * - UJ-002: Dialog shows LLM engine configuration section
 * - UJ-003: Dialog shows VCS scheme selector
 * - UJ-004: Dialog shows document review scheme selector
 * - UJ-005: Cancel button closes without saving
 * - UJ-006: Save button persists settings
 */

import * as path from 'path';
import { ensureProjectSelected, waitForProjectUIReady, dismissDialogs } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Open ProjectSettingsDialog via header button
 */
async function openProjectSettingsDialog(): Promise<boolean> {
  // Click the settings button (gear icon in header, aria-label="プロジェクト設定")
  const clicked = await browser.execute(() => {
    const btn = document.querySelector('[aria-label="プロジェクト設定"]') as HTMLElement;
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (clicked) {
    await browser.pause(500);
  }

  return clicked;
}

/**
 * Helper: Check if ProjectSettingsDialog is visible
 */
async function isSettingsDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    // Check for dialog title text
    const headings = document.querySelectorAll('h2, h3');
    for (const h of headings) {
      if (h.textContent?.includes('プロジェクト設定')) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Helper: Close dialog by clicking cancel or close button
 */
async function closeSettingsDialog(): Promise<void> {
  // Try close button first
  await browser.execute(() => {
    const closeBtn = document.querySelector('[data-testid="close-button"]') as HTMLElement;
    if (closeBtn) {
      closeBtn.click();
      return;
    }
    // Fallback: find cancel button
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === 'キャンセル') {
        btn.click();
        return;
      }
    }
  });
  await browser.pause(300);
}

describe('Project Settings Dialog E2E', () => {
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
    // Ensure dialog is closed after each test
    if (await isSettingsDialogVisible()) {
      await closeSettingsDialog();
    }
  });

  // ============================================================
  // UJ-001: Open settings dialog
  // ============================================================
  describe('UJ-001: Opening project settings', () => {
    it('Settings button exists in header when project is selected', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[aria-label="プロジェクト設定"]');
      });
      expect(exists).toBe(true);
    });

    it('Clicking settings button opens ProjectSettingsDialog', async () => {
      await openProjectSettingsDialog();

      const isVisible = await isSettingsDialogVisible();
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: LLM Engine configuration
  // ============================================================
  describe('UJ-002: LLM Engine configuration section', () => {
    before(async () => {
      await openProjectSettingsDialog();
    });

    it('Default engine selector is displayed', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="default-engine-select"]');
      });
      expect(exists).toBe(true);
    });

    it('Phase-specific engine selectors are displayed', async () => {
      const selectors = await browser.execute(() => {
        return {
          generation: !!document.querySelector('[data-testid="generation-engine-select"]'),
          inspection: !!document.querySelector('[data-testid="inspection-engine-select"]'),
          implementation: !!document.querySelector('[data-testid="implementation-engine-select"]'),
        };
      });

      expect(selectors.generation).toBe(true);
      expect(selectors.inspection).toBe(true);
      expect(selectors.implementation).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: VCS Scheme selector
  // ============================================================
  describe('UJ-003: VCS Scheme selector', () => {
    before(async () => {
      if (!(await isSettingsDialogVisible())) {
        await openProjectSettingsDialog();
      }
    });

    it('VCS scheme selector is displayed', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-selector"]');
      });
      expect(exists).toBe(true);
    });

    it('VCS scheme selector button is clickable', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-selector-button"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: Document Review scheme selector
  // ============================================================
  describe('UJ-004: Document Review scheme selector', () => {
    before(async () => {
      if (!(await isSettingsDialogVisible())) {
        await openProjectSettingsDialog();
      }
    });

    it('Document review scheme selector button is displayed', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="scheme-selector-button"]');
      });
      expect(exists).toBe(true);
    });

    it('Dialog contains document review section text', async () => {
      const text = await browser.execute(() => {
        return document.body.textContent || '';
      });
      expect(text).toContain('ドキュメントレビュー');
    });
  });

  // ============================================================
  // UJ-005: Cancel button
  // ============================================================
  describe('UJ-005: Cancel closes without saving', () => {
    it('Cancel button closes the dialog', async () => {
      await openProjectSettingsDialog();

      // Click cancel button
      await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === 'キャンセル') {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(300);

      const isVisible = await isSettingsDialogVisible();
      expect(isVisible).toBe(false);
    });
  });

  // ============================================================
  // UJ-006: Save button
  // ============================================================
  describe('UJ-006: Save persists settings', () => {
    it('Save button exists in dialog', async () => {
      await openProjectSettingsDialog();

      const saveExists = await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === '保存') {
            return true;
          }
        }
        return false;
      });

      expect(saveExists).toBe(true);
    });

    it('Clicking save closes dialog', async () => {
      if (!(await isSettingsDialogVisible())) {
        await openProjectSettingsDialog();
      }

      // Click save button
      await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === '保存') {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(1000);

      const isVisible = await isSettingsDialogVisible();
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
