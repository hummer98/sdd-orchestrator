# Bug Analysis: agent-log-input-overflow

## Summary
AgentログパネルとAgentInputPanelの高さ指定の問題により、底部パネルがbottomPaneHeightの制約を超えて画面全体をオーバーフローさせる。

## Root Cause
CSSレイアウトの不整合により、底部パネル内の子要素が親コンテナの高さ制約を無視している。

### Technical Details
- **Location**: [App.tsx:274-278](electron-sdd-manager/src/renderer/App.tsx#L274-L278)、[AgentLogPanel.tsx:103](electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx#L103)
- **Component**: 底部パネル（AgentLogPanel + AgentInputPanel）
- **Trigger**: Agentログが流れ始めると、AgentInputPanelが画面外にオーバーフローする

**問題のコード（App.tsx:274-278）:**
```tsx
<div style={{ height: bottomPaneHeight }} className="shrink-0 flex flex-col">
  <AgentLogPanel />
  {/* Task 32: Agent input panel */}
  <AgentInputPanel />
</div>
```

**問題のコード（AgentLogPanel.tsx:103）:**
```tsx
<div className="flex flex-col h-full bg-gray-900">
```

**根本原因:**
1. AgentLogPanelが`h-full`を使用しており、親コンテナの高さ100%を取得しようとする
2. AgentInputPanelも同じコンテナ内に配置されている
3. flexコンテナ内で`h-full`は親の高さを超えてしまう可能性がある
4. 結果として、AgentInputPanelが画面外に押し出される

## Impact Assessment
- **Severity**: Medium（UIの使いやすさに影響、機能は動作）
- **Scope**: 全ユーザー、Agent実行中の画面
- **Risk**: 入力フィールドにアクセスできなくなる可能性

## Related Code
**App.tsx（底部パネルのコンテナ）:**
```tsx
{/* Task 33.3: Bottom - Agent Log panel (replaced LogPanel) */}
<div style={{ height: bottomPaneHeight }} className="shrink-0 flex flex-col">
  <AgentLogPanel />
  {/* Task 32: Agent input panel */}
  <AgentInputPanel />
</div>
```

**AgentLogPanel.tsx:**
```tsx
<div className="flex flex-col h-full bg-gray-900">
```

**AgentInputPanel.tsx:**
```tsx
<div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
```

## Proposed Solution

### Option 1（推奨）: AgentLogPanelのh-fullをflex-1に変更
- Description: AgentLogPanelの`h-full`を`flex-1`に変更し、親コンテナの残りスペースを使用するようにする。AgentInputPanelに`shrink-0`を追加して固定サイズを維持。
- Pros:
  - 最小限の変更
  - flexboxの正しい使い方
  - 入力パネルが常にフッターに固定される
- Cons: なし

### Option 2: 底部パネルにoverflow-hiddenを追加
- Description: App.tsxの底部パネルコンテナに`overflow-hidden`を追加
- Pros: 単純な変更
- Cons: 根本的な解決にならない、コンテンツが切れる可能性

### Recommended Approach
Option 1を推奨。AgentLogPanelの`h-full`を`flex-1`に変更し、AgentInputPanelに`shrink-0`を追加する。

## Dependencies
- [AgentLogPanel.tsx](electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx)
- [AgentInputPanel.tsx](electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx)

## Testing Strategy
1. Electronアプリを起動
2. Agent実行を開始してログを流す
3. 入力フィールドが画面内に固定されていることを確認
4. 底部パネルをリサイズしてもレイアウトが崩れないことを確認
5. 入力履歴が増えてもオーバーフローしないことを確認
