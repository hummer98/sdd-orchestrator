# Bug Analysis: commit-unclear-target-files

## Summary
デプロイフェーズで実行される `/commit` コマンドに、コミット対象ファイルを特定する情報が渡されていない

## Root Cause
`BUG_PHASE_COMMANDS` で deploy フェーズが `/commit` に直接マッピングされているが、バグ名やSpec名などのコンテキスト情報が渡されていない。

### Technical Details
- **Location**: [electron-sdd-manager/src/renderer/types/bug.ts:196](electron-sdd-manager/src/renderer/types/bug.ts#L196)
- **Component**: BugAutoExecutionService / commit.md スラッシュコマンド
- **Trigger**: Bug ワークフローまたは Spec ワークフローのデプロイフェーズ実行時

### 関連コード

**1. BUG_PHASE_COMMANDS 定義 (bug.ts:191-197)**
```typescript
export const BUG_PHASE_COMMANDS: Record<BugWorkflowPhase, string | null> = {
  report: null,
  analyze: '/kiro:bug-analyze',
  fix: '/kiro:bug-fix',
  verify: '/kiro:bug-verify',
  deploy: '/commit',  // ← コンテキストなし
};
```

**2. 実行時の処理 (BugAutoExecutionService.ts:225-230)**
```typescript
if (phase === 'deploy') {
  // Deploy uses /commit without bug name
  fullCommand = commandTemplate;  // ← "/commit" のみ
} else {
  fullCommand = `${commandTemplate} ${selectedBug.name}`;
}
```

**3. Spec ワークフローの PHASE_COMMANDS (workflow.ts:181-198)**
```typescript
deploy: '/kiro:deployment',  // ← 存在しないコマンド
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bug/Spec ワークフローのデプロイフェーズを使用するすべてのユーザー
- **Risk**: 意図しないファイルがコミットに含まれる、または適切なコミットメッセージが生成されない可能性

## Related Code
- [electron-sdd-manager/src/renderer/types/bug.ts:191-197](electron-sdd-manager/src/renderer/types/bug.ts#L191-L197)
- [electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts:217-230](electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts#L217-L230)
- [electron-sdd-manager/src/renderer/types/workflow.ts:181-198](electron-sdd-manager/src/renderer/types/workflow.ts#L181-L198)
- [.claude/commands/commit.md](.claude/commands/commit.md)

## Proposed Solution

### Option 1: /commit コマンドの引数拡張（推奨）
- **Description**: `/commit` コマンドに対象 feature 名/bug 名を引数として受け取り、tasks.md を参照してコミット対象を特定する機能を追加
- **Pros**:
  - 既存の `/commit` コマンドを拡張するだけで対応可能
  - ユーザーの期待どおりの動作
- **Cons**:
  - commit.md の修正が必要

### Option 2: 専用デプロイコマンドの作成
- **Description**: `/kiro:deployment` または `/kiro:spec-deploy` コマンドを新規作成
- **Pros**:
  - 関心の分離が明確
  - Spec/Bug それぞれに最適化した処理が可能
- **Cons**:
  - 新規ファイル作成が必要
  - メンテナンス対象が増える

### Recommended Approach
**Option 1** を採用。`/commit` コマンドの引数として feature 名または bug 名を受け取り、以下の処理を行う：

1. 引数がある場合：
   - Spec の場合: `.kiro/specs/{feature}/tasks.md` を参照
   - Bug の場合: `.kiro/bugs/{bug-name}/` 内のファイルを対象
2. 引数がない場合：従来どおり現在のセッションで変更したファイルのみを対象

## Dependencies
- `.claude/commands/commit.md` の修正
- tasks.md のパス解決ロジック

## Testing Strategy
1. `/commit feature-name` でコミット対象が正しく特定されることを確認
2. `/commit bug-name` でバグ関連ファイルがコミットされることを確認
3. 引数なしの `/commit` が従来どおり動作することを確認
