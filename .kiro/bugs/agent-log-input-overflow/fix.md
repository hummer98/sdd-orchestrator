# Bug Fix: agent-log-input-overflow

## Summary
AgentLogPanelの`h-full`を`flex-1 min-h-0`に変更し、AgentInputPanelに`shrink-0`を追加して、底部パネルのレイアウトオーバーフローを修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx` | `h-full`を`flex-1 min-h-0`に変更 |
| `electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx` | `shrink-0`クラスを追加 |

### Code Changes

**AgentLogPanel.tsx (L103):**
```diff
- <div className="flex flex-col h-full bg-gray-900">
+ <div className="flex flex-col flex-1 min-h-0 bg-gray-900">
```

**AgentInputPanel.tsx (L65):**
```diff
- <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
+ <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
```

## Implementation Notes
- `h-full`は親の100%の高さを取得しようとするため、flexコンテナ内で他の兄弟要素がある場合にオーバーフローを引き起こす
- `flex-1`は残りのスペースを埋めるように動作し、他の要素のスペースを尊重する
- `min-h-0`はflex子要素のデフォルトの`min-height: auto`を上書きし、コンテンツが縮小できるようにする
- `shrink-0`はAgentInputPanelがflex縮小されないようにし、常に固定サイズを維持する

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
1. AgentLogPanel.tsx: `flex-1 min-h-0`を`h-full`に戻す
2. AgentInputPanel.tsx: `shrink-0`クラスを削除する

## Test Results
- AgentLogPanel.test.tsx: 15テスト全てパス
- AgentInputPanel.test.tsx: 13テスト全てパス

## Related Commits
- *コミット前*
