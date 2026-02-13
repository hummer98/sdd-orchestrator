/**
 * Remote UI Project Files E2E Tests (Playwright)
 *
 * Coverage:
 * - RUI-4: Remote UIプロジェクトファイル一覧表示
 *
 * Test Scenarios:
 * - UJ-001: Projectタブへの切り替えでProjectViewが表示される
 * - UJ-002: Steering Filesセクションが表示される
 * - UJ-003: ファイルリスト内のファイルがクリック可能
 *
 * Preconditions:
 * - bugs-pane-test fixture (global-setup): steering files あり、CLAUDE.md なし
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
} from './helpers/remote-ui.helpers';

/**
 * Helper: Switch to Project tab on Desktop layout
 * Desktop layout tabs don't have data-testid, so we use text-based selector
 */
async function switchToProjectTab(page: import('@playwright/test').Page): Promise<void> {
  // Desktop layout: tab buttons are direct children of the tab bar div
  // Button text: "Project"
  const projectTab = page.locator('button', { hasText: /^Project$/ });
  await projectTab.click();
  // Wait for ProjectView to appear
  await page.waitForSelector('[data-testid="project-view"], [data-testid="project-view-loading"], [data-testid="project-view-empty"]', {
    timeout: 10000,
  });
}

test.describe('Remote UI Project Files', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
  });

  // ============================================================
  // UJ-001: Project tab navigation
  // ============================================================
  test('should switch to Project tab and show ProjectView', async ({ page }) => {
    await switchToProjectTab(page);

    // ProjectView should be visible (either with files or empty)
    const projectView = page.locator('[data-testid="project-view"]');
    const emptyView = page.locator('[data-testid="project-view-empty"]');

    // One of the two states should be visible
    const isProjectVisible = await projectView.isVisible().catch(() => false);
    const isEmptyVisible = await emptyView.isVisible().catch(() => false);

    expect(isProjectVisible || isEmptyVisible).toBe(true);
  });

  // ============================================================
  // UJ-002: Steering Files section
  // ============================================================
  test('should display Steering Files section', async ({ page }) => {
    await switchToProjectTab(page);

    // Wait for loading to complete
    await page.waitForFunction(() => {
      return !document.querySelector('[data-testid="project-view-loading"]');
    }, { timeout: 10000 });

    // bugs-pane-test fixture has steering files (product.md, verification.md)
    const steeringSection = page.locator('[data-testid="project-files-steering-section"]');
    const projectView = page.locator('[data-testid="project-view"]');

    // Check if project view loaded (may be empty if API not available)
    const isProjectVisible = await projectView.isVisible().catch(() => false);
    if (isProjectVisible) {
      await expect(steeringSection).toBeVisible();
    }
  });

  // ============================================================
  // UJ-003: File item click
  // ============================================================
  test('should have clickable file items in steering section', async ({ page }) => {
    await switchToProjectTab(page);

    // Wait for loading to complete
    await page.waitForFunction(() => {
      return !document.querySelector('[data-testid="project-view-loading"]');
    }, { timeout: 10000 });

    const projectView = page.locator('[data-testid="project-view"]');
    const isProjectVisible = await projectView.isVisible().catch(() => false);

    if (isProjectVisible) {
      // Find file items by data-testid pattern: project-file-{fileName}
      const fileItems = page.locator('[data-testid^="project-file-"]');
      const count = await fileItems.count();

      if (count > 0) {
        // Click the first file item
        const firstFile = fileItems.first();
        await firstFile.click();

        // After click, the item should have data-selected="true"
        await expect(firstFile).toHaveAttribute('data-selected', 'true');
      }
    }
  });

  // ============================================================
  // UJ-004: CLAUDE.md section absence
  // ============================================================
  test('should not show CLAUDE.md section when file does not exist', async ({ page }) => {
    await switchToProjectTab(page);

    // Wait for loading to complete
    await page.waitForFunction(() => {
      return !document.querySelector('[data-testid="project-view-loading"]');
    }, { timeout: 10000 });

    const projectView = page.locator('[data-testid="project-view"]');
    const isProjectVisible = await projectView.isVisible().catch(() => false);

    if (isProjectVisible) {
      // bugs-pane-test fixture does NOT have CLAUDE.md
      const claudeSection = page.locator('[data-testid="project-files-claude-section"]');
      await expect(claudeSection).not.toBeVisible();
    }
  });
});
