# Bug Analysis: remote-ui-spec-list-sort

## Summary
remote-ui版のSpec一覧がElectron版と異なるソート順（ファイルシステム順＝アルファベット順）で表示される問題。Electron版は最新更新順（updatedAt降順）でソートされている。

## Root Cause

### Technical Details
- **Location**: [components.js:149-152](electron-sdd-manager/src/main/remote-ui/components.js#L149-L152)
- **Component**: SpecList class
- **Trigger**: `update()`メソッドでspecs配列を受け取りそのままrenderしているため、ソートが行われていない

### データフローの比較

**Electron版**:
1. `fileService.readSpecs()` → specs配列をファイルシステム順で取得
2. `specStore.getSortedFilteredSpecs()` → `updatedAt`降順でソート（[specStore.ts:418-447](electron-sdd-manager/src/renderer/stores/specStore.ts#L418-L447)）
3. UI表示

**remote-ui版**:
1. `fileService.readSpecs()` → specs配列をファイルシステム順で取得
2. `webSocketHandler.sendInitMessage()` → specs配列をそのまま送信
3. `components.js SpecList.update()` → **ソートなしでそのまま表示**

## Impact Assessment
- **Severity**: Low
- **Scope**: remote-ui（モバイルリモートアクセス）利用時のみ
- **Risk**: 表示順が異なるだけで機能的な問題はない

## Related Code
```javascript
// components.js:SpecList.update() - ソートなし
update(specs) {
  this.specs = specs || [];
  this.render();
}

// specStore.ts:getSortedFilteredSpecs() - Electron版のソートロジック
const sorted = [...filtered].sort((a, b) => {
  let comparison = 0;
  switch (sortBy) {
    case 'name':
      comparison = a.name.localeCompare(b.name);
      break;
    case 'updatedAt':
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      break;
    case 'phase':
      comparison = a.phase.localeCompare(b.phase);
      break;
  }
  return sortOrder === 'asc' ? comparison : -comparison;
});
```

## Proposed Solution

### Option 1: クライアント側（remote-ui）でソート
- Description: `SpecList.update()`でspecs配列を`updatedAt`降順でソート
- Pros:
  - サーバー側変更不要
  - Electron版と同じソートロジックをクライアント側で実装
- Cons:
  - remote-uiにソートロジックの重複が発生

### Option 2: サーバー側でソート
- Description: `handlers.ts`の`getSpecsForRemote()`または`fileService.readSpecs()`でソートしてから返す
- Pros:
  - ソートロジックの一元化
- Cons:
  - 既存のElectron版の動作に影響する可能性
  - ソート順の柔軟性が失われる

### Recommended Approach
**Option 1: クライアント側でソート**

理由:
- Electron版はクライアント側（specStore）でソートしており、同じアーキテクチャに合わせる
- remote-uiは独立したWebクライアントとして動作するため、ソートロジックを持つのは妥当
- 最小限の変更で対応可能

## Dependencies
- なし（変更は`components.js`のみ）

## Testing Strategy
1. remote-uiでSpecs一覧を確認し、最新更新順（updatedAt降順）で表示されることを確認
2. specを更新後、一覧で順序が変わることを確認
3. Electron版の表示順と一致することを確認
