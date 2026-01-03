# Bug Fix: auto-execution-state-sync

## Summary
Main ProcessからのIPCイベントがRenderer側のspecStoreに反映されない問題を修正。

## Root Cause
コミット`efb20dd`で旧`AutoExecutionService.syncFromSpecAutoExecution()`を削除した際、IPCイベント受信時にspecStoreを更新する処理が実装されていなかった。

## Solution: specStoreをSSoT（Single Source of Truth）として確立

### 修正ファイル

1. **`src/renderer/stores/spec/autoExecutionStore.ts`**
   - `initAutoExecutionIpcListeners()` 関数を追加
   - `cleanupAutoExecutionIpcListeners()` 関数を追加
   - IPCイベント（`AUTO_EXECUTION_STATUS_CHANGED`）受信時にspecStoreを直接更新

2. **`src/renderer/App.tsx`**
   - アプリ初期化時に`initAutoExecutionIpcListeners()`を呼び出し

3. **`src/renderer/hooks/useAutoExecution.ts`**
   - 重複するIPCイベントリスナーを削除（specStoreへの一本化）

4. **`src/main/ipc/autoExecutionHandlers.ts`**
   - デバッグログを追加（state-changedイベント受信時）

### 追加テスト

- `src/renderer/stores/spec/autoExecutionStore.test.ts`
  - IPCリスナー登録テスト
  - IPCイベントハンドリングテスト（running, completed, error, paused, completing状態）
  - 複数spec独立管理テスト

## Verification

### E2Eテスト結果（修正後）

```
[chrome 134.0.6998.205 mac #0-0]     During Auto Execution
[chrome 134.0.6998.205 mac #0-0]        ✓ should show spec in spec-list with correct state
[chrome 134.0.6998.205 mac #0-0]        ✓ should disable requirements execute button during execution
[chrome 134.0.6998.205 mac #0-0]        ✓ should change auto-execute button to stop button  ← 修正対象
[chrome 134.0.6998.205 mac #0-0]        ✓ should disable all validate buttons during execution
```

修正前は「停止」ボタンに変わらなかったテストが成功。

### ユニットテスト結果

```
 ✓ src/renderer/stores/spec/autoExecutionStore.test.ts (33 tests) 7ms
   - 既存23テスト + 新規10テスト（IPCリスナー関連）
```

## Related Changes

### wdio.conf.ts改善
E2Eテストで`npm run build`の成果物を直接使用するように変更：
- デフォルト: `appEntryPoint`（`dist/main/index.js`）を使用
- パッケージ済みアプリを使用する場合: `E2E_USE_PACKAGED_APP=true`

## Architecture After Fix

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process                                                 │
├─────────────────────────────────────────────────────────────┤
│ AutoExecutionCoordinator                                    │
│     │                                                       │
│     └── emit('state-changed', specPath, state)              │
│              │                                              │
│              ▼                                              │
│ autoExecutionHandlers.ts                                    │
│     └── broadcastToRenderers(AUTO_EXECUTION_STATUS_CHANGED) │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Renderer Process                                             │
├─────────────────────────────────────────────────────────────┤
│ App.tsx                                                      │
│     └── initAutoExecutionIpcListeners() ← アプリ初期化時    │
│              │                                              │
│              ▼                                              │
│ autoExecutionStore.ts (SSoT)                                │
│     └── onAutoExecutionStatusChanged callback               │
│              │                                              │
│              └── useAutoExecutionStore.setState(...)        │
│                       │                                     │
│                       ▼                                     │
│ specStoreFacade.ts (subscribe)                              │
│     └── useSpecStoreFacade.setState(getAggregatedState())   │
│                       │                                     │
│                       ▼                                     │
│ WorkflowView.tsx                                            │
│     └── autoExecutionRuntimeMap.get(specId)                 │
│              └── isAutoExecuting: true  ✓                   │
└─────────────────────────────────────────────────────────────┘
```

## Status
**Fixed** - 2026-01-03
