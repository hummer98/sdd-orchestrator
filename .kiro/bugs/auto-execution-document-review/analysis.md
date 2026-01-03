# Bug Analysis: auto-execution-document-review

## Summary
自動実行時にtasksフェーズ完了後のDocument Reviewワークフロー（document-review → document-review-reply）が実行されない。`documentReviewFlag`オプションは渡されているが未使用。

## Root Cause
移行時のロジック欠落。旧Renderer側`AutoExecutionService`からMain Process側`AutoExecutionCoordinator`への移行で、tasksフェーズ完了後のDocument Review実行ロジックが実装されていない。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts:609-640`
- **Component**: AutoExecutionCoordinator.handleAgentCompleted()
- **Trigger**: tasksフェーズがcompletedになったとき

### 問題箇所
現在の`handleAgentCompleted()`は以下のフローのみ:
```typescript
if (status === 'completed') {
  // 1. executedPhasesに追加
  // 2. 'phase-completed'イベント発火
  // 3. getNextPermittedPhase()で次フェーズ(impl)を取得
  // 4. 'execute-next-phase'イベント発火
}
```

**欠落しているロジック**（旧実装より）:
```typescript
// tasksフェーズ完了時の特別処理
if (completedPhase === 'tasks') {
  if (documentReviewFlag !== 'skip') {
    // document-review実行
    // → 完了後にdocument-review-reply実行
    // → fixRequiredCount === 0 ならimplへ進む
    // → fixRequiredCount > 0 ならpausedで待機
  }
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: 自動実行でDocument Reviewを有効にしているユーザー
- **Risk**: Document Reviewがスキップされ、レビューなしでimplフェーズに進む

## Related Code

### 現在の実装（問題箇所）
`autoExecutionCoordinator.ts:625-639`:
```typescript
// 次フェーズを自動実行
const options = this.executionOptions.get(specPath);
if (options) {
  const nextPhase = this.getNextPermittedPhase(currentPhase, options.permissions);
  if (nextPhase) {
    // Document Reviewを考慮せず直接次フェーズへ
    this.emit('execute-next-phase', specPath, nextPhase, {...});
  }
}
```

### 旧実装（あるべき姿）
`AutoExecutionService.ts:849-864`:
```typescript
private async handleTasksCompletedForDocumentReviewForContext(context) {
  const { documentReviewOptions } = workflowStore;

  if (documentReviewOptions.autoExecutionFlag === 'skip') {
    // skipなら次フェーズへ
    const nextPhase = this.getNextPermittedPhase('tasks');
    this.executePhaseForContext(context, nextPhase);
  } else {
    // run/pauseならdocument-review実行
    await this.executeDocumentReviewForContext(context);
  }
}
```

## Proposed Solution

### Option 1: Coordinator内でDocument Review処理を追加
- **Description**: `handleAgentCompleted()`にtasksフェーズ完了時の分岐を追加
- **Pros**: SSoT原則に従い、Main Process内で完結
- **Cons**: Coordinatorの責務が増える

### Option 2: 新規イベント'tasks-completed'を追加してhandlers.tsで処理
- **Description**: tasksフェーズ完了時に専用イベントを発火し、handlers.tsでDocument Review実行
- **Pros**: 関心の分離が明確
- **Cons**: イベント追加でコードが複雑化

### Recommended Approach
**Option 1を推奨**

理由:
1. 既存の`handleAgentCompleted()`内に条件分岐を追加するだけで済む
2. `options.documentReviewFlag`は既にCoordinatorに保存されている
3. handlers.tsの`execute-next-phase`リスナーはそのまま活用可能

実装方針:
```typescript
// handleAgentCompleted() 内
if (status === 'completed' && currentPhase === 'tasks') {
  const options = this.executionOptions.get(specPath);
  if (options?.documentReviewFlag !== 'skip') {
    // Document Reviewフェーズを挿入
    this.emit('execute-document-review', specPath, {...});
    return; // implへの自動遷移を中断
  }
}
// 通常の次フェーズ遷移
```

## Dependencies
- `handlers.ts`: 新規イベント'execute-document-review'のリスナー追加が必要
- `specManagerService.ts`: `executeDocumentReview()`と`executeDocumentReviewReply()`のAPI確認

## Testing Strategy
1. **Unit Test**: `autoExecutionCoordinator.test.ts`にtasksフェーズ完了時のDocument Review分岐テスト追加
2. **E2E Test**: documentReviewFlag='run'で自動実行し、Document Reviewが実行されることを確認
3. **手動確認**: UIでDocument Review有効設定→自動実行→tasksフェーズ後の動作確認
