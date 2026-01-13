# Bug Fix: auto-exec-unapproved-noop

## Summary
自動実行開始時に、未承認だが生成済みのフェーズを自動承認してから次のフェーズを開始するように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts` | 自動承認ロジックとヘルパーメソッドを追加 |

### Code Changes

**1. FileService のインポート追加（行15）**
```diff
 import { EventEmitter } from 'events';
 import { logger } from './logger';
 import type { WorkflowPhase } from './specManagerService';
+import { FileService } from './fileService';
```

**2. start() メソッドに自動承認ロジックを追加（行417-446）**
```diff
     if (approvals) {
+      // Bug Fix: 未承認だが生成済みのフェーズを自動承認
+      // 自動実行ボタンを押す = 現状の成果物を暗黙的に承認する意図と解釈
+      const unapprovedPhases = this.getUnapprovedGeneratedPhases(approvals);
+      if (unapprovedPhases.length > 0) {
+        const fileService = new FileService();
+        // ミュータブルなコピーを作成
+        const mutableApprovals = {
+          requirements: { ...approvals.requirements },
+          design: { ...approvals.design },
+          tasks: { ...approvals.tasks },
+        };
+        for (const phase of unapprovedPhases) {
+          logger.info('[AutoExecutionCoordinator] Auto-approving unapproved generated phase', {
+            specPath,
+            phase,
+          });
+          const result = await fileService.updateApproval(specPath, phase, true);
+          if (result.ok) {
+            mutableApprovals[phase].approved = true;
+          } else {
+            logger.warn('[AutoExecutionCoordinator] Failed to auto-approve phase', {
+              specPath,
+              phase,
+              error: result.error,
+            });
+          }
+        }
+        approvals = mutableApprovals;
+      }
+
       lastCompletedPhase = this.getLastCompletedPhase(approvals);
```

**3. getNextPermittedPhase の呼び出しを修正（行448）**
```diff
-    const firstPhase = this.getNextPermittedPhase(lastCompletedPhase, options.permissions, options.approvals);
+    const firstPhase = this.getNextPermittedPhase(lastCompletedPhase, options.permissions, approvals);
```

**4. getUnapprovedGeneratedPhases メソッドを追加（行819-835）**
```diff
+  /**
+   * 未承認だが生成済みのフェーズを取得（順序通り）
+   * @param approvals 承認状態
+   * @returns 未承認かつ生成済みのフェーズのリスト
+   */
+  getUnapprovedGeneratedPhases(approvals: ApprovalsStatus): Array<'requirements' | 'design' | 'tasks'> {
+    const phases = ['requirements', 'design', 'tasks'] as const;
+    const result: Array<'requirements' | 'design' | 'tasks'> = [];
+    for (const phase of phases) {
+      const approval = approvals[phase];
+      if (approval.generated && !approval.approved) {
+        result.push(phase);
+      }
+    }
+    return result;
+  }
```

## Implementation Notes
- 自動実行ボタンを押す = 現状の成果物を暗黙的に承認するという意図と解釈
- 複数の未承認フェーズがある場合、すべてを順番に自動承認
- spec.json への更新は `fileService.updateApproval()` を通じて行う
- approvals は readonly のため、ミュータブルなコピーを作成して更新

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `autoExecutionCoordinator.ts` の変更をrevert
2. 追加した `getUnapprovedGeneratedPhases` メソッドを削除
3. `FileService` のインポートを削除

## Related Commits
- *未コミット*
