# Bug Report: requirement-file-update-not-reflected

## Overview
requirement.mdを開いているときに、requirementのagentが完了してファイルを書き換えても、Electron上の画面が書き換わらない（Specを選択すると治る）。Spec選択を内部的に叩くような雑な方式ではなく、ちゃんとファイルを監視して更新してほしい。

### 追加報告: Agent起動中のファイル編集が妨害される
Agent起動中に*.mdファイルを手動で編集しようとすると、内部的にSpec選択が繰り返し走っているのか、編集内容が元に戻されてしまう。ユーザーの編集操作が妨害され、非常に使いづらい。

## Status
**Verified**

## Environment
- Date Reported: 2026-01-01T13:30:00+09:00
- Affected Component: specStore.ts, WorkflowView.tsx, AutoExecutionService.ts
- Severity: High

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
- 類似のバグ `.kiro/bugs/spec-file-watcher-not-updating-ui/` が存在する可能性あり（関連性を分析時に確認すること）
