# Bug Analysis: document-review-panel-update-issues

## Summary

ドキュメントレビューファイル（`document-review-*.md`）がAgent実行中に作成されても、UIがリアルタイムで正しく更新されない2つの問題が発生している。

## Root Cause

### 問題1: メインパネルに「Review-undefined」タブが表示される

**Location**: [SpecPane.tsx:68-71](electron-sdd-manager/src/renderer/components/SpecPane.tsx#L68-L71)

```typescript
for (const detail of sortedDetails) {
  const n = detail.roundNumber;
  tabs.push({
    key: `document-review-${n}` as ArtifactType,
    label: `Review-${n}`,
  });
```

**Trigger**: ファイル監視イベントで`updateSpecJson()`が呼ばれた際、`spec.json`の`documentReview.roundDetails`が正しく更新されていないため、`roundNumber`が`undefined`になる。

### 問題2: ラウンドカウントが0のまま

**Location**: [DocumentReviewPanel.tsx:178](electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx#L178)

```typescript
const rounds = reviewState?.rounds ?? 0;
```

**Trigger**: `documentReview.rounds`フィールドがファイル監視時に同期されていない。

### Technical Details

- **Location**: [specStore.ts:417-421](electron-sdd-manager/src/renderer/stores/specStore.ts#L417-L421)
- **Component**: specStore.startWatching() → updateSpecJson()
- **Trigger**: `document-review-*.md` ファイルがファイル監視で検出されると `updateSpecJson()` が呼ばれるが、このメソッドは `syncDocumentReview()` を呼び出さない

### 同期ロジックの分散問題

現在、`selectSpec()`に同期ロジックが集中しており、ファイル監視ハンドラから再利用できない：

| 同期処理 | selectSpec() | updateSpecJson() | updateArtifact() |
|----------|:------------:|:----------------:|:----------------:|
| documentReview同期 | ✅ | ❌ | - |
| inspection artifact読み込み | ✅ | ✅ (部分的) | - |
| タスク進捗計算 | ✅ | - | ✅ |
| phase自動修正 | ✅ | - | ❌ |
| autoExecution同期 | ✅ | ✅ | - |

## Impact Assessment

- **Severity**: Medium
- **Scope**: ドキュメントレビュー・インスペクションワークフロー使用時のUI表示の不整合
- **Risk**: ユーザー体験の悪化（不正なタブ名表示、進捗カウント不正）。機能自体は動作するが、UIが正しく反映されない。

## Related Code

### ファイル監視でのdocument-review検出
```typescript
// specStore.ts:417-421
} else if (fileName.startsWith('document-review-') || fileName.startsWith('inspection-')) {
  console.log('[specStore] Document review/inspection file changed, updating spec.json:', fileName);
  get().updateSpecJson();
}
```

### 現在のselectSpec内の同期処理（分離されていない）
```typescript
// specStore.ts:282-294
// Auto-sync documentReview field with file system state
try {
  const wasModified = await window.electronAPI.syncDocumentReview(spec.path);
  if (wasModified) {
    const updatedSpecJson = await window.electronAPI.readSpecJson(spec.path);
    Object.assign(specJson, updatedSpecJson);
  }
} catch (error) {
  console.error('[specStore] Failed to sync documentReview:', error);
}
```

## Proposed Solution

### 同期処理を個別メソッドに分離

同期処理を独立したメソッドに分離し、`selectSpec()`とファイル監視ハンドラの両方から必要なものだけを呼び出す：

```typescript
// 新規メソッド追加
syncDocumentReviewState: async () => {
  const { selectedSpec, specDetail } = get();
  if (!selectedSpec || !specDetail) return;

  const wasModified = await window.electronAPI.syncDocumentReview(selectedSpec.path);
  if (wasModified) {
    const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);
    set({
      specDetail: { ...specDetail, specJson },
    });
  }
},

syncInspectionState: async () => {
  // inspection artifact の読み込みと specDetail 更新
},

syncTaskProgress: async () => {
  // タスク進捗計算とphase自動修正
},
```

### ファイル監視ハンドラの更新

```typescript
// specStore.ts onSpecsChanged内
if (fileName.startsWith('document-review-')) {
  await get().syncDocumentReviewState();
} else if (fileName.startsWith('inspection-')) {
  await get().syncInspectionState();
} else if (fileName === 'tasks.md') {
  await get().updateArtifact('tasks');
  await get().syncTaskProgress();
}
```

### selectSpec()のリファクタリング

```typescript
selectSpec: async (spec, options) => {
  // ... 基本的な読み込み処理 ...

  // 同期処理を個別メソッド経由で呼び出し
  await get().syncDocumentReviewState();
  await get().syncInspectionState();
  await get().syncTaskProgress();

  // ... 残りの処理 ...
}
```

### メリット

- **関心の分離**: 各同期処理が独立したメソッドになり、責務が明確
- **パフォーマンス**: ファイル監視時は必要な同期処理のみ実行
- **テスト容易性**: 各メソッドを個別にテスト可能
- **DRY**: 同じロジックを複数箇所に書かない
- **拡張性**: 新しい同期処理の追加が容易

## Dependencies

- `documentReviewService.syncReviewState()` - ファイルシステムからrounds/roundDetailsを検出
- `window.electronAPI.syncDocumentReview()` - IPC経由でsyncReviewStateを呼び出す
- `specStore` - 新規メソッド追加

## Testing Strategy

1. **ユニットテスト**:
   - 各sync*メソッドが正しくspecDetailを更新することを確認
   - ファイル監視ハンドラが適切なsyncメソッドを呼び出すことを確認

2. **E2Eテスト**:
   - document-review agentを実行し、`document-review-1.md`が作成された時点でタブが正しい名前で表示されることを確認
   - ラウンドカウントがリアルタイムで更新されることを確認

3. **手動テスト**:
   - Electronアプリを起動し、document-reviewワークフローを実行
   - ファイル作成時にUIがリアルタイムで正しく更新されることを確認
