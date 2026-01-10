# Bug Fix: agent-log-textfield-inactive

## Summary
Zustandストアのセレクタパターンを修正し、`agents` Mapの変更時にAgentInputPanelとAgentLogPanelが正しく再レンダリングされるようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/agentStore.ts` | `getSelectedAgent`メソッドをinterfaceと実装に追加 |
| `electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx` | `getAgentById`パターンからセレクタパターンに変更 |
| `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx` | `getAgentById`パターンからセレクタパターンに変更 |

### Code Changes

**agentStore.ts - インターフェース追加:**
```diff
  // Helper methods
  getAgentById: (agentId: string) => AgentInfo | undefined;
+ getSelectedAgent: () => AgentInfo | undefined;
  getAgentsForSpec: (specId: string) => AgentInfo[];
```

**agentStore.ts - 実装追加:**
```diff
  getAgentById: (agentId: string) => {
    // ... existing code
  },

+ // Bug fix: agent-log-textfield-inactive
+ // selectedAgentIdに対応するAgentInfoを返す
+ // セレクタとして使用することで、agents Map変更時に正しく再レンダリングされる
+ getSelectedAgent: () => {
+   const { selectedAgentId, agents } = get();
+   if (!selectedAgentId) return undefined;
+   for (const agentList of agents.values()) {
+     const found = agentList.find((a) => a.agentId === selectedAgentId);
+     if (found) return found;
+   }
+   return undefined;
+ },

  getAgentsForSpec: (specId: string) => {
```

**AgentInputPanel.tsx:**
```diff
 export function AgentInputPanel() {
-  const { selectedAgentId, resumeAgent, getAgentById } = useAgentStore();
-
-  const [inputValue, setInputValue] = useState('');
-  const textareaRef = useRef<HTMLTextAreaElement>(null);
-
-  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;
+  const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
+  const resumeAgent = useAgentStore((state) => state.resumeAgent);
+  // Bug fix: agent-log-textfield-inactive
+  // セレクタでagentsをサブスクライブすることで、Agent状態変更時に再レンダリングされる
+  const agent = useAgentStore((state) => {
+    if (!state.selectedAgentId) return undefined;
+    for (const agentList of state.agents.values()) {
+      const found = agentList.find((a) => a.agentId === state.selectedAgentId);
+      if (found) return found;
+    }
+    return undefined;
+  });
+
+  const [inputValue, setInputValue] = useState('');
+  const textareaRef = useRef<HTMLTextAreaElement>(null);
```

**AgentLogPanel.tsx:**
```diff
 export function AgentLogPanel() {
-  const { selectedAgentId, clearLogs, getLogsForAgent, getAgentById } = useAgentStore();
-  const [isFormatted, setIsFormatted] = useState(true);
-
-  const logs = selectedAgentId ? getLogsForAgent(selectedAgentId) : [];
-  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;
-  const isRunning = agent?.status === 'running';
+  const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
+  const clearLogs = useAgentStore((state) => state.clearLogs);
+  const getLogsForAgent = useAgentStore((state) => state.getLogsForAgent);
+  // Bug fix: agent-log-textfield-inactive
+  // セレクタでagentsをサブスクライブすることで、Agent状態変更時に再レンダリングされる
+  const agent = useAgentStore((state) => {
+    if (!state.selectedAgentId) return undefined;
+    for (const agentList of state.agents.values()) {
+      const found = agentList.find((a) => a.agentId === state.selectedAgentId);
+      if (found) return found;
+    }
+    return undefined;
+  });
+  const [isFormatted, setIsFormatted] = useState(true);
+
+  const logs = selectedAgentId ? getLogsForAgent(selectedAgentId) : [];
+  const isRunning = agent?.status === 'running';
```

## Implementation Notes
- **根本原因**: `getAgentById`はストアのメソッドであり、呼び出し結果はZustandのサブスクリプション対象外
- **解決策**: セレクタ関数内で`agents` Mapを参照することで、Mapの変更を正しくサブスクライブ
- **パターン**: 分析で推奨されたOption A（ストアにヘルパーメソッドを追加し、各コンポーネントでセレクタパターンを使用）を採用
- ストアに`getSelectedAgent`メソッドも追加したが、各コンポーネントでは直接セレクタを使用（必要な依存関係を確実にサブスクライブするため）

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
各ファイルを修正前の状態に戻す:
1. `agentStore.ts`から`getSelectedAgent`の定義と実装を削除
2. `AgentInputPanel.tsx`を元の`getAgentById`パターンに戻す
3. `AgentLogPanel.tsx`を元の`getAgentById`パターンに戻す

## Related Commits
- *To be added after commit*
