# Bug Analysis: spec-list-loading-on-item-click

## Summary
SpecListItemクリック時に`specDetailStore.isLoading`が`true`になると、`specStoreFacade`の`isLoading`統合ロジックにより、SpecList全体がローディング状態（スピナー表示）になる。

## Root Cause

### Technical Details
- **Location**: [specStoreFacade.ts:55](electron-sdd-manager/src/renderer/stores/spec/specStoreFacade.ts#L55)
- **Component**: specStoreFacade / SpecList
- **Trigger**: SpecListItemクリック → `selectSpec()` 実行

### 問題のコード

**specStoreFacade.ts:55**:
```typescript
isLoading: listState.isLoading || detailState.isLoading,
```

この行で`listStore`のローディング状態と`detailStore`のローディング状態が**区別なく統合**されている。

**specDetailStore.ts:32**:
```typescript
if (!silent) {
  set({ selectedSpec: spec, isLoading: true, error: null });
}
```

`selectSpec()`実行時に`isLoading: true`がセットされる。

**SpecList.tsx:96-99**:
```typescript
{isLoading ? (
  <div className="flex items-center justify-center h-32">
    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
  </div>
) : (
```

統合された`isLoading`がSpecList全体の表示/非表示を制御。

### 発生フロー
```
SpecListItem.onClick()
  → selectSpec() [specStoreFacade:186]
  → selectSpec() [specDetailStore:28]
  → set({ isLoading: true }) [specDetailStore:32]
  → subscribe() トリガー [specStoreFacade:328]
  → getAggregatedState() [specStoreFacade:38]
  → isLoading = false || true = true [specStoreFacade:55]
  → SpecList再レンダリング
  → リスト全体がスピナーに置換
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: すべてのSpecListItem操作に影響
- **Risk**: UXの低下（リストが一時的に消えて見える）

## Related Code
| ファイル | 行番号 | 役割 |
|---------|-------|------|
| specStoreFacade.ts | 55 | isLoading統合 |
| specDetailStore.ts | 32 | isLoading設定 |
| SpecList.tsx | 96-99 | ローディング表示分岐 |

## Proposed Solution

### Option 1: isLoadingを分離する（推奨）
- **Description**: `isLoading`を`isListLoading`と`isDetailLoading`に分離し、SpecListは`isListLoading`のみを参照する
- **Pros**:
  - 各コンポーネントが必要なローディング状態のみを購読できる
  - 影響範囲が明確
- **Cons**:
  - 既存コードの変更箇所が複数（型定義、store、コンポーネント）

### Option 2: SpecListでisLoadingを使わない
- **Description**: SpecListコンポーネントで`isLoading`の代わりに`specs.length === 0 && !error`で空状態を判定
- **Pros**: 最小限の変更で済む
- **Cons**: ローディング状態を完全に失う（初回読み込み時もスピナーなし）

### Recommended Approach
**Option 1**を推奨。理由：
1. 意図が明確（リスト読み込み vs 詳細読み込み）
2. 将来の拡張性が高い
3. DRY/SSOTの原則に沿った設計

## Dependencies
- `electron-sdd-manager/src/renderer/stores/spec/types.ts` - 型定義の変更
- `electron-sdd-manager/src/renderer/stores/spec/specStoreFacade.ts` - 統合ロジック変更
- `electron-sdd-manager/src/renderer/stores/spec/specListStore.ts` - isListLoading追加
- `electron-sdd-manager/src/renderer/components/SpecList.tsx` - 参照変更

## Testing Strategy
1. SpecListItemクリック時にリスト全体がスピナーにならないことを確認
2. プロジェクト選択時（リスト初回読み込み）はスピナーが表示されることを確認
3. 詳細パネルでは引き続きローディング表示が機能することを確認
