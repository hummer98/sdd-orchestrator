/**
 * Diagnostic: プロジェクト選択の「一瞬表示されてから戻る」問題の調査
 *
 * 起動直後から currentProject の全変更を監視し、
 * 何が currentProject を null に戻しているかを特定する。
 */

import * as path from 'path';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/impl-test');

describe('Diagnostic: Project Selection State Monitoring', () => {

  it('Step 1: Install monitor and observe startup broadcast', async () => {
    // currentProject の全変更を監視開始
    await browser.execute(() => {
      const stores = (window as any).__STORES__;
      if (!stores?.project) return;

      (window as any).__PROJECT_TRACE__ = [];

      stores.project.subscribe((state: any, prevState: any) => {
        if (state.currentProject !== prevState.currentProject) {
          (window as any).__PROJECT_TRACE__.push({
            time: Date.now(),
            type: 'STATE_CHANGE',
            from: prevState.currentProject,
            to: state.currentProject,
            isLoading: state.isLoading,
            error: state.error,
            kiroExists: state.kiroValidation?.exists ?? null,
          });
        }
      });
    });

    // 起動シーケンスを3秒待つ
    await browser.pause(3000);

    const state = await browser.execute(() => {
      const p = (window as any).__STORES__?.project?.getState();
      return {
        currentProject: p?.currentProject,
        isLoading: p?.isLoading,
        error: p?.error,
        kiroExists: p?.kiroValidation?.exists ?? null,
      };
    });
    console.log('[Diag] Step 1 - State after 3s: ' + JSON.stringify(state));

    const trace = await browser.execute(() => (window as any).__PROJECT_TRACE__);
    console.log('[Diag] Step 1 - Trace entries: ' + (trace?.length ?? 0));
    for (const e of (trace || [])) {
      console.log('[Diag] TRACE: ' + JSON.stringify(e));
    }
  });

  it('Step 2: selectProject and monitor 10s for revert', async () => {
    // トレースリセット
    await browser.execute(() => { (window as any).__PROJECT_TRACE__ = []; });

    // Renderer store 経由で selectProject を呼ぶ
    const result = await browser.executeAsync(async (projPath: string, done: (r: any) => void) => {
      try {
        const stores = (window as any).__STORES__;
        await stores.project.getState().selectProject(projPath);
        const p = stores.project.getState();
        done({
          ok: true,
          currentProject: p.currentProject,
          success: p.lastSelectResult?.success,
          error: p.lastSelectResult?.error,
        });
      } catch (e: any) {
        done({ ok: false, error: e?.message || String(e) });
      }
    }, FIXTURE_PATH);
    console.log('[Diag] Step 2 - selectProject: ' + JSON.stringify(result));

    // 10秒間 1秒ごとに状態をポーリング
    for (let i = 1; i <= 10; i++) {
      await browser.pause(1000);
      const cp = await browser.execute(() => {
        return (window as any).__STORES__?.project?.getState()?.currentProject;
      });
      const tc = await browser.execute(() => (window as any).__PROJECT_TRACE__?.length ?? 0);
      console.log('[Diag]   ' + i + 's: currentProject=' + (cp ?? 'null') + ' traces=' + tc);
    }

    // 全トレースを出力
    const trace = await browser.execute(() => (window as any).__PROJECT_TRACE__);
    console.log('[Diag] Step 2 - Trace entries: ' + (trace?.length ?? 0));
    for (const e of (trace || [])) {
      console.log('[Diag] TRACE: ' + JSON.stringify(e));
    }

    // DOM確認
    const dom = await browser.execute(() => ({
      projectSelectionView: !!document.querySelector('[data-testid="project-selection-view"]'),
      specItems: Array.from(document.querySelectorAll('[data-testid^="spec-item-"]'))
        .map(el => el.getAttribute('data-testid')),
    }));
    console.log('[Diag] Step 2 - DOM: ' + JSON.stringify(dom));
  });
});
