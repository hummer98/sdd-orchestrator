# Bug Report: agent-resume-cwd-mismatch

## Overview
worktree内をcwdとして起動したagentに追加プロンプトを送ろうとするとresumeに失敗する。Claude Codeはセッションをcwdごとに管理するため、元の起動時と異なるcwdからresumeしようとすると「No conversation found with session ID」エラーが発生する。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-18T14:33:12Z
- Affected Component: SpecManagerService.resumeAgent, AgentRecord
- Severity: High

## Steps to Reproduce
1. worktree内（例: `.kiro/worktrees/specs/steering-release-integration`）をcwdとしてagentを起動
2. agentが完了または中断後、UIから追加プロンプトを送信
3. resume時にメインリポジトリのcwdが使用され失敗

## Expected Behavior
resume時に元のセッション起動時と同じcwdが使用され、セッションが正常に継続される

## Actual Behavior
resume時にメインリポジトリのcwd（`projectPath`）が使用され、Claude Codeが「No conversation found with session ID」エラーを返す

## Error Messages / Logs
```
[2026-01-18T14:21:10.863Z] [DEBUG] [AgentProcess] stderr received {"agentId":"agent-1768745603809-dee608a0","length":76,"preview":"No conversation found with session ID: feeaebfc-4c85-45ef-b884-77b8ef3b6722\n"}
```

## Related Files
- `electron-sdd-manager/src/main/services/specManagerService.ts` (resumeAgent)
- `electron-sdd-manager/src/main/services/agentRecordService.ts` (AgentRecord)
- `electron-sdd-manager/src/main/ipc/handlers.ts` (RESUME_AGENT handler)

## Additional Context
- AgentRecordにcwdフィールドがなく、起動時のcwdが保存されていない
- resumeAgent関数はworktreeCwd引数を受け取るが、RESUME_AGENTハンドラがこれを渡していない
- 根本的な解決にはAgentRecordへのcwdフィールド追加とresume時の参照が必要
