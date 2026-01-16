# Bug Analysis: bug-auto-execution-ipc-migration

## Summary
BugAutoExecutionServiceがRenderer Processでローカル状態管理を行っており、Phase 1で構築したMain Process側のBugAutoExecutionCoordinatorを使用していない。これにより、Spec自動実行（useAutoExecution + AutoExecutionCoordinator）とアーキテクチャが不整合になっている。

## Root Cause

### Technical Details
- **Location**: [BugAutoExecutionService.ts](electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts) 全体
- **Component**: BugAutoExecutionService (Renderer Process)
- **Trigger**: Bug自動実行の開始・停止・状態管理がRenderer Process内で完結

### 根本原因
1. **BugAutoExecutionService**がRenderer Process内でローカル状態（`this.state`）を管理
2. **Main Process側のBugAutoExecutionCoordinator**（Phase 1で構築済み）が未使用
3. IPCハンドラー（`bugAutoExecutionStart`, `bugAutoExecutionStop`等）が未呼び出し

### コード比較

**Bug（現状）- Renderer Processでローカル管理**
```typescript
// BugAutoExecutionService.ts:32
private state: BugAutoExecutionState = { ...DEFAULT_BUG_AUTO_EXECUTION_STATE };

// start()メソッド:353-359
this.state = {
  isAutoExecuting: true,
  currentAutoPhase: firstPhase,
  autoExecutionStatus: 'running',
  ...
};
```

**Spec（正しいパターン）- Main Process + IPC**
```typescript
// useAutoExecution.ts:152
const result = await window.electronAPI.autoExecutionStart({
  specPath,
  specId,
  options,
});
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bug自動実行機能全体
- **Risk**:
  - Phase 1で構築したインフラが活用されない
  - Spec/Bug間でアーキテクチャが不整合
  - 将来の拡張・保守性に影響

## Related Code

### 変更が必要なファイル
| ファイル | 変更内容 |
|---------|---------|
| `BugAutoExecutionService.ts` | IPCクライアントに書き換え |
| `BugWorkflowView.tsx` | 新しいAPI呼び出しに対応 |

### 参照すべき実装
| ファイル | 参考ポイント |
|---------|-------------|
| `useAutoExecution.ts` | IPCクライアントパターン |
| `autoExecutionStore.ts` | IPCイベントリスナー登録 |

## Proposed Solution

### ✅ 推奨: BugAutoExecutionServiceをIPCクライアントに書き換え

**設計原則**:
- SSOT: Main ProcessのBugAutoExecutionCoordinatorが状態の唯一の真実の源泉
- DRY: useAutoExecution.tsと同様のパターンを採用

**実装方針**:

1. **BugAutoExecutionService.ts書き換え**:
   - ローカル状態管理（`this.state`）を削除
   - `start()` → `window.electronAPI.bugAutoExecutionStart()` 呼び出し
   - `stop()` → `window.electronAPI.bugAutoExecutionStop()` 呼び出し
   - `retryFrom()` → `window.electronAPI.bugAutoExecutionRetryFrom()` 呼び出し
   - `getStatus()` → `window.electronAPI.bugAutoExecutionStatus()` 呼び出し

2. **IPCイベントリスナー追加**:
   - `onBugAutoExecutionStatusChanged` でMain Processからの状態変更を受信
   - `onBugAutoExecutionPhaseCompleted` でフェーズ完了通知を受信
   - `onBugAutoExecutionError` でエラー通知を受信

3. **BugWorkflowView.tsx更新**:
   - 新しいAPIに合わせて呼び出しを調整

**アーキテクチャ（修正後）**:
```
Renderer Process                   Main Process
┌─────────────────┐               ┌─────────────────────────┐
│ BugAutoExecution│   IPC Call    │ BugAutoExecution        │
│ Service         │──────────────▶│ Coordinator (SSoT)      │
│ (IPC Client)    │               │                         │
│                 │◀──────────────│ state-changed events    │
│                 │   IPC Events  │                         │
└─────────────────┘               └─────────────────────────┘
```

## Dependencies
- Phase 1完了済み: `475a61c` fix(auto-execution-ui-state-dependency)
- 利用可能API:
  - `window.electronAPI.bugAutoExecutionStart()`
  - `window.electronAPI.bugAutoExecutionStop()`
  - `window.electronAPI.bugAutoExecutionStatus()`
  - `window.electronAPI.bugAutoExecutionRetryFrom()`
  - `window.electronAPI.onBugAutoExecutionStatusChanged()`
  - `window.electronAPI.onBugAutoExecutionPhaseCompleted()`
  - `window.electronAPI.onBugAutoExecutionError()`
  - `window.electronAPI.onBugAutoExecutionCompleted()`
  - `window.electronAPI.onBugAutoExecutionExecutePhase()`

## Testing Strategy
1. **単体テスト**: BugAutoExecutionService.test.ts更新
   - IPC呼び出しのモック
   - イベントリスナーのテスト
2. **統合テスト**: BugWorkflowView.test.tsx
   - 自動実行開始・停止の動作確認
3. **E2Eテスト**: 実際のエージェント実行テスト

## Design Principles Check
- ✅ **SSOT**: Main ProcessのBugAutoExecutionCoordinatorが状態の唯一の源泉
- ✅ **関心の分離**: Renderer=UI操作・表示、Main=ビジネスロジック
- ✅ **DRY**: useAutoExecution.tsと同じIPCクライアントパターン
- ✅ **一貫性**: Spec自動実行と同じアーキテクチャ
