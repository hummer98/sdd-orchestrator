# Bug Fix: auto-execution-restart-from-beginning

## Summary
自動実行ボタン押下時に、specの現在の進捗状態（approvals）を参照して、完了済みフェーズの次から実行を開始するように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts` | `getLastCompletedPhase()` メソッドを追加、`start()` メソッドを修正 |
| `electron-sdd-manager/src/renderer/services/AutoExecutionService.test.ts` | 新しいメソッドと修正ロジックのテストを追加 |

### Code Changes

**1. ApprovalStatus型のインポートを追加**
```diff
 import { WORKFLOW_PHASES, type WorkflowPhase, type ValidationType } from '../types/workflow';
+import type { ApprovalStatus } from '../types';
```

**2. `getLastCompletedPhase()` メソッドを追加**
```typescript
// Bug Fix: Get last completed phase from approvals
// Determines the starting point for auto-execution based on spec status
getLastCompletedPhase(approvals: ApprovalStatus): WorkflowPhase | null {
  // Check in reverse order: tasks -> design -> requirements
  // Return the last phase that is either approved OR generated (will be auto-approved)
  if (approvals.tasks.approved || approvals.tasks.generated) return 'tasks';
  if (approvals.design.approved || approvals.design.generated) return 'design';
  if (approvals.requirements.approved || approvals.requirements.generated) return 'requirements';
  return null;
}
```

**3. `start()` メソッドを修正**
```diff
 start(): boolean {
   const specStore = useSpecStore.getState();
   const workflowStore = useWorkflowStore.getState();

   if (!specStore.specDetail) {
     console.error('[AutoExecutionService] specDetail is not available');
     return false;
   }

-  // Get first permitted phase
-  const firstPhase = this.getNextPermittedPhase(null);
+  // Bug Fix: Determine starting phase based on current spec progress
+  const approvals = specStore.specDetail.specJson.approvals;
+  const lastCompletedPhase = this.getLastCompletedPhase(approvals);
+
+  // Get next permitted phase after the last completed one
+  const firstPhase = this.getNextPermittedPhase(lastCompletedPhase);
   if (!firstPhase) {
     console.error('[AutoExecutionService] No permitted phases to execute');
     return false;
   }
+
+  console.log(`[AutoExecutionService] Starting from phase: ${firstPhase} (last completed: ${lastCompletedPhase || 'none'})`);
```

## Implementation Notes
- `getLastCompletedPhase()` は `approved` だけでなく `generated` も確認します。これにより、生成済みだが未承認のフェーズも「完了」として扱い、次のフェーズから実行を開始します
- 既存の自動承認ロジック（`executePhase` 内）がそのまま活用されるため、未承認フェーズは実行前に自動承認されます
- ログ出力で開始フェーズと最後の完了フェーズを表示し、デバッグを容易にしています

## Breaking Changes
- [x] No breaking changes

既存のAPIや動作は維持されています。新しいロジックは開始位置の決定のみに影響します。

## Rollback Plan
1. `AutoExecutionService.ts` の変更を元に戻す
2. `start()` メソッド内で `getNextPermittedPhase(null)` に戻す
3. `getLastCompletedPhase()` メソッドを削除
4. `ApprovalStatus` のインポートを削除

## Test Results
```
Test Files  1 passed (1)
     Tests  37 passed (37)
```

新規追加テスト:
- `getLastCompletedPhase`: 6テスト
- `start resumes from current progress`: 5テスト

## Related Commits
- *Pending commit*
