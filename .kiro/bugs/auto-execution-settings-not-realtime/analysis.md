# Bug Analysis: auto-execution-settings-not-realtime

## Summary
自動実行中にGO/NOGO設定を変更しても、`executionOptions` キャッシュが使われ続けるため、フェーズ遷移時に最新の設定が反映されない。

## Root Cause
`autoExecutionCoordinator.start()` 呼び出し時に `AutoExecutionOptions`（`permissions` を含む）が `executionOptions` マップにキャッシュされ、以降のフェーズ遷移では常にこのキャッシュを参照している。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts`
- **Component**: `AutoExecutionCoordinator`
- **Trigger**: 自動実行中にUIでGO/NOGO設定を変更

### キャッシュ設定箇所
```typescript
// L387: start() でキャッシュに保存
this.executionOptions.set(specPath, options);
```

### キャッシュ参照箇所（全7箇所）
| 行 | メソッド | 用途 |
|----|---------|------|
| L657 | `handleAgentCompleted` | 次フェーズ判定（**主要な問題箇所**） |
| L759 | `getOptions` | オプション取得API |
| L930 | `markPhaseComplete` | フェーズ完了時の次フェーズ判定 |
| L1104 | `checkTimeout` | タイムアウト判定 |
| L1222 | `canRetryFromPhase` | リトライ可否判定 |
| L1386 | `handleDocumentReviewCompleted` | Document Review後の次フェーズ判定 |

### 矛盾点
興味深いことに、`approvals`（承認状態）は既に毎回 `spec.json` から読み直している（L672-685）が、`permissions`（GO/NOGO設定）はキャッシュを使用し続けている。

```typescript
// L672-678: approvalsは毎回spec.jsonから読み直し
let latestApprovals = options.approvals;
try {
  const specJsonPath = require('path').join(specPath, 'spec.json');
  const content = require('fs').readFileSync(specJsonPath, 'utf-8');
  const specJson = JSON.parse(content);
  latestApprovals = specJson.approvals;  // ✅ 最新を取得
  ...

// L688: permissionsはキャッシュを使用
const nextPhase = this.getImmediateNextPhase(currentPhase, options.permissions, latestApprovals);
//                                                        ^^^^^^^^^^^^^^^^^^^ ❌ キャッシュ
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: 自動実行中にGO/NOGO設定を変更したいユーザーに影響
- **Risk**: 低 - 機能が動作しないだけで、データ破損等は発生しない

## Proposed Solution

### Option 1: `getOptions()` を毎回 spec.json から読み直す（推奨）
- **Description**: `getOptions()` メソッドを変更し、キャッシュではなく `spec.json.autoExecution` から最新の設定を読み直す
- **Pros**:
  - SSOTの原則に従う（spec.json が唯一の真実の源）
  - 既存の `approvals` 読み直しパターンと一貫性がある
  - 変更箇所が1メソッドに集約
- **Cons**:
  - フェーズ遷移ごとにファイルI/Oが発生（ただし `approvals` で既に行っている）

### Option 2: `permissions` も `approvals` と同様に個別に読み直す
- **Description**: `approvals` を読み直している箇所で `permissions` も読み直す
- **Pros**: 変更が局所的
- **Cons**: コードの重複、一貫性が低い

### Recommended Approach
**Option 1** を推奨。`getOptions()` を以下のように変更：

```typescript
getOptions(specPath: string): AutoExecutionOptions | undefined {
  // spec.json から最新の設定を読み直す
  try {
    const specJsonPath = require('path').join(specPath, 'spec.json');
    const content = require('fs').readFileSync(specJsonPath, 'utf-8');
    const specJson = JSON.parse(content);

    if (specJson.autoExecution) {
      const cached = this.executionOptions.get(specPath);
      return {
        permissions: specJson.autoExecution.permissions ?? cached?.permissions ?? DEFAULT_PERMISSIONS,
        documentReviewFlag: specJson.autoExecution.documentReviewFlag ?? 'pause',
        timeoutMs: cached?.timeoutMs,
        commandPrefix: cached?.commandPrefix,
        approvals: specJson.approvals,
      };
    }
  } catch (err) {
    logger.warn('[AutoExecutionCoordinator] Failed to read spec.json, using cached options', { specPath, error: err });
  }

  // フォールバック: キャッシュを返す
  return this.executionOptions.get(specPath);
}
```

## Dependencies
- `spec.json.autoExecution.permissions` の構造が `AutoExecutionPermissions` と一致していること
- UI側での `spec.json` への設定保存が正しく行われていること（既に実装済み: `workflowStore.ts:persistSettingsToSpec()`）

## Testing Strategy
1. **Unit Test**: `getOptions()` が毎回最新の `spec.json` を読むことを確認
2. **Integration Test**:
   - 自動実行開始
   - UI で GO/NOGO 設定を変更
   - 次フェーズ遷移時に新しい設定が反映されることを確認
3. **Edge Case**: `spec.json` が読めない場合にフォールバックが機能することを確認
