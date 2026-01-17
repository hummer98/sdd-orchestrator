# Bug Report: worktree-cwd-not-applied

## Overview
worktreeモードで実装を開始しても、Claude CLIのcwdがworktreeパスではなくメインプロジェクトパスのままになる。**Specsワークフロー（git-worktree-support）とBugsワークフロー（bugs-worktree-support）の両方で同一の問題が発生している。**

設計書では以下が定義されているが、実装されていない:
- Specs: `StartAgentOptions.worktreeCwd` + `startAgent()`内で`worktreeCwd || projectPath`を使用
- Bugs: `BugService.getAgentCwd()` でworktreeパスを取得

両方とも関数は存在するが呼び出されておらず、各inspection.mdで偽陽性（False Positive）としてPASS判定されていた。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-17T07:40:17Z
- Affected Component: SpecManagerService.startAgent(), executeBugPhase()
- Severity: Major

## Steps to Reproduce

### Specs ワークフロー
1. specでworktreeモードを有効化（「worktreeで実装」ボタン押下）
2. impl実行を開始
3. Claude CLIのcwdを確認

### Bugs ワークフロー
1. bugでworktreeモードを有効化（「worktreeで修正」ボタン押下）
2. bug-fix/bug-verify実行を開始
3. Claude CLIのcwdを確認

## Expected Behavior
Claude CLIがworktreeの絶対パス（例: `/path/to/project-worktrees/feature-name`）で実行される

## Actual Behavior
Claude CLIが常にメインプロジェクトパス（例: `/path/to/project`）で実行される

## Error Messages / Logs
```
エラーメッセージなし（機能的に動作するが、worktreeの意図が失われる）
```

## Related Files

### Specs ワークフロー (git-worktree-support)
- `electron-sdd-manager/src/main/services/specManagerService.ts` - startAgent()でcwd: this.projectPathをハードコード
- `electron-sdd-manager/src/main/ipc/worktreeImplHandlers.ts` - getWorktreeCwd()は存在するが未使用
- `.kiro/specs/git-worktree-support/design.md` (行367-410) - 設計仕様
- `.kiro/specs/git-worktree-support/tasks.md` (行52-56) - Task 4.2が不完全な状態で完了扱い
- `.kiro/specs/git-worktree-support/inspection-1.md` (行24) - REQ-3.1の偽陽性判定

### Bugs ワークフロー (bugs-worktree-support)
- `electron-sdd-manager/src/main/services/bugService.ts` (行467-483) - getAgentCwd()は存在するが未使用
- `electron-sdd-manager/src/main/ipc/remoteAccessHandlers.ts` (行184-217) - executeBugPhase()でworktreeCwd未設定
- `.kiro/specs/bugs-worktree-support/design.md` (行344-396) - 設計仕様
- `.kiro/specs/bugs-worktree-support/tasks.md` (行33-35) - Task 2.3が不完全な状態で完了扱い
- `.kiro/specs/bugs-worktree-support/inspection-1.md` (行58-59) - REQ-11.1, 11.2の偽陽性判定

## Additional Context
- 両specのinspection.mdで「関数の存在確認のみ」で呼び出し確認が不足していた
- 修正範囲:
  - **共通**: StartAgentOptionsへのworktreeCwd追加、startAgent()のcwd分岐
  - **Specs**: executeTaskImpl()等の呼び出し元でgetWorktreeCwd()使用
  - **Bugs**: executeBugPhase()でgetAgentCwd()使用
