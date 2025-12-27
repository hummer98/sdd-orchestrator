# Bug Report: inspection-completed-field-mismatch

## Overview
UI側の `getPhaseStatus` 関数が `inspection_completed` フィールドを参照しているが、spec-inspection-agentは `inspection.passed` フィールドを設定するため、inspectionフェーズがGOになってもDeployボタンがenableにならない。

## Status
**Pending**

## Environment
- Date Reported: 2025-12-27T19:30:00+09:00
- Affected Component: workflow.ts (getPhaseStatus関数)
- Severity: Major

## Steps to Reproduce
1. Specのinspectionフェーズを実行
2. GOジャッジメントを受ける
3. Deployボタンを確認 → enableにならない

## Expected Behavior
inspectionがGO（`inspection.passed: true`）になったらDeployボタンがenableになる

## Actual Behavior
`inspection_completed` フィールドが存在しないため、Deployボタンは常にdisabled

## Error Messages / Logs
```
なし（エラーは発生せず、単に条件が満たされない）
```

## Related Files
- `electron-sdd-manager/src/renderer/types/workflow.ts:122-124` (getPhaseStatus)
- `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md:188-206` (spec.json更新指示)

## Additional Context
修正方針: UI側（B案）で修正。`inspection_completed` → `inspection?.passed` に変更。
SSOT原則に従い、`inspection.passed` を唯一の真実とする。
