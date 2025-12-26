# Bug Analysis: bugs-panel-label-removal

## Summary
BugListコンポーネントで選択中バグをリスト上部に表示しているラベルエリアを削除し、代わりにSpecと同様にアプリヘッダーに選択中バグ名を表示するUI改善。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/BugList.tsx:77-87`
- **Component**: BugList
- **Trigger**: バグ選択時に表示されるラベルエリアがリスト領域を圧迫している

現在のBugListでは選択時に以下のラベルエリアが表示される：
```tsx
{selectedBug && (
  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
        {selectedBug.name}
      </span>
      <BugActionButtons bug={selectedBug} compact />
    </div>
  </div>
)}
```

一方、Specタブでは選択中のSpec名はアプリヘッダー（App.tsx:499-509）に表示されており、リスト上部には表示していない。

## Impact Assessment
- **Severity**: Low（UI改善要求）
- **Scope**: Bugsタブの表示のみ影響
- **Risk**: 低リスク。アクションボタンの配置変更が必要だが、既存機能には影響なし

## Related Code

### 削除対象（BugList.tsx:77-87）
```tsx
{selectedBug && (
  <div className="px-4 py-2 border-b ...">
    <div className="flex items-center justify-between">
      <span>{selectedBug.name}</span>
      <BugActionButtons bug={selectedBug} compact />
    </div>
  </div>
)}
```

### 参考実装（App.tsx:499-509 - Spec選択時のヘッダー表示）
```tsx
{specDetail && specDetail.specJson && (
  <div className="ml-4 flex items-center gap-2">
    <span className="text-gray-400">/</span>
    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
      {specDetail.metadata.name}
    </span>
    <span className="text-sm text-gray-500">
      {specDetail.specJson.feature_name || ''}
    </span>
  </div>
)}
```

## Proposed Solution

### Option 1: シンプルな移動（推奨）
- BugList.tsxの77-87行目のラベルエリアを削除
- App.tsxのヘッダー部分（specDetailの表示後）にselectedBug表示を追加
- BugActionButtonsはBugWorkflowViewまたはヘッダーに移動

**Pros**:
- Specと統一されたUI
- リスト表示領域が広がる
- 実装がシンプル

**Cons**:
- アクションボタンの配置検討が必要

### Recommended Approach
**Option 1** を採用。変更箇所は2ファイル：
1. `BugList.tsx` - ラベルエリア削除（77-87行目）
2. `App.tsx` - ヘッダーにselectedBug表示追加（specDetail表示の後）

## Dependencies
- `useBugStore` の `selectedBug` 状態（既にApp.tsxでimport済み）
- BugActionButtonsの配置先検討（別タスクとして分離可能）

## Testing Strategy
- Bugsタブでバグを選択し、ヘッダーにバグ名が表示されることを確認
- バグ選択時にリスト上部のラベルエリアが表示されないことを確認
- Specタブとの表示統一性を確認
