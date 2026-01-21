# Bug Fix: auto-execution-inspection-handler-missing

## Summary
handlers.tsに`execute-inspection`と`execute-spec-merge`イベントのリスナーを追加し、自動実行フローでinspectionとspec-mergeフェーズが正しく実行されるように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/ipc/handlers.ts` | `execute-inspection`と`execute-spec-merge`イベントハンドラを追加 |
| `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts` | `completeExecution`メソッドをprotectedからpublicに変更 |

### Code Changes

**handlers.ts (2445-2540行に追加)**

```diff
+  // ============================================================
+  // Inspection Auto-Execution: execute inspection workflow
+  // When coordinator emits 'execute-inspection', execute inspection via specManagerService
+  // git-worktree-support Task 9: Added inspection phase to auto-execution flow
+  // ============================================================
+  coordinator.on('execute-inspection', async (specPath: string, context: { specId: string }) => {
+    logger.info('[handlers] execute-inspection event received', { specPath, context });
+
+    try {
+      const service = getSpecManagerService();
+
+      // Execute inspection via unified execute method
+      const result = await service.execute({
+        type: 'inspection',
+        specId: context.specId,
+        featureName: context.specId,
+        commandPrefix: 'kiro',
+      });
+
+      if (!result.ok) {
+        logger.error('[handlers] execute-inspection: inspection failed to start', { error: result.error });
+        coordinator.handleInspectionCompleted(specPath, 'failed');
+        return;
+      }
+
+      const agentId = result.value.agentId;
+      logger.info('[handlers] execute-inspection: inspection started', { agentId });
+
+      // Listen for inspection agent completion
+      const handleStatusChange = async (changedAgentId: string, status: string) => {
+        if (changedAgentId === agentId) {
+          if (status === 'completed' || status === 'failed' || status === 'stopped') {
+            logger.info('[handlers] execute-inspection: agent completed', { agentId, status });
+            service.offStatusChange(handleStatusChange);
+
+            const inspectionStatus = status === 'completed' ? 'passed' : 'failed';
+            coordinator.handleInspectionCompleted(specPath, inspectionStatus);
+          }
+        }
+      };
+      service.onStatusChange(handleStatusChange);
+    } catch (error) {
+      logger.error('[handlers] execute-inspection: unexpected error', { specPath, error });
+      coordinator.handleInspectionCompleted(specPath, 'failed');
+    }
+  });
+
+  // ============================================================
+  // Spec Merge Auto-Execution: execute spec-merge workflow
+  // When coordinator emits 'execute-spec-merge', execute spec-merge via specManagerService
+  // git-worktree-support Task 9: Added spec-merge phase to auto-execution flow
+  // ============================================================
+  coordinator.on('execute-spec-merge', async (specPath: string, context: { specId: string }) => {
+    logger.info('[handlers] execute-spec-merge event received', { specPath, context });
+
+    try {
+      const service = getSpecManagerService();
+
+      // Execute spec-merge via unified execute method
+      const result = await service.execute({
+        type: 'spec-merge',
+        specId: context.specId,
+        featureName: context.specId,
+        commandPrefix: 'kiro',
+      });
+
+      if (!result.ok) {
+        logger.error('[handlers] execute-spec-merge: spec-merge failed to start', { error: result.error });
+        coordinator.completeExecution(specPath);
+        return;
+      }
+
+      const agentId = result.value.agentId;
+      logger.info('[handlers] execute-spec-merge: spec-merge started', { agentId });
+
+      // Listen for spec-merge agent completion
+      const handleStatusChange = async (changedAgentId: string, status: string) => {
+        if (changedAgentId === agentId) {
+          if (status === 'completed' || status === 'failed' || status === 'stopped') {
+            logger.info('[handlers] execute-spec-merge: agent completed', { agentId, status });
+            service.offStatusChange(handleStatusChange);
+
+            // spec-merge completion marks the end of auto-execution
+            coordinator.completeExecution(specPath);
+          }
+        }
+      };
+      service.onStatusChange(handleStatusChange);
+    } catch (error) {
+      logger.error('[handlers] execute-spec-merge: unexpected error', { specPath, error });
+      coordinator.completeExecution(specPath);
+    }
+  });
```

**autoExecutionCoordinator.ts (1477行)**

```diff
-  protected completeExecution(specPath: string): void {
+  public completeExecution(specPath: string): void {
```

## Implementation Notes
- 既存の`execute-document-review`ハンドラと同じパターンに従って実装
- `specManagerService.execute()`の統一インターフェースを使用
- agentの完了状態を監視し、適切なコールバックを呼び出す
- `completeExecution`をpublicに変更して、handlers.tsからアクセス可能に

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `handlers.ts`から追加したイベントハンドラを削除
2. `autoExecutionCoordinator.ts`の`completeExecution`をprotectedに戻す

## Related Commits
- *コミット予定*
