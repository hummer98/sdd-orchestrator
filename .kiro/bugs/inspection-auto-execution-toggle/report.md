# Bug Report: inspection-auto-execution-toggle

## Overview
Inspectionの自動実行設定ボタンを押してもリロードされるだけで切り替わらない。file watcherが存在するにも関わらず、handleInspectionAutoExecutionFlagChangeで不要なrefreshSpecs()を呼んでいるため、file watcherより先に古い状態でUIが再構築される。

## Status
**Verified**

## Environment
- Date Reported: 2026-01-13T12:00:00+09:00
- Affected Component: WorkflowView / InspectionPanel
- Severity: Medium

## Steps to Reproduce
1. Electronアプリでspec詳細画面を開く
2. InspectionPanelの自動実行設定ボタン（run/pause/skip）をクリック
3. UIがリロードされるが、設定が切り替わらない

## Expected Behavior
ボタンをクリックすると設定が切り替わり、UIに反映される

## Actual Behavior
ボタンをクリックするとUIがリロードされるが、設定は元のまま表示される

## Error Messages / Logs
```
エラーメッセージなし。ただしrefreshSpecs()がfile watcherより先に実行されることで古い状態が表示される
```

## Related Files
- electron-sdd-manager/src/renderer/components/WorkflowView.tsx:434-447 (handleInspectionAutoExecutionFlagChange)
- electron-sdd-manager/src/renderer/services/specWatcherService.ts:134-137 (spec.json変更検知)

## Additional Context
DocumentReviewPanelは同様の問題がない（workflowStoreのメソッドを使用）。InspectionPanelのみIPC経由でspec.jsonを直接更新し、その後不要なrefreshSpecs()を呼んでいる。
