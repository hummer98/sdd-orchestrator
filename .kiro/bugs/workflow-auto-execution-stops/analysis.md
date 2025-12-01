# Bug Analysis: workflow-auto-execution-stops

## Summary
自動実行機能でRequirementsとDesignが完了後、Tasksフェーズに進まず停止する問題。specStoreのキャッシュが古いまま参照されることが原因。

## Root Cause
Agentの完了検知後、次フェーズを実行しようとする際に、specStoreのspecDetailが更新されていないため、前フェーズの`generated`フラグが`false`のままで「生成されていない」エラーとして処理される。

### Technical Details
- **Location**: [AutoExecutionService.ts:139-146](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L139-L146)
- **Component**: AutoExecutionService.validatePreconditions()
- **Trigger**: Agentステータス変更の検知から次フェーズ実行までの間にspecStoreが更新されない

### Root Cause Flow
1. `design`フェーズのAgentが完了 → agentStoreが更新される
2. `setupAgentListener`が変更を検知 → `handleAgentCompleted('design')`を呼ぶ
3. `getNextPermittedPhase('design')` → `tasks`を返す
4. `executePhase('tasks')`が呼ばれる
5. `validatePreconditions('tasks')`を実行
6. **問題**: `specStore.specDetail.specJson.approvals.design.generated`がまだ`false`
7. 結果: `valid: false`, `requiresApproval: false`, `error: 'design is not generated yet'`
8. 526行目でエラー処理 → 自動実行が停止

## Impact Assessment
- **Severity**: High
- **Scope**: 自動実行機能全体に影響。複数フェーズの連続実行が不可能
- **Risk**: UIでは自動実行ボタンが停止ボタン（赤）のまま残り、ユーザーは原因がわからない

## Related Code
```typescript
// AutoExecutionService.ts:139-146
if (!prevApproval.approved) {
  return {
    valid: prevApproval.generated, // ← generated=falseの場合、valid=false
    requiresApproval: prevApproval.generated, // ← requiresApproval=false
    waitingForAgent: false,
    missingSpec: false,
    error: prevApproval.generated ? null : `${prevPhase} is not generated yet`,
  };
}

// AutoExecutionService.ts:525-527
} else {
  this.handleAgentFailed(phase, precondition.error || 'Precondition validation failed');
  return; // ← ここで自動実行が停止
}
```

## Proposed Solution

### Recommended Approach
**validatePreconditions内で直接spec.jsonを読む**

specStoreのキャッシュを信頼せず、`validatePreconditions`内で`window.electronAPI.readSpecJson()`を直接呼んで最新のspec.jsonを取得する。

- **Pros**:
  - 確実に最新状態を取得できる
  - `validatePreconditions`はフェーズ遷移時のみ呼ばれるため、パフォーマンス影響は最小限
  - specStoreの重い`selectSpec()`を呼ばずに済む
- **Cons**:
  - 毎回ファイルI/Oが発生する（ただし頻度は低い）

修正箇所: [AutoExecutionService.ts:89-106](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L89-L106)

```typescript
async validatePreconditions(phase: WorkflowPhase): Promise<PreconditionResult> {
  const specStore = useSpecStore.getState();
  const agentStore = useAgentStore.getState();

  // Check specDetail availability
  if (!specStore.specDetail) {
    return {
      valid: false,
      requiresApproval: false,
      waitingForAgent: false,
      missingSpec: true,
      error: 'specDetail is not available',
    };
  }

  const specDetail = specStore.specDetail;

  // ★ 変更: キャッシュではなく直接spec.jsonを読む
  const specJson = await window.electronAPI.readSpecJson(specDetail.metadata.path);

  // ... 以降は同じ
}
```

## Dependencies
- [electronAPI.readSpecJson](electron-sdd-manager/src/preload/index.ts): IPC経由でspec.jsonを読む既存API

## Testing Strategy
1. 要件定義→設計→タスクの3フェーズをGO状態にして自動実行を開始
2. 各フェーズ完了後に次フェーズが正しく開始されることを確認
3. ログで`[AutoExecutionService] Executing phase: tasks`が出力されることを確認
4. E2Eテストの追加: auto-execution.spec.ts
