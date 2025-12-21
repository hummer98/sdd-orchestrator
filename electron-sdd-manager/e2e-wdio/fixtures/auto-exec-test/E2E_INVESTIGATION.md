# E2Eテスト調査レポート: 自動実行レースコンディション問題

## 調査日時
2025-12-22

## 調査対象
- テストファイル: `simple-auto-execution.e2e.spec.ts`
- 対象コンポーネント: `AutoExecutionService.ts`

---

## 1. 発見した問題

### 1.1 レースコンディション

**症状**: モックCLIが高速に完了すると、自動実行が完了状態に遷移しない

**根本原因**:
1. `executePhase` IPCを呼び出す
2. モックCLIが即座に完了（デフォルト遅延: 0.1秒）
3. mainプロセスが`onAgentStatusChange`でcompletedイベントをrendererに送信
4. しかし、`trackedAgentIds`にはまだagentIdが追加されていない
5. イベントが無視され、自動実行が完了しない

**証拠**:
- モック遅延0.1秒: テスト失敗（ボタンが「停止」のまま）
- モック遅延2秒: テスト成功（ボタンが「自動実行」に戻る）

```
# ログでの確認
[22:33:38.373Z] executePhase succeeded {"agentId":"agent-..."}
[22:33:38.727Z] Agent status change {"agentId":"...","status":"completed"}
# ↑ 354ms後にイベントが届くが、タイミングによっては処理されない
```

---

## 2. 実装した修正

### 2.1 handleDirectStatusChange の修正

**変更前**:
- `pendingAgentId`と`isAwaitingPhaseExecution`フラグで制御
- 複雑なロジックでバッファリングを試みるが、タイミング問題で機能しない

**変更後**:
```typescript
private handleDirectStatusChange(agentId: string, status: string): void {
  if (!useWorkflowStore.getState().isAutoExecuting) return;

  // シンプル化: 未知のagentIdは常にバッファリング
  if (!this.trackedAgentIds.has(agentId)) {
    this.pendingEvents.set(agentId, status);
    return;
  }
  // ... 以降の処理
}
```

### 2.2 executePhase の修正

```typescript
// IPCコール後、即座にagentIdを追加
if (agentInfo && agentInfo.agentId) {
  this.trackedAgentIds.add(agentInfo.agentId);

  // バッファされたイベントがあれば処理
  const bufferedStatus = this.pendingEvents.get(agentInfo.agentId);
  if (bufferedStatus) {
    this.pendingEvents.delete(agentInfo.agentId);
    this.handleDirectStatusChange(agentInfo.agentId, bufferedStatus);
  }
}
```

### 2.3 不要な変数の削除

- `pendingAgentId`: 不要になった
- `isAwaitingPhaseExecution`: 不要になった

---

## 3. 現在のテスト結果

### 成功するテスト (5/10)
1. ✓ should show requirements auto-execution permission as ON
2. ✓ should have auto-execute button enabled
3. ✓ should show spec in spec-list with correct state
4. ✓ should change auto-execute button to stop button
5. ✓ should restore auto-execute button to enabled state（修正により安定化）

### 失敗するテスト (5/10)
1. ✖ should disable requirements execute button during execution
2. ✖ should disable all validate buttons during execution
3. ✖ should show new agent session in project-agent-panel
4. ✖ should update requirements.md in main panel UI
5. ✖ should show agent session as completed in project-agent-panel

---

## 4. 残存する問題

### 4.1 ボタン無効化のタイミング問題
- 実行開始直後にボタンのdisabled状態を確認しているが、UI更新が間に合わない可能性
- テストでの待機時間調整が必要

### 4.2 エージェントパネル表示問題
- `project-agent-panel`にエージェントが表示されない
- agentStoreへの登録タイミングまたはUI更新の問題

### 4.3 UI更新検出問題
- requirements.mdの更新がメインパネルに反映されない
- ファイル変更検知またはUI再レンダリングの問題

---

## 5. 推奨する追加調査

1. **agentStoreの状態確認**: テスト中にagentStoreの状態をログ出力
2. **ファイル変更検知の確認**: specsWatcherServiceが正しく動作しているか
3. **テストタイミングの調整**: `browser.pause()`の時間を増やして確認
4. **AutoExecutionServiceのシングルトン問題**: テスト間で状態がリセットされているか確認

---

## 6. 環境情報

- Electron: v35.5.1
- Chromedriver: v134.0.6998.205
- Mock CLI遅延: 0.1秒（wdio.conf.ts設定）
- テストフレームワーク: WebdriverIO + Mocha
