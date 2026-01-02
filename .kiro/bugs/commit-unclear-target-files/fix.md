# Bug Fix: commit-unclear-target-files

## Summary
`/commit` コマンドに引数としてSpec feature名/Bug名を受け取る機能を追加し、コミット対象ファイルを明確に特定できるように修正

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `.claude/commands/commit.md` | 引数解析ロジックとSpec/Bug対応のドキュメント追加 |
| `electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts` | deploy フェーズ実行時にbug名を渡すよう修正 |

### Code Changes

**1. commit.md - 引数サポートの追加**

```diff
- allowed-tools: Bash(git *), Read(CLAUDE.md)
+ allowed-tools: Bash(git *), Read, Glob
```

新しいUsageセクションを追加:
```markdown
## Usage
/commit [target] [options]

### Arguments
- `target` (optional): コミット対象を特定する名前
  - **Spec feature 名**: `.kiro/specs/{feature}/tasks.md` を参照
  - **Bug 名**: `.kiro/bugs/{bug-name}/` 内のファイルを対象
  - **省略時**: 現在のセッションで変更したファイルのみを対象
```

**2. BugAutoExecutionService.ts - deploy フェーズの修正**

```diff
-      // Build the command
-      let fullCommand: string;
-      if (phase === 'deploy') {
-        // Deploy uses /commit without bug name
-        fullCommand = commandTemplate;
-      } else {
-        // Other phases append bug name
-        fullCommand = `${commandTemplate} ${selectedBug.name}`;
-      }
+      // Build the command: all phases include bug name
+      // Bug fix: commit-unclear-target-files - deploy phase now passes bug name to /commit
+      const fullCommand = `${commandTemplate} ${selectedBug.name}`;
```

```diff
-        // Note: deploy is skipped until /kiro:bug-deploy is implemented
-        if (phase === 'deploy') {
-          console.log('[BugAutoExecutionService] deploy phase skipped (not yet implemented)');
-          continue;
-        }
+        // Bug fix: commit-unclear-target-files - deploy phase now uses /commit with bug name
```

## Implementation Notes
- `/commit` コマンドは引数がある場合、Spec/Bugディレクトリを確認してコンテキストを取得
- Specの場合: `tasks.md` からファイルパターンを抽出
- Bugの場合: `analysis.md`/`fix.md` から関連ファイルを抽出
- 引数がない場合は従来どおり現在のセッションで変更したファイルのみを対象

## Breaking Changes
- [x] No breaking changes

既存の `/commit` コマンド（引数なし）は従来どおり動作する。

## Rollback Plan
1. `.claude/commands/commit.md` を以前のバージョンに戻す
2. `BugAutoExecutionService.ts` の deploy フェーズ処理を元に戻す
3. deploy フェーズのスキップ処理を復活させる

## Related Commits
- *To be added after commit*
