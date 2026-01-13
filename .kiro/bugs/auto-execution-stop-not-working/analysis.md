# Bug Analysis: auto-execution-stop-not-working

## Summary
自動実行の停止ボタンがMain Processの状態消失時に機能しない。`stop()`が`NOT_EXECUTING`エラーを返した場合、Renderer側の状態がリセットされないため、UIが「実行中」のまま残り続ける。

## Root Cause
`handleAutoExecution`関数で、`stopAutoExecution()`の結果が`ok`でない場合にRenderer側の状態をリセットしていない。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/WorkflowView.tsx:223-227`
- **Component**: WorkflowView (handleAutoExecution callback)
- **Trigger**: HMRやアプリリロードでMain ProcessのAutoExecutionCoordinator状態がリセットされた後に停止ボタンを押す

## Impact Assessment
- **Severity**: Medium
- **Scope**: 開発環境（HMR発生時）および本番環境（アプリ再起動後に状態不整合が発生した場合）
- **Risk**: UIが操作不能な状態になり、ユーザーはページリロードかアプリ再起動が必要になる

## Related Code

**問題のコード** (`WorkflowView.tsx:220-227`):
```typescript
const handleAutoExecution = useCallback(async () => {
  if (!specDetail) return;

  if (isAutoExecuting) {
    const result = await autoExecution.stopAutoExecution(specDetail.metadata.path);
    if (!result.ok) {
      notify.error('自動実行の停止に失敗しました。');
    }
    // ← ここで result.ok でなくても状態をリセットすべき
  } else {
    // ...start logic
  }
}, [...]);
```

**autoExecutionStore.tsのstopAutoExecution** (194-202行目):
```typescript
stopAutoExecution: (specId: string) => {
  const map = new Map(get().autoExecutionRuntimeMap);
  map.set(specId, {
    isAutoExecuting: false,
    currentAutoPhase: null,
    autoExecutionStatus: 'idle',
  });
  set({ autoExecutionRuntimeMap: map });
},
```

## Proposed Solution

### Option 1: NOT_EXECUTINGエラー時にRenderer状態をリセット
- Description: `stop()`が`NOT_EXECUTING`エラーを返した場合、「Main Processに状態がない＝実行していない」と解釈し、Renderer側も同期してリセットする
- Pros: シンプル、論理的に正しい、既存のstore actionを再利用
- Cons: なし

### Recommended Approach
**Option 1を採用**

修正箇所: `WorkflowView.tsx:handleAutoExecution`

```typescript
if (isAutoExecuting) {
  const result = await autoExecution.stopAutoExecution(specDetail.metadata.path);
  if (!result.ok) {
    notify.error('自動実行の停止に失敗しました。');
    // Bug Fix: NOT_EXECUTING エラーの場合、Main Processに状態がないので
    // Renderer側の状態もリセットする
    if (result.error.type === 'NOT_EXECUTING') {
      useAutoExecutionStore.getState().stopAutoExecution(specDetail.metadata.name);
    }
  }
}
```

## Dependencies
- `autoExecutionStore.ts`: 既存の`stopAutoExecution` actionを使用（変更不要）

## Testing Strategy
1. 自動実行を開始
2. Main Processをリロード（HMRトリガーまたは`task electron:restart`）
3. 停止ボタンを押す
4. UIが「停止」状態に戻ることを確認
