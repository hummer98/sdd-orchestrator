/**
 * Smartphone Remote UI - Spec List, Selection, and Detail View Tests
 *
 * スマートフォン版Remote UIのSpec一覧・選択・詳細表示を検証するE2Eテスト。
 * モバイルビューポートサイズ（375x667）でMobileLayoutが適用される状態をテスト。
 *
 * Requirements Coverage:
 * - Spec一覧表示（MobileLayout上で）
 * - Spec選択と詳細パネル表示
 * - Phase状態の表示
 * - タブ切り替え（底部タブバー）
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
} from './helpers/remote-ui.helpers';

// スマートフォンビューポート設定
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

test.describe('Smartphone Remote UI - Spec Management', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    // Navigate to Remote UI using the actual port from the port file
    await navigateToRemoteUI(page);
    // Wait for WebSocket connection
    await waitForConnection(page);
  });

  test.describe('Connection and Layout', () => {
    /**
     * Test: MobileLayout上でConnected状態が表示される
     */
    test('should display Connected status in MobileLayout header', async ({ page }) => {
      const statusDot = page.locator('[data-testid="remote-status-dot"]');
      const statusText = page.locator('[data-testid="remote-status-text"]');

      await expect(statusDot).toBeVisible();
      await expect(statusDot).toHaveClass(/bg-green-500/);
      await expect(statusText).toHaveText('Connected');
    });

    /**
     * Test: プロジェクトパスが表示される
     */
    test('should display project path', async ({ page }) => {
      const projectPath = page.locator('[data-testid="remote-project-path"]');
      await expect(projectPath).toBeVisible();
      // Fixture project name should be displayed
      await expect(projectPath).toContainText('bugs-pane-test');
    });

    /**
     * Test: 底部タブバーが表示される
     */
    test('should display bottom tab bar with Specs and Bugs tabs', async ({ page }) => {
      // Use mobile-specific bottom tab bar locators
      const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
      const specsTab = bottomTabBar.locator('[data-testid="remote-tab-specs"]');
      const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');

      await expect(bottomTabBar).toBeVisible();
      await expect(specsTab).toBeVisible();
      await expect(bugsTab).toBeVisible();

      // Specs tab should be selected by default
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Spec List Display', () => {
    /**
     * Test: Spec一覧が表示される
     */
    test('should display spec list', async ({ page }) => {
      await waitForSpecList(page);

      const specList = page.locator('[data-testid="remote-spec-list"]');
      await expect(specList).toBeVisible();

      // At least one spec item should be visible (test-feature from fixture)
      const specItems = page.locator('[data-testid^="remote-spec-item-"]');
      const count = await specItems.count();
      expect(count).toBeGreaterThan(0);
    });

    /**
     * Test: test-feature Specが一覧に表示される
     */
    test('should display test-feature spec in list', async ({ page }) => {
      await waitForSpecList(page);

      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await expect(testFeatureItem).toBeVisible();
    });

    /**
     * Test: 検索入力フィールドが表示される
     */
    test('should display search input', async ({ page }) => {
      await waitForSpecList(page);

      const searchInput = page.locator('[data-testid="specs-search-input"]');
      await expect(searchInput).toBeVisible();
    });

    /**
     * Test: 検索でSpecをフィルタリングできる
     */
    test('should filter specs by search query', async ({ page }) => {
      await waitForSpecList(page);

      const searchInput = page.locator('[data-testid="specs-search-input"]');
      await searchInput.fill('test');

      // test-feature should still be visible
      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await expect(testFeatureItem).toBeVisible();

      // Search with non-matching query
      await searchInput.fill('nonexistent');

      // No results state should appear
      const noResults = page.locator('[data-testid="specs-no-results"]');
      await expect(noResults).toBeVisible();
    });
  });

  test.describe('Spec Selection and Detail View', () => {
    /**
     * Test: Specをクリックすると詳細ビューが表示される
     */
    test('should show spec detail view on spec selection', async ({ page }) => {
      await waitForSpecList(page);

      // Click on the test-feature spec
      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await testFeatureItem.click();

      // Wait for detail view to appear
      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });
    });

    /**
     * Test: 詳細ビューにSpec名が表示される
     */
    test('should display spec name in detail view', async ({ page }) => {
      await waitForSpecList(page);

      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await testFeatureItem.click();

      // Wait for detail view
      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Spec name should be visible
      await expect(detailView).toContainText('test-feature');
    });

    /**
     * Test: 詳細ビューにPhaseタグが表示される
     */
    test('should display phase tag in detail view', async ({ page }) => {
      await waitForSpecList(page);

      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await testFeatureItem.click();

      // Wait for phase tag
      const phaseTag = page.locator('[data-testid="remote-spec-phase-tag"]');
      await expect(phaseTag).toBeVisible({ timeout: 10000 });

      // Fixture has requirements-generated phase
      await expect(phaseTag).toContainText('requirements-generated');
    });

    /**
     * Test: 詳細ビューにAuto Execute Allボタンが表示される
     */
    test('should display auto execution button in detail view', async ({ page }) => {
      await waitForSpecList(page);

      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await testFeatureItem.click();

      const autoExecButton = page.locator('[data-testid="auto-execution-button"]');
      await expect(autoExecButton).toBeVisible({ timeout: 10000 });
      await expect(autoExecButton).toContainText('Auto Execute All');
    });

    /**
     * Test: 「Spec一覧に戻る」ボタンで一覧に戻れる
     */
    test('should return to spec list when back button is clicked', async ({ page }) => {
      await waitForSpecList(page);

      // Select a spec
      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await testFeatureItem.click();

      // Wait for detail view
      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Click back button
      const backButton = page.getByRole('button', { name: /Spec一覧に戻る/i });
      await backButton.click();

      // Spec list should be visible again
      await expect(page.locator('[data-testid="remote-spec-list"]')).toBeVisible();
      await expect(detailView).not.toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    /**
     * Test: Bugsタブに切り替えられる
     */
    test('should switch to Bugs tab', async ({ page }) => {
      // Use mobile-specific bottom tab bar
      const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
      const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
      await bugsTab.click();

      // Bugs tab should be selected
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Bug list should be visible
      const bugList = page.locator('[data-testid="remote-bug-list"]');
      await expect(bugList).toBeVisible({ timeout: 10000 });
    });

    /**
     * Test: Specsタブに戻れる
     */
    test('should switch back to Specs tab', async ({ page }) => {
      // Use mobile-specific bottom tab bar
      const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
      const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
      const specsTab = bottomTabBar.locator('[data-testid="remote-tab-specs"]');

      // First switch to Bugs
      await bugsTab.click();
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Then switch back to Specs
      await specsTab.click();

      await expect(specsTab).toHaveAttribute('aria-selected', 'true');

      // Spec list should be visible
      await waitForSpecList(page);
    });

    /**
     * Test: タブ切り替え後も選択状態が保持される
     * Note: Remote UIはタブ切り替え時に選択状態を保持する設計
     */
    test('should preserve selection when switching tabs', async ({ page }) => {
      await waitForSpecList(page);

      // Use mobile-specific bottom tab bar
      const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
      const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
      const specsTab = bottomTabBar.locator('[data-testid="remote-tab-specs"]');

      // Select a spec
      const testFeatureItem = page.locator('[data-testid="remote-spec-item-test-feature"]');
      await testFeatureItem.click();

      // Wait for detail view
      const detailView = page.locator('[data-testid="remote-spec-detail"]');
      await expect(detailView).toBeVisible({ timeout: 10000 });

      // Switch to Bugs tab
      await bugsTab.click();
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Switch back to Specs tab
      await specsTab.click();
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');

      // Detail view should still be visible (selection preserved)
      await expect(detailView).toBeVisible({ timeout: 10000 });
    });
  });
});
