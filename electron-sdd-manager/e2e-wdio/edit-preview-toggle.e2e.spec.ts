/**
 * Edit/Preview Toggle E2E Tests
 *
 * Coverage:
 * - UC5.7: Edit/Preview mode toggle for project files
 *
 * Test Scenarios:
 * - UJ-001: Mode toggle group exists when file is selected
 * - UJ-002: Edit mode button switches to edit view
 * - UJ-003: Preview mode button switches to preview view
 * - UJ-004: Default mode is preview
 *
 * Note: mermaid-preview.e2e.spec.ts tests Mermaid-specific preview.
 * This test validates the general Markdown Edit↔Preview toggle.
 *
 * Preconditions:
 * - Uses project-file-test fixture with CLAUDE.md and steering files
 */

import * as path from 'path';
import {
  ensureProjectSelected,
  waitForProjectUIReady,
  dismissDialogs,
} from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/project-file-test');

/**
 * Helper: Navigate to the project files tab and select a file
 */
async function navigateToProjectFilesAndSelectFile(): Promise<void> {
  // Click "Project" tab
  await browser.execute(() => {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent?.trim() === 'Project') {
        (tab as HTMLElement).click();
        return;
      }
    }
  });
  await browser.pause(500);

  // Click on CLAUDE.md file in the file list
  await browser.execute(() => {
    const items = document.querySelectorAll('[data-testid="project-file-list"] button');
    for (const item of items) {
      if (item.textContent?.includes('CLAUDE.md')) {
        (item as HTMLElement).click();
        return;
      }
    }
  });
  await browser.pause(500);
}

/**
 * Helper: Check if project file editor is visible
 */
async function isEditorVisible(): Promise<boolean> {
  return browser.execute(() => {
    return !!document.querySelector('[data-testid="project-file-editor"]');
  });
}

describe('Edit/Preview Toggle E2E', () => {
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
    await navigateToProjectFilesAndSelectFile();
  });

  // ============================================================
  // UJ-001: Mode toggle group exists
  // ============================================================
  describe('UJ-001: Mode toggle group', () => {
    it('Project file editor is displayed', async () => {
      const visible = await isEditorVisible();
      expect(visible).toBe(true);
    });

    it('Mode toggle group exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="mode-toggle-group"]');
      });
      expect(exists).toBe(true);
    });

    it('Edit mode button exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="edit-mode-button"]');
      });
      expect(exists).toBe(true);
    });

    it('Preview mode button exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="preview-mode-button"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Edit mode
  // ============================================================
  describe('UJ-002: Switch to Edit mode', () => {
    it('Clicking Edit button activates edit mode', async () => {
      await browser.execute(() => {
        const btn = document.querySelector('[data-testid="edit-mode-button"]') as HTMLElement;
        if (btn) btn.click();
      });
      await browser.pause(300);

      // Edit button should have active styling (blue background)
      const isActive = await browser.execute(() => {
        const btn = document.querySelector('[data-testid="edit-mode-button"]');
        if (!btn) return false;
        return btn.classList.contains('bg-blue-500') || btn.getAttribute('aria-pressed') === 'true';
      });
      expect(isActive).toBe(true);
    });

    it('MDEditor toolbar is visible in edit mode', async () => {
      // In edit mode, the MDEditor toolbar should be visible
      const hasToolbar = await browser.execute(() => {
        // MDEditor renders a toolbar with formatting buttons
        return !!document.querySelector('.w-md-editor-toolbar');
      });
      expect(hasToolbar).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: Preview mode
  // ============================================================
  describe('UJ-003: Switch to Preview mode', () => {
    it('Clicking Preview button activates preview mode', async () => {
      await browser.execute(() => {
        const btn = document.querySelector('[data-testid="preview-mode-button"]') as HTMLElement;
        if (btn) btn.click();
      });
      await browser.pause(300);

      // Preview button should have active styling
      const isActive = await browser.execute(() => {
        const btn = document.querySelector('[data-testid="preview-mode-button"]');
        if (!btn) return false;
        return btn.classList.contains('bg-blue-500') || btn.getAttribute('aria-pressed') === 'true';
      });
      expect(isActive).toBe(true);
    });

    it('MDEditor toolbar is hidden in preview mode', async () => {
      // In preview mode, toolbar should be hidden
      const toolbarHidden = await browser.execute(() => {
        const toolbar = document.querySelector('.w-md-editor-toolbar');
        if (!toolbar) return true;
        const style = window.getComputedStyle(toolbar);
        return style.display === 'none' || style.visibility === 'hidden';
      });
      expect(toolbarHidden).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: Default mode is preview
  // ============================================================
  describe('UJ-004: Default mode check', () => {
    it('Preview mode is the default when opening a file', async () => {
      // Select a different file to trigger fresh load
      await browser.execute(() => {
        const items = document.querySelectorAll('[data-testid="project-file-list"] button');
        for (const item of items) {
          if (item.textContent?.includes('product.md')) {
            (item as HTMLElement).click();
            return;
          }
        }
      });
      await browser.pause(500);

      // Preview button should be active by default
      const previewActive = await browser.execute(() => {
        const btn = document.querySelector('[data-testid="preview-mode-button"]');
        if (!btn) return false;
        return btn.classList.contains('bg-blue-500') || btn.getAttribute('aria-pressed') === 'true';
      });
      expect(previewActive).toBe(true);
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
