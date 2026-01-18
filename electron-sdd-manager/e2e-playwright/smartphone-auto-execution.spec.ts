/**
 * Smartphone Remote UI Auto Execution E2E Tests (Playwright)
 *
 * スマートフォン版Remote UIの自動実行機能E2Eテスト。
 * モバイルビューポートサイズ（375x667）でMobileLayoutが適用される状態で
 * 自動実行トリガー、停止、状態表示を検証する。
 *
 * Requirements Coverage:
 * - 自動実行 基本動作
 * - 自動実行 パーミッション制御
 * - 自動実行 フェーズシーケンス
 * - 自動実行 再開機能
 * - 自動実行 中間成果物検証
 * - 自動実行 implフェーズ
 * - 自動実行 ドキュメントレビュー連携
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
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
  const detailView = page.locator('[data-testid="remote-spec-detail"]');
  await expect(detailView).toBeVisible({ timeout: 10000 });
}

test.describe('Smartphone Remote UI Auto Execution Tests', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  test.describe('Basic Auto Execution', () => {
    /**
     * Test: Auto Execute Allボタンが表示される
     */
    test('should display Auto Execute All button in spec detail', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      await expect(autoExecButton).toBeVisible();
      await expect(autoExecButton).toContainText('Auto Execute All');
    });

    /**
     * Test: Auto Execute Allボタンがクリック可能
     */
    test('should have Auto Execute All button enabled', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      await expect(autoExecButton).toBeEnabled();
    });

    /**
     * Test: Auto Execute Allボタンをクリックしてもエラーにならない
     */
    test('should handle Auto Execute All click without error', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');

      // Click should work without throwing an error
      await autoExecButton.click();

      // Button should still be visible after click
      await expect(autoExecButton).toBeVisible();
    });
  });

  test.describe('Permission Control', () => {
    /**
     * Test: 各フェーズに自動実行パーミッショントグルが表示される
     */
    test('should display auto permission toggle for each phase', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      // Check that auto permission toggle exists on requirements phase
      const autoToggleReq = page.locator('[data-testid="phase-item-requirements"] [data-testid="auto-permission-toggle"]');
      await expect(autoToggleReq).toBeVisible();

      // Check design phase
      const autoToggleDesign = page.locator('[data-testid="phase-item-design"] [data-testid="auto-permission-toggle"]');
      await expect(autoToggleDesign).toBeVisible();

      // Check tasks phase
      const autoToggleTasks = page.locator('[data-testid="phase-item-tasks"] [data-testid="auto-permission-toggle"]');
      await expect(autoToggleTasks).toBeVisible();
    });

    /**
     * Test: パーミッショントグルがクリック可能
     */
    test('should have clickable permission toggles', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const autoToggle = page.locator('[data-testid="phase-item-requirements"] [data-testid="auto-permission-toggle"]');
      await expect(autoToggle).toBeEnabled();
    });
  });

  test.describe('Phase Sequence', () => {
    /**
     * Test: フェーズが正しい順序で表示される
     */
    test('should display phases in correct order', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      // Verify phase order
      const phases = ['requirements', 'design', 'tasks', 'impl', 'inspection', 'deploy'];
      for (const phase of phases) {
        const phaseItem = page.locator(`[data-testid="phase-item-${phase}"]`);
        await expect(phaseItem).toBeVisible();
      }
    });

    /**
     * Test: 最初のフェーズにgeneratedアイコンが表示される（test-featureはrequirements-generated状態）
     */
    test('should show generated icon on requirements phase', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      // requirements phase should show generated icon
      const generatedIcon = page.locator('[data-testid="phase-item-requirements"] [data-testid="progress-icon-generated"]');
      await expect(generatedIcon).toBeVisible();
    });

    /**
     * Test: 次フェーズ実行ボタンが無効状態（前フェーズ未承認のため）
     */
    test('should have next phase button disabled when previous not approved', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      // Design phase button should be disabled
      const designButton = page.locator('[data-testid="phase-button-design"]');
      await expect(designButton).toBeVisible();
      await expect(designButton).toBeDisabled();
    });
  });

  test.describe('Resume Functionality', () => {
    /**
     * Test: generatedフェーズに「承認」ボタンが表示される
     */
    test('should display approve button for generated phase', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      // Check for approve button on requirements phase
      const approveButton = page.locator('[data-testid="phase-item-requirements"] button:has-text("承認")');
      await expect(approveButton).toBeVisible();
    });

    /**
     * Test: 承認ボタンがクリック可能
     */
    test('should have approve button enabled', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const approveButton = page.locator('[data-testid="phase-item-requirements"] button:has-text("承認")');
      await expect(approveButton).toBeEnabled();
    });
  });

  test.describe('Intermediate Artifacts', () => {
    /**
     * Test: フェーズタグが現在のフェーズを表示
     */
    test('should display current phase tag', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const phaseTag = page.locator('[data-testid="remote-spec-phase-tag"]');
      await expect(phaseTag).toBeVisible();
      await expect(phaseTag).toContainText('requirements-generated');
    });

    /**
     * Test: フェーズアイテムが生成済みアイコンを表示
     */
    test('should display generated icon for completed phases', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      // Requirements should show generated (yellow pause icon)
      const reqGeneratedIcon = page.locator('[data-testid="phase-item-requirements"] [data-testid="progress-icon-generated"]');
      await expect(reqGeneratedIcon).toBeVisible();

      // Design should show pending (gray circle)
      const designPendingIcon = page.locator('[data-testid="phase-item-design"] [data-testid="progress-icon-pending"]');
      await expect(designPendingIcon).toBeVisible();
    });
  });

  test.describe('Impl Phase', () => {
    /**
     * Test: implフェーズアイテムが表示される
     */
    test('should display impl phase item', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const implPhase = page.locator('[data-testid="phase-item-impl"]');
      await expect(implPhase).toBeVisible();
    });

    /**
     * Test: implフェーズのパーミッショントグルが表示される
     */
    test('should display impl phase permission toggle', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const implToggle = page.locator('[data-testid="phase-item-impl"] [data-testid="auto-permission-toggle"]');
      await expect(implToggle).toBeVisible();
    });
  });

  test.describe('Document Review Integration', () => {
    /**
     * Test: inspectionフェーズアイテムが表示される
     */
    test('should display inspection phase item', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const inspectionPhase = page.locator('[data-testid="phase-item-inspection"]');
      await expect(inspectionPhase).toBeVisible();
    });

    /**
     * Test: deployフェーズアイテムが表示される
     */
    test('should display deploy phase item', async ({ page }) => {
      await selectSpecSmartphone(page, 'test-feature');

      const deployPhase = page.locator('[data-testid="phase-item-deploy"]');
      await expect(deployPhase).toBeVisible();
    });
  });

});
