# Bug Fix: document-review-auto-reply-not-triggered

## Summary
`document-review` → `document-review-reply`を常にワンセットで実行するように修正。手動実行時もエージェントをトラッキングし、`autoExecutionFlag`による条件分岐を削除。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts` | `trackManualDocumentReviewAgent` API追加、`autoExecutionFlag`チェック削除 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | 手動実行時にエージェントをトラッキング |

### Code Changes

#### 1. AutoExecutionService.ts - 新規API追加 (line 708-747)
```typescript
+ // ============================================================
+ // Bug Fix: Track manual document-review agent for one-set execution
+ // document-review -> document-review-reply should always run as a set
+ // ============================================================
+ /**
+  * Track a manually executed document-review agent.
+  * This enables document-review-reply to automatically run after document-review completes,
+  * even when executed manually (not through auto-execution).
+  */
+ trackManualDocumentReviewAgent(agentId: string, specId: string): void {
+   // Get or create ExecutionContext for this spec
+   let context = this.executionContexts.get(specId);
+   if (!context) {
+     const specStore = useSpecStore.getState();
+     if (!specStore.specDetail || specStore.specDetail.metadata.name !== specId) {
+       console.warn(`[AutoExecutionService] Cannot track agent: specDetail not available for ${specId}`);
+       return;
+     }
+     context = createExecutionContext({
+       specId,
+       specDetail: specStore.specDetail,
+     });
+     this.executionContexts.set(specId, context);
+   }
+
+   // Track the agent
+   this.agentToSpecMap.set(agentId, specId);
+   context.trackedAgentIds.add(agentId);
+   this.trackedAgentIds.add(agentId);
+
+   console.log(`[AutoExecutionService] Tracking manual document-review agent: ${agentId} -> ${specId}`);
+
+   // Process any buffered events for this agent
+   const bufferedStatus = this.pendingEvents.get(agentId);
+   if (bufferedStatus) {
+     console.log(`[AutoExecutionService] Processing buffered status=${bufferedStatus} for manual agent ${agentId}`);
+     this.pendingEvents.delete(agentId);
+     this.handleDirectStatusChange(agentId, bufferedStatus);
+   }
+ }
```

#### 2. AutoExecutionService.ts - autoExecutionFlagチェック削除 (line 893-904)
```diff
  private async handleDocumentReviewCompletedForContext(context: ExecutionContext): Promise<void> {
    console.log(`[AutoExecutionService] Document review completed for spec ${context.specId}`);

    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
    }

-   const workflowStore = useWorkflowStore.getState();
-   const { documentReviewOptions } = workflowStore;
-
-   if (documentReviewOptions.autoExecutionFlag === 'run') {
-     await this.executeDocumentReviewReplyForContext(context);
-   } else {
-     this.setStatusForSpec(context.specId, 'paused');
-   }
+   // Bug Fix: document-review -> document-review-reply should always run as a set
+   // regardless of autoExecutionFlag setting
+   await this.executeDocumentReviewReplyForContext(context);
  }
```

#### 3. WorkflowView.tsx - 手動実行時のトラッキング (line 313-336)
```diff
  const handleStartDocumentReview = useCallback(async () => {
    if (!specDetail) return;

    try {
      // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
-     await window.electronAPI.executeDocumentReview(
+     const agentInfo = await window.electronAPI.executeDocumentReview(
        specDetail.metadata.name,
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
+
+     // Bug Fix: Track manual document-review agent for one-set execution
+     // document-review -> document-review-reply should always run as a set
+     if (agentInfo?.agentId) {
+       const autoExecutionService = getAutoExecutionService();
+       autoExecutionService.trackManualDocumentReviewAgent(
+         agentInfo.agentId,
+         specDetail.metadata.name
+       );
+     }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'ドキュメントレビューの実行に失敗しました');
    }
  }, [specDetail, workflowStore.commandPrefix]);
```

## Implementation Notes
- `trackManualDocumentReviewAgent`は必要に応じて`ExecutionContext`を作成する
- バッファリングされた完了イベントがあれば即座に処理する
- 自動実行時のフローに影響なし（二重起動のリスクなし）

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. `AutoExecutionService.ts`の`trackManualDocumentReviewAgent`メソッドを削除
2. `handleDocumentReviewCompletedForContext`に`autoExecutionFlag`チェックを復元
3. `WorkflowView.tsx`の`handleStartDocumentReview`から戻り値の処理を削除

## Test Results
- AutoExecutionService.test.ts: 81 passed, 1 skipped
- WorkflowView.test.tsx: 20 passed

## Related Commits
- *To be added after commit*
