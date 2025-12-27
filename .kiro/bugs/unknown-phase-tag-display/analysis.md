# Bug Analysis: unknown-phase-tag-display

## Summary
Spec一覧のフェーズバッジ表示において、定義済みのphase値（`initialized`, `requirements-generated`等）以外の値が設定されている場合、ラベルとスタイルがundefinedになり何も表示されない。

## Root Cause
`PHASE_LABELS`および`PHASE_COLORS`の`Record<SpecPhase, string>`型定義が固定のphase値のみに対応しており、未知のphase値に対するフォールバック処理が存在しない。

### Technical Details
- **Location**: [SpecList.tsx:196-201](electron-sdd-manager/src/renderer/components/SpecList.tsx#L196-L201)
- **Component**: SpecListItem（Renderer）
- **Trigger**: spec.jsonに`"phase": "inspection"`など未定義のphase値が設定されている場合

## Impact Assessment
- **Severity**: Low
- **Scope**: Spec一覧画面のフェーズ表示のみ
- **Risk**: 表示上の問題のみで機能への影響なし

## Related Code
```tsx
// SpecList.tsx:196-201
<span
  className={clsx(
    'px-2 py-0.5 text-xs rounded-full',
    PHASE_COLORS[spec.phase]  // undefined if unknown phase
  )}
>
  {PHASE_LABELS[spec.phase]}  // undefined if unknown phase
</span>
```

## Proposed Solution
未知のphase値の場合、そのままphase値を表示し、デフォルトのスタイルを適用する。

### Option 1: Nullish Coalescing（推奨）
- Description: `??`演算子でフォールバック値を設定
- Pros: シンプル、型安全、既存コードへの影響最小
- Cons: なし

```tsx
<span
  className={clsx(
    'px-2 py-0.5 text-xs rounded-full',
    PHASE_COLORS[spec.phase] ?? 'bg-gray-200 text-gray-700'
  )}
>
  {PHASE_LABELS[spec.phase] ?? spec.phase}
</span>
```

### Recommended Approach
Option 1を採用。未知のphaseはそのまま表示し、`initialized`と同じグレー系スタイルを適用。

## Dependencies
- Remote UI版の`components.js`も同様の修正が必要（268-269行目）

## Testing Strategy
1. spec.jsonに未知のphase値（例: `"inspection"`）を設定
2. Spec一覧画面でそのphase値がそのまま表示されることを確認
3. 既存の正規phase値が従来通り日本語ラベルで表示されることを確認
