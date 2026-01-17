# Bug Report: worktree-checkout-not-complete

## Overview
Worktreeモードで実装開始ボタンを押した際に2つの問題が発生：
1. トースト表示が「Worktree作成完了: undefined」となる
2. エージェントが「Unknown skill: kiro:spec-impl」で失敗する

## Status
**Pending**

## Environment
- Date Reported: 2026-01-17T12:36:11Z
- Affected Component: worktreeImplHandlers, WorkflowView
- Severity: High（worktreeモードでの実装開始が完全に失敗する）

## Steps to Reproduce
1. gemini-document-reviewなどのspecを選択
2. Worktreeモードを有効にする
3. 「実装開始」ボタンをクリック

## Expected Behavior
- トースト: 「Worktree作成完了: feature/gemini-document-review」
- エージェントが正常に起動し、spec-implコマンドを実行

## Actual Behavior
- トースト: 「Worktree作成完了: undefined」
- エージェントログ: 「Unknown skill: kiro:spec-impl」

## Error Messages / Logs
```
[2026-01-17T12:09:17.619Z] [INFO] [renderer] [notify] Worktree作成完了: undefined

Agent init log:
"slash_commands":["dx:gha","compact",...] // kiro:* コマンドが含まれていない
"result":"Unknown skill: kiro:spec-impl"
```

## Root Cause Analysis

### 問題1: トーストのundefined
- `WorkflowView.tsx:503`で`implStartResult.value.branch`を参照
- 実際の返り値型は`{ worktreePath, worktreeConfig }`
- 正しくは`implStartResult.value.worktreeConfig.branch`

### 問題2: Unknown skill
- worktree作成（12:09:17.616Z）からエージェント起動（12:09:17.621Z）まで5ms
- `git worktree add`中は`.git/worktrees/{name}/index.lock`が存在
- ファイルシステムの同期が完了する前にClaude CLIが起動
- `.claude/commands/`がまだ読み込めない状態でClaude CLIが起動

### 検証結果
```
21:34:47 index.lock EXISTS (worktree作成中)
21:34:48 Worktree command returned (index.lock消失)
```

## Related Files
- `electron-sdd-manager/src/renderer/components/WorkflowView.tsx:503`
- `electron-sdd-manager/src/main/ipc/worktreeImplHandlers.ts`
- `electron-sdd-manager/src/main/services/worktreeService.ts`

## Proposed Fix
1. トースト: `value.branch` → `value.worktreeConfig.branch`
2. index.lock消失を待ってからエージェント起動
