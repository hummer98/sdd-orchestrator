# Bug Analysis: agent-log-display

## Summary
logFormatter.tsでツールアイコンが固定、ファイルパスが切り詰められ、tool_resultが「データ:」と表示される3つの表示問題。

## Root Cause

### 問題1: 固定アイコン (🔧)
- **Location**: `logFormatter.ts:127-133`
- **原因**: `tool_use`処理時に全ツールで固定の`icon: '🔧'`を使用

```typescript
} else if (block.type === 'tool_use' && block.name) {
  lines.push({
    type: 'tool',
    icon: '🔧',  // ← 固定値
    label: block.name,
    content: block.input ? formatToolInput(block.input) : '',
    color: 'yellow',
  });
}
```

### 問題2: ファイルパス切り詰め (40文字)
- **Location**: `logFormatter.ts:74`
- **原因**: `formatToolInput`関数で文字列を40文字に切り詰め

```typescript
if (typeof v === 'string') {
  return `${k}="${truncate(v, 40)}"`;  // ← 40文字制限
}
```

### 問題3: 「データ:」表示
- **Location**: `logFormatter.ts:215-228` (catchブロック)
- **原因**: ログ構造は二重JSON（wrapper → data）。AgentLogPanelが外側のwrapperをパースして`data`を取り出すが、`logFormatter.ts`はその`data`文字列を再度パースする。巨大なtool_result行ではJSONが途中で切れてパース失敗し、catchブロックの「データ:」フォールバックになる。

```typescript
} catch {
  // JSONパース失敗時
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    lines.push({
      type: 'text',
      icon: '📄',
      label: 'データ',  // ← ここに落ちる
      content: truncate(trimmed.replace(/\\n/g, ' ').replace(/\s+/g, ' '), 100),
      color: 'gray',
    });
  }
}
```

## Impact Assessment
- **Severity**: Low（表示の改善のみ、機能に影響なし）
- **Scope**: AgentログパネルでRead/Edit/Bash使用時の全ユーザー
- **Risk**: UIのみの変更、既存機能への影響なし

## Proposed Solution

### 修正1: ツール別アイコンマッピング
```typescript
const TOOL_ICONS: Record<string, string> = {
  Read: '📖',
  Edit: '✏️',
  Write: '📝',
  Bash: '💻',
  Glob: '🔍',
  Grep: '🔎',
  Task: '📋',
  // デフォルト
  default: '🔧',
};

function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] || TOOL_ICONS.default;
}
```

### 修正2: ツール別フォーマット関数
Read/Edit/Bashそれぞれに専用のフォーマット関数を作成し、重要な情報を省略なしで表示：

```typescript
function formatToolContent(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read':
    case 'Edit':
    case 'Write':
      // ファイルパスは省略なし
      return input.file_path as string || '';
    case 'Bash':
      // コマンドとdescriptionを表示
      const cmd = input.command as string || '';
      const desc = input.description as string || '';
      return desc ? `${desc}: ${cmd}` : cmd;
    default:
      return formatToolInput(input);
  }
}
```

### 修正3: tool_result追跡
tool_use_idとツール名のマッピングを保持し、tool_result表示時にツール名を参照：

```typescript
// parseClaudeEvent内でツールID→名前のマップを保持
const toolNameMap = new Map<string, string>();

// tool_use時: マップに登録
if (block.type === 'tool_use' && block.name && block.id) {
  toolNameMap.set(block.id, block.name);
}

// tool_result時: マップから取得
if (block.tool_use_id) {
  const toolName = toolNameMap.get(block.tool_use_id) || 'ツール';
  // toolNameを使って表示
}
```

### Recommended Approach
修正1と修正2を実装。修正3はstate管理が必要になるため、別途検討（現状はtool_resultのプレビュー改善で対応）。

## Dependencies
- `electron-sdd-manager/src/renderer/utils/logFormatter.ts`のみ

## Testing Strategy
1. 既存テストの確認: `logFormatter.test.ts`があれば実行
2. Read/Edit/Bashを含むAgentログで表示確認
3. 長いファイルパスが切り詰められないことを確認
