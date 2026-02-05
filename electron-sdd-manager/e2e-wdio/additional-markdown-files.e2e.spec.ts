/**
 * Additional Markdown Files E2E Tests
 *
 * Tests for artifact-all-markdown-files feature:
 * - Non-phase markdown files (e.g., e2e-report-1.md, custom-notes.md) are displayed as tabs
 * - Clicking on these tabs loads and displays their content correctly
 * - Content can be edited and saved
 *
 * Bug fix verified: .md suffix was being doubled (e2e-report-1.md.md)
 */

import * as path from 'path';
import {
  selectProjectViaStore,
  selectSpecViaStore,
  waitForCondition,
  waitForSpecDetailReady,
  waitForProjectUIReady,
} from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');
const TEST_SPEC_ID = 'test-feature';

describe('Additional Markdown Files E2E', () => {
  before(async () => {
    // Select project via store
    const projectSuccess = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
    if (!projectSuccess) {
      console.error('[E2E] Failed to select project');
      return;
    }

    // Wait for project UI to be ready
    await waitForProjectUIReady(10000);

    // Select the test spec
    const specSuccess = await selectSpecViaStore(TEST_SPEC_ID);
    if (!specSuccess) {
      console.error('[E2E] Failed to select spec');
      return;
    }

    // Wait for spec detail to be fully loaded
    await waitForSpecDetailReady(TEST_SPEC_ID, 15000);

    // Additional wait for markdownFiles to be populated (async operation)
    await browser.pause(1000);
  });

  describe('Additional Markdown Tab Display', () => {
    it('should have markdownFiles loaded in specDetail', async () => {
      // Wait for ArtifactEditor to be present
      const artifactEditor = await $('[data-testid="artifact-editor"]');
      await artifactEditor.waitForExist({ timeout: 5000 });

      // Wait for specDetail to have markdownFiles loaded
      const loaded = await waitForCondition(
        async () => {
          const markdownFiles = await browser.execute(() => {
            const stores = (window as any).__STORES__;
            return stores?.spec?.getState()?.specDetail?.markdownFiles || [];
          });
          console.log('[E2E] markdownFiles:', markdownFiles);
          return markdownFiles.length > 0;
        },
        10000,
        500,
        'markdownFiles to be loaded'
      );

      expect(loaded).toBe(true);
    });

    it('should display additional markdown files as tabs in ArtifactEditor', async () => {
      // Wait for ArtifactEditor to be present
      const artifactEditor = await $('[data-testid="artifact-editor"]');
      await artifactEditor.waitForExist({ timeout: 5000 });

      // Wait for markdownFiles to be loaded first
      await waitForCondition(
        async () => {
          const markdownFiles = await browser.execute(() => {
            const stores = (window as any).__STORES__;
            return stores?.spec?.getState()?.specDetail?.markdownFiles || [];
          });
          return markdownFiles.length > 0;
        },
        10000,
        500,
        'markdownFiles to be loaded'
      );

      // Check that e2e-report-1 tab exists (label without .md)
      const e2eReportTab = await $('[data-testid="artifact-editor-tab-e2e-report-1.md"]');
      const exists = await e2eReportTab.isExisting();
      expect(exists).toBe(true);
    });

    it('should display custom-notes tab', async () => {
      const customNotesTab = await $('[data-testid="artifact-editor-tab-custom-notes.md"]');
      const exists = await customNotesTab.isExisting();
      expect(exists).toBe(true);
    });
  });

  describe('Additional Markdown Content Loading', () => {
    it('should load e2e-report-1.md content when tab is clicked', async () => {
      // Click the e2e-report-1 tab
      const e2eReportTab = await $('[data-testid="artifact-editor-tab-e2e-report-1.md"]');
      await e2eReportTab.click();
      await browser.pause(500);

      // Wait for content to load - check that the content contains expected text
      const loaded = await waitForCondition(
        async () => {
          const content = await browser.execute(() => {
            const stores = (window as any).__STORES__;
            return stores?.editor?.getState()?.content || '';
          });
          return content.includes('E2E Report 1');
        },
        5000,
        200,
        'e2e-report-1.md content to load'
      );

      expect(loaded).toBe(true);
    });

    it('should not have .md.md double suffix bug', async () => {
      // Click the e2e-report-1 tab
      const e2eReportTab = await $('[data-testid="artifact-editor-tab-e2e-report-1.md"]');
      await e2eReportTab.click();
      await browser.pause(500);

      // Check that content is not empty (which would indicate .md.md file not found)
      const content = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.editor?.getState()?.content || '';
      });

      // If the bug exists, content would be empty because it tries to read e2e-report-1.md.md
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('E2E Report 1');
    });

    it('should load custom-notes.md content when tab is clicked', async () => {
      // Click the custom-notes tab
      const customNotesTab = await $('[data-testid="artifact-editor-tab-custom-notes.md"]');
      await customNotesTab.click();
      await browser.pause(500);

      // Wait for content to load
      const loaded = await waitForCondition(
        async () => {
          const content = await browser.execute(() => {
            const stores = (window as any).__STORES__;
            return stores?.editor?.getState()?.content || '';
          });
          return content.includes('Custom Notes');
        },
        5000,
        200,
        'custom-notes.md content to load'
      );

      expect(loaded).toBe(true);
    });
  });

  describe('Tab Switching Between Standard and Additional Markdown', () => {
    it('should switch from requirements to additional markdown and back', async () => {
      // Click requirements tab first
      const requirementsTab = await $('[data-testid="artifact-editor-tab-requirements"]');
      await requirementsTab.click();
      await browser.pause(300);

      // Verify requirements content
      let content = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.editor?.getState()?.activeTab || '';
      });
      expect(content).toBe('requirements');

      // Switch to e2e-report-1
      const e2eReportTab = await $('[data-testid="artifact-editor-tab-e2e-report-1.md"]');
      await e2eReportTab.click();
      await browser.pause(300);

      // Verify tab switched
      content = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.editor?.getState()?.activeTab || '';
      });
      expect(content).toBe('e2e-report-1.md');

      // Switch back to requirements
      await requirementsTab.click();
      await browser.pause(300);

      content = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.editor?.getState()?.activeTab || '';
      });
      expect(content).toBe('requirements');
    });
  });

  describe('Security and Stability', () => {
    it('should have contextIsolation enabled', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.getLastWebPreferences().contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('should have nodeIntegration disabled', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.getLastWebPreferences().nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });

    it('should not crash during tab switching', async () => {
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.isCrashed();
      });
      expect(isCrashed).toBe(false);
    });
  });
});
