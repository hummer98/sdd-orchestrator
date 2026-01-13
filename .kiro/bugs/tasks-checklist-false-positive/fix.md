# Bug Fix: tasks-checklist-false-positive

## Summary
`tasks-generation.md`からCoverage Validation Checklistセクションを削除し、タスク進捗パーサーが検証用チェックボックスを誤カウントする問題を解消した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `.kiro/settings/rules/tasks-generation.md` | Coverage Validation Checklistセクション（4つのチェックボックス）を削除 |

### Code Changes

```diff
--- a/.kiro/settings/rules/tasks-generation.md
+++ b/.kiro/settings/rules/tasks-generation.md
@@ -186,12 +186,6 @@ At the **END** of tasks.md, generate a coverage matrix to ensure no criterion is
 | 7.1 | Specsタブ機能 | 13.1, 13.2 | Feature |
 | 7.2 | Bugsタブ機能 | 13.5, 13.6 | Feature |
 | 7.3 | Project Agentタブ | 13.7 | Feature |
-
-### Coverage Validation Checklist
-- [ ] Every criterion ID from requirements.md appears above
-- [ ] Tasks are leaf tasks (e.g., 13.1), not container tasks (e.g., 13)
-- [ ] User-facing criteria have at least one Feature task
-- [ ] No criterion is covered only by Infrastructure tasks
 ```

 ### Validation Rules for Coverage Matrix
```

## Implementation Notes
- **修正方針**: 分析で推奨されたOption 1（テンプレートからChecklistを削除）を採用
- **検証ルールの維持**: Validation Rules for Coverage Matrixセクションはテキスト形式で残存。agentへの検証インストラクションは維持される
- **Coverage Matrixテーブルの維持**: タスク-要件対応表は有用なため削除せず残存
- **影響範囲**: 今後生成されるtasks.mdにはChecklistが含まれなくなる
- **既存ファイル**: 既存のtasks.mdファイルにChecklistが含まれている場合は手動削除または再生成が必要

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `git checkout -- .kiro/settings/rules/tasks-generation.md` でファイルを復元
2. 削除したChecklistセクションを再追加する場合は、190-195行目に以下を挿入:
   ```markdown
   ### Coverage Validation Checklist
   - [ ] Every criterion ID from requirements.md appears above
   - [ ] Tasks are leaf tasks (e.g., 13.1), not container tasks (e.g., 13)
   - [ ] User-facing criteria have at least one Feature task
   - [ ] No criterion is covered only by Infrastructure tasks
   ```

## Related Commits
- *Pending commit after verification*
