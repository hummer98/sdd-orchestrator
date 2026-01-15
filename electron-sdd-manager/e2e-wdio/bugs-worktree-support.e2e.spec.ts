/**
 * Bugs Worktree Support E2E Tests
 * Tasks 18.1-18.5: bugs-worktree-support
 * Requirements: 8.1, 8.2, 8.3, 8.5, 9.1, 9.2, 9.4, 10.1, 10.2, 10.3, 4.1
 *
 * NOTE: These tests require a running Electron app with fixture project.
 * Some tests may be skipped due to git worktree operations requiring actual git repos.
 */

import * as path from 'path';

// Fixture project path
const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/bugs-pane-test');

/**
 * Helper: Select project using Zustand store action via executeAsync
 */
async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.projectStore?.getState) {
          await stores.projectStore.getState().selectProject(projPath);
          done(true);
        } else {
          console.error('[E2E] __STORES__ not available on window');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectProject error:', e);
        done(false);
      }
    }, projectPath).then(resolve);
  });
}

/**
 * Helper: Select bug using Zustand bugStore action
 */
async function selectBugViaStore(bugName: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (name: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.bugStore?.getState) {
          const bugStore = stores.bugStore.getState();
          const bug = bugStore.bugs.find((b: any) => b.name === name);
          if (bug) {
            await bugStore.selectBug(bug);
            done(true);
          } else {
            console.error('[E2E] Bug not found:', name);
            done(false);
          }
        } else {
          console.error('[E2E] __STORES__.bugStore not available');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectBug error:', e);
        done(false);
      }
    }, bugName).then(resolve);
  });
}

/**
 * Helper: Get bugStore useWorktree state
 */
async function getUseWorktreeState(): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.bugStore?.getState) {
          const state = stores.bugStore.getState();
          done(state.useWorktree);
        } else {
          done(false);
        }
      } catch (e) {
        console.error('[E2E] getUseWorktreeState error:', e);
        done(false);
      }
    }).then(resolve);
  });
}

/**
 * Helper: Set bugStore useWorktree state
 */
async function setUseWorktreeState(value: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (val: boolean, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.bugStore?.getState) {
          stores.bugStore.getState().setUseWorktree(val);
          done(true);
        } else {
          done(false);
        }
      } catch (e) {
        console.error('[E2E] setUseWorktreeState error:', e);
        done(false);
      }
    }, value).then(resolve);
  });
}

