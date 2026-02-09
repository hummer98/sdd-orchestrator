/**
 * Bugs File Watcher E2E Test
 *
 * Bugsのファイル監視（onBugsChanged）経由でのUI自動更新を検証するテスト
 *
 * 検証内容:
 * - プロジェクト選択後にBugs Watcherが正しく起動すること
 * - .kiro/bugs/<bug-name> フォルダの追加/削除がUI（bug-list）に反映されること
 *
 * Bug fix: spec-agent-list-not-updating-on-auto-execution
 * - bugStore.refreshBugs() がprojectStore.currentProjectを参照するよう修正（SSOT）
 *
 * UI操作ベース検証: store直接チェックをUI要素（bug-item-*）で検証に変更
 */

import * as path from 'path';
import * as fs from 'fs';
import { ensureProjectSelected } from './helpers/auto-execution.helpers';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/bugs-pane-test');
const BUGS_DIR = path.join(FIXTURE_PATH, '.kiro/bugs');

/**
 * Helper: Get bug names from UI (bug-list-items内のbug-item-*要素)
 * store直接アクセスの代わりにUI要素から取得
 */
async function getBugNamesFromUI(): Promise<string[]> {
  return browser.execute(() => {
    const items = document.querySelectorAll('[data-testid^="bug-item-"]');
    return Array.from(items).map(el => {
      const testId = el.getAttribute('data-testid') || '';
      return testId.replace('bug-item-', '');
    });
  });
}

/**
 * Helper: Check if a specific bug item exists in the UI
 */
async function isBugVisibleInUI(bugName: string): Promise<boolean> {
  const bugItem = await $(`[data-testid="bug-item-${bugName}"]`);
  return bugItem.isExisting();
}

/**
 * Helper: Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 15000,
  interval: number = 500,
  debugLabel: string = 'condition'
): Promise<boolean> {
  const startTime = Date.now();
  let iteration = 0;
  while (Date.now() - startTime < timeout) {
    iteration++;
    const result = await condition();
    if (result) {
      console.log(`[E2E] ${debugLabel} met after ${iteration} iterations (${Date.now() - startTime}ms)`);
      return true;
    }
    if (iteration % 4 === 0) {
      console.log(`[E2E] ${debugLabel} iteration ${iteration}: waiting...`);
    }
    await browser.pause(interval);
  }
  console.log(`[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations`);
  return false;
}

/**
 * Helper: Create a new bug folder with report.md
 */
function createBugFolder(bugName: string): void {
  const bugDir = path.join(BUGS_DIR, bugName);
  if (!fs.existsSync(bugDir)) {
    fs.mkdirSync(bugDir, { recursive: true });
  }
  const reportContent = `# Bug Report: ${bugName}

## Description
Auto-generated bug for E2E file watcher test.

## Created
${new Date().toISOString()}
`;
  fs.writeFileSync(path.join(bugDir, 'report.md'), reportContent);
}

/**
 * Helper: Delete a bug folder
 */
function deleteBugFolder(bugName: string): void {
  const bugDir = path.join(BUGS_DIR, bugName);
  if (fs.existsSync(bugDir)) {
    const files = fs.readdirSync(bugDir);
    for (const file of files) {
      fs.unlinkSync(path.join(bugDir, file));
    }
    fs.rmdirSync(bugDir);
  }
}

/**
 * Cleanup: Remove test bug folders
 */
function cleanupTestBugs(): void {
  const testBugNames = ['e2e-test-bug-1', 'e2e-new-bug'];
  for (const name of testBugNames) {
    try {
      deleteBugFolder(name);
    } catch {
      // ignore
    }
  }
}

