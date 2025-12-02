# Bug Fix: agent-send-box-text-dark

## Summary
AgentInputPanelの入力欄に`text-gray-900 dark:text-gray-100`クラスを追加し、ダークモードでテキストが正しく表示されるよう修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx | テキスト色クラスを追加 |

### Code Changes

```diff
          className={clsx(
            'flex-1 px-3 py-2 text-sm rounded-md',
            'bg-white dark:bg-gray-900',
+           'text-gray-900 dark:text-gray-100',
            'border border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:bg-gray-100 dark:disabled:bg-gray-800',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500'
          )}
```

## Implementation Notes
- 修正箇所: AgentInputPanel.tsx 84行目
- ライトモードでは`text-gray-900`（ほぼ黒）、ダークモードでは`text-gray-100`（ほぼ白）を適用
- 他のUI要素（ボタン、履歴アイテム等）と整合性のある配色

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
上記のdiff変更を元に戻す（`text-gray-900 dark:text-gray-100`行を削除）

## Test Results
- AgentInputPanel.test.tsx: 18 tests passed
