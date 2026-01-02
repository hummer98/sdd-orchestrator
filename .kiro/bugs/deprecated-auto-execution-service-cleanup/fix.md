# Bug Fix: deprecated-auto-execution-service-cleanup

## Summary
旧Renderer側のAutoExecutionServiceを完全に削除し、WorkflowView.tsxをMain Process IPC経由のuseAutoExecution hookに移行しました。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `src/renderer/components/WorkflowView.tsx` | useAutoExecution hookに移行、旧AutoExecutionService参照を削除 |
| `src/renderer/services/index.ts` | AutoExecutionServiceエクスポートを削除 |
| `src/renderer/stores/specStore.ts` | syncFromSpecAutoExecution呼び出しを削除 |
| `src/renderer/stores/specStore.test.ts` | 旧AutoExecutionService同期テストを削除 |
| `src/renderer/components/WorkflowView.integration.test.tsx` | 旧AutoExecutionServiceテストセクションを削除 |

### Files Deleted
| File | Reason |
|------|--------|
| `src/renderer/services/AutoExecutionService.ts` | Main Process AutoExecutionCoordinatorに移行済み |
| `src/renderer/services/AutoExecutionService.test.ts` | 対象ファイル削除に伴う削除 |
| `src/renderer/services/AutoExecutionService.parallel.test.ts` | 対象ファイル削除に伴う削除 |
| `src/renderer/services/AutoExecutionService.integration.test.ts` | 対象ファイル削除に伴う削除 |

### Code Changes

**WorkflowView.tsx - Import変更:**
```diff
-import { useCallback, useMemo, useEffect, useRef } from 'react';
+import { useCallback, useMemo } from 'react';
...
-import { getAutoExecutionService, disposeAutoExecutionService } from '../services/AutoExecutionService';
+import { useAutoExecution } from '../hooks/useAutoExecution';
```

**WorkflowView.tsx - handleAutoExecution変更:**
```diff
-  const handleAutoExecution = useCallback(() => {
-    const service = autoExecutionServiceRef.current;
-    if (isAutoExecuting) {
-      service.stop();
-    } else {
-      const started = service.start();
-      if (!started) {
-        notify.error('自動実行を開始できませんでした。許可フェーズを確認してください。');
-      }
-    }
-  }, [isAutoExecuting]);
+  const handleAutoExecution = useCallback(async () => {
+    if (!specDetail) return;
+
+    if (isAutoExecuting) {
+      const result = await autoExecution.stopAutoExecution(specDetail.metadata.path);
+      if (!result.ok) {
+        notify.error('自動実行の停止に失敗しました。');
+      }
+    } else {
+      const result = await autoExecution.startAutoExecution(
+        specDetail.metadata.path,
+        specDetail.metadata.name,
+        {
+          permissions: workflowStore.autoExecutionPermissions,
+          documentReviewFlag: workflowStore.documentReviewOptions.autoExecutionFlag,
+          validationOptions: workflowStore.validationOptions,
+        }
+      );
+      if (!result.ok) {
+        notify.error('自動実行を開始できませんでした。許可フェーズを確認してください。');
+      }
+    }
+  }, [isAutoExecuting, specDetail, autoExecution, ...]);
```

**specStore.ts - 同期処理削除:**
```diff
-      // spec-scoped-auto-execution-state: Sync autoExecution state to workflowStore
-      try {
-        const { getAutoExecutionService } = await import('../services/AutoExecutionService');
-        const service = getAutoExecutionService();
-        service.syncFromSpecAutoExecution();
-      } catch (syncError) {
-        console.error('[specStore] Failed to sync autoExecution state:', syncError);
-      }
+      // Note: spec-scoped-auto-execution-state sync was removed as part of
+      // deprecated-auto-execution-service-cleanup. Main Process AutoExecutionCoordinator
+      // now handles state management via IPC events.
```

## Implementation Notes
- `useAutoExecution` hookは既存のMain Process IPC API（`autoExecutionStart`, `autoExecutionStop`, `autoExecutionRetryFrom`）を使用
- `trackManualDocumentReviewAgent`機能は削除（Main Processで管理されるため不要）
- BugAutoExecutionServiceは今回の修正対象外（別サービス）

## Breaking Changes
- [x] No breaking changes

既存の自動実行機能はMain Process側のAutoExecutionCoordinatorで動作しており、UIからの操作はIPC経由で行われます。

## Rollback Plan
1. 削除したファイルをgitから復元
2. WorkflowView.tsxの変更を元に戻す
3. specStore.tsの同期処理を復元

## Test Results
- TypeScript: ✓ No errors
- Unit Tests: ✓ 2920 passed, 12 skipped
