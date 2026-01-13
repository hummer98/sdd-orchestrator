# Bug Report: auto-execution-stop-not-working

## Overview
自動実行の停止ボタンを押しても、UIが実行状態のまま解除されない。Main ProcessでHMRが発生した後、Coordinatorの状態がリセットされるとstop()がNOT_EXECUTINGエラーを返すが、Renderer側の状態がリセットされないため、UIが「実行中」のまま残る。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-14T03:30:00Z
- Affected Component: autoExecutionStore.ts, WorkflowView.tsx
- Severity: Medium

## Steps to Reproduce
1. 自動実行を開始する
2. document-review-reply完了後にHMRが発生する（または手動でMain Processをリロード）
3. 停止ボタンを押す
4. UIが「実行中」のまま解除されない

## Expected Behavior
停止ボタンを押したら、Main Processの状態に関係なくRenderer側のUIが「停止」状態に戻る

## Actual Behavior
Main Processに状態がない場合（NOT_EXECUTINGエラー）、Renderer側の状態が更新されず、UIが「実行中」のまま

## Error Messages / Logs
```
エラーメッセージ「自動実行の停止に失敗しました。」が表示されるが、UIは変わらない
```

## Related Files
- electron-sdd-manager/src/renderer/components/WorkflowView.tsx:223-227
- electron-sdd-manager/src/renderer/hooks/useAutoExecution.ts:180-205
- electron-sdd-manager/src/renderer/stores/spec/autoExecutionStore.ts:194-202

## Additional Context
修正方針: stop()がNOT_EXECUTINGエラーを返した場合でも、Renderer側の状態をリセットすべき。これは「Main Processには既に実行状態がない」ことを意味するため、Renderer側も同期させる必要がある。
