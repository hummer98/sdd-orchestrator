# Bug Fix: verify-button-agent-list

## Summary
bugsワークフローのアクションボタン（Analyze, Fix, Verify）で起動されたAgentがAgent一覧に表示されない問題を修正。specId形式を`bug:{name}`形式に統一した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/BugActionButtons.tsx` | specIdを`''`から`bug:${bug.name}`に変更 |
| `electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx` | specIdを`selectedBug.name`から`bug:${selectedBug.name}`に変更（2箇所） |
| `electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts` | specIdを`selectedBug.name`から`bug:${selectedBug.name}`に変更 |
| `electron-sdd-manager/src/renderer/components/BugActionButtons.test.tsx` | テストの期待値を更新 |
| `electron-sdd-manager/src/renderer/components/BugWorkflowView.test.tsx` | テストの期待値を更新 |

### Code Changes

#### BugActionButtons.tsx
```diff
-      // Start agent with bug workflow command
-      // specId is empty string for global agents (bug workflow is not tied to a specific spec)
-      const agentId = await startAgent(
-        '', // Global agent (not spec-specific)
+      // Start agent with bug workflow command
+      // Use bug:{name} format for specId to match BugPane's AgentListPanel filtering
+      const agentId = await startAgent(
+        `bug:${bug.name}`, // Bug-specific agent with consistent naming
```

#### BugWorkflowView.tsx (runningPhases)
```diff
   // Get running phases for the selected bug
+  // Use bug:{name} format to match AgentListPanel filtering
   const runningPhases = useMemo(() => {
     if (!selectedBug) return new Set<string>();
-    const bugAgents = getAgentsForBug(selectedBug.name);
+    const bugAgents = getAgentsForBug(`bug:${selectedBug.name}`);
```

#### BugWorkflowView.tsx (handleExecutePhase)
```diff
       await window.electronAPI.startAgent(
-        selectedBug.name, // Use bug name as specId for grouping
+        `bug:${selectedBug.name}`, // Use bug:{name} format for consistent AgentListPanel filtering
         phase,
```

#### BugAutoExecutionService.ts
```diff
       const agentInfo = await window.electronAPI.startAgent(
-        selectedBug.name,
+        `bug:${selectedBug.name}`, // Use bug:{name} format for consistent AgentListPanel filtering
         phase,
```

## Implementation Notes
- BugPane.tsx (91行目) では既に`bug:${selectedBug.name}`形式でAgentListPanelにspecIdを渡していた
- agentStore.ts (435-445行目) のイベントリスナーも`bug:`プレフィックスを期待していたため、今回の修正により一貫性が取れるようになった
- 全てのバグ関連Agent起動箇所で`bug:{name}`形式を使用するように統一

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. 各ファイルのspecIdを元の形式に戻す
   - BugActionButtons.tsx: `''`
   - BugWorkflowView.tsx: `selectedBug.name`
   - BugAutoExecutionService.ts: `selectedBug.name`
2. テストファイルの期待値を元に戻す

## Related Commits
- (コミット前)
