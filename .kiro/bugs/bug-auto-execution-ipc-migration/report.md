# Bug Report: bug-auto-execution-ipc-migration

## Overview
BugAutoExecutionService（Renderer Process）がMain Process側のBugAutoExecutionCoordinatorを使用していない。Phase 1でMain Process側インフラ（BugAutoExecutionCoordinator、IPCハンドラー）を構築したが、Renderer側のサービスはまだローカル状態管理を使用しており、IPCクライアントへのリファクタリングが必要。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-16T11:45:00+09:00
- Affected Component: BugAutoExecutionService (Renderer Process)
- Severity: Medium

## Steps to Reproduce
1. Bug自動実行を開始
2. Main Process側のBugAutoExecutionCoordinatorに状態が反映されない
3. Renderer側のローカル状態のみが更新される

## Expected Behavior
- BugAutoExecutionServiceがIPC経由でMain ProcessのBugAutoExecutionCoordinatorを呼び出す
- 状態変更はIPCイベントで受信
- Spec自動実行（useAutoExecution）と同様のアーキテクチャ

## Actual Behavior
- BugAutoExecutionServiceがRenderer Process内でローカル状態を管理
- Main ProcessのBugAutoExecutionCoordinatorは未使用

## Error Messages / Logs
```
N/A - 機能的には動作するが、アーキテクチャが不整合
```

## Related Files
- `electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts`
- `electron-sdd-manager/src/main/services/bugAutoExecutionCoordinator.ts` (Phase 1で作成済み)
- `electron-sdd-manager/src/main/ipc/bugAutoExecutionHandlers.ts` (Phase 1で作成済み)
- `electron-sdd-manager/src/renderer/hooks/useBugAutoExecution.ts`

## Additional Context
- Phase 1完了: `475a61c` fix(auto-execution-ui-state-dependency)
- 参考実装: `useAutoExecution.ts` (Spec自動実行のIPCクライアントパターン)