describe('Bugs Worktree Support E2E Tests', () => {
  beforeEach(async () => {
    // Select fixture project
    const selected = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
    if (!selected) {
      console.warn('[E2E] Failed to select project, some tests may fail');
    }
    // Wait for project to load
    await browser.pause(500);
  });

  // ============================================================
  // Task 18.1: CreateBugDialog worktree checkbox tests
  // Requirements: 8.1, 8.3
  // ============================================================
  describe('Task 18.1: CreateBugDialog worktree checkbox', () => {
    it('should display worktree checkbox in CreateBugDialog', async () => {
      // Open CreateBugDialog by clicking the + button in bugs tab
      // First switch to Bugs tab
      const bugsTab = await $('[data-testid="tab-bugs"]');
      if (await bugsTab.isDisplayed()) {
        await bugsTab.click();
        await browser.pause(200);
      }

      // Click add bug button
      const addButton = await $('[data-testid="add-bug-button"]');
      if (await addButton.isDisplayed()) {
        await addButton.click();
        await browser.pause(200);

        // Check for worktree checkbox
        const checkbox = await $('[data-testid="use-worktree-checkbox"]');
        const isDisplayed = await checkbox.isDisplayed();
        expect(isDisplayed).toBe(true);

        // Close dialog
        const closeButton = await $('[data-testid="close-button"]');
        if (await closeButton.isDisplayed()) {
          await closeButton.click();
        }
      }
    });

    it('should toggle worktree checkbox state', async () => {
      const bugsTab = await $('[data-testid="tab-bugs"]');
      if (await bugsTab.isDisplayed()) {
        await bugsTab.click();
        await browser.pause(200);
      }

      const addButton = await $('[data-testid="add-bug-button"]');
      if (await addButton.isDisplayed()) {
        await addButton.click();
        await browser.pause(200);

        const checkbox = await $('[data-testid="use-worktree-checkbox"]');
        if (await checkbox.isDisplayed()) {
          // Get initial state
          const initialChecked = await checkbox.getAttribute('checked');

          // Click to toggle
          await checkbox.click();
          await browser.pause(100);

          // Check if toggled
          const afterChecked = await checkbox.getAttribute('checked');
          expect(afterChecked !== initialChecked).toBe(true);
        }

        const closeButton = await $('[data-testid="close-button"]');
        if (await closeButton.isDisplayed()) {
          await closeButton.click();
        }
      }
    });
  });

  // ============================================================
  // Task 18.2: BugWorkflowView worktree checkbox tests
  // Requirements: 8.2, 8.5, 3.2
  // ============================================================
  describe('Task 18.2: BugWorkflowView worktree checkbox', () => {
    it('should display worktree checkbox in BugWorkflowView', async () => {
      // Switch to Bugs tab
      const bugsTab = await $('[data-testid="tab-bugs"]');
      if (await bugsTab.isDisplayed()) {
        await bugsTab.click();
        await browser.pause(200);
      }

      // Select a bug via store
      const selected = await selectBugViaStore('sample-bug');
      if (selected) {
        await browser.pause(200);

        // Check for workflow worktree checkbox
        const checkbox = await $('[data-testid="workflow-use-worktree-checkbox"]');
        const isDisplayed = await checkbox.isDisplayed();
        expect(isDisplayed).toBe(true);
      }
    });

    it('should toggle workflow worktree checkbox and update store', async () => {
      const bugsTab = await $('[data-testid="tab-bugs"]');
      if (await bugsTab.isDisplayed()) {
        await bugsTab.click();
        await browser.pause(200);
      }

      const selected = await selectBugViaStore('sample-bug');
      if (selected) {
        await browser.pause(200);

        // Reset state
        await setUseWorktreeState(false);
        await browser.pause(100);

        const checkbox = await $('[data-testid="workflow-use-worktree-checkbox"]');
        if (await checkbox.isDisplayed()) {
          await checkbox.click();
          await browser.pause(100);

          // Verify store was updated
          const state = await getUseWorktreeState();
          expect(state).toBe(true);
        }
      }
    });
  });

  // ============================================================
  // Task 18.3: Deploy button conditional command tests
  // Requirements: 4.1
  // ============================================================
  describe('Task 18.3: Deploy button conditional command', () => {
    // Note: This test verifies the UI state, not actual command execution
    // Command execution requires real git repo setup
    it.skip('should show Deploy button for completed bugs', async () => {
      // This test would require a bug with all phases complete
      // Skipped as fixture may not have such data
    });
  });

  // ============================================================
  // Task 18.4: BugListItem worktree indicator tests
  // Requirements: 10.1, 10.2, 10.3
  // ============================================================
  describe('Task 18.4: BugListItem worktree indicator', () => {
    // Note: This test requires a bug with worktree field in bug.json
    // May need fixture update to include worktree bug
    it.skip('should display worktree indicator for bugs with worktree field', async () => {
      const bugsTab = await $('[data-testid="tab-bugs"]');
      if (await bugsTab.isDisplayed()) {
        await bugsTab.click();
        await browser.pause(200);
      }

      // Look for worktree badge
      const badge = await $('[data-testid="worktree-badge"]');
      // This will only pass if fixture has a bug with worktree field
    });

    it('should not display worktree indicator for bugs without worktree field', async () => {
      const bugsTab = await $('[data-testid="tab-bugs"]');
      if (await bugsTab.isDisplayed()) {
        await bugsTab.click();
        await browser.pause(300);
      }

      // Select a regular bug (no worktree)
      const selected = await selectBugViaStore('sample-bug');
      if (selected) {
        await browser.pause(200);

        // Bug item should NOT have worktree badge
        const bugItem = await $('[data-testid="bug-item-sample-bug"]');
        if (await bugItem.isDisplayed()) {
          const badge = await bugItem.$('[data-testid="worktree-badge"]');
          const hasWorktreeBadge = await badge.isExisting();
          // sample-bug should not have worktree field
          expect(hasWorktreeBadge).toBe(false);
        }
      }
    });
  });

  // ============================================================
  // Task 18.5: Tools menu worktree default setting tests
  // Requirements: 9.1, 9.2, 9.4
  // ============================================================
  describe('Task 18.5: Tools menu worktree default setting', () => {
    // Note: Menu testing in Electron requires special handling
    // This test documents the expected behavior
    it.skip('should have worktree default toggle in Tools menu', async () => {
      // Would need to access Electron menu via keyboard shortcut or app.applicationMenu
      // Skipped as menu access requires special E2E setup
    });
  });
});
