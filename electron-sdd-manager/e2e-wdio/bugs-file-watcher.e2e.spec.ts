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
 * Note: __STORES__.bug is the correct accessor (not bugStore)
 */
async function getBugsList(): Promise<{ name: string; phase: string }[]> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.bug?.getState) {
        return [];
      }
      const bugs = stores.bug.getState().bugs;
      return bugs.map((b: any) => ({ name: b.name, phase: b.phase }));
    } catch (e) {
      return [];
    }
  });
}

/**
 * Helper: Check if bugs watcher is active
 * Note: __STORES__.bug is the correct accessor (not bugStore)
 */
async function isBugsWatcherActive(): Promise<boolean> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.bug?.getState) return false;
      return stores.bug.getState().isWatching === true;
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

      // DEBUG: isWatchingの状態を確認
      const isWatching = await isBugsWatcherActive();
      console.log('[E2E] isWatching after project select:', isWatching);

      // DEBUG: 直接イベントリスナーをテスト
      const hasOnBugsChanged = await browser.execute(() => {
        const api = (window as any).electronAPI;
        return typeof api?.onBugsChanged === 'function';
      });
      console.log('[E2E] hasOnBugsChanged:', hasOnBugsChanged);

      // DEBUG: currentProjectの状態を確認
      const currentProject = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState()?.currentProject;
      });
      console.log('[E2E] currentProject:', JSON.stringify(currentProject));

      // DEBUG: 追加でリスナーを登録してイベントを確認 + bugStoreの状態を確認
      // Also manually call readBugs to see if it works
      await browser.execute(async () => {
        const api = (window as any).electronAPI;
        const projectPath = '/Users/yamamoto/git/sdd-orchestrator/electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test';
        try {
          const result = await api.readBugs(projectPath);
          console.log('[E2E-DEBUG] Direct readBugs result:', JSON.stringify(result));
          (window as any).__DIRECT_READ_BUGS_RESULT__ = result;
        } catch (err: any) {
          console.log('[E2E-DEBUG] Direct readBugs error:', err?.message);
          (window as any).__DIRECT_READ_BUGS_RESULT__ = { error: err?.message };
        }

        if (api?.onBugsChanged) {
          api.onBugsChanged(async (event: any) => {
            console.log('[E2E-DEBUG] Received bugs change event:', JSON.stringify(event));
            (window as any).__LAST_BUGS_EVENT__ = event;
            // Also manually trigger a getBugs call to see what happens
            const stores = (window as any).__STORES__;
            if (stores?.bug?.getState) {
              const state = stores.bug.getState();
              console.log('[E2E-DEBUG] bugStore state before refresh:', {
                isWatching: state.isWatching,
                bugsCount: state.bugs.length,
              });
            }
            // Try refreshing bugs manually
            try {
              const refreshResult = await api.readBugs(projectPath);
              console.log('[E2E-DEBUG] readBugs after event:', JSON.stringify(refreshResult?.bugs?.map((b: any) => b.name)));
              (window as any).__READ_BUGS_AFTER_EVENT__ = refreshResult;
            } catch (err: any) {
              console.log('[E2E-DEBUG] readBugs after event error:', err?.message);
            }
          });
        }
      });

      // Check readBugs result
      const directReadBugsResult = await browser.execute(() => (window as any).__DIRECT_READ_BUGS_RESULT__);
      console.log('[E2E] Direct readBugs result:', JSON.stringify(directReadBugsResult));

      // DEBUG: Force call handleBugsChanged to see if it updates the store
      // IMPORTANT: handleBugsChanged is async, so we need to await it
      await browser.executeAsync(async (done: (result: any) => void) => {
        const stores = (window as any).__STORES__;
        if (stores?.bug?.getState) {
          const state = stores.bug.getState();
          // Manually call handleBugsChanged with a mock event
          console.log('[E2E-DEBUG] Manually calling handleBugsChanged...');
          // We need an ApiClient - create a simple mock
          const mockApiClient = {
            getBugs: async () => {
              const api = (window as any).electronAPI;
              const projectPath = '/Users/yamamoto/git/sdd-orchestrator/electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test';
              const result = await api.readBugs(projectPath);
              console.log('[E2E-DEBUG] mockApiClient.getBugs result:', JSON.stringify(result.bugs.map((b: any) => b.name)));
              return { ok: true, value: result.bugs };
            },
          };
          try {
            await state.handleBugsChanged(mockApiClient, { type: 'add', bugName: 'test-manual', path: '/test' });
            console.log('[E2E-DEBUG] handleBugsChanged completed');
            const newState = stores.bug.getState();
            done({ bugsCount: newState.bugs.length, bugNames: newState.bugs.map((b: any) => b.name) });
          } catch (err: any) {
            console.log('[E2E-DEBUG] handleBugsChanged error:', err?.message);
            done({ error: err?.message });
          }
        } else {
          done({ error: 'stores not available' });
        }
      });
      await browser.pause(500);
      const bugStoreAfterManual = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        if (!stores?.bug?.getState) return null;
        const state = stores.bug.getState();
        return { bugsCount: state.bugs.length, bugNames: state.bugs.map((b: any) => b.name) };
      });
      console.log('[E2E] bugStore after manual handleBugsChanged:', JSON.stringify(bugStoreAfterManual));

      // 3. 新しいbugフォルダを作成（/kiro:bug-createと同等の操作）
      const newBugName = 'e2e-new-bug';
      createBugFolder(newBugName);
      console.log('[E2E] Created new bug folder:', newBugName);

      // 4. ファイル監視による自動更新を待つ
      // chokidar: awaitWriteFinish 200ms + debounce 300ms = 約500ms
      // 余裕を持って最大15秒待機
      let iteration = 0;
      const updated = await waitForCondition(async () => {
        iteration++;
        const bugs = await getBugsList();
        const hasNewBug = bugs.some(b => b.name === newBugName);
        if (!hasNewBug) {
          console.log('[E2E] Waiting for bugs update... current count:', bugs.length, 'has new bug:', hasNewBug);
          // Check if event was received
          const lastEvent = await browser.execute(() => (window as any).__LAST_BUGS_EVENT__);
          if (lastEvent) {
            console.log('[E2E] Last bugs event received:', JSON.stringify(lastEvent));
          }
          // Also check if bugStore refreshed
          const bugStoreState = await browser.execute(() => {
            const stores = (window as any).__STORES__;
            if (!stores?.bug?.getState) return null;
            const state = stores.bug.getState();
            return { isWatching: state.isWatching, bugsCount: state.bugs.length, bugNames: state.bugs.map((b: any) => b.name) };
          });
          console.log('[E2E] bugStore state:', JSON.stringify(bugStoreState));
          // Check readBugs after event
          const readBugsAfterEvent = await browser.execute(() => (window as any).__READ_BUGS_AFTER_EVENT__);
          if (readBugsAfterEvent) {
            console.log('[E2E] readBugs after event:', JSON.stringify(readBugsAfterEvent?.bugs?.map((b: any) => b.name)));
          }
          // Dump browser console logs periodically
          if (iteration === 3 || iteration === 10) {
            const logs = await browser.getLogs('browser');
            console.log('[E2E] Browser console logs:', JSON.stringify(logs, null, 2));
          }
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
