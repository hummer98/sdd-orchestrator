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
 * @param timeout Timeout in milliseconds (default: 10000)
 */
export async function waitForSpecList(page: Page, timeout = 10000): Promise<void> {
  await page.waitForSelector('[data-testid="remote-spec-list"]', { timeout });
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
