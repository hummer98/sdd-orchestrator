# Bug Report: e2e-workflow-commands-template-sync

## Overview
e2e-workflow feature (v0.66.0) で spec-inspection-agent に E2E Pipeline を統合した際、`.claude/agents/kiro/spec-inspection.md` のみ更新され、`templates/commands/cc-sdd/spec-inspection.md` および `templates/commands/cc-sdd-agent/spec-inspection.md` への同期が漏れた。その結果、コマンドセットインストール時に旧実装がコピーされ、`/kiro:spec-inspection` 実行時に E2E Pipeline が動作しない。

## Status
**Pending**

## Environment
- Date Reported: 2026-02-03T18:47:21Z
- Affected Component: templates/commands/cc-sdd/spec-inspection.md, templates/commands/cc-sdd-agent/spec-inspection.md
- Severity: Major

## Steps to Reproduce

1. v0.67.0 以降で コマンドセットインストール を実行
2. `/kiro:spec-inspection {feature}` を実行
3. E2E Pipeline（e2e-planner, e2e-creator, e2e-validator, e2e-runner）が呼び出されない

## Expected Behavior
Full Mode（デフォルト）で E2E Pipeline が実行され、`e2e-report-{n}.md` が生成される

## Actual Behavior
静的検査のみ実行され、E2E関連のサブエージェント呼び出しがスキップされる。`inspection-{n}.md` に Mode フィールドが含まれない。

## Error Messages / Logs
```
なし（サイレントに旧実装が動作）
```

## Related Files
- `.claude/agents/kiro/spec-inspection.md` (新実装・E2E Pipeline あり)
- `templates/commands/cc-sdd/spec-inspection.md` (旧実装・E2E Pipeline なし)
- `templates/commands/cc-sdd-agent/spec-inspection.md` (旧実装・E2E Pipeline なし)
- `.kiro/specs/e2e-workflow/tasks.md` (Task 5 に commands 同期タスクがない)

## Additional Context
- e2e-workflow feature の tasks.md に commands テンプレート同期タスクが不足していた
- 修正方法: agents版 spec-inspection.md を commands テンプレートに同期
