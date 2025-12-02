# Bug Analysis: auto-execution-restart-from-beginning

## Summary
自動実行ボタンが押されたとき、現在のspecの完了状態（approvals）を無視して常に最初の許可フェーズ（requirements）から開始してしまう。

## Root Cause
`AutoExecutionService.start()` メソッドが `getNextPermittedPhase(null)` を呼び出すことで、常にワークフローの最初から開始するようハードコードされている。specのapprovalステータスを参照していないため、既に完了済みのフェーズも再実行されてしまう。

### Technical Details
- **Location**: [AutoExecutionService.ts:189-194](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L189-L194)
- **Component**: `AutoExecutionService.start()` メソッド
- **Trigger**: 自動実行ボタン押下時

## Impact Assessment
- **Severity**: Medium
- **Scope**: 全ての自動実行機能に影響
- **Risk**: 既存の生成済み成果物の不要な再生成、時間の浪費

## Related Code
```typescript
// AutoExecutionService.ts:189-194
start(): boolean {
  // ...
  // Get first permitted phase
  const firstPhase = this.getNextPermittedPhase(null);  // ← 問題箇所: 常にnullを渡している
  if (!firstPhase) {
    console.error('[AutoExecutionService] No permitted phases to execute');
    return false;
  }
  // ...
}
```

```typescript
// getNextPermittedPhase メソッド (行63-83)
getNextPermittedPhase(currentPhase: WorkflowPhase | null): WorkflowPhase | null {
  const { autoExecutionPermissions } = useWorkflowStore.getState();
  // Find starting index
  let startIndex = 0;
  if (currentPhase !== null) {  // ← nullの場合、startIndex = 0 となり常に最初から
    const currentIndex = WORKFLOW_PHASES.indexOf(currentPhase);
    if (currentIndex === -1) return null;
    startIndex = currentIndex + 1;
  }
  // ...
}
```

## Proposed Solution

### Option 1: specDetailのapprovalsを参照して開始フェーズを決定
- Description: `start()` メソッド内で `specStore.specDetail.specJson.approvals` を参照し、既に承認済みの最後のフェーズを特定してから `getNextPermittedPhase()` を呼び出す
- Pros: 既存のロジックを最小限の変更で修正できる、直感的な実装
- Cons: なし

### Option 2: 新しいメソッド `getCurrentApprovedPhase()` を追加
- Description: specDetailから現在完了済みの最新フェーズを取得する専用メソッドを作成
- Pros: 責務の分離、テストが容易
- Cons: 若干コード量が増える

### Recommended Approach
**Option 1** を推奨。`start()` メソッド内で以下の修正を行う:

1. `specStore.specDetail.specJson.approvals` を読み取る
2. 承認済みの最後のフェーズを特定する
3. そのフェーズを `getNextPermittedPhase()` に渡す

具体的な実装:
```typescript
// start() メソッド内で追加
const specJson = specStore.specDetail.specJson;
const currentApprovedPhase = this.getLastApprovedPhase(specJson.approvals);
const firstPhase = this.getNextPermittedPhase(currentApprovedPhase);
```

```typescript
// 新規ヘルパーメソッド
private getLastApprovedPhase(approvals: ApprovalStatus): WorkflowPhase | null {
  // 逆順でチェック: tasks -> design -> requirements
  if (approvals.tasks.approved) return 'tasks';
  if (approvals.design.approved) return 'design';
  if (approvals.requirements.approved) return 'requirements';
  return null;
}
```

## Dependencies
- `specStore.specDetail.specJson.approvals` の正確な状態

## Testing Strategy
1. requirements完了済みのspecで自動実行 → designから開始されることを確認
2. design完了済みのspecで自動実行 → tasksから開始されることを確認
3. 何も完了していないspecで自動実行 → requirementsから開始されることを確認
4. tasks完了済みのspecで自動実行 → implから開始されることを確認