describe('Bugs File Watcher E2E', () => {
  beforeEach(async () => {
    cleanupTestBugs();
    await browser.pause(500);
  });

  afterEach(async () => {
    cleanupTestBugs();
  });

  describe('Bugs Watcher Registration', () => {
    it('should have bugs watcher active after project selection', async () => {
      // プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // Bugs監視がアクティブか確認（storeチェック: セットアップ検証なので許容）
      const isWatching = await browser.execute(() => {
        try {
          const stores = (window as any).__STORES__;
          if (!stores?.bug?.getState) return false;
          return stores.bug.getState().isWatching === true;
        } catch {
          return false;
        }
      });
      console.log('[E2E] Bugs watcher isWatching:', isWatching);
      expect(isWatching).toBe(true);
    });
  });

  describe('Bugs List Auto Update via File Watcher', () => {
    it('should detect existing bugs after project selection', async () => {
      // プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // 初期状態のbugs一覧をUI要素で確認
      // Bugsタブに切り替えが必要な場合がある
      const bugNames = await getBugNamesFromUI();
      console.log('[E2E] Initial bug names from UI:', bugNames);

      // fixtureには test-bug が存在するはず
      const hasTestBug = await isBugVisibleInUI('test-bug');
      expect(hasTestBug).toBe(true);
    });

    it('should update bugs list when new bug folder is created', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // 2. 初期状態を確認（UI要素で）
      const initialBugNames = await getBugNamesFromUI();
      console.log('[E2E] Initial bug names from UI:', initialBugNames);
      const initialCount = initialBugNames.length;

      // 3. 新しいbugフォルダを作成（/kiro:bug-createと同等の操作）
      const newBugName = 'e2e-new-bug';
      createBugFolder(newBugName);
      console.log('[E2E] Created new bug folder:', newBugName);

      // 4. ファイル監視による自動更新を待つ - UI要素で確認
      // chokidar: awaitWriteFinish 200ms + debounce 300ms = 約500ms
      // 余裕を持って最大20秒待機
      const updated = await waitForCondition(async () => {
        const hasNewBug = await isBugVisibleInUI(newBugName);
        if (!hasNewBug) {
          const currentBugNames = await getBugNamesFromUI();
          console.log('[E2E] Waiting for bugs update... current count:', currentBugNames.length, 'has new bug:', hasNewBug);
        }
        return hasNewBug;
      }, 20000, 500, 'bugs-list-update');

      // 5. 結果を検証 - UI要素で検証
      const finalBugNames = await getBugNamesFromUI();
      console.log('[E2E] Final bug names from UI:', finalBugNames);

      expect(updated).toBe(true);
      expect(await isBugVisibleInUI(newBugName)).toBe(true);
      expect(finalBugNames.length).toBe(initialCount + 1);
    });

    it('should update bugs list when bug folder is deleted', async () => {
      // 1. まずテスト用bugを作成
      const testBugName = 'e2e-test-bug-1';
      createBugFolder(testBugName);
      await browser.pause(500);

      // 2. プロジェクト選択
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // 3. 初期状態を確認（テスト用bugが含まれている）- UI要素で検証
      const hasTestBug = await waitForCondition(async () => {
        return isBugVisibleInUI(testBugName);
      }, 15000, 500, 'test-bug-visible');
      expect(hasTestBug).toBe(true);

      const initialBugNames = await getBugNamesFromUI();
      console.log('[E2E] Initial bugs with test bug:', initialBugNames);

      // 4. bugフォルダを削除
      deleteBugFolder(testBugName);
      console.log('[E2E] Deleted bug folder:', testBugName);

      // 5. ファイル監視による自動更新を待つ - UI要素で確認
      const updated = await waitForCondition(async () => {
        const stillVisible = await isBugVisibleInUI(testBugName);
        if (stillVisible) {
          const currentBugNames = await getBugNamesFromUI();
          console.log('[E2E] Waiting for bug removal... current count:', currentBugNames.length);
        }
        return !stillVisible;
      }, 20000, 500, 'bugs-list-removal');

      // 6. 結果を検証 - UI要素で検証
      const finalBugNames = await getBugNamesFromUI();
      console.log('[E2E] Final bugs after deletion:', finalBugNames);

      expect(updated).toBe(true);
      expect(await isBugVisibleInUI(testBugName)).toBe(false);
    });
  });

});
