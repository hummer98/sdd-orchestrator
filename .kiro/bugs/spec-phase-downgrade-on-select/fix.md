# Bug Fix: spec-phase-downgrade-on-select

## Summary
SpecListItemクリック時に`inspection-complete`/`deploy-complete`フェーズが`implementation-complete`にダウングレードされる問題を修正。条件式を変更し、既に高度なフェーズにあるspecは自動修正をスキップするようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts` | 自動修正ロジックの条件式を修正 |

### Code Changes

```diff
        // Auto-fix spec.json phase if task completion doesn't match phase
+       // Bug fix: spec-phase-downgrade-on-select - don't downgrade advanced phases
        if (total > 0) {
          const currentPhase = specJson.phase;
          const isAllComplete = completed === total;
+         const advancedPhases = ['implementation-complete', 'inspection-complete', 'deploy-complete'];

-         if (isAllComplete && currentPhase !== 'implementation-complete') {
+         if (isAllComplete && !advancedPhases.includes(currentPhase)) {
            console.log('[specDetailStore] Auto-fixing phase to implementation-complete', { spec: spec.name, currentPhase });
            try {
              await window.electronAPI.syncSpecPhase(spec.path, 'impl-complete', { skipTimestamp: true });
              specJson.phase = 'implementation-complete';
            } catch (error) {
              console.error('[specDetailStore] Failed to auto-fix phase:', error);
            }
          }
        }
```

## Implementation Notes
- 変更は最小限（条件式の修正のみ）
- `advancedPhases`配列で「implementation-complete以上のフェーズ」を定義
- これらのフェーズでは自動修正をスキップし、ダウングレードを防止

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
条件式を元に戻す:
```typescript
if (isAllComplete && currentPhase !== 'implementation-complete')
```

## Related Commits
- *Pending verification and commit*
