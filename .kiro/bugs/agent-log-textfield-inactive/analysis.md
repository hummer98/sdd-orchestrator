# Bug Analysis: agent-log-textfield-inactive

## Summary
AgentInputPanelおよびAgentLogPanelが`agents` Mapの変更を監視していないため、Agentのステータスが変わってもUIが再レンダリングされず、テキストフィールドが無効のままになる。

**これは単一コンポーネントの問題ではなく、Zustandストアの使用パターンに関する構造的な設計問題である。**

## Root Cause

### 構造的問題: `getAgentById`メソッドの誤用パターン

`getAgentById`は**メソッド**であり、呼び出しても**Zustandのサブスクリプションは作成されない**。

```typescript
// ❌ このパターンは間違い - agentはサブスクリプション対象外
const { getAgentById, selectedAgentId } = useAgentStore();
const agent = getAgentById(selectedAgentId);  // 関数呼び出し、サブスクライブされない
```

Zustandはセレクタで**返された値**のみをサブスクライブする。メソッドを取り出して後で呼び出しても、その戻り値の変更は追跡されない。

### 影響を受けるコンポーネント

| コンポーネント | 場所 | `agents`をサブスクライブ？ | 状況 |
|---------------|------|---------------------------|------|
| `AgentInputPanel.tsx:23` | `getAgentById(selectedAgentId)` | ❌ | **バグあり** |
| `AgentLogPanel.tsx:27` | `getAgentById(selectedAgentId)` | ❌ | **同じバグあり** |
| `AgentListPanel.tsx:113` | `getAgentById(selectedAgentId)` | ✅ 83行目でサブスクライブ | 正常動作 |

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx:17-23`
  - `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx:22-27`
- **Pattern**: Zustandストアメソッドの誤用
- **Trigger**: Agentのステータス変更時（`agents` Mapが更新されるがサブスクライブされていない）

## Impact Assessment
- **Severity**: Medium
- **Scope**: Agentログ画面のテキスト入力機能、およびログ表示
- **Risk**:
  - ユーザーが追加プロンプトを入力できない
  - ログパネルがAgent状態変化に追従しない
  - ページのリフレッシュまたはAgent再選択が必要

## Related Code

**問題のあるコード (AgentInputPanel.tsx:17-23):**
```typescript
export function AgentInputPanel() {
  const { selectedAgentId, resumeAgent, getAgentById } = useAgentStore();
  // ↑ agents Mapがサブスクライブされていない

  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;
  // ↑ 関数呼び出しの結果はサブスクライブ対象外
```

**問題のあるコード (AgentLogPanel.tsx:22-27):**
```typescript
export function AgentLogPanel() {
  const { selectedAgentId, getAgentById, getLogsForAgent, clearLogs } = useAgentStore();
  // ↑ 同じ問題

  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;
```

**正常動作のコード (AgentListPanel.tsx:83):**
```typescript
export function AgentListPanel(...) {
  const { selectedAgentId, stopAgent, selectAgent, getAgentsForSpec, getAgentById, removeAgent, loadAgents, agents, ... } = useAgentStore();
  // ↑ agents をサブスクライブしているため、Map変更時に再レンダリングされる
```

## Proposed Solution

### Option A: ストアに専用セレクタを追加（推奨）

`agentStore.ts`に`selectedAgent`を派生状態として追加:

```typescript
// agentStore.ts に追加
interface AgentState {
  // ... 既存のstate
}

interface AgentActions {
  // ... 既存のactions

  // 追加: selectedAgentIdに対応するAgentInfoを返す派生値
  // これをセレクタとして使用することで、正しくサブスクライブされる
}

// ストア定義内
getSelectedAgent: () => {
  const { selectedAgentId, agents } = get();
  if (!selectedAgentId) return undefined;
  for (const agentList of agents.values()) {
    const found = agentList.find((a) => a.agentId === selectedAgentId);
    if (found) return found;
  }
  return undefined;
},
```

**使用方法（各コンポーネント）:**
```typescript
// セレクタとして使用し、依存値を正しくサブスクライブ
const agent = useAgentStore((state) => {
  if (!state.selectedAgentId) return undefined;
  for (const agentList of state.agents.values()) {
    const found = agentList.find((a) => a.agentId === state.selectedAgentId);
    if (found) return found;
  }
  return undefined;
});
```

**Pros:**
- Zustandの正しい使い方に準拠
- 必要な時だけ再レンダリング（selectedAgentIdまたはagentsが変更時）
- 一貫したパターンで新しい開発者も間違いにくい
- コード意図が明確

**Cons:**
- 変更箇所が多い（ストア + 2コンポーネント）

### Option B: 各コンポーネントで個別にセレクタを実装

```typescript
// AgentInputPanel.tsx
const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
const resumeAgent = useAgentStore((state) => state.resumeAgent);
const agent = useAgentStore((state) => {
  if (!state.selectedAgentId) return undefined;
  for (const agentList of state.agents.values()) {
    const found = agentList.find((a) => a.agentId === state.selectedAgentId);
    if (found) return found;
  }
  return undefined;
});
```

**Pros:**
- ストア変更不要
- 各コンポーネントが自己完結

**Cons:**
- 同じロジックが複数箇所に重複（DRY違反）
- 新しいコンポーネントで同じ間違いを繰り返す可能性

### Option C: `agents`を直接サブスクライブ（場当たり的、非推奨）

```typescript
const { selectedAgentId, resumeAgent, getAgentById, agents: _agents } = useAgentStore();
const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;
```

**Pros:**
- 最小限の変更

**Cons:**
- **コード臭**: 使わない変数`_agents`を追加
- **過剰な再レンダリング**: 無関係なAgentの更新でも再レンダリング
- **一貫性なし**: 同じパターンを使う他の場所にも同じ修正が必要
- **根本解決ではない**: 新しい開発者が同じ間違いを繰り返す

### Recommended Approach

**Option Aを推奨**。理由:
1. Zustandの正しい使い方に準拠
2. 一箇所でロジックを管理（SSOT）
3. 一貫したパターンで保守性が高い
4. 新しいコンポーネントでも同じ問題が起きにくい

## Dependencies
- `electron-sdd-manager/src/renderer/stores/agentStore.ts` - セレクタ追加
- `electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx` - 修正対象
- `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx` - 修正対象

## Testing Strategy
1. **ユニットテスト**:
   - AgentInputPanel.test.tsx に status 変更後の入力フィールド有効化テストを追加
   - AgentLogPanel.test.tsx に status 変更後のUI更新テストを追加
2. **手動テスト**:
   - Inspectionを開始
   - Agent完了を待つ
   - テキストフィールドがアクティブになることを確認
   - ログパネルが最新状態を表示していることを確認
3. **確認すべき状態遷移**:
   - running → completed: 入力フィールドが有効化
   - running → failed: 入力フィールドが有効化
   - running → interrupted: 入力フィールドが有効化
   - running → hang: 入力フィールドが無効のまま

## Additional Notes

この問題はZustandの一般的な落とし穴である。ストアからメソッドを取得して後で呼び出すパターンは、Zustandのリアクティブシステムを迂回してしまう。

**正しいパターン:**
```typescript
// ✅ セレクタで値を直接返す
const agent = useAgentStore((state) => state.agents.get(specId)?.find(a => a.agentId === id));
```

**誤ったパターン:**
```typescript
// ❌ メソッドを取得して後で呼び出す
const { getAgentById } = useAgentStore();
const agent = getAgentById(id);  // サブスクライブされない
```
