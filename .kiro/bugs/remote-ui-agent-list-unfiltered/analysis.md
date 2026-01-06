# Bug Analysis: remote-ui-agent-list-unfiltered

## Summary
Remote-UIのAgent一覧が、選択中のSpec/Bugに関係なく全プロジェクトのエージェントを表示してしまう問題。

## Root Cause
Remote-UIの`App`クラスがサーバーから受け取ったエージェント一覧を、選択中のSpec/BugのIDでフィルタリングせずに`SpecDetail.updateAgentList()`に渡している。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/remote-ui/app.js:468`
- **Component**: Remote-UI App → SpecDetail
- **Trigger**: Spec選択時、またはAGENT_LISTメッセージ受信時

**問題のコードフロー:**
1. サーバー側 (`handlers.ts:431`) で `getAllAgents()` が全エージェントを取得
2. Remote-UI (`app.js:467-468`) で受信したエージェントをそのまま渡す:
   ```javascript
   this.agents = agents;
   this.specDetail.updateAgentList(this.agents);
   ```
3. `SpecDetail.updateAgentList()` (`components.js:859`) でフィルタリングなしに表示

**Electron版の正しい実装:**
- `AgentListPanel.tsx:95` で `getAgentsForSpec(specId)` を使用
- `agentStore.ts:482-484` で `specId` ベースのフィルタリング:
  ```typescript
  getAgentsForSpec: (specId: string) => {
    return get().agents.get(specId) || [];
  }
  ```

## Impact Assessment
- **Severity**: Medium
- **Scope**: Remote-UIでSpec/Bug詳細を閲覧する全ユーザー
- **Risk**: 情報の混乱（どのエージェントがどのSpecに属するか判別困難）

## Related Code

**問題箇所 (app.js:465-469):**
```javascript
// Update agents
if (agents) {
  this.agents = agents;
  this.specDetail.updateAgentList(this.agents);  // フィルタリングなし
}
```

**AGENT_LIST受信時 (app.js:601-605):**
```javascript
handleAgentList(payload) {
  const { agents } = payload || {};
  this.agents = agents || [];
  this.specDetail.updateAgentList(this.agents);  // フィルタリングなし
}
```

## Proposed Solution

### Option 1: クライアントサイドフィルタリング（推奨）
Remote-UI側でエージェント表示時に`specId`でフィルタリングする。

**修正箇所**: `app.js` - 複数メソッド
- `handleInit()` - 初期化時
- `handleAgentList()` - エージェント一覧更新時
- `handleAgentStatus()` - エージェント状態更新時

**修正内容**:
```javascript
// selectedSpec または selectedBug に基づいてフィルタリング
const currentSpecId = this.selectedSpec?.feature_name ||
                      (this.selectedBug ? `bug:${this.selectedBug.name}` : null);
const filteredAgents = currentSpecId
  ? this.agents.filter(a => a.specId === currentSpecId)
  : [];
this.specDetail.updateAgentList(filteredAgents);
```

- Pros: サーバー変更不要、クライアント完結
- Cons: 全エージェントデータがクライアントに送信される（現状維持）

### Option 2: サーバーサイドフィルタリング
サーバー側で選択中のSpecに応じてフィルタリングしてから送信する。

- Pros: 必要なデータのみ送信（帯域効率）
- Cons: WebSocket状態管理の複雑化、既存メッセージプロトコル変更

### Recommended Approach
**Option 1（クライアントサイドフィルタリング）** を推奨。

理由:
1. 変更範囲が限定的（Remote-UI側のみ）
2. 既存のWebSocketプロトコルを変更不要
3. Electron版と同様のフィルタリングロジックを適用

## Dependencies
- `selectedSpec` / `selectedBug` の状態が正しく管理されていること（既に実装済み）
- エージェントデータに `specId` フィールドが含まれていること（既に実装済み）

## Testing Strategy
1. 複数Specを持つプロジェクトでRemote-UIに接続
2. Spec Aを選択 → Spec Aのエージェントのみ表示されることを確認
3. Spec Bを選択 → Spec Bのエージェントのみ表示されることを確認
4. Bugを選択 → 該当Bugのエージェントのみ表示されることを確認
5. 一覧に戻る → エージェント一覧が空になることを確認
