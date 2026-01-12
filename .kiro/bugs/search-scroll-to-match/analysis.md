# Bug Analysis: search-scroll-to-match

## Summary

検索機能の2つの不具合：(1) 検索マッチ位置への自動スクロールが未実装、(2) タブ/ファイル切り替え時に検索状態がクリアされない。

## Root Cause

### Issue 1: スクロール処理の欠如

`navigateNext`/`navigatePrev`関数は`activeMatchIndex`を更新するだけで、対応するDOM要素へのスクロール処理が実装されていない。

### Technical Details

- **Location**: `electron-sdd-manager/src/renderer/stores/editorStore.ts:199-215`
- **Component**: editorStore (`navigateNext`, `navigatePrev`)
- **Trigger**: 検索後に次へ/前へボタン押下、またはEnter/Shift+Enter

```typescript
// 現在の実装 - インデックス更新のみ
navigateNext: () => {
  const { matches, activeMatchIndex } = get();
  if (matches.length === 0) return;
  const nextIndex = (activeMatchIndex + 1) % matches.length;
  set({ activeMatchIndex: nextIndex });  // スクロール処理がない
}
```

**設計書の要件**（design.md:111-113）:
```
    EditorStore->>HighlightLayer: アクティブマッチ更新
    HighlightLayer->>HighlightLayer: スクロール位置調整
```

**仕様書の要件**（requirements.md Requirement 3.1）:
> When ユーザーが「次へ」ボタンをクリックまたはEnterキーを押下した場合, the ArtifactEditor shall **次のマッチ箇所にスクロールし**、現在位置を更新する

### Issue 2: タブ切り替え時の検索状態残留

`loadArtifact`と`handleTabChange`で検索状態のクリア処理がない。

- **Location**: `electron-sdd-manager/src/renderer/stores/editorStore.ts:131-156`
- **Component**: editorStore (`loadArtifact`)
- **Trigger**: タブ切り替え、ファイル選択変更

```typescript
// loadArtifactでは検索状態をクリアしていない
loadArtifact: async (specPath: string, artifact: ArtifactType) => {
  set({
    activeTab: artifact,
    currentPath: artifactPath,
    error: null,
  });
  // clearSearch() が呼ばれていない
}
```

## Impact Assessment

- **Severity**: Medium
- **Scope**: ArtifactEditor内の検索機能全体
- **Risk**: UX劣化（大規模ドキュメントで検索結果を目視確認できない）

## Related Code

| File | Role |
|------|------|
| `editorStore.ts:199-215` | `navigateNext`/`navigatePrev` - スクロール未実装 |
| `editorStore.ts:131-156` | `loadArtifact` - 検索クリア未実装 |
| `ArtifactEditor.tsx:164-172` | `handleTabChange` - 検索クリア未呼出 |
| `SearchHighlightLayer.tsx` | activeMatchIndex変更時のスクロール未実装 |

## Proposed Solution

### Option 1: useEffect + scrollIntoView（推奨）

SearchHighlightLayerまたはArtifactEditorで、`activeMatchIndex`変更時にアクティブマッチ要素へスクロールする。

```typescript
// ArtifactEditor.tsx or SearchHighlightLayer.tsx
useEffect(() => {
  if (activeMatchIndex >= 0 && matches.length > 0) {
    const activeElement = document.querySelector('[data-testid="highlight-active"]');
    activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [activeMatchIndex, matches]);
```

- Pros: 最小限の変更、既存構造を維持
- Cons: DOM操作が必要

### Option 2: textareaへの直接スクロール

MDEditorのtextareaを取得し、`match.start`位置に基づいてscrollTopを計算。

- Pros: より精密な位置制御
- Cons: MDEditorの内部構造への依存

### Recommended Approach

**Option 1**を推奨。以下の修正を行う：

1. **スクロール処理追加**: `SearchHighlightLayer`または`ArtifactEditor`に`useEffect`でスクロール処理を追加
2. **検索状態クリア**: `loadArtifact`で`clearSearch()`を呼び出し、タブ切り替え時に検索を閉じる

## Dependencies

- `SearchHighlightLayer.tsx`: activeマッチ要素への`scrollIntoView`追加
- `PreviewHighlightLayer.tsx`: プレビューモードでも同様のスクロール対応
- `editorStore.ts`: `loadArtifact`に`clearSearch()`呼び出し追加

## Testing Strategy

1. **Unit Test**: `navigateNext`/`navigatePrev`後にスクロール関数が呼ばれることを確認
2. **Integration Test**: 検索→ナビゲーション→スクロール位置変更の検証
3. **E2E Test**:
   - 大規模ドキュメントで検索→次へ→マッチが画面内に表示される
   - タブ切り替え→検索バーが閉じる（または検索がクリアされる）
