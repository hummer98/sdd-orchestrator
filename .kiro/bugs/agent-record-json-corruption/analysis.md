# Bug Analysis: agent-record-json-corruption

## Summary
AgentRecordService.updateRecordが排他制御なしでread-modify-writeを行うため、高頻度の並行呼び出しでJSONファイルが破損する。

## Root Cause
**並行書き込みによるファイル破損（Race Condition）**

### Technical Details
- **Location**: [agentRecordService.ts:265-278](electron-sdd-manager/src/main/services/agentRecordService.ts#L265-L278)
- **Component**: AgentRecordService
- **Trigger**: handleAgentOutputからのfire-and-forget呼び出し（703行目）

### 詳細メカニズム

1. **updateRecordのパターン**（排他制御なし）:
```typescript
// agentRecordService.ts:265-277
async updateRecord(specId, agentId, update) {
  const record = await this.readRecord(specId, agentId);  // T1: 読み込み
  const updatedRecord = { ...record, ...update };          // T2: 変更
  await this.writeRecord(updatedRecord);                   // T3: 書き込み
}
```

2. **fire-and-forget呼び出し**:
```typescript
// specManagerService.ts:703-707
this.recordService.updateRecord(specId, agentId, {
  lastActivityAt: new Date().toISOString(),
}).catch(() => {});  // awaitなし、エラー無視
```

3. **競合シナリオ**:
```
Thread A: readRecord()  → データ取得
Thread B: readRecord()  → 同じデータ取得
Thread A: writeRecord() → ファイル書き込み開始
Thread B: writeRecord() → ファイル書き込み開始（競合）
```

4. **Node.js fs.writeFileの動作**:
   - `fs.writeFile`は内部でtruncate→writeを行う
   - 複数プロセスから同時に呼ばれると、truncateとwriteが交錯
   - 結果：一方のwriteが途中で切れ、もう一方のデータが追記される

## Impact Assessment
- **Severity**: Medium
- **Scope**: Agent一覧表示、Agent状態追跡が機能しなくなる
- **Risk**: UIが壊れたJSONをパースできず表示不能に。手動修正が必要。

## Related Code

**呼び出し箇所一覧**:
| 場所 | 行番号 | パターン | 頻度 |
|------|--------|----------|------|
| handleAgentOutput | 703 | fire-and-forget | 高（出力ごと） |
| handleAgentError | 783 | fire-and-forget | 低 |
| stopAgent | 809 | await | 低 |
| その他 | 複数 | 様々 | 低 |

**最も問題なのは703行目**: Agent出力のたびに呼ばれ、高頻度で競合が発生。

## Proposed Solution

### Option 1: agentIdごとのミューテックス導入
- Description: updateRecord内でagentIdをキーとしたロックを取得
- Pros: 確実に競合を防止、最小限の変更
- Cons: ロック管理のオーバーヘッド

### Option 2: アトミック書き込み（write-rename）
- Description: 一時ファイルに書き込み後、renameでアトミックに置換
- Pros: ファイルシステムレベルでアトミック性保証
- Cons: 実装がやや複雑

### Option 3: lastActivityAt更新のスロットリング
- Description: 一定間隔（例：1秒）でのみ更新を実行
- Pros: 書き込み頻度を大幅削減、パフォーマンス向上
- Cons: 最終活動時刻の精度が下がる

### Recommended Approach
**Option 1（ミューテックス）+ Option 3（スロットリング）の組み合わせ**

理由：
- ミューテックスで確実に競合を防止
- スロットリングで書き込み頻度を削減しパフォーマンス向上
- lastActivityAtの精度は1秒程度で十分（hang検出用途）

## Dependencies
- `agentRecordService.ts` のみ変更
- 呼び出し側（specManagerService.ts）の変更は不要

## Testing Strategy
1. **ユニットテスト**: 並行updateRecord呼び出しでファイルが破損しないことを確認
2. **統合テスト**: 長時間のspec-impl実行後にJSONが正常であることを確認
3. **手動テスト**: 高頻度出力を伴うAgentを実行し、完了後にJSON検証
