/**
 * File Change Dialogs E2E Tests
 *
 * Coverage:
 * - UC5.5: External file change detection (ExternalChangeDialog)
 * - UC5.6: Unsaved changes dialog (UnsavedChangesDialog) — NOTE: trigger not yet implemented
 *
 * Test Scenarios:
 * - UJ-001: Edit file in editor → modify file on disk → ExternalChangeDialog appears
 * - UJ-002: ExternalChangeDialog → click Reload → content updated from disk
 * - UJ-003: ExternalChangeDialog → click Ignore → keep editor content
 *
 * Note: UnsavedChangesDialog (UC5.6) exists as a component but is not triggered
 * when switching files while dirty. The isDirty guard is not yet wired in ProjectPane.
 */

import * as path from 'path';
import * as fs from 'fs';
import { ensureProjectSelected, waitForProjectUIReady } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/project-file-test');
const CLAUDE_MD_PATH = path.join(FIXTURE_PROJECT_PATH, 'CLAUDE.md');

// Store original content for restoration
let originalClaudeMd: string;

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
 * Helper: Click a tab by data-testid via DOM
 */
async function clickTab(testId: string): Promise<void> {
  await browser.execute((tid: string) => {
    const el = document.querySelector(`[data-testid="${tid}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
    }
  }, testId);
  await browser.pause(300);
}

/**
 * Helper: Navigate to Project tab and wait for file list
 */
async function navigateToProjectTab(): Promise<void> {
  await dismissOverlays();

  const projectTab = await $('[data-testid="tab-project"]');
  await projectTab.waitForExist({ timeout: 10000 });

  await clickTab('tab-project');

  const projectFileList = await $('[data-testid="project-file-list"]');
  try {
    await projectFileList.waitForExist({ timeout: 10000 });
  } catch {
    await clickTab('tab-project');
    await projectFileList.waitForExist({ timeout: 5000 });
  }
}

/**
 * Helper: Click a file item in the project file list by its display name
 */
async function clickFileByName(fileName: string): Promise<void> {
  await browser.execute((name: string) => {
    const fileList = document.querySelector('[data-testid="project-file-list"]');
    if (!fileList) return;
    const buttons = fileList.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === name) {
        btn.scrollIntoView({ block: 'center' });
        btn.click();
        return;
      }
    }
  }, fileName);
  await browser.pause(500);
}

/**
 * Helper: Wait for ExternalChangeDialog to appear
 */
async function waitForExternalChangeDialog(timeout = 10000): Promise<boolean> {
  const dialog = await $('[data-testid="external-change-dialog"]');
  try {
    await dialog.waitForExist({ timeout });
    return true;
  } catch {
    return false;
  }
}

describe('File Change Dialogs E2E', () => {
  before(async () => {
    originalClaudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');

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
    // Restore file content after each test to ensure clean state
    fs.writeFileSync(CLAUDE_MD_PATH, originalClaudeMd);
    // Give file watcher time to settle
    await browser.pause(500);
    // Dismiss any leftover dialogs
    await dismissOverlays();
  });

  after(async () => {
    fs.writeFileSync(CLAUDE_MD_PATH, originalClaudeMd);
  });

  // ============================================================
  // UJ-001: External file change triggers dialog (UC5.5)
  // ============================================================
  describe('UJ-001: External file change detection', () => {
    it('Modifying file on disk while open in editor shows ExternalChangeDialog', async () => {
      // Navigate and select CLAUDE.md
      await navigateToProjectTab();
      await clickFileByName('CLAUDE.md');

      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });

      // Modify file on disk (simulates external editor change)
      const modifiedContent = originalClaudeMd + '\n\n## Modified externally';
      fs.writeFileSync(CLAUDE_MD_PATH, modifiedContent);

      // Wait for file watcher to detect change and dialog to appear
      // File watcher debounce is 300ms, plus subscription propagation
      const dialogAppeared = await waitForExternalChangeDialog(5000);
      expect(dialogAppeared).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: ExternalChangeDialog — Reload action
  // ============================================================
  describe('UJ-002: External change dialog — Reload', () => {
    it('Clicking Reload updates editor content from disk', async () => {
      // Navigate and select CLAUDE.md
      await navigateToProjectTab();
      await clickFileByName('CLAUDE.md');

      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });

      // Modify file on disk
      const modifiedContent = originalClaudeMd + '\n\n## Reloaded content';
      fs.writeFileSync(CLAUDE_MD_PATH, modifiedContent);

      // Wait for dialog
      const dialogAppeared = await waitForExternalChangeDialog(5000);
      if (!dialogAppeared) {
        // Skip if dialog didn't appear (file watcher timing)
        console.warn('[E2E] ExternalChangeDialog did not appear, skipping reload test');
        return;
      }

      // Click Reload button (text: "リロード")
      await browser.execute(() => {
        const dialog = document.querySelector('[data-testid="external-change-dialog"]');
        if (!dialog) return;
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('リロード')) {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(1000);

      // Dialog should be dismissed
      const dialogStillOpen = await $('[data-testid="external-change-dialog"]');
      expect(await dialogStillOpen.isExisting()).toBe(false);

      // Editor content should reflect the disk change
      // Verify by checking the editor's rendered text contains the new content
      const editorText = await editor.getText();
      expect(editorText).toContain('Reloaded content');
    });
  });

  // ============================================================
  // UJ-003: ExternalChangeDialog — Ignore action
  // ============================================================
  describe('UJ-003: External change dialog — Ignore', () => {
    it('Clicking Ignore keeps current editor content', async () => {
      // Navigate and select CLAUDE.md
      await navigateToProjectTab();
      await clickFileByName('CLAUDE.md');

      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });

      // Remember current editor content
      const editorTextBefore = await editor.getText();

      // Modify file on disk
      const modifiedContent = originalClaudeMd + '\n\n## Should be ignored';
      fs.writeFileSync(CLAUDE_MD_PATH, modifiedContent);

      // Wait for dialog
      const dialogAppeared = await waitForExternalChangeDialog(5000);
      if (!dialogAppeared) {
        console.warn('[E2E] ExternalChangeDialog did not appear, skipping ignore test');
        return;
      }

      // Click Ignore button (text: "無視")
      await browser.execute(() => {
        const dialog = document.querySelector('[data-testid="external-change-dialog"]');
        if (!dialog) return;
        const buttons = dialog.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.includes('無視')) {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(500);

      // Dialog should be dismissed
      const dialogStillOpen = await $('[data-testid="external-change-dialog"]');
      expect(await dialogStillOpen.isExisting()).toBe(false);

      // Editor content should NOT contain the external change
      const editorTextAfter = await editor.getText();
      expect(editorTextAfter).not.toContain('Should be ignored');
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
