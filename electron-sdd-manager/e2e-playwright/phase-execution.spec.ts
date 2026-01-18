/**
 * Remote UI Phase Execution Tests (Playwright)
 *
 * フェーズ実行機能のE2Eテスト。
 * Spec詳細表示からのフェーズボタン操作を検証する。
 *
 * Requirements Coverage:
 * - フェーズ実行ボタン表示・操作
 * - フェーズ状態遷移（pending → executing → generated）
 * - 承認ボタン操作
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
  selectSpec,
} from './helpers/remote-ui.helpers';

test.describe('Remote UI Phase Execution Tests', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  test.describe('Phase Item Display', () => {
    /**
     * Test: Spec詳細でフェーズアイテムが表示される
     */
    test('should display phase items in spec detail', async ({ page }) => {
      // Select the test-feature spec
      await selectSpec(page, 'test-feature');

      // Wait for detail view
      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Check that phase items are displayed
      const phases = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];
      for (const phase of phases) {
        const phaseItem = page.locator(`[data-testid="phase-item-${phase}"]`);
        await expect(phaseItem).toBeVisible();
      }
    });

    /**
     * Test: requirements-generatedフェーズのSpec詳細でrequirementsが承認待ち状態
     */
    test('should show requirements phase in generated state', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // requirements phase should show generated icon (yellow pause)
      const generatedIcon = page.locator('[data-testid="phase-item-requirements"] [data-testid="progress-icon-generated"]');
      await expect(generatedIcon).toBeVisible();
    });

    /**
     * Test: 次フェーズ実行ボタンが無効状態
     */
    test('should have design phase button disabled when requirements not approved', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Design phase button should be disabled (previous phase not approved)
      const designButton = page.locator('[data-testid="phase-button-design"]');
      await expect(designButton).toBeVisible();
      await expect(designButton).toBeDisabled();
    });
  });

  test.describe('Phase Approval Flow', () => {
    /**
     * Test: generatedフェーズに「承認」ボタンが表示される
     * Note: requirementsがgeneratedの場合、「承認」ボタンが表示される
     */
    test('should display approve button for generated requirements phase', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Check for approve button on requirements phase (which is in generated state)
      const approveButton = page.locator('[data-testid="phase-item-requirements"] button:has-text("承認")');
      await expect(approveButton).toBeVisible();
    });

    /**
     * Test: pendingフェーズに「実行」ボタン（disabled）が表示される
     * Note: designは前フェーズ（requirements）が未承認なので、disabledになる
     */
    test('should display disabled execute button for pending design phase', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Check for execute button on design phase (which is disabled)
      const execButton = page.locator('[data-testid="phase-button-design"]');
      await expect(execButton).toBeVisible();
      await expect(execButton).toBeDisabled();
    });

    /**
     * Test: 自動実行パーミッショントグルが表示される
     */
    test('should display auto permission toggle for each phase', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Check that auto permission toggle exists on requirements phase
      const autoToggle = page.locator('[data-testid="phase-item-requirements"] [data-testid="auto-permission-toggle"]');
      await expect(autoToggle).toBeVisible();
    });
  });

  test.describe('Auto Execution Button', () => {
    /**
     * Test: Auto Execute Allボタンが表示される
     */
    test('should display Auto Execute All button', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      await expect(autoExecButton).toBeVisible();
      await expect(autoExecButton).toContainText('Auto Execute All');
    });

    /**
     * Test: Auto Execute Allボタンがクリック可能
     */
    test('should have Auto Execute All button enabled', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      await expect(autoExecButton).toBeEnabled();
    });
  });

  test.describe('Phase Tag Display', () => {
    /**
     * Test: フェーズタグが現在のフェーズを表示
     */
    test('should display current phase tag', async ({ page }) => {
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      const phaseTag = page.locator('[data-testid="remote-spec-phase-tag"]');
      await expect(phaseTag).toBeVisible();
      await expect(phaseTag).toContainText('requirements-generated');
    });
  });
});
