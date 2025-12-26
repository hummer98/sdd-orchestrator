# Bug Report: agent-list-panel-dry-violation

## Overview
AgentListPanelとBugAgentListPanelが分離されているが、319行中約310行が完全に重複している。DRY原則に違反しており、保守性に問題がある。統一コンポーネントへリファクタリングすべき。

## Status
**Pending**

## Environment
- Date Reported: 2025-12-27T13:45:00+09:00
- Affected Component: AgentListPanel, BugAgentListPanel
- Severity: Low (技術的負債)

## Steps to Reproduce
1. `AgentListPanel.tsx` と `BugAgentListPanel.tsx` を比較
2. 差分がわずか3点（Store、specId計算、data-testid）のみであることを確認
3. それ以外の約310行が完全に重複

## Expected Behavior
共通ロジックは単一のコンポーネントに統合され、propsで差分を吸収すべき

## Actual Behavior
2つの別々のファイルに同一コードが重複して存在

## Error Messages / Logs
```
N/A - 技術的負債の問題
```

## Related Files
- electron-sdd-manager/src/renderer/components/AgentListPanel.tsx
- electron-sdd-manager/src/renderer/components/BugAgentListPanel.tsx

## Additional Context
推奨される統合設計：
```tsx
interface AgentListPanelProps {
  specId: string;          // 'specName' または 'bug:bugName'
  testId?: string;
}
```
