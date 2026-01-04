# Bug Fix: bugs-tab-list-not-updating

## Summary
`.kiro/bugs/` ディレクトリが存在しない状態でwatcher起動後にディレクトリが作成された場合でも、ファイル変更を検出できるように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/bugsWatcherService.ts` | 親ディレクトリ（`.kiro/`）を監視するように変更、パスフィルタリングを追加 |
| `electron-sdd-manager/src/main/services/bugsWatcherService.test.ts` | パスフィルタリングのテストケースを追加 |

### Code Changes

#### bugsWatcherService.ts

**1. 新しいメソッド `isWithinBugsDir` を追加:**
```typescript
/**
 * Check if a path is within the bugs directory
 */
private isWithinBugsDir(filePath: string): boolean {
  const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');
  const relativePath = path.relative(bugsDir, filePath);
  return !relativePath.startsWith('..');
}
```

**2. `start()` メソッドの監視対象を変更:**
```diff
- const bugsDir = path.join(this.projectPath, '.kiro', 'bugs');
- this.watcher = chokidar.watch(bugsDir, {
+ const kiroDir = path.join(this.projectPath, '.kiro');
+ this.watcher = chokidar.watch(kiroDir, {
    ignoreInitial: true,
    persistent: true,
-   depth: 2,
+   depth: 3, // .kiro/ -> bugs/ -> {bug-name}/ -> files
+   ignored: (filePath: string) => {
+     if (filePath === kiroDir) return false;
+     if (this.isWithinBugsDir(filePath)) return false;
+     return true; // Ignore specs, steering, etc.
+   },
    // ...
  });
```

**3. `handleEvent()` でパスフィルタリングを追加:**
```diff
  private handleEvent(type: BugsChangeEvent['type'], filePath: string): void {
+   // Filter: only process events within .kiro/bugs/
+   if (!this.isWithinBugsDir(filePath)) {
+     logger.debug('[BugsWatcherService] Ignoring event outside bugs dir', { type, filePath });
+     return;
+   }
    // ... rest of the method
  }
```

## Implementation Notes

### 修正アプローチ
分析で推奨されたOption 1（親ディレクトリ監視方式）を採用:
1. `.kiro/bugs/` ではなく `.kiro/` ディレクトリを監視
2. chokidarの `ignored` オプションで bugs 配下以外をフィルタリング
3. `handleEvent()` でも二重にフィルタリング（防御的プログラミング）

### なぜこの修正が必要だったか
- chokidarは存在しないディレクトリを監視対象にしてもエラーにならない
- しかし、親ディレクトリを監視していないと、子ディレクトリの作成を検出できない
- `.kiro/` を監視することで、`bugs/` ディレクトリが後から作成されても検出可能に

### パフォーマンス考慮
- `ignored` オプションで specs, steering, settings 等を除外
- `.kiro/bugs/` 以外のイベントは早期リターンでスキップ
- 実質的なイベント処理は修正前と同等

## Breaking Changes
- [x] No breaking changes

既存のAPIやイベント形式に変更なし。内部の監視メカニズムのみ変更。

## Test Results
```
 ✓ debounce behavior > should notify events for different files independently
 ✓ debounce behavior > should debounce rapid changes to the same file
 ✓ debounce behavior > should clear all timers on stop
 ✓ debounce behavior > should extract correct bugName from file path
 ✓ path filtering > should filter out events for paths outside .kiro/bugs/
 ✓ path filtering > should process events within .kiro/bugs/
 ✓ path filtering > should detect bugs directory creation via addDir event

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

## Rollback Plan
1. `bugsWatcherService.ts` の変更を revert
2. `bugsWatcherService.test.ts` から追加したテストを削除
3. アプリを再ビルド

```bash
git checkout HEAD -- electron-sdd-manager/src/main/services/bugsWatcherService.ts
```

## Related Commits
- *このバグ修正のコミットハッシュ（コミット後に追記）*
