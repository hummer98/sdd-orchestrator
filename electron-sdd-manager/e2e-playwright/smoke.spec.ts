/**
 * Remote UI Smoke Tests (Playwright Standalone)
 *
 * Remote UIの基本動作を検証するスモークテスト。
 * Electronアプリをglobal-setupで起動し、Playwright経由でブラウザテストを実行する。
 *
 * Requirements Coverage:
 * - 4.1: Remote UIにブラウザからアクセスできることを検証
 * - 4.2: Spec一覧が表示されることを検証
 * - 4.3: Spec選択で詳細パネルが表示されることを検証
 * - 4.4: Bugsタブへの切り替えが動作することを検証
 */

import { test, expect } from '@playwright/test';
import {
  waitForConnection,
  waitForSpecList,
  selectSpec,
  switchToTab,
} from './helpers/remote-ui.helpers';

test.describe('Remote UI Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Remote UI (baseURL is configured in playwright.config.ts)
    await page.goto('/');
    // Wait for WebSocket connection to be established
    await waitForConnection(page);
  });

  /**
   * Requirement 4.1: Remote UIにブラウザからアクセスできることを検証
   */
  test('should access Remote UI and show connected status', async ({ page }) => {
    const statusText = page.locator('[data-testid="remote-status-text"]');
    await expect(statusText).toHaveText('Connected');
  });

  /**
   * Requirement 4.2: Spec一覧が表示されることを検証
   */
  test('should display spec list', async ({ page }) => {
    await waitForSpecList(page);
    const specItems = page.locator('[data-testid^="remote-spec-item-"]');
    // At least one spec should be visible (fixture has test-feature)
    const count = await specItems.count();
    expect(count).toBeGreaterThan(0);
  });

  /**
   * Requirement 4.3: Spec選択で詳細パネルが表示されることを検証
   */
  test('should show spec detail panel on selection', async ({ page }) => {
    await waitForSpecList(page);

    // Click on the first spec item
    const firstSpec = page.locator('[data-testid^="remote-spec-item-"]').first();
    await firstSpec.click();

    // Wait for detail panel to appear
    const detailPanel = page.locator('[data-testid="remote-spec-detail"]');
    await expect(detailPanel).toBeVisible();
  });

  /**
   * Requirement 4.4: Bugsタブへの切り替えが動作することを検証
   */
  test('should switch to Bugs tab', async ({ page }) => {
    await switchToTab(page, 'bugs');

    // Verify Bugs tab is selected
    const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');
    await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

    // Verify bug list container is visible
    const bugList = page.locator('[data-testid="remote-bug-list"]');
    await expect(bugList).toBeVisible();
  });
});
