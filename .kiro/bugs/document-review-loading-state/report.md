# Bug Report: document-review-loading-state

## Overview
DocumentReviewPanelのローディング表示条件に不整合がある。`reviewState?.status === 'in_progress'` の条件が、Agent終了後も `status` が `'in_progress'` のまま残り続けるため、誤ってローディング表示が継続する可能性がある。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-16T12:00:00+09:00
- Affected Component: DocumentReviewPanel (shared/components/review/DocumentReviewPanel.tsx)
- Severity: Medium

## Steps to Reproduce
*To be documented*

1. Document Review を開始
2. Review Agent が完了
3. `status` が `'in_progress'` のままだとローディング表示が継続

## Expected Behavior
Agent が終了したらローディング表示が停止すること

## Actual Behavior
`isExecuting` が `false` でも `status === 'in_progress'` だとローディング表示が継続する可能性がある

## Error Messages / Logs
```
*To be captured*
```

## Related Files
- electron-sdd-manager/src/shared/components/review/DocumentReviewPanel.tsx:69
- electron-sdd-manager/src/main/services/documentReviewService.ts (completeRound が status を更新しない)

## Additional Context
調査により以下が判明：
- `startReviewRound()` で `status: 'in_progress'` が設定される
- `completeRound()` は `status` を更新しない
- `status: 'approved'` は AI Agent が直接 spec.json を編集する
- ローディング条件 `isExecuting || reviewState?.status === 'in_progress'` の後者が stale になる可能性
