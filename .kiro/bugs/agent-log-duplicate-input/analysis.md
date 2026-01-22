# Bug Analysis: agent-log-duplicate-input

## Summary
Agentログにユーザー入力が二重に表示されるバグ。stdinログとClaude CLIのuserイベントの両方が同じ入力をtype: 'input'として変換・表示されることが原因。

## Root Cause

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx:64-72`
  - `electron-sdd-manager/src/shared/utils/logFormatter.ts:153-179`
  - `electron-sdd-manager/src/renderer/stores/agentStoreAdapter.ts:115-126`
  - `electron-sdd-manager/src/renderer/stores/agentStore.ts:424-432`
- **Component**: ログ表示システム（AgentLogPanel）とログ生成システム（agentStore/agentStoreAdapter）
- **Trigger**: ユーザーがAgentに入力を送信したとき

### 問題の流れ

1. **ユーザー入力送信時（agentStoreAdapter.ts:115-126、agentStore.ts:424-432）**:
   ```typescript
   // resumeAgentでstdinログを追加
   if (prompt) {
     const inputLogEntry: LogEntry = {
       id: `stdin-${Date.now()}-...`,
       stream: 'stdin',
       data: prompt,
       timestamp: Date.now(),
     };
     useSharedAgentStore.getState().addLog(agentId, inputLogEntry);
   }
   ```

2. **AgentLogPanel.tsx（64-72行目）でstdinログをtype: 'input'に変換**:
   ```typescript
   if (log.stream === 'stdin') {
     entries.push({
       id: `${log.id}-stdin-${logIdx}`,
       type: 'input',
       text: { content: log.data, role: 'user' },
     });
   }
   ```

3. **Claude CLIがstdoutにuserイベントを出力**:
   ```json
   {"type":"user","message":{"content":[{"type":"text","text":"ユーザー入力"}]}}
   ```

4. **logFormatter.ts（153-179行目）でuserイベントをtype: 'input'に変換**:
   ```typescript
   case 'user':
     if (event.message?.content) {
       for (const block of event.message.content) {
         if (block.type === 'text' && block.text) {
           entries.push({
             type: 'input',
             text: { content: normalizedText, role: 'user' },
           });
         }
       }
     }
     break;
   ```

5. **結果**: 同じ入力が2回表示される
   - 1回目: stdinログから変換されたエントリ
   - 2回目: stdoutのuserイベントから変換されたエントリ

## Impact Assessment
- **Severity**: Low
- **Scope**: ログ表示のみに影響、機能的な問題はない
- **Risk**: ユーザーエクスペリエンスの低下（冗長な表示）

## Related Code
```typescript
// AgentLogPanel.tsx:64-72
if (log.stream === 'stdin') {
  entries.push({
    id: `${log.id}-stdin-${logIdx}`,
    type: 'input',
    text: {
      content: log.data,
      role: 'user',
    },
  });
}

// logFormatter.ts:153-179
case 'user':
  if (event.message?.content) {
    for (const block of event.message.content) {
      if (block.type === 'text' && block.text) {
        entries.push({
          id: generateId(),
          type: 'input',
          text: {
            content: normalizedText,
            role: 'user',
          },
        });
      }
    }
  }
  break;
```

## Proposed Solution

### Option 1: stdinログの表示をスキップ（推奨）
- Description: AgentLogPanelでstdinログを表示から除外し、Claude CLIのuserイベントのみを表示
- Pros:
  - 最小限の変更（AgentLogPanel.tsxの1箇所のみ）
  - SSOTを遵守（Claude CLIのuserイベントが真のソース）
  - stdinログは記録としては残る（将来のデバッグ用）
- Cons:
  - stdinログに含まれるがuserイベントに含まれない入力があれば表示されない（実際には発生しない）

### Option 2: logFormatterでuserイベントをスキップ
- Description: logFormatterでtype: 'user'イベントを無視
- Pros: パーサーレベルでの除外
- Cons:
  - 他のコンテキストでuserイベントが必要な場合に問題
  - stdinログとuserイベントの関係が不明確

### Option 3: stdinログの生成を削除
- Description: agentStoreAdapter/agentStoreからstdinログ追加を削除
- Pros: データソースレベルでの重複解消
- Cons:
  - 入力送信の即時フィードバックが失われる可能性
  - Claude CLIのuserイベント出力までタイムラグがある場合UXが悪化

### Recommended Approach
**Option 1: stdinログの表示をスキップ**

理由:
1. **SSOT遵守**: Claude CLIの`type: 'user'`イベントがユーザー入力の信頼できる単一ソース
2. **最小変更**: AgentLogPanel.tsxの条件分岐を削除するだけ
3. **データ整合性**: stdinログは内部記録として保持（デバッグ用）

実装:
```typescript
// AgentLogPanel.tsx:63-106 の変更
logs.forEach((log, logIdx) => {
  // stdinは表示しない - Claude CLIのuserイベントで表示される
  if (log.stream === 'stdin') {
    return;
  } else if (log.stream === 'stderr') {
    // ... 既存のstderr処理
  } else {
    // ... 既存のstdout処理
  }
});
```

## Dependencies
- `electron-sdd-manager/src/renderer/components/AgentLogPanel.tsx` - 主な変更対象
- `electron-sdd-manager/src/shared/utils/logFormatter.ts` - 変更不要
- `electron-sdd-manager/src/renderer/stores/agentStore.ts` - 変更不要
- `electron-sdd-manager/src/renderer/stores/agentStoreAdapter.ts` - 変更不要

## Testing Strategy
1. **手動テスト**:
   - Agentに入力を送信し、ログに入力が1回だけ表示されることを確認
   - 複数回の入力で重複がないことを確認
2. **既存テスト実行**:
   - `AgentLogPanel.test.tsx`のテストがパスすることを確認
3. **リグレッションテスト**:
   - stderr出力が正しく表示されることを確認
   - stdoutのアシスタント応答が正しく表示されることを確認
