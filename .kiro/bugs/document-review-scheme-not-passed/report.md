# Bug Report: document-review-scheme-not-passed

## Overview
ドキュメントレビューパネルでレビュー方法を「gemini」に設定しても、実際にはClaudeが起動される。`handleStartDocumentReview`関数で`scheme`パラメータが`window.electronAPI.execute()`に渡されていないことが原因。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-25T10:15:15Z
- Affected Component: `electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts`
- Severity: Medium

## Steps to Reproduce
1. Electronアプリでドキュメントレビューパネルを開く
2. レビュー方法のドロップダウンで「gemini-cli」を選択
3. レビューを開始する
4. Claudeが起動される（Geminiではなく）

## Expected Behavior
選択したレビュー方法（gemini-cli）に対応するGemini CLIが起動される

## Actual Behavior
レビュー方法の設定に関わらず、常にClaudeが起動される

## Error Messages / Logs
```
N/A - エラーは発生しないが、期待と異なる動作
```

## Related Files
- `electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts:274-285` - `handleStartDocumentReview`
- `electron-sdd-manager/src/shared/types/executeOptions.ts:101-105` - `ExecuteDocumentReview`インターフェース

## Additional Context
- `documentReviewScheme`は129-131行目で取得済みだが、execute呼び出し時に渡されていない
- `handleExecuteDocumentReviewReply`と`handleApplyDocumentReviewFix`も同様の問題がある可能性
