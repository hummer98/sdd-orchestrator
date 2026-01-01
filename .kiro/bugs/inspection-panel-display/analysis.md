# Bug Analysis: inspection-panel-display

## Summary
旧形式のspec.json inspection構造（`status`, `date`, `report`フィールド）から新形式（`MultiRoundInspectionState`の`roundDetails`配列）への後方互換性変換ロジックが欠落しているため、メインパネルにインスペクションレポートが表示されない。

## Root Cause
**後方互換性変換ロジックの欠落**

新しいMulti-Round Inspection機能の実装時に、旧形式のspec.json inspection構造のサポートが削除されたが、既存のspec.jsonファイルは旧形式のままであるため、UI表示ができない。

### Technical Details
- **Location**: [SpecPane.tsx:85-102](electron-sdd-manager/src/renderer/components/SpecPane.tsx#L85-L102)
- **Component**: `SpecPane`コンポーネントの`inspectionTabs`生成ロジック
- **Trigger**: 旧形式の`inspection`フィールドを持つspec.jsonを読み込んだ時

### 問題のコード流れ

1. **SpecPane.tsx:85-102** - `inspectionTabs`のメモ化ロジック:
```typescript
const inspectionTabs = useMemo((): TabInfo[] => {
  const inspection = specDetail?.specJson?.inspection;
  const reportFile = getLatestInspectionReportFile(inspection);  // ← ここでnullが返る
  if (!reportFile) {
    return [];  // ← 空配列が返り、タブが表示されない
  }
  // ...
}, [specDetail?.specJson?.inspection]);
```

2. **inspection.ts:227-235** - `getLatestInspectionReportFile`関数:
```typescript
export function getLatestInspectionReportFile(
  state: MultiRoundInspectionState | null | undefined
): string | null {
  const latestRound = getLatestRoundDetail(state);
  if (!latestRound) {
    return null;  // ← roundDetailsがないためnullが返る
  }
  return `inspection-${latestRound.roundNumber}.md`;
}
```

3. **inspection.ts:178-185** - `getLatestRoundDetail`関数:
```typescript
export function getLatestRoundDetail(
  state: MultiRoundInspectionState | null | undefined
): InspectionRoundDetail | null {
  if (!state || !state.roundDetails || state.roundDetails.length === 0) {
    return null;  // ← roundDetails配列がないためnullが返る
  }
  return state.roundDetails[state.roundDetails.length - 1];
}
```

### 旧形式 vs 新形式

**旧形式** (ユーザーのspec.json):
```json
{
  "inspection": {
    "status": "passed",
    "date": "2026-01-02",
    "report": "inspection-1.md"
  }
}
```

**新形式** (MultiRoundInspectionState):
```json
{
  "inspection": {
    "status": "completed",
    "rounds": 1,
    "currentRound": null,
    "roundDetails": [
      {
        "roundNumber": 1,
        "passed": true,
        "completedAt": "2026-01-02T00:00:00Z"
      }
    ]
  }
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: 旧形式のspec.jsonを持つすべてのspec（既存プロジェクト）
- **Risk**: 既存のインスペクション結果が表示されなくなる。データ損失はないが、UXが損なわれる。

## Related Code
関連ファイル:
- [SpecPane.tsx](electron-sdd-manager/src/renderer/components/SpecPane.tsx) - インスペクションタブ生成
- [inspection.ts](electron-sdd-manager/src/renderer/types/inspection.ts) - 型定義とヘルパー関数
- [WorkflowView.tsx](electron-sdd-manager/src/renderer/components/WorkflowView.tsx) - インスペクション状態の取得
- [index.ts](electron-sdd-manager/src/renderer/types/index.ts) - 旧形式削除のコメント（23-24行目）

## Proposed Solution
旧形式のspec.json inspection構造を新形式に変換するマイグレーションロジックを追加する。

### Option 1: 読み込み時の自動変換（推奨）
- Description: spec.jsonを読み込む際に旧形式を検出して新形式に変換する
- Pros:
  - 既存のspec.jsonを修正する必要がない
  - 後方互換性を維持できる
  - 変換は一度だけでファイルも更新される
- Cons:
  - spec.json書き込みが発生する

### Option 2: UI表示時のみの変換
- Description: `getLatestInspectionReportFile`で旧形式も処理できるようにする
- Pros:
  - ファイル変更が不要
- Cons:
  - 複数箇所で変換ロジックが必要になる
  - コードの複雑化

### Recommended Approach
**Option 1: 読み込み時の自動変換**

`specManagerService.ts`または`specStore.ts`でspec.jsonを読み込む際に、旧形式のinspectionフィールドを検出し、新形式に変換する。変換後はspec.jsonを更新する。

```typescript
// 変換関数の例
function migrateInspectionToMultiRound(oldInspection: {
  status: string;
  date?: string;
  report?: string;
}): MultiRoundInspectionState {
  const reportMatch = oldInspection.report?.match(/inspection-(\d+)\.md/);
  const roundNumber = reportMatch ? parseInt(reportMatch[1], 10) : 1;

  return {
    status: oldInspection.status === 'passed' ? 'completed' : 'pending',
    rounds: oldInspection.report ? 1 : 0,
    currentRound: null,
    roundDetails: oldInspection.report ? [{
      roundNumber,
      passed: oldInspection.status === 'passed',
      completedAt: oldInspection.date,
    }] : [],
  };
}
```

## Dependencies
- `specStore.ts` - spec.json更新ロジック
- `specManagerService.ts` - spec.json読み込みロジック

## 追加問題: Deployボタンが有効にならない

### 根本原因
`WorkflowView.tsx`の`phaseStatuses`計算で`WORKFLOW_PHASES`を使用しているが、これには`inspection`フェーズが含まれていない。

```typescript
// 問題のコード
for (const phase of WORKFLOW_PHASES) {  // WORKFLOW_PHASESにはinspectionが含まれない
  statuses[phase] = getPhaseStatus(phase, specJson);
}
```

`canExecutePhase('deploy')`は`ALL_WORKFLOW_PHASES`を使用して前フェーズを判定するため、`inspection`のステータスを参照するが、`phaseStatuses['inspection']`は`undefined`になり、常に`false`が返される。

### 解決策
`WORKFLOW_PHASES`を`ALL_WORKFLOW_PHASES`に変更し、`inspection`フェーズのステータスも計算に含める。

```typescript
// 修正後
for (const phase of ALL_WORKFLOW_PHASES) {  // inspectionも含む
  statuses[phase] = getPhaseStatus(phase, specJson);
}
```

## Testing Strategy
1. 旧形式のspec.jsonを持つテストフィクスチャを作成
2. アプリ起動後に自動的に新形式に変換されることを確認
3. インスペクションタブが正しく表示されることを確認
4. 変換後のspec.jsonが正しい形式になっていることを確認
