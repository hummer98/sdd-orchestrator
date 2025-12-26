# Bug Fix: agent-log-height-restriction

## Summary
Agentログパネルの最大高さ制限（400px）を削除し、自由にリサイズ可能にした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [App.tsx](electron-sdd-manager/src/renderer/App.tsx) | `BOTTOM_PANE_MAX`定数を削除し、リサイズハンドラーから最大値チェックを除去 |

### Code Changes

**定数定義の変更 (App.tsx:48-49):**
```diff
 const BOTTOM_PANE_MIN = 100;
-const BOTTOM_PANE_MAX = 400;
+// BOTTOM_PANE_MAX removed: no upper limit for agent log panel height
```

**リサイズハンドラーの変更 (App.tsx:120-122):**
```diff
 const handleBottomResize = useCallback((delta: number) => {
-  setBottomPaneHeight((prev) => Math.min(BOTTOM_PANE_MAX, Math.max(BOTTOM_PANE_MIN, prev - delta)));
+  setBottomPaneHeight((prev) => Math.max(BOTTOM_PANE_MIN, prev - delta));
 }, []);
```

## Implementation Notes
- 最小値制限（100px）は維持し、パネルが完全に見えなくなることを防止
- 最大値制限を削除することで、ユーザーは画面の上部までパネルを拡大可能
- レイアウト保存機能は変更なし（既存のまま動作）

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `BOTTOM_PANE_MAX = 400` 定数を復元
2. `handleBottomResize` で `Math.min(BOTTOM_PANE_MAX, ...)` を再追加

## Related Commits
- (未コミット - 検証後にコミット予定)
