# Bug Fix: inspection-state-sync

## Summary
古い`InspectionState`型を削除し、`MultiRoundInspectionState`に統一。Inspection完了後のUIが正しく更新されるようになった。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `src/renderer/types/index.ts` | `InspectionState`を削除、`SpecJson.inspection`の型を`MultiRoundInspectionState`に変更 |
| `src/renderer/types/workflow.ts` | `getPhaseStatus('inspection')`を新構造対応に修正 |
| `src/renderer/types/inspection.ts` | `getLatestInspectionReportFile()`ヘルパー関数を追加 |
| `src/renderer/components/SpecPane.tsx` | inspection tabs生成ロジックを新構造対応に修正 |
| `src/renderer/stores/specStore.ts` | inspection artifact読み込みロジックを新構造対応に修正 |
| `.claude/agents/kiro/spec-inspection.md` | spec.json更新ロジックを`MultiRoundInspectionState`構造に修正 |
| `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md` | テンプレートを同期 |
| `src/renderer/types/workflow.test.ts` | テストを新構造対応に更新 |
| `src/renderer/stores/specStore.test.ts` | テストを新構造対応に更新 |

### Code Changes

#### types/index.ts - InspectionState削除
```diff
-/** Inspection state for spec-inspection feature */
-export interface InspectionState {
-  passed: boolean;
-  inspected_at: string;
-  report_file: string;
-}
+// Note: Legacy InspectionState (passed, inspected_at, report_file) has been removed.
+// Use MultiRoundInspectionState from './inspection' instead.
+import type { MultiRoundInspectionState } from './inspection';
```

```diff
-  /** Inspection state (optional for backward compatibility) */
-  inspection?: InspectionState;
+  /** Inspection state - uses MultiRoundInspectionState for multi-round inspection support */
+  inspection?: MultiRoundInspectionState;
```

#### types/workflow.ts - getPhaseStatus修正
```diff
-  // 検査フェーズ
-  if (phase === 'inspection') {
-    return specJson.inspection?.passed ? 'approved' : 'pending';
-  }
+  // 検査フェーズ - MultiRoundInspectionState構造をサポート
+  if (phase === 'inspection') {
+    const inspection = specJson.inspection;
+    if (!inspection) return 'pending';
+
+    // Check new structure: status === 'completed' with GO result
+    if (inspection.status === 'completed') {
+      const roundDetails = inspection.roundDetails;
+      if (roundDetails && roundDetails.length > 0) {
+        const latestRound = roundDetails[roundDetails.length - 1];
+        if (latestRound.passed === true) {
+          return 'approved';
+        }
+      }
+    }
+
+    return 'pending';
+  }
```

#### types/inspection.ts - ヘルパー関数追加
```typescript
/**
 * Get the latest inspection report file name from inspection state
 * Report files follow the pattern: inspection-{roundNumber}.md
 */
export function getLatestInspectionReportFile(
  state: MultiRoundInspectionState | null | undefined
): string | null {
  const latestRound = getLatestRoundDetail(state);
  if (!latestRound) {
    return null;
  }
  return `inspection-${latestRound.roundNumber}.md`;
}
```

#### spec-inspection-agent - spec.json更新ロジック
```diff
-{
-  "inspection": {
-    "passed": true,
-    "inspected_at": "2025-12-25T12:00:00Z",
-    "report_file": "inspection-{n}.md"
-  }
-}
+{
+  "inspection": {
+    "status": "completed",
+    "rounds": 1,
+    "currentRound": null,
+    "roundDetails": [
+      {
+        "roundNumber": 1,
+        "passed": true,
+        "completedAt": "2025-12-25T12:00:00Z"
+      }
+    ]
+  }
+}
```

## Implementation Notes

- `MultiRoundInspectionState`構造に統一することで、型定義の重複を解消
- `roundDetails`配列から最新のラウンド情報を取得する仕組みに変更
- `getLatestInspectionReportFile()`ヘルパーを追加し、レポートファイル名の取得を抽象化
- `remote-ui/components.js`の既存実装（新旧両対応）を参考に実装

## Breaking Changes
- [x] Breaking changes (documented below)

**破壊的変更**:
- `SpecJson.inspection`の型が`InspectionState`から`MultiRoundInspectionState`に変更
- 既存の`inspection.passed`、`inspection.report_file`フィールドは使用不可
- spec-inspection-agentが生成するspec.jsonの構造が変更

**移行方法**:
既存のspec.jsonは、次回のinspection実行時に新構造に自動更新される。

## Rollback Plan
1. Gitで変更をrevert
2. 古い`InspectionState`型を復元
3. `getPhaseStatus()`を古いロジックに戻す
4. spec-inspection-agentのテンプレートを古い構造に戻す

## Related Commits
- *To be added after commit*

## Test Results
- `workflow.test.ts`: 33 passed
- `inspection.test.ts`: 43 passed
- `specStore.test.ts`: 58 passed
