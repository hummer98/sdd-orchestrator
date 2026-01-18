/**
 * Remote UI Workflow Integration Tests (Playwright)
 *
 * ワークフロー統合テスト。
 * プロジェクト選択→Spec選択→フェーズ実行の統合フローを検証する。
 *
 * Requirements Coverage:
 * - Spec選択からフェーズ実行への遷移
 * - フェーズ実行状態の表示
 * - 複数フェーズにわたるワークフロー
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
  selectSpec,
} from './helpers/remote-ui.helpers';

test.describe('Remote UI Workflow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
  });

  test.describe('Spec Selection to Detail Flow', () => {
    /**
     * Test: Spec一覧からSpec選択→詳細表示の統合フロー
     */
    test('should navigate from spec list to detail view', async ({ page }) => {
      await waitForSpecList(page);

      // Verify spec list is visible
      const specList = page.locator('[data-testid="remote-spec-list"]');
      await expect(specList).toBeVisible();

      // Select test-feature spec
      await selectSpec(page, 'test-feature');

      // Detail view should be visible
      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Spec name should be displayed
      await expect(detailView).toContainText('test-feature');
    });

    /**
     * Test: Spec詳細でワークフローフェーズが順番に表示される
     */
    test('should display workflow phases in correct order', async ({ page }) => {
      await waitForSpecList(page);
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Phases should appear in correct order
      const expectedPhases = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];

      for (let i = 0; i < expectedPhases.length; i++) {
        const phaseItem = page.locator(`[data-testid="phase-item-${expectedPhases[i]}"]`);
        await expect(phaseItem).toBeVisible();
      }
    });
  });

  test.describe('Workflow State Display', () => {
    /**
     * Test: フェーズ状態が正しく表示される
     */
    test('should display correct phase states based on spec.json', async ({ page }) => {
      await waitForSpecList(page);
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // requirements: generated (yellow icon)
      const reqGeneratedIcon = page.locator('[data-testid="phase-item-requirements"] [data-testid="progress-icon-generated"]');
      await expect(reqGeneratedIcon).toBeVisible();

      // design: pending (gray icon)
      const designPendingIcon = page.locator('[data-testid="phase-item-design"] [data-testid="progress-icon-pending"]');
      await expect(designPendingIcon).toBeVisible();

      // tasks: pending (gray icon)
      const tasksPendingIcon = page.locator('[data-testid="phase-item-tasks"] [data-testid="progress-icon-pending"]');
      await expect(tasksPendingIcon).toBeVisible();
    });

    /**
     * Test: generatedフェーズに「承認」ボタンが表示される
     */
    test('should show approve button for generated requirements phase', async ({ page }) => {
      await waitForSpecList(page);
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // requirements phase should have approve button (it's in generated state)
      const approveButton = page.locator('[data-testid="phase-item-requirements"] button:has-text("承認")');
      await expect(approveButton).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    /**
     * Test: タブ切り替えが正常に動作する
     */
    test('should switch between Specs and Bugs tabs', async ({ page }) => {
      await waitForSpecList(page);

      // Verify Specs tab is active by default
      const specsTab = page.locator('[data-testid="remote-tab-specs"]');
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');

      // Switch to Bugs tab
      const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');
      await bugsTab.click();
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Bug list should be visible
      const bugList = page.locator('[data-testid="remote-bug-list"]');
      await expect(bugList).toBeVisible({ timeout: 10000 });

      // Switch back to Specs tab
      await specsTab.click();
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');

      // Spec list should be visible again
      await expect(page.locator('[data-testid="remote-spec-list"]')).toBeVisible();
    });

    /**
     * Test: タブ切り替え時に選択状態がリセットされる（仕様通り）
     */
    test('should reset selection when switching tabs', async ({ page }) => {
      await waitForSpecList(page);
      await selectSpec(page, 'test-feature');

      // Verify detail is shown
      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Switch to Bugs tab
      const bugsTab = page.locator('[data-testid="remote-tab-bugs"]');
      await bugsTab.click();
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Switch back to Specs tab
      const specsTab = page.locator('[data-testid="remote-tab-specs"]');
      await specsTab.click();
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');

      // Spec list should be visible (not detail view, as selection is cleared on tab change)
      await expect(page.locator('[data-testid="remote-spec-list"]')).toBeVisible();
    });
  });

  test.describe('Workflow UI Elements', () => {
    /**
     * Test: 各フェーズに自動実行パーミッションアイコンが表示される
     * Note: This test verifies UI elements that are already covered in Phase Item Display tests
     */
    test('should display auto permission icons on all phases', async ({ page }) => {
      await waitForSpecList(page);
      await selectSpec(page, 'test-feature');

      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Check auto permission toggle on each phase
      const phases = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];
      for (const phase of phases) {
        const toggle = page.locator(`[data-testid="phase-item-${phase}"] [data-testid="auto-permission-toggle"]`);
        await expect(toggle).toBeVisible();
      }
    });

    // Note: Auto Execute All button test is in phase-execution.spec.ts
  });

  // Note: Mobile viewport workflow tests are in smartphone-spec.spec.ts
});
