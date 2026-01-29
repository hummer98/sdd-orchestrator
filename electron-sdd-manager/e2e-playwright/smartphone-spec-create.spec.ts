/**
 * Smartphone Remote UI - Spec Creation Tests
 *
 * スマートフォン版Remote UIの新規Spec作成機能を検証するE2Eテスト。
 * モバイルビューポートサイズ（375x667）でフルスクリーンモーダルが
 * 適用される状態をテスト。
 *
 * Requirements Coverage:
 * - Spec作成ボタン表示
 * - フルスクリーン作成ダイアログ
 * - 説明入力フィールド
 * - Worktreeモードオプション
 * - バリデーション
 * - キャンセル・閉じる操作
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
  waitForSpecList,
} from './helpers/remote-ui.helpers';

// スマートフォンビューポート設定
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

test.describe('Smartphone Remote UI - Spec Creation', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
    await waitForSpecList(page);
  });

  test.describe('Create Spec Button', () => {
    /**
     * Test: Spec作成ボタンが表示される（スマートフォン版はFAB）
     */
    test('should display create spec button', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-fab"]');
      await expect(createButton).toBeVisible();
    });

    /**
     * Test: Spec作成ボタンがクリック可能
     */
    test('should have create spec button enabled', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-fab"]');
      await expect(createButton).toBeEnabled();
    });

    /**
     * Test: Spec作成ボタンに適切なaria-labelがある
     */
    test('should have proper aria-label on create button', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-fab"]');
      await expect(createButton).toHaveAttribute('aria-label', '新規Specを作成');
    });
  });

  test.describe('Create Spec Dialog - Opening', () => {
    /**
     * Test: 作成ボタンクリックでダイアログが開く
     */
    test('should open create spec dialog on button click', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();

      const dialog = page.locator('[data-testid="create-spec-dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    });

    /**
     * Test: ダイアログがフルスクリーン表示される（スマートフォン）
     */
    test('should display dialog as fullscreen on smartphone', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();

      const dialog = page.locator('[data-testid="create-spec-dialog"]');
      await expect(dialog).toBeVisible();

      // Check dialog dimensions match viewport (fullscreen)
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBe(SMARTPHONE_VIEWPORT.width);
        expect(box.height).toBe(SMARTPHONE_VIEWPORT.height);
      }
    });

    /**
     * Test: ダイアログヘッダーに「新規Specを作成」と表示される
     */
    test('should display dialog title', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();

      const dialog = page.locator('[data-testid="create-spec-dialog"]');
      await expect(dialog).toContainText('新規Specを作成');
    });
  });

  test.describe('Create Spec Dialog - Form Elements', () => {
    test.beforeEach(async ({ page }) => {
      // Open dialog
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();
      await expect(page.locator('[data-testid="create-spec-dialog"]')).toBeVisible();
    });

    /**
     * Test: 説明入力フィールドが表示される
     */
    test('should display description textarea', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      await expect(descriptionField).toBeVisible();
    });

    /**
     * Test: 説明フィールドにプレースホルダーテキストがある
     */
    test('should have placeholder text in description field', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      await expect(descriptionField).toHaveAttribute(
        'placeholder',
        '実装したい機能の概要を説明してください...'
      );
    });

    /**
     * Test: Worktreeモードチェックボックスが表示される
     */
    test('should display worktree mode checkbox', async ({ page }) => {
      const worktreeCheckbox = page.locator('[data-testid="create-spec-worktree-checkbox"]');
      await expect(worktreeCheckbox).toBeVisible();
    });

    /**
     * Test: Worktreeチェックボックスはデフォルトでオフ
     */
    test('should have worktree checkbox unchecked by default', async ({ page }) => {
      const worktreeCheckbox = page.locator('[data-testid="create-spec-worktree-checkbox"]');
      await expect(worktreeCheckbox).not.toBeChecked();
    });

    /**
     * Test: 送信ボタンが表示される
     */
    test('should display submit button', async ({ page }) => {
      const submitButton = page.locator('[data-testid="create-spec-submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('spec-planで作成');
    });

    /**
     * Test: キャンセルボタンが表示される
     */
    test('should display cancel button', async ({ page }) => {
      const cancelButton = page.locator('[data-testid="create-spec-cancel"]');
      await expect(cancelButton).toBeVisible();
      await expect(cancelButton).toContainText('キャンセル');
    });

    /**
     * Test: 閉じるボタンが表示される
     */
    test('should display close button', async ({ page }) => {
      const closeButton = page.locator('[data-testid="create-spec-dialog-close"]');
      await expect(closeButton).toBeVisible();
    });
  });

  test.describe('Create Spec Dialog - Validation', () => {
    test.beforeEach(async ({ page }) => {
      // Open dialog
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();
      await expect(page.locator('[data-testid="create-spec-dialog"]')).toBeVisible();
    });

    /**
     * Test: 説明が空の場合、送信ボタンが無効
     */
    test('should disable submit button when description is empty', async ({ page }) => {
      const submitButton = page.locator('[data-testid="create-spec-submit"]');
      await expect(submitButton).toBeDisabled();
    });

    /**
     * Test: 説明を入力すると送信ボタンが有効になる
     */
    test('should enable submit button when description is entered', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      await descriptionField.fill('テスト機能の説明');

      const submitButton = page.locator('[data-testid="create-spec-submit"]');
      await expect(submitButton).toBeEnabled();
    });

    /**
     * Test: スペースのみの場合は送信ボタンが無効のまま
     */
    test('should keep submit button disabled for whitespace-only description', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      await descriptionField.fill('   ');

      const submitButton = page.locator('[data-testid="create-spec-submit"]');
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Create Spec Dialog - Interactions', () => {
    test.beforeEach(async ({ page }) => {
      // Open dialog
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();
      await expect(page.locator('[data-testid="create-spec-dialog"]')).toBeVisible();
    });

    /**
     * Test: 説明フィールドにテキストを入力できる
     */
    test('should allow typing in description field', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      const testText = 'ユーザー認証機能を実装したい';

      await descriptionField.fill(testText);
      await expect(descriptionField).toHaveValue(testText);
    });

    /**
     * Test: Worktreeチェックボックスをトグルできる
     */
    test('should toggle worktree checkbox', async ({ page }) => {
      const worktreeCheckbox = page.locator('[data-testid="create-spec-worktree-checkbox"]');

      // Check
      await worktreeCheckbox.check();
      await expect(worktreeCheckbox).toBeChecked();

      // Uncheck
      await worktreeCheckbox.uncheck();
      await expect(worktreeCheckbox).not.toBeChecked();
    });

    /**
     * Test: キャンセルボタンでダイアログが閉じる
     */
    test('should close dialog on cancel button click', async ({ page }) => {
      const cancelButton = page.locator('[data-testid="create-spec-cancel"]');
      await cancelButton.click();

      const dialog = page.locator('[data-testid="create-spec-dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    /**
     * Test: 閉じるボタンでダイアログが閉じる
     */
    test('should close dialog on close button click', async ({ page }) => {
      const closeButton = page.locator('[data-testid="create-spec-dialog-close"]');
      await closeButton.click();

      const dialog = page.locator('[data-testid="create-spec-dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    /**
     * Test: オーバーレイクリックでダイアログが閉じる
     */
    test('should close dialog on overlay click', async ({ page }) => {
      const overlay = page.locator('[data-testid="create-spec-dialog-overlay"]');
      // Click on overlay (edge area, not on dialog content)
      await overlay.click({ position: { x: 5, y: 5 } });

      const dialog = page.locator('[data-testid="create-spec-dialog"]');
      await expect(dialog).not.toBeVisible();
    });

    /**
     * Test: ダイアログを閉じた後、入力がリセットされる
     */
    test('should reset form when dialog is closed and reopened', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      const worktreeCheckbox = page.locator('[data-testid="create-spec-worktree-checkbox"]');

      // Fill form
      await descriptionField.fill('テスト説明');
      await worktreeCheckbox.check();

      // Close dialog
      const cancelButton = page.locator('[data-testid="create-spec-cancel"]');
      await cancelButton.click();

      // Reopen dialog
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();
      await expect(page.locator('[data-testid="create-spec-dialog"]')).toBeVisible();

      // Verify form is reset
      await expect(descriptionField).toHaveValue('');
      await expect(worktreeCheckbox).not.toBeChecked();
    });
  });

  test.describe('Create Spec Dialog - Form Submission', () => {
    test.beforeEach(async ({ page }) => {
      // Open dialog
      const createButton = page.locator('[data-testid="create-fab"]');
      await createButton.click();
      await expect(page.locator('[data-testid="create-spec-dialog"]')).toBeVisible();
    });

    /**
     * Test: 送信ボタンをクリックしてもエラーにならない
     * Note: 実際のSpec作成はMock Claudeが必要なため、UIの動作のみテスト
     */
    test('should handle submit without crash', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      await descriptionField.fill('新機能のテスト説明');

      const submitButton = page.locator('[data-testid="create-spec-submit"]');
      await submitButton.click();

      // Button should show loading state or dialog should remain open
      // (actual spec creation depends on backend)
      const dialog = page.locator('[data-testid="create-spec-dialog"]');
      // Dialog should still be visible (either loading or error state)
      await expect(dialog).toBeVisible();
    });

    /**
     * Test: 送信中は送信ボタンが無効になる
     */
    test('should disable submit button during submission', async ({ page }) => {
      const descriptionField = page.locator('[data-testid="create-spec-description"]');
      await descriptionField.fill('新機能のテスト説明');

      const submitButton = page.locator('[data-testid="create-spec-submit"]');
      await submitButton.click();

      // Check if button becomes disabled or shows loading
      // Note: This may be transient, so we check immediately after click
      const isDisabledOrLoading = await submitButton.evaluate((btn) => {
        return btn.hasAttribute('disabled') || btn.textContent?.includes('作成中');
      });

      // At least one of these conditions should be true
      expect(isDisabledOrLoading).toBe(true);
    });
  });

  test.describe('Tab Context - Create Button Behavior', () => {
    /**
     * Test: Specsタブでは「新規Specを作成」ボタンが表示される
     */
    test('should show create spec button when Specs tab is active', async ({ page }) => {
      // Specs tab is active by default
      const createButton = page.locator('[data-testid="create-fab"]');
      await expect(createButton).toBeVisible();
      await expect(createButton).toHaveAttribute('aria-label', '新規Specを作成');
    });

    /**
     * Test: Bugsタブに切り替えると作成ボタンがBug用になる
     */
    test('should show create bug button when Bugs tab is active', async ({ page }) => {
      // Switch to Bugs tab
      const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
      const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
      await bugsTab.click();
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Create button should now be for bugs
      const createButton = page.locator('[data-testid="create-bug-button"]');
      await expect(createButton).toBeVisible();
      await expect(createButton).toHaveAttribute('aria-label', '新規バグを作成');
    });

    /**
     * Test: Specsタブに戻ると作成ボタンがSpec用に戻る
     */
    test('should show create spec button when switching back to Specs tab', async ({ page }) => {
      // Switch to Bugs tab
      const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
      const bugsTab = bottomTabBar.locator('[data-testid="remote-tab-bugs"]');
      const specsTab = bottomTabBar.locator('[data-testid="remote-tab-specs"]');

      await bugsTab.click();
      await expect(bugsTab).toHaveAttribute('aria-selected', 'true');

      // Switch back to Specs tab
      await specsTab.click();
      await expect(specsTab).toHaveAttribute('aria-selected', 'true');

      // Create button should be for specs again
      const createButton = page.locator('[data-testid="create-fab"]');
      await expect(createButton).toBeVisible();
      await expect(createButton).toHaveAttribute('aria-label', '新規Specを作成');
    });
  });
});
