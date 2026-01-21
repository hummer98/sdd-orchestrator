# Bug Report: start-impl-path-resolution-missing

## Overview
`START_IMPL` および `AUTO_EXECUTION_START` IPCハンドラーで `resolveSpecPath` が欠落しており、worktreeモードでspec.jsonが見つからないエラー（ENOENT: no such file or directory, open 'spec-event-log/spec.json'）が発生する。

`spec-path-ssot-refactor` 設計原則の適用漏れ。他のハンドラー（READ_SPEC_JSON, UPDATE_APPROVAL等）では正しくresolveSpecPathが適用されているが、START_IMPLとAUTO_EXECUTION_STARTでは欠落している。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-21T07:45:50Z
- Affected Component: electron-sdd-manager/src/main/ipc/handlers.ts, autoExecutionHandlers.ts
- Severity: High (worktreeモードでの実装開始が不可能)

## Steps to Reproduce
1. worktreeモードでspecを作成
2. document-review-replyまで完了
3. 「実装開始」ボタンをクリック
4. ENOENT エラーが発生

## Expected Behavior
worktreeモードでも正常に実装フェーズが開始される

## Actual Behavior
`ENOENT: no such file or directory, open 'spec-event-log/spec.json'` エラー

## Error Messages / Logs
```
ENOENT: no such file or directory, open 'spec-event-log/spec.json'
```

## Related Files
- [handlers.ts:2193-2225](electron-sdd-manager/src/main/ipc/handlers.ts#L2193-L2225) - START_IMPL handler
- [autoExecutionHandlers.ts:137-144](electron-sdd-manager/src/main/ipc/autoExecutionHandlers.ts#L137-L144) - AUTO_EXECUTION_START handler
- [startImplPhase.ts](electron-sdd-manager/src/main/ipc/startImplPhase.ts) - 呼び出される関数

## Additional Context
`spec-path-ssot-refactor` の設計原則:
- RendererからはspecName（名前のみ）を送信
- Main ProcessでFileService.resolveSpecPathを使用してフルパスを解決
- 他のハンドラーはすべてこのパターンに従っている
