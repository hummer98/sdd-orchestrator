# Bug Analysis: auto-approval-stopped

## Summary
Specワークフローの自動実行で、requirements完了後にdesignフェーズに進まず停止する問題。

## Root Cause

### 技術詳細
- **Location**: `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts`
- **Component**: AutoExecutionService / IPCイベントハンドリング
- **Trigger**: エージェント完了イベントの検出・処理に失敗

### 推定される原因

**仮説1: IPCイベントリスナーの重複登録問題**
- `AutoExecutionService`と`agentStore`の両方が`onAgentStatusChange`をリッスン
- リスナーが複数回登録されるか、不適切にクリーンアップされている可能性

**仮説2: trackedAgentIds/agentToSpecMapのマッピング問題**
- `executePhaseForContext`でエージェント起動後に`agentId`が正しくマッピングされない
- バッファリングされたイベントが処理されない

**仮説3: getAutoExecutionRuntime状態の不整合**
- `specStore.getAutoExecutionRuntime(specId).isAutoExecuting`が`false`になっている
- `handleDirectStatusChange`がイベントを無視

**仮説4: hasRunningAgentチェックの失敗**
- `agentStore`のステータス更新が遅延している
- 前フェーズのエージェントがまだ`running`と判定される

### 関連コード

```typescript
// AutoExecutionService.ts:625-630
const runtime = specStore.getAutoExecutionRuntime(specId);
if (!runtime.isAutoExecuting) {
  console.log(`[AutoExecutionService] Spec ${specId} not auto-executing, ignoring status change`);
  return;
}

// AutoExecutionService.ts:329-340
const specAgents = agentStore.getAgentsForSpec(specDetail.metadata.name);
const hasRunningAgent = specAgents.some((agent) => agent.status === 'running');
if (hasRunningAgent) {
  return { valid: false, waitingForAgent: true, ... };
}
```

## Impact Assessment
- **Severity**: High
- **Scope**: 自動実行機能を使用するすべてのSpecワークフロー
- **Risk**: 手動でフェーズを進める必要があり、ワークフローの自動化が機能しない

## Proposed Solution

### デバッグ手順

1. **Electronアプリのコンソールログを確認**
   - DevTools を開く: `Cmd+Option+I` または メニュー > 表示 > 開発者ツール
   - Console タブで以下のログを確認:
     - `[AutoExecutionService] handleDirectStatusChange: ...`
     - `[AutoExecutionService] Processing status change: ...`
     - `[AutoExecutionService] Spec ${specId} not auto-executing, ignoring status change`
     - `[AutoExecutionService] No context for specId=...`

2. **サービス状態を確認**
   - コンソールで以下を実行:
   ```javascript
   window.__AUTO_EXECUTION_SERVICE__.getDebugInfo()
   ```
   - `trackedAgentIds`、`agentToSpecMap`、`executionContexts`を確認

### Option 1: ログ確認後の修正（推奨）
- ログで問題箇所を特定してからピンポイントで修正
- Pros: 正確な原因特定、最小限の変更
- Cons: デバッグ作業が必要

### Option 2: イベントリスナー登録の見直し
- `setupDirectIPCListener`の登録タイミングとクリーンアップを改善
- Pros: 根本的な解決になる可能性
- Cons: 広範囲な変更が必要

### Recommended Approach
まずデバッグ手順1-2を実行し、具体的なログを確認して原因を特定してから修正を行う。

## Dependencies
- `electron-sdd-manager/src/renderer/stores/agentStore.ts`
- `electron-sdd-manager/src/renderer/stores/specStore.ts`
- `electron-sdd-manager/src/main/ipc/handlers.ts`

## Testing Strategy
1. DevToolsコンソールログで問題のパターンを特定
2. 該当するユニットテストを追加/修正
3. E2Eテスト `auto-execution-workflow.e2e.spec.ts` で回帰テスト
