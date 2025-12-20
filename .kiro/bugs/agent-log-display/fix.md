# Bug Fix: agent-log-display

## Summary
Agentログパーサーでツール別アイコン表示、ファイルパス省略なし表示、tool_result行の「データ:」問題を修正。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/utils/logFormatter.ts` | ツール別アイコン・フォーマット関数追加、catchブロック改善 |

### Code Changes

#### 1. ツール別アイコンマッピング追加 (L52-71)
```diff
+// ツール別アイコンマッピング
+const TOOL_ICONS: Record<string, string> = {
+  Read: '📖',
+  Edit: '✏️',
+  Write: '📝',
+  MultiEdit: '✏️',
+  Bash: '💻',
+  Glob: '🔍',
+  Grep: '🔎',
+  Task: '📋',
+  TaskOutput: '📋',
+  WebFetch: '🌐',
+  WebSearch: '🔎',
+  TodoWrite: '✅',
+  NotebookEdit: '📓',
+};
+
+function getToolIcon(toolName: string): string {
+  return TOOL_ICONS[toolName] || '🔧';
+}
```

#### 2. ツール別コンテンツフォーマット関数追加 (L73-105)
```diff
+function formatToolContent(name: string, input: Record<string, unknown>): string {
+  switch (name) {
+    case 'Read':
+    case 'Write':
+      return (input.file_path as string) || '';
+    case 'Edit':
+    case 'MultiEdit':
+      return (input.file_path as string) || '';
+    case 'Bash': {
+      const cmd = (input.command as string) || '';
+      const desc = (input.description as string) || '';
+      if (desc) {
+        return `${desc}`;
+      }
+      return truncate(cmd, 80);
+    }
+    case 'Glob':
+      return (input.pattern as string) || '';
+    case 'Grep':
+      return (input.pattern as string) || '';
+    case 'Task':
+      return (input.description as string) || '';
+    default:
+      return formatToolInput(input);
+  }
+}
```

#### 3. tool_use表示の更新 (L181-188)
```diff
 } else if (block.type === 'tool_use' && block.name) {
   lines.push({
     type: 'tool',
-    icon: '🔧',
+    icon: getToolIcon(block.name),
     label: block.name,
-    content: block.input ? formatToolInput(block.input) : '',
+    content: block.input ? formatToolContent(block.name, block.input) : '',
     color: 'yellow',
   });
 }
```

#### 4. catchブロックでのtool_result検出 (L270-298)
```diff
 } catch {
   const trimmed = jsonLine.trim();
   if (trimmed) {
     if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
+      // tool_resultパターンを検出
+      const toolResultMatch = trimmed.match(/"type"\s*:\s*"tool_result"/);
+      if (toolResultMatch) {
+        const fileMatch = trimmed.match(/"filePath"\s*:\s*"([^"]+)"/);
+        const fileName = fileMatch ? fileMatch[1].split('/').pop() : null;
+        lines.push({
+          type: 'tool-result',
+          icon: '📤',
+          label: 'ツール結果',
+          content: fileName ? `${fileName} の内容` : '(結果あり)',
+          color: 'blue',
+        });
+      } else {
         lines.push({
           type: 'text',
           icon: '📄',
           label: 'データ',
           content: truncate(...),
           color: 'gray',
         });
+      }
     }
   }
 }
```

## Implementation Notes
- ツール別アイコン: Read(📖), Edit(✏️), Write(📝), Bash(💻), Glob(🔍), Grep(🔎)など
- ファイルパス: Read/Edit/Writeは省略なしで表示
- Bash: descriptionがあれば表示、なければコマンドを80文字に短縮
- tool_result: JSONパース失敗時でも正規表現で検出し、ファイル名を表示

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
```bash
git checkout HEAD -- electron-sdd-manager/src/renderer/utils/logFormatter.ts
```

## Related Commits
- *Pending commit after verification*
