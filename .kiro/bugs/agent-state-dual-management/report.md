# Bug Report: agent-state-dual-management

## Overview
Agent状態の二重管理により、UI表示とファイル状態が不整合になる問題。addAgent()直接呼び出しを廃止し、ファイル監視のみに統一する。

## Status
**Fixed**

## Environment
- Date Reported: 2025-12-20
- Affected Component: Agent State Management (renderer/main)
- Severity: Medium

## Steps to Reproduce

1. SDD Orchestratorでプロジェクトを開く
2. ワークフローフェーズを実行（例：designフェーズ）
3. Agent一覧を確認
4. HMR（ホットリロード）が発生、またはアプリを長時間使用
5. Agent一覧の状態がファイルの実際の状態と不整合になる

## Expected Behavior
- Agent一覧のステータスがファイル（.kiro/runtime/agents/）の内容と常に一致している
- エージェントが`completed`の場合、UIも完了状態を表示

## Actual Behavior
- ファイルでは`status: "completed"`なのに、UIでは`running`（スピナー表示）のままになる
- 状態の不整合が発生し、ユーザーに誤った情報が表示される

## Error Messages / Logs
```
// HMR時のエラー例
Attempted to register a second handler for 'ipc:show-open-dialog'

// 状態不整合時のログ
[AgentRecordWatcherService] File event { type: 'change', path: '...agent-xxx.json' }
// しかしUI更新が反映されない
```

## Related Files
- `electron-sdd-manager/src/renderer/stores/agentStore.ts` - Zustand store with `addAgent()`
- `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` - Direct `addAgent()` call (lines 180-183)
- `electron-sdd-manager/src/renderer/components/CreateSpecDialog.tsx` - Direct `addAgent()` call
- `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts` - No `addAgent()` call (relies on watcher)
- `electron-sdd-manager/src/main/services/agentRecordWatcherService.ts` - File watcher service
- `electron-sdd-manager/src/main/services/agentRegistry.ts` - Main process registry (also redundant)

## Root Cause Analysis

### 三重管理問題
Agent状態が3箇所で管理されている：
1. **ファイル** (`.kiro/runtime/agents/{specId}/agent-xxx.json`) - 永続化
2. **Main Process** (`AgentRegistry`) - オンメモリ
3. **Renderer Process** (`agentStore` Zustand) - UI状態

### 一貫性のない更新パターン
- `WorkflowView.tsx`: `executePhase()` → 直接`addAgent()` → ファイルも作成
- `AutoExecutionService.ts`: `executePhase()` → ファイル作成のみ（watcher経由でUI更新）
- 異なるコードパスで異なる更新方法を使用

## Proposed Fix

### アーキテクチャ変更: File as Single Source of Truth (SSOT)

1. **直接`addAgent()`呼び出しの廃止**
   - `WorkflowView.tsx`の`addAgent()`呼び出しを削除
   - `CreateSpecDialog.tsx`の`addAgent()`呼び出しを削除

2. **ファイル監視のみに統一**
   - `AGENT_RECORD_CHANGED`イベントの`add`時にUI更新
   - `add`イベント時に自動選択ロジックを追加

3. **期待される動作フロー**
   ```
   executePhase() → ファイル作成 → FileWatcher検知 → IPC送信 → addAgent() → UI更新
   ```

## Additional Context
- 多少の表示遅延（100-200ms）は許容可能と確認済み
- Main ProcessのAgentRegistryも将来的に廃止検討（ファイルのみに統一）
