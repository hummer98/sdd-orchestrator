/**
 * Bugs File Watcher E2E Test
 *
 * Bugsのファイル監視（onBugsChanged）経由でのUI自動更新を検証するテスト
 *
 * 検証内容:
 * - プロジェクト選択後にBugs Watcherが正しく起動すること
 * - .kiro/bugs/<bug-name> フォルダの追加/削除がUI（bugStore）に反映されること
 *
 * Bug fix: spec-agent-list-not-updating-on-auto-execution
 * - bugStore.refreshBugs() がprojectStore.currentProjectを参照するよう修正（SSOT）
 */

import * as path from 'path';
import * as fs from 'fs';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/bugs-pane-test');
const BUGS_DIR = path.join(FIXTURE_PATH, '.kiro/bugs');

/**
 * Helper: Select project using Zustand store action
 */
async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.project?.getState) {
          await stores.project.getState().selectProject(projPath);
          done(true);
        } else {
          console.error('[E2E] __STORES__ not available');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectProject error:', e);
        done(false);
      }
    }, projectPath).then(resolve);
  });
}

/**
 * Helper: Get bugs list from bugStore
 */
async function getBugsList(): Promise<{ name: string; phase: string }[]> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.bugStore?.getState) {
        return [];
      }
      const bugs = stores.bugStore.getState().bugs;
      return bugs.map((b: any) => ({ name: b.name, phase: b.phase }));
    } catch (e) {
      return [];
    }
  });
}

/**
 * Helper: Check if bugs watcher is active
 */
async function isBugsWatcherActive(): Promise<boolean> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.bugStore?.getState) return false;
      return stores.bugStore.getState().isWatching === true;
    } catch {
      return false;
    }
  });
}

/**
 * Helper: Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
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
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // Bugs監視がアクティブか確認
      const isWatching = await isBugsWatcherActive();
      console.log('[E2E] Bugs watcher isWatching:', isWatching);
      expect(isWatching).toBe(true);
    });
  });

  describe('Bugs List Auto Update via File Watcher', () => {
    it('should detect existing bugs after project selection', async () => {
      // プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // 初期状態のbugs一覧を確認
      const initialBugs = await getBugsList();
      console.log('[E2E] Initial bugs:', initialBugs);

      // fixtureには test-bug が存在するはず
      const hasTestBug = initialBugs.some(b => b.name === 'test-bug');
      expect(hasTestBug).toBe(true);
    });

    it('should update bugs list when new bug folder is created', async () => {
      // 1. プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // 2. 初期状態を確認
      const initialBugs = await getBugsList();
      console.log('[E2E] Initial bugs count:', initialBugs.length);
      const initialBugNames = initialBugs.map(b => b.name);
      console.log('[E2E] Initial bug names:', initialBugNames);

      // 3. 新しいbugフォルダを作成（/kiro:bug-createと同等の操作）
      const newBugName = 'e2e-new-bug';
      createBugFolder(newBugName);
      console.log('[E2E] Created new bug folder:', newBugName);

      // 4. ファイル監視による自動更新を待つ
      // chokidar: awaitWriteFinish 200ms + debounce 300ms = 約500ms
      // 余裕を持って最大15秒待機
      const updated = await waitForCondition(async () => {
        const bugs = await getBugsList();
        const hasNewBug = bugs.some(b => b.name === newBugName);
        if (!hasNewBug) {
          console.log('[E2E] Waiting for bugs update... current count:', bugs.length, 'has new bug:', hasNewBug);
        }
        return hasNewBug;
      }, 15000, 500, 'bugs-list-update');

      // 5. 結果を検証
      const finalBugs = await getBugsList();
      console.log('[E2E] Final bugs:', finalBugs);
      console.log('[E2E] Final bugs count:', finalBugs.length);

      // このテストはファイル監視が正しく動作していれば成功する
      // 失敗した場合、BugsWatcherService → UI更新のパイプラインに問題がある
      expect(updated).toBe(true);
      expect(finalBugs.some(b => b.name === newBugName)).toBe(true);
      expect(finalBugs.length).toBe(initialBugs.length + 1);
    });

    it('should update bugs list when bug folder is deleted', async () => {
      // 1. まずテスト用bugを作成
      const testBugName = 'e2e-test-bug-1';
      createBugFolder(testBugName);
      await browser.pause(500);

      // 2. プロジェクト選択
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // 3. 初期状態を確認（テスト用bugが含まれている）
      const initialBugs = await getBugsList();
      console.log('[E2E] Initial bugs with test bug:', initialBugs.map(b => b.name));
      const hasTestBug = initialBugs.some(b => b.name === testBugName);
      expect(hasTestBug).toBe(true);

      // 4. bugフォルダを削除
      deleteBugFolder(testBugName);
      console.log('[E2E] Deleted bug folder:', testBugName);

      // 5. ファイル監視による自動更新を待つ
      const updated = await waitForCondition(async () => {
        const bugs = await getBugsList();
        const stillHasBug = bugs.some(b => b.name === testBugName);
        if (stillHasBug) {
          console.log('[E2E] Waiting for bug removal... current count:', bugs.length);
        }
        return !stillHasBug;
      }, 15000, 500, 'bugs-list-removal');

      // 6. 結果を検証
      const finalBugs = await getBugsList();
      console.log('[E2E] Final bugs after deletion:', finalBugs.map(b => b.name));

      expect(updated).toBe(true);
      expect(finalBugs.some(b => b.name === testBugName)).toBe(false);
    });
  });

});
