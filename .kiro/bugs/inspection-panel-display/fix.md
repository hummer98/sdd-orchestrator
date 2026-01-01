# Bug Fix: inspection-panel-display

## Summary
旧形式のspec.json inspection構造（`status`, `date`, `report`フィールド）を新形式（`MultiRoundInspectionState`）に変換する後方互換性ロジックを追加し、メインパネルにインスペクションレポートが正しく表示されるようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/types/inspection.ts` | `LegacyInspectionState`型、`isLegacyInspectionState`型ガード、`convertLegacyToMultiRound`変換関数、`normalizeInspectionState`正規化関数を追加。`getLatestInspectionReportFile`を旧形式対応に拡張 |
| `electron-sdd-manager/src/renderer/types/index.ts` | `SpecJson.inspection`フィールドの型を`MultiRoundInspectionState \| LegacyInspectionState`に変更 |
| `electron-sdd-manager/src/renderer/types/workflow.ts` | `getPhaseStatus`関数で`normalizeInspectionState`を使用するように変更 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | `inspectionState`取得で`normalizeInspectionState`を使用するように変更 |

### Code Changes

**inspection.ts - LegacyInspectionState型と変換関数の追加**
```diff
+/**
+ * Legacy inspection state stored in spec.json (old structure)
+ * Used for backward compatibility with existing spec.json files
+ */
+export interface LegacyInspectionState {
+  /** Status: passed/failed or similar legacy values */
+  status: string;
+  /** Date of inspection (YYYY-MM-DD or ISO 8601) */
+  date?: string;
+  /** Report file name (e.g., "inspection-1.md") */
+  report?: string;
+}
+
+export function isLegacyInspectionState(value: unknown): value is LegacyInspectionState { ... }
+export function convertLegacyToMultiRound(legacy: LegacyInspectionState): MultiRoundInspectionState { ... }
+export function normalizeInspectionState(state): MultiRoundInspectionState | null { ... }
```

**inspection.ts - getLatestInspectionReportFile の拡張**
```diff
 export function getLatestInspectionReportFile(
-  state: MultiRoundInspectionState | null | undefined
+  state: MultiRoundInspectionState | LegacyInspectionState | null | undefined
 ): string | null {
+  if (!state) {
+    return null;
+  }
+
+  // Check for new multi-round structure first
+  if (isMultiRoundInspectionState(state)) {
     const latestRound = getLatestRoundDetail(state);
     if (!latestRound) {
       return null;
     }
     return `inspection-${latestRound.roundNumber}.md`;
+  }
+
+  // Handle legacy format (has 'report' field)
+  if (isLegacyInspectionState(state) && state.report) {
+    return state.report;
+  }
+
+  return null;
 }
```

**index.ts - SpecJson型の変更**
```diff
-  /** Inspection state - uses MultiRoundInspectionState for multi-round inspection support */
-  inspection?: MultiRoundInspectionState;
+  /** Inspection state - supports both MultiRoundInspectionState and LegacyInspectionState for backward compatibility */
+  inspection?: MultiRoundInspectionState | LegacyInspectionState;
```

**WorkflowView.tsx - inspectionState取得の変更**
```diff
-  const inspectionState = useMemo((): MultiRoundInspectionState | null => {
-    const inspectionData = (specJson as ExtendedSpecJson & { inspection?: MultiRoundInspectionState })?.inspection;
-    // Check if it's the new multi-round structure (has roundDetails)
-    if (inspectionData && 'roundDetails' in inspectionData) {
-      return inspectionData;
-    }
-    return null;
-  }, [specJson]);
+  const inspectionState = useMemo((): MultiRoundInspectionState | null => {
+    const inspectionData = specJson?.inspection;
+    return normalizeInspectionState(inspectionData);
+  }, [specJson]);
```

## Implementation Notes
- **Option 2を採用**: UI表示時のみの変換を行い、spec.jsonファイル自体は変更しない
- **最小限の変更**: 既存の型ガード・関数パターンを踏襲し、新規関数を追加
- **後方互換性**: 新形式（`roundDetails`配列を持つ）と旧形式（`report`フィールドを持つ）の両方をサポート
- **変換ロジック**: 旧形式の`status: "passed"`は新形式の`status: "completed"` + `roundDetails[0].passed: true`に変換

## Breaking Changes
- [x] No breaking changes

既存の新形式spec.jsonを持つプロジェクトには影響なし。旧形式spec.jsonを持つプロジェクトは自動的に新形式として解釈される。

## Rollback Plan
以下の変更を元に戻す:
1. `inspection.ts`から`LegacyInspectionState`型と関連関数を削除
2. `index.ts`の`SpecJson.inspection`型を`MultiRoundInspectionState`のみに戻す
3. `workflow.ts`と`WorkflowView.tsx`の変更を元に戻す

## Related Commits
- *（コミット未作成）*

## Test Results
- TypeScriptコンパイル: **PASS**
- `inspection.test.ts`: **43 tests passed**
- `workflow.test.ts`: **33 tests passed**
- `SpecPane.test.tsx`: **10 tests passed**
