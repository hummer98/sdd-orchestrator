# Bug Analysis: header-duplicate-spec-name

## Summary
アプリケーションヘッダーのSpec表示部分で、`metadata.name`と`specJson.feature_name`が両方表示されているが、これらは常に同一値であり冗長。

## Root Cause
ヘッダー表示ロジックで2つのフィールドを別々に表示しているが、値の出所が同一のため二重表示となる。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/App.tsx:492-501`
- **Component**: App.tsx ヘッダー部分
- **Trigger**: Specが選択された状態でヘッダーを表示

### 値の由来
| フィールド | 設定箇所 | 値の出所 |
|-----------|---------|---------|
| `specDetail.metadata.name` | `fileService.ts:136` | specディレクトリ名 (`entry.name`) |
| `specDetail.specJson.feature_name` | `fileService.ts:330` | spec.json作成時にディレクトリ名と同一値を設定 |

## Impact Assessment
- **Severity**: Low
- **Scope**: UIの表示のみ。機能的な問題なし
- **Risk**: 修正による副作用は極めて低い

## Related Code
```tsx
{/* Spec title in header */}
{specDetail && specDetail.specJson && (
  <div className="ml-4 flex items-center gap-2">
    <span className="text-gray-400">/</span>
    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
      {specDetail.metadata.name}           // ← 不要（feature_nameと同一）
    </span>
    <span className="text-sm text-gray-500">
      {specDetail.specJson.feature_name || ''}  // ← こちらのみ残す
    </span>
  </div>
)}
```

## Proposed Solution

### Option 1: metadata.nameの表示を削除
- Description: `metadata.name`の表示を削除し、`feature_name`のみ表示
- Pros: シンプル、DRY原則に従う
- Cons: なし

### Recommended Approach
Option 1を採用。`feature_name`のスタイルを調整して見やすくする。

修正後:
```tsx
{specDetail && specDetail.specJson && (
  <div className="ml-4 flex items-center gap-2">
    <span className="text-gray-400">/</span>
    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
      {specDetail.specJson.feature_name || specDetail.metadata.name}
    </span>
  </div>
)}
```

## Dependencies
- なし（単一ファイルの修正のみ）

## Testing Strategy
1. Specを選択してヘッダー表示を確認
2. 異なるSpecを切り替えて表示が正しく更新されることを確認
3. Specが未選択の状態でヘッダーにspec情報が表示されないことを確認
