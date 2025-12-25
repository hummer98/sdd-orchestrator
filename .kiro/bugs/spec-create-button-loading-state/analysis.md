# Bug Analysis: spec-create-button-loading-state

## Summary
CreateSpecDialogの「作成」ボタンがLoading状態のままになる問題。一度仕様作成を実行すると、ダイアログを閉じて再度開いた際にボタンがLoading状態のまま残り、操作不能になる。

## Root Cause
`handleClose`関数で`setIsCreating(false)`を呼んでいないため、`isCreating`状態がリセットされない。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/CreateSpecDialog.tsx:63-67`
- **Component**: CreateSpecDialog
- **Trigger**:
  1. ダイアログを開く
  2. 説明を入力して「作成」ボタンをクリック
  3. 作成成功後、ダイアログが閉じる
  4. 再度ダイアログを開く → **ボタンがLoading状態のまま**

### 根本原因の詳細
```tsx
// handleClose関数（問題箇所）
const handleClose = () => {
  setDescription('');
  setError(null);
  // setIsCreating(false); が欠落している！
  onClose();
};
```

DocsTabsでは`CreateSpecDialog`が常にレンダリングされており、`isOpen`プロパティで表示/非表示を制御している：
```tsx
<CreateSpecDialog
  isOpen={isCreateSpecDialogOpen}
  onClose={() => setIsCreateSpecDialogOpen(false)}
/>
```

これにより、ダイアログは**アンマウントされず**、`useState`の`isCreating`状態が保持され続ける。

## Impact Assessment
- **Severity**: Medium
- **Scope**: 全ユーザーに影響。一度Spec作成を実行すると、同一セッション内でSpec作成機能が使用不能になる
- **Risk**: ユーザーが新規Spec作成できなくなる

## Related Code
```tsx
// CreateSpecDialog.tsx:63-67
const handleClose = () => {
  setDescription('');
  setError(null);
  onClose();  // ← isCreating がリセットされない
};

// CreateSpecDialog.tsx:159-161
<button
  onClick={handleCreate}
  disabled={isCreating || !isValid}  // ← isCreating=true でボタンが無効化
```

## Proposed Solution

### Option 1: handleCloseでisCreatingをリセット
- Description: `handleClose`関数内で`setIsCreating(false)`を追加
- Pros: シンプルで最小限の変更
- Cons: なし

```tsx
const handleClose = () => {
  setDescription('');
  setError(null);
  setIsCreating(false);  // 追加
  onClose();
};
```

### Option 2: keyプロパティでコンポーネントをリマウント
- Description: ダイアログを開くたびにkeyを変更してコンポーネントをリマウント
- Pros: 全てのローカル状態が確実にリセットされる
- Cons: 過剰な実装、パフォーマンスへの軽微な影響

### Recommended Approach
**Option 1** を推奨。`handleClose`関数内で`setIsCreating(false)`を追加するだけで修正可能。

## Dependencies
- なし（変更は`CreateSpecDialog.tsx`のみ）

## Testing Strategy
1. 既存テスト: `CreateSpecDialog.test.tsx`の「should clear form and close when cancel is clicked」を拡張
2. 新規テスト追加:
   - 作成成功後にダイアログを再度開いた際、ボタンが有効であることを確認
   - `isCreating`状態が`handleClose`でリセットされることを確認
