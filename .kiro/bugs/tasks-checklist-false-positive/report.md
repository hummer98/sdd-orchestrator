# Bug Report: tasks-checklist-false-positive

## Overview
tasks.mdに追加されたCoverage Validation Checklistセクションのチェックボックスが、実装タスクとして誤認識されてしまう問題。タスク進捗の計算に不要なチェック項目が含まれる。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-14T00:00:00+09:00
- Affected Component: タスク進捗パーサー、tasks-generationテンプレート
- Severity: Medium

## Steps to Reproduce
1. spec-tasksでtasks.mdを生成する
2. 生成されたtasks.mdにCoverage Validation Checklistが含まれる
3. UIでタスク進捗を確認すると、Checklistの項目もカウントされている

## Expected Behavior
タスク進捗は実装タスクのみをカウントすべき

## Actual Behavior
Coverage Validation Checklistのチェックボックスも進捗にカウントされる

## Error Messages / Logs
```
N/A - 機能的なエラーではなく、意図しないカウント
```

## Related Files
- `.kiro/settings/rules/tasks-generation.md` (Checklistテンプレート定義)
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts` (パーサー)
- `.claude/agents/kiro/spec-tasks.md` (生成agent)

## Additional Context
- Coverage Validation Checklistは生成時の検証用だが、agent自体が検証責務を持っているため、tasks.mdへの出力は不要
- Coverage Matrixテーブルは残す価値あり（タスク-要件対応表として有用）
- 解決方針：テンプレートとagentからChecklistセクションを削除
