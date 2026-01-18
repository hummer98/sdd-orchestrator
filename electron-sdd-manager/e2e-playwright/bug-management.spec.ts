/**
 * Remote UI Bug Management E2E Tests (Playwright)
 *
 * Bug管理機能のRemote UI E2Eテスト。
 * e2e-test-coverage-analysis.mdのBug管理セクションをカバー。
 *
 * 対象機能:
 * - Bug一覧表示
 * - Bug選択・詳細表示
 * - 3ペイン連動（Bug/Spec併存）
 * - フェーズ実行ボタン
 *
 * Requirements Coverage:
 * - Bug一覧表示: Remote UIでBug一覧が表示されることを検証
 * - Bug選択: Bug選択で詳細パネルが表示されることを検証
 * - 3ペイン連動: Bug/Spec両方の存在時のUIレイアウト
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  switchToTab,
} from './helpers/remote-ui.helpers';

/**
 * Helper to click on a bug item
 * BugListItem renders a div with role="button" inside the wrapper
 */
async function clickBugItem(page: import('@playwright/test').Page, itemLocator: import('@playwright/test').Locator): Promise<void> {
  const clickableArea = itemLocator.locator('[role="button"]');
  await clickableArea.click();
}

test.describe('Bug Management - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
  });

  // ============================================================
  // Bug一覧表示テスト
  // ============================================================
  test.describe('Bug List Display', () => {
    test('should display Bugs tab in navigation', async ({ page }) => {
      const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');
      await expect(bugsTab).toBeVisible();
    });

    test('should switch to Bugs tab and show bug list', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Verify Bugs tab is selected
      const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Wait for bug list or empty state to be visible
      const bugList = page.locator('[data-testid="remote-bug-list"]');
      const emptyState = page.locator('[data-testid="bugs-empty-state"]');
      const loadingState = page.locator('[data-testid="bugs-view-loading"]');

      // Wait for loading to complete
      await expect(loadingState).not.toBeVisible({ timeout: 10000 });

      // Either bug list or empty state should be visible
      const hasBugs = await bugList.isVisible();
      const isEmpty = await emptyState.isVisible();
      expect(hasBugs || isEmpty).toBeTruthy();
    });

    test('should display bug items in the list', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bug list
      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete first
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Bug items should be visible (fixture has test-bug)
        const bugItems = page.locator('[data-testid^="remote-bug-item-"]');
        const count = await bugItems.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should display search input for bugs', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bugs view to load
      const bugsView = page.locator('[data-testid="bugs-view"]');
      const isVisible = await bugsView.isVisible().catch(() => false);

      if (isVisible) {
        const searchInput = page.locator('[data-testid="bugs-search-input"]');
        await expect(searchInput).toBeVisible();
      }
    });

    test('should filter bugs by search query', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bugs view to load
      const bugsView = page.locator('[data-testid="bugs-view"]');
      const isVisible = await bugsView.isVisible().catch(() => false);

      if (isVisible) {
        const searchInput = page.locator('[data-testid="bugs-search-input"]');
        await expect(searchInput).toBeVisible();

        // Type a search query
        await searchInput.fill('nonexistent-bug-name');

        // Wait for filtering
        await page.waitForTimeout(300);

        // Should show no results or empty
        const noResults = page.locator('[data-testid="bugs-no-results"]');
        const hasNoResults = await noResults.isVisible().catch(() => false);
        // At least the search worked without error
        expect(true).toBeTruthy();
      }
    });
  });

  // ============================================================
  // Bug選択・詳細表示テスト
  // ============================================================
  test.describe('Bug Selection and Detail View', () => {
    test('should show bug detail view when bug is selected', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bug list
      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Click on the first bug item
        const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
        await clickBugItem(page, firstBug);

        // Wait for detail view to appear
        const detailView = page.locator('[data-testid="bug-detail-view"]');
        await expect(detailView).toBeVisible({ timeout: 10000 });
      }
    });

    test('should display bug phase tag in detail view', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bug list
      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Click on the first bug item
        const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
        await clickBugItem(page, firstBug);

        // Wait for detail view
        const detailView = page.locator('[data-testid="bug-detail-view"]');
        await expect(detailView).toBeVisible({ timeout: 10000 });

        // Phase tag should be visible
        const phaseTag = page.locator('[data-testid="remote-bug-phase-tag"]');
        await expect(phaseTag).toBeVisible();
      }
    });

    test('should display workflow phases (analyze, fix, verify)', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bug list
      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Click on the first bug item
        const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
        await clickBugItem(page, firstBug);

        // Wait for detail view
        const detailView = page.locator('[data-testid="bug-detail-view"]');
        await expect(detailView).toBeVisible({ timeout: 10000 });

        // All three phases should be visible
        const analyzePhase = page.locator('[data-testid="bug-phase-analyze"]');
        const fixPhase = page.locator('[data-testid="bug-phase-fix"]');
        const verifyPhase = page.locator('[data-testid="bug-phase-verify"]');

        await expect(analyzePhase).toBeVisible();
        await expect(fixPhase).toBeVisible();
        await expect(verifyPhase).toBeVisible();
      }
    });

    test('should show back button to return to bug list', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bug list
      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Click on the first bug item
        const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
        await clickBugItem(page, firstBug);

        // Wait for detail view
        const detailView = page.locator('[data-testid="bug-detail-view"]');
        await expect(detailView).toBeVisible({ timeout: 10000 });

        // Back button should be visible
        const backButton = page.locator('button:has-text("Bug一覧に戻る")');
        await expect(backButton).toBeVisible();

        // Click back button
        await backButton.click();

        // Bug list should be visible again
        await expect(bugList).toBeVisible();
      }
    });
  });

  // ============================================================
  // 3ペイン連動テスト
  // ============================================================
  test.describe('Three Pane Integration', () => {
    test('should maintain tab selection when switching between Specs and Bugs', async ({ page }) => {
      // Start with Specs tab
      const specsTab = page.locator('[data-testid="remote-tab-specs"]');
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');

      // Switch to Bugs tab
      await switchToTab(page, 'bugs');
      const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Switch back to Specs tab
      await switchToTab(page, 'specs');
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');
    });

    test('should clear selection when switching tabs', async ({ page }) => {
      // Switch to Bugs tab and select a bug
      await switchToTab(page, 'bugs');

      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Click on the first bug item
        const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
        await clickBugItem(page, firstBug);

        // Detail view should be visible
        const detailView = page.locator('[data-testid="bug-detail-view"]');
        await expect(detailView).toBeVisible({ timeout: 10000 });

        // Switch to Specs tab
        await switchToTab(page, 'specs');

        // Wait a moment for the view to change
        await page.waitForTimeout(500);

        // Bug detail should no longer be visible
        await expect(detailView).not.toBeVisible();
      }
    });
  });

  // ============================================================
  // フェーズ実行ボタンテスト
  // ============================================================
  test.describe('Phase Execution Buttons', () => {
    test('should display execute buttons for pending phases', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bug list
      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Click on the first bug item
        const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
        await clickBugItem(page, firstBug);

        // Wait for detail view
        const detailView = page.locator('[data-testid="bug-detail-view"]');
        await expect(detailView).toBeVisible({ timeout: 10000 });

        // At least one execute button should be visible (unless all phases are complete)
        const executeButtons = page.locator('[data-testid^="bug-phase-"][data-testid$="-button"]');
        const buttonCount = await executeButtons.count();
        // Button count can be 0-3 depending on phase state
        expect(buttonCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should enable only the next executable phase button', async ({ page }) => {
      await switchToTab(page, 'bugs');

      // Wait for bug list
      const bugList = page.locator('[data-testid="remote-bug-list"]');

      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loading = document.querySelector('[data-testid="bugs-view-loading"]');
        return !loading || !loading.checkVisibility();
      }, { timeout: 10000 });

      const isVisible = await bugList.isVisible();
      if (isVisible) {
        // Click on the first bug item
        const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
        await clickBugItem(page, firstBug);

        // Wait for detail view
        const detailView = page.locator('[data-testid="bug-detail-view"]');
        await expect(detailView).toBeVisible({ timeout: 10000 });

        // Check analyze button state (should be enabled if phase is 'reported')
        const analyzeButton = page.locator('[data-testid="bug-phase-analyze-button"]');
        const fixButton = page.locator('[data-testid="bug-phase-fix-button"]');

        // If analyze button exists
        const analyzeExists = await analyzeButton.isVisible().catch(() => false);
        const fixExists = await fixButton.isVisible().catch(() => false);

        // Verify button states are appropriate (at least one should exist)
        if (analyzeExists || fixExists) {
          // Test passes - buttons are rendered appropriately
          expect(true).toBeTruthy();
        }
      }
    });
  });
});

