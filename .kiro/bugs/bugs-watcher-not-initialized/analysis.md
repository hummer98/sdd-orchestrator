# Bug Analysis: bugs-watcher-not-initialized

## Summary
BugListコンポーネントでファイル変更イベントが受信されない問題。`bugStore.startWatching()`はSpec側の実装と異なり、Main Processのウォッチャーを不必要に再起動しており、設計上の不整合がある。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/shared/stores/bugStore.ts:292-310`
- **Component**: `useSharedBugStore.startWatching()`
- **Trigger**: `projectStore.selectProject`完了時に呼ばれる`startWatching()`

### 設計上の不整合

**Spec側の実装（正常動作）** - `specWatcherService.ts:57-80`:
```typescript
async startWatching(): Promise<void> {
  // Main Processへの再起動要求なし - イベントリスナー登録のみ
  this.watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
    this.handleSpecsChanged(event);
  });
  this._isWatching = true;
}
```

**Bug側の実装（問題あり）** - `bugStore.ts:292-310`:
```typescript
startWatching: (apiClient: ApiClient) => {
  // 問題1: Main Processのウォッチャーを再起動する
  apiClient.startBugsWatcher();  // awaitなしで非同期呼び出し

  // イベントリスナー登録
  watcherUnsubscribe = apiClient.onBugsChanged((event) => {
    get().handleBugsChanged(apiClient, event);
  });
}
```

### 問題の流れ

1. **SELECT_PROJECT完了時**（Main Process `handlers.ts:2142`）
   - `startBugsWatcher(window)` が呼ばれる
   - ウォッチャー開始、`onChange`コールバック登録済み

2. **Renderer側 `projectStore.selectProject`完了時**（`projectStore.ts:263`）
   - `useSharedBugStore.getState().startWatching(ipcApiClient)` が呼ばれる

3. **`bugStore.startWatching()`内**
   - `apiClient.startBugsWatcher()` が`await`なしで呼ばれる
   - Main Processの`START_BUGS_WATCHER`ハンドラーが実行される

4. **Main Process `startBugsWatcher`関数**（`handlers.ts:3315-3373`）
   - **既存ウォッチャーを停止**: `await bugsWatcherService.stop()`
   - **新しいウォッチャーを作成**: `new BugsWatcherService()`
   - **コールバック再登録**: `bugsWatcherService.onChange(...)`
   - **ウォッチャー再開始**: `await bugsWatcherService.start()`

### 潜在的な問題点

1. **冗長な再起動**: Main Processでウォッチャーが2回起動される（SELECT_PROJECTと`startBugsWatcher` IPC）
2. **`await`なしの非同期呼び出し**: エラーが発生しても検出されない
3. **設計の不一致**: Spec側とBug側で`startWatching`の責務が異なる

## Impact Assessment
- **Severity**: Medium
- **Scope**: BugsListのリアルタイム更新機能に影響
- **Risk**: ファイル変更イベントの取りこぼし、潜在的なタイミング問題

## Related Code
```typescript
// projectStore.ts:257-263 - startWatchingの呼び出し
// Register event listeners for file watchers (File as SSOT)
// Note: Watchers are started by Main process in SELECT_PROJECT IPC handler
// Here we only register the event listeners on Renderer side  // ← Bugs側には当てはまらない
await useSpecStore.getState().startWatching();
const ipcApiClient = new IpcApiClient();
useSharedBugStore.getState().startWatching(ipcApiClient);  // ← Main Processに再起動要求を送る
```

## Proposed Solution

### Recommended Approach: Spec側との一貫性確保

`bugStore.startWatching()`をSpec側の実装パターンに合わせ、**Renderer側でのイベントリスナー登録のみ**を行うよう修正する。

**修正後の`bugStore.startWatching()`**:
```typescript
startWatching: (apiClient: ApiClient) => {
  // Clean up existing subscription
  if (watcherUnsubscribe) {
    watcherUnsubscribe();
    watcherUnsubscribe = null;
  }

  // Main Processへの再起動要求を削除
  // ウォッチャーはSELECT_PROJECTで既に開始済み
  // apiClient.startBugsWatcher();  // 削除

  // Subscribe to bug change events
  watcherUnsubscribe = apiClient.onBugsChanged((event: BugsChangeEvent) => {
    console.log('[useSharedBugStore] Bugs changed:', event);
    get().handleBugsChanged(apiClient, event);
  });

  set({ isWatching: true });
  console.log('[useSharedBugStore] Bugs watcher started');
};
```

**理由**:
1. **技術的正しさ**: SELECT_PROJECTで既にウォッチャーは開始済み
2. **保守性**: Spec側との一貫性確保
3. **一貫性**: 「Renderer側はイベントリスナー登録のみ」という設計原則に従う

### 修正対象ファイル
- `electron-sdd-manager/src/shared/stores/bugStore.ts` - `startWatching()`から`apiClient.startBugsWatcher()`呼び出しを削除
- `electron-sdd-manager/src/shared/stores/bugStore.ts` - `stopWatching()`から`apiClient.stopBugsWatcher()`呼び出しも同様に削除を検討

## Dependencies
- `projectStore.ts` - 呼び出し元、変更不要
- `IpcApiClient.ts` - `startBugsWatcher`メソッドは残すが、`bugStore`からは呼ばない
- `handlers.ts` - Main Process側のウォッチャー管理、変更不要

## Testing Strategy
1. E2Eテスト: Electronアプリ起動 → プロジェクト選択 → ターミナルからBug作成 → BugsList自動更新確認
2. 単体テスト: `bugStore.startWatching()`のテストで`startBugsWatcher`が呼ばれないことを確認
3. 統合テスト: `BugList.integration.test.tsx`のファイル変更検知テスト
