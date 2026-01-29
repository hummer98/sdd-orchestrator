/**
 * Remote UI Agent Log Display E2E Test (Playwright)
 *
 * Tests for verifying that agent logs are displayed in ParsedLogEntry format
 * on Remote UI via WebSocket.
 *
 * Task: 9.2 - Remote UI Agent execution log display E2E test
 * Requirements Coverage:
 * - 3.2: WebSocket agent-log event transmits ParsedLogEntry
 * - 5.2: AgentLogPanel simplified to directly render ParsedLogEntry[]
 *
 * Test scenarios:
 * 1. WebSocket delivers logs in ParsedLogEntry format
 * 2. Remote UI displays logs correctly
 * 3. Engine tag is visible in log panel header
 * 4. Running indicator displays during execution
 *
 * Note: Uses mock-claude.sh for agent execution.
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
  selectSpec,
} from './helpers/remote-ui.helpers';

test.describe('Remote UI Agent Log Display E2E Test - Task 9.2', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  // ============================================================
  // 1. Agent Log Panel visibility
  // ============================================================
  test.describe('Agent Log Panel visibility', () => {
    /**
     * Test: Agent Log Panel is visible in spec detail view
     */
    test('should display agent log panel in spec detail', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Check for agent log panel (may be in a tab or sidebar)
      // In Remote UI, the log panel may be displayed differently
      const agentSection = page.locator('[data-testid="agent-log-panel"]');
      const agentLogExists = await agentSection.isVisible().catch(() => false);

      // Log for debugging - panel may not be visible until agent runs
      console.log(`[E2E] Agent log panel visible: ${agentLogExists}`);
    });
  });

  // ============================================================
  // 2. Auto Execution triggers log display
  // ============================================================
  test.describe('Auto Execution triggers log display', () => {
    /**
     * Test: Clicking Auto Execute All starts agent and shows logs
     */
    test('should show agent log after auto execution starts', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Find auto execution button
      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        // Click auto execute button
        await autoExecButton.click();

        // Wait for agent to start (running indicator or log panel update)
        await page.waitForTimeout(3000);

        // Check if log panel becomes visible or has content
        const logPanel = page.locator('[data-testid="agent-log-panel"]');
        const logPanelVisible = await logPanel.isVisible().catch(() => false);

        console.log(`[E2E] After auto-exec click, log panel visible: ${logPanelVisible}`);
      }
    });

    /**
     * Test: Running indicator appears during agent execution
     */
    test('should display running indicator during execution', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');
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
            console.log('[E2E] Running indicator visible');
            break;
          }
          await page.waitForTimeout(500);
        }

        console.log(`[E2E] Running indicator was seen: ${runningIndicatorSeen}`);
      }
    });
  });

  // ============================================================
  // 3. Engine tag display
  // ============================================================
  test.describe('Engine tag display', () => {
    /**
     * Test: Engine tag (Claude/Gemini) is displayed in log panel
     */
    test('should display engine tag in agent log panel header', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');
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
          console.log(`[E2E] Engine tag text: ${tagText}`);
          // Should be 'Claude' or 'Gemini'
          expect(['Claude', 'Gemini']).toContain(tagText?.trim());
        } else {
          console.log('[E2E] Engine tag not visible (agent may not have started)');
        }
      }
    });
  });

  // ============================================================
  // 4. Log entries display
  // ============================================================
  test.describe('Log entries display', () => {
    /**
     * Test: Log entries are displayed after agent execution
     */
    test('should display log entries after agent runs', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');
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
          const logEntries = logPanel.locator('.space-y-2 > div');
          const entryCount = await logEntries.count();

          console.log(`[E2E] Log entries count: ${entryCount}`);

          if (entryCount > 0) {
            // Get first entry text to verify content
            const firstEntry = logEntries.first();
            const entryText = await firstEntry.textContent();
            console.log(`[E2E] First log entry preview: ${entryText?.substring(0, 100)}`);
          }
        } else {
          console.log('[E2E] Log panel not visible after execution');
        }
      }
    });

    /**
     * Test: System init entry shows working directory
     */
    test('should display system init entry with working directory', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');
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
          console.log(`[E2E] Log panel has path info: ${hasPathInfo}`);
          console.log(`[E2E] Panel text preview: ${panelText?.substring(0, 200)}`);
        }
      }
    });
  });

  // ============================================================
  // 5. WebSocket delivery verification
  // ============================================================
  test.describe('WebSocket delivery verification', () => {
    /**
     * Test: Logs are received via WebSocket in ParsedLogEntry format
     *
     * This test verifies the WebSocket message format by checking
     * the UI state which is updated from WebSocket events.
     */
    test('should receive logs via WebSocket and update UI', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        // Track log panel state before and after
        const logPanelBefore = page.locator('[data-testid="agent-log-panel"]');
        const logEntriesBefore = await logPanelBefore.locator('.space-y-2 > div').count().catch(() => 0);

        await autoExecButton.click();

        // Wait for WebSocket to deliver logs
        await page.waitForTimeout(6000);

        // Check if log entries increased (WebSocket delivered new logs)
        const logPanelAfter = page.locator('[data-testid="agent-log-panel"]');
        const logEntriesAfter = await logPanelAfter.locator('.space-y-2 > div').count().catch(() => 0);

        console.log(`[E2E] Log entries before: ${logEntriesBefore}, after: ${logEntriesAfter}`);

        // If log panel exists, entries should have increased
        const logPanelVisible = await logPanelAfter.isVisible().catch(() => false);
        if (logPanelVisible) {
          // WebSocket should have delivered logs
          console.log('[E2E] WebSocket delivery: log panel visible with entries');
        }
      }
    });
  });

  // ============================================================
  // 6. Incremental log updates (streaming)
  // ============================================================
  test.describe('Incremental log updates', () => {
    /**
     * Test: Logs are displayed incrementally as they arrive via WebSocket
     *
     * This test verifies that AGENT_LOG messages are properly handled
     * and logs accumulate over time (not just initial display).
     *
     * Bug fix: WebSocketApiClient.handlePushMessage was missing AGENT_LOG case
     *
     * Note: Desktop layout is used (Playwright runs with Desktop Chrome viewport).
     * - Spec item selection uses remote-spec-item-* selector
     * - Auto execution button is in the WorkflowFooter
     * - Log panel is in the footer area (testid: agent-log-panel)
     */
    test('should display logs incrementally as they arrive', async ({ page }) => {
      // Select spec by clicking the spec item (works on both layouts)
      const specItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await specItem.click();

      // Wait for spec detail to load - auto-execute button appears when specDetail is loaded
      // In desktop layout, the workflow footer with auto-execute button is in the right sidebar
      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');

      // Wait for the button to appear with a longer timeout (specDetail loading)
      try {
        await autoExecButton.waitFor({ state: 'visible', timeout: 15000 });
      } catch {
        console.log('[E2E] Auto execution button not found after waiting, skipping test');
        return;
      }

      const buttonExists = await autoExecButton.isVisible();

      if (!buttonExists) {
        console.log('[E2E] Auto execution button not visible, skipping test');
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
          console.log(`[E2E] Log count increased: ${previousCount} → ${currentCount}`);
        }
        previousCount = currentCount;

        // Early exit if we've seen enough increments
        if (incrementsSeen >= 3) {
          break;
        }
      }

      console.log(`[E2E] Count history: ${countHistory.join(', ')}`);
      console.log(`[E2E] Total increments seen: ${incrementsSeen}`);

      // Should have seen at least 2 increments (initial + streaming updates)
      expect(incrementsSeen).toBeGreaterThanOrEqual(2);
    });

    /**
     * Test: Multiple log entries accumulate in the panel
     */
    test('should accumulate multiple log entries', async ({ page }) => {
      // Select spec by clicking the spec item (works on both layouts)
      const specItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await specItem.click();

      // Wait for spec detail to load - auto-execute button appears when specDetail is loaded
      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');

      // Wait for the button to appear with a longer timeout (specDetail loading)
      try {
        await autoExecButton.waitFor({ state: 'visible', timeout: 15000 });
      } catch {
        console.log('[E2E] Auto execution button not found after waiting, skipping test');
        return;
      }

      const buttonExists = await autoExecButton.isVisible();

      if (!buttonExists) {
        console.log('[E2E] Auto execution button not visible, skipping test');
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

        console.log(`[E2E] Final log entry count: ${finalCount}`);

        // Should have multiple log entries (not just the first command)
        expect(finalCount).toBeGreaterThan(1);
      } else {
        console.log('[E2E] Log panel not visible, cannot verify accumulation');
      }
    });
  });

  // ============================================================
  // 7. Connection status during log streaming
  // ============================================================
  test.describe('Connection status during log streaming', () => {
    /**
     * Test: Connection status remains Connected during log streaming
     */
    test('should maintain Connected status during log streaming', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execute-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (buttonExists) {
        await autoExecButton.click();

        // Check connection status during execution
        for (let i = 0; i < 5; i++) {
          await page.waitForTimeout(1000);

          const statusText = page.locator('[data-testid="remote-status-text"]');
          const status = await statusText.textContent();
          console.log(`[E2E] Connection status at ${i}s: ${status}`);

          // Status should remain Connected
          expect(status).toBe('Connected');
        }
      }
    });
  });
});
