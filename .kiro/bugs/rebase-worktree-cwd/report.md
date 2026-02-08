# Bug Report: rebase-worktree-cwd

## Overview
「mainを取り込み」ボタン押下時、rebase-worktree.shがmain側のcwdで実行されるため、worktree側にしかspec.jsonが存在しないケースでエラーになる。worktreeService.tsのexecGitがthis.projectPath（main側）をcwdに設定しているが、スクリプトはworktree起点で動作する前提で書かれている。さらにmain側で実行するとgit checkoutによりmainのHEADが移動する副作用もある。

## Status
**Pending**

## Environment
- Date Reported: 2026-02-06T01:06:23Z
- Affected Component: *To be identified during analysis*
- Severity: *To be determined*

## Steps to Reproduce
*To be documented*

1.
2.
3.

## Expected Behavior
*To be documented*

## Actual Behavior
*To be documented*

## Error Messages / Logs
```
*To be captured*
```

## Related Files
- *To be identified during analysis*

## Additional Context
*Any additional information*
