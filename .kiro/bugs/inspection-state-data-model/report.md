# Bug Report: inspection-state-data-model

## Overview
InspectionのroundDetailsデータ構造が期待されるワークフロー（inspection → NOGO → fix → 次のinspection）と噛み合っていない。現在の`fixApplied`フラグの意味が曖昧で、`status`/`currentRound`フィールドが不要な中間状態を表現している。また、`--inspection-fix`オプションを処理するagent定義が存在せず、fixApplied更新の責務が不明確。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-03T09:30:00+09:00
- Affected Component: inspection-workflow-ui, spec-inspection agent, spec-impl agent
- Severity: Major

## Steps to Reproduce
1. Inspectionを実行してNOGO判定を受ける
2. Fix実行ボタンをクリックしてfixを実行
3. 次のInspectionボタンがenableにならない（fixAppliedが更新されていない）

## Expected Behavior
- Round 1 NOGO → Fix実行 → fixedAt設定 → Round 2 Inspectionボタンenable
- シンプルな状態遷移でUI判定可能

## Actual Behavior
- fixAppliedを誰が更新するか不明確
- spec-impl.mdに--inspection-fixオプションの処理定義なし
- status/currentRoundフィールドが冗長（AgentStoreで実行状態は管理済み）

## Error Messages / Logs
```
N/A - 設計上の問題
```

## Related Files
- `electron-sdd-manager/src/renderer/types/inspection.ts` - データ型定義
- `electron-sdd-manager/src/renderer/components/InspectionPanel.tsx` - UI判定ロジック
- `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md` - inspection agent
- `electron-sdd-manager/resources/templates/agents/kiro/spec-impl.md` - impl agent（--inspection-fix未対応）

## Proposed Solution

### 新データ構造
```typescript
interface InspectionState {
  rounds: InspectionRound[];
}

interface InspectionRound {
  number: number;
  result: 'go' | 'nogo';
  inspectedAt: string;
  fixedAt?: string;  // fix完了時にspec-impl agentが設定
}
```

### 廃止フィールド
- `status` - 不要（実行状態はAgentStoreで管理）
- `currentRound` - 不要
- `fixApplied` - `fixedAt`で代替

### 責務明確化
| 操作 | 責務 | 更新内容 |
|------|------|---------|
| inspection完了 | spec-inspection agent | rounds追加（result, inspectedAt） |
| fix完了 | spec-impl agent (--inspection-fix) | 該当roundにfixedAt設定 |

## Additional Context
会話で合意した設計案に基づくリファクタリング。UIロジックもシンプルになる：
```typescript
const latest = rounds[rounds.length - 1];
const showFixButton = latest?.result === 'nogo' && !latest.fixedAt;
const showInspectionButton = !latest || latest.result === 'go' || latest.fixedAt;
```
