# Bug Analysis: auto-execution-inspection-handler-missing

## Summary
自動実行フローでimpl完了後、`execute-inspection`および`execute-spec-merge`イベントが発火されるが、handlers.tsにリスナーが未登録のため、イベントが消失して自動実行が黙って停止する。

## Root Cause

**イベントハンドラの実装漏れ**

git-worktree-supportでinspectionフェーズを自動実行フローに追加した際、AutoExecutionCoordinatorでイベント発火は実装されたが、handlers.tsでのリスナー登録が漏れた。

### Technical Details
- **Location**:
  - 発火側: [autoExecutionCoordinator.ts:695](electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts#L695), [autoExecutionCoordinator.ts:1101](electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts#L1101)
  - 登録漏れ: [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts) (2349行以降に追加が必要)
- **Component**: AutoExecutionCoordinator ↔ handlers.ts 間のイベント連携
- **Trigger**: impl完了後に`execute-inspection`イベント発火 → リスナー不在で何も起きない

## Impact Assessment
- **Severity**: Critical
- **Scope**: 自動実行フローでinspection/spec-mergeを使用するすべてのSpec
- **Risk**:
  - 自動実行が途中で黙って停止する（エラー表示なし）
  - ユーザーはなぜ停止したか分からない

## Related Code

### イベント発火（実装済み）
```typescript
// autoExecutionCoordinator.ts:691-697
if (nextPhase === 'inspection') {
  logger.info('[AutoExecutionCoordinator] Impl completed, triggering inspection', {
    specPath,
  });
  this.emit('execute-inspection', specPath, {
    specId: state.specId,
  });
}
```

```typescript
// autoExecutionCoordinator.ts:1097-1103
if (status === 'passed') {
  // git-worktree-support Task 9.2: Inspection成功後、spec-mergeを自動実行
  logger.info('[AutoExecutionCoordinator] Inspection passed (GO), triggering spec-merge', {
    specPath,
  });
  this.emit('execute-spec-merge', specPath, {
    specId: state.specId,
  });
}
```

### 既存のリスナー登録パターン（参考）
```typescript
// handlers.ts:2232 - execute-next-phase
coordinator.on('execute-next-phase', async (specPath, phase, context) => { ... });

// handlers.ts:2349 - execute-document-review
coordinator.on('execute-document-review', async (specPath, context) => { ... });
```

### 欠落しているリスナー
```typescript
// handlers.ts に追加が必要
coordinator.on('execute-inspection', async (specPath, context) => { ... });
coordinator.on('execute-spec-merge', async (specPath, context) => { ... });
```

## Proposed Solution

### Option 1: handlers.tsにイベントハンドラを追加
- Description: `execute-inspection`と`execute-spec-merge`のリスナーをhandlers.tsに追加
- Pros: 既存パターンに従った一貫性のある実装
- Cons: なし

### Recommended Approach
handlers.tsに以下を追加:

1. **execute-inspection ハンドラ**
   - specManagerService.execute({ type: 'inspection', ... }) を呼び出す
   - agent完了時に coordinator.handleInspectionCompleted() を呼び出す

2. **execute-spec-merge ハンドラ**
   - specManagerService.execute({ type: 'spec-merge', ... }) を呼び出す
   - 完了時に coordinator.completeExecution() を呼び出す

## Dependencies
- specManagerService.execute() が 'inspection' と 'spec-merge' タイプをサポートしていること
- handleInspectionCompleted() が正しく動作すること

## Testing Strategy
1. 自動実行でimpl完了後、inspectionが起動されることを確認
2. inspection GO判定後、spec-mergeが起動されることを確認
3. inspection NOGO判定時、paused状態になることを確認
4. E2Eテストで自動実行フロー全体を検証
