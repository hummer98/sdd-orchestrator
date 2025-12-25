# Bug Fix: spec-create-button-loading-state

## Summary
CreateSpecDialogの`handleClose`関数に`setIsCreating(false)`を追加し、ダイアログを閉じる際にLoading状態をリセットするよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/CreateSpecDialog.tsx` | `handleClose`関数に`setIsCreating(false)`を追加 |
| `electron-sdd-manager/src/renderer/components/CreateSpecDialog.test.tsx` | リグレッションテスト追加 |

### Code Changes

```diff
  const handleClose = () => {
    setDescription('');
    setError(null);
+   setIsCreating(false);
    onClose();
  };
```

## Implementation Notes
- DocsTabsでは`CreateSpecDialog`が常にマウントされており、`isOpen`プロパティで表示/非表示を制御している
- そのため、ダイアログを閉じてもコンポーネントはアンマウントされず、ローカル状態が保持され続ける
- `handleClose`で明示的に`isCreating`をリセットすることで、次回ダイアログを開いた際に正常な状態で開始される

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `handleClose`関数から`setIsCreating(false);`の行を削除

## Related Commits
- *未コミット（verifyフェーズ後にコミット予定）*

## Test Results
全19テストがパス:
- Task 5.1: Simplified dialog UI (4 tests)
- Task 5.2: spec-manager:init integration (5 tests)
- Task 5.2.5: CreateSpecDialog UI improvements (4 tests)
- Task 5.3: Dialog state management and feedback (6 tests) ← 1件追加

### 追加したテスト
```tsx
// Bug fix: spec-create-button-loading-state
// handleCloseで全てのローカル状態がリセットされることを検証
it('should reset isCreating state when dialog is closed after successful creation', async () => {
  // コンポーネントが再マウントされないシナリオをシミュレート
  // DocsTabsではCreateSpecDialogは常にマウントされており、isOpenで表示/非表示を制御
  const { rerender } = render(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

  // 作成実行 → 成功 → ダイアログ閉じる
  // ...

  // ダイアログを非表示にしてから再表示（アンマウントせずに再オープン）
  rerender(<CreateSpecDialog isOpen={false} onClose={mockOnClose} />);
  rerender(<CreateSpecDialog isOpen={true} onClose={mockOnClose} />);

  // 再オープン後、作成ボタンがLoading状態ではなく有効であること
  expect(screen.queryByText(/作成中/i)).not.toBeInTheDocument();
});
```
