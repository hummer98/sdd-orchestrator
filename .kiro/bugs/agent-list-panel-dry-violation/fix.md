# Bug Fix: agent-list-panel-dry-violation

## Summary
AgentListPanelとBugAgentListPanelを統合し、props化によりDRY原則違反を解消。約310行の重複コードを削除。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `AgentListPanel.tsx` | props（specId, testId）を追加、内部storeへの依存を削除 |
| `SpecPane.tsx` | AgentListPanelにspecIdをpropsとして渡すように変更 |
| `BugPane.tsx` | BugAgentListPanelからAgentListPanelに変更、specIdをpropsとして渡す |
| `index.ts` | BugAgentListPanelのエクスポートを削除 |
| `AgentListPanel.test.tsx` | props対応テストに更新 |

### Files Deleted
| File | Reason |
|------|--------|
| `BugAgentListPanel.tsx` | AgentListPanelに統合 |
| `BugAgentListPanel.test.tsx` | 重複テスト削除 |

### Code Changes

**AgentListPanel.tsx - Props interface追加**
```diff
-export function AgentListPanel() {
-  const { selectedSpec } = useSpecStore();
+interface AgentListPanelProps {
+  specId: string;
+  testId?: string;
+}
+
+export function AgentListPanel({ specId, testId = 'agent-list-panel' }: AgentListPanelProps) {
```

**SpecPane.tsx - specIdをpropsとして渡す**
```diff
-<AgentListPanel />
+<AgentListPanel specId={selectedSpec?.name || ''} />
```

**BugPane.tsx - BugAgentListPanelからAgentListPanelに変更**
```diff
-import { BugAgentListPanel } from './index';
+import { AgentListPanel } from './index';
...
-<BugAgentListPanel />
+<AgentListPanel
+  specId={selectedBug ? `bug:${selectedBug.name}` : ''}
+  testId="bug-agent-list-panel"
+/>
```

## Implementation Notes
- specIdの形式: Specs用は `specName`、Bugs用は `bug:{bugName}`
- testIdはデフォルト `agent-list-panel`、Bugs用は `bug-agent-list-panel` で後方互換性維持
- 呼び出し側（SpecPane/BugPane）でstoreからの値取得を行う設計

## Breaking Changes
- [x] No breaking changes

既存のE2Eテストは `data-testid` を使用しており、testIdプロップで互換性を維持。

## Rollback Plan
1. git revert でコミットを取り消し
2. 削除したBugAgentListPanel.tsxをgit checkoutで復元
3. index.tsのエクスポートを元に戻す

## Test Results
```
Test Files  1 passed (1)
     Tests  27 passed (27)
  Duration  903ms
```

## Related Commits
- (コミット後に記録)
