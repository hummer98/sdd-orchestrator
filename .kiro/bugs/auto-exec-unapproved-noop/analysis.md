# Bug Analysis: auto-exec-unapproved-noop

## Summary
未承認フェーズがある状態で自動実行を開始すると、`getLastCompletedPhase` が `generated: true` を「完了」と判定するため、そのフェーズがスキップされる。結果として後続フェーズも「前フェーズ未承認」でスキップされ、実行可能フェーズがなくなり即座に完了する。

## Root Cause

### Technical Details
- **Location**: [autoExecutionCoordinator.ts:416-427](../../../electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts#L416-L427)
- **Component**: `AutoExecutionCoordinator.start()`
- **Trigger**: `generated: true, approved: false` の状態で自動実行ボタンを押す

### 処理フロー

```
1. getLastCompletedPhase(approvals)
   → requirements が generated: true なので 'requirements' を返す（行739-741）

2. getNextPermittedPhase('requirements', permissions, approvals)
   → startIndex = 1（designから探索開始）
   → design: isPreviousPhaseApproved → requirements.approved = false → スキップ
   → tasks, impl: 同様にスキップ
   → null を返す

3. firstPhase = null → completeExecution() → 即終了
```

### 問題のコード

```typescript
// 行736-743: generated も「完了」扱い
getLastCompletedPhase(approvals: ApprovalsStatus): WorkflowPhase | null {
  if (approvals.tasks.approved || approvals.tasks.generated) return 'tasks';
  if (approvals.design.approved || approvals.design.generated) return 'design';
  if (approvals.requirements.approved || approvals.requirements.generated) return 'requirements';
  return null;
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: 自動実行機能全体。未承認フェーズがある場合に自動実行が機能しない
- **Risk**: 低。データ損失やセキュリティリスクはない

## Proposed Solution

### 修正方針
自動実行開始時に、未承認フェーズを自動承認してから次のフェーズを開始する。

### 実装詳細

**修正箇所**: `AutoExecutionCoordinator.start()` 内、行416-427付近

**追加ロジック**:
1. `getLastCompletedPhase` で `generated: true, approved: false` のフェーズを検出
2. そのフェーズを自動承認（`fileService.updateApproval` を呼び出し）
3. 承認後に `getNextPermittedPhase` を実行

```typescript
// 擬似コード
if (approvals) {
  // 未承認だが生成済みのフェーズを自動承認
  const unapprovedPhase = this.getFirstUnapprovedGeneratedPhase(approvals);
  if (unapprovedPhase) {
    await fileService.updateApproval(specPath, unapprovedPhase, true);
    approvals[unapprovedPhase].approved = true;
  }
  lastCompletedPhase = this.getLastCompletedPhase(approvals);
}
```

### 新規メソッド追加

```typescript
getFirstUnapprovedGeneratedPhase(approvals: ApprovalsStatus): WorkflowPhase | null {
  const phases: WorkflowPhase[] = ['requirements', 'design', 'tasks'];
  for (const phase of phases) {
    const approval = approvals[phase];
    if (approval.generated && !approval.approved) {
      return phase;
    }
  }
  return null;
}
```

## Dependencies
- `fileService.updateApproval()`: spec.json の承認状態を更新
- Renderer への通知: 承認状態変更をUIに反映する必要があるかを確認

## Testing Strategy
1. 要件定義が `generated: true, approved: false` の状態を作成
2. 自動実行ボタンを押す
3. 確認事項:
   - 要件定義が自動承認される（spec.json の approvals.requirements.approved = true）
   - 設計フェーズのエージェントが起動する
   - UIに承認状態が反映される
