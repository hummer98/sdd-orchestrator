# Bug Fix: bugs-watcher-not-initialized

## Summary
`bugStore.startWatching()`から冗長な`apiClient.startBugsWatcher()`呼び出しを削除し、Spec側の実装パターンと一貫性を確保した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/shared/stores/bugStore.ts` | `startWatching()`から`apiClient.startBugsWatcher()`呼び出しを削除 |
| `electron-sdd-manager/src/shared/stores/bugStore.test.ts` | テストを修正: `startBugsWatcher`が呼ばれないことを期待するように変更 |
| `electron-sdd-manager/src/remote-ui/views/BugsView.test.tsx` | テストを修正: `startBugsWatcher`ではなく`onBugsChanged`で購読を確認 |

### Code Changes

```diff
--- a/electron-sdd-manager/src/shared/stores/bugStore.ts
+++ b/electron-sdd-manager/src/shared/stores/bugStore.ts
@@ -290,16 +290,15 @@ export const useSharedBugStore = create<SharedBugStore>((set, get) => ({

   // bugs-view-unification Task 2.3: startWatching
   // Requirements: 3.7
+  // Note: Watcher is started by Main Process in SELECT_PROJECT IPC handler
+  // Here we only register the event listener on Renderer side (same pattern as specWatcherService)
   startWatching: (apiClient: ApiClient) => {
     // Clean up existing subscription
     if (watcherUnsubscribe) {
       watcherUnsubscribe();
       watcherUnsubscribe = null;
     }

-    // Start bugs watcher
-    apiClient.startBugsWatcher();
-
     // Subscribe to bug change events
+    // Note: Main Process watcher is already started in SELECT_PROJECT handler
     watcherUnsubscribe = apiClient.onBugsChanged((event: BugsChangeEvent) => {
       console.log('[useSharedBugStore] Bugs changed:', event);
       get().handleBugsChanged(apiClient, event);
```

## Implementation Notes

### 問題の根本原因
1. `SELECT_PROJECT`完了時にMain Processで`startBugsWatcher`が既に呼ばれている
2. Renderer側の`bugStore.startWatching()`でも`apiClient.startBugsWatcher()`を呼んでいた
3. これにより、Main Processでウォッチャーが**2回起動**される問題があった
4. 2回目の起動で既存のウォッチャーが停止・再作成され、イベントリスナーの登録タイミングとの競合が発生していた可能性

### 修正方針
Spec側（`specWatcherService.ts`）の実装パターンに合わせて修正：
- **`startWatching`**: イベントリスナー登録のみ（Main Processへの再起動要求なし）
- **`stopWatching`**: 停止処理は維持（これはSpec側と同じパターン）

### 設計原則の遵守
> Renderer側はイベントリスナー登録のみ、Main Processでのウォッチャー管理はSELECT_PROJECTで完結

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
`apiClient.startBugsWatcher();`の呼び出しを`startWatching`内に戻す。

## Related Commits
- *Pending verification*
