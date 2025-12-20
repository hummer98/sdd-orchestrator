# Bug Analysis: validate-impl-send-button-disabled

## Summary
validate-implのAgentを実行完了後、送信ボタン（継続インターフェース）がアクティブにならない問題。UIのagentStoreにある`sessionId`が空文字列のまま更新されていない可能性が高い。

## Root Cause
Agent起動〜完了までの`sessionId`更新フローに問題がある。

### データフロー分析

1. **Agent起動時** (`specManagerService.ts:525`)
   - `sessionId: ''`（空文字列）でAgentInfoが作成される
   - UIのagentStoreにも`sessionId: ''`で保存される

2. **sessionIdパース** (`specManagerService.ts:1094-1127`)
   - Claude Codeの出力から`system/init`メッセージをパース
   - `registry.updateSessionId()`でメモリ内を更新
   - `recordService.updateRecord()`でファイルを更新

3. **ファイル監視** (`agentRecordWatcherService.ts`)
   - ファイル変更を検知して`AGENT_RECORD_CHANGED`イベントを送信

4. **UI更新** (`agentStore.ts:385-414`)
   - `onAgentRecordChanged`で`addAgent()`が呼ばれる
   - 既存のAgentを新しい情報（sessionId付き）で置き換え

### 問題の可能性

**可能性1: ファイル監視がsessionId更新を検知していない**
- debounce（100ms）で複数の変更がマージされている
- または`awaitWriteFinish`の設定が影響

**可能性2: onAgentRecordChangedが呼ばれていない**
- イベントリスナーのセットアップタイミングの問題

**可能性3: addAgentでの更新が反映されていない**
- React/Zustandのstate更新の問題

### Technical Details
- **Location**: [agentStore.ts:385-414](electron-sdd-manager/src/renderer/stores/agentStore.ts#L385-L414)
- **Component**: agentStore（onAgentRecordChanged → addAgent）
- **Trigger**: Agent完了後にsessionIdがUI側で更新されない

## Impact Assessment
- **Severity**: Medium
- **Scope**: セッション再開機能が影響を受けるすべてのAgent（validate-impl、spec-requirements、etc.）
- **Risk**: sessionIdがなくてもAgentレコードは存在し、ログは表示されるが、セッション再開ができない

## Related Code
```typescript
// AgentInputPanel.tsx:30-33
const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;

// Can resume if: agent exists, has sessionId, and is not running
const isRunning = agent?.status === 'running' || agent?.status === 'hang';
const canResume = agent && agent.sessionId && !isRunning;
const isDisabled = !selectedAgentId || !canResume;
```

## Proposed Solution

### Option 1: sessionId検証を緩和（推奨）
- Description: `canResume`条件からsessionId必須を削除、またはsessionIdがない場合でも別のボタン（「新規開始」等）を表示
- Pros: ユーザーが常に何かしらのアクションを取れる
- Cons: sessionIdなしでresumeを試みるとエラーになる可能性

### Option 2: sessionIdなし時のフォールバックUI
- Description: sessionIdがない場合は「セッションIDがありません」メッセージと「新規Agent起動」ボタンを表示
- Pros: ユーザーに状況を明確に伝えられる
- Cons: UI変更が必要

### Recommended Approach
**Option 2を推奨**: sessionIdがないAgent（完了済み/エラー状態）を選択した場合、入力フィールドのプレースホルダーを変更し、sessionIdがないことを明示。送信ボタンは無効のままとするが、なぜ無効なのかをユーザーに説明する。

具体的な変更:
1. `isDisabled`状態時に、sessionIdがない理由を表示
2. プレースホルダーを「セッションIDがないため再開できません」に変更
3. 必要なら「新規Agent起動」リンクを表示

## Dependencies
- `electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx`
- `electron-sdd-manager/src/renderer/stores/agentStore.ts`
- `electron-sdd-manager/src/main/services/specManagerService.ts` (sessionIdパース)

## Testing Strategy
1. validate-impl Agentを起動し、完了を待つ
2. 完了後にログを選択
3. sessionIdがある場合: 送信ボタンがアクティブになることを確認
4. sessionIdがない場合: 適切なメッセージが表示されることを確認
