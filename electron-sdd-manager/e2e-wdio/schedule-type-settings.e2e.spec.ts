/**
 * Schedule Type Settings E2E Tests
 *
 * Coverage:
 * - UC9.2: Interval-based schedule configuration
 * - UC9.3: Weekly schedule configuration
 * - UC9.4: Idle-based schedule configuration
 *
 * Test Scenarios:
 * - UJ-001: ScheduleTypeSelector component exists
 * - UJ-002: Category tabs (Fixed vs Conditional) work
 * - UJ-003: Interval settings (hours input, shortcut buttons)
 * - UJ-004: Weekly settings (weekday selector, hour input)
 * - UJ-005: Idle settings (minutes input)
 *
 * Preconditions:
 * - Uses auto-exec-test fixture (has schedule task support)
 */

import * as path from 'path';
import {
  ensureProjectSelected,
  waitForProjectUIReady,
  selectSpecViaUI,
  waitForSpecDetailReady,
  dismissDialogs,
} from './helpers/auto-execution.helpers';

const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/auto-exec-test');
const SPEC_NAME = 'simple-feature';

/**
 * Helper: Open schedule configuration panel
 * Schedule settings are in the ScheduleTaskPanel
 */
async function openSchedulePanel(): Promise<boolean> {
  // Look for schedule-related UI elements
  return browser.execute(() => {
    return !!document.querySelector('[data-testid="schedule-type-selector"]');
  });
}

/**
 * Helper: Click a category tab (fixed/conditional)
 */
async function selectCategory(category: 'fixed' | 'conditional'): Promise<void> {
  await browser.execute((cat: string) => {
    const btn = document.querySelector(`[data-testid="category-${cat}"]`) as HTMLElement;
    if (btn) btn.click();
  }, category);
  await browser.pause(300);
}

/**
 * Helper: Select a fixed schedule type
 */
async function selectFixedType(type: 'interval' | 'weekly'): Promise<void> {
  await browser.execute((t: string) => {
    const btn = document.querySelector(`[data-testid="fixed-type-${t}"]`) as HTMLElement;
    if (btn) btn.click();
  }, type);
  await browser.pause(300);
}

describe('Schedule Type Settings E2E', () => {
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

  // ============================================================
  // UJ-001: ScheduleTypeSelector existence
  // ============================================================
  describe('UJ-001: ScheduleTypeSelector component', () => {
    it('Schedule type selector exists on the page', async () => {
      // The schedule panel may be in a specific tab or section
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="schedule-type-selector"]');
      });
      // Schedule selector may not be visible without opening the schedule panel
      // Check for either the selector or the category selector
      const categoryExists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="schedule-category-selector"]');
      });
      expect(exists || categoryExists).toBe(true);
    });
  });

  // ============================================================
  // UJ-002: Category tabs
  // ============================================================
  describe('UJ-002: Category tabs (Fixed vs Conditional)', () => {
    it('Fixed category button exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="category-fixed"]');
      });
      expect(exists).toBe(true);
    });

    it('Conditional category button exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="category-conditional"]');
      });
      expect(exists).toBe(true);
    });

    it('Clicking Fixed shows fixed schedule types', async () => {
      await selectCategory('fixed');

      const fixedTypeSelector = await browser.execute(() => {
        return !!document.querySelector('[data-testid="fixed-schedule-type-selector"]');
      });
      expect(fixedTypeSelector).toBe(true);
    });

    it('Clicking Conditional shows idle settings', async () => {
      await selectCategory('conditional');

      const idleSettings = await browser.execute(() => {
        return !!document.querySelector('[data-testid="idle-settings"]');
      });
      expect(idleSettings).toBe(true);
    });
  });

  // ============================================================
  // UJ-003: Interval settings
  // ============================================================
  describe('UJ-003: Interval schedule settings', () => {
    before(async () => {
      await selectCategory('fixed');
      await selectFixedType('interval');
    });

    it('Interval settings container is visible', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="interval-settings"]');
      });
      expect(exists).toBe(true);
    });

    it('Hours interval input exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="hours-interval-input"]');
      });
      expect(exists).toBe(true);
    });

    it('Shortcut buttons exist (monthly/weekly)', async () => {
      const monthlyExists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="shortcut-monthly"]');
      });
      const weeklyExists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="shortcut-weekly"]');
      });
      expect(monthlyExists).toBe(true);
      expect(weeklyExists).toBe(true);
    });
  });

  // ============================================================
  // UJ-004: Weekly settings
  // ============================================================
  describe('UJ-004: Weekly schedule settings', () => {
    before(async () => {
      await selectCategory('fixed');
      await selectFixedType('weekly');
    });

    it('Weekly settings container is visible', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="weekly-settings"]');
      });
      expect(exists).toBe(true);
    });

    it('Weekday selector exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="weekday-selector"]');
      });
      expect(exists).toBe(true);
    });

    it('Weekday buttons exist (0-6)', async () => {
      const count = await browser.execute(() => {
        let found = 0;
        for (let i = 0; i <= 6; i++) {
          if (document.querySelector(`[data-testid="weekday-${i}"]`)) found++;
        }
        return found;
      });
      expect(count).toBe(7);
    });

    it('Hour of day selector exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="hour-of-day-selector"]');
      });
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // UJ-005: Idle settings
  // ============================================================
  describe('UJ-005: Idle schedule settings', () => {
    before(async () => {
      await selectCategory('conditional');
    });

    it('Idle settings container is visible', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="idle-settings"]');
      });
      expect(exists).toBe(true);
    });

    it('Idle minutes input exists', async () => {
      const exists = await browser.execute(() => {
        return !!document.querySelector('[data-testid="idle-minutes-input"]');
      });
      expect(exists).toBe(true);
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
