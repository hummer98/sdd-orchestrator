# AutoExecution 状態同期バグ

## 発見日
2026-01-03

## 概要
自動実行ボタンクリック後、Main ProcessではAutoExecutionCoordinatorが正常に開始されるが、Renderer側のspecStoreに状態が同期されないバグ。

## 症状
- E2Eテストでボタンクリック後に`isAutoExecuting`が`true`にならない
- ボタンテキストが「停止」に変わらず「自動実行」のまま
- Main Processログには正常に`start called`と`Auto-execution started`が記録される

## ログ証拠

### Main Process（正常動作）
```
[2026-01-03T12:51:18.847Z] [INFO] [AutoExecutionCoordinator] start called {"specPath":"...","specId":"test-feature"}
[2026-01-03T12:51:18.848Z] [INFO] [AutoExecutionCoordinator] Auto-execution started {"specPath":"...","specId":"test-feature"}
```

### Renderer（状態未反映）
```
isAutoExecuting: false  ← Main Processでは started なのに false
```

## 原因分析

### 状態同期の流れ（期待動作）
```
1. ボタンクリック
2. Renderer: window.electronAPI.autoExecutionStart() → IPC
3. Main Process: AutoExecutionCoordinator.start() → 成功
4. Main Process: イベント発火 → IPC経由でRendererに通知
5. Renderer: specStore.setAutoExecutionRunning(true)
6. UI更新: ボタンが「停止」に変わる
```

### 問題点
ステップ4-5が正しく動作していない可能性:
1. Main Processからのイベント発火が行われていない
2. IPC経由の通知が届いていない
3. Rendererのイベントリスナーが登録されていない
4. specStoreの更新が失敗している

## 影響範囲
- `simple-auto-execution.e2e.spec.ts`
- `auto-execution-flow.e2e.spec.ts`
- `auto-execution-workflow.e2e.spec.ts`

## 関連ファイル

### Main Process
- `src/main/services/autoExecutionCoordinator.ts` - 状態管理・イベント発火元
- `src/main/ipc/autoExecutionHandlers.ts` - IPCハンドラー

### Renderer
- `src/renderer/hooks/useAutoExecution.ts` - IPCイベントリスナー
- `src/renderer/stores/spec/specStoreFacade.ts` - specStore

### IPC
- `src/main/ipc/channels.ts` - チャンネル定義
  - `AUTO_EXECUTION_STATUS_CHANGED`
  - `AUTO_EXECUTION_PHASE_STARTED`

## 調査ポイント

### 1. Main ProcessでIPCイベントが発火されているか
`autoExecutionCoordinator.ts`で`emit('status-changed', ...)`が呼ばれているか、それがIPC経由でRendererに送られているか確認。

### 2. autoExecutionHandlers.tsでイベント転送しているか
Coordinatorのイベントを`webContents.send()`でRendererに転送する処理があるか確認。

### 3. useAutoExecution.tsでイベントリスナーが登録されているか
`onAutoExecutionStatusChanged`のリスナーが正しく登録・呼び出されているか確認。

### 4. specStoreの更新が行われているか
イベント受信時に`setAutoExecutionRunning(specId, true)`が呼ばれているか確認。

## 解決済みの問題

### ALREADY_EXECUTING エラー（解決済み）
- **症状**: 2回目以降のテストでMain Processが「Already executing」と拒否
- **原因**: テスト間でMain Process側の状態がリセットされなかった
- **対策**: `resetAutoExecutionCoordinator()` E2Eヘルパーを追加
- **実装**:
  - `AutoExecutionCoordinator.resetAll()` メソッド追加
  - `AUTO_EXECUTION_RESET` IPCチャンネル追加
  - E2Eヘルパーの`beforeEach`で呼び出し

## 次のアクション
1. Main Process → Renderer へのイベント通知フローを調査
2. `autoExecutionHandlers.ts`でCoordinatorイベントのIPC転送を確認
3. 必要に応じてイベント通知の実装を修正
