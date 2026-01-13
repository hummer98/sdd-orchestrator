# Bug Analysis: tasks-checklist-false-positive

## Summary
tasks.mdの「Coverage Validation Checklist」セクションのチェックボックスが、タスク進捗パーサーによって実装タスクとして誤カウントされる問題。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts:87-89`
- **Component**: `specDetailStore.selectSpec()` 内のタスク進捗計算ロジック
- **Trigger**: tasks.md内の全てのMarkdownチェックボックス（`- [ ]` / `- [x]`）を無差別にカウントしている

### 根本原因の詳細

タスク進捗の計算ロジック（87-89行目）:
```typescript
const completedMatches = tasks.content.match(/^- \[x\]/gim) || [];
const pendingMatches = tasks.content.match(/^- \[ \]/gm) || [];
```

この正規表現は **ファイル全体** のチェックボックスをマッチするため、以下の両方がカウントされる:
1. **実装タスク** (意図した対象): `- [ ] 1.1 タスク説明`
2. **Coverage Validation Checklist** (誤カウント対象):
   - `- [ ] Every criterion ID from requirements.md appears above`
   - `- [ ] Tasks are leaf tasks...`
   - etc.

### 問題の発生源

Coverage Validation Checklistは `.kiro/settings/rules/tasks-generation.md:190-195` で定義されている:
```markdown
### Coverage Validation Checklist
- [ ] Every criterion ID from requirements.md appears above
- [ ] Tasks are leaf tasks (e.g., 13.1), not container tasks (e.g., 13)
- [ ] User-facing criteria have at least one Feature task
- [ ] No criterion is covered only by Infrastructure tasks
```

このChecklistは **agentがtasks.md生成時に自己検証するためのもの** であり、生成完了後は不要。

## Impact Assessment
- **Severity**: Medium
- **Scope**: 全てのSpec詳細表示（UIのタスク進捗表示）
- **Risk**:
  - 進捗表示が不正確（4-5個の余分なチェック項目がカウントされる）
  - 実際の進捗より低く表示される可能性
  - 全タスク完了時も100%にならない可能性

## Related Code

**パーサーロジック** (`specDetailStore.ts:86-96`):
```typescript
let taskProgress: TaskProgress | null = null;
if (tasks?.content) {
  const completedMatches = tasks.content.match(/^- \[x\]/gim) || [];
  const pendingMatches = tasks.content.match(/^- \[ \]/gm) || [];
  const total = completedMatches.length + pendingMatches.length;
  const completed = completedMatches.length;
  taskProgress = {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
```

**テンプレート定義** (`tasks-generation.md:186-195`):
```markdown
## Appendix: Requirements Coverage Matrix
...
### Coverage Validation Checklist
- [ ] Every criterion ID from requirements.md appears above
...
```

## Proposed Solution

### Option 1: テンプレートからChecklistを削除（推奨）
- **Description**: `tasks-generation.md` から Coverage Validation Checklist セクションを削除。agentは既に検証責務を持つため、出力に含める必要がない
- **Pros**:
  - シンプルで確実
  - 既存tasks.mdの再生成で解決
  - パーサー変更不要
- **Cons**:
  - 既存のtasks.mdは手動で更新するか再生成が必要

### Option 2: パーサーでChecklistセクションを除外
- **Description**: `specDetailStore.ts` のパーサーで `## Appendix` 以降または `### Coverage Validation Checklist` セクションを除外
- **Pros**:
  - 既存tasks.mdを変更せずに対応可能
- **Cons**:
  - パーサーに複雑なロジックが追加される
  - セクション構造への依存が増える

### Recommended Approach
**Option 1** を推奨。理由:
1. Coverage Validation Checklistはagent実行時の自己検証用であり、最終成果物に含める意味がない
2. Coverage Matrixテーブルは残す（タスク-要件対応の参照として有用）
3. パーサーの複雑化を避けられる
4. 問題を根本から解消できる

## Dependencies
- `.kiro/settings/rules/tasks-generation.md` - Checklistテンプレート削除
- `.kiro/settings/templates/specs/tasks.md` - テンプレートにChecklistがあれば削除
- 既存の `.kiro/specs/*/tasks.md` - 再生成または手動削除が必要

## Testing Strategy
1. `tasks-generation.md` からChecklistセクションを削除
2. 新規specで `/kiro:spec-tasks` を実行し、Checklistが生成されないことを確認
3. UIでタスク進捗が正確に表示されることを確認
4. 既存specのtasks.mdからChecklistを手動削除し、進捗表示が正確になることを確認
