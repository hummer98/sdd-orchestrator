# Bug Analysis: spec-file-watcher-not-updating-ui

## Summary
specフォルダ内のファイル（requirements.md, design.md, tasks.md等）が外部で更新されてもUIにリアルタイム反映されない問題。**watcherが起動していない**ことが主な原因。

## Root Cause

### Technical Details
- **Location**: [projectStore.ts:183](electron-sdd-manager/src/renderer/stores/projectStore.ts#L183)
- **Component**: projectStore, specStore
- **Trigger**: プロジェクト選択時にwatcherが正しく起動していない

### 主要な問題: startWatching()が呼ばれていない/失敗している

**デバッグで判明した事実:**
1. `window.electronAPI.startSpecsWatcher()`を直接呼ぶとwatcherは正常に起動する
2. watcherが起動すれば、ファイル変更は正しく検知される（ログに`[SpecsWatcherService] File event`が出る）
3. しかし`projectStore.selectProject()`経由ではwatcherが起動していない

```typescript
// projectStore.ts:181-184
// Start file watchers for specs and agents (File as SSOT)
// This also starts AgentRecordWatcher via START_SPECS_WATCHER IPC
await useSpecStore.getState().startWatching();  // ← これが失敗または呼ばれていない
await useBugStore.getState().startWatching();
```

**考えられる原因:**
1. **例外が発生してcatchされている**: startWatching()内でエラーが発生しても、catch節でconsole.errorするだけで上位に伝播しない
2. **importの問題**: `useSpecStore`のdynamic importが失敗している可能性
3. **競合状態**: HMRでリロードされた後、storeの状態がリセットされている

### 二次的な問題: HMR後のwatcher再起動

HMR（Hot Module Replacement）でページがリロードされると:
1. Renderer側のイベントリスナーが失われる
2. Main側のwatcherは動作し続けるが、新しいウィンドウへの参照がない
3. 結果として、イベントが発火しても届かない

## Impact Assessment
- **Severity**: High（基本機能が動作しない）
- **Scope**: プロジェクト選択後、全てのspec/bugファイル変更が反映されない
- **Risk**: ユーザーは手動でリフレッシュするか、アプリを再起動する必要がある

## Reproduction Steps
1. SDD Orchestratorを起動
2. プロジェクトを選択
3. VSCodeでspec内のファイル（例: requirements.md）を編集・保存
4. SDD Orchestratorに反映されない

## Verification
```bash
# watcherが起動しているか確認
grep -i "SpecsWatcher" logs/electron-dev.log | tail -5

# 期待: "Starting watcher" と "Watcher ready" のログが表示される
# 問題時: ログが出力されていない
```

## Proposed Solution

### Option 1: startWatching()のデバッグ強化（推奨・最初のステップ）
- Description: startWatching()の呼び出し前後にログを追加し、実際の問題箇所を特定
- Pros:
  - 根本原因を正確に特定できる
  - 最小限の変更
- Cons:
  - 一時的な対応

```typescript
// projectStore.ts - デバッグ用ログ追加
console.log('[projectStore] About to start watching...');
try {
  await useSpecStore.getState().startWatching();
  console.log('[projectStore] startWatching completed');
} catch (error) {
  console.error('[projectStore] startWatching failed:', error);
}
```

### Option 2: Watcher起動をselectProject IPC内に移動
- Description: main processの`selectProject`関数内でwatcherを自動起動
- Pros:
  - Renderer/Main間の同期問題を解消
  - 単一の場所で制御できる
- Cons:
  - アーキテクチャ変更が必要

### Option 3: HMR対応のwatcher再起動機構
- Description: HMR発生時にwatcherを自動再起動
- Pros: 開発時のUX向上
- Cons: 本番環境では不要

### Recommended Approach
1. まずOption 1でデバッグログを追加し、正確な失敗箇所を特定
2. 特定後、適切な修正を実施

## Dependencies
- [projectStore.ts](electron-sdd-manager/src/renderer/stores/projectStore.ts) - selectProject内のwatcher起動処理
- [specStore.ts](electron-sdd-manager/src/renderer/stores/specStore.ts) - startWatching実装
- [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts) - START_SPECS_WATCHER IPC

## Testing Strategy
1. **デバッグ**: consoleログでstartWatchingの呼び出しを追跡
2. **手動テスト**:
   - アプリ起動→プロジェクト選択→ファイル変更→反映確認
   - HMR発生後の動作確認
3. **ログ確認**:
   ```bash
   grep -i "SpecsWatcher" logs/electron-dev.log
   # "Starting watcher" と "Watcher ready" が表示されることを確認
   ```
