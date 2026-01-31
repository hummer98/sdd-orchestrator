/**
 * Smartphone Agent Log Fix Verification Test
 *
 * Verifies fixes for:
 * 1. Footer input area fixed at the bottom (mobile-agent-log-fullscreen)
 * 2. Unified agent logs displayed correctly (agent-log-store-unification)
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
  getSpecDetailLocator,
} from './helpers/remote-ui.helpers';

// Smartphone viewport configuration
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

test.describe('Smartphone Agent Log Fixes', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  test('Footer input area should be fixed at the bottom', async ({ page }) => {
    // Select a spec to enter detail view
    const specItem = page.locator('[data-testid^="remote-spec-item-"]').first();
    await specItem.click();

    // Wait for auto-execute button (indicates loaded)
    const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
    await autoExecButton.waitFor({ state: 'visible', timeout: 15000 });

    // Start agent
    await autoExecButton.click();

    // Check if empty state is visible initially
    const emptyState = page.locator('[data-testid="spec-agent-list-empty"]');
    if (await emptyState.isVisible()) {
      console.log('[E2E] Agent list is initially empty');
    }

    // Wait for agent to appear in the list and click it
    const agentItem = page.locator('[data-testid^="agent-item-"]').first();
    try {
        await agentItem.waitFor({ state: 'visible', timeout: 20000 });
    } catch (e) {
        console.log('[E2E] Timed out waiting for agent item. Checking list state...');
        if (await emptyState.isVisible()) console.log('[E2E] List is still empty');
        const list = page.locator('[data-testid="spec-agent-list"]');
        if (await list.isVisible()) console.log('[E2E] List container is visible');
        throw e;
    }
    await agentItem.click();

    // Wait for log panel to appear
    const logPanelPage = page.locator('[data-testid="agent-log-page"]');
    await expect(logPanelPage).toBeVisible({ timeout: 10000 });

    // Find the action area (footer)
    const actionArea = page.locator('[data-testid="agent-log-page-action-area"]');
    await expect(actionArea).toBeVisible();

    // Verify it is at the bottom of the viewport
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error('Viewport size not available');

    const boundingBox = await actionArea.boundingBox();
    if (!boundingBox) throw new Error('Action area bounding box not available');

    // The bottom of the action area should be close to the viewport bottom
    // allowing for some safe area variance
    const bottomGap = viewportSize.height - (boundingBox.y + boundingBox.height);
    console.log(`[E2E] Action area bottom gap: ${bottomGap}px`);
    expect(bottomGap).toBeLessThan(5); // Should be very close to 0

    // Wait for logs to fill up (simulate scrolling)
    // We wait for the log container to have content
    const logContainer = page.locator('[data-testid="agent-log-page-log-container"]');
    await page.waitForTimeout(3000); // Wait for some logs

    // Verify footer position again after logs appear
    const boundingBoxAfter = await actionArea.boundingBox();
    if (!boundingBoxAfter) throw new Error('Action area bounding box not available');

    const bottomGapAfter = viewportSize.height - (boundingBoxAfter.y + boundingBoxAfter.height);
    console.log(`[E2E] Action area bottom gap after logs: ${bottomGapAfter}px`);
    expect(bottomGapAfter).toBeLessThan(5);
  });

  test('Agent logs should be displayed (Unified Store)', async ({ page }) => {
    // Select a spec
    const specItem = page.locator('[data-testid^="remote-spec-item-"]').first();
    await specItem.click();

    // Start agent
    const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
    await autoExecButton.waitFor({ state: 'visible', timeout: 15000 });
    await autoExecButton.click();

    // Check if empty state is visible initially
    const emptyState = page.locator('[data-testid="spec-agent-list-empty"]');
    if (await emptyState.isVisible()) {
      console.log('[E2E] Agent list is initially empty');
    }

    // Wait for agent to appear in the list and click it
    const agentItem = page.locator('[data-testid^="agent-item-"]').first();
    try {
        await agentItem.waitFor({ state: 'visible', timeout: 20000 });
    } catch (e) {
        console.log('[E2E] Timed out waiting for agent item. Checking list state...');
        if (await emptyState.isVisible()) console.log('[E2E] List is still empty');
        const list = page.locator('[data-testid="spec-agent-list"]');
        if (await list.isVisible()) console.log('[E2E] List container is visible');
        throw e;
    }
    await agentItem.click();

    // Wait for logs
    const logPanel = page.locator('[data-testid="agent-log-panel"]');
    await expect(logPanel).toBeVisible({ timeout: 10000 });

    // Wait for at least one log entry
    // This confirms that logs are flowing from the unified store to the UI
    const logEntry = page.locator('[data-testid="log-entry"]').first();
    await expect(logEntry).toBeVisible({ timeout: 10000 });

    // Verify content structure (Unified Log Store uses ParsedLogEntry)
    // Check if it contains text content
    const textContent = await logEntry.textContent();
    expect(textContent).toBeTruthy();
    console.log(`[E2E] Log entry content: ${textContent?.substring(0, 50)}...`);

    // Verify LogEntryBlock structure (e.g., timestamp, or specific styling)
    // AgentLogPanel renders LogEntryBlock which might have specific classes or structure
    // We check for the engine tag in the header as an indicator of proper data flow
    const engineTag = page.locator('[data-testid="engine-tag"]');
    await expect(engineTag).toBeVisible();
    const engineText = await engineTag.textContent();
    expect(['Claude', 'Gemini']).toContain(engineText?.trim());
  });
});
