# Bug Report: bug-phase-button-visibility

## Overview
BugWorkflowViewコンポーネントにおいて、フェーズが完了済み（status === 'completed'）の状態でも実行ボタンが表示され続ける問題。BugPhaseItem.tsxの95行目の条件に`isCompleted`のチェックが欠落している。

## Status
**Pending**

## Environment
- Date Reported: 2025-12-26T06:15:00.000Z
- Affected Component: BugPhaseItem.tsx, BugWorkflowView.tsx
- Severity: Low (UI/UX issue)

## Steps to Reproduce
1. Bugsタブで完了済み（verified）のバグを選択
2. 右ペインのBugWorkflowViewを確認
3. Report以外のフェーズ（Analyze, Fix, Verify, Deploy）に実行ボタンが表示される

## Expected Behavior
完了済みフェーズでは実行ボタンを非表示にするか、「再実行」として区別して表示する

## Actual Behavior
完了済みフェーズでも実行ボタンが表示され続ける（disabledではあるが非表示にならない）

## Error Messages / Logs
```
なし（機能的には動作するが、UIが紛らわしい）
```

## Related Files
- electron-sdd-manager/src/renderer/components/BugPhaseItem.tsx:95
- electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx:154

## Additional Context
BugPhaseItem.tsx 95行目の条件:
```tsx
{showExecuteButton && !isExecuting && (
```
これを以下に修正する必要がある:
```tsx
{showExecuteButton && !isExecuting && !isCompleted && (
```
