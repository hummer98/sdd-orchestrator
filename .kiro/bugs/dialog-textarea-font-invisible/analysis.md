# Bug Analysis: dialog-textarea-font-invisible

## Summary
CreateSpecDialogとRejectDialogのtextareaにダークモード時のテキストカラーが指定されておらず、ブラウザデフォルトの黒いテキストがダークな背景（`bg-gray-800`）上で見えない問題。

## Root Cause
Tailwind CSSクラスでtextareaの`text-color`が明示的に指定されていないため、ブラウザデフォルトの黒い文字色が使用されている。

### Technical Details
- **Location**:
  - [CreateSpecDialog.tsx:118-128](electron-sdd-manager/src/renderer/components/CreateSpecDialog.tsx#L118-L128)
  - [RejectDialog.tsx:98-107](electron-sdd-manager/src/renderer/components/RejectDialog.tsx#L98-L107)
- **Component**: CreateSpecDialog, RejectDialog
- **Trigger**: ダークモードでダイアログを開き、textareaに文字を入力すると、背景が`bg-gray-800`なのに文字色が黒のままで見えない

## Impact Assessment
- **Severity**: Medium（機能は動くが、ユーザーが入力内容を確認できない）
- **Scope**: 新規仕様作成ダイアログ、却下ダイアログを使用するすべてのユーザー（ダークモード時）
- **Risk**: 修正は低リスク（CSSクラス追加のみ）

## Related Code

**問題のある箇所（CreateSpecDialog.tsx）:**
```tsx
className={clsx(
  'w-full px-3 py-2 rounded-md resize-none',
  'bg-gray-50 dark:bg-gray-800',
  'border',
  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
  // ← ここに text-color の指定がない
)}
```

**正しい実装例（CreateBugDialog.tsx:172）:**
```tsx
className={clsx(
  'w-full px-3 py-2 rounded-md resize-none',
  'bg-gray-50 dark:bg-gray-800',
  'text-gray-900 dark:text-gray-100',  // ← これが必要
  'border',
  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
)}
```

## Proposed Solution

### Option 1: 個別コンポーネント修正
- Description: CreateSpecDialogとRejectDialogにtext-colorクラスを追加
- Pros: 最小限の変更
- Cons: 将来同様の問題が起きる可能性

### Option 2: グローバルCSSでtextareaのデフォルトスタイル設定（推奨）
- Description: index.cssでtextareaのデフォルトtext-colorを設定し、全textareaに適用
- Pros: 将来の問題を防止、一貫性を確保
- Cons: 若干の影響範囲拡大（ただしtextarea限定なので低リスク）

### Recommended Approach
**Option 2（グローバルCSS）**が推奨。以下の理由による：
1. CreateBugDialogで既に正しく設定されている例があり、これが標準パターンとなるべき
2. 他のダイアログでも同様の問題が発生する可能性がある
3. グローバル設定により、一貫したスタイルを保証できる

## Dependencies
- `electron-sdd-manager/src/renderer/styles/index.css`
- 影響を受けるコンポーネント: CreateSpecDialog, RejectDialog

## Testing Strategy
1. ダークモードでCreateSpecDialogを開く
2. textareaに文字を入力し、文字が見えることを確認
3. RejectDialogでも同様に確認
4. ライトモードでも文字が正しく表示されることを確認
