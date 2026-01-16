# Bug Fix: agent-log-auto-select-rule

## Summary
Agentログエリアの自動選択ルールを変更。実行中Agentを最優先し、なければAgentログエリアを空にする新しいロジックを実装。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/shared/stores/agentStore.ts` | `autoSelectAgentForSpec`を新しい自動選択ルールに変更 |
| `electron-sdd-manager/src/renderer/stores/bugStore.ts` | Bug選択時に`autoSelectAgentForSpec`を呼び出すよう追加 |
| `electron-sdd-manager/src/shared/stores/agentStore.test.ts` | 新しいロジックに合わせてテストケースを更新 |

### Code Changes

#### 1. shared/stores/agentStore.ts - 型定義の更新
```diff
-  autoSelectAgentForSpec: (specId: string) => void;
+  autoSelectAgentForSpec: (specId: string | null) => void;
```

#### 2. shared/stores/agentStore.ts - autoSelectAgentForSpec実装の修正
```diff
-  autoSelectAgentForSpec: (specId: string) => {
+  autoSelectAgentForSpec: (specId: string | null) => {
     const state = get();

-    // Check for saved selection
-    const savedAgentId = state.selectedAgentIdBySpec.get(specId);
-    if (savedAgentId) {
-      // Verify agent still exists
-      const savedAgent = state.agents.get(savedAgentId);
-      if (savedAgent) {
-        set({ selectedAgentId: savedAgentId });
+    // Bug fix: agent-log-auto-select-rule
+    // 新しい自動選択ルール: 実行中Agentを最優先、なければAgentログエリアを空にする
+
+    // Case 1: spec/bugが未選択（specId === null）
+    if (specId === null) {
+      const allRunningAgents = Array.from(state.agents.values())
+        .filter((agent) => agent.status === 'running');
+
+      if (allRunningAgents.length === 0) {
+        set({ selectedAgentId: null });
         return;
       }
+
+      const sortedAgents = allRunningAgents.sort((a, b) => {
+        const timeA = new Date(a.startedAt).getTime();
+        const timeB = new Date(b.startedAt).getTime();
+        return timeB - timeA;
+      });
+
+      set({ selectedAgentId: sortedAgents[0].id });
+      return;
     }

-    // Get agents for this spec
+    // Case 2: spec/bugが選択されている
     const specAgents = Array.from(state.agents.values()).filter(
       (agent) => agent.specId === specId
     );

-    // Filter to running agents only (Requirement 3.1)
     const runningAgents = specAgents.filter((agent) => agent.status === 'running');

     if (runningAgents.length === 0) {
-      // No running agents - don't auto-select (Requirement 3.1)
+      set({ selectedAgentId: null });
       return;
     }
```

#### 3. renderer/stores/bugStore.ts - autoSelectAgentForSpec呼び出し追加
```diff
       await window.electronAPI.switchAgentWatchScope(`bug:${bug.name}`);

+      // Bug fix: agent-log-auto-select-rule
+      // Auto-select running agent for this bug (consistent with specDetailStore behavior)
+      const { useSharedAgentStore } = await import('../../shared/stores/agentStore');
+      useSharedAgentStore.getState().autoSelectAgentForSpec(`bug:${bug.name}`);
+      console.log('[bugStore] Auto-selected agent for bug:', bug.name);
+
       const bugDetail = await window.electronAPI.readBugDetail(bug.path);
```

## Implementation Notes

### 新しい自動選択ルール

| 状態 | 条件 | 動作 |
|-----|------|------|
| 未選択 (specId === null) | 実行中Agentあり | グローバルで最新の実行中Agentを選択 |
| 未選択 (specId === null) | 実行中Agentなし | selectedAgentId = null (ログエリア空) |
| 選択中 (specId !== null) | そのspec/bugで実行中Agentあり | 最新の実行中Agentを選択 |
| 選択中 (specId !== null) | そのspec/bugで実行中Agentなし | selectedAgentId = null (ログエリア空) |

### 変更の理由

1. **実行中Agent優先**: ユーザーは実行状況を見たいため、保存された選択状態より実行中Agentを優先
2. **ログエリア空表示**: 実行中Agentがない場合は「ログがありません」を表示してユーザーに状態を明示
3. **Spec/Bug間の一貫性**: specDetailStoreとbugStoreで同じautoSelectAgentForSpecを使用

## Breaking Changes
- [x] Breaking changes (documented below)

**影響**: 以前の選択状態が復元されなくなる
- 旧動作: Spec選択時に以前選択したAgentが自動復元
- 新動作: 実行中Agentがある場合はそれを選択、なければログエリアを空に

これは意図した動作変更であり、ユーザーが実行状況を把握しやすくなる改善です。

## Rollback Plan
以下のファイルを変更前の状態に戻す:
1. `electron-sdd-manager/src/shared/stores/agentStore.ts`
2. `electron-sdd-manager/src/renderer/stores/bugStore.ts`
3. `electron-sdd-manager/src/shared/stores/agentStore.test.ts`

## Related Commits
- *Pending verification*

## Test Results
```
 ✓ src/shared/stores/agentStore.test.ts (19 tests) 4ms

 Test Files  1 passed (1)
      Tests  19 passed (19)
```

TypeScript型チェック: Pass
