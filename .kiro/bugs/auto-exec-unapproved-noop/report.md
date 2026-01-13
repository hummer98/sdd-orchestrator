# Bug Report: auto-exec-unapproved-noop

## Overview
未承認の要件定義がある状態で自動実行ボタンを押しても、エージェントが起動せず何も起きない。一瞬「停止」ボタンが表示された後すぐに戻り、エラー通知もない。期待される動作は、未承認フェーズを自動承認して次のフェーズから実行を開始すること。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-14T14:30:00+09:00
- Affected Component: AutoExecutionCoordinator
- Severity: Medium

## Steps to Reproduce
1. spec を作成し、要件定義フェーズを実行する
2. 要件定義が生成されたら、承認せずに「自動実行」ボタンを押す
3. 一瞬「停止」ボタンが表示されるが、すぐに「自動実行」に戻る

## Expected Behavior
未承認フェーズを自動承認し、次のフェーズ（設計）から実行を開始する

## Actual Behavior
エージェントが起動せず、即座に自動実行が「完了」扱いになる。エラー通知もない。

## Error Messages / Logs
```
[AutoExecutionCoordinator] No permitted phases, completing immediately
```

## Related Files
- `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts`
  - `getLastCompletedPhase()`: generated を「完了」扱いにしている（行736-743）
  - `getNextPermittedPhase()`: 前フェーズ未承認でスキップ（行752-775）
  - `isPreviousPhaseApproved()`: 承認チェック（行783-796）

## Additional Context
根本原因: `getLastCompletedPhase` が `generated: true` のフェーズを「完了済み」と判定するため、未承認の要件定義がスキップされる。その結果、後続フェーズはすべて「前フェーズ未承認」でスキップされ、実行可能フェーズがなくなる。
