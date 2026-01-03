# Bug Analysis: legacy-execution-store-cleanup

## Summary
`ExecutionStore`、`PhaseExecutionPanel`、`LogPanel` がレガシーコードとして残存。これらは現在のUI（`WorkflowView` + `AgentLogPanel`）に置き換えられており、どのコンポーネントからも使用されていない死コードである。

## Root Cause
機能進化の過程でUI設計が変更されたが、旧実装のクリーンアップが行われなかった。

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/stores/executionStore.ts` - 未使用のStore
  - `electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.tsx` - 未使用のコンポーネント
  - `electron-sdd-manager/src/renderer/components/LogPanel.tsx` - 未使用のコンポーネント（`AgentLogPanel`に置換済み）
- **Component**: Renderer側のストア・コンポーネント
- **Trigger**: 機能追加・リファクタリング時のクリーンアップ漏れ

## Impact Assessment
- **Severity**: Low（機能への影響なし、技術的負債のみ）
- **Scope**: 開発者体験・コードベースの保守性
- **Risk**: なし（削除対象のコードは使用されていない）

## Related Code

### 1. ExecutionStoreの使用箇所（削除対象）
```
stores/index.ts:8  - import { useExecutionStore }
stores/index.ts:21 - export { useExecutionStore }
stores/index.ts:48 - executionStore: useExecutionStore（__STORES__へのexpose）
```

### 2. PhaseExecutionPanelの使用箇所（削除対象）
```
components/index.ts:10 - export { PhaseExecutionPanel }
```

### 3. LogPanelの使用箇所（削除対象）
```
components/index.ts:15 - export { LogPanel }
```

### 4. 現在のアーキテクチャ
- **WorkflowView** (`WorkflowView.tsx`): フェーズ実行UI（ExecutionStoreを使用しない）
- **AgentLogPanel** (`AgentLogPanel.tsx`): ログ表示（LogPanelの後継）
- **SpecManagerExecutionStore** (`spec/specManagerExecutionStore.ts`): 現在の実行管理ストア

### 5. IPC関連
`executeCommand` IPCハンドラは `commandService.ts` で定義されているが、これは `ExecutionStore` 経由での使用を前提としていた。
- `handlers.ts:580-607`: `EXECUTE_COMMAND`, `CANCEL_EXECUTION` ハンドラ
- `preload/index.ts:90-105`: `executeCommand`, `cancelExecution`, `onCommandOutput` API

ただし現在の実装は `executePhase` などの高レベルAPIを使用しており、これらの低レベルAPIは使用されていない。

## Proposed Solution

### Option 1: 段階的削除（推奨）
1. **Phase 1**: Rendererコンポーネントの削除
   - `PhaseExecutionPanel.tsx` + テスト削除
   - `LogPanel.tsx` 削除
   - `components/index.ts` のexport削除

2. **Phase 2**: Store削除
   - `executionStore.ts` + テスト削除
   - `stores/index.ts` のimport/export削除
   - `__STORES__` からの除去

3. **Phase 3**: IPC層の削除（慎重に）
   - `executeCommand`, `cancelExecution`, `onCommandOutput` API削除
   - `EXECUTE_COMMAND`, `CANCEL_EXECUTION` IPCハンドラ削除
   - `commandService.ts` 削除

- **Pros**: 安全、各段階でテスト可能
- **Cons**: 複数コミットが必要

### Option 2: 一括削除
すべてのレガシーコードを一度に削除
- **Pros**: シンプル、一回で完了
- **Cons**: リスクが高い

### Recommended Approach
**Option 1: 段階的削除**を推奨。各段階でビルド・テストを確認しながら進める。

## Dependencies
- `stores/index.ts`: export修正が必要
- `components/index.ts`: export修正が必要
- `preload/index.ts`: API削除（Phase 3）
- `handlers.ts`: IPCハンドラ削除（Phase 3）

## Testing Strategy
1. 各削除後にビルド（`npm run build`）が成功することを確認
2. 既存のテスト（`npm test`）がパスすることを確認
3. E2Eテスト（`task electron:test:e2e`）がパスすることを確認
4. アプリケーションの手動動作確認（フェーズ実行、ログ表示）

## 削除対象ファイル一覧
| ファイル | タイプ | Phase |
|----------|--------|-------|
| `stores/executionStore.ts` | Store | 2 |
| `stores/executionStore.test.ts` | Test | 2 |
| `components/PhaseExecutionPanel.tsx` | Component | 1 |
| `components/PhaseExecutionPanel.test.tsx` | Test | 1 |
| `components/LogPanel.tsx` | Component | 1 |
| `services/commandService.ts` | Service | 3 |
| `preload/index.ts` (一部) | Preload | 3 |
| `ipc/handlers.ts` (一部) | Handler | 3 |
