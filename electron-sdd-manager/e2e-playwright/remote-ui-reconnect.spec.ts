/**
 * Remote UI WebSocket Reconnect E2E Tests (Playwright)
 *
 * Coverage:
 * - RUI-6: WebSocket reconnection handling
 *
 * Test Scenarios:
 * - UJ-001: Connection status indicator shows "Connected" on initial load
 * - UJ-002: After page reload, WebSocket reconnects automatically
 * - UJ-003: Connection status dot shows correct color (green when connected)
 *
 * Note: smartphone-spec.spec.ts has a basic reconnect test after reload.
 * This test provides dedicated coverage for the reconnection behavior
 * including status indicators on Desktop layout.
 *
 * Preconditions:
 * - bugs-pane-test fixture (global-setup)
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
} from './helpers/remote-ui.helpers';

test.describe('Remote UI WebSocket Reconnect', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
  });

  // ============================================================
  // UJ-001: Initial connection status
  // ============================================================
  test('should show Connected status on initial load', async ({ page }) => {
    const statusText = page.locator('[data-testid="remote-status-text"]');
    await expect(statusText).toHaveText('Connected');
  });

  // ============================================================
  // UJ-002: Reconnect after page reload
  // ============================================================
  test('should reconnect after page reload', async ({ page }) => {
    // Verify initial connection
    const statusText = page.locator('[data-testid="remote-status-text"]');
    await expect(statusText).toHaveText('Connected');

    // Reload the page
    await page.reload();

    // Wait for reconnection
    await waitForConnection(page);

    // Verify reconnected
    await expect(statusText).toHaveText('Connected');
  });

  // ============================================================
  // UJ-003: Status dot color
  // ============================================================
  test('should show green status dot when connected', async ({ page }) => {
    const statusDot = page.locator('[data-testid="remote-status-dot"]');
    await expect(statusDot).toBeVisible();

    // Check for green color class
    const hasGreenClass = await statusDot.evaluate((el) => {
      return el.classList.contains('bg-green-500');
    });
    expect(hasGreenClass).toBe(true);
  });

  // ============================================================
  // UJ-004: Multiple reloads maintain connection
  // ============================================================
  test('should maintain connection after multiple reloads', async ({ page }) => {
    const statusText = page.locator('[data-testid="remote-status-text"]');

    // Reload twice
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await waitForConnection(page);
      await expect(statusText).toHaveText('Connected');
    }
  });
});
