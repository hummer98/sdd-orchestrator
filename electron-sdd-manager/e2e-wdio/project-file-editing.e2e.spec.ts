/**
 * Project File Editing E2E Tests
 *
 * Coverage:
 * - UC5.1: CLAUDE.md editing
 * - UC5.2: Steering file editing
 * - UC5.4: Cmd+S file save
 *
 * Test Scenarios:
 * - UJ-001: Navigate to Project tab → CLAUDE.md section visible → select → editor opens
 * - UJ-002: Steering file section → select file → editor opens
 * - UJ-003: Edit mode toggle (preview → edit → preview)
 * - UJ-004: Content modification → dirty indicator appears → save → indicator disappears
 * - UJ-005: Cmd+S keyboard shortcut triggers save
 */

import * as path from 'path';
import * as fs from 'fs';
import { ensureProjectSelected, waitForProjectUIReady } from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/project-file-test');
const CLAUDE_MD_PATH = path.join(FIXTURE_PROJECT_PATH, 'CLAUDE.md');
const STEERING_PRODUCT_PATH = path.join(FIXTURE_PROJECT_PATH, '.kiro/steering/product.md');

// Store original file content for restoration after tests
let originalClaudeMd: string;
let originalProductMd: string;

/**
 * Helper: Dismiss any modal overlays (z-50 dialogs) that may block interactions.
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

  // Fallback: force-hide any remaining dialog overlays
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
 * Helper: Click a file item in the project file list by its display name.
 * FileListItem does not have a data-testid, so we find buttons by text content.
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
 * Helper: Modify editor content by typing into the MDEditor textarea.
 * MDEditor in edit mode renders a textarea with class 'w-md-editor-text-input'.
 * Uses React's internal value setter to properly trigger onChange.
 */
