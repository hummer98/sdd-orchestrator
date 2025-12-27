# Bug Fix: unknown-phase-tag-display

## Summary
未知のphase値の場合にフォールバック表示を追加し、phase値をそのまま表示するように修正

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/SpecList.tsx` | Nullish coalescingでフォールバック値を追加 |
| `electron-sdd-manager/src/main/remote-ui/components.js` | 未知phase用のフォールバック分岐を追加 |

### Code Changes

**SpecList.tsx (Electron Renderer)**
```diff
           <span
             className={clsx(
               'px-2 py-0.5 text-xs rounded-full',
-              PHASE_COLORS[spec.phase]
+              PHASE_COLORS[spec.phase] ?? 'bg-gray-200 text-gray-700'
             )}
           >
-            {PHASE_LABELS[spec.phase]}
+            {PHASE_LABELS[spec.phase] ?? spec.phase}
           </span>
```

**components.js (Remote UI)**
```diff
-    const config = phaseConfig[phase] || phaseConfig['initialized'];
-    return `<span class="px-2 py-0.5 text-xs rounded-full ${config.colorClass}">${config.label}</span>`;
+    const config = phaseConfig[phase];
+    if (config) {
+      return `<span class="px-2 py-0.5 text-xs rounded-full ${config.colorClass}">${config.label}</span>`;
+    }
+    // 未知のphaseはそのまま表示
+    return `<span class="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200">${phase}</span>`;
```

## Implementation Notes
- 未知のphase値はそのままの文字列で表示される（例: "inspection" → "inspection"）
- スタイルは`initialized`と同じグレー系を使用
- Remote UI版はダークモード対応のスタイルも含む

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. 上記のdiffを逆方向に適用

## Related Commits
- *コミット待ち*
