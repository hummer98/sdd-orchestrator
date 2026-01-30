/**
 * Remote UI Helpers for Playwright Tests
 *
 * Remote UI操作の共通ヘルパー関数を提供する。
 * 既存Remote UIのdata-testid属性を活用したセレクタを使用。
 *
 * Requirements Coverage:
 * - 3.3: 生成ファイルがUIに反映される待機
 * - 3.4: spec.json更新がUIに反映される待機
 *
 * E2E Test Stability Improvements:
 * - Retry logic with exponential backoff for WebSocket operations
 * - Extended timeouts for built app environment
 */

import { Page, expect, Locator } from '@playwright/test';
import { getRemoteUIUrl } from './electron-launcher';

// =============================================================================
// Selector Constants
// =============================================================================

/**
 * Spec detail view testid varies by layout:
 * - Desktop (SpecDetailPage): 'spec-detail-page'
 * - Mobile (MobileSpecWorkflowView): 'remote-spec-detail'
 */
export const SPEC_DETAIL_SELECTORS = [
  '[data-testid="spec-detail-page"]',
  '[data-testid="remote-spec-detail"]',
] as const;

// ============================================================================
// Retry Configuration
// ============================================================================

const DEFAULT_RETRY_COUNT = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const DEBUG_LOGGING = process.env.E2E_DEBUG === 'true';

/**
 * Debug log helper - only logs when E2E_DEBUG=true
 */
function debugLog(message: string, ...args: unknown[]): void {
  if (DEBUG_LOGGING) {
    console.log(`[remote-ui-helpers][DEBUG] ${message}`, ...args);
  }
}

/**
 * Retry helper with exponential backoff
 * @param fn Async function to retry
 * @param retries Number of retries
 * @param delay Initial delay in milliseconds
 * @param operationName Name for logging
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_RETRY_COUNT,
  delay: number = INITIAL_RETRY_DELAY,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      debugLog(`${operationName}: attempt ${attempt}/${retries + 1}`);
      const result = await fn();
      debugLog(`${operationName}: succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      debugLog(`${operationName}: attempt ${attempt} failed - ${lastError.message}`);

      if (attempt <= retries) {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        debugLog(`${operationName}: waiting ${waitTime}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error(`[remote-ui-helpers] ${operationName}: all ${retries + 1} attempts failed`);
  throw lastError;
}

/**
 * Get the Remote UI full URL (with token) from the port file
 * @returns The full URL for the Remote UI including auth token
 */
export function getRemoteUIBaseURL(): string {
  return getRemoteUIUrl();
}

/**
 * Get a locator for the spec detail view that works on both Desktop and Mobile
 * @param page Playwright Page instance
 * @returns Locator that matches either spec-detail-page or remote-spec-detail
 */
export function getSpecDetailLocator(page: Page): Locator {
  return page.locator(SPEC_DETAIL_SELECTORS.join(', '));
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
 * WebSocket接続が確立されるまで待機（リトライ付き）
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 15000 - extended for E2E stability)
 * @param retries Number of retries (default: 3)
 */
export async function waitForConnection(
  page: Page,
  timeout = 15000,
  retries = DEFAULT_RETRY_COUNT
): Promise<void> {
  await withRetry(
    async () => {
      debugLog('waitForConnection: checking connection status');
      await page.waitForFunction(
        () => {
          const statusText = document.querySelector('[data-testid="remote-status-text"]');
          const status = statusText?.textContent;
          // Log to browser console for debugging
          if ((window as unknown as { __e2eDebug?: boolean }).__e2eDebug) {
            console.log('[E2E] Connection status:', status);
          }
          return status === 'Connected';
        },
        { timeout }
      );
      debugLog('waitForConnection: connected');
    },
    retries,
    INITIAL_RETRY_DELAY,
    'waitForConnection'
  );
}

/**
 * Spec一覧が表示されるまで待機（リトライ付き）
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 45000 - extended for E2E stability)
 * @param retries Number of retries (default: 3)
 */
export async function waitForSpecList(
  page: Page,
  timeout = 45000,
  retries = DEFAULT_RETRY_COUNT
): Promise<void> {
  await withRetry(
    async () => {
      debugLog('waitForSpecList: waiting for spec list container');

      // Check for error state first
      const errorElement = page.locator('[data-testid="specs-view-error"]');
      const hasError = await errorElement.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorElement.textContent().catch(() => 'Unknown error');
        debugLog('waitForSpecList: error state detected -', errorText);
        throw new Error(`Spec list error: ${errorText}`);
      }

      // Wait for the spec list container first
      await page.waitForSelector('[data-testid="remote-spec-list"]', { timeout });
      debugLog('waitForSpecList: container found, waiting for spec items');

      // Then wait for at least one spec item to be visible
      const specItems = page.locator('[data-testid^="remote-spec-item-"]');
      await expect(specItems.first()).toBeVisible({ timeout });
      debugLog('waitForSpecList: spec items visible');
    },
    retries,
    INITIAL_RETRY_DELAY,
    'waitForSpecList'
  );
}