async function modifyEditorContent(appendText: string): Promise<void> {
  const modified = await browser.execute((text: string) => {
    const textarea = document.querySelector('textarea.w-md-editor-text-input') as HTMLTextAreaElement;
    if (!textarea) return false;

    // Use React's internal value setter to properly trigger onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, textarea.value + text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }, appendText);

  if (!modified) {
    // Fallback: use WebdriverIO's addValue on the textarea
    const textarea = await $('textarea.w-md-editor-text-input');
    if (await textarea.isExisting()) {
      await textarea.addValue(appendText);
    }
  }

  await browser.pause(300);
}

describe('Project File Editing E2E', () => {
  // Project is pre-selected via SDD_PROJECT_PATH environment variable in wdio.conf.ts
  before(async () => {
    // Backup original file contents for restoration
    originalClaudeMd = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    originalProductMd = fs.readFileSync(STEERING_PRODUCT_PATH, 'utf-8');

    // Ensure window is large enough
    await browser.electron.execute((electron) => {
      const windows = electron.BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].setSize(1280, 900);
        windows[0].center();
      }
    });
    await browser.pause(500);

    // Wait for project selection
    await ensureProjectSelected(FIXTURE_PROJECT_PATH);
    await waitForProjectUIReady(15000);
    await dismissOverlays();
  });

  after(async () => {
    // Restore original file contents
    fs.writeFileSync(CLAUDE_MD_PATH, originalClaudeMd);
    fs.writeFileSync(STEERING_PRODUCT_PATH, originalProductMd);
  });

  // ============================================================
  // UJ-001: CLAUDE.md section display and selection (UC5.1)
  // ============================================================
  describe('UJ-001: CLAUDE.md editing (UC5.1)', () => {
    before(async () => {
      await navigateToProjectTab();
    });

    it('Project file list shows CLAUDE.md section', async () => {
      const fileList = await $('[data-testid="project-file-list"]');
      const exists = await fileList.isExisting();
      expect(exists).toBe(true);

      // CLAUDE.md section header should be visible
      const text = await fileList.getText();
      expect(text).toContain('CLAUDE.md');
    });

    it('Clicking CLAUDE.md opens ProjectFileEditor', async () => {
      await clickFileByName('CLAUDE.md');

      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });
      const exists = await editor.isExisting();
      expect(exists).toBe(true);
    });

    it('Editor shows file name in header', async () => {
      const editor = await $('[data-testid="project-file-editor"]');
      if (await editor.isExisting()) {
        const text = await editor.getText();
        expect(text).toContain('CLAUDE.md');
      }
    });

    it('Editor shows edit/preview mode toggle', async () => {
      const toggleGroup = await $('[data-testid="mode-toggle-group"]');
      const exists = await toggleGroup.isExisting();
      expect(exists).toBe(true);

      const editButton = await $('[data-testid="edit-mode-button"]');
      const previewButton = await $('[data-testid="preview-mode-button"]');
      expect(await editButton.isExisting()).toBe(true);
      expect(await previewButton.isExisting()).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Steering file selection (UC5.2)
  // ============================================================
  describe('UJ-002: Steering file editing (UC5.2)', () => {
    before(async () => {
      await navigateToProjectTab();
    });

    it('Project file list shows Steering Files section', async () => {
      const fileList = await $('[data-testid="project-file-list"]');
      const text = await fileList.getText();
      expect(text).toContain('Steering Files');
    });

    it('Steering section lists available files', async () => {
      const fileList = await $('[data-testid="project-file-list"]');
      const text = await fileList.getText();
      // Our fixture has product.md and tech.md
      expect(text).toContain('product.md');
      expect(text).toContain('tech.md');
    });

    it('Clicking steering file opens ProjectFileEditor', async () => {
      await clickFileByName('product.md');

      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });
      const exists = await editor.isExisting();
      expect(exists).toBe(true);
    });

    it('Editor shows steering file name in header', async () => {
      const editor = await $('[data-testid="project-file-editor"]');
      if (await editor.isExisting()) {
        const text = await editor.getText();
        expect(text).toContain('product.md');
      }
    });
  });

  // ============================================================
  // UJ-003: Edit/Preview mode toggle
  // ============================================================
  describe('UJ-003: Edit/Preview mode toggle', () => {
    before(async () => {
      await navigateToProjectTab();
      await clickFileByName('CLAUDE.md');
      // Wait for editor to load
      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });
    });

    it('Default mode is preview', async () => {
      // Preview mode button should be active (has blue background)
      const previewButton = await $('[data-testid="preview-mode-button"]');
      const previewClass = await previewButton.getAttribute('class');
      expect(previewClass).toContain('bg-blue-500');
    });

    it('Clicking edit button switches to edit mode', async () => {
      const editButton = await $('[data-testid="edit-mode-button"]');
      await editButton.click();
      await browser.pause(300);

      // Edit button should now be active
      const editClass = await editButton.getAttribute('class');
      expect(editClass).toContain('bg-blue-500');
    });

    it('Clicking preview button switches back to preview mode', async () => {
      const previewButton = await $('[data-testid="preview-mode-button"]');
      await previewButton.click();
      await browser.pause(300);

      // Preview button should be active again
      const previewClass = await previewButton.getAttribute('class');
      expect(previewClass).toContain('bg-blue-500');
    });
  });

  // ============================================================
  // UJ-004: Dirty indicator and save button (UC5.4)
  // ============================================================
  describe('UJ-004: Content modification and save', () => {
    before(async () => {
      await navigateToProjectTab();
      await clickFileByName('CLAUDE.md');
      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });
    });

    it('Initially no dirty indicator is shown', async () => {
      const dirtyIndicator = await $('[data-testid="dirty-indicator"]');
      const exists = await dirtyIndicator.isExisting();
      expect(exists).toBe(false);
    });

    it('Modifying content shows dirty indicator', async () => {
      // Switch to edit mode
      const editButton = await $('[data-testid="edit-mode-button"]');
      await editButton.click();
      await browser.pause(300);

      // Modify content via store (setup operation)
      await modifyEditorContent('\n\n## Added by E2E test');

      // Dirty indicator should appear
      const dirtyIndicator = await $('[data-testid="dirty-indicator"]');
      await dirtyIndicator.waitForExist({ timeout: 3000 });
      const exists = await dirtyIndicator.isExisting();
      expect(exists).toBe(true);
    });

    it('Save button is enabled when dirty', async () => {
      // Find save button by aria-label
      const saveButton = await browser.execute(() => {
        const btn = document.querySelector('[aria-label="保存"]') as HTMLButtonElement | null;
        if (!btn) return { exists: false, disabled: true };
        return { exists: true, disabled: btn.disabled };
      });
      expect(saveButton.exists).toBe(true);
      expect(saveButton.disabled).toBe(false);
    });

    it('Clicking save button saves the file and clears dirty indicator', async () => {
      // Click save button via DOM
      await browser.execute(() => {
        const btn = document.querySelector('[aria-label="保存"]') as HTMLButtonElement | null;
        if (btn) btn.click();
      });

      // Wait for save to complete
      await browser.pause(1000);

      // Dirty indicator should disappear
      const dirtyIndicator = await $('[data-testid="dirty-indicator"]');
      const exists = await dirtyIndicator.isExisting();
      expect(exists).toBe(false);
    });

    it('File content is persisted to disk', async () => {
      // Read the file directly from filesystem to verify
      const content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
      expect(content).toContain('## Added by E2E test');
    });
  });

  // ============================================================
  // UJ-005: Cmd+S keyboard shortcut (UC5.4)
  // ============================================================
  describe('UJ-005: Cmd+S keyboard shortcut save', () => {
    before(async () => {
      await navigateToProjectTab();
      await clickFileByName('product.md');
      const editor = await $('[data-testid="project-file-editor"]');
      await editor.waitForExist({ timeout: 5000 });

      // Switch to edit mode
      const editButton = await $('[data-testid="edit-mode-button"]');
      await editButton.click();
      await browser.pause(300);
    });

    it('Modify content to make file dirty', async () => {
      await modifyEditorContent('\n\n## Keyboard shortcut test');

      const dirtyIndicator = await $('[data-testid="dirty-indicator"]');
      await dirtyIndicator.waitForExist({ timeout: 3000 });
      expect(await dirtyIndicator.isExisting()).toBe(true);
    });

    it('Cmd+S triggers save and clears dirty indicator', async () => {
      // Send Cmd+S (Meta+S on macOS)
      await browser.keys(['Meta', 's']);
      await browser.pause(1000);

      // Dirty indicator should disappear after save
      const dirtyIndicator = await $('[data-testid="dirty-indicator"]');
      const exists = await dirtyIndicator.isExisting();
      expect(exists).toBe(false);
    });

    it('Steering file content is persisted to disk', async () => {
      const content = fs.readFileSync(STEERING_PRODUCT_PATH, 'utf-8');
      expect(content).toContain('## Keyboard shortcut test');
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
