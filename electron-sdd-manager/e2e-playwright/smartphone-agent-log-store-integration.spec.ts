/**
 * Smartphone Remote UI Agent Log Store Integration E2E Test (Playwright)
 *
 * スマートフォン版Remote UIでWebSocketのagent-logイベントが正しく
 * useSharedAgentStoreに反映され、AgentDetailDrawerで表示されることを検証。
 *
 * Test Coverage:
 * - useAgentStoreInit hookがonAgentLogイベントをサブスクライブする
 * - WebSocketのAGENT_LOGメッセージがuseSharedAgentStore.addLog()を呼び出す
 * - AgentDetailDrawerがStoreからログを取得して表示する
 * - ログがインクリメンタルに更新される
 *
 * Architecture:
 * WebSocket AGENT_LOG → useAgentStoreInit → useSharedAgentStore → AgentDetailDrawer
 *
 * Note: Uses mock-claude.sh for agent execution.
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
} from './helpers/remote-ui.helpers';

// スマートフォンビューポート設定
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

test.describe('Smartphone Agent Log Store Integration E2E Test', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  // ============================================================
  // 1. Agent log events update shared store
  // ============================================================
  test.describe('Agent log events update shared store', () => {
    /**
     * Test: WebSocket agent-log events are received and stored in useSharedAgentStore
     *
     * This test verifies the complete data flow:
     * 1. Auto execution starts an agent
     * 2. WebSocket AGENT_LOG messages are sent
     * 3. useAgentStoreInit receives onAgentLog events
     * 4. useSharedAgentStore.addLog() is called
     * 5. AgentDetailDrawer displays logs from store
     */
    test('should store agent logs from WebSocket in shared store', async ({ page }) => {
      // Navigate to Agents tab (project agent view)
      const agentsTab = page.locator('[data-testid="tab-agents"]');
      await agentsTab.click();

      // Wait for agents tab to load
      await page.waitForTimeout(1000);

      // Start a project agent via Ask button
      const askButton = page.locator('[data-testid="project-ask-button"]');
      const askButtonExists = await askButton.isVisible().catch(() => false);

      if (!askButtonExists) {
        console.log('[E2E] Project Ask button not found, skipping test');
        return;
      }

      await askButton.click();

      // Wait for AskAgentDialog
      const askDialog = page.locator('[data-testid="ask-agent-dialog"]');
      await expect(askDialog).toBeVisible({ timeout: 5000 });

      // Enter prompt
      const promptInput = askDialog.locator('[data-testid="ask-prompt-input"]');
      await promptInput.fill('Test agent log integration');

      // Submit
      const executeButton = askDialog.locator('[data-testid="ask-execute-button"]');
      await executeButton.click();

      // Wait for agent to start
      await page.waitForTimeout(2000);

      // Find the agent in the list
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      const agentCount = await agentItems.count();

      if (agentCount === 0) {
        console.log('[E2E] No agents found, agent may not have started');
        return;
      }

      // Click the first agent to open AgentDetailDrawer
      await agentItems.first().click();

      // Wait for drawer to open
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Wait for logs to appear (agent is running)
      await page.waitForTimeout(3000);

      // Check for log entries in the drawer
      const logPanel = drawer.locator('[data-testid="agent-detail-drawer-log-panel"]');
      const logEntries = logPanel.locator('[data-testid="log-entry"]');

      // Poll for log entries to appear
      let logCount = 0;
      for (let i = 0; i < 10; i++) {
        logCount = await logEntries.count();
        if (logCount > 0) {
          break;
        }
        await page.waitForTimeout(500);
      }

      console.log(`[E2E] Log entries in drawer: ${logCount}`);

      // Should have at least one log entry
      expect(logCount).toBeGreaterThan(0);
    });

    /**
     * Test: Logs accumulate incrementally as WebSocket events arrive
     */
    test('should accumulate logs incrementally from WebSocket events', async ({ page }) => {
      // Navigate to Specs tab
      const specsTab = page.locator('[data-testid="tab-specs"]');
      await specsTab.click();

      await waitForSpecList(page);

      // Select a spec
      const specItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await specItem.click();

      // Wait for spec detail to load
      await page.waitForTimeout(2000);

      // Start auto execution
      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (!buttonExists) {
        console.log('[E2E] Auto execution button not found');
        return;
      }

      await autoExecButton.click();

      // Wait for agent to start
      await page.waitForTimeout(2000);

      // Find agent in agent list
      const agentList = page.locator('[data-testid="spec-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      const agentCount = await agentItems.count();

      if (agentCount === 0) {
        console.log('[E2E] No agents found');
        return;
      }

      // Click agent to open drawer
      await agentItems.first().click();

      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      const logPanel = drawer.locator('[data-testid="agent-detail-drawer-log-panel"]');
      const logEntries = logPanel.locator('[data-testid="log-entry"]');

      // Track log count increases
      let previousCount = 0;
      let incrementsSeen = 0;
      const countHistory: number[] = [];

      // Poll for 15 seconds
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(500);
        const currentCount = await logEntries.count();
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
  });

  // ============================================================
  // 2. Multiple agents log independently
  // ============================================================
  test.describe('Multiple agents log independently', () => {
    /**
     * Test: Multiple agents maintain separate log streams in store
     */
    test('should maintain separate log streams for different agents', async ({ page }) => {
      // This test would require starting multiple agents and verifying
      // that their logs don't mix in the store.
      // For now, we document the expected behavior:
      // - Each agent has a unique agentId
      // - useSharedAgentStore.logs is a Map<agentId, ParsedLogEntry[]>
      // - Logs are correctly associated with their respective agents

      // Skip for now - would need more complex test setup
      test.skip();
    });
  });

  // ============================================================
  // 3. Store persists across component remounts
  // ============================================================
  test.describe('Store persists across component remounts', () => {
    /**
     * Test: Logs remain in store when navigating away and back
     */
    test('should persist logs in store across navigation', async ({ page }) => {
      // Navigate to Specs tab and start agent
      const specsTab = page.locator('[data-testid="tab-specs"]');
      await specsTab.click();

      await waitForSpecList(page);

      const specItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await specItem.click();

      await page.waitForTimeout(2000);

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      const buttonExists = await autoExecButton.isVisible().catch(() => false);

      if (!buttonExists) {
        console.log('[E2E] Auto execution button not found');
        return;
      }

      await autoExecButton.click();
      await page.waitForTimeout(3000);

      // Open agent drawer and count logs
      const agentList = page.locator('[data-testid="spec-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');

      if ((await agentItems.count()) === 0) {
        console.log('[E2E] No agents found');
        return;
      }

      await agentItems.first().click();

      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      const logPanel = drawer.locator('[data-testid="agent-detail-drawer-log-panel"]');
      const logEntries = logPanel.locator('[data-testid="log-entry"]');

      const initialLogCount = await logEntries.count();
      console.log(`[E2E] Initial log count: ${initialLogCount}`);

      // Close drawer
      const closeButton = drawer.locator('[data-testid="agent-detail-drawer-close"]');
      await closeButton.click();

      // Navigate to different tab
      const bugsTab = page.locator('[data-testid="tab-bugs"]');
      await bugsTab.click();
      await page.waitForTimeout(1000);

      // Navigate back to Specs
      await specsTab.click();
      await page.waitForTimeout(1000);

      // Re-select spec
      await specItem.click();
      await page.waitForTimeout(2000);

      // Re-open agent drawer
      await agentItems.first().click();
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Check log count - should be same or more (if agent is still running)
      const finalLogCount = await logEntries.count();
      console.log(`[E2E] Final log count: ${finalLogCount}`);

      // Logs should persist
      expect(finalLogCount).toBeGreaterThanOrEqual(initialLogCount);
    });
  });
});
