# Bug Analysis: inspection-files-display-issue

## Summary
Specフォルダ内に複数のInspection-{n}.mdファイルが存在する場合、UIは最新の1つしかタブとして表示しない。これは設計上の意図的な挙動か、Document Reviewタブとの一貫性の欠如によるバグの可能性がある。

## Root Cause

### Technical Details
- **Location**: [SpecPane.tsx:86-103](electron-sdd-manager/src/renderer/components/SpecPane.tsx#L86-L103)
- **Component**: SpecPane / inspectionTabs useMemo
- **Trigger**: `getLatestInspectionReportFile()` 関数が最新の1件のみを返す設計

### 問題のコード
```typescript
// SpecPane.tsx:86-103
const inspectionTabs = useMemo((): TabInfo[] => {
  const inspection = normalizeInspectionState(specDetail?.specJson?.inspection);
  const reportFile = getLatestInspectionReportFile(inspection);  // ← 最新1件のみ取得
  if (!reportFile) {
    return [];
  }

  const match = reportFile.match(/inspection-(\d+)\.md/);
  if (!match) {
    return [];
  }

  const n = parseInt(match[1], 10);
  return [{
    key: `inspection-${n}` as ArtifactType,
    label: `Inspection-${n}`,
  }];  // ← 1件のみ返却
}, [specDetail?.specJson?.inspection]);
```

### 比較: Document Reviewタブの実装
Document Reviewタブは全ラウンドをタブとして表示している:
```typescript
// SpecPane.tsx:56-82
const documentReviewTabs = useMemo((): TabInfo[] => {
  const reviewState = specDetail?.specJson?.documentReview;
  if (!reviewState?.roundDetails || reviewState.roundDetails.length === 0) {
    return [];
  }

  const tabs: TabInfo[] = [];
  const sortedDetails = [...reviewState.roundDetails].sort(
    (a, b) => a.roundNumber - b.roundNumber
  );

  for (const detail of sortedDetails) {
    const n = detail.roundNumber;
    tabs.push({
      key: `document-review-${n}` as ArtifactType,
      label: `Review-${n}`,
    });
    // ...
  }

  return tabs;  // ← 全件返却
}, [specDetail?.specJson?.documentReview]);
```

## Impact Assessment
- **Severity**: Medium（機能制限だが、クラッシュ等の重大な問題ではない）
- **Scope**: Inspectionラウンドを複数回実行したSpec全て
- **Risk**: 過去のInspectionレポートが参照できない

## Related Code
- [inspection.ts:397-405](electron-sdd-manager/src/renderer/types/inspection.ts#L397-L405) - `getLatestInspectionReportFile()`関数

```typescript
export function getLatestInspectionReportFile(
  state: InspectionState | null | undefined
): string | null {
  const latest = getLatestRound(state);
  if (!latest) {
    return null;
  }
  return `inspection-${latest.number}.md`;
}
```

## Proposed Solution

### Option 1: 全Inspectionラウンドをタブとして表示（Document Reviewと同様）
- **Description**: InspectionState.roundsを全てループして、各ラウンドのタブを生成
- **Pros**: Document Reviewタブと一貫性がある、過去のレポート全て参照可能
- **Cons**: タブ数が増える可能性

### Option 2: 最新N件のみ表示
- **Description**: 直近の2-3件のみタブ表示
- **Pros**: UIの複雑化を防ぐ
- **Cons**: 実装が複雑、任意のカットオフは不自然

### Recommended Approach
**Option 1を推奨**: Document Reviewタブとの一貫性を保つため、全ラウンドをタブとして表示する。

修正箇所:
1. `SpecPane.tsx` の `inspectionTabs` useMemoを修正
2. `inspection.rounds` 配列を全てループしてタブを生成

## Dependencies
- `InspectionState.rounds` 配列のデータ構造（変更不要）
- `ArtifactEditor` のタブ表示機能（変更不要）

## Testing Strategy
1. 複数のInspection-{n}.mdファイルを持つSpecを用意
2. UIで全てのInspectionタブが表示されることを確認
3. 各タブをクリックして正しいファイル内容が表示されることを確認
4. Inspectionが0件、1件、複数件のケースをテスト
