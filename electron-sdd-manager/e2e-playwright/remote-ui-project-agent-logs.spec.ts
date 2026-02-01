/**
 * Remote UI Project Agent Past Logs Display E2E Tests
 *
 * Verifies that selecting a Project Agent in Remote UI correctly
 * loads and displays past logs via WebSocket GET_AGENT_LOGS message.
 *
 * Bug fix verification: project-agent-past-logs-fix
 * - GET_AGENT_LOGS handler now correctly handles specId='' (empty string) for Project Agents
 *
 * Test Coverage:
 * - Desktop: Left sidebar Project Agent selection → Footer log display
 * - Mobile: Agents tab → Agent selection → AgentLogPage log display
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
  switchToAgentsTab,
  waitForProjectAgentList,
} from './helpers/remote-ui.helpers';

// =============================================================================
// Desktop Tests
// =============================================================================

test.describe('Desktop - Project Agent Past Logs', () => {
  // Desktop viewport (default)
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  test('should display Project Agent logs when agent is selected', async ({ page }) => {
    // Step 1: Find the Project Agent section in the left sidebar
    // Desktop layout shows project agents in the left sidebar
    const projectAgentSection = page.locator('text=Project Agent').first();
    await expect(projectAgentSection).toBeVisible({ timeout: 10000 });

    // Step 2: Click Ask button to start a new Project Agent
    const askButton = page.locator('[data-testid="project-ask-button"]');
    await expect(askButton).toBeVisible({ timeout: 5000 });
    await askButton.click();

    // Step 3: Fill in the Ask dialog and execute
    const askDialog = page.locator('[data-testid="ask-agent-dialog"]');
    await expect(askDialog).toBeVisible({ timeout: 5000 });

    const promptInput = page.locator('[data-testid="ask-prompt-input"]');
    await promptInput.fill('Hello, what is this project about?');

    const executeButton = page.locator('[data-testid="ask-execute-button"]');
    await executeButton.click();

    // Step 4: Wait for the agent to appear in the list
    // Project agents appear in the agent list with empty specId
    const agentItem = page.locator('[data-testid^="agent-item-"]').first();
    await expect(agentItem).toBeVisible({ timeout: 20000 });

    // Step 5: Wait for agent to complete (check for non-running status)
    // Mock claude completes quickly, so we wait for status change
    await page.waitForTimeout(3000); // Give time for mock to complete

    // Step 6: Select the agent by clicking on it
    await agentItem.click();

    // Step 7: Verify logs are displayed in the footer AgentLogPanel
    // In Desktop layout, logs appear in the footer area
    const logPanel = page.locator('[data-testid="agent-log-panel"]');
    await expect(logPanel).toBeVisible({ timeout: 10000 });

    // Step 8: Wait for at least one log entry to appear
    // This confirms logs were fetched via GET_AGENT_LOGS
    const logEntry = page.locator('[data-testid="log-entry"]').first();
    await expect(logEntry).toBeVisible({ timeout: 15000 });

    // Step 9: Verify log content exists
    const logContent = await logEntry.textContent();
    expect(logContent).toBeTruthy();
    console.log(`[E2E Desktop] Project Agent log content: ${logContent?.substring(0, 100)}...`);

    // Step 10: Verify engine tag is visible (indicates proper parsing)
    const engineTag = page.locator('[data-testid="engine-tag"]');
    await expect(engineTag).toBeVisible({ timeout: 5000 });
  });

  test('should display past logs for previously completed Project Agent', async ({ page }) => {
    // This test verifies that selecting an already-completed agent
    // still loads its historical logs correctly

    // Step 1: Start a Project Agent first
    const askButton = page.locator('[data-testid="project-ask-button"]');
    await expect(askButton).toBeVisible({ timeout: 10000 });
    await askButton.click();

    const askDialog = page.locator('[data-testid="ask-agent-dialog"]');
    await expect(askDialog).toBeVisible({ timeout: 5000 });

    const promptInput = page.locator('[data-testid="ask-prompt-input"]');
    await promptInput.fill('Test prompt for historical log');

    const executeButton = page.locator('[data-testid="ask-execute-button"]');
    await executeButton.click();

    // Step 2: Wait for agent to appear and complete
    const agentItem = page.locator('[data-testid^="agent-item-"]').first();
    await expect(agentItem).toBeVisible({ timeout: 20000 });

    // Wait for mock agent to complete
    await page.waitForTimeout(5000);

    // Step 3: Deselect by clicking elsewhere (if selected)
    const header = page.locator('header').first();
    await header.click();

    // Short pause to ensure deselection
    await page.waitForTimeout(500);

    // Step 4: Re-select the completed agent
    await agentItem.click();

    // Step 5: Verify past logs are loaded
    const logEntry = page.locator('[data-testid="log-entry"]').first();
    await expect(logEntry).toBeVisible({ timeout: 15000 });

    // Log count should be > 0 (historical logs loaded)
    const logEntries = page.locator('[data-testid="log-entry"]');
    const count = await logEntries.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[E2E Desktop] Historical logs count: ${count}`);
  });
});

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Mobile - Project Agent Past Logs', () => {
  // Smartphone viewport
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  test('should display Project Agent logs when agent is selected in Agents tab', async ({ page }) => {
    // Step 1: Switch to Agents tab
    await switchToAgentsTab(page);
    await waitForProjectAgentList(page);

    // Step 2: Click Ask button to start a new Project Agent
    const askButton = page.locator('[data-testid="project-ask-button"]');
    await expect(askButton).toBeVisible({ timeout: 5000 });
    await askButton.click();

    // Step 3: Fill in the Ask dialog and execute
    const askDialog = page.locator('[data-testid="ask-agent-dialog"]');
    await expect(askDialog).toBeVisible({ timeout: 5000 });

    const promptInput = page.locator('[data-testid="ask-prompt-input"]');
    await promptInput.fill('Mobile test: what is this project?');

    const executeButton = page.locator('[data-testid="ask-execute-button"]');
    await executeButton.click();

    // Step 4: Wait for the agent to appear in the list
    const agentItem = page.locator('[data-testid^="agent-item-"]').first();
    await expect(agentItem).toBeVisible({ timeout: 20000 });

    // Step 5: Wait for agent to complete
    await page.waitForTimeout(3000);

    // Step 6: Select the agent - this should navigate to AgentLogPage
    await agentItem.click();

    // Step 7: Verify AgentLogPage is displayed (mobile full-screen layout)
    const agentLogPage = page.locator('[data-testid="agent-log-page"]');
    await expect(agentLogPage).toBeVisible({ timeout: 10000 });

    // Step 8: Verify logs are displayed
    const logEntry = page.locator('[data-testid="log-entry"]').first();
    await expect(logEntry).toBeVisible({ timeout: 15000 });

    // Step 9: Verify log content
    const logContent = await logEntry.textContent();
    expect(logContent).toBeTruthy();
    console.log(`[E2E Mobile] Project Agent log content: ${logContent?.substring(0, 100)}...`);

    // Step 10: Verify navigation bar shows Project Agent
    const navBar = page.locator('[data-testid="agent-log-page-nav-bar"]');
    await expect(navBar).toBeVisible();
    const navText = await navBar.textContent();
    expect(navText).toContain('Project Agent');
  });

  test('should load past logs correctly after re-selecting completed agent', async ({ page }) => {
    // Step 1: Switch to Agents tab
    await switchToAgentsTab(page);
    await waitForProjectAgentList(page);

    // Step 2: Start a Project Agent
    const askButton = page.locator('[data-testid="project-ask-button"]');
    await askButton.click();

    const askDialog = page.locator('[data-testid="ask-agent-dialog"]');
    await expect(askDialog).toBeVisible({ timeout: 5000 });

    const promptInput = page.locator('[data-testid="ask-prompt-input"]');
    await promptInput.fill('Historical log test on mobile');

    const executeButton = page.locator('[data-testid="ask-execute-button"]');
    await executeButton.click();

    // Step 3: Wait for agent to appear and complete
    const agentItem = page.locator('[data-testid^="agent-item-"]').first();
    await expect(agentItem).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(5000);

    // Step 4: Select agent to open AgentLogPage
    await agentItem.click();

    const agentLogPage = page.locator('[data-testid="agent-log-page"]');
    await expect(agentLogPage).toBeVisible({ timeout: 10000 });

    // Step 5: Verify initial logs loaded
    const logEntry = page.locator('[data-testid="log-entry"]').first();
    await expect(logEntry).toBeVisible({ timeout: 15000 });

    const initialCount = await page.locator('[data-testid="log-entry"]').count();
    console.log(`[E2E Mobile] Initial log count: ${initialCount}`);

    // Step 6: Go back to agent list
    const backButton = page.locator('[data-testid="agent-log-page-back-button"]');
    await backButton.click();

    // Step 7: Wait for agent list to be visible again
    await waitForProjectAgentList(page);

    // Step 8: Re-select the same agent
    await agentItem.click();

    // Step 9: Verify AgentLogPage shows again
    await expect(agentLogPage).toBeVisible({ timeout: 10000 });

    // Step 10: Verify past logs are loaded again
    await expect(logEntry).toBeVisible({ timeout: 15000 });

    const reloadedCount = await page.locator('[data-testid="log-entry"]').count();
    console.log(`[E2E Mobile] Reloaded log count: ${reloadedCount}`);

    // Verify logs are still present after re-selection
    expect(reloadedCount).toBeGreaterThan(0);
  });

  test('should handle empty log state gracefully', async ({ page }) => {
    // This test verifies the UI handles the case where an agent
    // might have no logs yet (edge case)

    // Step 1: Switch to Agents tab
    await switchToAgentsTab(page);
    await waitForProjectAgentList(page);

    // Step 2: Check if empty state or agent list is shown
    const emptyState = page.locator('[data-testid="project-agent-list-empty"]');
    const agentList = page.locator('[data-testid="project-agent-list"]');

    // Either state is valid - the important thing is no errors
    const isEmptyVisible = await emptyState.isVisible().catch(() => false);
    const isListVisible = await agentList.isVisible().catch(() => false);

    expect(isEmptyVisible || isListVisible).toBeTruthy();
    console.log(`[E2E Mobile] Empty state visible: ${isEmptyVisible}, List visible: ${isListVisible}`);

    // If there are existing agents, select one and verify it handles gracefully
    if (isListVisible) {
      const existingAgent = page.locator('[data-testid^="agent-item-"]').first();
      const hasAgent = await existingAgent.isVisible().catch(() => false);

      if (hasAgent) {
        await existingAgent.click();

        // AgentLogPage should be visible
        const agentLogPage = page.locator('[data-testid="agent-log-page"]');
        await expect(agentLogPage).toBeVisible({ timeout: 10000 });

        // Even if no logs, the page should show empty message without error
        const logContainer = page.locator('[data-testid="agent-log-page-log-container"]');
        await expect(logContainer).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
