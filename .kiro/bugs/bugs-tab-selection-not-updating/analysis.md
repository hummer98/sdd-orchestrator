# Bug Analysis: bugs-tab-selection-not-updating

## Summary
SpecタブでSpecを選択した後にBugsタブに移動してBugを選択しても、App.tsxの条件分岐において`selectedSpec`が優先されるため、Bug表示に切り替わらない。

## Root Cause
**独立した選択状態管理と条件分岐の優先順位問題**

`specStore`の`selectedSpec`と`bugStore`の`selectedBug`は独立して管理されているが、App.tsxの表示切り替えロジックでは`selectedSpec`が常に優先される。タブ切り替え時に相互排他的なクリア処理が行われていない。

### Technical Details
- **Location**:
  - [DocsTabs.tsx:72](electron-sdd-manager/src/renderer/components/DocsTabs.tsx#L72) - タブ切り替え時にストアのクリアを呼んでいない
  - [App.tsx:589-644](electron-sdd-manager/src/renderer/App.tsx#L589-L644) - 条件分岐で`selectedSpec`が優先
- **Component**: DocsTabs, App (メインパネル切り替えロジック)
- **Trigger**: SpecタブでSpecを選択した後、Bugsタブに切り替えてBugを選択

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bugsタブの全機能に影響（Bugを選択しても表示されない）
- **Risk**: 修正は低リスク。既存のclearSelectedSpec/clearSelectedBug関数を適切な箇所で呼び出すだけ

## Related Code
### App.tsx L589-617 (表示切り替えロジック)
```tsx
{selectedSpec ? (
  /* Spec選択時: ArtifactEditor + WorkflowView */
  <div className="flex-1 flex overflow-hidden">
    ...
  </div>
) : selectedBug ? (
  /* Bug選択時: BugArtifactEditor + BugWorkflowView */
  <div className="flex-1 flex overflow-hidden">
    ...
  </div>
) : (
  /* 未選択時: プレースホルダー */
  ...
)}
```

### DocsTabs.tsx L72 (タブ切り替えハンドラ)
```tsx
onClick={() => setActiveTab(config.id)}
```
現状、`setActiveTab`のみを呼び出しており、選択状態のクリアを行っていない。

## Proposed Solution

### Option 1: タブ切り替え時に相互排他的クリア (推奨)
- **Description**: DocsTabs.tsxでタブ切り替え時に、切り替え先と反対のストアの選択をクリアする
- **Pros**:
  - 最小限の変更
  - 明確なタブ切り替え時の動作
  - 既存のclearSelectedSpec/clearSelectedBugを活用
- **Cons**:
  - タブを戻したときに以前の選択が失われる（しかし期待される動作）

### Option 2: App.tsxの条件分岐を変更
- **Description**: activeTab状態をDocsTabs外に持ち上げ、App.tsxの条件分岐をactiveTabベースにする
- **Pros**:
  - 選択状態を保持したままタブ切り替えが可能
- **Cons**:
  - 大きなリファクタリングが必要
  - 状態管理が複雑化

### Recommended Approach
**Option 1: タブ切り替え時に相互排他的クリア**

DocsTabs.tsxで`setActiveTab`呼び出し時に、切り替え先に応じて`clearSelectedSpec()`または`clearSelectedBug()`を呼び出す。

```tsx
const handleTabChange = (tabId: DocsTab) => {
  if (tabId === 'specs') {
    useBugStore.getState().clearSelectedBug();
  } else {
    useSpecStore.getState().clearSelectedSpec();
  }
  setActiveTab(tabId);
};
```

## Dependencies
- `useSpecStore.clearSelectedSpec` (既存)
- `useBugStore.clearSelectedBug` (既存)

## Testing Strategy
1. Specタブで任意のSpecを選択 → メインパネルにSpec表示を確認
2. Bugsタブをクリック → メインパネルが空表示（未選択状態）になることを確認
3. Bugを選択 → メインパネルにBug表示を確認
4. Specsタブをクリック → メインパネルが空表示になることを確認
5. 既存のE2Eテスト(`bugs-pane-integration.e2e.spec.ts`)の確認・更新
