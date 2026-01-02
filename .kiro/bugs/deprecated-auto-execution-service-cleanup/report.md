# Bug Report: deprecated-auto-execution-service-cleanup

## Overview
auto-execution-main-process機能の実装は完了しているが、旧AutoExecutionService（Renderer側）が@deprecated付きで残存したままになっている。Task 10.3「旧AutoExecutionServiceのクリーンアップ」で「非推奨期間経過後」とされているが、期間が明示されておらず削除が後回しになっている。新旧コードの混在が「実行状態の二重管理」問題を複雑化させている可能性がある。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-03T15:30:00+09:00
- Affected Component: electron-sdd-manager/src/renderer/services/AutoExecutionService.ts
- Severity: Medium

## Steps to Reproduce
1. `auto-execution-main-process` specのtasks.mdを確認
2. Task 10.3が完了マークされているが、実際のコードを確認
3. `AutoExecutionService.ts`がまだ1300行以上のコードとして残存

## Expected Behavior
- Main Process移行完了後、旧コードは削除されているべき
- `useAutoExecution` Hook経由でのみ自動実行が制御される

## Actual Behavior
- `AutoExecutionService.ts`が@deprecatedマーク付きで残存
- `getAutoExecutionService()`がまだ呼び出し可能
- 新旧両方のコードパスが存在

## Error Messages / Logs
```
[AutoExecutionService] DEPRECATED: This Renderer-based service will be replaced by Main Process-based AutoExecutionCoordinator.
```

## Related Files
- electron-sdd-manager/src/renderer/services/AutoExecutionService.ts (削除対象)
- electron-sdd-manager/src/renderer/services/AutoExecutionService.test.ts
- electron-sdd-manager/src/renderer/services/AutoExecutionService.parallel.test.ts
- electron-sdd-manager/src/renderer/services/AutoExecutionService.integration.test.ts
- electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts (新しい実装)

## Additional Context
- design-review-20260102.mdで指摘された「Duplicated Execution Logic」問題の根本原因
- 削除により状態管理の単純化が期待できる
- 削除前に呼び出し箇所の完全な移行確認が必要
