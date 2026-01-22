# Bug Analysis: project-agent-no-response

## Summary
ProjectAgent（specId=''）に対するresumeAgent操作が失敗する。`findRecordByAgentId`がProjectAgentのレコードを検索対象に含めていないため。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/agentRecordService.ts:306-317`
- **Component**: `AgentRecordService.findRecordByAgentId()`
- **Trigger**: `resumeAgent`呼び出し時の`getAgentById`（specManagerService.ts:1191）

### 問題の詳細

`findRecordByAgentId`メソッドは全specIdをループして検索するが、`getAllSpecIds()`が**ディレクトリのみ**を返すため、ProjectAgent（ベースディレクトリ直下のJSONファイル）が検索対象外となる。

```typescript
// agentRecordService.ts:306-317
async findRecordByAgentId(agentId: string): Promise<AgentRecord | null> {
  const specIds = await this.getAllSpecIds();  // ← ディレクトリのみ返す
  for (const specId of specIds) {
    const record = await this.readRecord(specId, agentId);
    if (record) return record;
  }
  return null;  // ProjectAgentは常にnullを返す
}
```

```typescript
// agentRecordService.ts:288-297
async getAllSpecIds(): Promise<string[]> {
  const specDirs = await fs.readdir(this.basePath, { withFileTypes: true });
  return specDirs.filter((d) => d.isDirectory()).map((d) => d.name);
  // ↑ ディレクトリのみをフィルタ。ProjectAgentの空specIdは含まれない
}
```

### 結果
- `resumeAgent` → `getAgentById` → `findRecordByAgentId` → `null`を返す
- `resumeAgent`は`NOT_FOUND`エラーを返す
- UIは何も反応しない（エラー通知も適切に表示されていない可能性）

## Impact Assessment
- **Severity**: High
- **Scope**: 全ProjectAgent（specId=''）のresume操作が影響を受ける
- **Risk**: ProjectAgentでの継続プロンプト機能が完全に動作しない

## Related Code

### 影響を受ける呼び出しチェーン
```
[UI] AgentInputPanel.handleSend('続けて')
  → [Store] agentStore.resumeAgent(agentId, prompt)
    → [Adapter] agentStoreAdapter.resumeAgent(agentId, prompt)
      → [IPC] window.electronAPI.resumeAgent(agentId, prompt)
        → [Handler] service.resumeAgent(agentId, prompt)
          → [Service] this.getAgentById(agentId)  // ← ここでnullが返る
            → [RecordService] this.recordService.findRecordByAgentId(agentId)
              → [RecordService] this.getAllSpecIds()  // ProjectAgent非対応
```

### ProjectAgentのファイルパス構造
```
.kiro/agents/
├── {agentId}.json          # ProjectAgent (specId='')
├── spec-name/
│   └── {agentId}.json      # Spec Agent
└── bug:bug-name/
    └── {agentId}.json      # Bug Agent
```

## Proposed Solution

### Option 1: `getAllSpecIds`を修正して空specIdを含める（推奨）

`getAllSpecIds`を修正し、ベースディレクトリに直接存在するJSONファイルがある場合、空文字列（ProjectAgent用specId）を返すリストに含める。

```typescript
async getAllSpecIds(): Promise<string[]> {
  const entries = await fs.readdir(this.basePath, { withFileTypes: true });
  const specIds: string[] = [];

  // ProjectAgentの存在確認（ベースディレクトリ直下のJSONファイル）
  const hasProjectAgents = entries.some((e) => e.isFile() && e.name.endsWith('.json'));
  if (hasProjectAgents) {
    specIds.push('');  // 空specIdを追加
  }

  // 通常のspec/bugディレクトリ
  specIds.push(...entries.filter((d) => d.isDirectory()).map((d) => d.name));

  return specIds;
}
```

**Pros**:
- 最小限の変更
- 既存の`findRecordByAgentId`ロジックがそのまま動作
- 他のspec/bugエージェントに影響なし

**Cons**:
- `getAllSpecIds`の呼び出し元すべてに影響（意図しない副作用の可能性を確認必要）

### Option 2: `findRecordByAgentId`を修正してProjectAgentを明示的に検索

```typescript
async findRecordByAgentId(agentId: string): Promise<AgentRecord | null> {
  // まずProjectAgentを検索
  const projectAgentRecord = await this.readRecord('', agentId);
  if (projectAgentRecord) {
    return projectAgentRecord;
  }

  // 次にspec/bugエージェントを検索
  const specIds = await this.getAllSpecIds();
  for (const specId of specIds) {
    const record = await this.readRecord(specId, agentId);
    if (record) return record;
  }

  return null;
}
```

**Pros**:
- `getAllSpecIds`への影響がない
- ProjectAgentの検索を明示的に制御

**Cons**:
- 検索順序の変更（ProjectAgentを最初に検索）
- コードの重複感

### Recommended Approach

**Option 1**を推奨。理由：
1. SSOTの原則に従い、データソースの取得方法を一箇所で修正
2. `getRunningAgentCounts`（247-280行目）で既にProjectAgentの特殊処理が存在するため、`getAllSpecIds`も同様に扱うのが一貫性がある
3. 変更が最小限で影響範囲が限定的

## Dependencies
- `agentRecordService.ts`のみ修正
- `specManagerService.ts`、`handlers.ts`への変更不要

## Testing Strategy
1. **ユニットテスト**: `findRecordByAgentId`がProjectAgentを正しく返すことを確認
2. **統合テスト**: `resumeAgent`がProjectAgentに対して正常に動作することを確認
3. **E2Eテスト**: UIからProjectAgentの「続けて」ボタンクリック時の動作確認
