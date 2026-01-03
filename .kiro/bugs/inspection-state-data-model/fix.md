# Bug Fix: inspection-state-data-model

## Summary
Inspectionワークフローのデータ構造を簡素化し、NOGO→Fix→再Inspectionフローが正常に動作するように修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/types/inspection.ts` | 新データ構造（InspectionState, InspectionRound）定義、後方互換性変換関数追加 |
| `electron-sdd-manager/src/renderer/components/InspectionPanel.tsx` | 新型とヘルパー関数を使用するよう更新 |
| `electron-sdd-manager/src/renderer/types/workflow.ts` | `getPhaseStatus`でhasPassed()を使用 |
| `electron-sdd-manager/src/renderer/components/SpecPane.tsx` | normalizeInspectionState呼び出し追加 |
| `electron-sdd-manager/src/main/services/specSyncService.ts` | normalizeInspectionState呼び出し追加 |
| `electron-sdd-manager/src/renderer/stores/specDetailStore.ts` | normalizeInspectionState呼び出し追加 |
| `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md` | 新spec.json形式の指示に更新 |
| `electron-sdd-manager/resources/templates/agents/kiro/spec-impl.md` | `--inspection-fix`オプション処理追加 |
| `electron-sdd-manager/src/renderer/types/inspection.test.ts` | 新構造対応テスト55件 |

### Code Changes

#### 新データ構造
```diff
- interface InspectionRoundDetail {
-   roundNumber: number;
-   passed: boolean;
-   fixApplied?: boolean;
-   completedAt?: string;
- }
-
- interface MultiRoundInspectionState {
-   status: InspectionStatus;
-   rounds: number;
-   currentRound: number | null;
-   roundDetails: InspectionRoundDetail[];
- }

+ interface InspectionRound {
+   number: number;
+   result: 'go' | 'nogo';
+   inspectedAt: string;
+   fixedAt?: string;  // spec-impl agentが設定
+ }
+
+ interface InspectionState {
+   rounds: InspectionRound[];
+ }
```

#### 新しいヘルパー関数
- `getLatestRound(state)`: 最新ラウンド取得
- `getRoundCount(state)`: ラウンド数取得
- `needsFix(state)`: Fixボタン表示判定（NOGO && !fixedAt）
- `canStartNextInspection(state)`: 次Inspection可能判定
- `hasPassed(state)`: GO状態判定
- `normalizeInspectionState(state)`: 後方互換性変換

#### UIロジック変更
```diff
- const roundCount = inspectionState?.rounds ?? 0;
- const latestDetail = getLatestRoundDetail(inspectionState);
- const latestPassed = latestDetail?.passed ?? null;
- const latestFixApplied = latestDetail?.fixApplied ?? false;
- const showFixButton = latestPassed === false && !latestFixApplied;

+ const roundCount = getRoundCount(inspectionState);
+ const latestRound = getLatestRound(inspectionState);
+ const latestResult = latestRound?.result ?? null;
+ const showFixButton = needsFix(inspectionState);
```

## Implementation Notes
- **責務分離**: `spec-inspection`は`result`/`inspectedAt`を設定、`spec-impl`は`fixedAt`を設定
- **後方互換性**: `normalizeInspectionState()`で旧形式（MultiRoundInspectionState, LegacyInspectionState）を自動変換
- **実行状態管理**: `status`/`currentRound`はspec.jsonから削除し、AgentStoreで管理

## Breaking Changes
- [x] Breaking changes (documented below)

### spec.json形式変更
**Before**:
```json
{
  "inspection": {
    "status": "completed",
    "rounds": 1,
    "currentRound": null,
    "roundDetails": [
      { "roundNumber": 1, "passed": false, "fixApplied": true, "completedAt": "..." }
    ]
  }
}
```

**After**:
```json
{
  "inspection": {
    "rounds": [
      { "number": 1, "result": "nogo", "inspectedAt": "...", "fixedAt": "..." }
    ]
  }
}
```

**互換性**: `normalizeInspectionState()`により旧形式は自動変換されるため、既存spec.jsonはそのまま読み込み可能。

## Rollback Plan
1. Gitで変更をrevert: `git revert <commit-hash>`
2. 旧データ構造の型定義を復元
3. UIコンポーネントを旧ロジックに戻す
4. Agent templateを旧形式に戻す

## Related Commits
- *コミット未実行 - verification完了後にコミット予定*

## Verification

### TypeScript検証
```bash
npx tsc --noEmit
# 結果: エラーなし（既存の未関連警告のみ）
```

### テスト実行
```bash
npm test -- --run
# 結果: 55 tests passed
```

## Status
- [x] 型定義更新
- [x] 後方互換性変換関数
- [x] UIコンポーネント更新
- [x] ワークフロー状態判定更新
- [x] Agent template更新
- [x] テスト更新・実行
- [x] TypeScript検証
