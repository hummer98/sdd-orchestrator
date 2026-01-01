# E2Eテスト失敗レポート (2026-01-01)

## 概要

| 項目 | 初回実行 (04:45) | 再実行 (06:30) | テスト修正後 (08:07) | フルテスト再実行 (16:30) | 最終修正後 (16:48) |
|------|-----------------|----------------|---------------------|-------------------------|-------------------|
| 全体結果 | 15 passed, 5 failed | 19 passed, 1 failed | **20 passed, 0 failed** | 17 passed, 3 failed | **24 passed, 0 failed** |
| 成功率 | 75% | 95% | **100%** | 85% | **100%** |
| 対象ファイル | 20 total | 5 total | 5 total | 20 total | 1 total (layout-persistence) |

## 最終結果サマリー

### ✅ 解決済み（元の5ファイル）

| # | ファイル名 | 初回 | 再実行 | テスト修正後 | 対応内容 |
|---|-----------|------|-------|------------|---------|
| 1 | auto-execution-flow.e2e.spec.ts | ❌ | ✅ | ✅ | バグ修正で解決 |
| 2 | auto-execution-intermediate-artifacts.e2e.spec.ts | ❌ | ✅ | ✅ | バグ修正で解決 |
| 3 | auto-execution-workflow.e2e.spec.ts | ❌ | ✅ | ✅ | バグ修正で解決 |
| 4 | simple-auto-execution.e2e.spec.ts | ❌ | ✅ | ✅ | バグ修正で解決 |
| 5 | bugs-pane-integration.e2e.spec.ts | ❌ | ❌ | ✅ | テスト修正で解決 |

### ⚠️ 追加で発見された問題（フルテスト時）

| # | ファイル名 | 状態 | 問題内容 |
|---|-----------|------|---------|
| 1 | bug-auto-execution.e2e.spec.ts | ❌ | タブ切り替え問題（修正済み）+ ワークフローストア関連の問題 |
| 2 | cloudflare-tunnel.e2e.spec.ts | ❌ | cloudflaredバイナリ依存・環境問題 |
| 3 | layout-persistence.e2e.spec.ts | ✅ | **テスト修正で解決** (16:48) |

**注**: bug-auto-execution, cloudflare-tunnelは個別実行では成功することがあり、フルテスト時のリソース競合やタイミング問題の可能性がある

---

## 解決した問題

### 1. document-review → document-review-reply 自動連携

**バグID**: `document-review-auto-reply-not-triggered`

**修正内容**:
- `AutoExecutionService.handleAgentCompletion`でdocument-review完了時にdocument-review-replyを自動実行するロジックを修正

**検証結果**: 以下4ファイルのテストがすべて成功
- auto-execution-flow.e2e.spec.ts
- auto-execution-intermediate-artifacts.e2e.spec.ts
- auto-execution-workflow.e2e.spec.ts
- simple-auto-execution.e2e.spec.ts

---

### 2. bugs-pane-integration.e2e.spec.ts テスト修正

**根本原因**: テストがUIタブ切り替えを行っていなかった

**問題の詳細**:
- テストは `selectBugViaStore()` でbugStoreの`selectedBug`を設定
- しかし、`activeTab`は初期値の`'specs'`のまま
- App.tsxは`activeTab === 'specs'`なのでSpecPaneを表示
- BugPane（とBugWorkflowView）は表示されずタイムアウト

**修正内容**:

1. **タブ切り替えヘルパー関数を追加**:
```typescript
async function switchToBugsTab(): Promise<boolean> {
  const docsTabs = await $('[data-testid="docs-tabs"]');
  await docsTabs.waitForExist({ timeout: 10000 });
  const bugsTab = await $('[data-testid="tab-bugs"]');
  await bugsTab.waitForExist({ timeout: 5000 });
  // JavaScript clickでinteractability問題を回避
  await browser.execute((el: HTMLElement) => el.click(), bugsTab);
  await browser.pause(500);
  return true;
}
```

2. **各beforeEachでタブ切り替えを追加**:
```typescript
beforeEach(async () => {
  const projectSuccess = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
  expect(projectSuccess).toBe(true);
  await browser.pause(1000);

  // ★ Bugsタブに切り替え（BugPaneを表示するために必要）
  const tabSwitched = await switchToBugsTab();
  expect(tabSwitched).toBe(true);

  await clearSelectedSpecViaStore();
  await browser.pause(300);
});
```

3. **テスト期待値の修正**:
   - `bug-tab-*` → `bug-artifact-editor-tab-*` (ArtifactEditorのtestId形式に合わせる)
   - 「4つのドキュメントタブ」→「存在するドキュメントのタブ」(フィクスチャにはreport.mdとanalysis.mdのみ)
   - `bug-phase-execute-button-analyze` → `bug-phase-execute-button-fix` (完了済みフェーズはボタン非表示)

---

### 3. layout-persistence.e2e.spec.ts テスト修正

**根本原因**: ProjectAgentPanelのテストがプロジェクト選択なしで実行されていた

**問題の詳細**:
- `ProjectAgentPanelコンポーネント`セクションのテストはbeforeEachでプロジェクト選択をしていなかった
- App.tsxの566行目: `{currentProject && (...)}` でProjectAgentPanelは条件付きレンダリング
- プロジェクト未選択時はProjectAgentPanelがレンダリングされず、testIdが見つからなかった
- 「ProjectAgentPanelレイアウト保存・復元」セクションはbeforeEachでプロジェクト選択をしていたため成功

**修正内容**:

1. **`ProjectAgentPanelコンポーネント`セクションにbeforeEachを追加**:
```typescript
// Select project before ProjectAgentPanel tests
beforeEach(async () => {
  await browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
    try {
      const stores = (window as any).__STORES__;
      if (stores?.projectStore?.getState) {
        await stores.projectStore.getState().selectProject(projPath);
        done(true);
      } else {
        done(false);
      }
    } catch {
      done(false);
    }
  }, FIXTURE_PROJECT_PATH);
  // Wait for React to re-render after project selection
  await browser.pause(500);
});
```

2. **各テストにwaitForExistを追加**:
```typescript
it('ProjectAgentPanelが常に表示される（0件時も）', async () => {
  const panel = await $('[data-testid="project-agent-panel"]');
  await panel.waitForExist({ timeout: 5000 });  // ★ 追加
  const exists = await panel.isExisting();
  expect(exists).toBe(true);
});
```

**検証結果**: 3回連続で24テストすべて成功（100%）

---

## テスト実行コマンド

### 全テスト実行
```bash
task electron:test:e2e
```

### 特定ファイルのみ実行
```bash
cd electron-sdd-manager
npx wdio run wdio.conf.ts --spec e2e-wdio/bugs-pane-integration.e2e.spec.ts
```

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| [App.tsx](../../electron-sdd-manager/src/renderer/App.tsx#L566) | タブ切り替えによるペイン表示制御、ProjectAgentPanel条件付きレンダリング |
| [BugPane.tsx](../../electron-sdd-manager/src/renderer/components/BugPane.tsx) | BugWorkflowViewを含むコンテナ |
| [bugs-pane-integration.e2e.spec.ts](../../electron-sdd-manager/e2e-wdio/bugs-pane-integration.e2e.spec.ts) | 修正されたテスト（タブ切り替え追加） |
| [layout-persistence.e2e.spec.ts](../../electron-sdd-manager/e2e-wdio/layout-persistence.e2e.spec.ts) | 修正されたテスト（プロジェクト選択追加） |
| [fix.md](../../.kiro/bugs/document-review-auto-reply-not-triggered/fix.md) | バグ修正ドキュメント |
