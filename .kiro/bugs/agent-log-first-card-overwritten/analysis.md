# Bug Analysis: agent-log-first-card-overwritten

## Summary
`resumeAgent` でエージェントに追加指示を出すと、AgentLogPanelの先頭に表示されるコマンドラインカード（最初のコマンド）が最新のresumeコマンドで上書きされてしまう。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/specManagerService.ts:1529, 1544`
- **Component**: SpecManagerService.resumeAgent()
- **Trigger**: resumeAgentが実行された際に、AgentRecordの `command` フィールドがresume用のコマンドライン（`claude --resume <sessionId> --resume-prompt "続けて"`）で上書きされる

**問題の流れ**:

1. **初期実行時**: `startAgent` で `agent.command` に初回コマンド（例: `claude /kiro:spec-requirements feature`）が記録される
2. **Resume時**: `resumeAgent` (specManagerService.ts:1529, 1544) が `agent.command` を新しいコマンドライン（`claude --resume <sessionId> --resume-prompt "追加指示"`）で **上書き** してしまう
3. **UI表示**: AgentLogPanel.tsx:137-145 が `agent.command` をコマンドラインカードとして先頭に表示するため、初回コマンドが失われてresumeコマンドが表示される

**根本原因**:
- `agent.command` フィールドが **「初回実行時のコマンド」を保存するフィールド** として設計されているにも関わらず、`resumeAgent` で **最新のコマンド（resume用）** に更新されてしまう
- **Single Source of Truth (SSOT) 違反**: `command` フィールドが「初回コマンド」と「最新コマンド」の2つの役割を持ってしまっている
- AgentLogPanelは `agent.command` を「初回コマンド」として表示するが、resumeAgent がこれを「最新コマンド」として上書きする

### 関連コード

**specManagerService.ts:1524-1531** (resumeAgent):
```typescript
const updatedAgentInfo: AgentInfo = {
  ...agent,
  pid: process.pid,
  status: 'running',
  lastActivityAt: now,
  command: `${command} ${args.join(' ')}`, // ← resume用コマンドで上書き
  executions: updatedExecutions,
};
```

**specManagerService.ts:1540-1547** (resumeAgent, recordService更新):
```typescript
await this.recordService.updateRecord(agent.specId, agentId, {
  pid: process.pid,
  status: 'running',
  lastActivityAt: now,
  command: `${command} ${args.join(' ')}`, // ← ここでも上書き
  executions: updatedExecutions,
  autoResumeCount: 0,
});
```

**AgentLogPanel.tsx:133-152** (コマンドカード生成):
```typescript
const parsedEntries = useMemo(() => {
  const entries: ParsedLogEntry[] = [];

  // Add command entry if provided
  if (agent?.command) {
    entries.push({
      id: 'command-line',
      type: 'system',
      engineId: agent.engineId,
      session: {
        cwd: agent.command, // ← agent.commandを初回コマンドとして表示
      },
    });
  }

  // Add all pre-parsed log entries
  entries.push(...logs);

  return entries;
}, [logs, agent?.command, agent?.engineId]);
```

## Impact Assessment
- **Severity**: Medium
- **Scope**:
  - エージェントを resume する全てのユーザーに影響
  - 特に複数回 resume する場合、最初のコマンドが完全に失われる
  - デバッグやトラブルシューティング時にエージェントの初回実行コマンドを確認できない
- **Risk**:
  - ユーザーが「どのコマンドでエージェントを起動したか」を忘れる
  - 複数回resumeした場合、どのコマンドが最初だったか分からなくなる
  - ログの一貫性が失われる

## Proposed Solution

### 設計上の問題点
- `agent.command` フィールドが **「初回コマンド」（UI表示用、不変）** と **「最新コマンド」（デバッグ用、可変）** の2つの役割を持っている
- SSOT原則に違反: 1つのフィールドが複数の意味を持つべきではない

### Option 1: `command` フィールドをイミュータブルにする（**推奨**）

**説明**:
- `agent.command` を **初回コマンドのみを記録するイミュータブルフィールド** として扱う
- `resumeAgent` では `command` フィールドを更新しない（既存の `command` を保持）
- 最新のコマンドが必要な場合は、`executions` 配列の最新エントリの `prompt` フィールドを参照

**変更内容**:
1. **specManagerService.ts:1524-1547**: `resumeAgent` で `command` フィールドを更新しない
   ```typescript
   const updatedAgentInfo: AgentInfo = {
     ...agent,
     pid: process.pid,
     status: 'running',
     lastActivityAt: now,
     // command: `${command} ${args.join(' ')}`, ← この行を削除
     executions: updatedExecutions,
   };

   await this.recordService.updateRecord(agent.specId, agentId, {
     pid: process.pid,
     status: 'running',
     lastActivityAt: now,
     // command: `${command} ${args.join(' ')}`, ← この行を削除
     executions: updatedExecutions,
     autoResumeCount: 0,
   });
   ```

**Pros**:
- **SSOT原則に準拠**: `command` = 初回コマンド（不変）、`executions[].prompt` = 各実行の指示（可変）
- **シンプルな修正**: `resumeAgent` で `command` を更新しないだけ
- **既存UIとの互換性**: AgentLogPanel.tsx の変更不要
- **デバッグ性**: `executions` 配列に全履歴が記録されているため、最新コマンドも確認可能

**Cons**:
- 最新のコマンドラインを直接取得する方法がなくなる（`executions` 配列を参照する必要がある）

### Option 2: `initialCommand` フィールドを新規追加

**説明**:
- `agent.command` を最新コマンドとして扱い、初回コマンド用に `agent.initialCommand` を新規追加
- `startAgent` で `initialCommand` を記録、`resumeAgent` では更新しない
- AgentLogPanel.tsx で `agent.initialCommand` を使用

**変更内容**:
1. **agentRecordService.ts**: `AgentRecord` インターフェースに `initialCommand?: string` を追加
2. **specManagerService.ts**: `startAgent` で `initialCommand` を記録
3. **AgentLogPanel.tsx**: `agent.initialCommand || agent.command` を使用

**Pros**:
- 役割が明確: `initialCommand` = 初回、`command` = 最新
- 既存ロジックへの影響が少ない

**Cons**:
- **YAGNI違反**: `command` フィールドが実質的に使われていないのに、新しいフィールドを追加する
- **冗長性**: `executions` 配列に全履歴があるのに、別途 `initialCommand` を持つ必要がない
- **型定義・マイグレーション**: 既存レコードへの対応が必要

### Recommended Approach
**Option 1 を推奨**

**理由**:
1. **SSOT原則**: `command` は初回コマンド（不変）、`executions` は実行履歴（可変）として役割を明確化
2. **YAGNI原則**: 新しいフィールドを追加する必要がない
3. **最小変更**: `resumeAgent` で `command` を更新しないだけ（2箇所の削除のみ）
4. **既存UIとの互換性**: AgentLogPanel.tsx の変更不要
5. **デバッグ性**: `executions` 配列に全履歴が残るため、最新コマンドも確認可能

**実装方針**:
- `agent.command` は **初回コマンドのみを記録** する（startAgentで1回だけセット）
- `resumeAgent` では `command` フィールドを更新しない
- 最新のコマンドが必要な場合は `executions[executions.length - 1].prompt` を参照

## Dependencies
- `electron-sdd-manager/src/main/services/specManagerService.ts` (resumeAgent)
- `electron-sdd-manager/src/shared/components/agent/AgentLogPanel.tsx` (コマンドカード表示)
- `electron-sdd-manager/src/main/services/agentRecordService.ts` (AgentRecord型定義)

## Testing Strategy
- **E2Eテスト**: `electron-sdd-manager/e2e-wdio/agent-resume-log-display.e2e.spec.ts` が既に存在
  - このテストは「resume後もログが保持される」ことを確認しているが、コマンドカードが初回コマンドであることは確認していない
  - テストを拡張して、コマンドカードが初回コマンドであることを検証
- **Unit Test**: specManagerService.ts の resumeAgent テスト
  - `command` フィールドが更新されないことを確認
- **UI Test**: AgentLogPanel.test.tsx
  - resume後も先頭カードが初回コマンドであることを確認
