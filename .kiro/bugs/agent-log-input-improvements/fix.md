# Bug Fix: agent-log-input-improvements

## Summary
AgentInputPanelから入力履歴機能を削除し、Option+Enterで改行を挿入できる複数行入力対応のtextareaに変更。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx` | 入力履歴機能削除、`<input>` → `<textarea>` 変更、動的高さ調整、キーボードハンドリング更新 |
| `electron-sdd-manager/src/renderer/components/AgentInputPanel.test.tsx` | 履歴テスト削除、複数行入力テスト追加 |

### Code Changes

#### AgentInputPanel.tsx - 主な変更

**削除した機能:**
```diff
- import { Send, Play, History, Clock } from 'lucide-react';
+ import { Send, Play } from 'lucide-react';

- interface InputHistoryItem {
-   id: string;
-   input: string;
-   timestamp: number;
- }

- const [history, setHistory] = useState<InputHistoryItem[]>([]);

- // Add to history
- const historyItem: InputHistoryItem = { ... };
- setHistory((prev) => [...prev, historyItem]);

- const handleHistoryClick = (input: string) => { ... };

- {/* Input history section - 全体削除 */}
```

**追加した機能:**
```diff
+ import { useState, useRef, useEffect } from 'react';

+ const textareaRef = useRef<HTMLTextAreaElement>(null);

+ // Auto-resize textarea based on content
+ useEffect(() => {
+   const textarea = textareaRef.current;
+   if (textarea) {
+     textarea.style.height = 'auto';
+     const lineHeight = 20;
+     const minHeight = lineHeight + 16;
+     const maxHeight = lineHeight * 5 + 16;
+     const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
+     textarea.style.height = `${newHeight}px`;
+   }
+ }, [inputValue]);

- const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
-   if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
+ const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
+   if (e.nativeEvent.isComposing) return;
+   // Option(Alt)+Enter: 改行を挿入
+   if (e.key === 'Enter' && e.altKey) {
+     return;
+   }
+   // Enter: 送信
+   if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

- <input type="text" ... />
+ <textarea ref={textareaRef} rows={1} className="... resize-none" ... />
```

## Implementation Notes
- textareaは1行（約36px）から最大5行（約116px）まで動的にリサイズ
- Option+Enter（macOS）/ Alt+Enter（Windows/Linux）で改行挿入
- Enterキーで送信（既存動作を維持）
- IME入力中（日本語変換等）はEnterを無視
- `resize-none` でユーザーによる手動リサイズを無効化

## Breaking Changes
- [x] No breaking changes

入力履歴機能は使用されていなかったため、削除による影響なし。

## Rollback Plan
1. `git checkout HEAD~1 -- electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx`
2. `git checkout HEAD~1 -- electron-sdd-manager/src/renderer/components/AgentInputPanel.test.tsx`

## Test Results
```
 ✓ src/renderer/components/AgentInputPanel.test.tsx (17 tests) 341ms
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

## Related Commits
- *To be added after commit*
