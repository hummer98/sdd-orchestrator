# Bug Analysis: inspection-completed-field-mismatch

## Summary
UI側の `getPhaseStatus` 関数が存在しない `inspection_completed` フィールドを参照している。spec-inspection-agentは `inspection.passed` を設定するため、inspectionフェーズがGOになってもDeployボタンがenableにならない。

## Root Cause

**フィールド名のミスマッチ**

UI実装時に想定したスキーマと、後から実装されたspec-inspection-agentが設定するスキーマが一致していない。

### Technical Details
- **Location**: [workflow.ts:123](electron-sdd-manager/src/renderer/types/workflow.ts#L123)
- **Component**: `getPhaseStatus` 関数（inspection phase判定部分）
- **Trigger**: spec-inspection-agentがGOジャッジメント後に `inspection.passed: true` を設定しても、UI側が `inspection_completed` を参照しているため条件が成立しない

### コード比較

**現在のUI実装** ([workflow.ts:122-124](electron-sdd-manager/src/renderer/types/workflow.ts#L122-L124)):
```typescript
if (phase === 'inspection') {
  return specJson.inspection_completed ? 'approved' : 'pending';
}
```

**spec-inspection-agentが設定するフィールド** (spec-inspection.md:191-198):
```json
{
  "inspection": {
    "passed": true,
    "inspected_at": "2025-12-25T12:00:00Z",
    "report_file": "inspection-1.md"
  }
}
```

**型定義** ([index.ts:24-28](electron-sdd-manager/src/renderer/types/index.ts#L24-L28)):
```typescript
export interface InspectionState {
  passed: boolean;
  inspected_at: string;
  report_file: string;
}
```

## Impact Assessment
- **Severity**: Major（中核機能のワークフロー進行がブロックされる）
- **Scope**: inspectionフェーズを完了した全てのSpec
- **Risk**: 低（修正は単純で副作用のリスクは小さい）

## Proposed Solution

### Option 1: UI側を修正（推奨）
- **Description**: `getPhaseStatus` 関数で `inspection.passed` を参照するように変更
- **Pros**:
  - SSOT原則に従い `inspection.passed` を唯一の真実とする
  - `InspectionState` 型が既に定義済みで、正しい構造
  - `inspection_completed` は冗長なフィールドであり、削除が妥当
- **Cons**:
  - テストも合わせて修正が必要

### Option 2: 両方をサポート（非推奨）
- **Description**: `inspection_completed` と `inspection.passed` の両方をチェック
- **Pros**:
  - 後方互換性を維持
- **Cons**:
  - SSOT原則に反する（2つの真実が存在）
  - 将来的な混乱の原因

### Recommended Approach
**Option 1: UI側を修正**

以下の変更を行う:
1. `workflow.ts:123` を `specJson.inspection?.passed` に変更
2. `ExtendedSpecJson` 型から `inspection_completed` を削除
3. テストケースを `inspection.passed` ベースに更新

## Dependencies
- [workflow.ts](electron-sdd-manager/src/renderer/types/workflow.ts) - getPhaseStatus関数
- [workflow.test.ts](electron-sdd-manager/src/renderer/types/workflow.test.ts) - テストケース

## Testing Strategy
1. 既存テストを修正し、`inspection.passed` ベースに変更
2. inspectionフェーズでGO/NOGOの両ケースをテスト
3. E2Eテストでinspection完了後のDeployボタン有効化を確認
