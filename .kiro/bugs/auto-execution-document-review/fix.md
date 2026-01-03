# Bug Fix: auto-execution-document-review

## Summary
自動実行時にtasksフェーズ完了後のDocument Reviewワークフロー実行ロジックを追加。`documentReviewFlag !== 'skip'`の場合、document-review → document-review-replyを実行し、修正不要なら自動承認してimplへ進む。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts` | イベント型定義追加、tasksフェーズ完了時の分岐追加、`handleDocumentReviewCompleted()`メソッド追加 |
| `electron-sdd-manager/src/main/ipc/handlers.ts` | `execute-document-review`イベントリスナー追加、`executeDocumentReviewReply()`ヘルパー関数追加 |

### Code Changes

#### autoExecutionCoordinator.ts - イベント型定義追加
```diff
 export interface AutoExecutionEvents {
   'state-changed': (specPath: string, state: AutoExecutionState) => void;
   'phase-started': (specPath: string, phase: WorkflowPhase, agentId: string) => void;
   'phase-completed': (specPath: string, phase: WorkflowPhase) => void;
   'phase-error': (specPath: string, phase: WorkflowPhase, error: string) => void;
   'execution-completed': (specPath: string, summary: ExecutionSummary) => void;
   'execution-error': (specPath: string, error: AutoExecutionError) => void;
+  'execute-document-review': (specPath: string, context: { specId: string }) => void;
 }
```

#### autoExecutionCoordinator.ts - tasksフェーズ完了時の分岐
```diff
         this.emit('phase-completed', specPath, currentPhase);

         // 次フェーズを自動実行
         const options = this.executionOptions.get(specPath);
         if (options) {
+          // tasksフェーズ完了時のDocument Review処理
+          if (currentPhase === 'tasks' && options.documentReviewFlag !== 'skip') {
+            logger.info('[AutoExecutionCoordinator] Tasks completed, triggering document review', {
+              specPath,
+              documentReviewFlag: options.documentReviewFlag,
+            });
+            this.emit('execute-document-review', specPath, {
+              specId: state.specId,
+            });
+            return; // Document Review完了後に次フェーズへ進む
+          }
+
           const nextPhase = this.getNextPermittedPhase(currentPhase, options.permissions);
```

#### autoExecutionCoordinator.ts - handleDocumentReviewCompleted()追加
```typescript
handleDocumentReviewCompleted(specPath: string, approved: boolean): void {
  // approved=true: Document Review承認済み、次フェーズへ進む
  // approved=false: paused状態で待機（修正が必要）
}
```

#### handlers.ts - execute-document-reviewイベントリスナー
```typescript
coordinator.on('execute-document-review', async (specPath, context) => {
  // 1. document-review実行
  // 2. 完了後にdocument-review-reply実行（autofix=true）
  // 3. parseReplyFileでfixRequiredCountを確認
  // 4. fixRequiredCount === 0 なら自動承認してimplへ
  // 5. fixRequiredCount > 0 ならpaused状態で待機
});
```

## Implementation Notes
- 旧Renderer側AutoExecutionServiceの実装を参考に、Main Process側に移植
- documentReviewFlagは既にCoordinatorのoptionsに保存されていたため、それを活用
- document-review完了後は自動的にdocument-review-replyを実行（autofix=true）
- fixRequiredCount === 0 の場合は自動承認してimplフェーズへ進む
- fixRequiredCount > 0 の場合はpaused状態でユーザー確認を待つ

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. 以下の変更を元に戻す:
   - `autoExecutionCoordinator.ts`のイベント型定義とhandleAgentCompleted()の分岐
   - `handlers.ts`のexecute-document-reviewリスナー

## Related Commits
- *コミット前*
