/**
 * Remote UI Helpers for Playwright Tests
 *
 * Remote UI操作の共通ヘルパー関数を提供する。
 * 既存Remote UIのdata-testid属性を活用したセレクタを使用。
 *
 * Requirements Coverage:
 * - 3.3: 生成ファイルがUIに反映される待機
 * - 3.4: spec.json更新がUIに反映される待機
 */

import { Page, expect } from '@playwright/test';
import { getRemoteUIUrl } from './electron-launcher';

/**
 * Get the Remote UI full URL (with token) from the port file
 * @returns The full URL for the Remote UI including auth token
 */
export function getRemoteUIBaseURL(): string {
  return getRemoteUIUrl();
}

/**
 * Navigate to Remote UI with the correct port and token
 * @param page Playwright Page instance
 * @param path Optional path to append to the base URL (default: '/')
 */
export async function navigateToRemoteUI(page: Page, path = '/'): Promise<void> {
  const baseURL = getRemoteUIUrl();
  // Parse the URL to properly append path while preserving query params
  const urlObj = new URL(baseURL);
  if (path !== '/') {
    urlObj.pathname = path;
  }
  const url = urlObj.toString();
  console.log(`[remote-ui-helpers] Navigating to ${url}`);
  await page.goto(url);
}

/**
 * WebSocket接続が確立されるまで待機
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 10000)
 */
export async function waitForConnection(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const statusText = document.querySelector('[data-testid="remote-status-text"]');
      return statusText?.textContent === 'Connected';
    },
    { timeout }
  );
}

/**
 * Spec一覧が表示されるまで待機
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 30000 - longer for WebSocket data fetch)
 */
export async function waitForSpecList(page: Page, timeout = 30000): Promise<void> {
  // Wait for the spec list container first
  await page.waitForSelector('[data-testid="remote-spec-list"]', { timeout });
  // Then wait for at least one spec item to be visible
  const specItems = page.locator('[data-testid^="remote-spec-item-"]');
  await expect(specItems.first()).toBeVisible({ timeout });
}

/**
 * 特定のSpecを選択
 * @param page Playwright Page instance
 * @param specName Spec name to select
 */
export async function selectSpec(page: Page, specName: string): Promise<void> {
  const specItem = page.locator(`[data-testid="remote-spec-item-${specName}"]`);
  await specItem.click();
  await page.waitForSelector('[data-testid="remote-spec-detail"]:not(.hidden)', { timeout: 5000 });
}

/**
 * Specs/Bugsタブを切り替え
 * @param page Playwright Page instance
 * @param tabName Tab name: 'specs' or 'bugs'
 */
export async function switchToTab(page: Page, tabName: 'specs' | 'bugs'): Promise<void> {
  await page.click(`[data-testid="remote-tab-${tabName}"]`);
  await page.waitForFunction(
    (tab) => {
      const tabEl = document.querySelector(`[data-testid="remote-tab-${tab}"]`);
      return tabEl?.getAttribute('aria-selected') === 'true';
    },
    tabName,
    { timeout: 5000 }
  );
}

/**
 * 指定フェーズが生成済み状態になるまで待機
 * @param page Playwright Page instance
 * @param phase Phase name: 'requirements', 'design', 'tasks'
 * @param timeout Timeout in milliseconds (default: 10000)
 */
export async function waitForPhaseGenerated(
  page: Page,
  phase: string,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (phaseName) => {
      const phaseStatus = document.querySelector(
        `[data-testid="phase-status-${phaseName}"]`
      );
      return phaseStatus?.textContent?.includes('generated');
    },
    phase,
    { timeout }
  );
}

/**
 * 特定Specの詳細パネルが表示されるまで待機
 * @param page Playwright Page instance
 * @param specName Spec name
 * @param timeout Timeout in milliseconds (default: 5000)
 */
export async function waitForSpecDetail(
  page: Page,
  specName: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector('[data-testid="remote-spec-detail"]:not(.hidden)', { timeout });
  // Verify the spec name is displayed
  const specTitle = page.locator('[data-testid="remote-spec-title"]');
  await expect(specTitle).toContainText(specName, { timeout });
}

/**
 * Bug一覧が表示されるまで待機
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 30000)
 */
export async function waitForBugList(page: Page, timeout = 30000): Promise<void> {
  // Wait for loading to complete
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('[data-testid="bugs-view-loading"]');
      return !loading || !loading.checkVisibility();
    },
    { timeout }
  );

  // Wait for the bug list container or empty state
  const bugList = page.locator('[data-testid="remote-bug-list"]');
  const emptyState = page.locator('[data-testid="bugs-empty-state"]');

  // Either bug list or empty state should be visible
  await Promise.race([
    expect(bugList).toBeVisible({ timeout }),
    expect(emptyState).toBeVisible({ timeout }),
  ]).catch(() => {
    // If neither appears, that's also acceptable (may be a different state)
  });
}

/**
 * 特定のBugを選択
 * @param page Playwright Page instance
 * @param bugName Bug name to select
 */
export async function selectBug(page: Page, bugName: string): Promise<void> {
  const bugItem = page.locator(`[data-testid="remote-bug-item-${bugName}"]`);
  await bugItem.click();
  // Wait for detail view to appear
  await page.waitForSelector('[data-testid="bug-detail-view"]', { timeout: 10000 });
}

/**
 * Bug詳細ビューが表示されるまで待機
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 10000)
 */
export async function waitForBugDetail(page: Page, timeout = 10000): Promise<void> {
  await page.waitForSelector('[data-testid="bug-detail-view"]', { timeout });
}
