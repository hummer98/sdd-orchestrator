# Bug Analysis: auto-execution-state-sync

## Summary
Main ProcessからのIPCイベント(`AUTO_EXECUTION_STATUS_CHANGED`)がRenderer側のspecStoreに反映されない。リファクタリング時に旧AutoExecutionServiceを削除した際、代替となるIPC連携の実装が漏れていた。

## Root Cause
コミット`efb20dd`で旧`AutoExecutionService.syncFromSpecAutoExecution()`を削除した際、「Main Process AutoExecutionCoordinator now handles state management via IPC events」とコメントしたが、**IPCイベント受信時にspecStoreを更新する処理を実装しなかった**。

### Technical Details
- **Location**: `src/renderer/hooks/useAutoExecution.ts:246-287`
- **Component**: useAutoExecution Hook / specStore (autoExecutionStore)
- **Trigger**: 自動実行ボタンクリック後、IPCイベントはRenderer側で受信されるが、specStoreが更新されない

### 状態管理の二重構造（問題の本質）
```
┌─────────────────────────────────────────────────────┐
│ Renderer Process                                     │
├─────────────────────────────────────────────────────┤
│ useAutoExecution Hook     │  specStore              │
│ (useState - ローカル)      │  (Zustand - グローバル) │
│                           │                         │
│ IPCイベント受信 ──────────┐ │  ← E2E/UIはこちらを参照│
│     ↓                    │ │                        │
│ ローカルstate更新        ✗ │  更新されない！         │
└─────────────────────────────────────────────────────┘
```

## Impact Assessment
- **Severity**: High
- **Scope**: 自動実行機能全体、E2Eテスト全て
- **Risk**: 自動実行のUI状態が正しく表示されない（ボタンテキスト「停止」に変わらない等）

## Related Code

### 現在のIPCイベントリスナー（specStore未更新）
```typescript
// src/renderer/hooks/useAutoExecution.ts:246-250
useEffect(() => {
  const handleStatusChanged = (data: { specPath: string; state: AutoExecutionState }) => {
    setState(data.state);  // ローカルstateのみ更新、specStoreは更新されない
  };
  // ...
});
```

### specStoreには更新メソッドが存在する
```typescript
// src/renderer/stores/spec/autoExecutionStore.ts:41-46
setAutoExecutionRunning: (specId: string, isRunning: boolean) => {
  const map = new Map(get().autoExecutionRuntimeMap);
  const current = map.get(specId) ?? { ...DEFAULT_AUTO_EXECUTION_RUNTIME };
  map.set(specId, { ...current, isAutoExecuting: isRunning });
  set({ autoExecutionRuntimeMap: map });
},
```

## Proposed Solution

### 推奨: specStoreをSSoTとして確立

**設計方針**:
- specStore (autoExecutionStore) をRenderer側のSSoTとする
- useAutoExecutionフックはIPC呼び出し専用に縮小
- IPCイベント受信時にspecStoreを直接更新

**実装ステップ**:
1. アプリ初期化時にIPCイベントリスナーを登録（specStore更新）
2. useAutoExecutionのローカルstate管理を削除
3. useAutoExecutionは派生値をspecStoreから取得
4. 不足テストを追加

### 修正対象ファイル
- `src/renderer/hooks/useAutoExecution.ts` - ローカルstate削除、specStore連携
- `src/renderer/stores/spec/autoExecutionStore.ts` - IPCリスナー登録
- `src/renderer/App.tsx` または初期化ポイント - リスナー登録呼び出し

## Dependencies
- `src/preload/index.ts` - IPCイベントAPI（既存、変更不要）
- `src/main/ipc/autoExecutionHandlers.ts` - イベント発火（既存、変更不要）

## Testing Strategy
1. **ユニットテスト**: `useAutoExecution.test.ts` を新規作成
   - IPCイベント受信時のspecStore更新を検証
2. **E2Eテスト**: 既存の`simple-auto-execution.e2e.spec.ts`で検証
   - `isAutoExecuting`が`true`になることを確認
3. **統合テスト**: ボタンクリック→IPC→specStore→UI更新の一連のフロー
