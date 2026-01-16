# Bug Analysis: auto-execution-ui-state-dependency

## Summary
BugAutoExecutionServiceがRenderer Processに配置され、UI状態（`useBugStore.selectedBug`）に依存している。これはSpec自動実行（`AutoExecutionCoordinator`）の正しいアーキテクチャと一貫性がない。

## Root Cause

### Technical Details
- **Location**: [BugAutoExecutionService.ts](electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts) 全体
- **Component**: BugAutoExecutionService (Renderer Process)
- **Trigger**: 自動実行中に別のbugがUIで選択される、または`selectedBug`がnullになる

### 根本原因：アーキテクチャの不整合

**Bug自動実行はRenderer ProcessでUI状態に依存している**が、
**Spec自動実行はMain Processで独立した状態管理をしている**。

```typescript
// Bug（問題あり）- Renderer Process
private async executePhase(phase: BugWorkflowPhase): Promise<void> {
  const bugStore = useBugStore.getState();
  const selectedBug = bugStore.selectedBug;  // ← UI状態への依存
}

// Spec（正しい）- Main Process
// AutoExecutionCoordinator: executionStates.get(specPath)
```

### Specとの比較

| 観点 | Spec (正しいパターン) | Bug (問題あり) |
|------|----------------------|----------------|
| **状態管理場所** | Main Process (`AutoExecutionCoordinator`) | Renderer Process (`BugAutoExecutionService`) |
| **実行対象の保持** | `Map<specPath, AutoExecutionState>` | `useBugStore.selectedBug`を毎回参照 |
| **並行実行** | specPath単位で独立管理 | 未対応（単一のみ） |
| **UI依存** | なし（IPCで状態通知） | selectedBugに強依存 |
| **状態通知** | EventEmitter + IPC | Rendererローカル |

### 影響箇所
1. **executePhase()**: 行195-202 - 実行時に毎回selectedBugを参照
2. **handleAgentCompleted()**: 行103-106 - 完了時に現在のselectedBugをリフレッシュ
3. **retryFrom()**: 行390-430 - リトライ時もselectedBugに依存

## Impact Assessment
- **Severity**: High
- **Scope**: Bug自動実行機能全体に影響
- **Risk**:
  - 自動実行が途中で停止
  - 誤ったbugに対してコマンドが実行される
  - データ破損の可能性（fix/verifyが別bugに適用）
  - Specとの一貫性欠如による保守性低下

## Related Code

### Spec自動実行（正しいパターン）
```typescript
// Main Process: AutoExecutionCoordinator
export class AutoExecutionCoordinator extends EventEmitter {
  // specPath単位でのMap管理（SSOT）
  private readonly executionStates: Map<string, AutoExecutionState> = new Map();

  async start(specPath: string, specId: string, options: AutoExecutionOptions) {
    // Main Processで状態を完全管理
    const state: AutoExecutionState = { specPath, specId, ... };
    this.executionStates.set(specPath, state);
    this.emit('state-changed', specPath, state);  // UIに通知
  }
}
```

### Bug自動実行（問題あり）
```typescript
// Renderer Process: BugAutoExecutionService
export class BugAutoExecutionService {
  private async executePhase(phase: BugWorkflowPhase): Promise<void> {
    const bugStore = useBugStore.getState();
    const selectedBug = bugStore.selectedBug;  // ← UI状態への依存
  }
}
```

## Proposed Solution

### ❌ 却下: Renderer内でスナップショット保持

```typescript
// Option 1: Renderer内で実行対象を固定保持
private executingBug: BugMetadata | null = null;
```

**却下理由**:
- 根本原因（責務の誤配置）を解決していない
- Specとの一貫性がない
- UIがビジネスロジックを持つ設計は変わらない

### ❌ 却下: 自動実行状態をbugアイテム毎に管理

**却下理由**:
1. **SSOT違反**: 状態が2箇所に分散
2. **関心の分離違反**: 永続データにランタイム状態を混入
3. Specのパターンと異なる

### ✅ 推奨: Main Processへの移行（Specと同じパターン）

**BugWorkflowService（仮称）をMain Processに新設**

```
Main Process:
┌─────────────────────────────────────────────┐
│  BugWorkflowService (新設)                  │
│  - bugPath単位でのMap管理（並行実行対応）   │
│  - フェーズ遷移ロジック                     │
│  - Agent起動・監視                          │
│  - タイムアウト・エラー処理                 │
│  - EventEmitterで状態変更を通知             │
└─────────────────────────────────────────────┘
         ↓ IPC (状態通知)
┌─────────────────────────────────────────────┐
│ Renderer Process                            │
│  BugAutoExecutionService (縮小)             │
│  - 状態表示のみ                             │
│  - 開始/停止ボタン → IPC呼び出し            │
└─────────────────────────────────────────────┘
```

### 実装方針

1. **Main Process**: `BugWorkflowService`を新設
   - `AutoExecutionCoordinator`と同様の設計
   - `Map<bugPath, BugAutoExecutionState>`で状態管理
   - EventEmitterで状態変更を通知

2. **IPC**: 新規ハンドラー追加
   - `startBugAutoExecution(bugPath, options)`
   - `stopBugAutoExecution(bugPath)`
   - `getBugAutoExecutionStatus(bugPath)`
   - `onBugAutoExecutionStateChanged`イベント

3. **Renderer**: `BugAutoExecutionService`を縮小
   - IPC呼び出しのラッパーのみに
   - 状態はIPCイベントで受信

## Dependencies
- 新規: `electron-sdd-manager/src/main/services/bugWorkflowService.ts`
- 新規: `electron-sdd-manager/src/main/ipc/bugWorkflowHandlers.ts`
- 変更: `electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts`
- 変更: `electron-sdd-manager/src/preload/index.ts`

## Testing Strategy
1. **単体テスト**: `BugWorkflowService.test.ts`
   - `AutoExecutionCoordinator.test.ts`を参考に同様のテスト
2. **統合テスト**: IPC経由の操作テスト
3. **E2Eテスト**:
   - 自動実行中に別bugを選択しても元のbugが完了すること
   - 複数bugの並行実行（将来対応）

## Design Principles Check
- ✅ **SSOT**: 実行状態はMain Processに1箇所のみ
- ✅ **関心の分離**: UI=表示・操作、Main=ビジネスロジック
- ✅ **一貫性**: Spec自動実行と同じアーキテクチャ
- ✅ **テスト容易性**: Main側ロジックはUI無しでテスト可能
