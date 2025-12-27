# Bug Analysis: verify-button-agent-list

## Summary
bugsワークフローでVerify実行ボタンを押してもAgent一覧に表示されない問題。`BugActionButtons`コンポーネントが空のspecIdでAgentを起動しているが、`BugPane`のAgentListPanelは`bug:{bugName}`形式のspecIdでフィルタリングしているため、Agentが一覧に表示されない。

## Root Cause
`BugActionButtons.tsx`（61行目）で、Agentを起動する際に`specId`として空文字列`''`を渡しているが、`BugPane.tsx`（91行目）では`bug:${selectedBug.name}`形式のspecIdでAgentListPanelにフィルタリングを指示している。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/BugActionButtons.tsx:61-68`
- **Component**: BugActionButtons
- **Trigger**: Verify（またはAnalyze、Fix）ボタンをクリック

## Impact Assessment
- **Severity**: Medium
- **Scope**: bugsワークフローの全アクションボタン（Analyze, Fix, Verify）に影響
- **Risk**: 修正による副作用は最小限。specIdの形式を統一するだけ

## Related Code

### 問題のコード（BugActionButtons.tsx:61-68）
```typescript
const agentId = await startAgent(
  '', // Global agent (not spec-specific)  ← 問題: 空文字列
  `bug-${config.action}`, // Phase name
  config.command, // Command to execute
  [bug.name], // Args: bug name
  undefined, // No group
  undefined // No session
);
```

### 期待される形式（BugPane.tsx:91）
```typescript
<AgentListPanel
  specId={selectedBug ? `bug:${selectedBug.name}` : ''}  // ← bug:{name} 形式
  testId="bug-agent-list-panel"
/>
```

### 対照例（BugWorkflowView.tsx:155-161）
```typescript
await window.electronAPI.startAgent(
  selectedBug.name, // Use bug name as specId for grouping ← バグ名だけ（bug:プレフィックスなし）
  phase,
  ...
);
```

## Proposed Solution

### Option 1（推奨）
`BugActionButtons.tsx`で`bug:${bug.name}`形式のspecIdを使用する。

**修正箇所**:
```typescript
// BugActionButtons.tsx:61
const agentId = await startAgent(
  `bug:${bug.name}`, // Bug-specific agent with consistent naming
  `bug-${config.action}`,
  config.command,
  [bug.name],
  undefined,
  undefined
);
```

- Pros: BugPaneのAgentListPanelとの一貫性を保てる
- Cons: なし

### Option 2
`BugWorkflowView.tsx`も同様に`bug:${selectedBug.name}`形式に統一する。

**修正箇所**:
```typescript
// BugWorkflowView.tsx:155
await window.electronAPI.startAgent(
  `bug:${selectedBug.name}`, // Consistent with BugPane
  phase,
  ...
);
```

- Pros: 全てのバグ関連Agent起動が統一される
- Cons: 既存のAgent記録との互換性に注意が必要

### Recommended Approach
Option 1を先に適用し、Option 2も合わせて実施することで、バグワークフロー全体のspecId形式を統一する。

## Dependencies
- `electron-sdd-manager/src/renderer/components/BugActionButtons.tsx`
- `electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx`
- agentStore.tsのイベントリスナー（435-445行目）も`bug:`プレフィックスを期待しているため、一貫性が取れる

## Testing Strategy
1. `BugActionButtons.test.tsx`で`startAgent`に渡すspecIdが`bug:{bugName}`形式であることを確認
2. 手動テスト: Verifyボタンをクリック後、Agent一覧に表示されることを確認
3. E2Eテスト: `bug-workflow.e2e.spec.ts`でAgentの表示を確認
