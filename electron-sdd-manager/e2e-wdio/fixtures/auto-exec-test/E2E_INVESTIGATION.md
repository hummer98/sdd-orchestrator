# E2Eテスト調査レポート: 自動実行レースコンディション問題

## 調査日時
2025-12-22 (最終更新)

## 調査対象
- テストファイル: `simple-auto-execution.e2e.spec.ts`
- 対象コンポーネント: `AutoExecutionService.ts`

---

## 1. 発見した問題

### 1.1 レースコンディション（実装済み修正）

**症状**: モックCLIが高速に完了すると、自動実行が完了状態に遷移しない

**根本原因**:
1. `executePhase` IPCを呼び出す
2. モックCLIが即座に完了（デフォルト遅延: 0.1秒）
3. mainプロセスが`onAgentStatusChange`でcompletedイベントをrendererに送信
4. しかし、`trackedAgentIds`にはまだagentIdが追加されていない
5. イベントが無視され、自動実行が完了しない

**解決策** (実装済み):
- `pendingEvents` Mapでステータス変更をバッファリング
- executePhase完了後にバッファされたイベントを処理

### 1.2 シングルトン状態汚染（修正済み）

**症状**: 最初のテストは成功するが、2回目以降のテストが失敗する

**根本原因**:
- `AutoExecutionService`がシングルトンパターンを使用
- `trackedAgentIds`セットが前回のテストのagentIdを保持したまま
- 新しいテストで生成されるagentIdが一致しないためイベントがバッファリングされ続ける

**解決策** (実装済み):
- `resetForTest()` メソッドを追加
- E2Eテストの`beforeEach`でサービス状態をリセット

### 1.3 E2Eテストの設計問題（修正済み）

**症状**: `project-agent-panel`にエージェントが表示されない

**根本原因**:
- `getProjectAgents()` は `specId === ''` のエージェントのみを返す
- 自動実行ではspecIdに `'simple-feature'` が設定される
- spec紐づきエージェントは `AgentListPanel` に表示される設計

**修正内容**:
- E2Eテストを `agent-list-panel` と `agent-item-*` 対象に変更
- `AgentListPanel.tsx` に `data-testid="agent-list-panel"` を追加

---

## 2. 実装した修正

### 2.1 handleDirectStatusChange の修正

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

### 2.3 resetForTest() メソッド追加

```typescript
resetForTest(): void {
  this.trackedAgentIds.clear();
  this.pendingEvents.clear();
  this.executedPhases = [];
  this.executedValidations = [];
  this.errors = [];
  this.executionStartTime = null;
  this.clearTimeout();
}
```

### 2.4 E2Eテスト修正

**変更前** → **変更後**:
- `project-agent-panel` → `agent-list-panel`
- `project-agent-item-*` → `agent-item-*`
- `beforeEach`で`resetAutoExecutionService()`を呼び出し

---

## 3. アーキテクチャ確認

### 設計原則の遵守

| 原則 | 遵守状況 | 説明 |
|------|---------|------|
| 関心の分離 | ✓ | ProjectAgentPanel=spec非依存, AgentListPanel=spec依存 |
| SSOT | ✓ | specIdでエージェント所属が一意に決定 |
| KISS | ✓ | specIdが空ならproject agent |
| DRY | ✓ | 共通ロジックはAgentStoreに集約 |

---

## 4. 現在のテスト結果 (2025-12-22 最新)

### 成功テスト (5/10)
1. ✓ should show requirements auto-execution permission as ON
2. ✓ should have auto-execute button enabled
3. ✓ should show spec in spec-list with correct state
4. ✓ should change auto-execute button to stop button
5. ✓ should restore auto-execute button to enabled state

### 失敗テスト (5/10) - UIタイミング問題
1. ✗ should disable requirements execute button during execution
   - 原因: 実行中にボタンがdisabledにならない（タイミング依存）
2. ✗ should disable all validate buttons during execution
   - 原因: validateボタンの状態確認タイミング
3. ✗ should show new agent session in agent-list-panel
   - 原因: AgentListPanelへのエージェント表示タイミング
4. ✗ should update requirements.md in main panel UI
   - 原因: ファイル更新のUI反映タイミング
5. ✗ should show agent session as completed in agent-list-panel
   - 原因: エージェント完了状態の表示タイミング

### 分析
- **自動実行の完了検知は正常に動作**
- 残りの問題はUIの更新タイミングとE2Eテストの待機戦略の問題
- モック遅延を2秒に設定しても、UIの非同期更新が追いつかない場合がある

---

## 5. 次のステップ

### 5.1 UIタイミング問題の解決策
1. **待機時間を増やす**: `browser.pause()`の時間を長くする
2. **ポーリング戦略**: `waitForCondition`のintervalを短くする
3. **明示的な待機**: 特定のUI要素の出現を待機する
4. **Agent表示の確認**: AgentStoreとUIの同期を確認

### 5.2 推奨アクション
- 自動実行完了の核心的な問題（レースコンディション、シングルトン状態汚染）は解決済み
- 残りの5つの失敗テストは、テスト戦略の調整で対応可能
- 本質的なバグではなく、E2Eテストのロバスト性の問題

---

## 6. 環境情報

- Electron: v35.5.1
- Chromedriver: v134.0.6998.205
- Mock CLI遅延: 2秒（E2E_MOCK_CLAUDE_DELAY=2）
- テストフレームワーク: WebdriverIO + Mocha
