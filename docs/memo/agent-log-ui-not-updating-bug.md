# Agent Log UI Not Updating Bug 調査メモ

## 問題の症状

1. SpecAgent一覧には追加される ✓
2. Agentログエリアには1行目のコマンドは表示される ✓
3. その後ログが追加されていかない ✗
4. もう一度SpecAgent一覧から選択すると、正常にAgentログは表示されるようになる ✓

## 根本原因

### 問題のコード箇所

`agentStore.ts` の `onAgentRecordChanged` 内（行506-520）:

```typescript
// Dynamic import to avoid circular dependency
import('./specStore').then(({ useSpecStore }) => {
  const { selectedSpec } = useSpecStore.getState();
  if (specId.startsWith('bug:')) {
    import('./bugStore').then(({ useBugStore }) => {
      // ...
      get().selectAgent(agentId);
    });
  } else if (selectedSpec && specId === selectedSpec.name) {
    get().selectAgent(agentId);
  }
});
```

### 原因の分析

**動的importによるPromiseのマイクロタスク遅延**が、Zustandの購読メカニズムと正しく連携できていない。

```
[問題のフロー]
IPCイベント → 動的import (Promise) → マイクロタスクキュー → selectAgent
                    ↓
              この遅延がZustandの購読と相互作用して問題発生
```

**重要な発見**: コメントには「循環依存回避のため」と書いてあるが、実際には：
- `specStore` → `agentStore` の参照なし
- `bugStore` → `agentStore` の参照なし

つまり、**動的importは不要**だった。

---

## 修正案

### 案1: 簡易修正（動的importを通常importに変更）

**変更内容**:

1. ファイル先頭に通常のimportを追加:
```typescript
import { useSpecStore } from './specStore';
import { useBugStore } from './bugStore';
```

2. `onAgentRecordChanged` 内の動的importを削除し、同期的に呼び出し:
```typescript
// Before
import('./specStore').then(({ useSpecStore }) => {
  const { selectedSpec } = useSpecStore.getState();
  if (selectedSpec && specId === selectedSpec.name) {
    get().selectAgent(agentId);
  }
});

// After
const { selectedSpec } = useSpecStore.getState();
if (specId.startsWith('bug:')) {
  const { selectedBug } = useBugStore.getState();
  const expectedSpecId = selectedBug ? `bug:${selectedBug.name}` : '';
  if (specId === expectedSpecId) {
    get().selectAgent(agentId);
  }
} else if (selectedSpec && specId === selectedSpec.name) {
  get().selectAgent(agentId);
}
```

**メリット**:
- 最小限の変更
- 問題の直接的な解決

**リスク**:
- 循環依存が将来発生する可能性（現時点では問題なし）

---

### 案2: リファクタ案（自動選択ロジックをUIに移動）

**設計思想**:
- `agentStore` は純粋な状態管理のみを担当
- 自動選択のロジック（UIの関心事）は UIコンポーネントに移動

**現在の構造**:
```
agentStore（状態管理）
  ├── agents管理
  ├── logs管理
  └── 自動選択ロジック ← なぜここに？
```

**提案する構造**:
```
agentStore（純粋な状態管理のみ）
  ├── agents管理
  └── logs管理

AgentListPanel（UIコンポーネント）
  └── 自動選択ロジック ← UIの関心事はUIで
```

**イベントフロー**:

```
[Main Process]                    [Renderer Process]

エージェント起動
      ↓
agent.json作成
      ↓
agentWatcher検知
      ↓
onAgentRecordChanged ──IPC──→    agentStore.loadAgents()
                                        ↓
                                  state.agents 更新
                                        ↓
                                  AgentListPanel 再レンダリング
                                        ↓
                                  useEffect で agents 変化を検知
                                        ↓
                                  「新しい running エージェントがいる」
                                        ↓
                                  selectAgent(newAgentId)
                                        ↓
                                  ログ表示
```

**変更内容**:

1. `agentStore.ts` から自動選択ロジックを削除（行499-521）

2. `AgentListPanel.tsx` に自動選択ロジックを追加:
```typescript
// 新しく追加されたエージェントを追跡
const prevAgentsRef = useRef<AgentInfo[]>([]);

useEffect(() => {
  const currentAgents = getAgentsForSpec(specId);
  const prevAgents = prevAgentsRef.current;

  // 新しく追加された running エージェントを検出
  const newRunningAgent = currentAgents.find(
    a => a.status === 'running' && !prevAgents.some(p => p.agentId === a.agentId)
  );

  if (newRunningAgent) {
    selectAgent(newRunningAgent.agentId);
  }

  prevAgentsRef.current = currentAgents;
}, [specId, filteredAgents, selectAgent]);
```

**メリット**:
- 責務の分離（状態管理とUI制御を分離）
- 循環依存の根本的な解消
- 動的importが不要
- テスタビリティの向上

**デメリット**:
- 変更範囲が大きい
- `AgentListPanel` の複雑さが増す

---

## 推奨

**短期**: 案1（簡易修正）で問題を解決
**中長期**: 案2（リファクタ）を検討（設計の改善として）

案1で循環依存が発生しないことを確認できたため、まずは案1で修正し、問題が解決することを確認するのが妥当。

---

## 関連ファイル

- `electron-sdd-manager/src/renderer/stores/agentStore.ts` - 問題のコード
- `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx` - ログ表示
- `electron-sdd-manager/src/renderer/components/AgentListPanel.tsx` - エージェント一覧

## 調査日

2026-01-21
