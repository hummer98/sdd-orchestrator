# Bug Report: spec-json-to-workflowstore-sync-missing

## Overview
spec.json選択時にautoExecution設定がworkflowStoreに同期されない。documentReviewFlagやpermissionsがspec.jsonに保存されていても、spec切替時にworkflowStoreに反映されないため、UIと実際の動作が乖離する

## Status
**Fixed**

## Environment
- Date Reported: 2026-01-04T09:10:00.000Z
- Date Fixed: 2026-01-04T09:32:00.000Z
- Affected Component: specDetailStore / workflowStore sync
- Severity: High

## Steps to Reproduce
1. spec.jsonに`autoExecution.documentReviewFlag: "run"`を設定
2. アプリを起動してspecを選択
3. workflowStoreの`documentReviewOptions.autoExecutionFlag`が'run'にならない（'pause'のまま）

## Expected Behavior
spec選択時にspec.json.autoExecutionの設定がworkflowStoreに反映される

## Actual Behavior
spec.jsonの値が読み込まれるが、workflowStoreには同期されず、LocalStorage由来のデフォルト値が使われ続ける

## Error Messages / Logs
```
E2E Test Failure:
Expected: "run"
Received: "skip"
```

## Related Files
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts` - Root cause (sync missing)
- `electron-sdd-manager/src/renderer/stores/workflowStore.ts` - Sync methods exist but unused
- `e2e-wdio/auto-execution-document-review.e2e.spec.ts` - Test also had API mismatch

## Fix Applied
`specDetailStore.selectSpec()`内でworkflowStoreへの同期処理を追加（lines 131-154）

## Verification
E2E Test Results:
- Before fix: 1 passing, 4 failing
- After fix: 3 passing, 2 failing
  - Scenario 1 (skip flag): PASS
  - Scenario 2 (run flag): PASS ← Previously failing
  - Scenario 3 (pause flag): PASS ← Previously failing
  - Scenario 4 (UI visibility): Failing (separate issue - test data-testid mismatch)
