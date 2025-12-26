# Bug Fix: session-id-display-missing

## Summary
AgentLogPanelヘッダーのセッションID表示部分に「セッションID:」ラベルを追加

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx` | セッションID値の前に「セッションID:」ラベルを追加 |
| `electron-sdd-manager/src/renderer/components/AgentLogPanel.test.tsx` | テストのexpected文字列を更新 |

### Code Changes

**AgentLogPanel.tsx (136行目)**
```diff
- {agent.agentId} - {agent.sessionId}
+ {agent.agentId} - セッションID: {agent.sessionId}
```

**AgentLogPanel.test.tsx (140行目)**
```diff
- expect(screen.getByText('agent-1 - session-1')).toBeInTheDocument();
+ expect(screen.getByText('agent-1 - セッションID: session-1')).toBeInTheDocument();
```

## Implementation Notes
- 最小限の変更で修正を完了
- 既存のスタイリングとレイアウトには影響なし
- コピーボタンの機能は変更なし

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Test Results
```
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

## Rollback Plan
修正した2ファイルを元に戻すだけで復元可能:
1. `AgentLogPanel.tsx`: 136行目の「セッションID: 」を削除
2. `AgentLogPanel.test.tsx`: 140行目のテスト文字列を元に戻す

## Related Commits
- *コミット待ち*
