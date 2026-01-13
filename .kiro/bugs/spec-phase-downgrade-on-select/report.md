# Bug Report: spec-phase-downgrade-on-select

## Overview
SpecListItemをクリックしてspecを選択した際、phaseが`deploy-complete`や`inspection-complete`から`implementation-complete`にダウングレードされてしまう。specDetailStore.tsの自動修正ロジックが、より高度なフェーズを考慮せずに条件判定しているため発生。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-14T17:15:00+09:00
- Affected Component: specDetailStore.ts (89-102行目)
- Severity: High（データの意図しない変更）

## Steps to Reproduce
1. `deploy-complete`または`inspection-complete`フェーズのspecを用意
2. Electronアプリでそのspecをクリックして選択
3. spec.jsonのphaseが`implementation-complete`に変更される

## Expected Behavior
`deploy-complete`や`inspection-complete`フェーズのspecを選択しても、phaseは変更されないこと

## Actual Behavior
選択時に自動修正ロジックが実行され、`implementation-complete`にダウングレードされる

## Error Messages / Logs
```
[specDetailStore] Auto-fixing phase to implementation-complete { spec: 'xxx', currentPhase: 'deploy-complete' }
```

## Related Files
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts:89-102`

## Additional Context
条件 `currentPhase !== 'implementation-complete'` が問題。`deploy-complete`等でもtrueになるため、意図せずダウングレードが発生する。
