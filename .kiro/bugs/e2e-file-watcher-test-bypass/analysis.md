# Bug Analysis: e2e-file-watcher-test-bypass

## Summary
既存のE2Eテストでは`refreshSpecStore()`による手動リフレッシュを使用しており、ファイル監視（`onSpecsChanged`）経由の自動UI更新が検証されていなかった。

**調査結果**: 新たに作成したファイル監視専用E2Eテストを実行した結果、**ファイル監視は正常に動作している**ことが確認された。

## Root Cause

### 元の問題（E2Eテストの回避）
既存の`simple-auto-execution.e2e.spec.ts`では、ファイル監視によるUI更新を待つ代わりに`refreshSpecStore()`を複数回呼び出していた：

```typescript
// simple-auto-execution.e2e.spec.ts:731-736
for (let i = 0; i < 5; i++) {
  await browser.pause(500);
  await refreshSpecStore();  // ← 手動リフレッシュで回避
}
```

### 技術的詳細
- **Location**: `electron-sdd-manager/e2e-wdio/simple-auto-execution.e2e.spec.ts:731-736`
- **Component**: E2Eテスト
- **Trigger**: テストの信頼性を上げるために手動リフレッシュを追加した結果、ファイル監視の検証が回避された

### ファイル監視の動作確認
新規作成した`file-watcher-ui-update.e2e.spec.ts`で検証：
- ✅ `requirements.md`更新 → UI自動更新（約1秒で反映）
- ✅ `spec.json`更新 → UI自動更新（約1秒で反映）

ファイル監視フロー：
```
ファイル変更
  → chokidar検知 (awaitWriteFinish: 200ms)
  → デバウンス (300ms)
  → IPC: SPECS_CHANGED
  → specStore.onSpecsChanged()
  → updateArtifact() / updateSpecJson()
  → UI更新
```

## Impact Assessment
- **Severity**: Low（機能自体は正常に動作）
- **Scope**: E2Eテストのカバレッジ
- **Risk**: ファイル監視に関するリグレッションが見逃される可能性

## Related Code

### ファイル監視の実装
```typescript
// specStore.ts:396-431
watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
  const { selectedSpec } = get();
  const isSelectedSpecChanged = selectedSpec && event.specId === selectedSpec.name;

  if (isSelectedSpecChanged && event.path) {
    const fileName = event.path.split('/').pop() || '';
    if (fileName === 'requirements.md') {
      get().updateArtifact('requirements');
    }
    // ...
  }
});
```

### 新規作成したテスト
`electron-sdd-manager/e2e-wdio/file-watcher-ui-update.e2e.spec.ts`

## Proposed Solution

### Option 1: 新規テストファイルを追加（実施済み）
- Description: ファイル監視専用のE2Eテストを別ファイルとして追加
- Pros: 既存テストに影響なし、明確な責務分離
- Cons: テストファイルが増える

### Option 2: 既存テストから`refreshSpecStore()`を削除
- Description: 手動リフレッシュを削除し、ファイル監視に依存
- Pros: より実際のユーザーシナリオに近い
- Cons: テストが不安定になる可能性（タイミング依存）

### Recommended Approach
**Option 1を採用**。新規テストファイル`file-watcher-ui-update.e2e.spec.ts`を追加済み。
既存テストは安定性のために`refreshSpecStore()`を維持し、新規テストでファイル監視を専門的に検証する。

## Dependencies
- `electron-sdd-manager/src/main/services/specsWatcherService.ts`
- `electron-sdd-manager/src/renderer/stores/specStore.ts`
- `electron-sdd-manager/src/preload/index.ts`

## Testing Strategy
1. ✅ 新規E2Eテスト実行：`npx wdio run wdio.conf.ts --spec e2e-wdio/file-watcher-ui-update.e2e.spec.ts`
2. 結果：3テスト全てパス
   - `should have file watcher active after project selection`
   - `should update requirements.md content in UI when file changes without manual refresh`
   - `should update spec.json phase in UI when file changes without manual refresh`

## 追加調査事項（解決済み）

### 真の根本原因を発見

ユーザーが報告した「新規spec作成後にrequirements.mdが更新されない」問題の**真の根本原因**を特定した：

**問題**: ファイル監視は`specStore.specDetail.artifacts`を更新するが、**UIが表示しているのは`editorStore.content`**である。これら2つのストアは同期されていなかった。

```
ファイル変更
  → specStore.updateArtifact() → specDetail.artifacts 更新 ✅
  → editorStore.content 更新されない ❌ ← これが問題
```

### 修正内容

`electron-sdd-manager/src/renderer/stores/specStore.ts` の `updateArtifact()` 関数に、`editorStore` 同期処理を追加：

```typescript
// Bug fix: e2e-file-watcher-test-bypass
// Sync editorStore when the active tab matches the updated artifact
try {
  const { useEditorStore } = await import('./editorStore');
  const editorState = useEditorStore.getState();
  if (editorState.activeTab === artifact && !editorState.isDirty) {
    // Only reload if editor is not dirty (user hasn't made changes)
    console.log('[specStore] Syncing editorStore with updated artifact:', artifact);
    await editorState.loadArtifact(selectedSpec.path, artifact);
  }
} catch (editorError) {
  console.error('[specStore] Failed to sync editorStore:', editorError);
}
```

### E2Eテストによる検証

`editorStore.content`の更新を検証する専用テストを追加し、**全テストがパス**：

```
✓ should have file watcher active after project selection
✓ should update requirements.md content in UI when file changes without manual refresh
✓ should update spec.json phase in UI when file changes without manual refresh
✓ should update editorStore.content when requirements.md changes
```

テスト結果ログ（修正後）：
```
[E2E] Final specStore requirements includes REQ-EDITOR-001: true
[E2E] Final editorStore content includes REQ-EDITOR-001: true
```

## Status: **修正完了**
