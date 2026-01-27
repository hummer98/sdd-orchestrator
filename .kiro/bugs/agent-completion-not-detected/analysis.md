# Bug Analysis: agent-completion-not-detected

## Summary
`kill()`メソッドでコールバック配列が即座にクリアされるため、後続の`close`イベントで`exitCallback`が呼ばれず、agent recordの`status`が`running`のまま更新されない。

## Root Cause

コミット `9ea2ef8` ("SpecsWatcherのログ監視除外とAgentProcessのメモリリーク修正", 2026-01-25) で追加されたコールバッククリア処理がバグの原因。

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/main/services/agentProcess.ts:171-174`
  - `electron-sdd-manager/src/main/services/providerAgentProcess.ts:140-143`
- **Component**: AgentProcess / ProviderAgentProcess
- **Trigger**: Force kill（`type:result`出力後5秒経過してもプロセスが終了しない場合）

### 問題のシーケンス

1. agentが`type:result`を出力してタスク完了を通知
2. 5秒後のForce killタイマーが発火
3. `kill()`が呼ばれ、**コールバック配列が即座にクリアされる**
4. OSから`close`イベントが発火（非同期）
5. `exitCallbacks.forEach()`が呼ばれるが、**配列は空**
6. `handleAgentExit`が呼ばれない
7. agent recordの`status`が`running`のまま

## Impact Assessment
- **Severity**: High
- **Scope**: Force killが発動するすべてのagent実行に影響
- **Risk**:
  - UI上でローディング状態が継続
  - 自動実行ワークフローが停止（完了検出できない）
  - agent recordファイルが不整合な状態で残る

## Related Code

### 問題のコード（agentProcess.ts:168-175）
```typescript
kill(): void {
  this._isRunning = false;
  this.process.kill();
  // Clear callback arrays to prevent memory leaks
  this.outputCallbacks.length = 0;
  this.exitCallbacks.length = 0;   // ← 問題: closeイベント前にクリア
  this.errorCallbacks.length = 0;
}
```

### 正しいコード（close イベントハンドラー内）
```typescript
this.process.on('close', (code: number | null) => {
  // ...
  this._isRunning = false;
  this.exitCallbacks.forEach((cb) => cb(code ?? -1));  // コールバック呼び出し
  // Clear callback arrays to prevent memory leaks
  this.outputCallbacks.length = 0;
  this.exitCallbacks.length = 0;   // ← 正しい: 呼び出し後にクリア
  this.errorCallbacks.length = 0;
});
```

## Proposed Solution

### Option 1: kill()からコールバッククリアを削除（推奨）
- **Description**: `kill()`メソッドからコールバッククリア処理を削除し、`close`イベントハンドラー内でのみクリアする
- **Pros**:
  - 最小限の変更
  - メモリリーク防止の意図は`close`イベントハンドラーで維持される
  - `close`イベントは`kill()`後に必ず発火するため、コールバッククリアは保証される
- **Cons**: なし

### Option 2: kill()でフラグを立ててcloseイベントで処理
- **Description**: `kill()`で`_isKilled`フラグを立て、`close`イベントで特別処理
- **Pros**: 明示的な状態管理
- **Cons**: 複雑化、既存の`forcedKillSuccess`メカニズムと重複

### Recommended Approach
**Option 1** を推奨。理由：
1. `process.kill()`は同期的にプロセスを終了しない。OSが`close`イベントを発火する
2. `close`イベントは`kill()`後に必ず発火するため、そこでコールバッククリアすれば十分
3. 既存の設計原則（コールバック呼び出し後にクリア）に沿っている

## Dependencies
- `electron-sdd-manager/src/main/services/agentProcess.ts`
- `electron-sdd-manager/src/main/services/providerAgentProcess.ts`

## Testing Strategy
1. **ユニットテスト追加**: `kill()`呼び出し後に`exitCallback`が呼ばれることを確認
2. **手動テスト**: Force killが発動するシナリオでagent statusが`completed`に更新されることを確認
3. **回帰テスト**: 既存のE2Eテストでagent完了検出が正常に動作することを確認