/**
 * 特定のSpecを選択
 * @param page Playwright Page instance
 * @param specName Spec name to select
 */
export async function selectSpec(page: Page, specName: string): Promise<void> {
  const specItem = page.locator(`[data-testid="remote-spec-item-${specName}"]`);
  await specItem.click();
  // Desktop uses 'spec-detail-page', Mobile uses 'remote-spec-detail'
  // Wait for either selector to appear
  await Promise.race([
    page.waitForSelector('[data-testid="spec-detail-page"]', { timeout: 10000 }),
    page.waitForSelector('[data-testid="remote-spec-detail"]', { timeout: 10000 }),
  ]);
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
 * @param timeout Timeout in milliseconds (default: 10000)
 */
export async function waitForSpecDetail(
  page: Page,
  specName: string,
  timeout = 10000
): Promise<void> {
  // Desktop uses 'spec-detail-page', Mobile uses 'remote-spec-detail'
  await Promise.race([
    page.waitForSelector('[data-testid="spec-detail-page"]', { timeout }),
    page.waitForSelector('[data-testid="remote-spec-detail"]', { timeout }),
  ]);
  // Verify the spec name is displayed in heading
  const headingWithSpecName = page.getByRole('heading', { name: specName });
  await expect(headingWithSpecName).toBeVisible({ timeout });
}

/**
 * Bug一覧が表示されるまで待機（リトライ付き）
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 45000 - extended for E2E stability)
 * @param retries Number of retries (default: 3)
 */
export async function waitForBugList(
  page: Page,
  timeout = 45000,
  retries = DEFAULT_RETRY_COUNT
): Promise<void> {
  await withRetry(
    async () => {
      debugLog('waitForBugList: waiting for loading to complete');

      // Wait for loading to complete
      await page.waitForFunction(
        () => {
          const loading = document.querySelector('[data-testid="bugs-view-loading"]');
          return !loading || !loading.checkVisibility();
        },
        { timeout }
      );

      debugLog('waitForBugList: loading complete, checking for list or empty state');

      // Wait for the bug list container or empty state
      const bugList = page.locator('[data-testid="remote-bug-list"]');
      const emptyState = page.locator('[data-testid="bugs-empty-state"]');

      // Either bug list or empty state should be visible
      const isListVisible = await bugList.isVisible().catch(() => false);
      const isEmptyVisible = await emptyState.isVisible().catch(() => false);

      if (isListVisible || isEmptyVisible) {
        debugLog('waitForBugList: list or empty state visible');
        return;
      }

      // If neither is visible, wait for one of them
      await Promise.race([
        expect(bugList).toBeVisible({ timeout }),
        expect(emptyState).toBeVisible({ timeout }),
      ]);

      debugLog('waitForBugList: completed successfully');
    },
    retries,
    INITIAL_RETRY_DELAY,
    'waitForBugList'
  );
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

/**
 * Agentsタブに切り替え（モバイルレイアウト）
 * @param page Playwright Page instance
 */
export async function switchToAgentsTab(page: Page): Promise<void> {
  const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
  const agentsTab = bottomTabBar.locator('[data-testid="remote-tab-agents"]');
  await agentsTab.click();

  await page.waitForFunction(() => {
    const tab = document.querySelector('[data-testid="mobile-bottom-tabs"] [data-testid="remote-tab-agents"]');
    return tab?.getAttribute('aria-selected') === 'true';
  }, { timeout: 5000 });
}

/**
 * ProjectAgent一覧が表示されるまで待機
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 10000)
 */
export async function waitForProjectAgentList(page: Page, timeout = 10000): Promise<void> {
  await page.waitForSelector('[data-testid="agents-tab-view"]', { timeout });
  // Wait for either agent list or empty state
  const agentList = page.locator('[data-testid="project-agent-list"]');
  const emptyState = page.locator('[data-testid="project-agent-list-empty"]');

  await Promise.race([
    expect(agentList).toBeVisible({ timeout }),
    expect(emptyState).toBeVisible({ timeout }),
  ]);
}

/**
 * 特定のProjectAgentを選択
 * @param page Playwright Page instance
 * @param agentId Agent ID to select
 */
export async function selectProjectAgent(page: Page, agentId: string): Promise<void> {
  const agentItem = page.locator(`[data-testid="agent-item-${agentId}"]`);
  await agentItem.click();
  await page.waitForSelector('[data-testid="agent-detail-drawer"]', { timeout: 5000 });
}

/**
 * AgentDetailDrawerが表示されるまで待機
 * @param page Playwright Page instance
 * @param timeout Timeout in milliseconds (default: 5000)
 */
export async function waitForAgentDetailDrawer(page: Page, timeout = 5000): Promise<void> {
  await page.waitForSelector('[data-testid="agent-detail-drawer"]', { timeout });
}
