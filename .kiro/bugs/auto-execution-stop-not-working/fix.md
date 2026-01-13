# Bug Fix: auto-execution-stop-not-working

## Summary
自動実行の停止ボタンがMain Process状態消失時に機能しない問題を修正。`NOT_EXECUTING`エラー時にRenderer側の状態もリセットするようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | NOT_EXECUTINGエラー時のRenderer状態リセット処理を追加 |

### Code Changes

```diff
--- a/electron-sdd-manager/src/renderer/components/WorkflowView.tsx
+++ b/electron-sdd-manager/src/renderer/components/WorkflowView.tsx
@@ -23,6 +23,7 @@ import { normalizeInspectionState } from '../types/inspection';
 import { useAutoExecution } from '../hooks/useAutoExecution';
+import { useAutoExecutionStore } from '../stores/spec/autoExecutionStore';
 import {
   WORKFLOW_PHASES,
   ALL_WORKFLOW_PHASES,
@@ -224,6 +225,11 @@ export function WorkflowView() {
       const result = await autoExecution.stopAutoExecution(specDetail.metadata.path);
       if (!result.ok) {
         notify.error('自動実行の停止に失敗しました。');
+        // Bug Fix: NOT_EXECUTING エラーの場合、Main Processに状態がないので
+        // Renderer側の状態もリセットする
+        if (result.error.type === 'NOT_EXECUTING') {
+          useAutoExecutionStore.getState().stopAutoExecution(specDetail.metadata.name);
+        }
       }
     } else {
```

## Implementation Notes

- `NOT_EXECUTING`エラーは、Main Processに該当Specの自動実行状態が存在しないことを意味する
- HMRやアプリ再起動でMain Processの状態がリセットされた場合、Renderer側の`isAutoExecuting`フラグだけが残る状態が発生
- この修正により、停止ボタン押下時にMain Processに状態がなければ、Renderer側の状態も同期してリセットされる
- 既存の`useAutoExecutionStore.stopAutoExecution()`アクションを再利用しており、新しいロジックの追加は最小限

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
`WorkflowView.tsx`の該当行を削除し、インポートも削除する。

## Related Commits
- *コミット未実施*
