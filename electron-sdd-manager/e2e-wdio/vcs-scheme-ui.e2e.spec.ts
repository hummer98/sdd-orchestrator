/**
 * VCS Scheme UI E2E Tests
 *
 * Coverage:
 * - UC6.5: VCS Scheme selector UI (dropdown, options, selection)
 *
 * Test Scenarios:
 * - UJ-001: VCS scheme selector exists in ProjectSettingsDialog
 * - UJ-002: Clicking selector button opens dropdown
 * - UJ-003: Dropdown shows Git and Jujutsu options
 * - UJ-004: Selecting Git option works
 *
 * Note: debatex-scheme.e2e.spec.ts tests tRPC bridge only.
 * This test validates the actual UI dropdown interaction.
 *
 * Preconditions:
 * - Uses test-project fixture (default)
 */

import * as path from 'path';
import { ensureProjectSelected, waitForProjectUIReady, dismissDialogs } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Open ProjectSettingsDialog
 */
async function openSettingsDialog(): Promise<void> {
  await browser.execute(() => {
    const btn = document.querySelector('[aria-label="プロジェクト設定"]') as HTMLElement;
    if (btn) btn.click();
  });
  await browser.pause(500);
}

/**
 * Helper: Check if settings dialog is visible
 */
async function isSettingsDialogVisible(): Promise<boolean> {
  return browser.execute(() => {
    const headings = document.querySelectorAll('h2, h3');
    for (const h of headings) {
      if (h.textContent?.includes('プロジェクト設定')) return true;
    }
    return false;
  });
}

/**
 * Helper: Close settings dialog
 */
async function closeSettingsDialog(): Promise<void> {
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
}

describe('VCS Scheme UI E2E', () => {
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
    if (await isSettingsDialogVisible()) {
      await closeSettingsDialog();
    }
  });

  // ============================================================
  // UJ-001: VCS scheme selector exists
  // ============================================================
  describe('UJ-001: VCS scheme selector', () => {
    it('VCS scheme selector exists in settings dialog', async () => {
      await openSettingsDialog();

      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-selector"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Open dropdown
  // ============================================================
  describe('UJ-002: VCS scheme dropdown', () => {
    before(async () => {
      await openSettingsDialog();
    });

    it('Clicking selector button opens dropdown', async () => {
      await browser.execute(() => {
        const btn = document.querySelector('[data-testid="vcs-scheme-selector-button"]') as HTMLElement;
        if (btn) btn.click();
      });
      await browser.pause(300);

      const dropdownVisible = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-dropdown"]');
      });
      expect(dropdownVisible).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: Dropdown options
  // ============================================================
  describe('UJ-003: Dropdown shows Git and Jujutsu options', () => {
    before(async () => {
      if (!(await isSettingsDialogVisible())) {
        await openSettingsDialog();
      }
      // Open dropdown if not already open
      const isOpen = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-dropdown"]');
      });
      if (!isOpen) {
        await browser.execute(() => {
          const btn = document.querySelector('[data-testid="vcs-scheme-selector-button"]') as HTMLElement;
          if (btn) btn.click();
        });
        await browser.pause(300);
      }
    });

    it('Git option exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-option-git"]');
      });
      expect(exists).toBe(true);
    });

    it('Jujutsu option exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-option-jj"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: Select Git option
  // ============================================================
  describe('UJ-004: Select Git option', () => {
    before(async () => {
      if (!(await isSettingsDialogVisible())) {
        await openSettingsDialog();
      }
    });

    it('Selecting Git option closes dropdown', async () => {
      // Open dropdown
      await browser.execute(() => {
        const btn = document.querySelector('[data-testid="vcs-scheme-selector-button"]') as HTMLElement;
        if (btn) btn.click();
      });
      await browser.pause(300);

      // Click Git option
      await browser.execute(() => {
        const option = document.querySelector('[data-testid="vcs-scheme-option-git"]') as HTMLElement;
        if (option) option.click();
      });
      await browser.pause(300);

      // Dropdown should close
      const dropdownVisible = await browser.execute(() => {
        return !!document.querySelector('[data-testid="vcs-scheme-dropdown"]');
      });
      expect(dropdownVisible).toBe(false);
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
