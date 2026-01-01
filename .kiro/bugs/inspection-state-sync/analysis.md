# Bug Analysis: inspection-state-sync

## Summary
Inspection完了後にUIが正しく更新されない。roundカウンターが0のまま、GO判定でもDeployボタンが無効のまま。

## Root Cause

**型定義とspec-inspection-agentのspec.json更新ロジックの不整合**

### 詳細

1. **2つの異なるInspection状態構造が混在**:

   | 構造 | 定義場所 | フィールド |
   |------|----------|-----------|
   | 古い `InspectionState` | `types/index.ts:24-28` | `passed`, `inspected_at`, `report_file` |
   | 新しい `MultiRoundInspectionState` | `types/inspection.ts:105-115` | `status`, `rounds`, `currentRound`, `roundDetails` |

2. **spec-inspection-agentは古い構造で更新**:
   - `.claude/agents/kiro/spec-inspection.md:188-206` で `passed`, `inspected_at`, `report_file` を書き込む
   - 新しい `rounds`, `roundDetails` は更新されない

3. **UIコンポーネントは新しい構造を期待**:
   - `InspectionPanel.tsx:190` → `inspectionState?.rounds ?? 0` を表示
   - `WorkflowView.tsx:82-89` → `MultiRoundInspectionState` を期待

4. **getPhaseStatus()は古い構造をチェック**:
   - `workflow.ts:133` → `specJson.inspection?.passed` で判定
   - 新しい構造に `passed` フィールドがないため常に `'pending'`

### Technical Details
- **Location**:
  - `.claude/agents/kiro/spec-inspection.md:188-206` (spec.json更新ロジック)
  - `src/renderer/types/workflow.ts:132-134` (getPhaseStatus)
  - `src/renderer/types/index.ts:24-28` (古いInspectionState型)
- **Component**: Inspection workflow, spec-inspection-agent
- **Trigger**: Inspection完了時のspec.json更新

## Impact Assessment
- **Severity**: High
- **Scope**: Inspectionを使用する全てのワークフロー
- **Risk**: Deployフェーズへの遷移がブロックされる

## Related Code

### spec-inspection-agent (古い構造で更新)
```markdown
### 6. Update spec.json

**Always update spec.json** after inspection (both GO and NOGO):
{
  "inspection": {
    "passed": true,
    "inspected_at": "2025-12-25T12:00:00Z",
    "report_file": "inspection-{n}.md"
  }
}
```

### getPhaseStatus (古い構造のみチェック)
```typescript
// workflow.ts:132-134
if (phase === 'inspection') {
  return specJson.inspection?.passed ? 'approved' : 'pending';
}
```

### InspectionPanel (新しい構造を期待)
```typescript
// InspectionPanel.tsx:190
const rounds = inspectionState?.rounds ?? 0;
```

### remote-ui/components.js (新旧両対応 - 参考実装)
```javascript
// 1095-1114: 新構造を優先、古い構造もフォールバック対応
if (spec.inspection?.roundDetails && Array.isArray(spec.inspection.roundDetails)) {
  // New multi-round structure
  ...
} else if (spec.inspection?.passed) {
  // Legacy structure
  result.inspection = 'approved';
}
```

## Proposed Solution

### Option 1: 古いInspectionStateを削除し、新しいMultiRoundInspectionStateに統一（推奨）

**変更内容**:
1. `types/index.ts` から `InspectionState` を削除
2. `SpecJson.inspection` の型を `MultiRoundInspectionState` に変更
3. `getPhaseStatus()` を新構造対応に修正:
   ```typescript
   if (phase === 'inspection') {
     // Check new structure: status === 'go' or latest roundDetails.passed
     if (specJson.inspection?.status === 'go') {
       return 'approved';
     }
     const roundDetails = specJson.inspection?.roundDetails;
     if (roundDetails && roundDetails.length > 0) {
       const latest = roundDetails[roundDetails.length - 1];
       if (latest.passed) return 'approved';
     }
     return 'pending';
   }
   ```
4. `spec-inspection-agent` のspec.json更新ロジックを新構造に修正:
   ```json
   {
     "inspection": {
       "status": "go",
       "rounds": 1,
       "currentRound": 1,
       "roundDetails": [{
         "roundNumber": 1,
         "status": "completed",
         "passed": true,
         "inspectedAt": "2025-12-25T12:00:00Z",
         "reportFile": "inspection-1.md"
       }]
     }
   }
   ```

**Pros**:
- 型定義がシンプルになる
- 混乱の元となる重複構造を排除
- Multi-round inspection機能を正しく活用できる

**Cons**:
- 既存のspec.jsonとの後方互換性対応が必要（フォールバック）

### Recommended Approach

**Option 1を推奨**

理由:
- 古い `InspectionState` は実質使われておらず、混乱の元
- `remote-ui/components.js` に新旧両対応の参考実装がある
- 型を統一することで今後のメンテナンス性が向上

## Dependencies
- `types/index.ts` - InspectionState削除、SpecJson型修正
- `types/workflow.ts` - getPhaseStatus修正
- `.claude/agents/kiro/spec-inspection.md` - spec.json更新ロジック修正
- `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md` - テンプレート同期

## Testing Strategy
1. 既存のinspection関連テストが通ること確認
2. E2Eテスト: Inspection実行 → roundカウンター更新確認
3. E2Eテスト: GO判定 → Deployボタン有効化確認
4. 既存のspec.json（古い構造）がある場合のフォールバック確認
