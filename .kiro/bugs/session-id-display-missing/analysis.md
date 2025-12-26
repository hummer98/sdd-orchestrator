# Bug Analysis: session-id-display-missing

## Summary
AgentLogPanelのヘッダーにセッションIDとコピーボタンは表示されているが、「セッションID」というタイトルラベルが欠落している。

## Root Cause
セッションID表示部分に、agentIdとsessionIdの値のみが表示されており、「セッションID:」というラベルテキストが含まれていない。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx:135-145`
- **Component**: AgentLogPanel ヘッダー部分
- **Trigger**: agentが選択されているときに常に発生

## Impact Assessment
- **Severity**: Low（機能には影響なし、UXの問題）
- **Scope**: AgentLogPanelを使用するすべてのユーザー
- **Risk**: なし（表示の改善のみ）

## Related Code
```tsx
// 現在のコード（135-145行目）
<span className="text-sm text-gray-500 font-mono flex items-center gap-1">
  {agent.agentId} - {agent.sessionId}
  <button
    onClick={() => navigator.clipboard.writeText(agent.sessionId)}
    className="p-0.5 rounded hover:bg-gray-600 text-gray-500 hover:text-gray-300"
    title="セッションIDをコピー"
    data-testid="copy-session-id"
  >
    <Copy className="w-3 h-3" />
  </button>
</span>
```

## Proposed Solution

### Option 1（推奨）
「セッションID:」ラベルをsessionId値の前に追加する。

修正後のコード:
```tsx
<span className="text-sm text-gray-500 font-mono flex items-center gap-1">
  {agent.agentId} - セッションID: {agent.sessionId}
  <button ...>
```

- Pros: 最小限の変更、明確なラベル表示
- Cons: なし

### Recommended Approach
Option 1を採用。「セッションID:」ラベルをsessionIdの値の直前に追加する。

## Dependencies
- なし（単一ファイルの変更のみ）

## Testing Strategy
- AgentLogPanel.test.tsxにラベル表示のテストを追加
- 手動でUIを確認し、「セッションID:」ラベルとコピーボタンが正しく表示されることを確認
