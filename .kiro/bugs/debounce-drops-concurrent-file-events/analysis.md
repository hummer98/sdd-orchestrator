# Bug Analysis: debounce-drops-concurrent-file-events

## Summary
SpecsWatcherServiceのdebounce処理が単一タイマーで実装されているため、300ms以内に複数ファイルが変更されると最後のイベントのみRendererに通知され、tasks.mdなど他のファイル変更がUIに反映されない。

## Root Cause

### Technical Details
- **Location**: [specsWatcherService.ts:106-114](electron-sdd-manager/src/main/services/specsWatcherService.ts#L106-L114)
- **Component**: SpecsWatcherService (Main Process)
- **Trigger**: 同一spec内で300ms以内に複数ファイルが変更される場合（inspection実行中など）

### 問題のコード
```typescript
// specsWatcherService.ts:28-29
private debounceTimer: NodeJS.Timeout | null = null;  // 単一タイマー
private debounceMs = 300;

// specsWatcherService.ts:106-114
private handleEvent(type: SpecsChangeEvent['type'], filePath: string): void {
  // ...

  // Debounce to avoid multiple rapid events
  if (this.debounceTimer) {
    clearTimeout(this.debounceTimer);  // 前のイベントをキャンセル！
  }

  this.debounceTimer = setTimeout(() => {
    const event: SpecsChangeEvent = { type, path: filePath, specId };
    this.callbacks.forEach((cb) => cb(event));
  }, this.debounceMs);
}
```

### 問題の本質
1. 単一の`debounceTimer`を共有しているため、新しいイベントが来ると前のイベントがキャンセルされる
2. inspection実行時のイベントシーケンス:
   - `tasks.md` 変更 → タイマー開始
   - 150ms後: `inspection-1.md` 作成 → 前のタイマーをキャンセル、新タイマー開始
   - 300ms後: `inspection-1.md` のイベントのみ通知
   - 結果: `tasks.md` の変更がRenderer側に届かない

## Impact Assessment
- **Severity**: Medium
- **Scope**: inspection実行中のtasks.md更新、および短時間に複数ファイルが変更される全シナリオ
- **Risk**: ユーザーがUIの更新を見逃し、手動リロードが必要になる

### 影響を受けるシナリオ
1. spec-inspection実行中のtasks.md更新
2. 複数のartifactを連続生成するワークフロー
3. 外部ツールによる複数ファイルの一括更新

## Related Code

### 問題のあるサービス
| サービス | 実装方式 | 状態 |
|----------|----------|------|
| SpecsWatcherService | 単一タイマー | **問題あり** |
| BugsWatcherService | 単一タイマー | **同様の問題あり** |
| AgentRecordWatcherService | ファイルパスごとのMap | 正常 |

### 正しい実装例（AgentRecordWatcherService）
```typescript
// agentRecordWatcherService.ts:29-30
private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
private debounceMs = 100;

// agentRecordWatcherService.ts:127-153
private handleAgentRecordChange(filePath: string, type: 'add' | 'change'): void {
  // Clear existing debounce timer for this file
  const existingTimer = this.debounceTimers.get(filePath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    this.debounceTimers.delete(filePath);
    // ... process event
  }, this.debounceMs);

  this.debounceTimers.set(filePath, timer);
}
```

## Proposed Solution

### Option 1: ファイルパスごとのdebounce（推奨）
- **Description**: AgentRecordWatcherServiceと同様に`Map<string, NodeJS.Timeout>`を使用
- **Pros**:
  - 各ファイルのイベントが独立して処理される
  - 既存の実装パターンに準拠
  - 同一ファイルの連続変更のみdebounceされる
- **Cons**:
  - メモリ使用量が若干増加（タイマーの数だけ）
  - stop()でMapのクリーンアップが必要

### Option 2: イベントキューによるバッチ処理
- **Description**: debounce期間中のイベントをキューに溜めて一括通知
- **Pros**: 単一のタイマーで全イベントを処理可能
- **Cons**:
  - 実装が複雑
  - Renderer側でバッチ処理対応が必要
  - 既存のAPIを変更する必要あり

### Recommended Approach
**Option 1: ファイルパスごとのdebounce**

理由:
1. AgentRecordWatcherServiceで実績のあるパターン
2. 既存のRenderer側コード変更が不要
3. シンプルで理解しやすい
4. BugsWatcherServiceも同時に修正可能

## Dependencies
- `electron-sdd-manager/src/main/services/specsWatcherService.ts` - メイン修正対象
- `electron-sdd-manager/src/main/services/bugsWatcherService.ts` - 同様の修正推奨

## Testing Strategy

### 単体テスト
1. 異なるファイルの同時変更が両方通知されることを確認
2. 同一ファイルの連続変更がdebounceされることを確認
3. stop()時にすべてのタイマーがクリアされることを確認

### E2Eテスト
1. spec-inspection実行中にtasks.mdが更新されるシナリオ
2. 複数artifact連続生成時のUI更新確認

### 手動テスト
1. inspection実行 → タスクパネルがリアルタイム更新されることを確認
