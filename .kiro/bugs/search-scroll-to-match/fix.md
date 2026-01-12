# Bug Fix: search-scroll-to-match

## Summary

検索マッチ位置への自動スクロール機能を追加し、タブ切り替え時に検索状態をクリアするよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/SearchHighlightLayer.tsx` | activeMatchIndex変更時のスクロール処理を追加 |
| `electron-sdd-manager/src/renderer/components/PreviewHighlightLayer.tsx` | プレビューモードでのスクロール処理を追加 |
| `electron-sdd-manager/src/renderer/stores/editorStore.ts` | loadArtifactで異なるファイルへの切り替え時に検索状態をクリア |

### Code Changes

#### SearchHighlightLayer.tsx
```diff
- import { useMemo } from 'react';
+ import { useMemo, useEffect, useRef } from 'react';

+ // Track the previous activeIndex to detect navigation
+ const prevActiveIndexRef = useRef(activeIndex);
+
+ // Scroll to active match when activeMatchIndex changes
+ useEffect(() => {
+   // Only scroll when activeIndex actually changes (navigation)
+   if (activeIndex >= 0 && matches.length > 0 && prevActiveIndexRef.current !== activeIndex) {
+     const activeElement = document.querySelector('[data-testid="highlight-active"]');
+     if (activeElement && typeof activeElement.scrollIntoView === 'function') {
+       activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
+     }
+   }
+   prevActiveIndexRef.current = activeIndex;
+ }, [activeIndex, matches.length]);
```

#### PreviewHighlightLayer.tsx
```diff
- import { useEffect, useMemo, RefObject } from 'react';
+ import { useEffect, useMemo, useRef, RefObject } from 'react';

+ // Track the previous activeIndex to detect navigation
+ const prevActiveIndexRef = useRef(activeIndex);

  if (activeRange) {
    const activeHighlight = new Highlight(activeRange);
    CSS.highlights.set('active-match', activeHighlight);
+
+   // Scroll to active match when activeIndex changes (navigation)
+   if (prevActiveIndexRef.current !== activeIndex) {
+     // Create a temporary element to get the position and scroll
+     const rangeRect = activeRange.getBoundingClientRect();
+     const containerRect = container.getBoundingClientRect();
+
+     // Calculate if the match is outside the visible area
+     const isAbove = rangeRect.top < containerRect.top;
+     const isBelow = rangeRect.bottom > containerRect.bottom;
+
+     if (isAbove || isBelow) {
+       // Scroll the range into view
+       const selection = window.getSelection();
+       if (selection) {
+         selection.removeAllRanges();
+         selection.addRange(activeRange.cloneRange());
+         const anchorNode = selection.anchorNode;
+         if (anchorNode?.parentElement) {
+           anchorNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
+         }
+         selection.removeAllRanges();
+       }
+     }
+   }
+   prevActiveIndexRef.current = activeIndex;
  }
```

#### editorStore.ts
```diff
  loadArtifact: async (specPath: string, artifact: ArtifactType) => {
    const artifactPath = `${specPath}/${artifact}.md`;

+   // Check if switching to a different file (not initial load or same file)
+   const { currentPath } = get();
+   const isNewFile = currentPath !== null && currentPath !== artifactPath;
+
+   // Clear search state when switching to a different file
+   if (isNewFile) {
      set({
        activeTab: artifact,
        currentPath: artifactPath,
        error: null,
+       // Clear search state
+       searchVisible: false,
+       searchQuery: '',
+       caseSensitive: false,
+       matches: [],
+       activeMatchIndex: -1,
      });
+   } else {
+     set({
+       activeTab: artifact,
+       currentPath: artifactPath,
+       error: null,
+     });
+   }
```

## Implementation Notes

1. **スクロール処理**: `activeMatchIndex`が変更されたときのみスクロールを実行（初回レンダリング時は実行しない）
2. **テスト環境対応**: `scrollIntoView`がモックされていない環境でもエラーにならないよう`typeof`チェックを追加
3. **検索状態クリア**: 同じファイルの再ロード時はクリアしない（既存テストとの互換性維持）

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan

以下のファイルを変更前の状態に戻す：
- `electron-sdd-manager/src/renderer/components/SearchHighlightLayer.tsx`
- `electron-sdd-manager/src/renderer/components/PreviewHighlightLayer.tsx`
- `electron-sdd-manager/src/renderer/stores/editorStore.ts`

## Related Commits
- *未コミット - fix.md作成後にコミット予定*
