# Bug Analysis: auto-execution-loading-redundant

## Summary
impl実行中に`AutoExecutionStatusDisplay`コンポーネントが`ImplFlowFrame`外（パネル下部）に冗長表示される。`ImplFlowFrame`内の`ImplPhasePanel`で既に実行状態が表示されているため不要。

## Root Cause
**AutoExecutionStatusDisplayの表示位置が設計と不整合**

`WorkflowView.tsx`において、`AutoExecutionStatusDisplay`が724-735行目で`ImplFlowFrame`の**外**に配置されている。一方、`ImplFlowFrame`内部の`ImplPhasePanel`(643-655行目)は`isAutoPhase`プロップと`isExecuting`プロップで自動実行フェーズ中のハイライト表示と実行中状態の表示を行っている。

### Technical Details
- **Location**: [WorkflowView.tsx:724-735](electron-sdd-manager/src/renderer/components/WorkflowView.tsx#L724-L735)
- **Component**: `AutoExecutionStatusDisplay`（冗長表示される側）
- **Trigger**: 自動実行中（`autoExecutionStatus !== 'idle'`）にステータス表示パネルが`ImplFlowFrame`外に描画される

### 関連する表示コンポーネント

1. **`ImplPhasePanel`** ([ImplPhasePanel.tsx:142-230](electron-sdd-manager/src/shared/components/workflow/ImplPhasePanel.tsx#L142-L230))
   - `isAutoPhase`で青いリングハイライト（149行目）
   - `isExecuting`でローディングスピナー・「実行中」ラベル表示（187-193行目）

2. **`AutoExecutionStatusDisplay`** ([AutoExecutionStatusDisplay.tsx:34-155](electron-sdd-manager/src/renderer/components/AutoExecutionStatusDisplay.tsx#L34-L155))
   - `status`が`'idle'`以外の時に表示
   - 現在フェーズ、エラー状態、停止/リトライボタンを含む

## Impact Assessment
- **Severity**: Low
- **Scope**: impl自動実行中のUI表示のみ
- **Risk**: 情報の重複により画面が煩雑になり、ユーザー体験が低下

## Related Code

```tsx
// WorkflowView.tsx:724-735 - ImplFlowFrame外での表示
<AutoExecutionStatusDisplay
  status={autoExecutionStatus}
  currentPhase={currentAutoPhase}
  lastFailedPhase={workflowStore.lastFailedPhase}
  retryCount={workflowStore.failedRetryCount}
  onRetry={handleRetry}
  onStop={async () => {
    if (specDetail) {
      await autoExecution.stopAutoExecution(specDetail.metadata.path);
    }
  }}
/>
```

```tsx
// WorkflowView.tsx:643-655 - ImplFlowFrame内のImplPhasePanel
<ImplPhasePanel
  worktreeModeSelected={isWorktreeModeSelected}
  isImplStarted={hasImplStarted}
  hasExistingWorktree={hasExistingWorktree}
  status={phaseStatuses.impl}
  autoExecutionPermitted={workflowStore.autoExecutionPermissions.impl}
  isExecuting={isImplExecuting}
  canExecute={canStartImpl}
  isAutoPhase={isAutoExecuting && currentAutoPhase === 'impl'}  // ← ハイライト
  onExecute={handleImplExecute}
  onToggleAutoPermission={() => workflowStore.toggleAutoPermission('impl')}
/>
```

## Proposed Solution

### Option 1: AutoExecutionStatusDisplayを完全削除
- Description: `WorkflowView.tsx`から`AutoExecutionStatusDisplay`コンポーネントを削除する
- Pros: 最もシンプルな解決策
- Cons: 停止ボタンやリトライボタンの機能が失われる（フッターの「停止」ボタンで代替可能）

### Option 2: AutoExecutionStatusDisplayをImplFlowFrame内に移動
- Description: `AutoExecutionStatusDisplay`を`ImplFlowFrame`内（例えばInspectionPanel後、deploy前）に配置する
- Pros: 自動実行のコンテキストが実装フロー内で一貫する
- Cons: 配置場所の検討が必要、他フェーズ（requirements/design/tasks）実行中の表示問題

### Option 3: impl実行中のみAutoExecutionStatusDisplayを非表示
- Description: `currentAutoPhase === 'impl'`の時のみ`AutoExecutionStatusDisplay`を非表示にする条件を追加
- Pros: 他フェーズでの表示は維持される
- Cons: 条件分岐が複雑になる

### Recommended Approach
**Option 1: AutoExecutionStatusDisplayを削除**

理由:
1. **DRY原則**: 同じ情報（実行中フェーズ）の重複表示は避けるべき
2. **UI階層の整合性**: impl-flow-hierarchy-fix機能で`ImplFlowFrame`が実装フローを包括するよう設計されており、その外に実行状態表示を置くのは設計意図に反する
3. **機能の代替**:
   - 停止機能 → フッターの「停止」ボタン（756-767行目）で利用可能
   - リトライ機能 → エラー時は`SpecManagerStatusDisplay`で表示（793-867行目）
4. **`SpecManagerStatusDisplay`との役割分担**: impl関連の実行状態表示は`SpecManagerStatusDisplay`が担当しており、`AutoExecutionStatusDisplay`は冗長

## Dependencies
- `WorkflowView.tsx`: `AutoExecutionStatusDisplay`のimportおよびJSX削除
- 削除後、`AutoExecutionStatusDisplayProps`や関連コンポーネントが不要になった場合は別途対応

## Testing Strategy
1. 手動テスト: 自動実行を開始し、impl実行中に冗長な表示がないことを確認
2. 既存のE2Eテスト: `WorkflowView`関連のテストが引き続きパスすることを確認
3. フッターの停止ボタンが正常に機能することを確認
