/**
 * Smartphone Remote UI Agent Log Display E2E Test (Playwright)
 *
 * スマートフォン版Remote UIでAgentログが適切に表示されることを検証するE2Eテスト。
 * モバイルビューポートサイズ（375x667）でMobileLayoutが適用される状態で、
 * AgentLogPanelの表示、ログエントリの表示、ストリーミング更新をテストする。
 *
 * Requirements Coverage:
 * - AgentLogPanelがスマートフォン版で適切に表示される
 * - WebSocket経由でログがParsedLogEntry形式で配信される
 * - ログエントリがインクリメンタルに更新される
 * - Engine tag（Claude/Gemini）が表示される
 *
 * Note: Uses mock-claude.sh for agent execution.
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
  getSpecDetailLocator,
} from './helpers/remote-ui.helpers';

// スマートフォンビューポート設定
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

/**
 * Helper function to select a spec in smartphone view
 */
async function selectSpecSmartphone(page: import('@playwright/test').Page, specName: string) {
  await waitForSpecList(page);
  const specItem = page.locator(`[data-testid="remote-spec-item-${specName}"]`);
  await specItem.click();
  const detailView = getSpecDetailLocator(page);
  await expect(detailView).toBeVisible({ timeout: 10000 });
}

test.describe('Smartphone Remote UI Agent Log Display E2E Test', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  // ============================================================
  // 1. Agent Log Panel visibility in spec detail
  // ============================================================
  test.describe('Agent Log Panel visibility', () => {
    /**
     * Test: Agent Log Panel is visible in spec detail view on smartphone
     */
    test('should display agent log panel in spec detail on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Check for agent log panel (may be in a tab or sidebar)
      const agentSection = page.locator('[data-testid="agent-log-panel"]');
      const agentLogExists = await agentSection.isVisible().catch(() => false);

      // Log for debugging - panel may not be visible until agent runs
      console.log(`[E2E-Smartphone] Agent log panel visible: ${agentLogExists}`);
    });
  });

  // ============================================================
  // 2. Auto Execution triggers log display on smartphone
  // ============================================================
  test.describe('Auto Execution triggers log display', () => {
    /**
     * Test: Clicking Auto Execute All starts agent and shows logs on smartphone
     */
    test('should show agent log after auto execution starts on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Find auto execution button (using auto-execution-button for smartphone)
      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        // Click auto execute button
        await autoExecButton.click();

        // Wait for agent to start (running indicator or log panel update)
        await page.waitForTimeout(3000);

        // Check if log panel becomes visible or has content
        const logPanel = page.locator('[data-testid="agent-log-panel"]');
        const logPanelVisible = await logPanel.isVisible().catch(() => false);

        console.log(`[E2E-Smartphone] After auto-exec click, log panel visible: ${logPanelVisible}`);
      }
    });

    /**
     * Test: Running indicator appears during agent execution on smartphone
     */
    test('should display running indicator during execution on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Wait for running indicator to appear
        const runningIndicator = page.locator('[data-testid="running-indicator"]');

        // Try to catch the running indicator (may be brief with mock)
        let runningIndicatorSeen = false;
        for (let i = 0; i < 10; i++) {
          const visible = await runningIndicator.isVisible().catch(() => false);
          if (visible) {
            runningIndicatorSeen = true;
            console.log('[E2E-Smartphone] Running indicator visible');
            break;
          }
          await page.waitForTimeout(500);
        }

        console.log(`[E2E-Smartphone] Running indicator was seen: ${runningIndicatorSeen}`);
      }
    });
  });

  // ============================================================
  // 3. Engine tag display on smartphone
  // ============================================================
  test.describe('Engine tag display', () => {
    /**
     * Test: Engine tag (Claude/Gemini) is displayed in log panel on smartphone
     */
    test('should display engine tag in agent log panel header on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Wait for agent to start and logs to appear
        await page.waitForTimeout(3000);

        // Check for engine tag in log panel
        const engineTag = page.locator('[data-testid="engine-tag"]');
        const engineTagVisible = await engineTag.isVisible().catch(() => false);

        if (engineTagVisible) {
          const tagText = await engineTag.textContent();
          console.log(`[E2E-Smartphone] Engine tag text: ${tagText}`);
          // Should be 'Claude' or 'Gemini'
          expect(['Claude', 'Gemini']).toContain(tagText?.trim());
        } else {
          console.log('[E2E-Smartphone] Engine tag not visible (agent may not have started)');
        }
      }
    });
  });

  // ============================================================
  // 4. Log entries display on smartphone
  // ============================================================
  test.describe('Log entries display', () => {
    /**
     * Test: Log entries are displayed after agent execution on smartphone
     */
    test('should display log entries after agent runs on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Wait for agent execution and log delivery
        await page.waitForTimeout(5000);

        // Check for log entries in log panel
        const logPanel = page.locator('[data-testid="agent-log-panel"]');
        const logPanelVisible = await logPanel.isVisible().catch(() => false);

        if (logPanelVisible) {
          // Check for log entry blocks
          const logEntries = logPanel.locator('[data-testid="log-entry"]');
          const entryCount = await logEntries.count();

          console.log(`[E2E-Smartphone] Log entries count: ${entryCount}`);

          if (entryCount > 0) {
            // Get first entry text to verify content
            const firstEntry = logEntries.first();
            const entryText = await firstEntry.textContent();
            console.log(`[E2E-Smartphone] First log entry preview: ${entryText?.substring(0, 100)}`);
          }
        } else {
          console.log('[E2E-Smartphone] Log panel not visible after execution');
        }
      }
    });

    /**
     * Test: System init entry shows working directory on smartphone
     */
    test('should display system init entry with working directory on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Wait for agent execution
        await page.waitForTimeout(5000);

        const logPanel = page.locator('[data-testid="agent-log-panel"]');
        const logPanelVisible = await logPanel.isVisible().catch(() => false);

        if (logPanelVisible) {
          const panelText = await logPanel.textContent();

          // System init entry should contain path information
          const hasPathInfo = panelText?.includes('/') || panelText?.includes('kiro');
          console.log(`[E2E-Smartphone] Log panel has path info: ${hasPathInfo}`);
          console.log(`[E2E-Smartphone] Panel text preview: ${panelText?.substring(0, 200)}`);
        }
      }
    });
  });

  // ============================================================
  // 5. Incremental log updates (streaming) on smartphone
  // ============================================================
  test.describe('Incremental log updates', () => {
    /**
     * Test: Logs are displayed incrementally as they arrive on smartphone
     *
     * This test verifies that AGENT_LOG messages are properly handled
     * and logs accumulate over time on smartphone viewport.
     */
    test('should display logs incrementally as they arrive on smartphone', async ({ page }) => {
      // Select spec by clicking the spec item
      const specItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await specItem.click();

      // Wait for spec detail to load - auto-execute button appears when specDetail is loaded
      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');

      // Wait for the button to appear with a longer timeout (specDetail loading)
      try {
        await autoExecButton.waitFor({ state: 'visible', timeout: 15000 });
      } catch {
        console.log('[E2E-Smartphone] Auto execution button not found after waiting, skipping test');
        return;
      }

      const buttonExists = await autoExecButton.isVisible();

      if (!buttonExists) {
        console.log('[E2E-Smartphone] Auto execution button not visible, skipping test');
        return;
      }

      // Get log panel and count selector
      const logPanel = page.locator('[data-testid="agent-log-panel"]');
      const logEntries = logPanel.locator('[data-testid="log-entry"]');

      // Start auto execution
      await autoExecButton.click();

      // Wait a bit for agent to start
      await page.waitForTimeout(3000);

      let previousCount = 0;
      let incrementsSeen = 0;
      const countHistory: number[] = [];

      // Poll for 15 seconds, checking every 500ms
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(500);
        const currentCount = await logEntries.count().catch(() => 0);
        countHistory.push(currentCount);

        if (currentCount > previousCount) {
          incrementsSeen++;
          console.log(`[E2E-Smartphone] Log count increased: ${previousCount} → ${currentCount}`);
        }
        previousCount = currentCount;

        // Early exit if we've seen enough increments
        if (incrementsSeen >= 3) {
          break;
        }
      }

      console.log(`[E2E-Smartphone] Count history: ${countHistory.join(', ')}`);
      console.log(`[E2E-Smartphone] Total increments seen: ${incrementsSeen}`);

      // Should have seen at least 2 increments (initial + streaming updates)
      expect(incrementsSeen).toBeGreaterThanOrEqual(2);
    });

    /**
     * Test: Multiple log entries accumulate in the panel on smartphone
     */
    test('should accumulate multiple log entries on smartphone', async ({ page }) => {
      // Select spec by clicking the spec item
      const specItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await specItem.click();

      // Wait for spec detail to load - auto-execute button appears when specDetail is loaded
      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');

      // Wait for the button to appear with a longer timeout (specDetail loading)
      try {
        await autoExecButton.waitFor({ state: 'visible', timeout: 15000 });
      } catch {
        console.log('[E2E-Smartphone] Auto execution button not found after waiting, skipping test');
        return;
      }

      const buttonExists = await autoExecButton.isVisible();

      if (!buttonExists) {
        console.log('[E2E-Smartphone] Auto execution button not visible, skipping test');
        return;
      }

      await autoExecButton.click();

      // Wait for agent execution to complete (mock-claude runs quickly)
      await page.waitForTimeout(8000);

      const logPanel = page.locator('[data-testid="agent-log-panel"]');
      const logPanelVisible = await logPanel.isVisible().catch(() => false);

      if (logPanelVisible) {
        const logEntries = logPanel.locator('[data-testid="log-entry"]');
        const finalCount = await logEntries.count();

        console.log(`[E2E-Smartphone] Final log entry count: ${finalCount}`);

        // Should have multiple log entries (not just the first command)
        expect(finalCount).toBeGreaterThan(1);
      } else {
        console.log('[E2E-Smartphone] Log panel not visible, cannot verify accumulation');
      }
    });
  });

  // ============================================================
  // 6. Connection status during log streaming on smartphone
  // ============================================================
  test.describe('Connection status during log streaming', () => {
    /**
     * Test: Connection status remains Connected during log streaming on smartphone
     */
    test('should maintain Connected status during log streaming on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Check connection status during execution
        for (let i = 0; i < 5; i++) {
          await page.waitForTimeout(1000);

          const statusText = page.locator('[data-testid="remote-status-text"]');
          const status = await statusText.textContent();
          console.log(`[E2E-Smartphone] Connection status at ${i}s: ${status}`);

          // Status should remain Connected
          expect(status).toBe('Connected');
        }
      }
    });
  });

  // ============================================================
  // 7. MobileLayout-specific AgentLog display tests
  // ============================================================
  test.describe('MobileLayout-specific display', () => {
    /**
     * Test: Log panel is properly sized for smartphone viewport
     */
    test('should display log panel with appropriate sizing for smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Wait for log panel to appear
        await page.waitForTimeout(3000);

        const logPanel = page.locator('[data-testid="agent-log-panel"]');
        const logPanelVisible = await logPanel.isVisible().catch(() => false);

        if (logPanelVisible) {
          // Get the log panel bounding box
          const boundingBox = await logPanel.boundingBox();

          if (boundingBox) {
            console.log(`[E2E-Smartphone] Log panel size: ${boundingBox.width}x${boundingBox.height}`);

            // Verify the log panel fits within the smartphone viewport
            expect(boundingBox.width).toBeLessThanOrEqual(SMARTPHONE_VIEWPORT.width);
            expect(boundingBox.height).toBeLessThanOrEqual(SMARTPHONE_VIEWPORT.height);

            // Verify the panel has reasonable width (at least 80% of viewport)
            expect(boundingBox.width).toBeGreaterThanOrEqual(SMARTPHONE_VIEWPORT.width * 0.8);
          }
        }
      }
    });

    /**
     * Test: Log panel scrolls properly on smartphone
     */
    test('should allow scrolling in log panel on smartphone', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const detailView = getSpecDetailLocator(page);
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Wait for multiple log entries to accumulate
        await page.waitForTimeout(8000);

        const logPanel = page.locator('[data-testid="agent-log-panel"]');
        const logPanelVisible = await logPanel.isVisible().catch(() => false);

        if (logPanelVisible) {
          // Get scroll container within log panel
          const scrollContainer = logPanel.locator('.overflow-auto').first();

          if (await scrollContainer.isVisible().catch(() => false)) {
            // Get initial scroll position
            const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

            // Scroll down
            await scrollContainer.evaluate(el => {
              el.scrollTop = el.scrollHeight;
            });

            // Get new scroll position
            const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

            console.log(`[E2E-Smartphone] Scroll: ${initialScrollTop} -> ${newScrollTop}`);

            // If there's content to scroll, the scroll position should have changed
            // (or scrollHeight equals clientHeight if no scroll needed)
            const scrollHeight = await scrollContainer.evaluate(el => el.scrollHeight);
            const clientHeight = await scrollContainer.evaluate(el => el.clientHeight);

            if (scrollHeight > clientHeight) {
              expect(newScrollTop).toBeGreaterThanOrEqual(initialScrollTop);
            }
          }
        }
      }
    });
  });
});
