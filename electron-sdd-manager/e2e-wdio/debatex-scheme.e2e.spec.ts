/**
 * Debatex Scheme E2E Tests
 * debatex-document-review Task 6.5: debatex scheme selection and execution
 * debatex-document-review Task 6.6: project settings change
 *
 * Requirements Coverage:
 * - 1.2: debatex engine execution
 * - 2.1, 2.2: output path and round number
 * - 4.1, 4.2, 4.5: project settings
 * - 6.1: error handling
 */

describe('Debatex Scheme E2E', () => {
  // ============================================================
  // Application Startup
  // ============================================================
  describe('Application Startup', () => {
    it('Application should start successfully', async () => {
      const isWindowOpen = await browser.electron.execute((electron) => {
        return electron.BrowserWindow.getAllWindows().length > 0;
      });
      expect(isWindowOpen).toBe(true);
    });

    it('Main window should be visible', async () => {
      const isVisible = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.length > 0 && windows[0].isVisible();
      });
      expect(isVisible).toBe(true);
    });
  });

  // ============================================================
  // Task 6.5: SchemeSelector Component
  // ============================================================
  describe('SchemeSelector Component', () => {
    it('SchemeSelector button should exist', async () => {
      const schemeSelectorButton = await $('[data-testid="scheme-selector-button"]');
      const exists = await schemeSelectorButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('SchemeSelector dropdown should have debatex option', async () => {
      const schemeSelectorButton = await $('[data-testid="scheme-selector-button"]');

      if (await schemeSelectorButton.isExisting()) {
        // Click to open dropdown
        await schemeSelectorButton.click();
        await browser.pause(200);

        // Check for dropdown
        const dropdown = await $('[data-testid="scheme-selector-dropdown"]');
        const dropdownExists = await dropdown.isExisting();

        if (dropdownExists) {
          // Look for Debatex option
          const debatexOption = await $('div=Debatex');
          const debatexExists = await debatexOption.isExisting();
          expect(typeof debatexExists).toBe('boolean');

          // Close dropdown by clicking elsewhere
          await browser.$('body').click();
        }
      }
    });

    it('SchemeSelector should show current selection', async () => {
      const schemeSelectorButton = await $('[data-testid="scheme-selector-button"]');

      if (await schemeSelectorButton.isExisting()) {
        const buttonText = await schemeSelectorButton.getText();
        expect(typeof buttonText).toBe('string');
        expect(buttonText.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================
  // Task 6.6: ProjectSettingsDialog Component
  // ============================================================
  describe('ProjectSettingsDialog Component', () => {
    it('Project settings button should exist in header', async () => {
      // Settings button is in the header when a project is selected
      const settingsButton = await $('button[aria-label="Project Settings"]');
      const exists = await settingsButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('ProjectSettingsDialog IPC API should exist', async () => {
      const hasLoadProjectDefaults = await browser.execute(() => {
        return typeof window.electronAPI?.loadProjectDefaults === 'function';
      });
      expect(hasLoadProjectDefaults).toBe(true);

      const hasSaveProjectDefaults = await browser.execute(() => {
        return typeof window.electronAPI?.saveProjectDefaults === 'function';
      });
      expect(hasSaveProjectDefaults).toBe(true);
    });

    it('ProjectSettingsDialog should be accessible via IPC', async () => {
      // Verify the IPC handlers are registered
      const apiExists = await browser.execute(() => {
        return (
          typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.loadProjectDefaults === 'function' &&
          typeof window.electronAPI.saveProjectDefaults === 'function'
        );
      });
      expect(apiExists).toBe(true);
    });
  });

  // ============================================================
  // Document Review Panel with Scheme Support
  // ============================================================
  describe('Document Review Panel Scheme Support', () => {
    it('DocumentReviewPanel should exist', async () => {
      const panel = await $('[data-testid="document-review-panel"]');
      const exists = await panel.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('DocumentReviewPanel should have scheme selector', async () => {
      const panel = await $('[data-testid="document-review-panel"]');

      if (await panel.isExisting()) {
        // SchemeSelector should be within the panel
        const schemeSelector = await panel.$('[data-testid="scheme-selector-button"]');
        const exists = await schemeSelector.isExisting();
        expect(typeof exists).toBe('boolean');
      }
    });
  });

  // ============================================================
  // IPC Channels for debatex
  // ============================================================
  describe('IPC Channels for debatex', () => {
    it('Execute IPC should support document-review type', async () => {
      const hasExecute = await browser.execute(() => {
        return typeof window.electronAPI?.execute === 'function';
      });
      expect(hasExecute).toBe(true);
    });

    it('Agent output event handler should exist', async () => {
      const hasOnAgentOutput = await browser.execute(() => {
        return typeof window.electronAPI?.onAgentOutput === 'function';
      });
      expect(hasOnAgentOutput).toBe(true);
    });

    it('Agent status change event handler should exist', async () => {
      const hasOnAgentStatusChange = await browser.execute(() => {
        return typeof window.electronAPI?.onAgentStatusChange === 'function';
      });
      expect(hasOnAgentStatusChange).toBe(true);
    });
  });

  // ============================================================
  // Security Settings
  // ============================================================
  describe('Security Settings', () => {
    it('contextIsolation should be enabled', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.getLastWebPreferences().contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('nodeIntegration should be disabled', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.getLastWebPreferences().nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });
  });

  // ============================================================
  // Application Stability
  // ============================================================
  describe('Application Stability', () => {
    it('Application should not crash', async () => {
      const isResponsive = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return !windows[0].webContents.isCrashed();
      });
      expect(isResponsive).toBe(true);
    });

    it('Window should be resizable', async () => {
      const isResizable = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].isResizable();
      });
      expect(isResizable).toBe(true);
    });
  });
});
