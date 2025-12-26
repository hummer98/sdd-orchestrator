# Bug Analysis: bug-phase-button-visibility

## Summary
BugPhaseItemコンポーネントで、フェーズのステータスに関係なく実行ボタンが表示される問題。Spec用のPhaseItemではstatusベースの条件分岐でボタン表示を制御しているが、Bug用のBugPhaseItemではこの制御が欠落している。

## Root Cause
BugPhaseItem.tsxの実行ボタン表示条件に`status`チェックが欠落している。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/BugPhaseItem.tsx:95`
- **Component**: BugPhaseItem
- **Trigger**: Bug選択時にBugWorkflowViewが表示され、完了済みフェーズでも実行ボタンが表示される

**問題のコード（BugPhaseItem.tsx:95）**:
```tsx
{showExecuteButton && !isExecuting && (
  <button ...>実行</button>
)}
```

**参考：正しい実装（PhaseItem.tsx:211）**:
```tsx
{status === 'pending' && !isExecuting && (
  <button ...>実行</button>
)}
```

## Impact Assessment
- **Severity**: Low (UI/UX issue - 機能的には問題なし)
- **Scope**: BugWorkflowView表示時のみ影響
- **Risk**: ユーザーが完了済みフェーズを誤って再実行しようとする可能性

## Related Code
**BugPhaseItem.tsx:94-111**（現在の実装）:
```tsx
{/* 実行ボタン */}
{showExecuteButton && !isExecuting && (
  <button
    data-testid={`bug-phase-execute-button-${phase}`}
    onClick={onExecute}
    disabled={!canExecute || isExecuting}
    className={clsx(
      'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
      'transition-colors',
      canExecute && !isExecuting
        ? 'bg-blue-500 text-white hover:bg-blue-600'
        : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
    )}
  >
    <Play className="w-4 h-4" />
    実行
  </button>
)}
```

## Proposed Solution

### Option 1: 完了済みフェーズで実行ボタンを非表示にする
- Description: `!isCompleted`条件を追加して、完了済みフェーズでは実行ボタンを表示しない
- Pros: シンプルで実装が容易、PhaseItemの動作と一貫性がある
- Cons: 再実行したい場合に対応できない

**修正コード**:
```tsx
{showExecuteButton && !isExecuting && !isCompleted && (
```

### Option 2: 完了済みフェーズで「再実行」ボタンを表示する
- Description: 完了済みの場合は別スタイルで「再実行」ボタンを表示
- Pros: 再実行機能を提供できる
- Cons: 実装が複雑、Bug修正の再実行ユースケースが不明確

### Recommended Approach
**Option 1**を推奨。理由：
1. PhaseItem（Spec用）との一貫性
2. Bug修正ワークフローでは各フェーズは一度だけ実行することを想定
3. シンプルな修正で済む

## Dependencies
- BugWorkflowView.tsx: `showExecuteButton`プロップを渡している（変更不要）
- E2Eテスト: `bug-phase-execute-button-*`のテストに影響する可能性

## Testing Strategy
1. **手動テスト**:
   - 完了済みBugを選択し、完了フェーズのボタンが非表示になることを確認
   - pending状態のフェーズでは実行ボタンが表示されることを確認
2. **E2Eテスト**:
   - `bugs-pane-integration.e2e.spec.ts`の既存テストが通ることを確認
   - 必要に応じて完了状態のテストケースを追加
