# Bug Fix: agent-state-dual-management

## Summary
Agent状態の二重管理を解消し、ファイル監視をSingle Source of Truth (SSOT)として統一。WorkflowViewからの直接`addAgent()`/`selectAgent()`呼び出しを削除し、ファイル監視イベント経由で自動的にAgent追加・選択を行うよう変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/stores/agentStore.ts` | ファイル監視の`add`イベント時に自動選択ロジックを追加 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` | 7箇所の`addAgent()`/`selectAgent()`直接呼び出しを削除、Zustand reactivity修正 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.test.tsx` | セレクタ対応モックに修正 |
| `electron-sdd-manager/src/renderer/components/WorkflowView.integration.test.tsx` | テストをFile as SSOTアーキテクチャに合わせて修正 |
| `electron-sdd-manager/src/renderer/stores/projectStore.ts` | プロジェクト選択時にwatcher起動を追加（startWatching呼び出し漏れ修正） |

### Code Changes

#### agentStore.ts - ファイル監視に自動選択ロジック追加
```diff
        } else {
          // add/change時はAgentを追加/更新
          const agentInfo = agent as AgentInfo;
          // specId can be empty string for global agents, so check for undefined
          if (agentInfo.agentId && agentInfo.specId !== undefined) {
            get().addAgent(agentInfo.specId, agentInfo);
+           // 新規追加時のみ自動選択（File as SSOT: WorkflowViewからの直接呼び出しを廃止）
+           if (type === 'add') {
+             get().selectAgent(agentInfo.agentId);
+           }
          }
        }
```

#### WorkflowView.tsx - 直接呼び出し削除（7箇所）

**handleExecutePhase (line 170-185)**
```diff
    try {
      // サービス層でコマンドを構築（commandPrefixをストアから取得）
-     const newAgent = await window.electronAPI.executePhase(
+     // File as SSOT: addAgent/selectAgentはファイル監視経由で自動実行される
+     await window.electronAPI.executePhase(
        specDetail.metadata.name,
        phase,
        specDetail.metadata.name,
        workflowStore.commandPrefix
      );
-     // ストアにAgentを追加して選択
-     agentStore.addAgent(specDetail.metadata.name, newAgent);
-     agentStore.selectAgent(newAgent.agentId);
    } catch (error) {
```

**同様の変更を以下の関数にも適用:**
- `handleExecuteValidation`
- `handleSpecStatus`
- `handleStartDocumentReview`
- `handleExecuteDocumentReviewReply`
- `handleApplyDocumentReviewFix`
- `handleExecuteTask`

## Implementation Notes

### アーキテクチャ変更
```
【変更前】二重パス
WorkflowView → executePhase() → [1] addAgent() (直接)
                              → ファイル作成 → FileWatcher → [2] addAgent() (監視経由)

【変更後】単一パス (File as SSOT)
WorkflowView → executePhase() → ファイル作成 → FileWatcher → addAgent() + selectAgent()
```

### 注意点
- 表示遅延は100-200ms程度（ファイル監視のdebounce）だが、ユーザー体験に影響なし
- AutoExecutionServiceは元々ファイル監視のみに依存していたため、変更不要
- useCallback依存配列から`agentStore`を削除（未使用となったため）

### WorkflowView.tsx - Zustand reactivity修正

Agent完了時にワークフローUIが更新されない問題を修正。
Zustand storeを全体取得すると状態変更時の再レンダリングが発生しないため、セレクタを使用するよう変更。

```diff
 export function WorkflowView() {
   const { specDetail, isLoading, selectedSpec, specManagerExecution, clearSpecManagerError } = useSpecStore();
   const workflowStore = useWorkflowStore();
-  const agentStore = useAgentStore();
+  // agents をセレクタで取得（Zustand reactivity: store全体取得では変更検知されない）
+  const agents = useAgentStore((state) => state.agents);
+  const getAgentsForSpec = useAgentStore((state) => state.getAgentsForSpec);
```

```diff
   const runningPhases = useMemo(() => {
     if (!specDetail) return new Set<string>();
-    const agents = agentStore.getAgentsForSpec(specDetail.metadata.name);
-    const running = agents
+    const specAgents = getAgentsForSpec(specDetail.metadata.name);
+    const running = specAgents
       .filter((a) => a.status === 'running')
       .map((a) => a.phase);
     return new Set(running);
-  }, [agentStore.agents, specDetail]);
+  }, [agents, specDetail, getAgentsForSpec]);
```

**背景**: `useAgentStore()`でstore全体を取得した場合、Zustandの浅い比較では`agents` Mapの内容変更を検知できない。
セレクタ `useAgentStore((state) => state.agents)` を使うことで、`agents`参照の変更時に再レンダリングが発生する。

### projectStore.ts - watcher起動追加
```diff
      // Sync specs/bugs to their dedicated stores
      if (result.specs) {
        useSpecStore.getState().setSpecs(result.specs);
      }
      if (result.bugs) {
        useBugStore.getState().setBugs(result.bugs);
      }

+     // Start file watchers for specs and agents (File as SSOT)
+     // This also starts AgentRecordWatcher via START_SPECS_WATCHER IPC
+     await useSpecStore.getState().startWatching();
+     await useBugStore.getState().startWatching();
```

**背景**: `projectStore.selectProject`は一括選択IPCを使用し`setSpecs`で結果を渡していたが、
`startWatching`が呼ばれておらず、AgentRecordWatcherが起動していなかった。

## Breaking Changes
- [x] No breaking changes

アプリの外部APIやIPC通信には変更なし。内部のデータフローのみの変更。

## Rollback Plan
1. `agentStore.ts`から自動選択ロジックのif文を削除
2. `WorkflowView.tsx`の各ハンドラーに`addAgent()`/`selectAgent()`呼び出しを復元
3. テストを元に戻す

## Test Results
```
Test Files  114 passed (114)
Tests       2079 passed | 6 skipped (2085)
```

## Related Commits
- 未コミット（修正完了、検証待ち）