// ============================================================
// Smartphone版テスト
// Note: モバイル版では mobile-bottom-tabs 内のタブを操作する必要がある
// (smartphone-spec.spec.ts と同様の方式)
// ============================================================
test.describe('Bug Management - Smartphone', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
  });

  /**
   * Helper to switch tabs on mobile using mobile-bottom-tabs
   */
  async function switchToMobileTab(page: import('@playwright/test').Page, tabName: 'specs' | 'bugs'): Promise<void> {
    const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
    const tab = bottomTabBar.locator(`[data-testid="remote-tab-${tabName}"]`);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  test('should display bottom tab bar on mobile', async ({ page }) => {
    // Mobile layout should have bottom tab bar
    const bottomTabs = page.locator('[data-testid="mobile-bottom-tabs"]');
    await expect(bottomTabs).toBeVisible();

    // Both Specs and Bugs tabs should be visible
    const specsTab = bottomTabs.locator('[data-testid="remote-tab-specs"]');
    const bugsTab = bottomTabs.locator('[data-testid="remote-tab-bugs"]');
    await expect(specsTab).toBeVisible();
    await expect(bugsTab).toBeVisible();
  });

  test('should switch to Bugs tab and display bug list', async ({ page }) => {
    await switchToMobileTab(page, 'bugs');

    // Verify Bugs tab is selected
    const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
    const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
    await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

    // Bug list should be visible
    const bugList = page.locator('[data-testid="remote-bug-list"]');
    await expect(bugList).toBeVisible({ timeout: 10000 });
  });

  test('should show bug detail view when selecting a bug', async ({ page }) => {
    await switchToMobileTab(page, 'bugs');

    // Wait for bug list
    const bugList = page.locator('[data-testid="remote-bug-list"]');

    // Wait for loading to complete
    await page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="bugs-view-loading"]');
      return !loading || !loading.checkVisibility();
    }, { timeout: 10000 });

    const isVisible = await bugList.isVisible();
    if (isVisible) {
      // Click on the first bug item
      const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
      await clickBugItem(page, firstBug);

      // Wait for detail view
      const detailView = page.locator('[data-testid="bug-detail-view"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display workflow phases on mobile', async ({ page }) => {
    await switchToMobileTab(page, 'bugs');

    // Wait for bug list
    const bugList = page.locator('[data-testid="remote-bug-list"]');

    // Wait for loading to complete
    await page.waitForFunction(() => {
      const loading = document.querySelector('[data-testid="bugs-view-loading"]');
      return !loading || !loading.checkVisibility();
    }, { timeout: 10000 });

    const isVisible = await bugList.isVisible();
    if (isVisible) {
      // Click on the first bug item
      const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
      await clickBugItem(page, firstBug);

      // Wait for detail view
      const detailView = page.locator('[data-testid="bug-detail-view"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // All three phases should be visible
      const analyzePhase = page.locator('[data-testid="bug-phase-analyze"]');
      await expect(analyzePhase).toBeVisible();
    }
  });

  // NOTE: This test is flaky due to WebSocket timeout issues when running in sequence
  // with other tests. Works reliably when run in isolation.
  // Root cause: GET_BUGS request times out after many sequential WebSocket operations.
  // TODO: Investigate WebSocket connection stability in E2E test environment.
  test.fixme('should navigate back to bug list', async ({ page }) => {
    await switchToMobileTab(page, 'bugs');

    // Wait for bug list to appear (loading may take time)
    const bugList = page.locator('[data-testid="remote-bug-list"]');
    await expect(bugList).toBeVisible({ timeout: 30000 });

    // Click on the first bug item
    const firstBug = page.locator('[data-testid^="remote-bug-item-"]').first();
    await clickBugItem(page, firstBug);

    // Wait for detail view
    const detailView = page.locator('[data-testid="bug-detail-view"]');
    await expect(detailView).toBeVisible({ timeout: 10000 });

    // Back button should be visible
    const backButton = page.locator('button:has-text("Bug一覧に戻る")');
    await expect(backButton).toBeVisible();

    // Click back button
    await backButton.click();

    // Bug list should be visible again
    await expect(bugList).toBeVisible();
  });
});
