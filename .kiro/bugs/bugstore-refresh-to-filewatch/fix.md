# Bug Fix: bugstore-refresh-to-filewatch

## Summary
bugStoreの`onBugsChanged`ハンドラをイベントベースの差分更新に変更し、File Watchイベントの詳細（`type`, `bugName`）に基づいて最小限の更新を行うように修正。これにより、Bug自動実行中に`selectedBug`が不用意にクリアされる問題を解消。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/bugStore.ts` | イベントベース差分更新ロジックの追加 |

### Code Changes

#### 1. BugActions インターフェースの拡張

```diff
 interface BugActions {
   loadBugs: (projectPath: string) => Promise<void>;
   selectBug: (bug: BugMetadata, options?: { silent?: boolean }) => Promise<void>;
   clearSelectedBug: () => void;
   refreshBugs: () => Promise<void>;
   startWatching: () => Promise<void>;
   stopWatching: () => Promise<void>;
   getSortedBugs: () => BugMetadata[];
   getBugsByPhase: (phase: BugPhase | 'all') => BugMetadata[];
   setBugs: (bugs: BugMetadata[]) => void;
+  // Bug fix: bugstore-refresh-to-filewatch
+  // Event-based differential update methods
+  updateBugByName: (bugName: string) => Promise<void>;
+  refreshSelectedBugDetail: () => Promise<void>;
+  handleBugsChanged: (event: BugsChangeEvent) => void;
 }
```

#### 2. onBugsChangedハンドラの修正

```diff
       // Subscribe to change events
-      watcherCleanup = window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
-        console.log('[bugStore] Bugs changed:', event);
-        // Refresh bugs list on any change
-        get().refreshBugs();
-      });
+      // Bug fix: bugstore-refresh-to-filewatch
+      // Use event-based differential update instead of full refresh
+      watcherCleanup = window.electronAPI.onBugsChanged((event: BugsChangeEvent) => {
+        console.log('[bugStore] Bugs changed:', event);
+        get().handleBugsChanged(event);
+      });
```

#### 3. 新規メソッドの追加

- **`updateBugByName(bugName)`**: 特定のバグのメタデータを差分更新
- **`refreshSelectedBugDetail()`**: 選択中のバグの詳細のみを更新
- **`handleBugsChanged(event)`**: イベントタイプに基づいて適切な更新処理にルーティング

```typescript
handleBugsChanged: (event: BugsChangeEvent) => {
  const { type, bugName } = event;
  const { selectedBug } = get();

  switch (type) {
    case 'add':
    case 'addDir':
      // 新規バグ追加
      if (bugName) get().updateBugByName(bugName);
      break;

    case 'change':
      // ファイル変更 - メタデータ更新＋選択中なら詳細も更新
      if (bugName) {
        get().updateBugByName(bugName);
        if (selectedBug?.name === bugName) {
          get().refreshSelectedBugDetail();
        }
      }
      break;

    case 'unlink':
      // ファイル削除 - バグフォルダ内のファイル削除時はメタデータ更新
      if (bugName) {
        const { bugs } = get();
        if (bugs.some((b) => b.name === bugName)) {
          get().updateBugByName(bugName);
          if (selectedBug?.name === bugName) {
            get().refreshSelectedBugDetail();
          }
        }
      }
      break;

    case 'unlinkDir':
      // ディレクトリ削除 - バグフォルダ自体が削除された場合のみリストから削除
      if (bugName) {
        const { bugs } = get();
        const updatedBugs = bugs.filter((b) => b.name !== bugName);
        if (updatedBugs.length !== bugs.length) {
          set({ bugs: updatedBugs });
          if (selectedBug?.name === bugName) {
            get().clearSelectedBug();
          }
        }
      }
      break;
  }
}
```

## Implementation Notes

### 設計方針
specWatcherServiceと同様のパターンを採用：
- イベントタイプに基づいて適切なハンドラにルーティング
- `selectedBug`は該当バグが削除された場合のみクリア
- `change`イベントでは`selectedBug`を維持したまま詳細のみ更新

### 後方互換性
- `refreshBugs()`は手動リフレッシュ用途として引き続き利用可能
- 既存のテスト16件すべてがパス

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `bugStore.ts`の変更を元に戻す
2. `onBugsChanged`ハンドラを`refreshBugs()`呼び出しに戻す

```bash
git checkout HEAD -- electron-sdd-manager/src/renderer/stores/bugStore.ts
```

## Related Commits
- *Pending commit after verification*
