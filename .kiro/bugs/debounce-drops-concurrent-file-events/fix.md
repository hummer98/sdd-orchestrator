# Bug Fix: debounce-drops-concurrent-file-events

## Summary
SpecsWatcherServiceとBugsWatcherServiceのdebounce処理を単一タイマーからファイルパスごとのMap方式に変更し、同時発生する複数ファイルの変更イベントが全てRendererに通知されるよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/specsWatcherService.ts` | debounceTimerをdebounceTimers Mapに変更 |
| `electron-sdd-manager/src/main/services/bugsWatcherService.ts` | 同様の修正 |

### Code Changes

#### specsWatcherService.ts

**プロパティ変更 (Line 28)**
```diff
- private debounceTimer: NodeJS.Timeout | null = null;
+ private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
```

**handleEvent変更 (Line 106-118)**
```diff
-    // Debounce to avoid multiple rapid events
-    if (this.debounceTimer) {
-      clearTimeout(this.debounceTimer);
-    }
-
-    this.debounceTimer = setTimeout(() => {
-      const event: SpecsChangeEvent = { type, path: filePath, specId };
-      this.callbacks.forEach((cb) => cb(event));
-    }, this.debounceMs);
+    // Debounce per file path to avoid dropping concurrent events for different files
+    const existingTimer = this.debounceTimers.get(filePath);
+    if (existingTimer) {
+      clearTimeout(existingTimer);
+    }
+
+    const timer = setTimeout(() => {
+      this.debounceTimers.delete(filePath);
+      const event: SpecsChangeEvent = { type, path: filePath, specId };
+      this.callbacks.forEach((cb) => cb(event));
+    }, this.debounceMs);
+
+    this.debounceTimers.set(filePath, timer);
```

**stop()変更 (Line 205-209)**
```diff
-    if (this.debounceTimer) {
-      clearTimeout(this.debounceTimer);
-      this.debounceTimer = null;
-    }
+    // Clear all debounce timers
+    for (const timer of this.debounceTimers.values()) {
+      clearTimeout(timer);
+    }
+    this.debounceTimers.clear();
```

#### bugsWatcherService.ts

同様の変更を適用（Line 21, 89-101, 128-132）

## Implementation Notes

- **実装パターン**: 既存の`AgentRecordWatcherService`と同じパターンを採用
- **動作変更**:
  - 修正前: 300ms以内の複数ファイル変更 → 最後のイベントのみ通知
  - 修正後: 300ms以内の複数ファイル変更 → 全イベントを個別に通知
- **同一ファイル**: 同一ファイルへの連続変更は引き続きdebounceされる（意図通り）

## Breaking Changes
- [x] No breaking changes

既存のAPIインターフェースに変更なし。イベント通知のタイミングと頻度のみ変更。

## Rollback Plan
1. 変更前のコードに戻す（単一debounceTimer方式）
2. `git revert <commit-hash>`で自動ロールバック可能

## Test Results
- TypeScriptコンパイル: OK
- Unit Tests: 3045 passed, 13 skipped (全144ファイル)
